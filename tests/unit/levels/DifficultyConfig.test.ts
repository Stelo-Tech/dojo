import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_PRESETS,
  getDifficultyPreset,
  DifficultyPreset,
} from '@/levels/DifficultyConfig';

// ---------------------------------------------------------------------------
// Preset validation
// ---------------------------------------------------------------------------

describe('DIFFICULTY_PRESETS', () => {
  const expectedKeys = ['tutorial', 'easy', 'medium', 'hard'];

  it('contains all four difficulty tiers', () => {
    for (const key of expectedKeys) {
      expect(DIFFICULTY_PRESETS[key]).toBeDefined();
    }
  });

  it.each(expectedKeys)(
    '"%s" preset has a non-empty name',
    (key) => {
      const preset = DIFFICULTY_PRESETS[key];
      expect(preset).toBeDefined();
      expect((preset as DifficultyPreset).name.length).toBeGreaterThan(0);
    },
  );

  it.each(expectedKeys)(
    '"%s" preset has a positive spawnRate',
    (key) => {
      const preset = DIFFICULTY_PRESETS[key] as DifficultyPreset;
      expect(preset.spawnRate).toBeGreaterThan(0);
    },
  );

  it.each(expectedKeys)(
    '"%s" preset has a positive lemmingCount',
    (key) => {
      const preset = DIFFICULTY_PRESETS[key] as DifficultyPreset;
      expect(preset.lemmingCount).toBeGreaterThan(0);
    },
  );

  it.each(expectedKeys)(
    '"%s" preset parRatio is between 0 and 1',
    (key) => {
      const preset = DIFFICULTY_PRESETS[key] as DifficultyPreset;
      expect(preset.parRatio).toBeGreaterThan(0);
      expect(preset.parRatio).toBeLessThanOrEqual(1);
    },
  );

  it.each(expectedKeys)(
    '"%s" preset timeLimit is non-negative',
    (key) => {
      const preset = DIFFICULTY_PRESETS[key] as DifficultyPreset;
      expect(preset.timeLimit).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(expectedKeys)(
    '"%s" preset skillMultiplier is positive',
    (key) => {
      const preset = DIFFICULTY_PRESETS[key] as DifficultyPreset;
      expect(preset.skillMultiplier).toBeGreaterThan(0);
    },
  );

  it('tutorial has no time limit', () => {
    const tutorial = DIFFICULTY_PRESETS['tutorial'] as DifficultyPreset;
    expect(tutorial.timeLimit).toBe(0);
  });

  it('spawnRate decreases as difficulty increases', () => {
    const tutorial = DIFFICULTY_PRESETS['tutorial'] as DifficultyPreset;
    const easy = DIFFICULTY_PRESETS['easy'] as DifficultyPreset;
    const medium = DIFFICULTY_PRESETS['medium'] as DifficultyPreset;
    const hard = DIFFICULTY_PRESETS['hard'] as DifficultyPreset;

    expect(tutorial.spawnRate).toBeGreaterThan(easy.spawnRate);
    expect(easy.spawnRate).toBeGreaterThan(medium.spawnRate);
    expect(medium.spawnRate).toBeGreaterThan(hard.spawnRate);
  });

  it('lemmingCount increases as difficulty increases', () => {
    const tutorial = DIFFICULTY_PRESETS['tutorial'] as DifficultyPreset;
    const easy = DIFFICULTY_PRESETS['easy'] as DifficultyPreset;
    const medium = DIFFICULTY_PRESETS['medium'] as DifficultyPreset;
    const hard = DIFFICULTY_PRESETS['hard'] as DifficultyPreset;

    expect(tutorial.lemmingCount).toBeLessThan(easy.lemmingCount);
    expect(easy.lemmingCount).toBeLessThan(medium.lemmingCount);
    expect(medium.lemmingCount).toBeLessThan(hard.lemmingCount);
  });

  it('skillMultiplier decreases as difficulty increases', () => {
    const tutorial = DIFFICULTY_PRESETS['tutorial'] as DifficultyPreset;
    const easy = DIFFICULTY_PRESETS['easy'] as DifficultyPreset;
    const medium = DIFFICULTY_PRESETS['medium'] as DifficultyPreset;
    const hard = DIFFICULTY_PRESETS['hard'] as DifficultyPreset;

    expect(tutorial.skillMultiplier).toBeGreaterThan(easy.skillMultiplier);
    expect(easy.skillMultiplier).toBeGreaterThan(medium.skillMultiplier);
    expect(medium.skillMultiplier).toBeGreaterThan(hard.skillMultiplier);
  });
});

// ---------------------------------------------------------------------------
// getDifficultyPreset
// ---------------------------------------------------------------------------

describe('getDifficultyPreset', () => {
  it('returns the tutorial preset for "tutorial"', () => {
    const preset = getDifficultyPreset('tutorial');
    expect(preset.name).toBe('Tutorial');
  });

  it('returns the easy preset for "easy"', () => {
    const preset = getDifficultyPreset('easy');
    expect(preset.name).toBe('Easy');
  });

  it('returns the medium preset for "medium"', () => {
    const preset = getDifficultyPreset('medium');
    expect(preset.name).toBe('Medium');
  });

  it('returns the hard preset for "hard"', () => {
    const preset = getDifficultyPreset('hard');
    expect(preset.name).toBe('Hard');
  });

  it('falls back to medium for unknown difficulty', () => {
    const preset = getDifficultyPreset('insane');
    expect(preset.name).toBe('Medium');
  });

  it('falls back to medium for empty string', () => {
    const preset = getDifficultyPreset('');
    expect(preset.name).toBe('Medium');
  });
});
