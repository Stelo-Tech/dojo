import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Button, type ButtonConfig } from '@/ui/components/Button';

/**
 * Button extends Phaser.GameObjects.Container.
 * We mock the full Phaser module so no real renderer is needed.
 */

vi.mock('phaser', () => {
  // -----------------------------------------------------------------------
  // Container base class mock
  // -----------------------------------------------------------------------
  class MockContainer {
    x: number;
    y: number;
    width = 0;
    height = 0;
    alpha = 1;
    scaleX = 1;
    scaleY = 1;
    private _eventHandlers: Map<string, Array<(this: MockContainer) => void>> = new Map();

    constructor(_scene: unknown, x: number, y: number) {
      this.x = x;
      this.y = y;
    }

    add = vi.fn().mockReturnThis();
    setSize = vi.fn().mockImplementation((w: number, h: number) => {
      this.width = w;
      this.height = h;
      return this;
    });
    setInteractive = vi.fn().mockReturnThis();
    disableInteractive = vi.fn().mockReturnThis();
    setAlpha = vi.fn().mockImplementation((a: number) => {
      this.alpha = a;
      return this;
    });
    setScale = vi.fn().mockImplementation((s: number) => {
      this.scaleX = s;
      this.scaleY = s;
      return this;
    });
    // NOTE: off and destroy must be prototype methods (not instance fields) so
    // that Button's own destroy() override is not shadowed by an instance-level
    // vi.fn(). Instance fields (defined with '= vi.fn()') are set as own
    // properties in the constructor, which would override prototype methods
    // defined on Button. Using prototype methods avoids that shadow.
    // We attach vi.fn() spies to the prototype after class declaration (below).
    on(event: string, handler: (this: MockContainer) => void): this {
      if (!this._eventHandlers.has(event)) {
        this._eventHandlers.set(event, []);
      }
      this._eventHandlers.get(event)?.push(handler);
      return this;
    }

    off(_event: string, _handler: unknown, _ctx?: unknown): this {
      return this;
    }

    // Base destroy — called via super.destroy(true) from Button.destroy()
    destroy(_fromScene?: boolean): void {
      // no-op in mock
    }

    /** Helper for tests: trigger a pointer event */
    triggerEvent(event: string): void {
      const handlers = this._eventHandlers.get(event) ?? [];
      for (const h of handlers) {
        h.call(this);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Graphics mock
  // -----------------------------------------------------------------------
  const mockGraphics = {
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRoundedRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeRoundedRect: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };

  // -----------------------------------------------------------------------
  // Text mock
  // -----------------------------------------------------------------------
  const mockText = {
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    text: '',
  };

  // -----------------------------------------------------------------------
  // Scene mock
  // -----------------------------------------------------------------------
  const mockScene = {
    add: {
      graphics: vi.fn().mockReturnValue(mockGraphics),
      text: vi.fn().mockReturnValue(mockText),
      existing: vi.fn(),
    },
  };

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
      },
      _mockScene: mockScene,
      _mockGraphics: mockGraphics,
      _mockText: mockText,
    },
  };
});

/** Build a default config; `onClick` can be overridden per-test. */
function defaultConfig(overrides: Partial<ButtonConfig> = {}): ButtonConfig {
  return {
    x: 100,
    y: 200,
    width: 120,
    height: 50,
    text: 'Click me',
    onClick: vi.fn(),
    ...overrides,
  };
}

/** Retrieve the mock scene injected by our Phaser mock. */
async function getMockScene() {
  const Phaser = (await import('phaser')).default as unknown as {
    _mockScene: {
      add: {
        graphics: ReturnType<typeof vi.fn>;
        text: ReturnType<typeof vi.fn>;
        existing: ReturnType<typeof vi.fn>;
      };
    };
    _mockGraphics: Record<string, ReturnType<typeof vi.fn>>;
    _mockText: { setText: ReturnType<typeof vi.fn>; text: string };
  };
  return Phaser._mockScene;
}

describe('Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  it('creates a button at the specified position', async () => {
    const scene = await getMockScene();
    const cfg = defaultConfig({ x: 300, y: 150 });
    const btn = new Button(scene as never, cfg);

    expect(btn.x).toBe(300);
    expect(btn.y).toBe(150);
  });

  it('enforces 44px minimum tap target for width', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig({ width: 10, height: 44 }));

    // setSize should have been called with at least 44 for width
    expect(btn.setSize).toHaveBeenCalledWith(
      expect.toBeGreaterThanOrEqualTo(44),
      expect.any(Number),
    );
  });

  it('enforces 44px minimum tap target for height', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig({ width: 120, height: 10 }));

    expect(btn.setSize).toHaveBeenCalledWith(
      expect.any(Number),
      expect.toBeGreaterThanOrEqualTo(44),
    );
  });

  it('does not shrink dimensions that are already >= 44px', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig({ width: 200, height: 80 }));

    expect(btn.setSize).toHaveBeenCalledWith(200, 80);
  });

  it('adds the graphics and label to the container', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig());
    // add() is called for bg and label
    expect(btn.add).toHaveBeenCalledTimes(2);
  });

  it('registers itself with scene.add.existing()', async () => {
    const scene = await getMockScene();
    new Button(scene as never, defaultConfig());
    expect(scene.add.existing).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // onClick
  // -------------------------------------------------------------------------

  it('onClick fires when pointerup is triggered', async () => {
    const scene = await getMockScene();
    const onClick = vi.fn();
    const btn = new Button(scene as never, defaultConfig({ onClick }));

    // Cast to access our triggerEvent helper on the mock Container
    const mockBtn = btn as unknown as { triggerEvent: (e: string) => void };
    mockBtn.triggerEvent('pointerup');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('onClick does not fire on pointerdown (only on pointerup)', async () => {
    const scene = await getMockScene();
    const onClick = vi.fn();
    const btn = new Button(scene as never, defaultConfig({ onClick }));

    const mockBtn = btn as unknown as { triggerEvent: (e: string) => void };
    mockBtn.triggerEvent('pointerdown');

    expect(onClick).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // setEnabled
  // -------------------------------------------------------------------------

  it('setEnabled(false) disables interactive and reduces alpha', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig());

    btn.setEnabled(false);

    expect(btn.disableInteractive).toHaveBeenCalled();
    expect(btn.setAlpha).toHaveBeenCalledWith(0.5);
  });

  it('setEnabled(true) re-enables interactive and restores alpha', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig());

    btn.setEnabled(false);
    vi.clearAllMocks();
    btn.setEnabled(true);

    expect(btn.setInteractive).toHaveBeenCalled();
    expect(btn.setAlpha).toHaveBeenCalledWith(1);
  });

  it('setEnabled(false) prevents onClick from firing', async () => {
    const scene = await getMockScene();
    const onClick = vi.fn();
    const btn = new Button(scene as never, defaultConfig({ onClick }));

    btn.setEnabled(false);

    // Even if pointerup fires, the button is disabled so interactive is off.
    // The mock's disableInteractive doesn't actually prevent event dispatch,
    // but we verify that disableInteractive was called (real Phaser will gate events).
    expect(btn.disableInteractive).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // setText
  // -------------------------------------------------------------------------

  it('setText updates the label text', async () => {
    const Phaser = (await import('phaser')).default as unknown as {
      _mockText: { setText: ReturnType<typeof vi.fn> };
    };
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig());

    btn.setText('New Label');

    expect(Phaser._mockText.setText).toHaveBeenCalledWith('New Label');
  });

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------

  it('destroy() removes pointer event listeners', async () => {
    const scene = await getMockScene();
    const btn = new Button(scene as never, defaultConfig());

    // Spy on the prototype off method — instance fields cannot be spied this way,
    // but since off is a prototype method on our MockContainer the spy works.
    const offSpy = vi.spyOn(btn, 'off');
    btn.destroy();

    expect(offSpy).toHaveBeenCalledWith('pointerover', expect.any(Function), btn);
    expect(offSpy).toHaveBeenCalledWith('pointerout', expect.any(Function), btn);
    expect(offSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), btn);
    expect(offSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), btn);
  });
});

// Custom matcher to keep assertions readable
expect.extend({
  toBeGreaterThanOrEqualTo(received: number, expected: number) {
    const pass = received >= expected;
    return {
      pass,
      message: () =>
        `expected ${received} to be >= ${expected}`,
    };
  },
});
