import Phaser from 'phaser';

import { AudioCategory, AUDIO_VOLUMES, AUDIO_KEYS } from '@/utils/Constants';
import { gameEventBus, GameEvents } from '@/utils/EventBus';

/** Persisted audio preferences shape */
interface AudioPreferences {
  volumes: Record<AudioCategory, number>;
  muted: boolean;
}

const PREFS_KEY = 'lemmings_audio_prefs';

/** Fade-out duration in ms used by fadeOutMusic() */
const MUSIC_FADE_DEFAULT_MS = 500;

/**
 * Centralised audio management system.
 *
 * Responsibilities:
 *   - Play SFX, UI sounds, and background music through Phaser's sound manager.
 *   - Maintain per-category volumes (sfx / music / ui).
 *   - Persist volume and mute preferences to localStorage.
 *   - React automatically to game events via gameEventBus.
 *
 * Ownership: instantiated and destroyed by the host Scene (e.g. GameScene).
 * The host must call destroy() in its shutdown() lifecycle hook.
 */
export class AudioSystem {
  private readonly scene: Phaser.Scene;
  private volumes: Record<AudioCategory, number>;
  private muted: boolean;
  /** Active looping music track, or null when nothing is playing. */
  private currentMusic: Phaser.Sound.BaseSound | null;

  // Bound event handlers kept so they can be removed in destroy()
  private readonly onLemmingSaved: (data: GameEvents['lemming:saved']) => void;
  private readonly onLemmingDied: (data: GameEvents['lemming:died']) => void;
  private readonly onToolPlaced: (data: GameEvents['tool:placed']) => void;
  private readonly onLevelComplete: (data: GameEvents['level:complete']) => void;
  private readonly onLevelFailed: (data: GameEvents['level:failed']) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.currentMusic = null;

    // Start from defaults, then overlay persisted prefs
    this.volumes = { ...AUDIO_VOLUMES };
    this.muted = false;
    this.loadPreferences();

    // Bind handlers so the same reference can be passed to off()
    this.onLemmingSaved = () => {
      this.playSfx(AUDIO_KEYS.SFX_SAVE);
    };
    this.onLemmingDied = () => {
      this.playSfx(AUDIO_KEYS.SFX_DEATH);
    };
    this.onToolPlaced = () => {
      this.playSfx(AUDIO_KEYS.SFX_ASSIGN_SKILL);
    };
    this.onLevelComplete = () => {
      this.playUi(AUDIO_KEYS.UI_LEVEL_COMPLETE);
    };
    this.onLevelFailed = () => {
      this.playUi(AUDIO_KEYS.UI_LEVEL_FAIL);
    };

    gameEventBus.on('lemming:saved', this.onLemmingSaved);
    gameEventBus.on('lemming:died', this.onLemmingDied);
    gameEventBus.on('tool:placed', this.onToolPlaced);
    gameEventBus.on('level:complete', this.onLevelComplete);
    gameEventBus.on('level:failed', this.onLevelFailed);
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  /**
   * Play a short sound effect.  Multiple instances may overlap.
   * Does nothing (with a console warning) when the key is not loaded.
   */
  playSfx(key: string): void {
    if (this.muted) return;
    if (!this.soundExists(key)) {
      console.warn(`[AudioSystem] SFX key not loaded: "${key}"`);
      return;
    }
    // scene.sound.play() spawns a transient instance that auto-destroys.
    this.scene.sound.play(key, { volume: this.volumes.sfx });
  }

  /**
   * Play a UI feedback sound (clicks, transitions, results).
   * Does nothing (with a console warning) when the key is not loaded.
   */
  playUi(key: string): void {
    if (this.muted) return;
    if (!this.soundExists(key)) {
      console.warn(`[AudioSystem] UI sound key not loaded: "${key}"`);
      return;
    }
    this.scene.sound.play(key, { volume: this.volumes.ui });
  }

  /**
   * Start a looping background music track.
   * Stops and destroys the currently playing track first.
   * Does nothing (with a console warning) when the key is not loaded.
   */
  playMusic(key: string): void {
    this.stopMusic();

    if (!this.soundExists(key)) {
      console.warn(`[AudioSystem] Music key not loaded: "${key}"`);
      return;
    }

    // scene.sound.add() returns a persistent BaseSound instance we own.
    const track = this.scene.sound.add(key, {
      loop: true,
      volume: this.muted ? 0 : this.volumes.music,
    });
    track.play();
    this.currentMusic = track;
  }

  /** Stop the current music track and release the sound object. */
  stopMusic(): void {
    if (this.currentMusic !== null) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Volume & mute
  // ---------------------------------------------------------------------------

  /**
   * Set the volume for a category (clamped to [0, 1]).
   * Immediately applies to the running music track when category is 'music'.
   */
  setVolume(category: AudioCategory, volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    this.volumes[category] = clamped;

    // Live-update the music volume so the change is audible without a restart.
    if (category === 'music' && this.currentMusic !== null) {
      // Phaser.Sound.BaseSound exposes volume as a settable property.
      // The return type from sound.add() is typed as BaseSound which lacks
      // a concrete 'volume' property in the base class typings, but it is
      // present on both WebAudioSound and HTML5AudioSound at runtime.
      // We access it through an intermediary unknown cast to avoid unsafe
      // 'as WebAudioSound' which would import a concrete subclass.
      const sound = this.currentMusic as unknown as { volume: number };
      sound.volume = this.muted ? 0 : clamped;
    }

    this.savePreferences();
  }

  /** Return the current volume for a category (0–1). */
  getVolume(category: AudioCategory): number {
    return this.volumes[category];
  }

  /**
   * Toggle global mute.
   * When muted, running music is silenced (volume = 0) but not stopped,
   * so it resumes from the correct position when unmuted.
   * Returns the new muted state.
   */
  toggleMute(): boolean {
    this.muted = !this.muted;

    if (this.currentMusic !== null) {
      const sound = this.currentMusic as unknown as { volume: number };
      sound.volume = this.muted ? 0 : this.volumes.music;
    }

    this.savePreferences();
    return this.muted;
  }

  /** Return whether the system is currently muted. */
  isMuted(): boolean {
    return this.muted;
  }

  // ---------------------------------------------------------------------------
  // Transitions
  // ---------------------------------------------------------------------------

  /**
   * Fade out the current music track linearly over `duration` ms,
   * then stop and destroy it.
   * Uses Phaser's tween system so it is frame-rate independent.
   */
  fadeOutMusic(duration: number = MUSIC_FADE_DEFAULT_MS): void {
    if (this.currentMusic === null) return;

    const track = this.currentMusic;
    // Cast to an object with a mutable volume property.
    // Phaser.Sound.BaseSound's concrete subclasses (WebAudioSound, HTML5AudioSound)
    // both expose volume as a writable property, but the base-class typings
    // do not surface it. Using unknown→object cast avoids importing a concrete
    // subclass and is documented here as required by the TS rules.
    const soundRef = track as unknown as { volume: number };

    // We use Phaser tweens to drive the volume interpolation.
    this.scene.tweens.add({
      targets: soundRef,
      volume: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        track.stop();
        track.destroy();
        // Guard: only null out if the track is still the active one.
        if (this.currentMusic === track) {
          this.currentMusic = null;
        }
      },
    });

    // Detach ownership so a subsequent playMusic() call can start immediately
    // while the fade-out tween completes independently.
    this.currentMusic = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Clean up event listeners and active sounds.
   * Must be called from the host Scene's shutdown() hook.
   */
  destroy(): void {
    gameEventBus.off('lemming:saved', this.onLemmingSaved);
    gameEventBus.off('lemming:died', this.onLemmingDied);
    gameEventBus.off('tool:placed', this.onToolPlaced);
    gameEventBus.off('level:complete', this.onLevelComplete);
    gameEventBus.off('level:failed', this.onLevelFailed);

    this.stopMusic();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private savePreferences(): void {
    const prefs: AudioPreferences = {
      volumes: { ...this.volumes },
      muted: this.muted,
    };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage may be unavailable in some environments (private browsing
      // quotas, WebView restrictions). Fail silently — preferences are simply
      // not persisted this session.
      console.warn('[AudioSystem] Could not save audio preferences to localStorage.');
    }
  }

  private loadPreferences(): void {
    let raw: string | null;
    try {
      raw = localStorage.getItem(PREFS_KEY);
    } catch {
      return;
    }
    if (raw === null) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isAudioPreferences(parsed)) return;

      // Merge category by category so unknown keys are discarded
      const categories: AudioCategory[] = ['sfx', 'music', 'ui'];
      for (const cat of categories) {
        const stored = parsed.volumes[cat];
        if (typeof stored === 'number') {
          this.volumes[cat] = Math.min(1, Math.max(0, stored));
        }
      }
      this.muted = parsed.muted;
    } catch {
      console.warn('[AudioSystem] Could not parse audio preferences — using defaults.');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether a sound with the given key has been loaded into
   * Phaser's sound manager cache.
   *
   * `this.scene.sound.get(key)` returns the first BaseSound found for that
   * key, or null if nothing has been added yet.  For keys preloaded via
   * `this.load.audio()` in BootScene, we also query the audio cache directly.
   */
  private soundExists(key: string): boolean {
    // Check the sound manager's active instances first.
    if (this.scene.sound.get(key) !== null) return true;
    // Fall back to checking the audio cache (covers preloaded-but-not-yet-played keys).
    return this.scene.cache.audio.has(key);
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isAudioPreferences(value: unknown): value is AudioPreferences {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj['muted'] !== 'boolean') return false;
  if (typeof obj['volumes'] !== 'object' || obj['volumes'] === null) return false;
  const vols = obj['volumes'] as Record<string, unknown>;
  return (
    typeof vols['sfx'] === 'number' &&
    typeof vols['music'] === 'number' &&
    typeof vols['ui'] === 'number'
  );
}
