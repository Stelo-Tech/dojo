import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WalkerState,
  FallerState,
  DeadState,
  SavedState,
  type LemmingEntity,
} from '@/entities/LemmingStates';
import { gameEventBus } from '@/utils/EventBus';
import {
  LEMMING_SPEED,
  GRAVITY,
  LEMMING_FALL_DISTANCE,
} from '@/utils/Constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEntity(overrides: Partial<LemmingEntity> = {}): LemmingEntity {
  return {
    x: 0,
    y: 0,
    direction: 1,
    fallDistance: 0,
    alive: true,
    saved: false,
    id: 1,
    changeState: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WalkerState
// ---------------------------------------------------------------------------

describe('WalkerState', () => {
  let state: WalkerState;
  let entity: LemmingEntity;

  beforeEach(() => {
    state = new WalkerState();
    entity = createEntity();
  });

  it('has name "walker"', () => {
    expect(state.name).toBe('walker');
  });

  it('enter() resets fallDistance to 0', () => {
    entity.fallDistance = 120;
    state.enter(entity);
    expect(entity.fallDistance).toBe(0);
  });

  it('enter() leaves other properties unchanged', () => {
    entity.x = 50;
    entity.y = 100;
    state.enter(entity);
    expect(entity.x).toBe(50);
    expect(entity.y).toBe(100);
  });

  it('update() moves entity by LEMMING_SPEED * direction * dt (direction=1)', () => {
    const dt = 0.016;
    entity.direction = 1;
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(LEMMING_SPEED * 1 * dt);
  });

  it('update() moves entity by LEMMING_SPEED * direction * dt (direction=-1)', () => {
    const dt = 0.016;
    entity.direction = -1;
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(LEMMING_SPEED * -1 * dt);
  });

  it('update() accumulates movement across multiple calls', () => {
    const dt = 0.1;
    entity.direction = 1;
    state.update(entity, dt);
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(LEMMING_SPEED * dt * 2);
  });

  it('update() does not modify y', () => {
    state.update(entity, 0.016);
    expect(entity.y).toBe(0);
  });

  it('exit() does not throw or change entity state', () => {
    expect(() => state.exit(entity)).not.toThrow();
    expect(entity.changeState).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// FallerState
// ---------------------------------------------------------------------------

describe('FallerState', () => {
  let state: FallerState;
  let entity: LemmingEntity;

  beforeEach(() => {
    state = new FallerState();
    entity = createEntity();
  });

  it('has name "faller"', () => {
    expect(state.name).toBe('faller');
  });

  it('enter() does not throw or change entity state', () => {
    expect(() => state.enter(entity)).not.toThrow();
    expect(entity.changeState).not.toHaveBeenCalled();
  });

  it('update() increases y by GRAVITY * dt', () => {
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.y).toBeCloseTo(GRAVITY * dt);
  });

  it('update() increases fallDistance by GRAVITY * dt', () => {
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.fallDistance).toBeCloseTo(GRAVITY * dt);
  });

  it('update() accumulates y and fallDistance identically across multiple calls', () => {
    const dt = 0.05;
    state.update(entity, dt);
    state.update(entity, dt);
    const expected = GRAVITY * dt * 2;
    expect(entity.y).toBeCloseTo(expected);
    expect(entity.fallDistance).toBeCloseTo(expected);
  });

  it('update() does not modify x', () => {
    state.update(entity, 0.016);
    expect(entity.x).toBe(0);
  });

  describe('exit()', () => {
    it('calls changeState("dead") when fallDistance > LEMMING_FALL_DISTANCE', () => {
      entity.fallDistance = LEMMING_FALL_DISTANCE + 1;
      state.exit(entity);
      expect(entity.changeState).toHaveBeenCalledWith('dead');
    });

    it('calls changeState("dead") when fallDistance is far above the limit', () => {
      entity.fallDistance = LEMMING_FALL_DISTANCE * 10;
      state.exit(entity);
      expect(entity.changeState).toHaveBeenCalledOnce();
      expect(entity.changeState).toHaveBeenCalledWith('dead');
    });

    it('does NOT call changeState("dead") when fallDistance === LEMMING_FALL_DISTANCE (boundary)', () => {
      entity.fallDistance = LEMMING_FALL_DISTANCE;
      state.exit(entity);
      expect(entity.changeState).not.toHaveBeenCalled();
    });

    it('does NOT call changeState("dead") when fallDistance < LEMMING_FALL_DISTANCE', () => {
      entity.fallDistance = LEMMING_FALL_DISTANCE - 1;
      state.exit(entity);
      expect(entity.changeState).not.toHaveBeenCalled();
    });

    it('does NOT call changeState("dead") when fallDistance is 0', () => {
      entity.fallDistance = 0;
      state.exit(entity);
      expect(entity.changeState).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// DeadState
// ---------------------------------------------------------------------------

describe('DeadState', () => {
  let state: DeadState;
  let entity: LemmingEntity;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state = new DeadState();
    entity = createEntity({ id: 42 });
    emitSpy = vi.spyOn(gameEventBus, 'emit');
  });

  afterEach(() => {
    emitSpy.mockRestore();
  });

  it('has name "dead"', () => {
    expect(state.name).toBe('dead');
  });

  it('enter() sets alive to false', () => {
    state.enter(entity);
    expect(entity.alive).toBe(false);
  });

  // REGRESSION: DeadState.enter() must emit 'lemming:died' on gameEventBus
  it('enter() emits "lemming:died" event on gameEventBus', () => {
    state.enter(entity);
    expect(emitSpy).toHaveBeenCalledWith('lemming:died', expect.objectContaining({ id: 42 }));
  });

  it('enter() emits "lemming:died" with the entity id and a cause', () => {
    state.enter(entity);
    const [event, payload] = emitSpy.mock.calls[0] as [string, { id: number; cause: string }];
    expect(event).toBe('lemming:died');
    expect(payload.id).toBe(42);
    expect(typeof payload.cause).toBe('string');
  });

  it('enter() emits exactly once per call', () => {
    state.enter(entity);
    const diedCalls = emitSpy.mock.calls.filter(([ev]) => ev === 'lemming:died');
    expect(diedCalls).toHaveLength(1);
  });

  it('update() does not throw', () => {
    expect(() => state.update(entity, 0.016)).not.toThrow();
  });

  it('exit() does not throw', () => {
    expect(() => state.exit(entity)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SavedState
// ---------------------------------------------------------------------------

describe('SavedState', () => {
  let state: SavedState;
  let entity: LemmingEntity;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state = new SavedState();
    entity = createEntity({ id: 7 });
    emitSpy = vi.spyOn(gameEventBus, 'emit');
  });

  afterEach(() => {
    emitSpy.mockRestore();
  });

  it('has name "saved"', () => {
    expect(state.name).toBe('saved');
  });

  it('enter() sets saved to true', () => {
    state.enter(entity);
    expect(entity.saved).toBe(true);
  });

  it('enter() sets alive to false', () => {
    state.enter(entity);
    expect(entity.alive).toBe(false);
  });

  // REGRESSION: SavedState must NOT emit 'lemming:died' — only DeadState does
  it('enter() does NOT emit "lemming:died" on gameEventBus', () => {
    state.enter(entity);
    const diedCalls = emitSpy.mock.calls.filter(([ev]) => ev === 'lemming:died');
    expect(diedCalls).toHaveLength(0);
  });

  it('enter() does not call changeState', () => {
    state.enter(entity);
    expect(entity.changeState).not.toHaveBeenCalled();
  });

  it('update() does not throw', () => {
    expect(() => state.update(entity, 0.016)).not.toThrow();
  });

  it('exit() does not throw', () => {
    expect(() => state.exit(entity)).not.toThrow();
  });
});
