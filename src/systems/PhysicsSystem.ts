import { LemmingPool } from '@/entities/LemmingPool';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { gameEventBus } from '@/utils/EventBus';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';

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

      if (lemming.x < 0 || lemming.x > GAME_WIDTH || lemming.y > GAME_HEIGHT) {
        gameEventBus.emit('lemming:died', { id: lemming.id, cause: 'out-of-bounds' });
        lemming.changeState('dead');
        continue;
      }

      if (state === 'blocker' || state === 'digger' || state === 'builder' || state === 'climber') {
        continue;
      }

      const onGround =
        this.terrain.isGround(lemming.x, lemming.y) ||
        this.terrain.isGround(lemming.x - 3, lemming.y) ||
        this.terrain.isGround(lemming.x + 3, lemming.y);

      if (onGround && state === 'faller') {
        let surfaceY = lemming.y;
        for (let probe = 0; probe < 12; probe++) {
          if (
            this.terrain.isGround(lemming.x, surfaceY - 1) ||
            this.terrain.isGround(lemming.x - 3, surfaceY - 1) ||
            this.terrain.isGround(lemming.x + 3, surfaceY - 1)
          ) {
            surfaceY--;
          } else {
            break;
          }
        }
        lemming.y = surfaceY;
        lemming.changeState('walker');
        continue;
      }

      if (state === 'walker') {
        const groundBelow =
          this.terrain.isGround(lemming.x, lemming.y + 1) ||
          this.terrain.isGround(lemming.x - 3, lemming.y + 1) ||
          this.terrain.isGround(lemming.x + 3, lemming.y + 1);

        if (!groundBelow) {
          lemming.changeState('faller');
          continue;
        }

        const wallCheckX = lemming.x + lemming.direction * 5;
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

        for (let j = active.length - 1; j >= 0; j--) {
          const other = active[j];
          if (!other || !other.alive || !other.isBlocker || other.id === lemming.id) continue;

          const dx = lemming.x - other.x;
          const dy = Math.abs(lemming.y - other.y);

          if (Math.abs(dx) < 10 && dy < 14) {
            if (dx > 0 && lemming.direction === -1) {
              lemming.direction = 1;
            } else if (dx < 0 && lemming.direction === 1) {
              lemming.direction = -1;
            } else if (dx === 0) {
              lemming.direction = lemming.direction === 1 ? -1 : 1;
            }
          }
        }
      }
    }
  }

  destroy(): void {
    // Stateless
  }
}
