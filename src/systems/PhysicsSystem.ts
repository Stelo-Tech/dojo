import { LemmingPool } from '@/entities/LemmingPool';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BLOCKER_DETECTION_RADIUS,
  BLOCKER_VERTICAL_RANGE,
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
        gameEventBus.emit('lemming:died', { id: lemming.id, cause: 'out-of-bounds' });
        lemming.changeState('dead');
        continue;
      }

      // Skip physics for states that manage their own movement
      if (state === 'blocker' || state === 'digger' || state === 'builder' || state === 'climber') {
        continue;
      }

      // --- Ground detection (multi-point) ---
      const onGround = this.checkGround(lemming.x, lemming.y);

      // --- Faller landing ---
      if (onGround && state === 'faller') {
        lemming.y = this.snapToSurface(lemming.x, lemming.y);
        lemming.changeState('walker');
        continue;
      }

      // --- Walker physics ---
      if (state === 'walker') {
        // Check ground below (multi-point, 1px below feet)
        const groundBelow = this.checkGround(lemming.x, lemming.y + 1);

        if (!groundBelow) {
          lemming.changeState('faller');
          continue;
        }

        // Snap to surface to avoid floating
        const snappedY = this.snapToSurface(lemming.x, lemming.y);
        if (snappedY < lemming.y) {
          lemming.y = snappedY;
        }

        // Wall detection — check terrain ahead at multiple heights
        const wallCheckX = lemming.x + lemming.direction * 6;
        const wallAhead =
          this.terrain.isWall(wallCheckX, lemming.y - 4) &&
          this.terrain.isWall(wallCheckX, lemming.y - 8);

        if (wallAhead) {
          if (lemming.hasSkill('climber')) {
            lemming.changeState('climber');
            continue;
          }
          lemming.direction = lemming.direction === 1 ? -1 : 1;
          continue;
        }

        // --- Blocker collision (CRITICAL) ---
        for (let j = active.length - 1; j >= 0; j--) {
          const other = active[j];
          if (!other || !other.alive || !other.isBlocker || other.id === lemming.id) continue;

          const dx = lemming.x - other.x;
          const dy = Math.abs(lemming.y - other.y);

          if (Math.abs(dx) < BLOCKER_DETECTION_RADIUS && dy < BLOCKER_VERTICAL_RANGE) {
            if (dx > 0 && lemming.direction === -1) {
              lemming.direction = 1;
            } else if (dx < 0 && lemming.direction === 1) {
              lemming.direction = -1;
            } else if (Math.abs(dx) < 2) {
              lemming.direction = lemming.direction === 1 ? -1 : 1;
            }
            break;
          }
        }
      }
    }
  }

  private checkGround(x: number, y: number): boolean {
    return (
      this.terrain.isGround(x, y) ||
      this.terrain.isGround(x - 4, y) ||
      this.terrain.isGround(x + 4, y)
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

  destroy(): void {
    // Stateless
  }
}
