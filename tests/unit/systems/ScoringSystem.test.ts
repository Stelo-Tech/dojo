import { describe, it, expect } from 'vitest';
import {
  ScoringSystem,
  LevelResult,
} from '@/systems/ScoringSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  overrides: Partial<LevelResult> = {},
): LevelResult {
  return {
    levelId: 1,
    saved: 10,
    total: 10,
    par: 8,
    timeElapsed: 60,
    timeLimit: 120,
    skillsUsed: {},
    skillsAvailable: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateStars
// ---------------------------------------------------------------------------

describe('ScoringSystem.calculateStars', () => {
  it('returns 0 stars when saved < par', () => {
    expect(ScoringSystem.calculateStars(5, 10, 8)).toBe(0);
  });

  it('returns 1 star when saved equals par but < 75%', () => {
    // par=6, saved=6, total=10 -> 60% -> 1 star
    expect(ScoringSystem.calculateStars(6, 10, 6)).toBe(1);
  });

  it('returns 1 star when saved equals par exactly at 70%', () => {
    expect(ScoringSystem.calculateStars(7, 10, 7)).toBe(1);
  });

  it('returns 2 stars when saved >= 75% of total', () => {
    expect(ScoringSystem.calculateStars(8, 10, 7)).toBe(2);
  });

  it('returns 2 stars at exactly 75% boundary', () => {
    // 15 of 20 = 75%
    expect(ScoringSystem.calculateStars(15, 20, 10)).toBe(2);
  });

  it('returns 3 stars when saved equals total', () => {
    expect(ScoringSystem.calculateStars(10, 10, 8)).toBe(3);
  });

  it('returns 3 stars even when total is 1', () => {
    expect(ScoringSystem.calculateStars(1, 1, 1)).toBe(3);
  });

  it('returns 0 stars when saved is 0', () => {
    expect(ScoringSystem.calculateStars(0, 10, 8)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateTimeBonus
// ---------------------------------------------------------------------------

describe('ScoringSystem.calculateTimeBonus', () => {
  it('returns 150 when there is no time limit', () => {
    expect(ScoringSystem.calculateTimeBonus(60, 0)).toBe(150);
  });

  it('returns 300 when elapsed is 0 with a time limit', () => {
    expect(ScoringSystem.calculateTimeBonus(0, 120)).toBe(300);
  });

  it('returns 0 when elapsed equals the time limit', () => {
    expect(ScoringSystem.calculateTimeBonus(120, 120)).toBe(0);
  });

  it('returns 0 when elapsed exceeds the time limit', () => {
    expect(ScoringSystem.calculateTimeBonus(200, 120)).toBe(0);
  });

  it('returns half bonus at 50% time', () => {
    expect(ScoringSystem.calculateTimeBonus(60, 120)).toBe(150);
  });

  it('returns 150 for negative time limit (treated as no limit)', () => {
    expect(ScoringSystem.calculateTimeBonus(60, -1)).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// calculateEfficiency
// ---------------------------------------------------------------------------

describe('ScoringSystem.calculateEfficiency', () => {
  it('returns 200 when no skills are available', () => {
    expect(ScoringSystem.calculateEfficiency({}, {})).toBe(200);
  });

  it('returns 200 when no skills are used', () => {
    expect(
      ScoringSystem.calculateEfficiency(
        {},
        { dig: 5, stairs: 5 },
      ),
    ).toBe(200);
  });

  it('returns 0 when all skills are used', () => {
    expect(
      ScoringSystem.calculateEfficiency(
        { dig: 5, stairs: 5 },
        { dig: 5, stairs: 5 },
      ),
    ).toBe(0);
  });

  it('returns proportional bonus for partial usage', () => {
    // 3 used out of 10 available = 70% unused = 140
    expect(
      ScoringSystem.calculateEfficiency(
        { dig: 3 },
        { dig: 5, stairs: 5 },
      ),
    ).toBe(140);
  });

  it('caps used count at available count per skill', () => {
    // Even if used says dig:10, only 5 available, so 5 counted
    // 5 used of 10 total = 50% unused = 100
    expect(
      ScoringSystem.calculateEfficiency(
        { dig: 10 },
        { dig: 5, stairs: 5 },
      ),
    ).toBe(100);
  });

  it('ignores skills used that are not in available', () => {
    // 'bomb' is not available, so its usage is ignored
    // 0 used of 5 available = 100% unused = 200
    expect(
      ScoringSystem.calculateEfficiency(
        { bomb: 3 },
        { dig: 5 },
      ),
    ).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// calculateRank
// ---------------------------------------------------------------------------

describe('ScoringSystem.calculateRank', () => {
  it('returns S for score >= 900', () => {
    expect(ScoringSystem.calculateRank(900)).toBe('S');
    expect(ScoringSystem.calculateRank(1000)).toBe('S');
  });

  it('returns A for score >= 750 and < 900', () => {
    expect(ScoringSystem.calculateRank(750)).toBe('A');
    expect(ScoringSystem.calculateRank(899)).toBe('A');
  });

  it('returns B for score >= 500 and < 750', () => {
    expect(ScoringSystem.calculateRank(500)).toBe('B');
    expect(ScoringSystem.calculateRank(749)).toBe('B');
  });

  it('returns C for score >= 0 and < 500', () => {
    expect(ScoringSystem.calculateRank(0)).toBe('C');
    expect(ScoringSystem.calculateRank(499)).toBe('C');
  });

  it('returns F for negative score (failed level)', () => {
    expect(ScoringSystem.calculateRank(-1)).toBe('F');
  });
});

// ---------------------------------------------------------------------------
// calculate (full breakdown)
// ---------------------------------------------------------------------------

describe('ScoringSystem.calculate', () => {
  it('calculates a perfect score for 100% saved, fast, no skills used', () => {
    const result = makeResult({
      saved: 10,
      total: 10,
      par: 8,
      timeElapsed: 0,
      timeLimit: 120,
      skillsUsed: {},
      skillsAvailable: { dig: 5, stairs: 5 },
    });
    const breakdown = ScoringSystem.calculate(result);

    expect(breakdown.stars).toBe(3);
    expect(breakdown.passed).toBe(true);
    expect(breakdown.saveRatio).toBe(1);
    expect(breakdown.timeBonus).toBe(300);
    expect(breakdown.efficiencyBonus).toBe(200);
    expect(breakdown.totalScore).toBe(1000);
    expect(breakdown.rank).toBe('S');
  });

  it('calculates a failed level (saved < par)', () => {
    const result = makeResult({
      saved: 3,
      total: 10,
      par: 8,
    });
    const breakdown = ScoringSystem.calculate(result);

    expect(breakdown.stars).toBe(0);
    expect(breakdown.passed).toBe(false);
    expect(breakdown.rank).toBe('F');
  });

  it('calculates 1-star result when par is barely met', () => {
    const result = makeResult({
      saved: 6,
      total: 10,
      par: 6,
      timeElapsed: 110,
      timeLimit: 120,
      skillsUsed: { dig: 5, stairs: 5 },
      skillsAvailable: { dig: 5, stairs: 5 },
    });
    const breakdown = ScoringSystem.calculate(result);

    expect(breakdown.stars).toBe(1);
    expect(breakdown.passed).toBe(true);
    // saveScore = 0.6 * 500 = 300
    // timeBonus = max(0, (1 - 110/120)*300) = round(25) = 25
    // efficiency = 0 (all used)
    expect(breakdown.totalScore).toBe(325);
    expect(breakdown.rank).toBe('C');
  });

  it('handles 0 total lemmings gracefully', () => {
    const result = makeResult({
      saved: 0,
      total: 0,
      par: 0,
    });
    const breakdown = ScoringSystem.calculate(result);

    expect(breakdown.saveRatio).toBe(0);
    // 0 saved, 0 par -> calculateStars(0, 0, 0) -> saved < par is false (0 >= 0),
    // total is 0 so saved >= total check: 0 >= 0 -> 3 stars? No, total > 0 guard
    // 0 >= 0*0.75 = 0 -> total > 0 guard again. Fallback to 1 star.
    expect(breakdown.stars).toBe(1);
  });

  it('caps total score at 1000', () => {
    // This should naturally max at 1000 but let's verify
    const result = makeResult({
      saved: 10,
      total: 10,
      par: 1,
      timeElapsed: 0,
      timeLimit: 120,
      skillsUsed: {},
      skillsAvailable: {},
    });
    const breakdown = ScoringSystem.calculate(result);

    // saveScore = 500, timeBonus = 300, efficiency = 200 = 1000
    expect(breakdown.totalScore).toBeLessThanOrEqual(1000);
  });

  it('is deterministic (same inputs produce same outputs)', () => {
    const result = makeResult({
      saved: 7,
      total: 10,
      par: 6,
      timeElapsed: 45,
      timeLimit: 120,
      skillsUsed: { dig: 2 },
      skillsAvailable: { dig: 5, stairs: 3 },
    });
    const a = ScoringSystem.calculate(result);
    const b = ScoringSystem.calculate(result);

    expect(a).toEqual(b);
  });

  it('scores a no-time-limit level correctly', () => {
    const result = makeResult({
      saved: 10,
      total: 10,
      par: 8,
      timeElapsed: 300,
      timeLimit: 0,
      skillsUsed: { dig: 1 },
      skillsAvailable: { dig: 3 },
    });
    const breakdown = ScoringSystem.calculate(result);

    expect(breakdown.timeBonus).toBe(150);
    // saveScore = 500, timeBonus = 150, efficiency = (2/3)*200 = round(133) = 133
    expect(breakdown.efficiencyBonus).toBe(133);
    expect(breakdown.totalScore).toBe(783);
    expect(breakdown.rank).toBe('A');
  });
});
