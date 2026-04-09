import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnSystem } from '@/systems/SpawnSystem';
import { gameEventBus } from '@/utils/EventBus';
import { SPAWN_INTERVAL, MAX_LEMMINGS } from '@/utils/Constants';

/**
 * Minimal LemmingPool stub: tracks acquire calls and returns fake lemmings
 * with incrementing ids.
 */
function createMockPool() {
  let nextId = 0;
  return {
    acquire: vi.fn().mockImplementation((_x: number, _y: number) => ({
      id: nextId++,
      alive: true,
    })),
    release: vi.fn(),
    updateAll: vi.fn(),
    getActive: vi.fn().mockReturnValue([]),
    activeCount: 0,
    totalCount: 0,
    destroy: vi.fn(),
  };
}

describe('SpawnSystem', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
    gameEventBus.clear();
  });

  it('does not spawn on construction', () => {
    new SpawnSystem(pool as never, { maxLemmings: 5, spawnInterval: 1000 });
    expect(pool.acquire).not.toHaveBeenCalled();
  });

  it('spawns a lemming after one full interval has elapsed', () => {
    const system = new SpawnSystem(pool as never, {
      x: 100,
      y: 200,
      maxLemmings: 5,
      spawnInterval: 1000,
    });

    // dt is in seconds; the system converts dt * 1000 -> ms internally
    system.update(1); // 1 second = 1000 ms = exactly one interval

    expect(pool.acquire).toHaveBeenCalledOnce();
    expect(pool.acquire).toHaveBeenCalledWith(100, 200);
  });

  it('does not spawn when elapsed is less than the interval', () => {
    const system = new SpawnSystem(pool as never, {
      maxLemmings: 5,
      spawnInterval: 2000,
    });

    system.update(0.5); // 500 ms < 2000 ms
    expect(pool.acquire).not.toHaveBeenCalled();
  });

  it('spawns multiple lemmings when multiple intervals elapse at once', () => {
    const system = new SpawnSystem(pool as never, {
      maxLemmings: 10,
      spawnInterval: 500,
    });

    system.update(2); // 2000 ms = 4 intervals of 500 ms
    expect(pool.acquire).toHaveBeenCalledTimes(4);
  });

  it('respects the max lemming cap and does not spawn beyond it', () => {
    const system = new SpawnSystem(pool as never, {
      maxLemmings: 3,
      spawnInterval: 500,
    });

    system.update(10); // 10 000 ms >> enough for many intervals
    expect(pool.acquire).toHaveBeenCalledTimes(3);
  });

  it('emits lemming:spawned event for each spawn', () => {
    const handler = vi.fn();
    gameEventBus.on('lemming:spawned', handler);

    const system = new SpawnSystem(pool as never, {
      maxLemmings: 3,
      spawnInterval: 1000,
    });

    system.update(3); // 3 intervals -> 3 spawns
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('lemming:spawned event carries the lemming id', () => {
    const handler = vi.fn();
    gameEventBus.on('lemming:spawned', handler);

    const system = new SpawnSystem(pool as never, {
      maxLemmings: 1,
      spawnInterval: 1000,
    });

    system.update(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(Number) }));
  });

  it('emits level:allSpawned once when max lemmings reached', () => {
    const allSpawnedHandler = vi.fn();
    gameEventBus.on('level:allSpawned', allSpawnedHandler);

    const system = new SpawnSystem(pool as never, {
      maxLemmings: 2,
      spawnInterval: 1000,
    });

    system.update(2); // spawns exactly 2
    expect(allSpawnedHandler).toHaveBeenCalledOnce();
  });

  it('level:allSpawned is emitted only once even on subsequent updates', () => {
    const allSpawnedHandler = vi.fn();
    gameEventBus.on('level:allSpawned', allSpawnedHandler);

    const system = new SpawnSystem(pool as never, {
      maxLemmings: 1,
      spawnInterval: 1000,
    });

    system.update(1); // spawns 1, triggers allSpawned
    system.update(1); // no more spawns, should not re-emit
    system.update(5);
    expect(allSpawnedHandler).toHaveBeenCalledOnce();
  });

  it('stops spawning after allSpawned (no further acquire calls)', () => {
    const system = new SpawnSystem(pool as never, {
      maxLemmings: 1,
      spawnInterval: 1000,
    });

    system.update(1); // spawns 1
    expect(pool.acquire).toHaveBeenCalledTimes(1);

    system.update(5); // no more spawns expected
    expect(pool.acquire).toHaveBeenCalledTimes(1);
  });

  it('getSpawnedCount() tracks the number of spawned lemmings', () => {
    const system = new SpawnSystem(pool as never, {
      maxLemmings: 5,
      spawnInterval: 1000,
    });

    system.update(3);
    expect(system.getSpawnedCount()).toBe(3);
  });

  it('uses default config values when none are provided', () => {
    const system = new SpawnSystem(pool as never);
    // Default spawn interval is SPAWN_INTERVAL ms (1000 ms = 1 s)
    // and max lemmings is MAX_LEMMINGS
    system.update(1); // one interval
    expect(pool.acquire).toHaveBeenCalledOnce();
    expect(system.getSpawnedCount()).toBe(1);

    // Verify the cap is MAX_LEMMINGS
    system.update(MAX_LEMMINGS * SPAWN_INTERVAL / 1000 + 10);
    expect(system.getSpawnedCount()).toBe(MAX_LEMMINGS);
  });
});
