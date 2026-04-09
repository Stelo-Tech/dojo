/**
 * AchievementSystem -- tracks and evaluates player achievements.
 *
 * All achievements are deterministic: they check only against saved data
 * (GameStats, LevelProgress). No runtime-only state is used.
 */
import type { GameSave, GameStats, LevelProgress } from '@/systems/SaveTypes';

export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  readonly condition: (
    stats: GameStats,
    levels: Record<number, LevelProgress>,
    achievements: readonly string[],
  ) => boolean;
  unlocked: boolean;
}

/** Number of levels per tier in the game. */
const LEVELS_PER_TIER = 6;

/** Total tiers in the game. */
const TOTAL_TIERS = 5;

/** Total levels in the game. */
const TOTAL_LEVELS = LEVELS_PER_TIER * TOTAL_TIERS;

/**
 * Helper: count levels with a given rank or better.
 */
function countLevelsWithRank(
  levels: Record<number, LevelProgress>,
  targetRank: 'S' | 'A' | 'B' | 'C',
): number {
  const rankOrder: Record<string, number> = { F: 0, C: 1, B: 2, A: 3, S: 4 };
  const target = rankOrder[targetRank] ?? 0;
  let count = 0;
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    const lp = levels[Number(keys[i])];
    if (lp && (rankOrder[lp.bestRank] ?? 0) >= target) {
      count++;
    }
  }
  return count;
}

/**
 * Helper: count levels in a specific tier that have 3 stars.
 */
function countThreeStarInTier(
  levels: Record<number, LevelProgress>,
  tier: number,
): number {
  let count = 0;
  for (let lvl = 0; lvl < LEVELS_PER_TIER; lvl++) {
    const seed = tier * 1000 + lvl;
    const lp = levels[seed];
    if (lp && lp.stars >= 3) {
      count++;
    }
  }
  return count;
}

/**
 * Helper: count completed levels across all tiers.
 */
function countCompletedLevels(
  levels: Record<number, LevelProgress>,
): number {
  let count = 0;
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    const lp = levels[Number(keys[i])];
    if (lp && lp.completed) {
      count++;
    }
  }
  return count;
}

/**
 * Helper: count levels with max time bonus (timeBonus portion of score).
 * We approximate this by checking levels with bestScore >= 800 (generous time bonus).
 * A more precise approach would store timeBonus separately, but for achievements
 * we check if the level has a bestScore indicating strong time performance.
 */
function countLevelsWithHighScore(
  levels: Record<number, LevelProgress>,
  minScore: number,
): number {
  let count = 0;
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    const lp = levels[Number(keys[i])];
    if (lp && lp.bestScore >= minScore) {
      count++;
    }
  }
  return count;
}

/**
 * Helper: check if any level was completed with a specific condition.
 */
function anyLevelCompleted(
  levels: Record<number, LevelProgress>,
): boolean {
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    const lp = levels[Number(keys[i])];
    if (lp && lp.completed) return true;
  }
  return false;
}

/**
 * Helper: check if any level in tier 3+ has 100% save (bestSaved equals total).
 * Since we don't store total per level in LevelProgress, we check for 3 stars
 * which means 100% saved.
 */
function anyHighTierPerfect(
  levels: Record<number, LevelProgress>,
): boolean {
  for (let tier = 3; tier <= TOTAL_TIERS; tier++) {
    for (let lvl = 0; lvl < LEVELS_PER_TIER; lvl++) {
      const seed = tier * 1000 + lvl;
      const lp = levels[seed];
      if (lp && lp.stars >= 3) return true;
    }
  }
  return false;
}

/**
 * Helper: check if any level has 3+ attempts.
 */
function anyLevelWith3Attempts(
  levels: Record<number, LevelProgress>,
): boolean {
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    const lp = levels[Number(keys[i])];
    if (lp && lp.attempts >= 3) return true;
  }
  return false;
}

/**
 * Helper: check if any level has 3 stars.
 */
function anyLevelWith3Stars(
  levels: Record<number, LevelProgress>,
): boolean {
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    const lp = levels[Number(keys[i])];
    if (lp && lp.stars >= 3) return true;
  }
  return false;
}

/** All achievement definitions. */
function createAchievementDefinitions(): Achievement[] {
  return [
    // --- Beginner ---
    {
      id: 'first_step',
      name: 'Premier Pas',
      description: 'Terminer le premier niveau',
      icon: '[P]',
      category: 'beginner',
      condition: (_stats, levels) => {
        // Check if any level is completed (first level)
        return anyLevelCompleted(levels);
      },
      unlocked: false,
    },
    {
      id: 'savior_10',
      name: 'Sauveur',
      description: 'Sauver 10 lemmings au total',
      icon: '[S]',
      category: 'beginner',
      condition: (stats) => stats.totalLemmingsSaved >= 10,
      unlocked: false,
    },
    {
      id: 'persistent',
      name: 'Perseverant',
      description: 'Tenter un niveau 3 fois',
      icon: '[R]',
      category: 'beginner',
      condition: (_stats, levels) => anyLevelWith3Attempts(levels),
      unlocked: false,
    },
    {
      id: 'five_levels',
      name: 'Explorateur',
      description: 'Terminer 5 niveaux',
      icon: '[E]',
      category: 'beginner',
      condition: (stats) => stats.totalLevelsCompleted >= 5,
      unlocked: false,
    },

    // --- Intermediate ---
    {
      id: 'perfectionist',
      name: 'Perfectionniste',
      description: 'Obtenir 3 etoiles sur un niveau',
      icon: '[*]',
      category: 'intermediate',
      condition: (_stats, levels) => anyLevelWith3Stars(levels),
      unlocked: false,
    },
    {
      id: 'efficient',
      name: 'Efficace',
      description: 'Terminer un niveau avec un score d\'efficacite maximal',
      icon: '[!]',
      category: 'intermediate',
      condition: (_stats, levels) => countLevelsWithHighScore(levels, 850) >= 1,
      unlocked: false,
    },
    {
      id: 'speed_runner',
      name: 'Speed Runner',
      description: 'Terminer un niveau en moins de 30 secondes',
      icon: '[>]',
      category: 'intermediate',
      condition: (_stats, levels) => {
        const keys = Object.keys(levels);
        for (let i = 0; i < keys.length; i++) {
          const lp = levels[Number(keys[i])];
          if (lp && lp.completed && lp.bestTime > 0 && lp.bestTime <= 30) return true;
        }
        return false;
      },
      unlocked: false,
    },
    {
      id: 'fifty_souls',
      name: 'Cinquante Ames',
      description: 'Sauver 50 lemmings au total',
      icon: '[50]',
      category: 'intermediate',
      condition: (stats) => stats.totalLemmingsSaved >= 50,
      unlocked: false,
    },
    {
      id: 'rank_a',
      name: 'Rank A',
      description: 'Obtenir le rang A sur un niveau',
      icon: '[A]',
      category: 'intermediate',
      condition: (_stats, levels) => countLevelsWithRank(levels, 'A') >= 1,
      unlocked: false,
    },

    // --- Advanced ---
    {
      id: 'flawless',
      name: 'Sans Faute',
      description: 'Sauver 100% des lemmings sur un niveau de Tier 3+',
      icon: '[%]',
      category: 'advanced',
      condition: (_stats, levels) => anyHighTierPerfect(levels),
      unlocked: false,
    },
    {
      id: 'time_master',
      name: 'Maitre du Temps',
      description: 'Obtenir un score de 800+ sur 5 niveaux',
      icon: '[T]',
      category: 'advanced',
      condition: (_stats, levels) => countLevelsWithHighScore(levels, 800) >= 5,
      unlocked: false,
    },
    {
      id: 'centurion',
      name: 'Centurion',
      description: 'Sauver 100 lemmings au total',
      icon: '[C]',
      category: 'advanced',
      condition: (stats) => stats.totalLemmingsSaved >= 100,
      unlocked: false,
    },
    {
      id: 'elite',
      name: 'Elite',
      description: 'Obtenir le rang S sur un niveau',
      icon: '[S+]',
      category: 'advanced',
      condition: (_stats, levels) => countLevelsWithRank(levels, 'S') >= 1,
      unlocked: false,
    },
    {
      id: 'all_stars_t1',
      name: 'Tout Etoile',
      description: 'Obtenir 3 etoiles sur tous les niveaux du Tier 1',
      icon: '[***]',
      category: 'advanced',
      condition: (_stats, levels) =>
        countThreeStarInTier(levels, 1) >= LEVELS_PER_TIER,
      unlocked: false,
    },
    {
      id: 'ten_levels',
      name: 'Veteran',
      description: 'Terminer 10 niveaux',
      icon: '[V]',
      category: 'advanced',
      condition: (stats) => stats.totalLevelsCompleted >= 10,
      unlocked: false,
    },

    // --- Expert ---
    {
      id: 'legend',
      name: 'Legende',
      description: 'Obtenir le rang S sur 10 niveaux',
      icon: '[L]',
      category: 'expert',
      condition: (_stats, levels) => countLevelsWithRank(levels, 'S') >= 10,
      unlocked: false,
    },
    {
      id: 'thousand_lives',
      name: 'Mille Vies',
      description: 'Sauver 1000 lemmings au total',
      icon: '[1K]',
      category: 'expert',
      condition: (stats) => stats.totalLemmingsSaved >= 1000,
      unlocked: false,
    },
    {
      id: 'completionist',
      name: 'Completionniste',
      description: `Terminer les ${TOTAL_LEVELS} niveaux`,
      icon: '[OK]',
      category: 'expert',
      condition: (_stats, levels) =>
        countCompletedLevels(levels) >= TOTAL_LEVELS,
      unlocked: false,
    },
  ];
}

export class AchievementSystem {
  private achievements: Achievement[];

  constructor() {
    this.achievements = createAchievementDefinitions();
  }

  /**
   * Check all achievements against save data.
   * Returns the list of newly unlocked achievements.
   */
  checkAchievements(save: GameSave): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    // Mark previously unlocked achievements
    for (const achievement of this.achievements) {
      if (save.achievements.includes(achievement.id)) {
        achievement.unlocked = true;
      }
    }

    // Check each locked achievement
    for (const achievement of this.achievements) {
      if (achievement.unlocked) continue;
      if (
        achievement.condition(
          save.stats,
          save.levels,
          save.achievements,
        )
      ) {
        achievement.unlocked = true;
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  /** Get all achievements with their current unlock status. */
  getAllAchievements(): readonly Achievement[] {
    return this.achievements;
  }

  /** Get count of unlocked achievements. */
  getUnlockedCount(): number {
    let count = 0;
    for (const a of this.achievements) {
      if (a.unlocked) count++;
    }
    return count;
  }

  /** Get total number of achievements. */
  getTotalCount(): number {
    return this.achievements.length;
  }
}
