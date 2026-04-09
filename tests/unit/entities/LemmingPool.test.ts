import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameEventBus } from '@/utils/EventBus';

/**
 * Mock factories for Phaser objects required by Lemming constructor.
 */
function createMockRectangle(): Record<string, unknown> {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createMockTriangle(): Record<string, unknown> {
  return {
    setFillStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createMockScene() {
  return {
    add: {
      rectangle: vi.fn().mockReturnValue(createMockRectangle()),
      triangle: vi.fn().mockReturnValue(createMockTriangle()),
    },
  };
}

describe('LemmingPool', () => {
  let scene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    scene = createMockScene();
    gameEventBus.clear();
  });

  it('initializes with pre-allocated instances', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 5);
    // All 5 are available (inactive), none active yet
    expect(pool.activeCount).toBe(0);
    expect(pool.totalCount).toBe(5);
  });

  it('acquire() returns an active lemming at the given position', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    const lemming = pool.acquire(100, 200);

    expect(lemming).toBeDefined();
    expect(lemming.alive).toBe(true);
    expect(lemming.x).toBe(100);
    expect(lemming.y).toBe(200);
    expect(pool.activeCount).toBe(1);
  });

  it('acquire() moves instance from available to active', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 5);

    pool.acquire(0, 0);
    pool.acquire(0, 0);

    expect(pool.activeCount).toBe(2);
    // total count stays the same (no new allocations when pool has capacity)
    expect(pool.totalCount).toBe(5);
  });

  it('release() returns lemming to pool and deactivates it', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    const lemming = pool.acquire(100, 200);
    expect(pool.activeCount).toBe(1);

    pool.release(lemming);
    expect(pool.activeCount).toBe(0);
    expect(lemming.alive).toBe(false);
  });

  it('released lemming can be re-acquired', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 1);

    const first = pool.acquire(10, 20);
    pool.release(first);

    const second = pool.acquire(50, 60);
    expect(second.alive).toBe(true);
    expect(second.x).toBe(50);
    expect(second.y).toBe(60);
    expect(pool.activeCount).toBe(1);
  });

  it('pool grows when exhausted (acquire beyond initial size)', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 2);

    pool.acquire(0, 0);
    pool.acquire(0, 0);
    // Pool is now exhausted — it should grow by one
    const extra = pool.acquire(0, 0);

    expect(extra).toBeDefined();
    expect(extra.alive).toBe(true);
    expect(pool.activeCount).toBe(3);
    // Total grew from 2 to 3
    expect(pool.totalCount).toBe(3);
  });

  it('updateAll() calls update on all active lemmings', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    const l1 = pool.acquire(100, 300);
    const l2 = pool.acquire(200, 300);

    // Spy on the update method of each individual lemming
    const spy1 = vi.spyOn(l1, 'update');
    const spy2 = vi.spyOn(l2, 'update');

    pool.updateAll(0.016);

    expect(spy1).toHaveBeenCalledWith(0.016);
    expect(spy2).toHaveBeenCalledWith(0.016);
  });

  it('updateAll() auto-releases lemmings that are no longer alive', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    const lemming = pool.acquire(100, 300);
    // Simulate death by marking alive = false (DeadState.enter does this)
    lemming.alive = false;

    expect(pool.activeCount).toBe(1);
    pool.updateAll(0.016);
    // Dead lemming should have been auto-released
    expect(pool.activeCount).toBe(0);
  });

  it('updateAll() skips inactive lemmings', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    // Acquire then release — lemming goes back to available
    const lemming = pool.acquire(100, 300);
    pool.release(lemming);

    const spyUpdate = vi.spyOn(lemming, 'update');
    pool.updateAll(0.016);

    // Released lemming is inactive and must not be updated
    expect(spyUpdate).not.toHaveBeenCalled();
  });

  it('getActive() returns read-only snapshot of active lemmings', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    pool.acquire(0, 0);
    pool.acquire(0, 0);

    const active = pool.getActive();
    expect(active).toHaveLength(2);
  });

  it('destroy() cleans up all lemmings', async () => {
    const { LemmingPool } = await import('@/entities/LemmingPool');
    const pool = new LemmingPool(scene as never, 3);

    const l = pool.acquire(0, 0);
    const destroySpy = vi.spyOn(l, 'destroy');

    pool.destroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(pool.activeCount).toBe(0);
    expect(pool.totalCount).toBe(0);
  });
});
