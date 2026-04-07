import { LemmingPool } from '@/entities/LemmingPool';
import { gameEventBus } from '@/utils/EventBus';
import { SPAWN_INTERVAL, MAX_LEMMINGS } from '@/utils/Constants';

export interface SpawnConfig {
  readonly x: number;
  readonly y: number;
  readonly maxLemmings: number;
  readonly spawnInterval: number;
}

const DEFAULT_SPAWN_CONFIG: SpawnConfig = {
  x: 100,
  y: 100,
  maxLemmings: MAX_LEMMINGS,
  spawnInterval: SPAWN_INTERVAL,
};

export class SpawnSystem {
  private readonly pool: LemmingPool;
  private readonly config: SpawnConfig;
  private elapsed = 0;
  private spawnedCount = 0;
  private allSpawned = false;

  constructor(pool: LemmingPool, config?: Partial<SpawnConfig>) {
    this.pool = pool;
    this.config = { ...DEFAULT_SPAWN_CONFIG, ...config };
  }

  update(dt: number): void {
    if (this.allSpawned) return;

    this.elapsed += dt * 1000;

    while (
      this.elapsed >= this.config.spawnInterval &&
      this.spawnedCount < this.config.maxLemmings
    ) {
      this.elapsed -= this.config.spawnInterval;
      this.spawn();
    }

    if (this.spawnedCount >= this.config.maxLemmings && !this.allSpawned) {
      this.allSpawned = true;
      gameEventBus.emit('level:allSpawned', {});
    }
  }

  getSpawnedCount(): number {
    return this.spawnedCount;
  }

  destroy(): void {
    // Stateless
  }

  private spawn(): void {
    const lemming = this.pool.acquire(this.config.x, this.config.y);
    this.spawnedCount++;
    gameEventBus.emit('lemming:spawned', { id: lemming.id });
  }
}
