import { LemmingPool } from '@/entities/LemmingPool';
import { TerrainSystem } from '@/systems/TerrainSystem';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  STEP_CLIMB_MAX,
} from '@/utils/Constants';

export class PhysicsSystem {
  private readonly pool: LemmingPool;
  private readonly terrain: TerrainSystem;

  constructor(pool: LemmingPool, terrain: TerrainSystem) {
    this.pool = pool;
    this.terrain = terrain;
  }

  update(_dt: number): void {
    const active = this.pool.getActive();

    for (let i = active.length - 1; i >= 0; i--) {
      const lemming = active[i];
      if (!lemming || !lemming.alive) continue;

      const state = lemming.getStateName();

      // Out-of-bounds kill
      if (lemming.x < 0 || lemming.x > GAME_WIDTH || lemming.y > GAME_HEIGHT) {
        lemming.changeState('dead');
        continue;
      }

      // Faller landing
      if (state === 'faller') {
        const onGround = this.checkGround(lemming.x, lemming.y);
        if (onGround) {
          lemming.y = this.snapToSurface(lemming.x, lemming.y);
          lemming.changeState('walker');
        }
        continue;
      }

      // Walker physics
      if (state === 'walker') {
        const groundBelow = this.checkGround(lemming.x, lemming.y + 1);

        if (!groundBelow) {
          lemming.changeState('faller');
          continue;
        }

        // Always snap to surface
        lemming.y = this.snapToSurface(lemming.x, lemming.y);

        // Step-climbing: detect low obstacles (1-STEP_CLIMB_MAX px) ahead
        const aheadX = lemming.x + lemming.direction * 6;
        const hasObstacleAtFeet = this.terrain.isGround(aheadX, lemming.y - 1);
        const hasObstacleAtBody = this.terrain.isGround(aheadX, lemming.y - (STEP_CLIMB_MAX + 4));

        if (hasObstacleAtFeet && !hasObstacleAtBody) {
          let stepTopY = lemming.y - 1;
          for (let probe = 0; probe < STEP_CLIMB_MAX + 2; probe++) {
            if (this.terrain.isGround(aheadX, stepTopY - 1)) {
              stepTopY--;
            } else {
              break;
            }
          }
          const stepHeight = lemming.y - stepTopY;
          if (stepHeight > 0 && stepHeight <= STEP_CLIMB_MAX) {
            lemming.y = stepTopY;
            continue;
          }
        }

        // Wall detection — only for tall walls (solid at all three check heights)
        const wallCheckX = lemming.x + lemming.direction * 6;
        const wallAtLow = this.terrain.isWall(wallCheckX, lemming.y - 4);
        const wallAtMid = this.terrain.isWall(wallCheckX, lemming.y - 8);
        const wallAtHigh = this.terrain.isWall(wallCheckX, lemming.y - 12);
        const wallAhead = wallAtLow && wallAtMid && wallAtHigh;

        if (wallAhead) {
          lemming.direction = lemming.direction === 1 ? -1 : 1;
          continue;
        }
      }
    }
  }

  private checkGround(x: number, y: number): boolean {
    return (
      this.terrain.isGround(x, y) ||
      this.terrain.isGround(x - 4, y) ||
      this.terrain.isGround(x + 4, y) ||
      this.terrain.isGround(x, y - 1) ||
      this.terrain.isGround(x - 4, y - 1) ||
      this.terrain.isGround(x + 4, y - 1)
    );
  }

  private snapToSurface(x: number, startY: number): number {
    let surfaceY = Math.floor(startY);
    for (let probe = 0; probe < 14; probe++) {
      if (this.checkGround(x, surfaceY - 1)) {
        surfaceY--;
      } else {
        break;
      }
    }
    return surfaceY;
  }

  destroy(): void {}
}
