/**
 * DailyChallengeSystem -- deterministic daily challenge generation.
 *
 * Seed formula: YYYYMMDD as a number (e.g. 20260409).
 * Tier rotates: (day of year) % 5 + 1.
 *
 * All methods are static and pure -- they rely on the current date
 * and the save data for persistence.
 */
import { saveSystem } from '@/systems/SaveSystem';
import type { DailyChallengeData } from '@/systems/SaveTypes';

export class DailyChallengeSystem {
  /** Get today's date string in YYYY-MM-DD format. */
  static getTodayDateString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Get today's challenge seed (YYYYMMDD as number). */
  static getTodaySeed(): number {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return y * 10000 + m * 100 + d;
  }

  /**
   * Get today's challenge tier (1-5).
   * Uses day-of-year modulo 5 for fair rotation across all tiers.
   */
  static getTodayTier(): 1 | 2 | 3 | 4 | 5 {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return ((dayOfYear % 5) + 1) as 1 | 2 | 3 | 4 | 5;
  }

  /** Check if today's challenge has been completed. */
  static isCompleted(): boolean {
    const challenge = saveSystem.getDailyChallenge();
    return challenge.lastCompleted === DailyChallengeSystem.getTodayDateString();
  }

  /**
   * Mark today's challenge as completed with the given score.
   * Updates streak: if yesterday was completed, increment; otherwise reset to 1.
   */
  static complete(score: number): void {
    const today = DailyChallengeSystem.getTodayDateString();
    const challenge = saveSystem.getDailyChallenge();

    // Calculate streak
    let newStreak = 1;
    if (challenge.lastCompleted !== '') {
      const yesterday = DailyChallengeSystem.getYesterdayDateString();
      if (challenge.lastCompleted === yesterday) {
        newStreak = challenge.streak + 1;
      } else if (challenge.lastCompleted === today) {
        // Already completed today, just update best score
        newStreak = challenge.streak;
      }
    }

    const newChallenge: DailyChallengeData = {
      lastCompleted: today,
      streak: newStreak,
      bestScore: Math.max(challenge.bestScore, score),
    };

    saveSystem.updateDailyChallenge(newChallenge);
    saveSystem.save();
  }

  /** Get the current streak count. */
  static getStreak(): number {
    const challenge = saveSystem.getDailyChallenge();
    const today = DailyChallengeSystem.getTodayDateString();
    const yesterday = DailyChallengeSystem.getYesterdayDateString();

    // Streak is valid only if last completed was today or yesterday
    if (
      challenge.lastCompleted === today ||
      challenge.lastCompleted === yesterday
    ) {
      return challenge.streak;
    }
    return 0;
  }

  /** Get yesterday's date string. */
  private static getYesterdayDateString(): string {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
