import { describe, it, expect } from 'vitest';
import { LevelValidator } from '../../../src/levels/LevelValidator';
import { level01 } from '../../../src/levels/data/level01';
import { level02 } from '../../../src/levels/data/level02';
import { level03 } from '../../../src/levels/data/level03';
import { level04 } from '../../../src/levels/data/level04';
import { level05 } from '../../../src/levels/data/level05';
import type { LevelData } from '../../../src/levels/LevelTypes';

const allLevels: readonly LevelData[] = [level01, level02, level03, level04, level05];

describe('Tutorial levels', () => {
  it('have sequential ids starting at 1', () => {
    const ids = allLevels.map((l) => l.id);
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it('all pass LevelValidator', () => {
    for (const level of allLevels) {
      const result = LevelValidator.validate(level);
      expect(result.valid, `Level ${level.id} ("${level.name}") errors: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  it('have non-empty descriptions', () => {
    for (const level of allLevels) {
      expect(level.description, `Level ${level.id} missing description`).toBeTruthy();
      expect(level.description?.trim().length).toBeGreaterThan(0);
    }
  });

  it('have par <= spawn.count for every level', () => {
    for (const level of allLevels) {
      expect(level.par, `Level ${level.id}: par > spawn.count`).toBeLessThanOrEqual(level.spawn.count);
    }
  });

  it('have at most 5 tool types per level', () => {
    for (const level of allLevels) {
      const toolCount = Object.values(level.tools).filter((v) => v !== undefined && v > 0).length;
      expect(toolCount, `Level ${level.id} has ${toolCount} tool types`).toBeLessThanOrEqual(5);
    }
  });

  // ── Level-specific checks ───────────────────────────────────────────────

  describe('level01 — First Steps', () => {
    it('has id=1 and difficulty=tutorial', () => {
      expect(level01.id).toBe(1);
      expect(level01.difficulty).toBe('tutorial');
    });

    it('requires no tools', () => {
      const toolCount = Object.keys(level01.tools).length;
      expect(toolCount).toBe(0);
    });

    it('has 10 lemmings with par=8', () => {
      expect(level01.spawn.count).toBe(10);
      expect(level01.par).toBe(8);
    });
  });

  describe('level02 — Mind the Gap', () => {
    it('has stairs and ramp tools', () => {
      expect(level02.tools.stairs).toBeGreaterThan(0);
      expect(level02.tools.ramp).toBeGreaterThan(0);
    });

    it('has exactly 2 terrain platforms (gap in between)', () => {
      expect(level02.terrain).toHaveLength(2);
    });
  });

  describe('level03 — Dig Down', () => {
    it('has dig tool', () => {
      expect(level03.tools.dig).toBeGreaterThan(0);
    });

    it('has no other tool types', () => {
      const { dig, ...rest } = level03.tools;
      const hasOthers = Object.values(rest).some((v) => v !== undefined && v > 0);
      expect(hasOthers).toBe(false);
      void dig; // used for destructuring
    });
  });

  describe('level04 — Wall Street', () => {
    it('has 15 lemmings and par=10', () => {
      expect(level04.spawn.count).toBe(15);
      expect(level04.par).toBe(10);
    });

    it('has dig, wall and stairs tools', () => {
      expect(level04.tools.dig).toBeGreaterThan(0);
      expect(level04.tools.wall).toBeGreaterThan(0);
      expect(level04.tools.stairs).toBeGreaterThan(0);
    });
  });

  describe('level05 — Combo Meal', () => {
    it('requires 4 different tool types', () => {
      const toolCount = Object.values(level05.tools).filter((v) => v !== undefined && v > 0).length;
      expect(toolCount).toBe(4);
    });

    it('has stairs >= 3 for the multi-gap puzzle', () => {
      expect(level05.tools.stairs).toBeGreaterThanOrEqual(3);
    });
  });
});
