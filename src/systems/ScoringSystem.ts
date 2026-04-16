/**
 * ScoringSystem — Deterministic scoring for level completion.
 *
 * Scoring formula:
 *   saveScore      (0-500): (saved / total) * 500
 *   timeBonus      (0-300): if timeLimit > 0, max(0, (1 - elapsed/limit) * 300); else 150
 *   efficiencyBonus(0-200): (unusedSkills / totalAvailable) * 200
 *   totalScore = saveScore + timeBonus + efficiencyBonus  (max 1000)
 *
 * Stars:
 *   0 = failed (saved < par)
 *   1 = par met
 *   2 = saved >= 75% of total
 *   3 = saved 100%
 *
 * Ranks: S >= 900, A >= 750, B >= 500, C >= par met, F = failed
 */

export interface LevelResult {
  readonly levelId: number;
  readonly saved: number;
  readonly total: number;
  readonly par: number;
  readonly timeElapsed: number; // seconds
  readonly timeLimit: number; // seconds (0 = no limit)
  readonly skillsUsed: Record<string, number>; // skill -> count
  readonly skillsAvailable: Record<string, number>; // skill -> max count
}

export interface ScoreBreakdown {
  readonly stars: number; // 0-3
  readonly passed: boolean;
  readonly saveRatio: number; // 0-1
  readonly timeBonus: number; // 0-100
  readonly efficiencyBonus: number; // 0-100
  readonly totalScore: number; // 0-1000
  readonly rank: 'S' | 'A' | 'B' | 'C' | 'F';
}

export class ScoringSystem {
  /** Calculate the full score breakdown for a completed level. */
  static calculate(result: LevelResult): ScoreBreakdown {
    const stars = ScoringSystem.calculateStars(
      result.saved,
      result.total,
      result.par,
    );
    const passed = stars > 0;
    const saveRatio =
      result.total > 0 ? result.saved / result.total : 0;
    const saveScore = saveRatio * 500;
    const timeBonus = ScoringSystem.calculateTimeBonus(
      result.timeElapsed,
      result.timeLimit,
    );
    const efficiencyBonus = ScoringSystem.calculateEfficiency(
      result.skillsUsed,
      result.skillsAvailable,
    );
    const totalScore = Math.min(
      1000,
      Math.round(saveScore + timeBonus + efficiencyBonus),
    );
    const rank = ScoringSystem.calculateRank(
      passed ? totalScore : -1,
    );

    return {
      stars,
      passed,
      saveRatio,
      timeBonus,
      efficiencyBonus,
      totalScore,
      rank,
    };
  }

  /** Calculate star rating (0-3). */
  static calculateStars(
    saved: number,
    total: number,
    par: number,
  ): number {
    if (saved < par) {
      return 0;
    }
    if (total > 0 && saved >= total) {
      return 3;
    }
    if (total > 0 && saved >= total * 0.75) {
      return 2;
    }
    return 1;
  }

  /**
   * Calculate time bonus (0-300).
   * With a time limit: bonus = max(0, (1 - elapsed/limit) * 300).
   * Without a time limit (timeLimit <= 0): flat 150 bonus.
   */
  static calculateTimeBonus(
    timeElapsed: number,
    timeLimit: number,
  ): number {
    if (timeLimit <= 0) {
      return 150;
    }
    const ratio = 1 - timeElapsed / timeLimit;
    return Math.max(0, Math.round(ratio * 300));
  }

  /**
   * Calculate efficiency bonus (0-200).
   * Based on the ratio of unused skill slots vs total available.
   * If no skills are available, returns the full 200 (nothing to waste).
   */
  static calculateEfficiency(
    used: Record<string, number>,
    available: Record<string, number>,
  ): number {
    const totalAvailable = Object.values(available).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (totalAvailable === 0) {
      return 200;
    }
    const totalUsed = Object.entries(used).reduce(
      (sum, [skill, count]) => {
        const cap = available[skill] ?? 0;
        return sum + Math.min(count, cap);
      },
      0,
    );
    const unusedRatio = (totalAvailable - totalUsed) / totalAvailable;
    return Math.round(Math.max(0, Math.min(1, unusedRatio)) * 200);
  }

  /**
   * Calculate rank from total score.
   * A negative score means the level was failed (rank F).
   */
  static calculateRank(
    totalScore: number,
  ): 'S' | 'A' | 'B' | 'C' | 'F' {
    if (totalScore < 0) {
      return 'F';
    }
    if (totalScore >= 900) {
      return 'S';
    }
    if (totalScore >= 750) {
      return 'A';
    }
    if (totalScore >= 500) {
      return 'B';
    }
    return 'C';
  }
}
