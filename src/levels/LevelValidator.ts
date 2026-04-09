import { LevelData, LevelRect, LevelToolConfig } from '@/levels/LevelTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, rect: LevelRect): boolean {
  return ax < rect.x + rect.w && ax + aw > rect.x && ay < rect.y + rect.h && ay + ah > rect.y;
}

function pointInRect(px: number, py: number, rect: LevelRect): boolean {
  return px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
}

function isPointInsideTerrain(x: number, y: number, terrain: readonly LevelRect[]): boolean {
  return terrain.some((r) => pointInRect(x, y, r));
}

function countToolTypes(tools: LevelToolConfig): number {
  return (Object.keys(tools) as (keyof LevelToolConfig)[]).filter((k) => {
    const v = tools[k];
    return v !== undefined && v > 0;
  }).length;
}

function validateToolValues(tools: LevelToolConfig): string[] {
  const errors: string[] = [];
  (Object.entries(tools) as [string, number | undefined][]).forEach(([key, value]) => {
    if (value === undefined) return;
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`Tool "${key}" must be a non-negative integer, got ${String(value)}`);
    }
  });
  return errors;
}

export class LevelValidator {
  static validate(level: LevelData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ID must be positive integer
    if (!Number.isInteger(level.id) || level.id <= 0) {
      errors.push(`Level id must be a positive integer, got ${String(level.id)}`);
    }

    // Name must be non-empty
    if (level.name.trim().length === 0) {
      errors.push('Level name must not be empty');
    }

    // At least one terrain rect
    if (level.terrain.length === 0) {
      errors.push('Level must have at least one terrain rect');
    }

    // par <= spawn.count
    if (level.par > level.spawn.count) {
      errors.push(
        `par (${level.par}) must not exceed spawn.count (${level.spawn.count})`,
      );
    }

    // spawn.count must be positive
    if (!Number.isInteger(level.spawn.count) || level.spawn.count <= 0) {
      errors.push(`spawn.count must be a positive integer, got ${String(level.spawn.count)}`);
    }

    // spawn.rate must be positive
    if (level.spawn.rate <= 0) {
      errors.push(`spawn.rate must be positive, got ${String(level.spawn.rate)}`);
    }

    // Tool values: non-negative integers
    const toolErrors = validateToolValues(level.tools);
    errors.push(...toolErrors);

    // Max 5 tool types (surcharge cognitive rule)
    const toolTypeCount = countToolTypes(level.tools);
    if (toolTypeCount > 5) {
      errors.push(
        `Level has ${toolTypeCount} tool types; maximum allowed is 5 (cognitive overload)`,
      );
    }

    // Level dimensions: terrain rects fit within GAME_WIDTH x GAME_HEIGHT
    level.terrain.forEach((rect, i) => {
      if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > GAME_WIDTH || rect.y + rect.h > GAME_HEIGHT) {
        errors.push(
          `Terrain rect [${i}] (x=${rect.x}, y=${rect.y}, w=${rect.w}, h=${rect.h}) exceeds game bounds (${GAME_WIDTH}x${GAME_HEIGHT})`,
        );
      }
    });

    // Spawn point not inside terrain
    const spawnInsideTerrain = isPointInsideTerrain(level.spawn.x, level.spawn.y, level.terrain);
    if (spawnInsideTerrain) {
      errors.push(
        `Spawn point (${level.spawn.x}, ${level.spawn.y}) is inside a terrain rect`,
      );
    }

    // Spawn point must have terrain below it (within GAME_HEIGHT)
    const spawnHasGround = level.terrain.some((rect) => {
      // A terrain rect starts at or below spawn.y within a reasonable distance
      return (
        level.spawn.x >= rect.x &&
        level.spawn.x < rect.x + rect.w &&
        rect.y >= level.spawn.y &&
        rect.y <= GAME_HEIGHT
      );
    });
    if (!spawnHasGround && !spawnInsideTerrain) {
      errors.push(
        `Spawn point (${level.spawn.x}, ${level.spawn.y}) has no terrain below it — lemmings will fall off screen`,
      );
    }

    // Exit not fully enclosed by terrain (must have at least one side free)
    const exitRect = level.exit;
    const exitFullyEnclosed = level.terrain.every((rect) =>
      rectsOverlap(exitRect.x, exitRect.y, exitRect.w, exitRect.h, rect),
    );
    // A simpler heuristic: if every surrounding pixel is terrain, exit is blocked.
    // We check that exit zone itself is not inside a solid terrain block.
    const exitCenterX = exitRect.x + exitRect.w / 2;
    const exitCenterY = exitRect.y + exitRect.h / 2;
    if (level.terrain.length > 0 && exitFullyEnclosed) {
      // Only truly enclosed if a single terrain rect fully covers the exit
      const exitCoveredBySingleRect = level.terrain.some(
        (rect) =>
          exitRect.x >= rect.x &&
          exitRect.y >= rect.y &&
          exitRect.x + exitRect.w <= rect.x + rect.w &&
          exitRect.y + exitRect.h <= rect.y + rect.h,
      );
      if (exitCoveredBySingleRect) {
        errors.push(
          `Exit at (${exitRect.x}, ${exitRect.y}) is fully enclosed within a terrain rect`,
        );
      }
    }

    // Exit must be within game bounds
    if (
      exitRect.x < 0 ||
      exitRect.y < 0 ||
      exitRect.x + exitRect.w > GAME_WIDTH ||
      exitRect.y + exitRect.h > GAME_HEIGHT
    ) {
      errors.push(
        `Exit (x=${exitRect.x}, y=${exitRect.y}, w=${exitRect.w}, h=${exitRect.h}) exceeds game bounds (${GAME_WIDTH}x${GAME_HEIGHT})`,
      );
    }

    // Spawn must be within game bounds
    if (
      level.spawn.x < 0 ||
      level.spawn.x > GAME_WIDTH ||
      level.spawn.y < 0 ||
      level.spawn.y > GAME_HEIGHT
    ) {
      errors.push(
        `Spawn point (${level.spawn.x}, ${level.spawn.y}) is outside game bounds (${GAME_WIDTH}x${GAME_HEIGHT})`,
      );
    }

    // Warn about suspicious exit center being inside terrain (may be hard to reach)
    const exitCenterInTerrain = isPointInsideTerrain(exitCenterX, exitCenterY, level.terrain);
    if (exitCenterInTerrain) {
      warnings.push(
        `Exit center (${exitCenterX}, ${exitCenterY}) is inside terrain — verify exit is reachable`,
      );
    }

    // Warn if par is very low (< 50% of spawn.count)
    if (level.par < level.spawn.count * 0.5) {
      warnings.push(
        `par (${level.par}) is less than 50% of spawn.count (${level.spawn.count}) — level may be too easy`,
      );
    }

    // Warn about zero tool types for non-tutorial levels
    if (toolTypeCount === 0 && level.difficulty !== 'tutorial') {
      warnings.push('Non-tutorial level has no tools — verify lemmings can reach exit unaided');
    }

    // Warn about timeLimit
    if (level.timeLimit !== undefined && level.timeLimit <= 0) {
      errors.push(`timeLimit must be a positive number if provided, got ${String(level.timeLimit)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
