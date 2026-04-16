import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveSystem } from '@/systems/SaveSystem';
import {
  SAVE_KEY,
  SAVE_VERSION,
  createDefaultSave,
  type GameSave,
} from '@/systems/SaveTypes';

/**
 * Build a valid serialized save string for test injection.
 * Accepts partial overrides merged onto a default save.
 */
function buildSaveJSON(overrides?: Partial<GameSave>): string {
  return JSON.stringify({ ...createDefaultSave(), ...overrides });
}

describe('SaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // Construction & load
  // -------------------------------------------------------------------------

  describe('constructor / load', () => {
    it('returns default save when localStorage is empty', () => {
      const sys = new SaveSystem();
      const data = sys.getData();
      expect(data.version).toBe(SAVE_VERSION);
      expect(Object.keys(data.levels)).toHaveLength(0);
    });

    it('loads existing save from localStorage', () => {
      const existing = createDefaultSave();
      const levels: Record<number, (typeof existing.levels)[number]> = {
        1: { completed: true, stars: 2, bestSaved: 8, bestTime: 5000, attempts: 3 },
      };
      localStorage.setItem(
        SAVE_KEY,
        buildSaveJSON({ levels, lastPlayedLevel: 1 }),
      );

      const sys = new SaveSystem();
      expect(sys.getLevelProgress(1)).toBeDefined();
      expect(sys.getLevelProgress(1)?.completed).toBe(true);
      expect(sys.getLastPlayedLevel()).toBe(1);
    });

    it('returns default save when localStorage contains invalid JSON', () => {
      localStorage.setItem(SAVE_KEY, '!!!not-json!!!');
      const sys = new SaveSystem();
      expect(sys.getData().version).toBe(SAVE_VERSION);
    });

    it('returns default save when data shape is wrong', () => {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ foo: 'bar' }));
      const sys = new SaveSystem();
      expect(sys.getData().version).toBe(SAVE_VERSION);
      expect(Object.keys(sys.getData().levels)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // save()
  // -------------------------------------------------------------------------

  describe('save', () => {
    it('persists data to localStorage', () => {
      const sys = new SaveSystem();
      const result = sys.save();
      expect(result).toBe(true);

      const stored = localStorage.getItem(SAVE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored ?? '') as GameSave;
      expect(parsed.version).toBe(SAVE_VERSION);
    });

    it('updates savedAt timestamp on each save', () => {
      const sys = new SaveSystem();

      sys.save();
      const first = sys.getData().savedAt;

      sys.save();
      const second = sys.getData().savedAt;

      // Both should be valid ISO dates
      expect(new Date(first).toISOString()).toBe(first);
      expect(new Date(second).toISOString()).toBe(second);
      // second should be >= first (same ms is acceptable)
      expect(second >= first).toBe(true);
    });

    it('returns false when localStorage throws', () => {
      const sys = new SaveSystem();
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = sys.save();
      expect(result).toBe(false);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // updateLevelProgress
  // -------------------------------------------------------------------------

  describe('updateLevelProgress', () => {
    it('creates a new progress entry for an unplayed level', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 8, 10, 30000);

      const progress = sys.getLevelProgress(1);
      expect(progress).toBeDefined();
      expect(progress?.completed).toBe(true);
      expect(progress?.bestSaved).toBe(8);
      expect(progress?.bestTime).toBe(30000);
      expect(progress?.attempts).toBe(1);
    });

    it('awards 3 stars for 100% saved', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 10, 10, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(3);
    });

    it('awards 2 stars for 75%+ saved', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 8, 10, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(2);
    });

    it('awards 1 star for any completion (less than 75%)', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 3, 10, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(1);
    });

    it('awards 0 stars when no lemmings saved', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 0, 10, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(0);
      expect(sys.getLevelProgress(1)?.completed).toBe(false);
    });

    it('keeps the best saved count across multiple attempts', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 8, 10, 30000);
      sys.updateLevelProgress(1, 5, 10, 25000);

      expect(sys.getLevelProgress(1)?.bestSaved).toBe(8);
      expect(sys.getLevelProgress(1)?.attempts).toBe(2);
    });

    it('keeps the best time across multiple attempts', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 5, 10, 30000);
      sys.updateLevelProgress(1, 5, 10, 20000);

      expect(sys.getLevelProgress(1)?.bestTime).toBe(20000);
    });

    it('keeps the highest star count even if a worse attempt follows', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 10, 10, 20000); // 3 stars
      sys.updateLevelProgress(1, 3, 10, 25000); // 1 star

      expect(sys.getLevelProgress(1)?.stars).toBe(3);
    });

    it('preserves completed flag once set', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 5, 10, 20000); // completed
      sys.updateLevelProgress(1, 0, 10, 25000); // failed

      expect(sys.getLevelProgress(1)?.completed).toBe(true);
    });

    it('updates lastPlayedLevel', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(3, 5, 10, 20000);
      expect(sys.getLastPlayedLevel()).toBe(3);
    });

    it('increments totalLevelsCompleted only on first completion', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 5, 10, 20000); // first completion
      expect(sys.getData().stats.totalLevelsCompleted).toBe(1);

      sys.updateLevelProgress(1, 8, 10, 15000); // replay
      expect(sys.getData().stats.totalLevelsCompleted).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // isLevelUnlocked
  // -------------------------------------------------------------------------

  describe('isLevelUnlocked', () => {
    it('level 1 is always unlocked', () => {
      const sys = new SaveSystem();
      expect(sys.isLevelUnlocked(1)).toBe(true);
    });

    it('level 0 is always unlocked', () => {
      const sys = new SaveSystem();
      expect(sys.isLevelUnlocked(0)).toBe(true);
    });

    it('level 2 is locked when level 1 not completed', () => {
      const sys = new SaveSystem();
      expect(sys.isLevelUnlocked(2)).toBe(false);
    });

    it('level 2 is unlocked when level 1 is completed', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 5, 10, 20000);
      expect(sys.isLevelUnlocked(2)).toBe(true);
    });

    it('level 3 requires level 2 completed (not just level 1)', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 5, 10, 20000);
      expect(sys.isLevelUnlocked(3)).toBe(false);

      sys.updateLevelProgress(2, 5, 10, 20000);
      expect(sys.isLevelUnlocked(3)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getTotalStars
  // -------------------------------------------------------------------------

  describe('getTotalStars', () => {
    it('returns 0 when no levels played', () => {
      const sys = new SaveSystem();
      expect(sys.getTotalStars()).toBe(0);
    });

    it('sums stars across all completed levels', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 10, 10, 20000); // 3 stars
      sys.updateLevelProgress(2, 8, 10, 20000); // 2 stars
      sys.updateLevelProgress(3, 3, 10, 20000); // 1 star

      expect(sys.getTotalStars()).toBe(6);
    });
  });

  // -------------------------------------------------------------------------
  // updateStats
  // -------------------------------------------------------------------------

  describe('updateStats', () => {
    it('accumulates saved lemmings', () => {
      const sys = new SaveSystem();
      sys.updateStats(5, 3, 10000);
      sys.updateStats(10, 2, 5000);

      const stats = sys.getData().stats;
      expect(stats.totalLemmingsSaved).toBe(15);
      expect(stats.totalLemmingsLost).toBe(5);
      expect(stats.totalPlayTime).toBe(15000);
    });
  });

  // -------------------------------------------------------------------------
  // resetProgress
  // -------------------------------------------------------------------------

  describe('resetProgress', () => {
    it('resets all data to defaults', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 10, 10, 20000);
      sys.updateStats(50, 20, 300000);

      sys.resetProgress();

      expect(Object.keys(sys.getData().levels)).toHaveLength(0);
      expect(sys.getData().stats.totalLemmingsSaved).toBe(0);
      expect(sys.getData().stats.totalPlayTime).toBe(0);
      expect(sys.getLastPlayedLevel()).toBe(1);
    });

    it('persists the reset to localStorage', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 10, 10, 20000);
      sys.save();

      sys.resetProgress();

      const stored = localStorage.getItem(SAVE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored ?? '') as GameSave;
      expect(Object.keys(parsed.levels)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Auto-save
  // -------------------------------------------------------------------------

  describe('auto-save', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('saves periodically when auto-save is started', () => {
      const sys = new SaveSystem();
      sys.updateStats(5, 0, 1000);
      const saveSpy = vi.spyOn(sys, 'save');

      sys.startAutoSave();

      vi.advanceTimersByTime(30_000);
      expect(saveSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

      sys.destroy();
    });

    it('stops saving when auto-save is stopped', () => {
      const sys = new SaveSystem();
      const saveSpy = vi.spyOn(sys, 'save');

      sys.startAutoSave();
      sys.stopAutoSave();

      vi.advanceTimersByTime(60_000);
      expect(saveSpy).not.toHaveBeenCalled();

      sys.destroy();
    });

    it('destroy stops auto-save', () => {
      const sys = new SaveSystem();
      const saveSpy = vi.spyOn(sys, 'save');

      sys.startAutoSave();
      sys.destroy();

      vi.advanceTimersByTime(60_000);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('startAutoSave is idempotent (does not stack intervals)', () => {
      const sys = new SaveSystem();
      const saveSpy = vi.spyOn(sys, 'save');

      sys.startAutoSave();
      sys.startAutoSave();
      sys.startAutoSave();

      vi.advanceTimersByTime(30_000);
      // Should only fire once per interval, not 3 times
      expect(saveSpy.mock.calls.length).toBe(1);

      sys.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Migration
  // -------------------------------------------------------------------------

  describe('migration', () => {
    it('migrates a save with an older version number', () => {
      const oldSave = { ...createDefaultSave(), version: 0 };
      localStorage.setItem(SAVE_KEY, JSON.stringify(oldSave));

      const sys = new SaveSystem();
      expect(sys.getData().version).toBe(SAVE_VERSION);
    });
  });

  // -------------------------------------------------------------------------
  // Graceful degradation
  // -------------------------------------------------------------------------

  describe('graceful degradation', () => {
    it('works when localStorage.getItem throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const sys = new SaveSystem();
      expect(sys.getData().version).toBe(SAVE_VERSION);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles level progress for level 0', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(0, 5, 10, 20000);
      expect(sys.getLevelProgress(0)?.completed).toBe(true);
    });

    it('handles very large level IDs', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(9999, 5, 10, 20000);
      expect(sys.getLevelProgress(9999)?.completed).toBe(true);
    });

    it('handles time of 0 gracefully', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 5, 10, 0);
      expect(sys.getLevelProgress(1)?.bestTime).toBe(0);
    });

    it('getLevelProgress returns undefined for unknown level', () => {
      const sys = new SaveSystem();
      expect(sys.getLevelProgress(999)).toBeUndefined();
    });

    it('boundary: exactly 75% saved gives 2 stars', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 75, 100, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(2);
    });

    it('boundary: just under 75% saved gives 1 star', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 74, 100, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(1);
    });

    it('handles total of 0 (no lemmings) giving 0 stars', () => {
      const sys = new SaveSystem();
      sys.updateLevelProgress(1, 0, 0, 20000);
      expect(sys.getLevelProgress(1)?.stars).toBe(0);
    });
  });
});
