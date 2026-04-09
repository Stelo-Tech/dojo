/**
 * Save data types and factory for the Lemmings game.
 *
 * The save format is versioned so that future schema changes
 * can be migrated automatically without data loss.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'lemmings_save';
export const AUTO_SAVE_INTERVAL_MS = 30_000;
export const ANALYTICS_CONSENT_KEY = 'lemmings_analytics_consent';

export interface LevelProgress {
  readonly completed: boolean;
  readonly stars: number; // 0-3
  readonly bestSaved: number; // best number of lemmings saved
  readonly bestTime: number; // best completion time in ms
  readonly attempts: number; // total attempts
}

export interface GameSettings {
  readonly musicVolume: number; // 0-1
  readonly sfxVolume: number; // 0-1
  readonly muted: boolean;
}

export interface GameStats {
  readonly totalPlayTime: number; // ms
  readonly totalLemmingsSaved: number;
  readonly totalLemmingsLost: number;
  readonly totalLevelsCompleted: number;
}

export interface GameSave {
  readonly version: number;
  readonly levels: Record<number, LevelProgress>;
  readonly settings: GameSettings;
  readonly stats: GameStats;
  readonly lastPlayedLevel: number;
  readonly savedAt: string; // ISO date string
}

/** Create a fresh default save with no progress. */
export function createDefaultSave(): GameSave {
  return {
    version: SAVE_VERSION,
    levels: {},
    settings: {
      musicVolume: 0.7,
      sfxVolume: 1.0,
      muted: false,
    },
    stats: {
      totalPlayTime: 0,
      totalLemmingsSaved: 0,
      totalLemmingsLost: 0,
      totalLevelsCompleted: 0,
    },
    lastPlayedLevel: 1,
    savedAt: new Date().toISOString(),
  };
}
