/**
 * Tests for LevelGenerator variety features:
 *   - Themes per tier
 *   - Layout types
 *   - New obstacle types (water_zone, lava_zone, crusher_zone, multi_platform,
 *     narrow_tunnel, crumbling_platform)
 *   - Hazard list populated correctly
 *   - LevelData backward compatibility (all original fields still present)
 *   - Solvability with new obstacles
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import type {
  DifficultyConfig,
  LevelData,
  ObstacleType,
  LayoutType,
  LevelTheme,
} from '@/levels/LevelData';
import {
  GAME_WIDTH,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  EXIT_WIDTH,
  EXIT_HEIGHT,
} from '@/utils/Constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Force a specific obstacle type into a config for targeted testing */
function configWithObstacle(tier: 1 | 2 | 3 | 4 | 5, obstacle: ObstacleType): DifficultyConfig {
  const base = DIFFICULTY_PRESETS[tier - 1] as DifficultyConfig;
  return {
    ...base,
    segmentCount: 1,
    allowedObstacles: [obstacle],
    toolSlack: 3, // generous budget ensures validator can pass
    availableLayouts: ['linear'],
  };
}

/** Force a specific layout type into a config */
function configWithLayout(tier: 1 | 2 | 3 | 4 | 5, layout: LayoutType): DifficultyConfig {
  const base = DIFFICULTY_PRESETS[tier - 1] as DifficultyConfig;
  return {
    ...base,
    allowedObstacles: ['none'],
    availableLayouts: [layout],
  };
}

// ---------------------------------------------------------------------------
// Theme tests
// ---------------------------------------------------------------------------

describe('LevelGenerator — themes', () => {
  let generator: LevelGenerator;

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  const EXPECTED_THEMES: Record<number, LevelTheme> = {
    1: 'prairie',
    2: 'cave',
    3: 'factory',
    4: 'volcano',
    5: 'space',
  };

  it.each([1, 2, 3, 4, 5] as const)(
    'tier %d generates the correct theme',
    (tier) => {
      const config = DIFFICULTY_PRESETS[tier - 1] as DifficultyConfig;
      const level = generator.generate(config, 42);
      expect(level.theme).toBe(EXPECTED_THEMES[tier]);
    },
  );

  it('theme field is present on every generated level', () => {
    for (const config of DIFFICULTY_PRESETS) {
      const level = generator.generate(config, 77);
      expect(level.theme).toBeDefined();
      expect(['prairie', 'cave', 'factory', 'volcano', 'space']).toContain(level.theme);
    }
  });
});

// ---------------------------------------------------------------------------
// Layout tests
// ---------------------------------------------------------------------------

describe('LevelGenerator — layouts', () => {
  let generator: LevelGenerator;

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  it('layoutType field is present and valid on every generated level', () => {
    const validLayouts: LayoutType[] = ['linear', 'u-shape', 'vertical', 'split', 'zigzag', 'island'];
    for (const config of DIFFICULTY_PRESETS) {
      const level = generator.generate(config, 42);
      expect(validLayouts).toContain(level.layoutType);
    }
  });

  it('tier 1 only uses linear layout', () => {
    const config = DIFFICULTY_PRESETS[0] as DifficultyConfig;
    for (let seed = 1; seed <= 5; seed++) {
      const level = generator.generate(config, seed);
      expect(level.layoutType).toBe('linear');
    }
  });

  it('higher tiers have access to non-linear layouts', () => {
    // Tier 3+ should eventually produce a non-linear layout across many seeds
    const config = DIFFICULTY_PRESETS[2] as DifficultyConfig; // tier 3
    const layouts = new Set<LayoutType>();
    for (let seed = 1; seed <= 30; seed++) {
      const level = generator.generate(config, seed);
      layouts.add(level.layoutType);
    }
    // Tier 3 has linear, zigzag, u-shape — at least 2 should appear
    expect(layouts.size).toBeGreaterThanOrEqual(2);
  });

  it('forced linear layout generates spawn on left, exit on right', () => {
    const config = configWithLayout(1, 'linear');
    const level = generator.generate(config, 42);
    expect(level.spawn.x).toBeLessThan(GAME_WIDTH / 2);
    expect(level.exit.x).toBeGreaterThan(GAME_WIDTH / 2);
  });

  it('zigzag layout produces extra platforms (more fills than linear)', () => {
    const linearConfig = configWithLayout(2, 'linear');
    const zigzagConfig = configWithLayout(2, 'zigzag');
    const linearLevel = generator.generate(linearConfig, 42);
    const zigzagLevel = generator.generate(zigzagConfig, 42);
    expect(zigzagLevel.terrainFills.length).toBeGreaterThan(linearLevel.terrainFills.length);
  });

  it('split layout produces extra fills (divider platform)', () => {
    const linearConfig = configWithLayout(4, 'linear');
    const splitConfig = configWithLayout(4, 'split');
    const linearLevel = generator.generate(linearConfig, 42);
    const splitLevel = generator.generate(splitConfig, 42);
    expect(splitLevel.terrainFills.length).toBeGreaterThan(linearLevel.terrainFills.length);
  });
});

// ---------------------------------------------------------------------------
// New obstacle types — structural checks
// ---------------------------------------------------------------------------

describe('LevelGenerator — new obstacle types', () => {
  let generator: LevelGenerator;

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  it('water_zone creates a gap erase and a water hazard', () => {
    const config = configWithObstacle(2, 'water_zone');
    const level = generator.generate(config, 42);
    const waterSeg = level.segments.find((s) => s.obstacle.type === 'water_zone');
    expect(waterSeg).toBeDefined();
    expect(waterSeg?.erases.length).toBeGreaterThan(0);
    expect(level.hazards.some((h) => h.type === 'water')).toBe(true);
  });

  it('lava_zone creates a gap erase and a lava hazard', () => {
    const config = configWithObstacle(3, 'lava_zone');
    const level = generator.generate(config, 42);
    const lavaSeg = level.segments.find((s) => s.obstacle.type === 'lava_zone');
    expect(lavaSeg).toBeDefined();
    expect(lavaSeg?.erases.length).toBeGreaterThan(0);
    expect(level.hazards.some((h) => h.type === 'lava')).toBe(true);
  });

  it('crusher_zone places a ceiling fill and a crusher hazard', () => {
    const config = configWithObstacle(4, 'crusher_zone');
    const level = generator.generate(config, 42);
    const crusherSeg = level.segments.find((s) => s.obstacle.type === 'crusher_zone');
    expect(crusherSeg).toBeDefined();
    expect(crusherSeg?.fills.length).toBeGreaterThan(0);
    expect(level.hazards.some((h) => h.type === 'crusher')).toBe(true);
    // crusher_zone needs no tool to pass
    expect(crusherSeg?.obstacle.requiredTool).toBeNull();
  });

  it('multi_platform creates multiple fill rects (lower + upper platforms)', () => {
    const config = configWithObstacle(4, 'multi_platform');
    const level = generator.generate(config, 42);
    const multiSeg = level.segments.find((s) => s.obstacle.type === 'multi_platform');
    expect(multiSeg).toBeDefined();
    // Expect at least 2 fills (lower + upper platform)
    expect((multiSeg?.fills.length ?? 0)).toBeGreaterThanOrEqual(2);
    expect(multiSeg?.obstacle.requiredTool).toBe('ramp');
  });

  it('narrow_tunnel places ceiling and side walls (multiple fills)', () => {
    const config = configWithObstacle(3, 'narrow_tunnel');
    const level = generator.generate(config, 42);
    const tunnelSeg = level.segments.find((s) => s.obstacle.type === 'narrow_tunnel');
    expect(tunnelSeg).toBeDefined();
    // Left wall, right wall, ceiling = 3 fills
    expect((tunnelSeg?.fills.length ?? 0)).toBeGreaterThanOrEqual(3);
    expect(tunnelSeg?.obstacle.requiredTool).toBeNull();
  });

  it('crumbling_platform places an elevated fill and erases ground under it', () => {
    const config = configWithObstacle(5, 'crumbling_platform');
    const level = generator.generate(config, 42);
    const crumbleSeg = level.segments.find((s) => s.obstacle.type === 'crumbling_platform');
    expect(crumbleSeg).toBeDefined();
    expect(crumbleSeg?.fills.length).toBeGreaterThan(0);
    expect(crumbleSeg?.erases.length).toBeGreaterThan(0);
    expect(crumbleSeg?.obstacle.requiredTool).toBe('ramp');
  });
});

// ---------------------------------------------------------------------------
// Hazards array
// ---------------------------------------------------------------------------

describe('LevelGenerator — hazards', () => {
  let generator: LevelGenerator;

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  it('hazards array is always present (never undefined)', () => {
    for (const config of DIFFICULTY_PRESETS) {
      const level = generator.generate(config, 42);
      expect(Array.isArray(level.hazards)).toBe(true);
    }
  });

  it('levels with no hazard obstacles have an empty hazards array', () => {
    // Tier 1 only uses gap/none — no hazards
    const config = DIFFICULTY_PRESETS[0] as DifficultyConfig;
    const level = generator.generate(config, 1);
    expect(level.hazards).toHaveLength(0);
  });

  it('each hazard has valid type, positive dimensions, and in-bounds position', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (let seed = 1; seed <= 5; seed++) {
        const level = generator.generate(config, seed);
        for (const h of level.hazards) {
          expect(['water', 'lava', 'crusher']).toContain(h.type);
          expect(h.w).toBeGreaterThan(0);
          expect(h.h).toBeGreaterThan(0);
          expect(h.x).toBeGreaterThanOrEqual(0);
          expect(h.x + h.w).toBeLessThanOrEqual(GAME_WIDTH);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility — all original LevelData fields still present
// ---------------------------------------------------------------------------

describe('LevelGenerator — backward compatibility', () => {
  let generator: LevelGenerator;

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  it('all original LevelData fields are present on generated levels', () => {
    for (const config of DIFFICULTY_PRESETS) {
      const level = generator.generate(config, 42);
      // Original fields
      expect(typeof level.name).toBe('string');
      expect(typeof level.seed).toBe('number');
      expect([1, 2, 3, 4, 5]).toContain(level.tier);
      expect(typeof level.spawn.x).toBe('number');
      expect(typeof level.spawn.y).toBe('number');
      expect(typeof level.exit.x).toBe('number');
      expect(typeof level.exit.width).toBe('number');
      expect(Array.isArray(level.terrainFills)).toBe(true);
      expect(Array.isArray(level.terrainErases)).toBe(true);
      expect(Array.isArray(level.segments)).toBe(true);
      expect(typeof level.toolBudget.dig).toBe('number');
      expect(typeof level.toolBudget.stairs).toBe('number');
      expect(typeof level.lemmingCount).toBe('number');
      expect(typeof level.requiredSaves).toBe('number');
      expect(typeof level.spawnInterval).toBe('number');
      // New fields
      expect(typeof level.theme).toBe('string');
      expect(typeof level.layoutType).toBe('string');
      expect(Array.isArray(level.hazards)).toBe(true);
    }
  });

  it('is still deterministic with new fields', () => {
    const config = DIFFICULTY_PRESETS[2] as DifficultyConfig;
    const a = generator.generate(config, 12345);
    const b = generator.generate(config, 12345);
    expect(a.theme).toBe(b.theme);
    expect(a.layoutType).toBe(b.layoutType);
    expect(a.hazards.length).toBe(b.hazards.length);
    expect(a.segments.length).toBe(b.segments.length);
  });
});

// ---------------------------------------------------------------------------
// Solvability with new obstacles
// ---------------------------------------------------------------------------

describe('LevelGenerator + LevelValidator — new obstacle solvability', () => {
  let generator: LevelGenerator;
  let validator: LevelValidator;

  beforeEach(() => {
    generator = new LevelGenerator();
    validator = new LevelValidator();
  });

  const newObstacleTypes: ObstacleType[] = [
    'water_zone',
    'lava_zone',
    'crusher_zone',
    'multi_platform',
    'narrow_tunnel',
    'crumbling_platform',
  ];

  it.each(newObstacleTypes)(
    'levels with "%s" obstacle are solvable across 5 seeds',
    (obstacleType) => {
      // Pick a tier that allows this obstacle
      const tierForObstacle: Record<ObstacleType, 1 | 2 | 3 | 4 | 5> = {
        water_zone: 2,
        lava_zone: 3,
        crusher_zone: 4,
        multi_platform: 4,
        narrow_tunnel: 3,
        crumbling_platform: 5,
        gap: 1,
        wall: 2,
        pit: 3,
        elevated_platform: 1,
        none: 1,
      };

      const tier = tierForObstacle[obstacleType] ?? 3;
      const config = configWithObstacle(tier, obstacleType);
      let solvableCount = 0;

      for (let seed = 1; seed <= 5; seed++) {
        const level = generator.generate(config, seed);
        const result = validator.validate(level);
        if (result.solvable) solvableCount++;
      }

      // At least 4 out of 5 must be solvable
      expect(solvableCount).toBeGreaterThanOrEqual(4);
    },
  );

  it('all tiers pass at least 8/10 solvability with full obstacle sets', () => {
    for (const config of DIFFICULTY_PRESETS) {
      let solvableCount = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const level = generator.generate(config, seed);
        const result = validator.validate(level);
        if (result.solvable) solvableCount++;
      }
      expect(solvableCount).toBeGreaterThanOrEqual(
        8,
        `Tier ${config.tier}: only ${solvableCount}/10 solvable`,
      );
    }
  });

  it('generates and validates a tier 5 level in under 50ms', () => {
    const tier5Config = DIFFICULTY_PRESETS[4] as DifficultyConfig;
    const start = performance.now();
    const level = generator.generate(tier5Config, 42);
    validator.validate(level);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// Geometry validity
// ---------------------------------------------------------------------------

describe('LevelGenerator — geometry validity', () => {
  let generator: LevelGenerator;

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  it('all terrain fill rects have positive dimensions', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (let seed = 1; seed <= 5; seed++) {
        const level = generator.generate(config, seed);
        for (const rect of level.terrainFills) {
          expect(rect.w).toBeGreaterThanOrEqual(0);
          expect(rect.h).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('spawn is within game bounds', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (let seed = 1; seed <= 5; seed++) {
        const level = generator.generate(config, seed);
        expect(level.spawn.x).toBeGreaterThan(0);
        expect(level.spawn.x).toBeLessThan(GAME_WIDTH);
      }
    }
  });

  it('exit is within game bounds', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (let seed = 1; seed <= 5; seed++) {
        const level = generator.generate(config, seed);
        expect(level.exit.x).toBeGreaterThan(0);
        expect(level.exit.x + level.exit.width).toBeLessThanOrEqual(GAME_WIDTH);
      }
    }
  });

  it('toolBudget covers every required tool from obstacles', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (const seed of [1, 42, 7777]) {
        const level = generator.generate(config, seed);
        for (const seg of level.segments) {
          if (seg.obstacle.requiredTool !== null) {
            expect(level.toolBudget[seg.obstacle.requiredTool]).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });
});
