/**
 * Unit tests for the procedural level system.
 *
 * Covers LevelGenerator and LevelValidator — both are pure classes with no
 * Phaser dependency, so they can be instantiated and exercised directly.
 *
 * Constants reference (from src/utils/Constants.ts):
 *   GAME_WIDTH        = 960
 *   TERRAIN_Y         = 400
 *   TERRAIN_HEIGHT    = 70
 *   TOOL_RAMP_HEIGHT  = 20   (walls taller than this require 'dig')
 *   TOOL_STAIR_STEPS  = 10
 *   TOOL_STAIR_STEP_W = 18   → MAX_STAIR_SPAN = 180
 *   EXIT_WIDTH        = 30
 *   EXIT_HEIGHT       = 30
 *
 * Known bug (tracked here — see integration test 1 below):
 *   LevelValidator.validate() fails to advance the walker after applying
 *   the 'dig' tool: after modifying groundY, the walker calls `continue`
 *   without incrementing x. On the next iteration it re-encounters the
 *   same wall, exhausts the dig budget, then turns around. Tier 4 and 5
 *   levels that contain wall obstacles with height > TOOL_RAMP_HEIGHT are
 *   therefore incorrectly marked as unsolvable.
 *   Affects: tier 4 (3/10 solvable), tier 5 (0/10 solvable).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import { DifficultyConfig, LevelData, TerrainRect } from '@/levels/LevelData';
import {
  GAME_WIDTH,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  EXIT_WIDTH,
  EXIT_HEIGHT,
  TOOL_STAIR_STEPS,
  TOOL_STAIR_STEP_W,
  ToolType,
} from '@/utils/Constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function allToolTypes(): readonly ToolType[] {
  return ['dig', 'stairs', 'wall', 'ramp'] as const;
}

/** Sums the erases belonging to segments that contain gap/pit/elevated_platform obstacles */
function countObstacleErases(level: LevelData): number {
  return level.segments.reduce((acc, seg) => {
    const type = seg.obstacle.type;
    if (type === 'gap' || type === 'pit' || type === 'elevated_platform') {
      return acc + seg.erases.length;
    }
    return acc;
  }, 0);
}

/** Count segments whose obstacle type produces an erase (gap, pit, elevated_platform) */
function eraseObstacleSegmentCount(level: LevelData): number {
  return level.segments.filter(
    (s) =>
      s.obstacle.type === 'gap' ||
      s.obstacle.type === 'pit' ||
      s.obstacle.type === 'elevated_platform',
  ).length;
}

/**
 * Build a minimal LevelData that is trivially solvable: flat ground from
 * spawn to exit, no obstacles, ample tool budget.
 */
function buildTrivialLevel(): LevelData {
  const terrainFills: readonly TerrainRect[] = [
    { x: 0, y: TERRAIN_Y, w: GAME_WIDTH, h: TERRAIN_HEIGHT },
  ];
  const spawn = { x: 80, y: TERRAIN_Y };
  const exit = {
    x: GAME_WIDTH - 110,
    y: TERRAIN_Y - EXIT_HEIGHT,
    width: EXIT_WIDTH,
    height: EXIT_HEIGHT,
  };
  const toolBudget: Record<ToolType, number> = { dig: 5, stairs: 5, wall: 5, ramp: 5 };

  return {
    name: 'Trivial',
    seed: 1,
    tier: 1,
    spawn,
    exit,
    terrainFills,
    terrainErases: [],
    segments: [],
    toolBudget,
    lemmingCount: 10,
    requiredSaves: 5,
    spawnInterval: 1200,
  };
}

/**
 * Build a level with a single gap of given width centred in the level,
 * and a specific stairs budget. All other tool budgets are zero.
 */
function buildGapLevel(gapWidth: number, stairsBudget: number): LevelData {
  const gapCenterX = Math.floor(GAME_WIDTH / 2);
  const gapX = gapCenterX - Math.floor(gapWidth / 2);

  const terrainFills: readonly TerrainRect[] = [
    { x: 0, y: TERRAIN_Y, w: GAME_WIDTH, h: TERRAIN_HEIGHT },
  ];
  const terrainErases: readonly TerrainRect[] = [
    { x: gapX, y: TERRAIN_Y, w: gapWidth, h: TERRAIN_HEIGHT },
  ];
  const spawn = { x: 80, y: TERRAIN_Y };
  const exit = {
    x: GAME_WIDTH - 110,
    y: TERRAIN_Y - EXIT_HEIGHT,
    width: EXIT_WIDTH,
    height: EXIT_HEIGHT,
  };
  const toolBudget: Record<ToolType, number> = {
    dig: 0,
    stairs: stairsBudget,
    wall: 0,
    ramp: 0,
  };
  const gapRect: TerrainRect = { x: gapX, y: TERRAIN_Y, w: gapWidth, h: TERRAIN_HEIGHT };

  return {
    name: 'Gap level',
    seed: 999,
    tier: 1,
    spawn,
    exit,
    terrainFills,
    terrainErases,
    segments: [
      {
        startX: 200,
        endX: 700,
        obstacle: { type: 'gap', requiredTool: 'stairs', rect: gapRect },
        fills: [],
        erases: [gapRect],
      },
    ],
    toolBudget,
    lemmingCount: 10,
    requiredSaves: 5,
    spawnInterval: 1200,
  };
}

// ---------------------------------------------------------------------------
// LevelGenerator tests
// ---------------------------------------------------------------------------

describe('LevelGenerator', () => {
  let generator: LevelGenerator;
  const tier1Config: DifficultyConfig = DIFFICULTY_PRESETS[0];

  beforeEach(() => {
    generator = new LevelGenerator();
  });

  // -------------------------------------------------------------------------
  // 1. generate() returns valid LevelData structure (all required fields present)
  // -------------------------------------------------------------------------
  it('generate() returns a LevelData with all required fields', () => {
    const level = generator.generate(tier1Config, 42);

    expect(typeof level.name).toBe('string');
    expect(typeof level.seed).toBe('number');
    expect([1, 2, 3, 4, 5]).toContain(level.tier);

    expect(typeof level.spawn.x).toBe('number');
    expect(typeof level.spawn.y).toBe('number');

    expect(typeof level.exit.x).toBe('number');
    expect(typeof level.exit.y).toBe('number');
    expect(typeof level.exit.width).toBe('number');
    expect(typeof level.exit.height).toBe('number');

    expect(Array.isArray(level.terrainFills)).toBe(true);
    expect(Array.isArray(level.terrainErases)).toBe(true);
    expect(Array.isArray(level.segments)).toBe(true);

    expect(typeof level.toolBudget).toBe('object');
    for (const tool of allToolTypes()) {
      expect(typeof level.toolBudget[tool]).toBe('number');
    }

    expect(typeof level.lemmingCount).toBe('number');
    expect(typeof level.requiredSaves).toBe('number');
    expect(typeof level.spawnInterval).toBe('number');
  });

  // -------------------------------------------------------------------------
  // 2. Same seed produces same level (deterministic)
  // -------------------------------------------------------------------------
  it('is deterministic: same seed produces identical LevelData', () => {
    const levelA = generator.generate(tier1Config, 12345);
    const levelB = generator.generate(tier1Config, 12345);

    expect(levelA.spawn.x).toBe(levelB.spawn.x);
    expect(levelA.spawn.y).toBe(levelB.spawn.y);
    expect(levelA.exit.x).toBe(levelB.exit.x);
    expect(levelA.exit.y).toBe(levelB.exit.y);
    expect(levelA.segments.length).toBe(levelB.segments.length);
    expect(levelA.terrainFills.length).toBe(levelB.terrainFills.length);
    expect(levelA.terrainErases.length).toBe(levelB.terrainErases.length);
    expect(levelA.toolBudget).toStrictEqual(levelB.toolBudget);
  });

  // -------------------------------------------------------------------------
  // 3. Different seeds produce different levels
  // -------------------------------------------------------------------------
  it('produces different levels for different seeds', () => {
    const levelA = generator.generate(tier1Config, 1);
    const levelB = generator.generate(tier1Config, 9999);

    // With 50px of jitter in spawn/exit placement, coordinates differ for
    // seeds that are far apart. At least one dimension must differ.
    const spawnDiffers =
      levelA.spawn.x !== levelB.spawn.x || levelA.spawn.y !== levelB.spawn.y;
    const exitDiffers = levelA.exit.x !== levelB.exit.x;
    const segmentsDiffer =
      levelA.segments.length !== levelB.segments.length ||
      (levelA.segments.length > 0 &&
        levelA.segments[0]?.obstacle.type !== levelB.segments[0]?.obstacle.type);

    expect(spawnDiffers || exitDiffers || segmentsDiffer).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. Spawn position is within game bounds (x > 0, x < GAME_WIDTH)
  // -------------------------------------------------------------------------
  it('spawn x is strictly within game bounds for varied seeds', () => {
    const seeds = [1, 42, 100, 777, 9999];
    for (const seed of seeds) {
      const level = generator.generate(tier1Config, seed);
      expect(level.spawn.x).toBeGreaterThan(0);
      expect(level.spawn.x).toBeLessThan(GAME_WIDTH);
    }
  });

  // -------------------------------------------------------------------------
  // 5. Exit position is within game bounds
  // -------------------------------------------------------------------------
  it('exit is fully within game bounds for varied seeds', () => {
    const seeds = [1, 42, 100, 777, 9999];
    for (const seed of seeds) {
      const level = generator.generate(tier1Config, seed);
      expect(level.exit.x).toBeGreaterThan(0);
      expect(level.exit.x + level.exit.width).toBeLessThanOrEqual(GAME_WIDTH);
    }
  });

  // -------------------------------------------------------------------------
  // 6. Tool budget covers at least the required tools
  //    (each obstacle's requiredTool has budget >= 1)
  // -------------------------------------------------------------------------
  it('toolBudget >= 1 for every tool required by an obstacle', () => {
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

  // -------------------------------------------------------------------------
  // 7. All 5 tiers generate successfully (no throw, tier field matches preset)
  // -------------------------------------------------------------------------
  it('generates successfully for all 5 tiers without throwing', () => {
    for (const config of DIFFICULTY_PRESETS) {
      expect(() => generator.generate(config, 42)).not.toThrow();
      const level = generator.generate(config, 42);
      expect(level.tier).toBe(config.tier);
    }
  });

  // -------------------------------------------------------------------------
  // 8. terrainFills is non-empty
  // -------------------------------------------------------------------------
  it('terrainFills is non-empty for every tier', () => {
    for (const config of DIFFICULTY_PRESETS) {
      const level = generator.generate(config, 100);
      expect(level.terrainFills.length).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // 9. terrainErases count matches segment count for gap/pit obstacles
  //    Each gap/pit/elevated_platform segment contributes exactly 1 erase rect;
  //    total erases >= 1 (cliff removal) + obstacle erases.
  // -------------------------------------------------------------------------
  it('terrainErases accounts for base cliff removal and each erase-type obstacle', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (const seed of [1, 55, 999]) {
        const level = generator.generate(config, seed);

        // Generator always pushes 1 cliff-removal erase before segment loop
        const baseErases = 1;
        const expectedMin = baseErases + eraseObstacleSegmentCount(level);
        expect(level.terrainErases.length).toBeGreaterThanOrEqual(expectedMin);

        // Every erase-type obstacle segment contributes exactly 1 erase rect
        expect(countObstacleErases(level)).toBe(eraseObstacleSegmentCount(level));
      }
    }
  });

  // -------------------------------------------------------------------------
  // 10. lemmingCount and requiredSaves match the preset exactly
  // -------------------------------------------------------------------------
  it('lemmingCount and requiredSaves match the DifficultyConfig preset', () => {
    for (const config of DIFFICULTY_PRESETS) {
      const level = generator.generate(config, 42);
      expect(level.lemmingCount).toBe(config.lemmingCount);
      expect(level.requiredSaves).toBe(config.requiredSaves);
    }
  });
});

// ---------------------------------------------------------------------------
// LevelValidator tests
// ---------------------------------------------------------------------------

describe('LevelValidator', () => {
  let generator: LevelGenerator;
  let validator: LevelValidator;

  beforeEach(() => {
    generator = new LevelGenerator();
    validator = new LevelValidator();
  });

  // -------------------------------------------------------------------------
  // 1. A tier 1 level with 'none' obstacle is solvable
  // -------------------------------------------------------------------------
  it('validates a trivial flat level (no obstacles) as solvable', () => {
    const level = buildTrivialLevel();
    const result = validator.validate(level);
    expect(result.solvable).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. A tier 1 level with a gap and stairs budget is solvable
  //    Gap of 80px is well within MAX_STAIR_SPAN (TOOL_STAIR_STEPS * TOOL_STAIR_STEP_W = 180px)
  // -------------------------------------------------------------------------
  it('validates a bridgeable gap (80px) with stairs budget = 1 as solvable', () => {
    const level = buildGapLevel(80, 1);
    const result = validator.validate(level);
    expect(result.solvable).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. Generated levels for tiers 1-3 are generally solvable (5 seeds each)
  //    At least 4 out of 5 seeds must produce solvable levels.
  // -------------------------------------------------------------------------
  it('tier 1-3 generated levels are solvable for at least 4 of 5 tested seeds', () => {
    const tier1to3 = DIFFICULTY_PRESETS.filter((c) => c.tier <= 3);
    const seeds = [1, 42, 100, 777, 9999];

    for (const config of tier1to3) {
      let solvableCount = 0;
      for (const seed of seeds) {
        const level = generator.generate(config, seed);
        const result = validator.validate(level);
        if (result.solvable) solvableCount++;
      }
      expect(solvableCount).toBeGreaterThanOrEqual(4);
    }
  });

  // -------------------------------------------------------------------------
  // 4. A level with a huge gap (500px) and no stairs is NOT solvable
  //    500px >> MAX_STAIR_SPAN (180px) and stairsBudget = 0
  // -------------------------------------------------------------------------
  it('marks a 500px gap with zero stairs budget as unsolvable', () => {
    const level = buildGapLevel(500, 0);
    const result = validator.validate(level);
    expect(result.solvable).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 5. validate() returns toolsUsed that doesn't exceed toolBudget
  // -------------------------------------------------------------------------
  it('toolsUsed never exceeds toolBudget in any validate() call', () => {
    for (const config of DIFFICULTY_PRESETS) {
      for (const seed of [1, 42, 500]) {
        const level = generator.generate(config, seed);
        const result = validator.validate(level);

        for (const tool of allToolTypes()) {
          expect(result.toolsUsed[tool]).toBeLessThanOrEqual(level.toolBudget[tool]);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('LevelGenerator + LevelValidator integration', () => {
  let generator: LevelGenerator;
  let validator: LevelValidator;

  beforeEach(() => {
    generator = new LevelGenerator();
    validator = new LevelValidator();
  });

  // -------------------------------------------------------------------------
  // 1. Generate + validate loop: for each tier, 10 levels, >= 8 solvable
  //
  // BUG DETECTED — this test currently fails for tiers 4 and 5:
  //   Tier 4: 3/10 solvable
  //   Tier 5: 3/10 solvable
  //
  // Two distinct root causes identified in LevelValidator.validate():
  //
  // (A) "exceeded max steps" — elevated_platform obstacles:
  //   The 'elevated_platform' segment erases the ground under the platform
  //   and places a raised surface. The validator encounters this as a
  //   wall-ahead of height > STEP_CLIMB_MAX (6px). It attempts ramp usage,
  //   but the ramp budget is exhausted by earlier segments. The walker then
  //   turns around, hits the same problem from the other side, and burns
  //   through the turn budget until exceeding maxSteps (GAME_WIDTH * 4).
  //   The platform's leading and trailing edges both present as impassable
  //   steps once the ramp budget is gone.
  //
  // (B) "impassable wall (Npx)" — elevated_platform edge at STEP_CLIMB_MAX boundary:
  //   The edge of an elevated_platform that was only partially erased presents
  //   a step of 9-16px to the walker. This exceeds STEP_CLIMB_MAX (6px) so the
  //   walker enters the wall-handling branch. The step is <= TOOL_RAMP_HEIGHT
  //   (20px) so it tries ramp — but ramp budget is already at 0 from earlier
  //   obstacles. Dig is tried next; dig sets groundY[col] = y only when
  //   current < y, but for a low step the condition may not hold, so dig is
  //   also a no-op. The walker turns and exceeds the turn limit.
  //
  // Fix needed (two changes to LevelValidator.validate()):
  //   1. After applying ramp or dig, advance x by `direction` before `continue`
  //      so the walker does not re-encounter the same obstacle on the next step.
  //   2. Ensure the dig condition `current < y` correctly handles platform edges
  //      that sit between TERRAIN_Y and the walker's y value.
  // -------------------------------------------------------------------------
  it('at least 8 out of 10 generated levels per tier are solvable', () => {
    for (const config of DIFFICULTY_PRESETS) {
      let solvableCount = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const level = generator.generate(config, seed);
        const result = validator.validate(level);
        if (result.solvable) solvableCount++;
      }
      expect(solvableCount).toBeGreaterThanOrEqual(8);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Performance: generating + validating a tier 5 level takes < 50ms
  // -------------------------------------------------------------------------
  it('generates and validates a tier 5 level in under 50ms', () => {
    const tier5Config = DIFFICULTY_PRESETS[4];
    const start = performance.now();
    const level = generator.generate(tier5Config, 42);
    validator.validate(level);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
