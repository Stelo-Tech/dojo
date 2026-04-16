import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioSystem } from '@/systems/AudioSystem';
import { gameEventBus } from '@/utils/EventBus';
import { AUDIO_VOLUMES } from '@/utils/Constants';

const PREFS_KEY = 'lemmings_audio_prefs';

/**
 * Build a minimal Phaser Scene mock that captures sound.play / sound.add calls.
 * The mock's `soundExists` gate is controlled via `loadedKeys`.
 */
function createMockScene(loadedKeys: string[] = []) {
  const addedSounds: Map<string, ReturnType<typeof createMockBaseSound>> = new Map();

  function createMockBaseSound(key: string) {
    const sound = {
      key,
      volume: 1,
      play: vi.fn(),
      stop: vi.fn(),
      destroy: vi.fn(),
    };
    return sound;
  }

  const soundManager = {
    play: vi.fn(),
    add: vi.fn().mockImplementation((key: string) => {
      const s = createMockBaseSound(key);
      addedSounds.set(key, s);
      return s;
    }),
    get: vi.fn().mockImplementation((key: string) => {
      // Returns existing sound instance (like a preloaded-and-played one)
      return loadedKeys.includes(key) ? { key } : null;
    }),
  };

  const tweens = {
    add: vi.fn().mockImplementation((config: { onComplete?: () => void }) => {
      // Immediately invoke onComplete so we can test fade behaviour synchronously
      if (config.onComplete) config.onComplete();
    }),
  };

  const cache = {
    audio: {
      has: vi.fn().mockImplementation((key: string) => loadedKeys.includes(key)),
    },
  };

  return {
    sound: soundManager,
    tweens,
    cache,
    _addedSounds: addedSounds,
  };
}

describe('AudioSystem', () => {
  let scene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    localStorage.clear();
    gameEventBus.clear();
    scene = createMockScene();
  });

  afterEach(() => {
    localStorage.clear();
    gameEventBus.clear();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  it('initialises with default volumes when no prefs stored', () => {
    const audio = new AudioSystem(scene as never);

    expect(audio.getVolume('sfx')).toBe(AUDIO_VOLUMES.sfx);
    expect(audio.getVolume('music')).toBe(AUDIO_VOLUMES.music);
    expect(audio.getVolume('ui')).toBe(AUDIO_VOLUMES.ui);
    expect(audio.isMuted()).toBe(false);

    audio.destroy();
  });

  it('loads stored preferences from localStorage on construction', () => {
    const prefs = {
      volumes: { sfx: 0.2, music: 0.3, ui: 0.4 },
      muted: true,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    const audio = new AudioSystem(scene as never);

    expect(audio.getVolume('sfx')).toBe(0.2);
    expect(audio.getVolume('music')).toBe(0.3);
    expect(audio.getVolume('ui')).toBe(0.4);
    expect(audio.isMuted()).toBe(true);

    audio.destroy();
  });

  // -------------------------------------------------------------------------
  // playSfx
  // -------------------------------------------------------------------------

  it('playSfx calls scene.sound.play with sfx volume when key is loaded', () => {
    const sceneWithKey = createMockScene(['sfx_save']);
    const audio = new AudioSystem(sceneWithKey as never);

    audio.playSfx('sfx_save');

    expect(sceneWithKey.sound.play).toHaveBeenCalledWith(
      'sfx_save',
      expect.objectContaining({ volume: AUDIO_VOLUMES.sfx }),
    );

    audio.destroy();
  });

  it('playSfx warns and does not call play when key is not loaded', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const audio = new AudioSystem(scene as never); // no loaded keys

    audio.playSfx('sfx_dig');

    expect(scene.sound.play).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sfx_dig'));

    warnSpy.mockRestore();
    audio.destroy();
  });

  it('playSfx does nothing when muted', () => {
    const sceneWithKey = createMockScene(['sfx_save']);
    const audio = new AudioSystem(sceneWithKey as never);
    audio.toggleMute(); // mute

    audio.playSfx('sfx_save');

    expect(sceneWithKey.sound.play).not.toHaveBeenCalled();

    audio.destroy();
  });

  // -------------------------------------------------------------------------
  // playMusic
  // -------------------------------------------------------------------------

  it('playMusic starts a looping track via scene.sound.add', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);

    audio.playMusic('music_gameplay');

    expect(sceneWithKey.sound.add).toHaveBeenCalledWith(
      'music_gameplay',
      expect.objectContaining({ loop: true }),
    );

    audio.destroy();
  });

  it('playMusic calls play() on the returned track', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);

    audio.playMusic('music_gameplay');

    const track = sceneWithKey._addedSounds.get('music_gameplay');
    expect(track).toBeDefined();
    expect(track?.play).toHaveBeenCalled();

    audio.destroy();
  });

  it('playMusic stops and destroys the previous track before starting new one', () => {
    const sceneWithBoth = createMockScene(['music_menu', 'music_gameplay']);
    const audio = new AudioSystem(sceneWithBoth as never);

    audio.playMusic('music_menu');
    const firstTrack = sceneWithBoth._addedSounds.get('music_menu');

    audio.playMusic('music_gameplay');

    expect(firstTrack?.stop).toHaveBeenCalled();
    expect(firstTrack?.destroy).toHaveBeenCalled();

    audio.destroy();
  });

  it('playMusic warns and does not add sound when key is not loaded', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const audio = new AudioSystem(scene as never);

    audio.playMusic('music_menu');

    expect(scene.sound.add).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('music_menu'));

    warnSpy.mockRestore();
    audio.destroy();
  });

  it('stopMusic destroys the active track', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);

    audio.playMusic('music_gameplay');
    const track = sceneWithKey._addedSounds.get('music_gameplay');

    audio.stopMusic();

    expect(track?.stop).toHaveBeenCalled();
    expect(track?.destroy).toHaveBeenCalled();

    audio.destroy();
  });

  // -------------------------------------------------------------------------
  // toggleMute
  // -------------------------------------------------------------------------

  it('toggleMute returns new muted state (true on first call)', () => {
    const audio = new AudioSystem(scene as never);
    expect(audio.toggleMute()).toBe(true);
    audio.destroy();
  });

  it('toggleMute silences running music by setting volume to 0', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);
    audio.playMusic('music_gameplay');

    const track = sceneWithKey._addedSounds.get('music_gameplay');
    if (!track) throw new Error('Track not found');

    audio.toggleMute();

    expect(track.volume).toBe(0);

    audio.destroy();
  });

  it('toggleMute restores music volume when unmuting', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);
    audio.playMusic('music_gameplay');

    audio.toggleMute(); // mute
    audio.toggleMute(); // unmute

    const track = sceneWithKey._addedSounds.get('music_gameplay');
    if (!track) throw new Error('Track not found');

    expect(track.volume).toBe(AUDIO_VOLUMES.music);

    audio.destroy();
  });

  it('isMuted() reflects current mute state', () => {
    const audio = new AudioSystem(scene as never);
    expect(audio.isMuted()).toBe(false);
    audio.toggleMute();
    expect(audio.isMuted()).toBe(true);
    audio.toggleMute();
    expect(audio.isMuted()).toBe(false);
    audio.destroy();
  });

  // -------------------------------------------------------------------------
  // setVolume
  // -------------------------------------------------------------------------

  it('setVolume updates the volume for a category', () => {
    const audio = new AudioSystem(scene as never);
    audio.setVolume('sfx', 0.3);
    expect(audio.getVolume('sfx')).toBe(0.3);
    audio.destroy();
  });

  it('setVolume clamps value above 1 to 1', () => {
    const audio = new AudioSystem(scene as never);
    audio.setVolume('music', 1.5);
    expect(audio.getVolume('music')).toBe(1);
    audio.destroy();
  });

  it('setVolume clamps value below 0 to 0', () => {
    const audio = new AudioSystem(scene as never);
    audio.setVolume('ui', -0.5);
    expect(audio.getVolume('ui')).toBe(0);
    audio.destroy();
  });

  it('setVolume with music category live-updates the running track volume', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);
    audio.playMusic('music_gameplay');

    audio.setVolume('music', 0.2);

    const track = sceneWithKey._addedSounds.get('music_gameplay');
    if (!track) throw new Error('Track not found');

    expect(track.volume).toBe(0.2);

    audio.destroy();
  });

  it('setVolume persists preferences to localStorage', () => {
    const audio = new AudioSystem(scene as never);
    audio.setVolume('sfx', 0.55);

    const raw = localStorage.getItem(PREFS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}') as { volumes: { sfx: number } };
    expect(parsed.volumes.sfx).toBe(0.55);

    audio.destroy();
  });

  // -------------------------------------------------------------------------
  // Preferences persistence
  // -------------------------------------------------------------------------

  it('toggleMute persists muted state to localStorage', () => {
    const audio = new AudioSystem(scene as never);
    audio.toggleMute();

    const raw = localStorage.getItem(PREFS_KEY);
    const parsed = JSON.parse(raw ?? '{}') as { muted: boolean };
    expect(parsed.muted).toBe(true);

    audio.destroy();
  });

  it('gracefully handles corrupt preferences JSON without throwing', () => {
    localStorage.setItem(PREFS_KEY, 'not-json{{{');
    expect(() => new AudioSystem(scene as never)).not.toThrow();
  });

  it('gracefully handles preferences with wrong shape without throwing', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volumes: null, muted: 'yes' }));
    expect(() => new AudioSystem(scene as never)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Event bus integration
  // -------------------------------------------------------------------------

  it('plays sfx_death sound when lemming:died is emitted (if key loaded)', () => {
    const sceneWithKey = createMockScene(['sfx_death']);
    const audio = new AudioSystem(sceneWithKey as never);

    gameEventBus.emit('lemming:died', { id: 1, cause: 'fall' });

    expect(sceneWithKey.sound.play).toHaveBeenCalledWith(
      'sfx_death',
      expect.objectContaining({ volume: AUDIO_VOLUMES.sfx }),
    );

    audio.destroy();
  });

  it('plays sfx_save sound when lemming:saved is emitted (if key loaded)', () => {
    const sceneWithKey = createMockScene(['sfx_save']);
    const audio = new AudioSystem(sceneWithKey as never);

    gameEventBus.emit('lemming:saved', { id: 2 });

    expect(sceneWithKey.sound.play).toHaveBeenCalledWith(
      'sfx_save',
      expect.objectContaining({ volume: AUDIO_VOLUMES.sfx }),
    );

    audio.destroy();
  });

  it('plays ui_level_complete sound when level:complete is emitted (if key loaded)', () => {
    const sceneWithKey = createMockScene(['ui_level_complete']);
    const audio = new AudioSystem(sceneWithKey as never);

    gameEventBus.emit('level:complete', { saved: 5, total: 10 });

    expect(sceneWithKey.sound.play).toHaveBeenCalledWith(
      'ui_level_complete',
      expect.objectContaining({ volume: AUDIO_VOLUMES.ui }),
    );

    audio.destroy();
  });

  // -------------------------------------------------------------------------
  // Lifecycle — destroy
  // -------------------------------------------------------------------------

  it('destroy() stops and destroys the current music track', () => {
    const sceneWithKey = createMockScene(['music_gameplay']);
    const audio = new AudioSystem(sceneWithKey as never);
    audio.playMusic('music_gameplay');

    const track = sceneWithKey._addedSounds.get('music_gameplay');
    audio.destroy();

    expect(track?.stop).toHaveBeenCalled();
    expect(track?.destroy).toHaveBeenCalled();
  });

  it('destroy() removes gameEventBus listeners (no calls after destroy)', () => {
    const sceneWithKey = createMockScene(['sfx_death']);
    const audio = new AudioSystem(sceneWithKey as never);
    audio.destroy();

    gameEventBus.emit('lemming:died', { id: 1, cause: 'fall' });

    // After destroy, the handler was removed — play should not be called
    expect(sceneWithKey.sound.play).not.toHaveBeenCalled();
  });
});
