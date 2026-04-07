import { LemmingPool } from '@/entities/LemmingPool';
import { gameEventBus } from '@/utils/EventBus';
import { GAME_WIDTH } from '@/utils/Constants';

export class PhysicsSystem {
  private readonly pool: LemmingPool;
  private readonly groundY: number;

  constructor(pool: LemmingPool, groundY: number = 450) {
    this.pool = pool;
    this.groundY = groundY;
  }

  update(_dt: number): void {
    const active = this.pool.getActive();
    for (let i = active.length - 1; i >= 0; i--) {
      const lemming = active[i];
      if (!lemming || !lemming.alive) continue;

      const state = lemming.getStateName();

      // --- Screen-boundary death ---
      if (lemming.x < 0 || lemming.x > GAME_WIDTH) {
        gameEventBus.emit('lemming:died', { id: lemming.id, cause: 'out-of-bounds' });
        lemming.changeState('dead');
        continue;
      }

      // --- Ground collision ---
      if (lemming.y >= this.groundY) {
        lemming.y = this.groundY;

        if (state === 'faller') {
          lemming.changeState('walker');
        }
        continue;
      }

      // --- Airborne detection ---
      if (state === 'walker' && lemming.y < this.groundY) {
        if (this.groundY - lemming.y > 1) {
          lemming.changeState('faller');
        }
      }
    }
  }

  destroy(): void {
    // Stateless
  }
}
