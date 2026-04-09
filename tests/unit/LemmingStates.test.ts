import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LemmingEntity,
  WalkerState,
  FallerState,
  DeadState,
  SavedState,
  DiggerState,
  BasherState,
  MinerState,
  BuilderState,
  BlockerState,
  ClimberState,
  FloaterState,
  BomberState,
} from '@/entities/LemmingStates';
import {
  LEMMING_SPEED,
  GRAVITY,
  DIGGER_SPEED_MULT,
  BASHER_SPEED_MULT,
  MINER_SPEED_MULT_X,
  MINER_SPEED_MULT_Y,
  CLIMBER_SPEED_MULT,
  FLOATER_GRAVITY_MULT,
  BUILDER_MAX_STEPS,
  BUILDER_STEP_WIDTH,
  BUILDER_STEP_HEIGHT,
  BUILDER_STEP_INTERVAL,
  BOMBER_COUNTDOWN,
} from '@/utils/Constants';
import { gameEventBus } from '@/utils/EventBus';

function createMockEntity(overrides?: Partial<LemmingEntity>): LemmingEntity {
  return {
    x: 100,
    y: 200,
    direction: 1,
    fallDistance: 0,
    alive: true,
    saved: false,
    id: 1,
    changeState: vi.fn(),
    ...overrides,
  };
}

describe('WalkerState', () => {
  let state: WalkerState;

  beforeEach(() => {
    state = new WalkerState();
  });

  it('has name "walker"', () => {
    expect(state.name).toBe('walker');
  });

  it('resets fallDistance on enter', () => {
    const entity = createMockEntity({ fallDistance: 50 });
    state.enter(entity);
    expect(entity.fallDistance).toBe(0);
  });

  it('moves entity horizontally in its direction', () => {
    const entity = createMockEntity({ x: 100, direction: 1 });
    state.update(entity, 0.016);
    expect(entity.x).toBeCloseTo(100 + LEMMING_SPEED * 0.016, 5);
  });

  it('moves entity left when direction is -1', () => {
    const entity = createMockEntity({ x: 100, direction: -1 });
    state.update(entity, 0.016);
    expect(entity.x).toBeCloseTo(100 - LEMMING_SPEED * 0.016, 5);
  });
});

describe('FallerState', () => {
  let state: FallerState;

  beforeEach(() => {
    state = new FallerState();
  });

  it('has name "faller"', () => {
    expect(state.name).toBe('faller');
  });

  it('moves entity downward by gravity', () => {
    const entity = createMockEntity({ y: 100 });
    state.update(entity, 0.016);
    expect(entity.y).toBeCloseTo(100 + GRAVITY * 0.016, 5);
  });

  it('accumulates fallDistance', () => {
    const entity = createMockEntity({ fallDistance: 0 });
    state.update(entity, 0.016);
    expect(entity.fallDistance).toBeCloseTo(GRAVITY * 0.016, 5);
  });

  it('transitions to dead on exit if fallDistance exceeds threshold', () => {
    const entity = createMockEntity({ fallDistance: 100 });
    state.exit(entity);
    expect(entity.changeState).toHaveBeenCalledWith('dead');
  });

  it('does not transition to dead if fallDistance is safe', () => {
    const entity = createMockEntity({ fallDistance: 10 });
    state.exit(entity);
    expect(entity.changeState).not.toHaveBeenCalled();
  });
});

describe('DeadState', () => {
  let state: DeadState;

  beforeEach(() => {
    state = new DeadState();
  });

  it('has name "dead"', () => {
    expect(state.name).toBe('dead');
  });

  it('sets alive to false on enter', () => {
    const entity = createMockEntity({ alive: true });
    state.enter(entity);
    expect(entity.alive).toBe(false);
  });
});

describe('SavedState', () => {
  let state: SavedState;

  beforeEach(() => {
    state = new SavedState();
  });

  it('has name "saved"', () => {
    expect(state.name).toBe('saved');
  });

  it('sets saved to true and alive to false on enter', () => {
    const entity = createMockEntity({ alive: true, saved: false });
    state.enter(entity);
    expect(entity.saved).toBe(true);
    expect(entity.alive).toBe(false);
  });
});

describe('DiggerState', () => {
  let state: DiggerState;

  beforeEach(() => {
    state = new DiggerState();
    gameEventBus.clear();
  });

  it('has name "digger"', () => {
    expect(state.name).toBe('digger');
  });

  it('moves entity downward at reduced speed', () => {
    const entity = createMockEntity({ y: 200 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.y).toBeCloseTo(200 + LEMMING_SPEED * DIGGER_SPEED_MULT * dt, 5);
  });

  it('does not move entity horizontally', () => {
    const entity = createMockEntity({ x: 100 });
    state.update(entity, 0.016);
    expect(entity.x).toBe(100);
  });

  it('emits digger:dig event with position', () => {
    const entity = createMockEntity({ x: 100, y: 200, id: 5 });
    const handler = vi.fn();
    gameEventBus.on('digger:dig', handler);
    state.update(entity, 0.016);
    expect(handler).toHaveBeenCalledWith({
      id: 5,
      x: entity.x,
      y: entity.y,
    });
  });
});

describe('BasherState', () => {
  let state: BasherState;

  beforeEach(() => {
    state = new BasherState();
    gameEventBus.clear();
  });

  it('has name "basher"', () => {
    expect(state.name).toBe('basher');
  });

  it('moves entity horizontally in its direction at reduced speed', () => {
    const entity = createMockEntity({ x: 100, direction: 1 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(100 + LEMMING_SPEED * BASHER_SPEED_MULT * dt, 5);
  });

  it('moves left when direction is -1', () => {
    const entity = createMockEntity({ x: 100, direction: -1 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(100 - LEMMING_SPEED * BASHER_SPEED_MULT * dt, 5);
  });

  it('does not move entity vertically', () => {
    const entity = createMockEntity({ y: 200 });
    state.update(entity, 0.016);
    expect(entity.y).toBe(200);
  });

  it('emits basher:dig event with position and direction', () => {
    const entity = createMockEntity({ x: 100, y: 200, direction: -1, id: 3 });
    const handler = vi.fn();
    gameEventBus.on('basher:dig', handler);
    state.update(entity, 0.016);
    expect(handler).toHaveBeenCalledWith({
      id: 3,
      x: entity.x,
      y: entity.y,
      direction: -1,
    });
  });
});

describe('MinerState', () => {
  let state: MinerState;

  beforeEach(() => {
    state = new MinerState();
    gameEventBus.clear();
  });

  it('has name "miner"', () => {
    expect(state.name).toBe('miner');
  });

  it('moves entity diagonally: forward and down', () => {
    const entity = createMockEntity({ x: 100, y: 200, direction: 1 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(100 + LEMMING_SPEED * MINER_SPEED_MULT_X * dt, 5);
    expect(entity.y).toBeCloseTo(200 + LEMMING_SPEED * MINER_SPEED_MULT_Y * dt, 5);
  });

  it('moves left-downward when direction is -1', () => {
    const entity = createMockEntity({ x: 100, y: 200, direction: -1 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.x).toBeCloseTo(100 - LEMMING_SPEED * MINER_SPEED_MULT_X * dt, 5);
    expect(entity.y).toBeCloseTo(200 + LEMMING_SPEED * MINER_SPEED_MULT_Y * dt, 5);
  });

  it('emits miner:dig event', () => {
    const entity = createMockEntity({ id: 7 });
    const handler = vi.fn();
    gameEventBus.on('miner:dig', handler);
    state.update(entity, 0.016);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, direction: entity.direction }),
    );
  });
});

describe('BuilderState', () => {
  let state: BuilderState;

  beforeEach(() => {
    state = new BuilderState();
    gameEventBus.clear();
  });

  it('has name "builder"', () => {
    expect(state.name).toBe('builder');
  });

  it('resets step count and elapsed on enter', () => {
    const entity = createMockEntity();
    state.enter(entity);
    expect(state.getStepCount()).toBe(0);
  });

  it('does not build a step before the interval elapses', () => {
    const entity = createMockEntity({ x: 100, y: 200 });
    state.enter(entity);
    state.update(entity, BUILDER_STEP_INTERVAL * 0.5);
    expect(state.getStepCount()).toBe(0);
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(200);
  });

  it('builds a step after the interval elapses', () => {
    const entity = createMockEntity({ x: 100, y: 200, direction: 1 });
    state.enter(entity);
    state.update(entity, BUILDER_STEP_INTERVAL);
    expect(state.getStepCount()).toBe(1);
    expect(entity.x).toBe(100 + BUILDER_STEP_WIDTH);
    expect(entity.y).toBe(200 - BUILDER_STEP_HEIGHT);
  });

  it('emits builder:build event when building a step', () => {
    const entity = createMockEntity({ id: 2, direction: 1 });
    const handler = vi.fn();
    gameEventBus.on('builder:build', handler);
    state.enter(entity);
    state.update(entity, BUILDER_STEP_INTERVAL);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('transitions to walker after max steps', () => {
    const entity = createMockEntity({ x: 0, y: 400, direction: 1 });
    state.enter(entity);

    for (let i = 0; i < BUILDER_MAX_STEPS; i++) {
      state.update(entity, BUILDER_STEP_INTERVAL);
    }

    expect(entity.changeState).toHaveBeenCalledWith('walker');
    expect(state.getStepCount()).toBe(BUILDER_MAX_STEPS);
  });

  it('moves entity in correct direction and height over multiple steps', () => {
    const entity = createMockEntity({ x: 100, y: 300, direction: -1 });
    state.enter(entity);

    state.update(entity, BUILDER_STEP_INTERVAL);
    expect(entity.x).toBe(100 - BUILDER_STEP_WIDTH);
    expect(entity.y).toBe(300 - BUILDER_STEP_HEIGHT);

    state.update(entity, BUILDER_STEP_INTERVAL);
    expect(entity.x).toBe(100 - BUILDER_STEP_WIDTH * 2);
    expect(entity.y).toBe(300 - BUILDER_STEP_HEIGHT * 2);
  });

  it('resets state on exit', () => {
    const entity = createMockEntity();
    state.enter(entity);
    state.update(entity, BUILDER_STEP_INTERVAL);
    expect(state.getStepCount()).toBe(1);
    state.exit(entity);
    expect(state.getStepCount()).toBe(0);
  });
});

describe('BlockerState', () => {
  let state: BlockerState;

  beforeEach(() => {
    state = new BlockerState();
  });

  it('has name "blocker"', () => {
    expect(state.name).toBe('blocker');
  });

  it('does not move the entity', () => {
    const entity = createMockEntity({ x: 100, y: 200 });
    state.update(entity, 0.016);
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(200);
  });

  it('does not change entity direction', () => {
    const entity = createMockEntity({ direction: 1 });
    state.update(entity, 0.5);
    expect(entity.direction).toBe(1);
  });
});

describe('ClimberState', () => {
  let state: ClimberState;

  beforeEach(() => {
    state = new ClimberState();
  });

  it('has name "climber"', () => {
    expect(state.name).toBe('climber');
  });

  it('moves entity upward at reduced speed', () => {
    const entity = createMockEntity({ y: 200 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.y).toBeCloseTo(200 - LEMMING_SPEED * CLIMBER_SPEED_MULT * dt, 5);
  });

  it('does not move entity horizontally', () => {
    const entity = createMockEntity({ x: 100 });
    state.update(entity, 0.016);
    expect(entity.x).toBe(100);
  });
});

describe('FloaterState', () => {
  let state: FloaterState;

  beforeEach(() => {
    state = new FloaterState();
  });

  it('has name "floater"', () => {
    expect(state.name).toBe('floater');
  });

  it('resets fallDistance on enter for safe landing', () => {
    const entity = createMockEntity({ fallDistance: 100 });
    state.enter(entity);
    expect(entity.fallDistance).toBe(0);
  });

  it('falls at reduced gravity speed', () => {
    const entity = createMockEntity({ y: 200 });
    const dt = 0.016;
    state.update(entity, dt);
    expect(entity.y).toBeCloseTo(200 + GRAVITY * FLOATER_GRAVITY_MULT * dt, 5);
  });

  it('does NOT accumulate fallDistance during update', () => {
    const entity = createMockEntity({ fallDistance: 0 });
    state.enter(entity);
    state.update(entity, 0.016);
    state.update(entity, 0.016);
    state.update(entity, 0.016);
    expect(entity.fallDistance).toBe(0);
  });

  it('falls slower than a regular faller', () => {
    const floaterEntity = createMockEntity({ y: 200 });
    const fallerEntity = createMockEntity({ y: 200 });

    const faller = new FallerState();
    const dt = 0.016;

    state.enter(floaterEntity);
    state.update(floaterEntity, dt);
    faller.update(fallerEntity, dt);

    // Floater should have moved less distance downward
    expect(floaterEntity.y - 200).toBeLessThan(fallerEntity.y - 200);
  });
});

describe('BomberState', () => {
  let state: BomberState;

  beforeEach(() => {
    state = new BomberState();
    gameEventBus.clear();
  });

  it('has name "bomber"', () => {
    expect(state.name).toBe('bomber');
  });

  it('initializes countdown on enter', () => {
    const entity = createMockEntity();
    state.enter(entity);
    expect(state.getCountdown()).toBe(BOMBER_COUNTDOWN);
  });

  it('decreases countdown over time', () => {
    const entity = createMockEntity();
    state.enter(entity);
    state.update(entity, 1);
    expect(state.getCountdown()).toBeCloseTo(BOMBER_COUNTDOWN - 1, 5);
  });

  it('does not explode before countdown reaches zero', () => {
    const entity = createMockEntity();
    state.enter(entity);
    state.update(entity, BOMBER_COUNTDOWN - 0.1);
    expect(entity.changeState).not.toHaveBeenCalled();
  });

  it('emits bomber:explode and transitions to dead when countdown reaches zero', () => {
    const entity = createMockEntity({ id: 9, x: 150, y: 250 });
    const handler = vi.fn();
    gameEventBus.on('bomber:explode', handler);

    state.enter(entity);
    state.update(entity, BOMBER_COUNTDOWN);

    expect(handler).toHaveBeenCalledWith({
      id: 9,
      x: 150,
      y: 250,
    });
    expect(entity.changeState).toHaveBeenCalledWith('dead');
  });

  it('explodes even if countdown overshoots zero', () => {
    const entity = createMockEntity({ id: 4 });
    const handler = vi.fn();
    gameEventBus.on('bomber:explode', handler);

    state.enter(entity);
    state.update(entity, BOMBER_COUNTDOWN + 5);

    expect(handler).toHaveBeenCalledOnce();
    expect(entity.changeState).toHaveBeenCalledWith('dead');
  });

  it('resets countdown on exit', () => {
    const entity = createMockEntity();
    state.enter(entity);
    state.update(entity, 1);
    state.exit(entity);
    expect(state.getCountdown()).toBe(BOMBER_COUNTDOWN);
  });
});
