import {
  GAME_WIDTH,
  TERRAIN_Y,
  TOOL_STAIR_STEPS,
  TOOL_STAIR_STEP_W,
  TOOL_STAIR_STEP_H,
  TOOL_DIG_WIDTH,
  TOOL_RAMP_LENGTH,
  TOOL_RAMP_HEIGHT,
  STEP_CLIMB_MAX,
  ToolType,
} from '@/utils/Constants';
import { LevelData } from '@/levels/LevelData';

export interface ValidationResult {
  readonly solvable: boolean;
  readonly reason: string;
  readonly toolsUsed: Readonly<Record<ToolType, number>>;
}

/** No ground marker */
const NO_GROUND = 9999;

/**
 * Validates that a generated level is solvable by simulating a walker
 * with optimal tool usage. Pure logic — no Phaser dependency.
 */
export class LevelValidator {
  validate(level: LevelData): ValidationResult {
    // Build 1D heightmap: groundY[x] = topmost Y of ground at column x
    const groundY = this.buildHeightmap(level);

    // Simulate walker
    let x = Math.floor(level.spawn.x);
    let y = this.findSurface(groundY, x);
    const exitLeft = Math.floor(level.exit.x);
    const exitRight = Math.floor(level.exit.x + level.exit.width);
    const exitSurfaceY = this.findSurface(groundY, Math.floor((exitLeft + exitRight) / 2));

    const toolsUsed: Record<ToolType, number> = { dig: 0, stairs: 0, wall: 0, ramp: 0 };
    let direction = 1;
    let turnCount = 0;
    const maxSteps = GAME_WIDTH * 4;

    for (let step = 0; step < maxSteps; step++) {
      // Check victory
      if (x >= exitLeft && x <= exitRight && Math.abs(y - exitSurfaceY) <= 5) {
        return { solvable: true, reason: 'path found', toolsUsed };
      }

      const nextX = x + direction;

      // Out of bounds — turn around
      if (nextX < 0 || nextX >= GAME_WIDTH) {
        direction *= -1;
        turnCount++;
        if (turnCount > level.segments.length * 6 + 10) {
          return { solvable: false, reason: `stuck: too many turns at x=${x}`, toolsUsed };
        }
        continue;
      }

      const nextGroundY = groundY[nextX];

      // Case 1: No ground ahead — gap
      if (nextGroundY === undefined || nextGroundY === NO_GROUND) {
        // Find gap extent
        const gapStart = nextX;
        let gapEnd = gapStart;
        while (gapEnd < GAME_WIDTH && (groundY[gapEnd] === NO_GROUND || groundY[gapEnd] === undefined)) {
          gapEnd++;
        }
        const gapWidth = gapEnd - gapStart;

        // Try stairs
        const stairSpan = TOOL_STAIR_STEPS * TOOL_STAIR_STEP_W;
        if (gapWidth <= stairSpan && toolsUsed.stairs < level.toolBudget.stairs) {
          // Place virtual stairs across gap
          toolsUsed.stairs++;
          for (let col = gapStart; col < gapEnd && col < GAME_WIDTH; col++) {
            const stepIdx = Math.floor((col - gapStart) / TOOL_STAIR_STEP_W);
            const stepY = y - (stepIdx + 1) * TOOL_STAIR_STEP_H;
            groundY[col] = Math.min(groundY[col] ?? NO_GROUND, stepY);
          }
          // Continue walking — ground is now filled
          continue;
        }

        // Can't bridge — turn around
        direction *= -1;
        turnCount++;
        if (turnCount > level.segments.length * 6 + 10) {
          return { solvable: false, reason: `unbridgeable gap (${gapWidth}px) at x=${gapStart}`, toolsUsed };
        }
        continue;
      }

      // Case 2: Ground ahead — check elevation difference
      const dy = y - (nextGroundY ?? y);  // positive = next is higher (wall/step)

      if (dy < -STEP_CLIMB_MAX) {
        // Dropping down — check if it's a fatal fall
        // Just walk down (lemmings can handle non-fatal drops)
        x = nextX;
        y = nextGroundY ?? y;
        continue;
      }

      if (dy >= -STEP_CLIMB_MAX && dy <= STEP_CLIMB_MAX) {
        // Small step — auto-climb
        x = nextX;
        y = nextGroundY ?? y;
        continue;
      }

      // Wall ahead — elevation too high to climb
      if (dy > STEP_CLIMB_MAX) {
        // Measure wall height
        const wallHeight = dy;

        // Try ramp (if wall isn't too tall)
        if (wallHeight <= TOOL_RAMP_HEIGHT && toolsUsed.ramp < level.toolBudget.ramp) {
          toolsUsed.ramp++;
          // Place virtual ramp
          const rampDir = direction;
          for (let col = 0; col < TOOL_RAMP_LENGTH; col++) {
            const rx = x + rampDir * col;
            if (rx < 0 || rx >= GAME_WIDTH) break;
            const progress = (col + 1) / TOOL_RAMP_LENGTH;
            const rampY = y - Math.floor(TOOL_RAMP_HEIGHT * progress);
            groundY[rx] = Math.min(groundY[rx] ?? NO_GROUND, rampY);
          }
          continue;
        }

        // Try dig (punch through wall)
        if (toolsUsed.dig < level.toolBudget.dig) {
          toolsUsed.dig++;
          // Erase wall columns ahead
          const digStart = direction === 1 ? nextX : nextX - TOOL_DIG_WIDTH;
          for (let col = digStart; col < digStart + TOOL_DIG_WIDTH && col < GAME_WIDTH; col++) {
            if (col >= 0) {
              const current = groundY[col];
              if (current !== undefined && current !== NO_GROUND && current < y) {
                // Reset to terrain level (dig through the wall)
                groundY[col] = y;
              }
            }
          }
          continue;
        }

        // Can't pass — turn around
        direction *= -1;
        turnCount++;
        if (turnCount > level.segments.length * 6 + 10) {
          return { solvable: false, reason: `impassable wall (${wallHeight}px) at x=${nextX}`, toolsUsed };
        }
        continue;
      }

      // Default: advance
      x = nextX;
      y = nextGroundY ?? y;
    }

    return { solvable: false, reason: 'exceeded max steps', toolsUsed };
  }

  private buildHeightmap(level: LevelData): number[] {
    const groundY = new Array<number>(GAME_WIDTH).fill(NO_GROUND);

    // Apply fills: for each column, track the topmost solid Y
    for (const rect of level.terrainFills) {
      const x0 = Math.max(0, Math.floor(rect.x));
      const x1 = Math.min(GAME_WIDTH, Math.floor(rect.x + rect.w));
      const top = Math.floor(rect.y);
      for (let col = x0; col < x1; col++) {
        const current = groundY[col];
        if (current === undefined || current === NO_GROUND || top < current) {
          groundY[col] = top;
        }
      }
    }

    // Apply erases: remove ground in erased regions
    for (const rect of level.terrainErases) {
      const x0 = Math.max(0, Math.floor(rect.x));
      const x1 = Math.min(GAME_WIDTH, Math.floor(rect.x + rect.w));
      const eraseTop = Math.floor(rect.y);
      const eraseBottom = Math.floor(rect.y + rect.h);
      for (let col = x0; col < x1; col++) {
        const current = groundY[col];
        if (current !== undefined && current !== NO_GROUND && current >= eraseTop && current < eraseBottom) {
          groundY[col] = NO_GROUND;
        }
      }
    }

    return groundY;
  }

  private findSurface(groundY: number[], x: number): number {
    const gy = groundY[Math.max(0, Math.min(x, GAME_WIDTH - 1))];
    return gy !== undefined && gy !== NO_GROUND ? gy : TERRAIN_Y;
  }
}
