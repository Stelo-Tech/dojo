/**
 * Unit tests for PhysicsSystem.
 *
 * PhysicsSystem depends on LemmingPool and TerrainSystem, both of which depend
 * on Phaser. We mock them with typed classes so no Phaser runtime is needed.
 *
 * Constants used:
 *   HUD_BAR_Y  = GAME_HEIGHT - HUD_BAR_HEIGHT = 540 - 70 = 470
 *   GAME_WIDTH = 960
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsSystem } from '@/systems/PhysicsSystem';
import { LemmingPool } from '@/entities/LemmingPool';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { GAME_WIDTH, HUD_BAR_Y } from '@/utils/Constants';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

/** Minimal shape consumed by PhysicsSystem from each lemming. */
interface MockLemmingShape {
  x: number;
  y: number;
  alive: boolean;
  direction: 1 | -1;
  fallDistance: number;
  getStateName: ReturnType<typeof vi.fn>;
  changeState: ReturnType<typeof vi.fn>;
}

function createMockLemming(overrides: Partial<MockLemmingShape> = {}): MockLemmingShape {
  return {
    x: 100,
    y: 300,
    alive: true,
    direction: 1,
    fallDistance: 0,
    getStateName: vi.fn().mockReturnValue('walker'),
    changeState: vi.fn(),
    ...overrides,
  };
}

/** MockTerrainSystem — all checks return false by default; configure per test. */
class MockTerrainSystem {
  private groundFn: (x: number, y: number) => boolean = () => false;
  private wallFn: (x: number, y: number) => boolean = () => false;

  setGroundFn(fn: (x: number, y: number) => boolean): void {
    this.groundFn = fn;
  }

  setWallFn(fn: (x: number, y: number) => boolean): void {
    this.wallFn = fn;
  }

  isGround(x: number, y: number): boolean {
    return this.groundFn(x, y);
  }

  isWall(x: number, y: number): boolean {
    return this.wallFn(x, y);
  }
}

/** MockLemmingPool — returns a configurable list of active lemmings. */
class MockLemmingPool {
  private lemmings: MockLemmingShape[] = [];

  setActive(lemmings: MockLemmingShape[]): void {
    this.lemmings = lemmings;
  }

  getActive(): readonly MockLemmingShape[] {
    return this.lemmings;
  }
}

// ---------------------------------------------------------------------------
// Factory — build PhysicsSystem with mocks, cast to expected types
// ---------------------------------------------------------------------------

interface TestContext {
  physics: PhysicsSystem;
  terrain: MockTerrainSystem;
  pool: MockLemmingPool;
}

function buildContext(): TestContext {
  const terrain = new MockTerrainSystem();
  const pool = new MockLemmingPool();
  const physics = new PhysicsSystem(
    pool as unknown as LemmingPool,
    terrain as unknown as TerrainSystem,
  );
  return { physics, terrain, pool };
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('PhysicsSystem', () => {

  // -------------------------------------------------------------------------
  // 1. snapToSurface — regression test for float y coordinates
  // -------------------------------------------------------------------------
  describe('snapToSurface (regression: floors startY)', () => {
    it('snaps a faller at y=400.7 to y=400 when ground is exactly at y=400', () => {
      const { physics, terrain, pool } = buildContext();

      // Ground plane at world y=400: isGround returns true at y=400, false above.
      // checkGround probes (x, y), (x±4, y), (x, y-1), (x±4, y-1).
      // snapToSurface: surfaceY = floor(400.7) = 400.
      //   probe 0: checkGround(x, 399) — should be false → loop stops.
      // → returns 400 (integer, not 400.7).
      terrain.setGroundFn((_x, y) => y >= 400);

      const lemming = createMockLemming({
        x: 100,
        y: 400.7,
        getStateName: vi.fn().mockReturnValue('faller'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      // faller landing: onGround check uses checkGround(x, y=400.7).
      // isGround(100, 400.7) → 400.7 >= 400 → true, so onGround = true.
      // snapToSurface called, y must be integer 400.
      expect(lemming.y).toBe(400);
      expect(lemming.changeState).toHaveBeenCalledWith('walker');
    });

    it('does not produce a fractional y after snap when startY has decimals', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn((_x, y) => y >= 350);

      const lemming = createMockLemming({
        x: 200,
        y: 350.99,
        getStateName: vi.fn().mockReturnValue('faller'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(Number.isInteger(lemming.y)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Out-of-bounds kill uses HUD_BAR_Y (470), not GAME_HEIGHT (540)
  // -------------------------------------------------------------------------
  describe('out-of-bounds kill boundary', () => {
    it('kills a lemming at y > HUD_BAR_Y (y=471)', () => {
      const { physics, pool } = buildContext();

      const lemming = createMockLemming({ x: 100, y: HUD_BAR_Y + 1 }); // 471
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).toHaveBeenCalledWith('dead');
    });

    it('does NOT kill a lemming at y = HUD_BAR_Y (y=470, boundary is exclusive)', () => {
      const { physics, terrain, pool } = buildContext();

      // Ground at 470 so walker check doesn't make it fall.
      terrain.setGroundFn((_x, y) => y >= HUD_BAR_Y);

      const lemming = createMockLemming({ x: 100, y: HUD_BAR_Y }); // exactly 470
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).not.toHaveBeenCalledWith('dead');
    });

    it('does NOT kill a lemming at y = HUD_BAR_Y - 1 (y=469)', () => {
      const { physics, terrain, pool } = buildContext();

      // Ground just below so the walker stays on solid surface.
      terrain.setGroundFn((_x, y) => y >= HUD_BAR_Y - 1);

      const lemming = createMockLemming({ x: 100, y: HUD_BAR_Y - 1 }); // 469
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).not.toHaveBeenCalledWith('dead');
    });

    it('kills a lemming that goes out of bounds on the left (x < 0)', () => {
      const { physics, pool } = buildContext();

      const lemming = createMockLemming({ x: -1, y: 200 });
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).toHaveBeenCalledWith('dead');
    });

    it('kills a lemming that goes out of bounds on the right (x > GAME_WIDTH)', () => {
      const { physics, pool } = buildContext();

      const lemming = createMockLemming({ x: GAME_WIDTH + 1, y: 200 });
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).toHaveBeenCalledWith('dead');
    });

    it('does NOT kill a lemming at x = GAME_WIDTH (boundary is inclusive ≤ passes)', () => {
      // Kill condition: x > GAME_WIDTH, so x = GAME_WIDTH is safe.
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn((_x, y) => y >= 300);

      const lemming = createMockLemming({ x: GAME_WIDTH, y: 300 });
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).not.toHaveBeenCalledWith('dead');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Walker with no ground becomes faller
  // -------------------------------------------------------------------------
  describe('walker → faller transition (no ground below)', () => {
    it('transitions walker to faller when there is no ground directly below', () => {
      const { physics, terrain, pool } = buildContext();

      // All terrain checks return false → no ground anywhere.
      terrain.setGroundFn(() => false);

      const lemming = createMockLemming({
        x: 100,
        y: 200,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).toHaveBeenCalledWith('faller');
    });

    it('does NOT transition walker to faller when ground is present below', () => {
      const { physics, terrain, pool } = buildContext();

      // Ground is solid below (y+1 and surrounding probes hit).
      terrain.setGroundFn((_x, y) => y >= 201);

      const lemming = createMockLemming({
        x: 100,
        y: 200,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).not.toHaveBeenCalledWith('faller');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Faller landing on ground becomes walker
  // -------------------------------------------------------------------------
  describe('faller → walker transition (landing)', () => {
    it('transitions faller to walker when checkGround returns true', () => {
      const { physics, terrain, pool } = buildContext();

      // Ground at y=300 — checkGround(100, 300) will hit isGround(100, 300) = true.
      terrain.setGroundFn((_x, y) => y >= 300);

      const lemming = createMockLemming({
        x: 100,
        y: 300,
        getStateName: vi.fn().mockReturnValue('faller'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).toHaveBeenCalledWith('walker');
    });

    it('does NOT transition faller to walker when there is no ground', () => {
      const { physics, terrain, pool } = buildContext();

      // No ground anywhere.
      terrain.setGroundFn(() => false);

      const lemming = createMockLemming({
        x: 100,
        y: 200,
        getStateName: vi.fn().mockReturnValue('faller'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).not.toHaveBeenCalledWith('walker');
    });

    it('sets y to an integer (snapped) value after faller lands', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn((_x, y) => y >= 300);

      const lemming = createMockLemming({
        x: 100,
        y: 300.5,
        getStateName: vi.fn().mockReturnValue('faller'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(Number.isInteger(lemming.y)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Wall detection reverses direction
  // -------------------------------------------------------------------------
  describe('wall detection reverses direction', () => {
    it('flips direction from +1 to -1 when all three wall-check heights are solid', () => {
      const { physics, terrain, pool } = buildContext();

      // Ground below so lemming stays as walker (not fall) and wall checks fire.
      terrain.setGroundFn((_x, y) => y >= 201); // ground at y+1

      // All isWall calls return true regardless of position.
      terrain.setWallFn(() => true);

      const lemming = createMockLemming({
        x: 100,
        y: 200,
        direction: 1,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.direction).toBe(-1);
    });

    it('flips direction from -1 to +1 when all three wall-check heights are solid', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn((_x, y) => y >= 201);
      terrain.setWallFn(() => true);

      const lemming = createMockLemming({
        x: 100,
        y: 200,
        direction: -1,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.direction).toBe(1);
    });

    it('does NOT flip direction when only some wall heights are solid', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn((_x, y) => y >= 201);

      // Only wallAtLow returns true, wallAtMid and wallAtHigh return false.
      // PhysicsSystem checks isWall at y-4, y-8, y-12 relative to lemming.y.
      // Lemming.y = 200, direction = 1, wallCheckX = 106.
      // wallAtLow  = isWall(106, 196)
      // wallAtMid  = isWall(106, 192)
      // wallAtHigh = isWall(106, 188)
      terrain.setWallFn((_x, y) => y === 196); // only the lowest check

      const originalDirection: 1 | -1 = 1;
      const lemming = createMockLemming({
        x: 100,
        y: 200,
        direction: originalDirection,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.direction).toBe(originalDirection);
    });

    it('does NOT flip direction when no wall ahead', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn((_x, y) => y >= 201);
      terrain.setWallFn(() => false);

      const lemming = createMockLemming({
        x: 100,
        y: 200,
        direction: 1,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.direction).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Dead / inactive lemmings are skipped
  // -------------------------------------------------------------------------
  describe('dead and inactive lemmings are skipped', () => {
    it('skips lemmings where alive is false', () => {
      const { physics, pool } = buildContext();

      const lemming = createMockLemming({ alive: false });
      pool.setActive([lemming]);
      physics.update(16);

      expect(lemming.changeState).not.toHaveBeenCalled();
      expect(lemming.getStateName).not.toHaveBeenCalled();
    });

    it('processes alive lemmings and skips dead ones in the same pool', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn(() => false); // no ground → faller transition

      const alive = createMockLemming({
        alive: true,
        x: 100,
        y: 200,
        getStateName: vi.fn().mockReturnValue('walker'),
      });
      const dead = createMockLemming({
        alive: false,
        x: 100,
        y: 200,
        getStateName: vi.fn().mockReturnValue('walker'),
      });

      pool.setActive([alive, dead]);
      physics.update(16);

      expect(alive.changeState).toHaveBeenCalledWith('faller');
      expect(dead.changeState).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Multiple lemmings are all processed in one update call
  // -------------------------------------------------------------------------
  describe('batch update', () => {
    it('processes all active lemmings in a single update call', () => {
      const { physics, terrain, pool } = buildContext();

      terrain.setGroundFn(() => false); // no ground → all walkers become fallers

      const lemmings = [
        createMockLemming({ x: 100, y: 200, getStateName: vi.fn().mockReturnValue('walker') }),
        createMockLemming({ x: 200, y: 200, getStateName: vi.fn().mockReturnValue('walker') }),
        createMockLemming({ x: 300, y: 200, getStateName: vi.fn().mockReturnValue('walker') }),
      ];

      pool.setActive(lemmings);
      physics.update(16);

      for (const lemming of lemmings) {
        expect(lemming.changeState).toHaveBeenCalledWith('faller');
      }
    });
  });

  // -------------------------------------------------------------------------
  // 8. Performance — 100 lemmings updated within budget
  // -------------------------------------------------------------------------
  describe('performance', () => {
    it('updates 100 lemmings (all walkers on solid ground) in under 10ms', () => {
      const { physics, terrain, pool } = buildContext();

      // Solid ground everywhere below; no walls.
      terrain.setGroundFn((_x, y) => y >= 201);
      terrain.setWallFn(() => false);

      const lemmings = Array.from({ length: 100 }, (_, i) =>
        createMockLemming({
          x: 50 + i * 8,
          y: 200,
          getStateName: vi.fn().mockReturnValue('walker'),
        }),
      );

      pool.setActive(lemmings);

      const start = performance.now();
      physics.update(16);
      const elapsed = performance.now() - start;

      // Budget: ≤ 0.1ms per lemming × 100 = 10ms (project constraint)
      expect(elapsed).toBeLessThan(10);
    });
  });

  // -------------------------------------------------------------------------
  // 9. destroy() does not throw
  // -------------------------------------------------------------------------
  describe('destroy', () => {
    it('can be destroyed without errors', () => {
      const { physics } = buildContext();
      expect(() => physics.destroy()).not.toThrow();
    });
  });
});
