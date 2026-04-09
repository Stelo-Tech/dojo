import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
} from '@/utils/Constants';

/**
 * TerrainSystem uses Phaser.GameObjects.RenderTexture, Rectangle and a Phaser
 * Scene to build its visual layer.  We create a minimal mock that records calls
 * so we can assert on grid-level behaviour without a real renderer.
 */

function createMockRectangle(opts: {
  fillRectFn?: ReturnType<typeof vi.fn>;
} = {}) {
  const fillRectFn = opts.fillRectFn ?? vi.fn();
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    _fillRect: fillRectFn,
  };
}

function createMockRenderTexture() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    draw: vi.fn(),
    erase: vi.fn(),
    destroy: vi.fn(),
  };
}

function createMockScene() {
  const rt = createMockRenderTexture();
  const fillPixel = createMockRectangle();
  const eraseStamp = createMockRectangle();

  let rectangleCallCount = 0;
  const rectangle = vi.fn().mockImplementation(() => {
    rectangleCallCount++;
    // First call is the RenderTexture-drawn fill pixel, second is the erase stamp
    return rectangleCallCount === 1 ? fillPixel : eraseStamp;
  });

  const renderTexture = vi.fn().mockReturnValue(rt);

  return {
    add: {
      renderTexture,
      rectangle,
    },
    _rt: rt,
    _fillPixel: fillPixel,
    _eraseStamp: eraseStamp,
  };
}

describe('TerrainSystem — grid operations', () => {
  let scene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    scene = createMockScene();
  });

  async function buildSystem() {
    const { TerrainSystem } = await import('@/systems/TerrainSystem');
    return new TerrainSystem(scene as never);
  }

  // -------------------------------------------------------------------------
  // isGround
  // -------------------------------------------------------------------------

  it('isGround returns false for coordinates above the terrain band', async () => {
    const ts = await buildSystem();
    // TERRAIN_Y is where ground starts; anything above it should be empty
    expect(ts.isGround(100, TERRAIN_Y - 10)).toBe(false);
  });

  it('isGround returns true inside the initial terrain band', async () => {
    const ts = await buildSystem();
    // The constructor fills [TERRAIN_Y, TERRAIN_Y + TERRAIN_HEIGHT) with 1
    expect(ts.isGround(100, TERRAIN_Y)).toBe(true);
    expect(ts.isGround(100, TERRAIN_Y + TERRAIN_HEIGHT - 1)).toBe(true);
  });

  it('isGround returns false for out-of-bounds world coordinates', async () => {
    const ts = await buildSystem();
    expect(ts.isGround(-10, TERRAIN_Y)).toBe(false);
    expect(ts.isGround(GAME_WIDTH + 10, TERRAIN_Y)).toBe(false);
    expect(ts.isGround(100, GAME_HEIGHT + 100)).toBe(false);
  });

  it('isGround returns false for cells outside the terrain origin height', async () => {
    const ts = await buildSystem();
    // y = 0 is above the terrain origin (TERRAIN_ORIGIN_Y = 300 internally)
    expect(ts.isGround(100, 0)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // isWall
  // -------------------------------------------------------------------------

  it('isWall delegates to isGround (returns true for solid terrain)', async () => {
    const ts = await buildSystem();
    expect(ts.isWall(100, TERRAIN_Y)).toBe(true);
  });

  it('isWall returns false for empty air', async () => {
    const ts = await buildSystem();
    expect(ts.isWall(100, TERRAIN_Y - 50)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // digColumn / eraseRect
  // -------------------------------------------------------------------------

  it('digColumn removes terrain in the specified column area', async () => {
    const ts = await buildSystem();

    // Verify ground exists before dig
    expect(ts.isGround(100, TERRAIN_Y)).toBe(true);

    ts.digColumn(96, TERRAIN_Y, 8, 20);

    // Center of the dug area should now be empty
    expect(ts.isGround(100, TERRAIN_Y)).toBe(false);
  });

  it('eraseRect triggers visual erase on the render texture', async () => {
    const ts = await buildSystem();
    ts.eraseRect(100, TERRAIN_Y, 20, 10);
    expect(scene._rt.erase).toHaveBeenCalled();
  });

  it('eraseRect clears the grid inside the area', async () => {
    const ts = await buildSystem();

    ts.eraseRect(100, TERRAIN_Y, 20, 20);
    expect(ts.isGround(110, TERRAIN_Y + 5)).toBe(false);
  });

  it('eraseRect does not affect grid outside the erased bounds', async () => {
    const ts = await buildSystem();

    ts.eraseRect(100, TERRAIN_Y, 10, 10);
    // Far from erased area
    expect(ts.isGround(500, TERRAIN_Y)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // digHorizontal
  // -------------------------------------------------------------------------

  it('digHorizontal removes horizontal strip from terrain', async () => {
    const ts = await buildSystem();

    expect(ts.isGround(200, TERRAIN_Y)).toBe(true);
    ts.digHorizontal(196, TERRAIN_Y, 10, 6);
    expect(ts.isGround(200, TERRAIN_Y)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // buildStep / fillRect
  // -------------------------------------------------------------------------

  it('buildStep adds terrain in the specified area', async () => {
    const ts = await buildSystem();

    // First erase a patch so we have an empty spot to fill
    ts.eraseRect(200, TERRAIN_Y - 20, 20, 20);
    expect(ts.isGround(210, TERRAIN_Y - 15)).toBe(false);

    ts.buildStep(200, TERRAIN_Y - 20, 20, 10);
    expect(ts.isGround(210, TERRAIN_Y - 15)).toBe(true);
  });

  it('buildStep triggers a draw call on the render texture', async () => {
    const ts = await buildSystem();
    ts.buildStep(200, TERRAIN_Y, 10, 4);
    expect(scene._rt.draw).toHaveBeenCalled();
  });

  it('fillRect fills the grid and triggers a draw call', async () => {
    const ts = await buildSystem();
    ts.eraseRect(300, TERRAIN_Y, 20, 10);
    ts.fillRect(300, TERRAIN_Y, 20, 10);
    expect(ts.isGround(310, TERRAIN_Y + 3)).toBe(true);
    expect(scene._rt.draw).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Grid synchronization
  // -------------------------------------------------------------------------

  it('grid stays consistent: erase then build restores the cell', async () => {
    const ts = await buildSystem();

    ts.eraseRect(400, TERRAIN_Y, 10, 10);
    expect(ts.isGround(404, TERRAIN_Y + 4)).toBe(false);

    ts.buildStep(400, TERRAIN_Y, 10, 10);
    expect(ts.isGround(404, TERRAIN_Y + 4)).toBe(true);
  });

  it('multiple erases do not leave stale grid bits', async () => {
    const ts = await buildSystem();

    ts.eraseRect(100, TERRAIN_Y, 40, 10);
    ts.eraseRect(110, TERRAIN_Y, 20, 10);

    // The whole union is empty
    expect(ts.isGround(115, TERRAIN_Y + 2)).toBe(false);
    expect(ts.isGround(125, TERRAIN_Y + 2)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // getTerrainTopY
  // -------------------------------------------------------------------------

  it('getTerrainTopY returns the internal origin Y (300)', async () => {
    const ts = await buildSystem();
    // The private TERRAIN_ORIGIN_Y constant is 300
    expect(ts.getTerrainTopY()).toBe(300);
  });

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------

  it('destroy() calls destroy on the render texture and rectangles', async () => {
    const ts = await buildSystem();
    ts.destroy();
    expect(scene._rt.destroy).toHaveBeenCalled();
  });
});
