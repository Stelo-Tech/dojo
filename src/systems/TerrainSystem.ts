import Phaser from 'phaser';
import {
  GAME_WIDTH,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  TERRAIN_COLOR,
  TERRAIN_SURFACE_COLOR,
  TERRAIN_HIGHLIGHT_COLOR,
  TERRAIN_DEEP_COLOR,
  HUD_BAR_Y,
} from '@/utils/Constants';

const TERRAIN_ORIGIN_Y = 250;
const FULL_TERRAIN_HEIGHT = HUD_BAR_Y - TERRAIN_ORIGIN_Y;

// Bayer 4x4 threshold matrix (values 0–15, normalised to 0–1 in use)
const BAYER4: readonly number[] = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];

export class TerrainSystem {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly fillPixel: Phaser.GameObjects.Rectangle;
  private readonly eraseStamp: Phaser.GameObjects.Rectangle;
  private readonly grid: Uint8Array;
  private readonly originX: number;
  private readonly originY: number;
  private readonly terrainWidth: number;
  private readonly terrainHeight: number;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.originX = 0;
    this.originY = TERRAIN_ORIGIN_Y;
    this.terrainWidth = GAME_WIDTH;
    this.terrainHeight = FULL_TERRAIN_HEIGHT;

    this.grid = new Uint8Array(this.terrainWidth * this.terrainHeight);
    this.grid.fill(0);

    this.rt = scene.add.renderTexture(
      this.originX,
      this.originY,
      this.terrainWidth,
      this.terrainHeight,
    );
    this.rt.setOrigin(0, 0);
    this.rt.setDepth(10);
    // Force bilinear filtering so Scale.FIT upscaling stays smooth
    this.rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const groundLocalY = TERRAIN_Y - TERRAIN_ORIGIN_Y;
    this.setGridRect(0, groundLocalY, GAME_WIDTH, TERRAIN_HEIGHT, 1);

    this.fillPixel = scene.add.rectangle(0, 0, 1, 1, TERRAIN_COLOR);
    this.fillPixel.setOrigin(0, 0);
    this.fillPixel.setVisible(false);

    this.eraseStamp = scene.add.rectangle(0, 0, 1, 1, 0xffffff);
    this.eraseStamp.setOrigin(0, 0);
    this.eraseStamp.setVisible(false);

    // Draw the initial ground with multi-layer terrain visuals
    this.drawTerrainLayers(0, groundLocalY, GAME_WIDTH, TERRAIN_HEIGHT);
  }

  /**
   * Draw a visually rich terrain block into the RenderTexture at local
   * coordinates (lx, ly). The block is composed of:
   *   - A 4px grass surface strip (TERRAIN_SURFACE_COLOR)
   *   - A 1px highlight line just below the grass (TERRAIN_HIGHLIGHT_COLOR)
   *   - The main dirt body with a subtle noise dither using TERRAIN_COLOR
   *   - A deep shadow band at the bottom (TERRAIN_DEEP_COLOR)
   *
   * A Bayer 4x4 ordered dithering pass is applied to the top 8px to blend
   * the grass into the dirt, giving a soft natural edge without shaders.
   */
  private drawTerrainLayers(lx: number, ly: number, w: number, h: number): void {
    const g = this.scene.add.graphics().setVisible(false);

    // --- Deep shadow band (bottom 20% of block, min 8px) ---
    const deepH = Math.max(8, Math.round(h * 0.2));
    g.fillStyle(TERRAIN_DEEP_COLOR, 1);
    g.fillRect(0, 0, w, deepH);
    this.rt.draw(g, lx, ly + h - deepH);
    g.clear();

    // --- Dirt body ---
    g.fillStyle(TERRAIN_COLOR, 1);
    g.fillRect(0, 0, w, h - deepH);
    this.rt.draw(g, lx, ly);
    g.clear();

    // --- Highlight line (1px, just below grass) ---
    g.fillStyle(TERRAIN_HIGHLIGHT_COLOR, 1);
    g.fillRect(0, 0, w, 1);
    this.rt.draw(g, lx, ly + 4);
    g.clear();

    // --- Grass surface strip (4px) ---
    g.fillStyle(TERRAIN_SURFACE_COLOR, 1);
    g.fillRect(0, 0, w, 4);
    this.rt.draw(g, lx, ly);
    g.clear();

    // --- Bayer dithering: blend grass→dirt over 8px below surface ---
    // For each pixel row 0..7 we only paint pixels where the normalised
    // Bayer threshold is above the blend factor, mixing SURFACE into DIRT.
    const ditherRows = Math.min(8, h - 4);
    for (let dy = 0; dy < ditherRows; dy++) {
      const blend = (dy + 1) / (ditherRows + 1); // 0 near top → 1 near bottom
      for (let dx = 0; dx < w; dx++) {
        const bayer = (BAYER4[((dy & 3) * 4) + (dx & 3)] ?? 0) / 15;
        if (bayer < blend) {
          // paint dirt color over this pixel
          g.fillStyle(TERRAIN_COLOR, 1);
          g.fillRect(dx, 0, 1, 1);
        }
      }
      if (dy < ditherRows - 1) {
        this.rt.draw(g, lx, ly + 4 + dy);
        g.clear();
      }
    }
    this.rt.draw(g, lx, ly + 4 + ditherRows - 1);
    g.clear();

    // --- Subtle horizontal scan-line noise in dirt body (every 3px row) ---
    g.fillStyle(TERRAIN_DEEP_COLOR, 0.18);
    for (let sy = 8; sy < h - deepH; sy += 3) {
      g.fillRect(0, sy, w, 1);
    }
    this.rt.draw(g, lx, ly);
    g.clear();

    g.destroy();
  }

  isGround(worldX: number, worldY: number): boolean {
    const localX = Math.floor(worldX - this.originX);
    const localY = Math.floor(worldY - this.originY);
    if (localX < 0 || localX >= this.terrainWidth || localY < 0 || localY >= this.terrainHeight) {
      return false;
    }
    const idx = localY * this.terrainWidth + localX;
    return this.grid[idx] === 1;
  }

  isWall(worldX: number, worldY: number): boolean {
    return this.isGround(worldX, worldY);
  }

  digColumn(worldX: number, worldY: number, width: number, height: number): void {
    this.eraseRect(worldX, worldY, width, height);
  }

  digHorizontal(worldX: number, worldY: number, width: number, height: number): void {
    this.eraseRect(worldX, worldY, width, height);
  }

  buildStep(worldX: number, worldY: number, width: number, height: number): void {
    const localX = Math.floor(worldX - this.originX);
    const localY = Math.floor(worldY - this.originY);
    const w = Math.ceil(width);
    const h = Math.ceil(height);
    this.setGridRect(localX, localY, w, h, 1);
    if (w >= 8 && h >= 8) {
      // Large enough for multi-layer terrain visuals
      this.drawTerrainLayers(localX, localY, w, h);
    } else {
      // Small pieces (ramp slices, thin steps) — draw flat to avoid visual artifacts
      this.fillPixel.setFillStyle(TERRAIN_COLOR);
      this.fillPixel.setPosition(0, 0);
      this.fillPixel.setDisplaySize(w, h);
      this.fillPixel.setVisible(true);
      this.rt.draw(this.fillPixel, localX, localY);
      // Add 1px grass cap on top if height >= 3
      if (h >= 3) {
        this.fillPixel.setFillStyle(TERRAIN_SURFACE_COLOR);
        this.fillPixel.setDisplaySize(w, 1);
        this.rt.draw(this.fillPixel, localX, localY);
      }
      this.fillPixel.setVisible(false);
      this.fillPixel.setFillStyle(TERRAIN_COLOR);
    }
  }

  eraseRect(worldX: number, worldY: number, width: number, height: number): void {
    const localX = Math.floor(worldX - this.originX);
    const localY = Math.floor(worldY - this.originY);
    this.setGridRect(localX, localY, Math.ceil(width), Math.ceil(height), 0);
    this.eraseStamp.setPosition(0, 0);
    this.eraseStamp.setDisplaySize(width, height);
    this.eraseStamp.setVisible(true);
    this.rt.erase(this.eraseStamp, localX, localY);
    this.eraseStamp.setVisible(false);
  }

  fillRect(worldX: number, worldY: number, width: number, height: number, color?: number): void {
    const localX = Math.floor(worldX - this.originX);
    const localY = Math.floor(worldY - this.originY);
    this.setGridRect(localX, localY, Math.ceil(width), Math.ceil(height), 1);
    if (color !== undefined) {
      // Caller specified an explicit override color — draw flat (walls, etc.)
      this.fillPixel.setFillStyle(color);
      this.fillPixel.setPosition(0, 0);
      this.fillPixel.setDisplaySize(width, height);
      this.fillPixel.setVisible(true);
      this.rt.draw(this.fillPixel, localX, localY);
      this.fillPixel.setVisible(false);
      this.fillPixel.setFillStyle(TERRAIN_COLOR);
    } else {
      // Natural terrain — use multi-layer visuals
      this.drawTerrainLayers(localX, localY, Math.ceil(width), Math.ceil(height));
    }
  }

  getTerrainTopY(): number {
    return this.originY;
  }

  destroy(): void {
    this.rt.destroy();
    this.fillPixel.destroy();
    this.eraseStamp.destroy();
  }

  private setGridRect(
    localX: number,
    localY: number,
    width: number,
    height: number,
    value: 0 | 1,
  ): void {
    const x0 = Math.max(0, localX);
    const y0 = Math.max(0, localY);
    const x1 = Math.min(this.terrainWidth, localX + width);
    const y1 = Math.min(this.terrainHeight, localY + height);
    for (let py = y0; py < y1; py++) {
      const rowOffset = py * this.terrainWidth;
      for (let px = x0; px < x1; px++) {
        this.grid[rowOffset + px] = value;
      }
    }
  }
}
