import {
  GAME_WIDTH,
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
  LevelData,
  ObstacleType,
  Segment,
  TerrainRect,
} from '@/levels/LevelData';

/** Deterministic PRNG (Park-Miller LCG) */
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
  },
  {
    tier: 2,
    segmentCount: 2,
    allowedObstacles: ['gap', 'wall'],
    lemmingCount: 15,
    requiredSaves: 8,
    spawnInterval: 1000,
    toolSlack: 2,
  },
  {
    tier: 3,
    segmentCount: 3,
    allowedObstacles: ['gap', 'wall', 'pit'],
    lemmingCount: 20,
    requiredSaves: 14,
    spawnInterval: 900,
    toolSlack: 1,
  },
  {
    tier: 4,
    segmentCount: 4,
    allowedObstacles: ['gap', 'wall', 'pit', 'gap'],
    lemmingCount: 25,
    requiredSaves: 20,
    spawnInterval: 800,
    toolSlack: 1,
  },
  {
    tier: 5,
    segmentCount: 5,
    allowedObstacles: ['gap', 'wall', 'pit', 'wall', 'gap'],
    lemmingCount: 30,
    requiredSaves: 27,
    spawnInterval: 700,
    toolSlack: 0,
  },
];

/** Spawn platform width */
const SPAWN_PLATFORM_W = 160;
/** Exit platform width */
const EXIT_PLATFORM_W = 100;
/** Min gap between segment obstacles */
const OBSTACLE_MARGIN = 20;
/** Max stair bridgeable gap width */
const MAX_STAIR_SPAN = TOOL_STAIR_STEPS * TOOL_STAIR_STEP_W; // 180

export class LevelGenerator {
  generate(config: DifficultyConfig, seed: number): LevelData {
    const rng = new SeededRandom(seed);

    // Step 1: Spawn and exit positions
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

    // Step 2: Build base terrain fills
    const terrainFills: TerrainRect[] = [];
    const terrainErases: TerrainRect[] = [];

    // Main ground
    terrainFills.push({ x: 0, y: TERRAIN_Y, w: GAME_WIDTH, h: TERRAIN_HEIGHT });

    // Spawn platform (elevated)
    terrainFills.push({
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
      terrainFills.push({
        x: slopeStartX + s * slopeStepW,
        y: slopeTopY + s * slopeStepH,
        w: slopeStepW,
        h: TERRAIN_Y - (slopeTopY + s * slopeStepH) + 10,
      });
    }

    // Exit platform
    terrainFills.push({
      x: exitX - EXIT_PLATFORM_W / 2,
      y: TERRAIN_Y,
      w: EXIT_PLATFORM_W,
      h: 20,
    });

    // Remove cliff below spawn (left side)
    terrainErases.push({
      x: 0,
      y: TERRAIN_Y,
      w: spawnX - SPAWN_PLATFORM_W / 2,
      h: TERRAIN_HEIGHT,
    });

    // Step 3: Divide space into segments and assign obstacles
    const segStartX = slopeStartX + slopeSteps * slopeStepW + OBSTACLE_MARGIN;
    const segEndX = exitX - EXIT_PLATFORM_W / 2 - OBSTACLE_MARGIN;
    const segTotalWidth = segEndX - segStartX;
    const segCount = config.segmentCount;
    const segWidth = Math.floor(segTotalWidth / segCount);

    const segments: Segment[] = [];
    const toolsRequired: Record<ToolType, number> = { dig: 0, stairs: 0, wall: 0, ramp: 0 };

    // Pre-plan obstacles: shuffle allowed types to ensure variety, cap each tool usage
    const plannedObstacles = this.planObstacles(rng, config);

    for (let i = 0; i < segCount; i++) {
      const sx = segStartX + i * segWidth;
      const ex = i === segCount - 1 ? segEndX : sx + segWidth;
      const obstacleSpace = ex - sx - 2 * OBSTACLE_MARGIN;

      const obstacleType = plannedObstacles[i] ?? 'none';
      const segment = this.generateSegment(rng, obstacleType, sx, ex, obstacleSpace, config.tier);
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
      spawn,
      exit,
      terrainFills,
      terrainErases,
      segments,
      toolBudget,
      lemmingCount: config.lemmingCount,
      requiredSaves: config.requiredSaves,
      spawnInterval: config.spawnInterval,
    };
  }

  /** Pre-plan obstacles to ensure variety and tool budget feasibility */
  private planObstacles(rng: SeededRandom, config: DifficultyConfig): ObstacleType[] {
    const plan: ObstacleType[] = [];
    const allowed = config.allowedObstacles;
    const count = config.segmentCount;

    // Ensure each obstacle type from allowedObstacles appears at most once in first pass
    // Then fill remaining slots with gaps or none
    const shuffled = [...allowed].sort(() => rng.next() - 0.5);

    for (let i = 0; i < count; i++) {
      if (i < shuffled.length) {
        const item = shuffled[i];
        if (item !== undefined) {
          plan.push(item);
        } else {
          plan.push('gap');
        }
      } else {
        // Extra segments get simple obstacles
        plan.push(rng.pick(['gap', 'none']));
      }
    }

    // Shuffle the plan so obstacles aren't in a predictable order
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

  private generateSegment(
    rng: SeededRandom,
    type: ObstacleType,
    startX: number,
    endX: number,
    space: number,
    tier: number,
  ): Segment {
    const midX = Math.floor((startX + endX) / 2);
    const fills: TerrainRect[] = [];
    const erases: TerrainRect[] = [];

    switch (type) {
      case 'gap': {
        // Gap width: 50-80px scaled by tier, capped at stair bridgeable range
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
        // Wall height scaled by tier, width capped to TOOL_DIG_WIDTH for diggability
        const wallH = rng.intRange(15 + tier * 3, 25 + tier * 5);
        const wallW = rng.intRange(10, 20);
        const wallX = midX - Math.floor(wallW / 2);
        const wallY = TERRAIN_Y - wallH;
        const wallRect: TerrainRect = { x: wallX, y: wallY, w: wallW, h: wallH };
        fills.push(wallRect);
        // Can be solved with dig (through) or ramp (over)
        const tool: ToolType = wallH <= TOOL_RAMP_HEIGHT ? rng.pick(['dig', 'ramp']) : 'dig';
        return {
          startX,
          endX,
          obstacle: { type: 'wall', requiredTool: tool, rect: wallRect },
          fills,
          erases,
        };
      }

      case 'pit': {
        // Like gap but with deadly fall — narrower but deeper
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
        // Platform raised above terrain — needs ramp to reach
        // Cap height to TOOL_RAMP_HEIGHT so a ramp can always reach it
        const maxH = Math.min(TOOL_RAMP_HEIGHT - 2, 18);
        const platH = rng.intRange(8, maxH);
        const platW = rng.intRange(50, 80);
        const platX = midX - Math.floor(platW / 2);
        const platY = TERRAIN_Y - platH;
        const platRect: TerrainRect = { x: platX, y: platY, w: platW, h: 10 };
        fills.push(platRect);
        // Erase the ground under the platform so lemmings must go on top
        erases.push({ x: platX, y: TERRAIN_Y, w: platW, h: TERRAIN_HEIGHT });
        return {
          startX,
          endX,
          obstacle: { type: 'elevated_platform', requiredTool: 'ramp', rect: platRect },
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
