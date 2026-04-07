import { LemmingPool } from '@/entities/LemmingPool';
import { Lemming } from '@/entities/Lemming';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BLOCKER_DETECTION_RADIUS,
  BLOCKER_VERTICAL_RANGE,
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

    // Phase 1: collect all active blockers
    const blockers: Lemming[] = [];
    for (let i = active.length - 1; i >= 0; i--) {
      const l = active[i];
      if (l && l.alive && l.isBlocker) {
        blockers.push(l);
      }
    }

    for (let i = active.length - 1; i >= 0; i--) {
      const lemming = active[i];
      if (!lemming || !lemming.alive) continue;

      const state = lemming.getStateName();

      // Out-of-bounds kill
      if (lemming.x < 0 || lemming.x > GAME_WIDTH || lemming.y > GAME_HEIGHT) {
        gameEventBus.emit('lemming:died', { id: lemming.id, cause: 'out-of-bounds' });
        lemming.changeState('dead');
        continue;
      }

      // Skip physics for self-managed states
      if (state === 'blocker' || state === 'digger' || state === 'builder' || state === 'climber') {
        continue;
      }

      const onGround = this.checkGround(lemming.x, lemming.y);

      // Faller landing
      if (state === 'faller') {
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

        // Blocker collision BEFORE wall/step detection
        if (blockers.length > 0) {
          this.handleBlockerCollision(lemming, blockers);
        }

        // Step-climbing: detect low obstacles (1-STEP_CLIMB_MAX px) ahead
        const aheadX = lemming.x + lemming.direction * 6;
        const hasObstacleAtFeet = this.terrain.isGround(aheadX, lemming.y - 1);
        const hasObstacleAtBody = this.terrain.isGround(aheadX, lemming.y - (STEP_CLIMB_MAX + 4));

        if (hasObstacleAtFeet && !hasObstacleAtBody) {
          // Low obstacle — find the top of the step
          let stepTopY = lemming.y - 1;
          for (let probe = 0; probe < STEP_CLIMB_MAX + 2; probe++) {
            if (this.terrain.isGround(aheadX, stepTopY - 1)) {
              stepTopY--;
            } else {
              break;
            }
          }
          // Climb if within max step height
          const stepHeight = lemming.y - stepTopY;
          if (stepHeight > 0 && stepHeight <= STEP_CLIMB_MAX) {
            lemming.y = stepTopY;
            continue; // skip wall detection — we climbed the step
          }
        }

        // Wall detection — only for tall walls (solid at all three check heights)
        const wallCheckX = lemming.x + lemming.direction * 6;
        const wallAtLow = this.terrain.isWall(wallCheckX, lemming.y - 4);
        const wallAtMid = this.terrain.isWall(wallCheckX, lemming.y - 8);
        const wallAtHigh = this.terrain.isWall(wallCheckX, lemming.y - 12);
        const wallAhead = wallAtLow && wallAtMid && wallAtHigh;

        if (wallAhead) {
          if (lemming.hasSkill('climber')) {
            lemming.changeState('climber');
            continue;
          }
          lemming.direction = lemming.direction === 1 ? -1 : 1;
          continue;
        }
      }
    }
  }

  private handleBlockerCollision(walker: Lemming, blockerList: readonly Lemming[]): void {
    for (let j = 0; j < blockerList.length; j++) {
      const blocker = blockerList[j];
      if (!blocker || blocker.id === walker.id) continue;

      const dx = walker.x - blocker.x;
      const dy = Math.abs(walker.y - blocker.y);

      if (Math.abs(dx) >= BLOCKER_DETECTION_RADIUS || dy >= BLOCKER_VERTICAL_RANGE) {
        continue;
      }

      if (dx > 0 && walker.direction === -1) {
        walker.direction = 1;
        break;
      }
      if (dx < 0 && walker.direction === 1) {
        walker.direction = -1;
        break;
      }
      if (Math.abs(dx) < 3) {
        walker.direction = dx >= 0 ? 1 : -1;
        walker.x = blocker.x + walker.direction * 3;
        break;
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
    let surfaceY = startY;
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
