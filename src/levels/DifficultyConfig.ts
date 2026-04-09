/**
 * DifficultyConfig — Presets for each difficulty tier.
 *
 * Each preset defines the baseline parameters for levels
 * of that difficulty. Individual levels can override these
 * through their LevelData fields.
 */

export interface DifficultyPreset {
  readonly name: string;
  readonly spawnRate: number; // ms between spawns
  readonly lemmingCount: number; // total lemmings
  readonly parRatio: number; // par as fraction of total (0.5 = 50%)
  readonly timeLimit: number; // seconds (0 = no limit)
  readonly skillMultiplier: number; // multiplier on base skill counts
}

export const DIFFICULTY_PRESETS: Readonly<
  Record<string, DifficultyPreset>
> = {
  tutorial: {
    name: 'Tutorial',
    spawnRate: 1500,
    lemmingCount: 10,
    parRatio: 0.7,
    timeLimit: 0,
    skillMultiplier: 2.0, // generous tools
  },
  easy: {
    name: 'Easy',
    spawnRate: 1200,
    lemmingCount: 15,
    parRatio: 0.6,
    timeLimit: 180,
    skillMultiplier: 1.5,
  },
  medium: {
    name: 'Medium',
    spawnRate: 1000,
    lemmingCount: 20,
    parRatio: 0.7,
    timeLimit: 150,
    skillMultiplier: 1.0,
  },
  hard: {
    name: 'Hard',
    spawnRate: 800,
    lemmingCount: 30,
    parRatio: 0.8,
    timeLimit: 120,
    skillMultiplier: 0.8, // tight resources
  },
};

/** Get difficulty preset by key. Falls back to 'medium' for unknown keys. */
export function getDifficultyPreset(
  difficulty: string,
): DifficultyPreset {
  return DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS['medium'];
}
