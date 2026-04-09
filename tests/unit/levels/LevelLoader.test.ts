import { describe, it, expect, beforeEach } from 'vitest';
import { LevelLoader } from '../../../src/levels/LevelLoader';
import type { LevelData } from '../../../src/levels/LevelTypes';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLevel(id: number, name = `level-${id}`): LevelData {
  return {
    id,
    name,
    difficulty: 'tutorial',
    par: 8,
    terrain: [{ x: 0, y: 450, w: 960, h: 90 }],
    spawn: { x: 80, y: 430, rate: 1000, count: 10 },
    exit: { x: 860, y: 420, w: 40, h: 30 },
    tools: {},
  };
}

// ── LevelLoader ───────────────────────────────────────────────────────────────

describe('LevelLoader', () => {
  beforeEach(() => {
    LevelLoader.clearAll();
  });

  // ── registerLevel ───────────────────────────────────────────────────────

  describe('registerLevel', () => {
    it('registers a valid level without throwing', () => {
      expect(() => LevelLoader.registerLevel(makeLevel(1))).not.toThrow();
    });

    it('throws when registering an invalid level', () => {
      const badLevel: LevelData = { ...makeLevel(1), name: '' }; // invalid name
      expect(() => LevelLoader.registerLevel(badLevel)).toThrow();
    });

    it('throws when registering a duplicate id', () => {
      LevelLoader.registerLevel(makeLevel(1));
      expect(() => LevelLoader.registerLevel(makeLevel(1, 'other-name'))).toThrow(
        'already registered',
      );
    });
  });

  // ── getLevel ────────────────────────────────────────────────────────────

  describe('getLevel', () => {
    it('returns the level by id', () => {
      LevelLoader.registerLevel(makeLevel(42));
      const l = LevelLoader.getLevel(42);
      expect(l).toBeDefined();
      expect(l?.id).toBe(42);
    });

    it('returns undefined for unknown id', () => {
      expect(LevelLoader.getLevel(999)).toBeUndefined();
    });
  });

  // ── getAllLevels ─────────────────────────────────────────────────────────

  describe('getAllLevels', () => {
    it('returns levels sorted by id', () => {
      LevelLoader.registerLevel(makeLevel(3));
      LevelLoader.registerLevel(makeLevel(1));
      LevelLoader.registerLevel(makeLevel(2));
      const levels = LevelLoader.getAllLevels();
      expect(levels.map((l) => l.id)).toEqual([1, 2, 3]);
    });

    it('returns an empty array when no levels registered', () => {
      expect(LevelLoader.getAllLevels()).toHaveLength(0);
    });
  });

  // ── getLevelCount ───────────────────────────────────────────────────────

  describe('getLevelCount', () => {
    it('returns 0 when empty', () => {
      expect(LevelLoader.getLevelCount()).toBe(0);
    });

    it('returns correct count after registrations', () => {
      LevelLoader.registerLevel(makeLevel(1));
      LevelLoader.registerLevel(makeLevel(2));
      expect(LevelLoader.getLevelCount()).toBe(2);
    });
  });

  // ── getLevelsByDifficulty ────────────────────────────────────────────────

  describe('getLevelsByDifficulty', () => {
    it('filters by difficulty', () => {
      LevelLoader.registerLevel(makeLevel(1)); // tutorial
      LevelLoader.registerLevel({ ...makeLevel(2), difficulty: 'easy' });
      LevelLoader.registerLevel({ ...makeLevel(3), difficulty: 'easy' });

      const easy = LevelLoader.getLevelsByDifficulty('easy');
      expect(easy).toHaveLength(2);
      expect(easy.every((l) => l.difficulty === 'easy')).toBe(true);
    });

    it('returns empty array for unknown difficulty', () => {
      LevelLoader.registerLevel(makeLevel(1));
      expect(LevelLoader.getLevelsByDifficulty('legendary')).toHaveLength(0);
    });
  });
});
