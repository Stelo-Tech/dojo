/**
 * SaveSystem — persistence layer for game progress.
 *
 * Storage priority:
 *   1. localStorage  (fast, synchronous)
 *   2. IndexedDB      (fallback when localStorage is full / unavailable)
 *   3. in-memory only (graceful degradation — session-only)
 *
 * The save format is versioned; older saves are migrated automatically
 * via sequential transform functions.
 */
import { gameEventBus } from '@/utils/EventBus';
import {
  type GameSave,
  type LevelProgress,
  SAVE_VERSION,
  SAVE_KEY,
  AUTO_SAVE_INTERVAL_MS,
  createDefaultSave,
} from '@/systems/SaveTypes';

const IDB_NAME = 'lemmings_db';
const IDB_STORE = 'saves';
const IDB_VERSION = 1;

export class SaveSystem {
  private data: GameSave;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.data = this.load();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Load save from storage, returning a valid GameSave (default if none found). */
  load(): GameSave {
    const raw = this.readFromLocalStorage();
    if (raw !== null) {
      const parsed = this.parseAndMigrate(raw);
      if (parsed !== null) {
        this.data = parsed;
        return this.data;
      }
    }
    // localStorage miss — fall back to default.
    // IndexedDB load is async and handled separately via loadAsync().
    this.data = createDefaultSave();
    return this.data;
  }

  /**
   * Attempt an async load from IndexedDB (called once at startup when
   * localStorage is empty).  Returns the loaded save or null.
   */
  async loadAsync(): Promise<GameSave> {
    const idb = await this.loadFromIndexedDB();
    if (idb !== null) {
      this.data = idb;
      return this.data;
    }
    return this.data;
  }

  /** Persist current data to storage.  Returns true on success. */
  save(): boolean {
    this.data = { ...this.data, savedAt: new Date().toISOString() };
    const success = this.writeToLocalStorage(this.data);
    // Fire-and-forget IndexedDB backup
    this.saveToIndexedDB(this.data).catch(() => {
      /* best-effort */
    });
    return success;
  }

  /** Start auto-save interval (every 30 seconds). */
  startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, AUTO_SAVE_INTERVAL_MS);
  }

  /** Stop auto-save interval. */
  stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /** Get level progress for a given level id, or undefined if not played. */
  getLevelProgress(levelId: number): LevelProgress | undefined {
    return this.data.levels[levelId];
  }

  /**
   * Update level progress after a level attempt.
   * Keeps the best scores (most saved, least time) and increments attempt count.
   *
   * Star calculation:
   *   3 stars — saved === total  (100 %)
   *   2 stars — saved >= 75 % of total
   *   1 star  — level completed (saved >= 1)
   *   0 stars — not completed
   */
  updateLevelProgress(
    levelId: number,
    saved: number,
    total: number,
    time: number,
  ): void {
    const completed = saved > 0;
    const stars = this.calculateStars(saved, total);
    const existing = this.data.levels[levelId];

    const bestSaved = existing ? Math.max(existing.bestSaved, saved) : saved;
    const bestTime =
      existing && existing.bestTime > 0
        ? time > 0
          ? Math.min(existing.bestTime, time)
          : existing.bestTime
        : time;
    const bestStars = existing ? Math.max(existing.stars, stars) : stars;
    const wasCompleted = existing ? existing.completed : false;
    const attempts = existing ? existing.attempts + 1 : 1;

    const progress: LevelProgress = {
      completed: wasCompleted || completed,
      stars: bestStars,
      bestSaved,
      bestTime,
      attempts,
    };

    // Levels record is readonly at the type level — build a new one.
    const newLevels: Record<number, LevelProgress> = { ...this.data.levels };
    newLevels[levelId] = progress;

    // Track new completions in stats
    const newCompletion = !wasCompleted && completed ? 1 : 0;

    this.data = {
      ...this.data,
      levels: newLevels,
      lastPlayedLevel: levelId,
      stats: {
        ...this.data.stats,
        totalLevelsCompleted:
          this.data.stats.totalLevelsCompleted + newCompletion,
      },
    };

    gameEventBus.emit('level:complete', { saved, total });
  }

  /**
   * Check whether a level is unlocked.
   * Level 1 is always unlocked; subsequent levels require the previous
   * level to be completed.
   */
  isLevelUnlocked(levelId: number): boolean {
    if (levelId <= 1) return true;
    const prev = this.data.levels[levelId - 1];
    return prev !== undefined && prev.completed;
  }

  /** Sum of stars across all levels. */
  getTotalStars(): number {
    let total = 0;
    const levels = this.data.levels;
    const keys = Object.keys(levels);
    for (let i = 0; i < keys.length; i++) {
      const key = Number(keys[i]);
      const progress = levels[key];
      if (progress) {
        total += progress.stars;
      }
    }
    return total;
  }

  /** Get last played level id. */
  getLastPlayedLevel(): number {
    return this.data.lastPlayedLevel;
  }

  /** Update aggregate gameplay stats. */
  updateStats(saved: number, lost: number, playTime: number): void {
    this.data = {
      ...this.data,
      stats: {
        ...this.data.stats,
        totalPlayTime: this.data.stats.totalPlayTime + playTime,
        totalLemmingsSaved: this.data.stats.totalLemmingsSaved + saved,
        totalLemmingsLost: this.data.stats.totalLemmingsLost + lost,
      },
    };
  }

  /** Get a snapshot of the current save data. */
  getData(): GameSave {
    return this.data;
  }

  /** Reset all progress back to defaults. */
  resetProgress(): void {
    this.data = createDefaultSave();
    this.save();
  }

  /** Clean up resources (stop auto-save, etc.). */
  destroy(): void {
    this.stopAutoSave();
  }

  // ---------------------------------------------------------------------------
  // Private — storage helpers
  // ---------------------------------------------------------------------------

  private readFromLocalStorage(): string | null {
    try {
      return localStorage.getItem(SAVE_KEY);
    } catch {
      return null;
    }
  }

  private writeToLocalStorage(data: GameSave): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — IndexedDB fallback
  // ---------------------------------------------------------------------------

  private openIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToIndexedDB(data: GameSave): Promise<boolean> {
    try {
      const db = await this.openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(JSON.stringify(data), SAVE_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }

  private async loadFromIndexedDB(): Promise<GameSave | null> {
    try {
      const db = await this.openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const request = store.get(SAVE_KEY);
        request.onsuccess = () => {
          db.close();
          const raw = request.result;
          if (typeof raw === 'string') {
            resolve(this.parseAndMigrate(raw));
          } else {
            resolve(null);
          }
        };
        request.onerror = () => {
          db.close();
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — parsing, validation, migration
  // ---------------------------------------------------------------------------

  private parseAndMigrate(raw: string): GameSave | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (this.isValidSave(parsed)) {
        if (parsed.version < SAVE_VERSION) {
          return this.migrate(parsed);
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Migrate save data from older versions.
   * Migrations are applied sequentially: v1 -> v2 -> v3 -> ...
   */
  private migrate(data: GameSave): GameSave {
    let current: GameSave = { ...data };

    // Example: when SAVE_VERSION becomes 2, add:
    // if (current.version === 1) {
    //   current = { ...current, version: 2, newField: defaultValue };
    // }

    // Ensure we end up at the current version
    current = { ...current, version: SAVE_VERSION };
    return current;
  }

  /**
   * Validate that an unknown value has the shape of a GameSave.
   * This is a structural type guard — it checks every required field
   * and its primitive type.
   */
  private isValidSave(data: unknown): data is GameSave {
    if (data === null || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;

    if (typeof obj['version'] !== 'number') return false;
    if (typeof obj['lastPlayedLevel'] !== 'number') return false;
    if (typeof obj['savedAt'] !== 'string') return false;

    // levels
    if (obj['levels'] === null || typeof obj['levels'] !== 'object') return false;

    // settings
    if (!this.isValidSettings(obj['settings'])) return false;

    // stats
    if (!this.isValidStats(obj['stats'])) return false;

    return true;
  }

  private isValidSettings(data: unknown): boolean {
    if (data === null || typeof data !== 'object') return false;
    const s = data as Record<string, unknown>;
    return (
      typeof s['musicVolume'] === 'number' &&
      typeof s['sfxVolume'] === 'number' &&
      typeof s['muted'] === 'boolean'
    );
  }

  private isValidStats(data: unknown): boolean {
    if (data === null || typeof data !== 'object') return false;
    const s = data as Record<string, unknown>;
    return (
      typeof s['totalPlayTime'] === 'number' &&
      typeof s['totalLemmingsSaved'] === 'number' &&
      typeof s['totalLemmingsLost'] === 'number' &&
      typeof s['totalLevelsCompleted'] === 'number'
    );
  }

  // ---------------------------------------------------------------------------
  // Private — star calculation
  // ---------------------------------------------------------------------------

  private calculateStars(saved: number, total: number): number {
    if (total <= 0 || saved <= 0) return 0;
    if (saved >= total) return 3;
    if (saved / total >= 0.75) return 2;
    return 1;
  }
}

/** Singleton instance for global access. */
export const saveSystem = new SaveSystem();
