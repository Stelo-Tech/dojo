import { describe, it, expect } from 'vitest';
import { LevelValidator } from '../../../src/levels/LevelValidator';
import type { LevelData } from '../../../src/levels/LevelTypes';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A minimal valid level used as baseline for mutation tests */
function makeValidLevel(overrides: Partial<LevelData> = {}): LevelData {
  return {
    id: 1,
    name: 'test-level',
    difficulty: 'tutorial',
    par: 8,
    terrain: [{ x: 0, y: 450, w: 960, h: 90 }],
    spawn: { x: 80, y: 430, rate: 1000, count: 10 },
    exit: { x: 860, y: 420, w: 40, h: 30 },
    tools: {},
    ...overrides,
  };
}

// ── LevelValidator ────────────────────────────────────────────────────────────

describe('LevelValidator', () => {
  // ── Happy path ──────────────────────────────────────────────────────────

  describe('valid level', () => {
    it('returns valid=true for a well-formed level', () => {
      const result = LevelValidator.validate(makeValidLevel());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a level with tools', () => {
      const result = LevelValidator.validate(makeValidLevel({ tools: { dig: 3, stairs: 2 } }));
      expect(result.valid).toBe(true);
    });

    it('accepts par === spawn.count', () => {
      const result = LevelValidator.validate(makeValidLevel({ par: 10 }));
      expect(result.valid).toBe(true);
    });

    it('accepts all difficulty values', () => {
      for (const diff of ['tutorial', 'easy', 'medium', 'hard'] as const) {
        const result = LevelValidator.validate(makeValidLevel({ difficulty: diff }));
        expect(result.valid).toBe(true);
      }
    });

    it('accepts optional timeLimit when positive', () => {
      const result = LevelValidator.validate(makeValidLevel({ timeLimit: 120 }));
      expect(result.valid).toBe(true);
    });
  });

  // ── ID validation ───────────────────────────────────────────────────────

  describe('id validation', () => {
    it('rejects id = 0', () => {
      const result = LevelValidator.validate(makeValidLevel({ id: 0 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('rejects negative id', () => {
      const result = LevelValidator.validate(makeValidLevel({ id: -5 }));
      expect(result.valid).toBe(false);
    });

    it('rejects fractional id', () => {
      const result = LevelValidator.validate(makeValidLevel({ id: 1.5 }));
      expect(result.valid).toBe(false);
    });
  });

  // ── Name validation ─────────────────────────────────────────────────────

  describe('name validation', () => {
    it('rejects empty name', () => {
      const result = LevelValidator.validate(makeValidLevel({ name: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    });

    it('rejects whitespace-only name', () => {
      const result = LevelValidator.validate(makeValidLevel({ name: '   ' }));
      expect(result.valid).toBe(false);
    });
  });

  // ── Terrain validation ──────────────────────────────────────────────────

  describe('terrain validation', () => {
    it('rejects empty terrain array', () => {
      const result = LevelValidator.validate(makeValidLevel({ terrain: [] }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('terrain rect'))).toBe(true);
    });

    it('rejects terrain rect exceeding game width', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ terrain: [{ x: 900, y: 450, w: 200, h: 90 }] }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds game bounds'))).toBe(true);
    });

    it('rejects terrain rect exceeding game height', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ terrain: [{ x: 0, y: 500, w: 100, h: 100 }] }),
      );
      expect(result.valid).toBe(false);
    });

    it('rejects terrain rect with negative x', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ terrain: [{ x: -10, y: 450, w: 100, h: 90 }] }),
      );
      expect(result.valid).toBe(false);
    });
  });

  // ── Spawn validation ────────────────────────────────────────────────────

  describe('spawn validation', () => {
    it('rejects spawn inside terrain', () => {
      // Spawn at (80, 460) is inside terrain (y=450, h=90)
      const result = LevelValidator.validate(
        makeValidLevel({ spawn: { x: 80, y: 460, rate: 1000, count: 10 } }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('inside a terrain rect'))).toBe(true);
    });

    it('rejects spawn.count <= 0', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ spawn: { x: 80, y: 430, rate: 1000, count: 0 } }),
      );
      expect(result.valid).toBe(false);
    });

    it('rejects spawn.rate <= 0', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ spawn: { x: 80, y: 430, rate: 0, count: 10 } }),
      );
      expect(result.valid).toBe(false);
    });

    it('rejects spawn outside game bounds', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ spawn: { x: 1000, y: 430, rate: 1000, count: 10 } }),
      );
      expect(result.valid).toBe(false);
    });
  });

  // ── par validation ──────────────────────────────────────────────────────

  describe('par validation', () => {
    it('rejects par > spawn.count', () => {
      const result = LevelValidator.validate(makeValidLevel({ par: 15 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('par'))).toBe(true);
    });
  });

  // ── Tool validation ─────────────────────────────────────────────────────

  describe('tool validation', () => {
    it('rejects negative tool count', () => {
      const result = LevelValidator.validate(makeValidLevel({ tools: { dig: -1 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"dig"'))).toBe(true);
    });

    it('rejects fractional tool count', () => {
      const result = LevelValidator.validate(makeValidLevel({ tools: { stairs: 2.5 } }));
      expect(result.valid).toBe(false);
    });

    it('rejects more than 5 tool types', () => {
      const result = LevelValidator.validate(
        makeValidLevel({
          tools: { dig: 1, stairs: 1, wall: 1, ramp: 1, digger: 1, basher: 1 },
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('5'))).toBe(true);
    });

    it('accepts exactly 5 tool types', () => {
      const result = LevelValidator.validate(
        makeValidLevel({
          tools: { dig: 1, stairs: 1, wall: 1, ramp: 1, digger: 1 },
        }),
      );
      expect(result.valid).toBe(true);
    });
  });

  // ── Exit validation ─────────────────────────────────────────────────────

  describe('exit validation', () => {
    it('rejects exit fully enclosed in terrain', () => {
      // Exit placed entirely inside the terrain rect
      const result = LevelValidator.validate(
        makeValidLevel({
          terrain: [{ x: 0, y: 450, w: 960, h: 90 }],
          exit: { x: 100, y: 460, w: 40, h: 30 },
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('enclosed'))).toBe(true);
    });

    it('rejects exit outside game bounds', () => {
      const result = LevelValidator.validate(
        makeValidLevel({ exit: { x: 940, y: 420, w: 40, h: 30 } }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds game bounds'))).toBe(true);
    });
  });

  // ── timeLimit validation ────────────────────────────────────────────────

  describe('timeLimit validation', () => {
    it('rejects timeLimit = 0', () => {
      const result = LevelValidator.validate(makeValidLevel({ timeLimit: 0 }));
      expect(result.valid).toBe(false);
    });

    it('rejects negative timeLimit', () => {
      const result = LevelValidator.validate(makeValidLevel({ timeLimit: -10 }));
      expect(result.valid).toBe(false);
    });
  });

  // ── Warnings ────────────────────────────────────────────────────────────

  describe('warnings', () => {
    it('warns when par < 50% of spawn.count', () => {
      const result = LevelValidator.validate(makeValidLevel({ par: 4 }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('50%'))).toBe(true);
    });

    it('warns when non-tutorial level has no tools', () => {
      const result = LevelValidator.validate(makeValidLevel({ difficulty: 'easy', tools: {} }));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('no tools'))).toBe(true);
    });
  });

  // ── Multiple errors ─────────────────────────────────────────────────────

  describe('multiple errors', () => {
    it('collects all errors in one pass', () => {
      const result = LevelValidator.validate({
        id: -1,
        name: '',
        difficulty: 'tutorial',
        par: 20,
        terrain: [],
        spawn: { x: 80, y: 430, rate: -1, count: -1 },
        exit: { x: 860, y: 420, w: 40, h: 30 },
        tools: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
});
