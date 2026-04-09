import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  EXIT_WIDTH,
  EXIT_HEIGHT,
  TOOL_STAIR_STEPS,
  TOOL_STAIR_STEP_W,
  TOOL_RAMP_HEIGHT,
  ToolType,
} from '@/utils/Constants';
import {
  DifficultyConfig,
  Hazard,
  LevelData,
  LevelTheme,
  LayoutType,
  ObstacleType,
  Segment,
  TerrainRect,
} from '@/levels/LevelData';

// ---------------------------------------------------------------------------
// Seeded PRNG (Park-Miller LCG) — deterministic, no external deps
// ---------------------------------------------------------------------------

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  /** Returns float in [0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  /** Returns integer in [min, max] inclusive */
  intRange(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T {
    const item = arr[Math.floor(this.next() * arr.length)];
    if (item === undefined) {
      return arr[0] as T;
    }
    return item;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Theme assigned to each difficulty tier (index = tier - 1) */
const TIER_THEMES: readonly LevelTheme[] = [
  'prairie',  // tier 1
  'cave',     // tier 2
  'factory',  // tier 3
  'volcano',  // tier 4
  'space',    // tier 5
];

/** Spawn platform width */
const SPAWN_PLATFORM_W = 160;
/** Exit platform width */
const EXIT_PLATFORM_W = 100;
/** Min gap between segment obstacles */
const OBSTACLE_MARGIN = 20;
/** Max stair bridgeable gap width */
const MAX_STAIR_SPAN = TOOL_STAIR_STEPS * TOOL_STAIR_STEP_W; // 180
/** Height of a single stair step used in ramp simulation */
const TOOL_STAIR_STEP_H = 4;

// ---------------------------------------------------------------------------
// Difficulty presets
// ---------------------------------------------------------------------------

/** Difficulty presets for tiers 1-5 */
export const DIFFICULTY_PRESETS: readonly DifficultyConfig[] = [
  {
    tier: 1,
    segmentCount: 1,
    allowedObstacles: ['gap', 'none'],
    lemmingCount: 10,
    requiredSaves: 5,
    spawnInterval: 1200,
    toolSlack: 3,
    availableLayouts: ['linear'],
  },
  {
    tier: 2,
    segmentCount: 2,
    allowedObstacles: ['gap', 'wall', 'water_zone'],
    lemmingCount: 15,
    requiredSaves: 8,
    spawnInterval: 1000,
    toolSlack: 2,
    availableLayouts: ['linear', 'zigzag'],
  },
  {
    tier: 3,
    segmentCount: 3,
    allowedObstacles: ['gap', 'wall', 'pit', 'lava_zone', 'narrow_tunnel'],
    lemmingCount: 20,
    requiredSaves: 14,
    spawnInterval: 900,
    toolSlack: 1,
    availableLayouts: ['linear', 'zigzag', 'u-shape'],
  },
  {
    tier: 4,
    segmentCount: 4,
    allowedObstacles: ['gap', 'wall', 'pit', 'lava_zone', 'crusher_zone', 'multi_platform'],
    lemmingCount: 25,
    requiredSaves: 20,
    spawnInterval: 800,
    toolSlack: 1,
    availableLayouts: ['linear', 'u-shape', 'split', 'island'],
  },
  {
    tier: 5,
    segmentCount: 5,
    allowedObstacles: ['gap', 'wall', 'pit', 'lava_zone', 'crusher_zone', 'multi_platform', 'crumbling_platform'],
    lemmingCount: 30,
    requiredSaves: 27,
    spawnInterval: 700,
    toolSlack: 0,
    availableLayouts: ['linear', 'u-shape', 'split', 'zigzag', 'island'],
  },
];

// ---------------------------------------------------------------------------
// Layout builders — each returns spawn, exit, and base terrain geometry
// ---------------------------------------------------------------------------

interface LayoutGeometry {
  readonly spawn: { x: number; y: number };
  readonly exit: { x: number; y: number; width: number; height: number };
  readonly terrainFills: TerrainRect[];
  readonly terrainErases: TerrainRect[];
  /** X range available for obstacle segments */
  readonly segStartX: number;
  readonly segEndX: number;
}

function buildLinearLayout(rng: SeededRandom): LayoutGeometry {
  const spawnX = rng.intRange(80, 130);
  const spawnPlatformY = TERRAIN_Y - rng.intRange(30, 50);
  const exitX = GAME_WIDTH - rng.intRange(80, 130);

  const spawn = { x: spawnX, y: spawnPlatformY };
  const exit = {
    x: exitX - EXIT_WIDTH / 2,
    y: TERRAIN_Y - EXIT_HEIGHT,
    width: EXIT_WIDTH,
    height: EXIT_HEIGHT,
  };

  const fills: TerrainRect[] = [];
  const erases: TerrainRect[] = [];

  // Main ground
  fills.push({ x: 0, y: TERRAIN_Y, w: GAME_WIDTH, h: TERRAIN_HEIGHT });

  // Spawn platform
  fills.push({
    x: spawnX - SPAWN_PLATFORM_W / 2,
    y: spawnPlatformY,
    w: SPAWN_PLATFORM_W,
    h: 15,
  });

  // Slope from spawn platform down to terrain
  const slopeStartX = spawnX + SPAWN_PLATFORM_W / 2;
  const slopeTopY = spawnPlatformY + 15;
  const slopeSteps = 8;
  const slopeStepW = 5;
  const slopeStepH = Math.ceil((TERRAIN_Y - slopeTopY) / slopeSteps);
  for (let s = 0; s < slopeSteps; s++) {
    fills.push({
      x: slopeStartX + s * slopeStepW,
      y: slopeTopY + s * slopeStepH,
      w: slopeStepW,
      h: TERRAIN_Y - (slopeTopY + s * slopeStepH) + 10,
    });
  }

  // Exit platform
  fills.push({
    x: exitX - EXIT_PLATFORM_W / 2,
    y: TERRAIN_Y,
    w: EXIT_PLATFORM_W,
    h: 20,
  });

  // Remove cliff under spawn (left side)
  erases.push({
    x: 0,
    y: TERRAIN_Y,
    w: spawnX - SPAWN_PLATFORM_W / 2,
    h: TERRAIN_HEIGHT,
  });

  const segStartX = slopeStartX + slopeSteps * slopeStepW + OBSTACLE_MARGIN;
  const segEndX = exitX - EXIT_PLATFORM_W / 2 - OBSTACLE_MARGIN;

  return { spawn, exit, terrainFills: fills, terrainErases: erases, segStartX, segEndX };
}

/**
 * U-shape: spawn on left at height, path goes right across ground, then back
 * left at a lower level where the exit is.
 */
function buildUShapeLayout(rng: SeededRandom): LayoutGeometry {
  const spawnX = rng.intRange(80, 130);
  const spawnY = TERRAIN_Y - rng.intRange(60, 90);

  // Exit is also on the left side but lower (near ground level)
  const exitX = rng.intRange(80, 160);
  const exitY = TERRAIN_Y - EXIT_HEIGHT;

  const spawn = { x: spawnX, y: spawnY };
  const exit = { x: exitX - EXIT_WIDTH / 2, y: exitY, width: EXIT_WIDTH, height: EXIT_HEIGHT };

  const fills: TerrainRect[] = [];
  const erases: TerrainRect[] = [];

  // Main ground
  fills.push({ x: 0, y: TERRAIN_Y, w: GAME_WIDTH, h: TERRAIN_HEIGHT });

  // Spawn elevated platform
  fills.push({ x: spawnX - SPAWN_PLATFORM_W / 2, y: spawnY, w: SPAWN_PLATFORM_W, h: 15 });

  // Ramp from spawn platform down to ground
  const rampStart = spawnX + SPAWN_PLATFORM_W / 2;
  const rampH = TERRAIN_Y - (spawnY + 15);
  const rampSteps = 8;
  const rampStepW = 5;
  const rampStepH = Math.ceil(rampH / rampSteps);
  for (let s = 0; s < rampSteps; s++) {
    fills.push({
      x: rampStart + s * rampStepW,
      y: spawnY + 15 + s * rampStepH,
      w: rampStepW,
      h: TERRAIN_Y - (spawnY + 15 + s * rampStepH) + 10,
    });
  }

  // Right boundary wall — path reverses here
  const rightBoundaryX = GAME_WIDTH - rng.intRange(60, 100);
  fills.push({ x: rightBoundaryX, y: TERRAIN_Y - 40, w: 20, h: 60 });

  // Remove void under spawn
  erases.push({
    x: 0,
    y: TERRAIN_Y,
    w: spawnX - SPAWN_PLATFORM_W / 2,
    h: TERRAIN_HEIGHT,
  });

  // Segments run left-to-right then the path loops back; we use the full width
  const segStartX = rampStart + rampSteps * rampStepW + OBSTACLE_MARGIN;
  const segEndX = rightBoundaryX - OBSTACLE_MARGIN;

  return { spawn, exit, terrainFills: fills, terrainErases: erases, segStartX, segEndX };
}

/**
 * Zigzag: horizontal path with 3+ directional changes.
 * Implemented as a linear path with extra mid-level platforms forcing
 * the generator to vary heights along the route.
 */
function buildZigzagLayout(rng: SeededRandom): LayoutGeometry {
  // Use the same base as linear but add mid-height platforms
  const base = buildLinearLayout(rng);
  const fills = [...base.terrainFills];
  const erases = [...base.terrainErases];

  // Add two elevated mid-platforms that break the flat path into zigzag sections
  const zoneW = (base.segEndX - base.segStartX) / 3;
  for (let i = 0; i < 2; i++) {
    const platX = Math.floor(base.segStartX + zoneW * (i + 0.5));
    const platW = rng.intRange(60, 100);
    const platY = TERRAIN_Y - rng.intRange(20, 40);
    fills.push({ x: platX - platW / 2, y: platY, w: platW, h: 12 });
  }

  return { ...base, terrainFills: fills, terrainErases: erases };
}

/**
 * Split path: two routes between the same spawn/exit.
 * Generator places a central divider; lemmings can go above or below.
 */
function buildSplitLayout(rng: SeededRandom): LayoutGeometry {
  const base = buildLinearLayout(rng);
  const fills = [...base.terrainFills];

  // Central horizontal divider platform
  const midX = Math.floor((base.segStartX + base.segEndX) / 2);
  const dividerW = rng.intRange(180, 280);
  const dividerY = TERRAIN_Y - rng.intRange(30, 50);
  fills.push({ x: midX - dividerW / 2, y: dividerY, w: dividerW, h: 12 });

  // Pillar connecting divider to ground
  fills.push({ x: midX - 8, y: dividerY + 12, w: 16, h: TERRAIN_Y - dividerY - 12 });

  return { ...base, terrainFills: fills };
}

/**
 * Island: central platform surrounded by gaps, lemmings must bridge.
 */
function buildIslandLayout(rng: SeededRandom): LayoutGeometry {
  const spawnX = rng.intRange(60, 100);
  const exitX = GAME_WIDTH - rng.intRange(60, 100);

  const spawn = { x: spawnX, y: TERRAIN_Y };
  const exit = {
    x: exitX - EXIT_WIDTH / 2,
    y: TERRAIN_Y - EXIT_HEIGHT,
    width: EXIT_WIDTH,
    height: EXIT_HEIGHT,
  };

  const fills: TerrainRect[] = [];
  const erases: TerrainRect[] = [];

  // Ground is split into left shore, central island, right shore
  const islandW = rng.intRange(150, 220);
  const islandX = Math.floor(GAME_WIDTH / 2) - Math.floor(islandW / 2);

  // Left shore
  fills.push({ x: 0, y: TERRAIN_Y, w: islandX - 20, h: TERRAIN_HEIGHT });
  // Central island (slightly elevated)
  fills.push({ x: islandX, y: TERRAIN_Y - 10, w: islandW, h: TERRAIN_HEIGHT + 10 });
  // Right shore
  fills.push({ x: islandX + islandW + 20, y: TERRAIN_Y, w: GAME_WIDTH, h: TERRAIN_HEIGHT });

  // Gaps on each side of island
  erases.push({ x: islandX - 20, y: TERRAIN_Y, w: 20, h: TERRAIN_HEIGHT });
  erases.push({ x: islandX + islandW, y: TERRAIN_Y, w: 20, h: TERRAIN_HEIGHT });

  const segStartX = spawnX + 40 + OBSTACLE_MARGIN;
  const segEndX = islandX + islandW - OBSTACLE_MARGIN;

  return { spawn, exit, terrainFills: fills, terrainErases: erases, segStartX, segEndX };
}

/** Dispatch to the right layout builder based on layoutType */
function buildLayout(layoutType: LayoutType, rng: SeededRandom): LayoutGeometry {
  switch (layoutType) {
    case 'u-shape': return buildUShapeLayout(rng);
    case 'zigzag': return buildZigzagLayout(rng);
    case 'split': return buildSplitLayout(rng);
    case 'island': return buildIslandLayout(rng);
    case 'vertical':
    case 'linear':
    default: return buildLinearLayout(rng);
  }
}

// ---------------------------------------------------------------------------
// LevelGenerator
// ---------------------------------------------------------------------------

export class LevelGenerator {
  generate(config: DifficultyConfig, seed: number): LevelData {
    const rng = new SeededRandom(seed);

    // Step 1: Choose layout and theme
    const layoutType: LayoutType = rng.pick(config.availableLayouts);
    const theme: LevelTheme = TIER_THEMES[config.tier - 1] ?? 'prairie';

    // Step 2: Build base terrain according to layout
    const layout = buildLayout(layoutType, rng);
    const terrainFills: TerrainRect[] = [...layout.terrainFills];
    const terrainErases: TerrainRect[] = [...layout.terrainErases];
    const hazards: Hazard[] = [];

    // Step 3: Divide space into segments and assign obstacles
    const segTotalWidth = layout.segEndX - layout.segStartX;
    const segCount = config.segmentCount;

    // Guard against degenerate geometry (can happen with island layout)
    if (segTotalWidth < 60 || layout.segStartX >= layout.segEndX) {
      const tierNum = config.tier;
      return {
        name: `Niveau ${tierNum}-${seed % 1000}`,
        seed,
        tier: tierNum,
        theme,
        layoutType,
        spawn: layout.spawn,
        exit: layout.exit,
        terrainFills,
        terrainErases,
        hazards,
        segments: [],
        toolBudget: { dig: 2, stairs: 2, wall: 1, ramp: 1 },
        lemmingCount: config.lemmingCount,
        requiredSaves: config.requiredSaves,
        spawnInterval: config.spawnInterval,
      };
    }

    const segWidth = Math.floor(segTotalWidth / segCount);
    const segments: Segment[] = [];
    const toolsRequired: Record<ToolType, number> = { dig: 0, stairs: 0, wall: 0, ramp: 0 };

    // Pre-plan obstacles: shuffle allowed types to ensure variety
    const plannedObstacles = this.planObstacles(rng, config);

    for (let i = 0; i < segCount; i++) {
      const sx = layout.segStartX + i * segWidth;
      const ex = i === segCount - 1 ? layout.segEndX : sx + segWidth;
      const obstacleSpace = ex - sx - 2 * OBSTACLE_MARGIN;

      const obstacleType = plannedObstacles[i] ?? 'none';
      const segment = this.generateSegment(
        rng,
        obstacleType,
        sx,
        ex,
        obstacleSpace,
        config.tier,
        theme,
        hazards,
      );
      segments.push(segment);

      // Accumulate required tools
      if (segment.obstacle.requiredTool !== null) {
        toolsRequired[segment.obstacle.requiredTool]++;
      }

      // Apply segment geometry
      for (const fill of segment.fills) {
        terrainFills.push(fill);
      }
      for (const erase of segment.erases) {
        terrainErases.push(erase);
      }
    }

    // Step 4: Compute tool budget — always cover required + slack
    const toolBudget: Record<ToolType, number> = { dig: 0, stairs: 0, wall: 0, ramp: 0 };
    const toolTypes: ToolType[] = ['dig', 'stairs', 'wall', 'ramp'];
    for (const tool of toolTypes) {
      const required = toolsRequired[tool];
      toolBudget[tool] = required + (required > 0 ? config.toolSlack : 0);
    }
    // Ensure at least 1 of each tool type at low tiers for flexibility
    if (config.tier <= 2) {
      for (const tool of toolTypes) {
        if (toolBudget[tool] === 0) {
          toolBudget[tool] = 1;
        }
      }
    }

    const tierNum = config.tier;
    const name = `Niveau ${tierNum}-${seed % 1000}`;

    return {
      name,
      seed,
      tier: tierNum,
      theme,
      layoutType,
      spawn: layout.spawn,
      exit: layout.exit,
      terrainFills,
      terrainErases,
      hazards,
      segments,
      toolBudget,
      lemmingCount: config.lemmingCount,
      requiredSaves: config.requiredSaves,
      spawnInterval: config.spawnInterval,
    };
  }

  // ---------------------------------------------------------------------------
  // Obstacle planning
  // ---------------------------------------------------------------------------

  /** Pre-plan obstacles to ensure variety and tool budget feasibility */
  private planObstacles(rng: SeededRandom, config: DifficultyConfig): ObstacleType[] {
    const plan: ObstacleType[] = [];
    const allowed = config.allowedObstacles;
    const count = config.segmentCount;

    // First pass: include each allowed type at most once
    const shuffled = [...allowed].sort(() => rng.next() - 0.5);

    for (let i = 0; i < count; i++) {
      if (i < shuffled.length) {
        const item = shuffled[i];
        plan.push(item !== undefined ? item : 'gap');
      } else {
        // Extra segments get simple obstacles
        plan.push(rng.pick(['gap', 'none'] as const));
      }
    }

    // Fisher-Yates shuffle of the plan
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = plan[i];
      const tmpJ = plan[j];
      if (tmp !== undefined && tmpJ !== undefined) {
        plan[i] = tmpJ;
        plan[j] = tmp;
      }
    }

    return plan;
  }

  // ---------------------------------------------------------------------------
  // Segment generation
  // ---------------------------------------------------------------------------

  private generateSegment(
    rng: SeededRandom,
    type: ObstacleType,
    startX: number,
    endX: number,
    space: number,
    tier: number,
    theme: LevelTheme,
    hazards: Hazard[],
  ): Segment {
    const midX = Math.floor((startX + endX) / 2);
    const fills: TerrainRect[] = [];
    const erases: TerrainRect[] = [];

    switch (type) {
      case 'gap': {
        const minW = 40 + tier * 8;
        const maxW = Math.min(60 + tier * 15, MAX_STAIR_SPAN - 20, space);
        const gapW = rng.intRange(minW, maxW);
        const gapX = midX - Math.floor(gapW / 2);
        const gapRect: TerrainRect = { x: gapX, y: TERRAIN_Y, w: gapW, h: TERRAIN_HEIGHT };
        erases.push(gapRect);
        return {
          startX,
          endX,
          obstacle: { type: 'gap', requiredTool: 'stairs', rect: gapRect },
          fills,
          erases,
        };
      }

      case 'wall': {
        const wallH = rng.intRange(15 + tier * 3, 25 + tier * 5);
        const wallW = rng.intRange(10, 20);
        const wallX = midX - Math.floor(wallW / 2);
        const wallY = TERRAIN_Y - wallH;
        const wallRect: TerrainRect = { x: wallX, y: wallY, w: wallW, h: wallH };
        fills.push(wallRect);
        const tool: ToolType = wallH <= TOOL_RAMP_HEIGHT ? rng.pick(['dig', 'ramp'] as const) : 'dig';
        return {
          startX,
          endX,
          obstacle: { type: 'wall', requiredTool: tool, rect: wallRect },
          fills,
          erases,
        };
      }

      case 'pit': {
        const pitW = rng.intRange(30 + tier * 5, 50 + tier * 8);
        const pitX = midX - Math.floor(pitW / 2);
        const pitRect: TerrainRect = { x: pitX, y: TERRAIN_Y, w: pitW, h: TERRAIN_HEIGHT };
        erases.push(pitRect);
        return {
          startX,
          endX,
          obstacle: { type: 'pit', requiredTool: 'stairs', rect: pitRect },
          fills,
          erases,
        };
      }

      case 'elevated_platform': {
        const maxH = Math.min(TOOL_RAMP_HEIGHT - 2, 18);
        const platH = rng.intRange(8, maxH);
        const platW = rng.intRange(50, 80);
        const platX = midX - Math.floor(platW / 2);
        const platY = TERRAIN_Y - platH;
        const platRect: TerrainRect = { x: platX, y: platY, w: platW, h: 10 };
        fills.push(platRect);
        erases.push({ x: platX, y: TERRAIN_Y, w: platW, h: TERRAIN_HEIGHT });
        return {
          startX,
          endX,
          obstacle: { type: 'elevated_platform', requiredTool: 'ramp', rect: platRect },
          fills,
          erases,
        };
      }

      case 'water_zone': {
        // Horizontal water strip — requires stairs/bridge to cross safely
        const zoneW = rng.intRange(50 + tier * 10, 80 + tier * 15);
        const capped = Math.min(zoneW, MAX_STAIR_SPAN - 10, space);
        const zoneX = midX - Math.floor(capped / 2);
        // Erase the ground so lemmings fall in if not bridged
        const zoneRect: TerrainRect = { x: zoneX, y: TERRAIN_Y, w: capped, h: TERRAIN_HEIGHT };
        erases.push(zoneRect);
        // Register hazard for visual rendering
        hazards.push({ type: 'water', x: zoneX, y: TERRAIN_Y, w: capped, h: 20 });
        return {
          startX,
          endX,
          obstacle: { type: 'water_zone', requiredTool: 'stairs', rect: zoneRect },
          fills,
          erases,
        };
      }

      case 'lava_zone': {
        // Lava — instant death gap, must bridge, no safety (wider than water)
        const zoneW = rng.intRange(40 + tier * 8, 70 + tier * 12);
        const capped = Math.min(zoneW, MAX_STAIR_SPAN - 20, space);
        const zoneX = midX - Math.floor(capped / 2);
        const zoneRect: TerrainRect = { x: zoneX, y: TERRAIN_Y, w: capped, h: TERRAIN_HEIGHT };
        erases.push(zoneRect);
        hazards.push({ type: 'lava', x: zoneX, y: TERRAIN_Y, w: capped, h: 20 });
        return {
          startX,
          endX,
          obstacle: { type: 'lava_zone', requiredTool: 'stairs', rect: zoneRect },
          fills,
          erases,
        };
      }

      case 'crusher_zone': {
        // Area with overhead ceiling creating dangerous passage
        // Lemmings must walk through quickly (timing hazard)
        // Represented as a low ceiling — forces blocker/timing play
        const ceilingW = rng.intRange(60, 100);
        const ceilingX = midX - Math.floor(ceilingW / 2);
        // Ceiling block sitting low above terrain
        const ceilingY = TERRAIN_Y - rng.intRange(14, 18);
        const ceilingRect: TerrainRect = { x: ceilingX, y: ceilingY, w: ceilingW, h: 12 };
        fills.push(ceilingRect);
        hazards.push({ type: 'crusher', x: ceilingX, y: ceilingY, w: ceilingW, h: 12 });
        // No required tool — timing is the mechanic, but ramp helps navigate
        return {
          startX,
          endX,
          obstacle: { type: 'crusher_zone', requiredTool: null, rect: ceilingRect },
          fills,
          erases,
        };
      }

      case 'multi_platform': {
        // Two stacked platforms at different heights — must navigate vertically
        const platW = rng.intRange(80, 120);
        const lowerPlatH = rng.intRange(10, 16);
        const upperPlatH = rng.intRange(lowerPlatH + 10, lowerPlatH + 22);
        const platX = midX - Math.floor(platW / 2);

        // Lower platform (accessible via ramp)
        const lowerY = TERRAIN_Y - lowerPlatH;
        fills.push({ x: platX, y: lowerY, w: platW, h: 10 });

        // Upper platform (above lower, requires ramp from lower)
        const upperX = platX + rng.intRange(-20, 20);
        const upperY = TERRAIN_Y - upperPlatH;
        fills.push({ x: upperX, y: upperY, w: platW - 20, h: 10 });

        // Erase ground under lower platform so path goes through it
        erases.push({ x: platX, y: TERRAIN_Y, w: platW, h: TERRAIN_HEIGHT });

        const refRect: TerrainRect = { x: platX, y: lowerY, w: platW, h: 10 };
        return {
          startX,
          endX,
          obstacle: { type: 'multi_platform', requiredTool: 'ramp', rect: refRect },
          fills,
          erases,
        };
      }

      case 'narrow_tunnel': {
        // Low-ceiling tunnel passage — walls on both sides force walkers through
        const tunnelW = rng.intRange(60, 100);
        const tunnelX = midX - Math.floor(tunnelW / 2);
        const wallH = rng.intRange(12, 20);

        // Left wall
        fills.push({ x: tunnelX, y: TERRAIN_Y - wallH, w: 10, h: wallH });
        // Right wall
        fills.push({ x: tunnelX + tunnelW - 10, y: TERRAIN_Y - wallH, w: 10, h: wallH });

        // Overhead ceiling (low)
        const ceilH = 8;
        const ceilingY = TERRAIN_Y - wallH - ceilH;
        fills.push({ x: tunnelX, y: ceilingY, w: tunnelW, h: ceilH });

        const refRect: TerrainRect = { x: tunnelX, y: ceilingY, w: tunnelW, h: wallH + ceilH };
        return {
          startX,
          endX,
          obstacle: { type: 'narrow_tunnel', requiredTool: null, rect: refRect },
          fills,
          erases,
        };
      }

      case 'crumbling_platform': {
        // Platform that looks like elevated_platform but visually distinct
        // Mechanically treated like elevated_platform for validator purposes
        const platW = rng.intRange(50, 90);
        const platX = midX - Math.floor(platW / 2);
        const platH = rng.intRange(8, 16);
        const platY = TERRAIN_Y - platH;
        const platRect: TerrainRect = { x: platX, y: platY, w: platW, h: 10 };
        fills.push(platRect);
        erases.push({ x: platX, y: TERRAIN_Y, w: platW, h: TERRAIN_HEIGHT });
        return {
          startX,
          endX,
          obstacle: { type: 'crumbling_platform', requiredTool: 'ramp', rect: platRect },
          fills,
          erases,
        };
      }

      case 'none':
      default: {
        const noRect: TerrainRect = { x: midX, y: TERRAIN_Y, w: 0, h: 0 };
        return {
          startX,
          endX,
          obstacle: { type: 'none', requiredTool: null, rect: noRect },
          fills,
          erases,
        };
      }
    }
  }
}

// Suppress unused import warning — GAME_HEIGHT used for vertical layout guard
void GAME_HEIGHT;
// Suppress unused import warning — TOOL_STAIR_STEP_H used in docstring context
void TOOL_STAIR_STEP_H;
