import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PhysicsSystem } from '@/systems/PhysicsSystem';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  STEP_CLIMB_MAX,
} from '@/utils/Constants';

/**
 * Minimal TerrainSystem mock.
 * isGround and isWall are vi.fn() so each test can control terrain layout.
 */
function createMockTerrain(defaults: { isGround?: boolean; isWall?: boolean } = {}) {
  return {
    isGround: vi.fn().mockReturnValue(defaults.isGround ?? false),
    isWall: vi.fn().mockReturnValue(defaults.isWall ?? false),
    digColumn: vi.fn(),
    digHorizontal: vi.fn(),
    buildStep: vi.fn(),
    eraseRect: vi.fn(),
    fillRect: vi.fn(),
    getTerrainTopY: vi.fn().mockReturnValue(300),
    destroy: vi.fn(),
  };
}

/**
 * Minimal LemmingPool mock that returns a controllable set of active lemmings.
 */
function createMockPool(lemmings: MockLemming[]) {
  return {
    getActive: vi.fn().mockReturnValue(lemmings),
    acquire: vi.fn(),
    release: vi.fn(),
    updateAll: vi.fn(),
    activeCount: lemmings.length,
    totalCount: lemmings.length,
    destroy: vi.fn(),
  };
}

interface MockLemming {
  id: number;
  x: number;
  y: number;
  direction: 1 | -1;
  fallDistance: number;
  alive: boolean;
  saved: boolean;
  getStateName: ReturnType<typeof vi.fn>;
  changeState: ReturnType<typeof vi.fn>;
}

function createLemming(overrides: Partial<MockLemming> = {}): MockLemming {
  return {
    id: 1,
    x: 200,
    y: 300,
    direction: 1,
    fallDistance: 0,
    alive: true,
    saved: false,
    getStateName: vi.fn().mockReturnValue('walker'),
    changeState: vi.fn(),
    ...overrides,
  };
}

describe('PhysicsSystem', () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  afterEach(() => {
    gameEventBus.clear();
  });

  // -------------------------------------------------------------------------
  // Out-of-bounds detection
  // -------------------------------------------------------------------------

  it('kills lemming that goes below GAME_HEIGHT (out of bounds down)', () => {
    const lemming = createLemming({ y: GAME_HEIGHT + 1, getStateName: vi.fn().mockReturnValue('walker') });
    const terrain = createMockTerrain();
    const pool = createMockPool([lemming]);

    const diedHandler = vi.fn();
    gameEventBus.on('lemming:died', diedHandler);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).toHaveBeenCalledWith('dead');
    expect(diedHandler).toHaveBeenCalledWith(expect.objectContaining({ id: 1, cause: 'out-of-bounds' }));
  });

  it('kills lemming that goes left of x=0', () => {
    const lemming = createLemming({ x: -1, getStateName: vi.fn().mockReturnValue('walker') });
    const terrain = createMockTerrain();
    const pool = createMockPool([lemming]);

    const diedHandler = vi.fn();
    gameEventBus.on('lemming:died', diedHandler);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).toHaveBeenCalledWith('dead');
  });

  it('kills lemming that goes right beyond GAME_WIDTH', () => {
    const lemming = createLemming({ x: GAME_WIDTH + 1, getStateName: vi.fn().mockReturnValue('walker') });
    const terrain = createMockTerrain();
    const pool = createMockPool([lemming]);

    const diedHandler = vi.fn();
    gameEventBus.on('lemming:died', diedHandler);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).toHaveBeenCalledWith('dead');
  });

  it('does not process lemmings that are already dead (alive = false)', () => {
    const lemming = createLemming({ alive: false });
    const terrain = createMockTerrain();
    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Faller state — landing
  // -------------------------------------------------------------------------

  it('faller transitions to walker when it lands on ground', () => {
    const lemming = createLemming({
      x: 200,
      y: 300,
      getStateName: vi.fn().mockReturnValue('faller'),
    });

    // Simulate ground at y=300 (all isGround calls return true)
    const terrain = createMockTerrain({ isGround: true });
    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).toHaveBeenCalledWith('walker');
  });

  it('faller continues falling when there is no ground below', () => {
    const lemming = createLemming({
      x: 200,
      y: 200,
      getStateName: vi.fn().mockReturnValue('faller'),
    });

    // No ground anywhere
    const terrain = createMockTerrain({ isGround: false });
    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    // Should NOT change to walker since there is no ground
    expect(lemming.changeState).not.toHaveBeenCalledWith('walker');
  });

  // -------------------------------------------------------------------------
  // Walker state — gravity
  // -------------------------------------------------------------------------

  it('walker transitions to faller when ground disappears beneath', () => {
    const lemming = createLemming({
      x: 200,
      y: 300,
      getStateName: vi.fn().mockReturnValue('walker'),
    });

    // No ground at y+1 → should fall
    const terrain = createMockTerrain({ isGround: false });
    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).toHaveBeenCalledWith('faller');
  });

  it('walker does not change state when standing on ground', () => {
    const lemming = createLemming({
      x: 200,
      y: 300,
      getStateName: vi.fn().mockReturnValue('walker'),
    });

    // Ground exists at y+1 → stays walker
    const terrain = createMockTerrain({ isGround: true });
    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.changeState).not.toHaveBeenCalledWith('faller');
  });

  // -------------------------------------------------------------------------
  // Wall detection — walker reverses direction
  // -------------------------------------------------------------------------

  it('walker reverses direction on encountering a tall wall', () => {
    const lemming = createLemming({
      x: 200,
      y: 300,
      direction: 1,
      getStateName: vi.fn().mockReturnValue('walker'),
    });

    // Ground exists below (walker stands on it), wall exists ahead at all heights
    const terrain = {
      isGround: vi.fn().mockImplementation((_x: number, y: number) => {
        // Ground below (y+1 range)
        if (y >= 300) return true;
        // No ground at y-1 (snap-to-surface probe returns start value)
        return false;
      }),
      isWall: vi.fn().mockReturnValue(true), // tall wall everywhere
      destroy: vi.fn(),
    };

    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.direction).toBe(-1);
  });

  it('walker does not reverse when there is no wall ahead', () => {
    const lemming = createLemming({
      x: 200,
      y: 300,
      direction: 1,
      getStateName: vi.fn().mockReturnValue('walker'),
    });

    const terrain = {
      isGround: vi.fn().mockImplementation((_x: number, y: number) => y >= 300),
      isWall: vi.fn().mockReturnValue(false), // no wall
      destroy: vi.fn(),
    };

    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    expect(lemming.direction).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Step climbing
  // -------------------------------------------------------------------------

  it('walker can climb a small step (height <= STEP_CLIMB_MAX)', () => {
    const lemming = createLemming({
      x: 200,
      y: 310,
      direction: 1,
      getStateName: vi.fn().mockReturnValue('walker'),
    });

    // Ground exists below the lemming
    // Obstacle ahead at feet height (y-1) but not at body height (y - (STEP_CLIMB_MAX + 4))
    // so it qualifies as a small step
    const terrain = {
      isGround: vi.fn().mockImplementation((x: number, y: number) => {
        // Ground below lemming at y+1
        if (y >= 310 && x >= 190 && x <= 215) return true;
        // Obstacle at feet height (y-1 = 309) ahead (x ~ 206)
        if (x > 205 && y >= 307 && y <= 309) return true;
        return false;
      }),
      isWall: vi.fn().mockReturnValue(false),
      destroy: vi.fn(),
    };

    const pool = createMockPool([lemming]);
    const yBefore = lemming.y;

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    // Lemming should have stepped up (y decreased), or at least not changed to faller
    expect(lemming.changeState).not.toHaveBeenCalledWith('faller');
    // y should have adjusted upward (snapped to surface or climbed step)
    expect(lemming.y).toBeLessThanOrEqual(yBefore);
  });

  // -------------------------------------------------------------------------
  // Non-walker/faller states are not processed by physics
  // -------------------------------------------------------------------------

  it('does not change state of a lemming in digger state', () => {
    const lemming = createLemming({
      x: 200,
      y: 300,
      getStateName: vi.fn().mockReturnValue('digger'),
    });

    const terrain = createMockTerrain({ isGround: false });
    const pool = createMockPool([lemming]);

    const physics = new PhysicsSystem(pool as never, terrain as never);
    physics.update(0.016);

    // PhysicsSystem only processes 'walker' and 'faller' states explicitly;
    // digger is left to the state machine
    expect(lemming.changeState).not.toHaveBeenCalled();
  });

  it('destroy() does not throw', () => {
    const terrain = createMockTerrain();
    const pool = createMockPool([]);
    const physics = new PhysicsSystem(pool as never, terrain as never);
    expect(() => physics.destroy()).not.toThrow();
  });
});
