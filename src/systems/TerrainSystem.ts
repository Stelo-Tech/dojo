import Phaser from 'phaser';
import {
  GAME_WIDTH,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  TERRAIN_COLOR,
} from '@/utils/Constants';

/**
 * TerrainSystem -- pixel-perfect destructible terrain.
 *
 * Uses a Phaser RenderTexture for visuals and a parallel Uint8Array grid
 * for fast synchronous collision queries. Both are kept in sync on every
 * dig/build operation.
 *
 * `isGround(x, y)` checks the collision grid (O(1), no allocation).
 */
export class TerrainSystem {
  private readonly rt: Phaser.GameObjects.RenderTexture;

  private readonly fillPixel: Phaser.GameObjects.Rectangle;
  private readonly eraseStamp: Phaser.GameObjects.Rectangle;

  /** Collision grid: 1 = solid, 0 = empty. Row-major, width * height. */
  private readonly grid: Uint8Array;

  private readonly originX: number;
  private readonly originY: number;
  private readonly terrainWidth: number;
  private readonly terrainHeight: number;

  constructor(scene: Phaser.Scene) {
    this.originX = 0;
    this.originY = TERRAIN_Y;
    this.terrainWidth = GAME_WIDTH;
    this.terrainHeight = TERRAIN_HEIGHT;

    this.grid = new Uint8Array(this.terrainWidth * this.terrainHeight);
    this.grid.fill(1);

    this.rt = scene.add.renderTexture(
      this.originX,
      this.originY,
      this.terrainWidth,
      this.terrainHeight,
    );
    this.rt.setOrigin(0, 0);

    this.rt.fill(
      (TERRAIN_COLOR >> 16) & 0xff,
      (TERRAIN_COLOR >> 8) & 0xff,
      TERRAIN_COLOR & 0xff,
    );

    this.fillPixel = scene.add.rectangle(0, 0, 1, 1, TERRAIN_COLOR);
    this.fillPixel.setOrigin(0, 0);
    this.fillPixel.setVisible(false);

    this.eraseStamp = scene.add.rectangle(0, 0, 1, 1, 0xffffff);
    this.eraseStamp.setOrigin(0, 0);
    this.eraseStamp.setVisible(false);
  }

  isGround(worldX: number, worldY: number): boolean {
    const localX = Math.floor(worldX - this.originX);
    const localY = Math.floor(worldY - this.originY);

    if (
      localX < 0 ||
      localX >= this.terrainWidth ||
      localY < 0 ||
      localY >= this.terrainHeight
    ) {
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

    this.setGridRect(localX, localY, Math.ceil(width), Math.ceil(height), 1);

    this.fillPixel.setPosition(0, 0);
    this.fillPixel.setDisplaySize(width, height);
    this.fillPixel.setVisible(true);
    this.rt.draw(this.fillPixel, localX, localY);
    this.fillPixel.setVisible(false);
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
