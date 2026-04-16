import { LemmingPool } from '@/entities/LemmingPool';
import { TerrainSystem } from '@/systems/TerrainSystem';
import {
  GAME_WIDTH,
  HUD_BAR_Y,
  STEP_CLIMB_MAX,
} from '@/utils/Constants';

/** Horizontal proximity (px) for blocker collision */
const BLOCKER_RANGE_X = 8;
/** Vertical proximity (px) for blocker collision */
const BLOCKER_RANGE_Y = 16;

export class PhysicsSystem {
  private readonly pool: LemmingPool;
  private readonly terrain: TerrainSystem;

  constructor(pool: LemmingPool, terrain: TerrainSystem) {
    this.pool = pool;
    this.terrain = terrain;
  }

  update(_dt: number): void {
    const active = this.pool.getActive();

    // Collect blocker positions for collision checks (avoid O(n) per walker)
    const blockerPositions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < active.length; i++) {
      const lemming = active[i];
      if (lemming && lemming.alive && lemming.getStateName() === 'blocker') {
        blockerPositions.push({ x: lemming.x, y: lemming.y });
      }
    }

    for (let i = active.length - 1; i >= 0; i--) {
      const lemming = active[i];
      if (!lemming || !lemming.alive) continue;

      const state = lemming.getStateName();

      // Out-of-bounds kill
      if (lemming.x < 0 || lemming.x > GAME_WIDTH || lemming.y > HUD_BAR_Y) {
        lemming.changeState('dead');
        continue;
      }

      // Faller landing
      if (state === 'faller') {
        // If the lemming has the floater trait, transition to floater instead
        if (lemming.isFloater) {
          lemming.changeState('floater');
          continue;
        }
        const onGround = this.checkGround(lemming.x, lemming.y);
        if (onGround) {
          lemming.y = this.snapToSurface(lemming.x, lemming.y);
          lemming.changeState('walker');
        }
        continue;
      }

      // Floater landing
      if (state === 'floater') {
        const onGround = this.checkGround(lemming.x, lemming.y);
        if (onGround) {
          lemming.y = this.snapToSurface(lemming.x, lemming.y);
          lemming.changeState('walker');
        }
        continue;
      }

      // Climber physics: climbing up a wall
      if (state === 'climber') {
        // Check if there is still wall ahead at current position
        const wallCheckX = lemming.x + lemming.direction * 6;
        const wallStillPresent = this.terrain.isWall(wallCheckX, lemming.y - 4);

        if (!wallStillPresent) {
          // Reached top of wall -- move over the ledge and become a walker
          lemming.x += lemming.direction * 6;
          lemming.changeState('walker');
          continue;
        }

        // Check if there is ground directly above (ceiling) -- cannot climb further
        const ceilingCheck = this.terrain.isGround(lemming.x, lemming.y - 18);
        if (ceilingCheck) {
          // Stuck under ceiling -- reverse and become faller
          lemming.direction = lemming.direction === 1 ? -1 : 1;
          lemming.changeState('faller');
          continue;
        }
        continue;
      }

      // Digger: check if lemming has dug through all terrain below
      if (state === 'digger') {
        const groundBelow = this.checkGround(lemming.x, lemming.y + 1);
        if (!groundBelow) {
          lemming.changeState('faller');
        }
        continue;
      }

      // Basher: check if lemming has bashed through the wall ahead
      if (state === 'basher') {
        const aheadX = lemming.x + lemming.direction * 8;
        const wallAhead = this.terrain.isWall(aheadX, lemming.y - 4);
        const groundBelow = this.checkGround(lemming.x, lemming.y + 1);
        if (!groundBelow) {
          lemming.changeState('faller');
        } else if (!wallAhead) {
          lemming.changeState('walker');
        }
        continue;
      }

      // Miner: check if lemming has mined through terrain
      if (state === 'miner') {
        const aheadX = lemming.x + lemming.direction * 6;
        const groundAhead = this.terrain.isGround(aheadX, lemming.y);
        const groundBelow = this.checkGround(lemming.x, lemming.y + 1);
        if (!groundBelow && !groundAhead) {
          lemming.changeState('faller');
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

        // Check blocker collision: walkers reverse direction near blockers
        let reversedByBlocker = false;
        for (const bp of blockerPositions) {
          const dx = Math.abs(lemming.x - bp.x);
          const dy = Math.abs(lemming.y - bp.y);
          if (dx < BLOCKER_RANGE_X && dy < BLOCKER_RANGE_Y && lemming.x !== bp.x) {
            // Reverse only if walking toward the blocker
            const walkingToward = (lemming.direction === 1 && lemming.x < bp.x) ||
                                  (lemming.direction === -1 && lemming.x > bp.x);
            if (walkingToward) {
              lemming.direction = lemming.direction === 1 ? -1 : 1;
              reversedByBlocker = true;
              break;
            }
          }
        }
        if (reversedByBlocker) continue;

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

        // Wall detection -- only for tall walls (solid at all three check heights)
        const wallCheckX = lemming.x + lemming.direction * 6;
        const wallAtLow = this.terrain.isWall(wallCheckX, lemming.y - 4);
        const wallAtMid = this.terrain.isWall(wallCheckX, lemming.y - 8);
        const wallAtHigh = this.terrain.isWall(wallCheckX, lemming.y - 12);
        const wallAhead = wallAtLow && wallAtMid && wallAtHigh;

        if (wallAhead) {
          // If the lemming has the climber trait, transition to climber state
          if (lemming.isClimber) {
            lemming.changeState('climber');
            continue;
          }
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
