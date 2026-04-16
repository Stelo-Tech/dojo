import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameEventBus } from '@/utils/EventBus';

/**
 * Since Lemming depends on Phaser (scene.add.rectangle, scene.add.triangle),
 * we test the FSM and state registration logic by mocking the Phaser Scene.
 * This allows unit testing without a full Phaser runtime.
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

function createMockScene(): { add: { rectangle: ReturnType<typeof vi.fn>; triangle: ReturnType<typeof vi.fn> } } {
  return {
    add: {
      rectangle: vi.fn().mockReturnValue(createMockRectangle()),
      triangle: vi.fn().mockReturnValue(createMockTriangle()),
    },
  };
}

// Dynamic import to avoid module-level Phaser dependency issues
async function createLemming(scene: unknown, id: number) {
  const { Lemming } = await import('@/entities/Lemming');
  // Phaser Scene type is expected by constructor; we pass our mock
  // which satisfies the runtime interface used
  return new Lemming(scene as ConstructorParameters<typeof Lemming>[0], id);
}

describe('Lemming FSM', () => {
  let scene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    scene = createMockScene();
    gameEventBus.clear();
  });

  it('creates a lemming with the given id', async () => {
    const lemming = await createLemming(scene, 42);
    expect(lemming.id).toBe(42);
  });

  it('starts in walker state after init', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    // init sets state to faller (lemmings spawn falling)
    expect(lemming.getStateName()).toBe('faller');
  });

  it('can change to walker state', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    lemming.changeState('walker');
    expect(lemming.getStateName()).toBe('walker');
  });

  it('can change to all classic skill states', async () => {
    const skillStates = [
      'digger', 'basher', 'miner', 'builder',
      'blocker', 'climber', 'floater', 'bomber',
    ];

    for (const stateName of skillStates) {
      const lemming = await createLemming(scene, 1);
      lemming.init(100, 200);
      lemming.changeState(stateName);
      expect(lemming.getStateName()).toBe(stateName);
    }
  });

  it('does not change to an unknown state', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    lemming.changeState('walker');
    lemming.changeState('nonexistent');
    expect(lemming.getStateName()).toBe('walker');
  });

  it('does not change to the same state', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    lemming.changeState('walker');
    const handler = vi.fn();
    gameEventBus.on('lemming:stateChanged', handler);
    lemming.changeState('walker');
    expect(handler).not.toHaveBeenCalled();
  });

  it('emits lemming:stateChanged event on state change', async () => {
    const lemming = await createLemming(scene, 5);
    lemming.init(100, 200);
    const handler = vi.fn();
    gameEventBus.on('lemming:stateChanged', handler);
    lemming.changeState('walker');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        from: 'faller',
        to: 'walker',
      }),
    );
  });

  it('supports isClimber and isFloater persistent traits', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    expect(lemming.isClimber).toBeUndefined();
    expect(lemming.isFloater).toBeUndefined();

    lemming.isClimber = true;
    lemming.isFloater = true;
    expect(lemming.isClimber).toBe(true);
    expect(lemming.isFloater).toBe(true);
  });

  it('resets persistent traits on init', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    lemming.isClimber = true;
    lemming.isFloater = true;

    lemming.init(50, 50);
    expect(lemming.isClimber).toBeUndefined();
    expect(lemming.isFloater).toBeUndefined();
  });

  it('deactivates a lemming', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    expect(lemming.alive).toBe(true);

    lemming.deactivate();
    expect(lemming.alive).toBe(false);
  });

  it('does not update when not alive', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    lemming.changeState('walker');
    lemming.deactivate();

    const xBefore = lemming.x;
    lemming.update(0.016);
    expect(lemming.x).toBe(xBefore);
  });

  it('returns correct bounds', async () => {
    const lemming = await createLemming(scene, 1);
    lemming.init(100, 200);
    const bounds = lemming.getBounds();
    expect(bounds.x).toBe(100 - 6); // LEMMING_WIDTH / 2
    expect(bounds.y).toBe(200 - 18); // LEMMING_HEIGHT
    expect(bounds.width).toBe(12);
    expect(bounds.height).toBe(18);
  });
});
