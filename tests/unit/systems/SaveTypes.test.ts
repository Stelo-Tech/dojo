import { describe, it, expect } from 'vitest';
import {
  SAVE_VERSION,
  SAVE_KEY,
  AUTO_SAVE_INTERVAL_MS,
  ANALYTICS_CONSENT_KEY,
  createDefaultSave,
} from '@/systems/SaveTypes';

describe('SaveTypes constants', () => {
  it('SAVE_VERSION is a positive integer', () => {
    expect(SAVE_VERSION).toBe(1);
    expect(Number.isInteger(SAVE_VERSION)).toBe(true);
  });

  it('SAVE_KEY is a non-empty string', () => {
    expect(SAVE_KEY).toBe('lemmings_save');
    expect(SAVE_KEY.length).toBeGreaterThan(0);
  });

  it('AUTO_SAVE_INTERVAL_MS is 30 seconds', () => {
    expect(AUTO_SAVE_INTERVAL_MS).toBe(30_000);
  });

  it('ANALYTICS_CONSENT_KEY is a non-empty string', () => {
    expect(ANALYTICS_CONSENT_KEY.length).toBeGreaterThan(0);
  });
});

describe('createDefaultSave', () => {
  it('returns a save with the current version', () => {
    const save = createDefaultSave();
    expect(save.version).toBe(SAVE_VERSION);
  });

  it('starts with empty levels record', () => {
    const save = createDefaultSave();
    expect(Object.keys(save.levels)).toHaveLength(0);
  });

  it('has sensible default settings', () => {
    const save = createDefaultSave();
    expect(save.settings.musicVolume).toBeGreaterThan(0);
    expect(save.settings.musicVolume).toBeLessThanOrEqual(1);
    expect(save.settings.sfxVolume).toBeGreaterThan(0);
    expect(save.settings.sfxVolume).toBeLessThanOrEqual(1);
    expect(save.settings.muted).toBe(false);
  });

  it('starts with zeroed-out stats', () => {
    const save = createDefaultSave();
    expect(save.stats.totalPlayTime).toBe(0);
    expect(save.stats.totalLemmingsSaved).toBe(0);
    expect(save.stats.totalLemmingsLost).toBe(0);
    expect(save.stats.totalLevelsCompleted).toBe(0);
  });

  it('sets lastPlayedLevel to 1', () => {
    const save = createDefaultSave();
    expect(save.lastPlayedLevel).toBe(1);
  });

  it('sets savedAt to a valid ISO date string', () => {
    const before = new Date().toISOString();
    const save = createDefaultSave();
    const after = new Date().toISOString();

    expect(save.savedAt).toBeTruthy();
    expect(save.savedAt >= before).toBe(true);
    expect(save.savedAt <= after).toBe(true);
  });

  it('returns a new object on each call (no shared references)', () => {
    const a = createDefaultSave();
    const b = createDefaultSave();
    expect(a).not.toBe(b);
    expect(a.settings).not.toBe(b.settings);
    expect(a.stats).not.toBe(b.stats);
    expect(a.levels).not.toBe(b.levels);
  });
});
