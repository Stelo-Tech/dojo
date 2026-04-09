import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TERRAIN_Y,
  TERRAIN_HEIGHT,
  TERRAIN_COLOR,
} from '@/utils/Constants';

const TERRAIN_ORIGIN_Y = 300;
const FULL_TERRAIN_HEIGHT = GAME_HEIGHT - TERRAIN_ORIGIN_Y;

export class TerrainSystem {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly fillPixel: Phaser.GameObjects.Rectangle;
  private readonly eraseStamp: Phaser.GameObjects.Rectangle;
  private readonly grid: Uint8Array;
  private readonly originX: number;
  private readonly originY: number;
  private readonly terrainWidth: number;
  private readonly terrainHeight: number;

  constructor(scene: Phaser.Scene) {
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

    const groundLocalY = TERRAIN_Y - TERRAIN_ORIGIN_Y;
    this.setGridRect(0, groundLocalY, GAME_WIDTH, TERRAIN_HEIGHT, 1);

    this.fillPixel = scene.add.rectangle(0, 0, 1, 1, TERRAIN_COLOR);
    this.fillPixel.setOrigin(0, 0);
    this.fillPixel.setVisible(false);

    this.eraseStamp = scene.add.rectangle(0, 0, 1, 1, 0xffffff);
    this.eraseStamp.setOrigin(0, 0);
    this.eraseStamp.setVisible(false);

    this.fillPixel.setDisplaySize(GAME_WIDTH, TERRAIN_HEIGHT);
    this.fillPixel.setVisible(true);
    this.rt.draw(this.fillPixel, 0, groundLocalY);
    this.fillPixel.setVisible(false);
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

  fillRect(worldX: number, worldY: number, width: number, height: number, color?: number): void {
    const localX = Math.floor(worldX - this.originX);
    const localY = Math.floor(worldY - this.originY);
    this.setGridRect(localX, localY, Math.ceil(width), Math.ceil(height), 1);
    const useColor = color !== undefined ? color : TERRAIN_COLOR;
    this.fillPixel.setFillStyle(useColor);
    this.fillPixel.setPosition(0, 0);
    this.fillPixel.setDisplaySize(width, height);
    this.fillPixel.setVisible(true);
    this.rt.draw(this.fillPixel, localX, localY);
    this.fillPixel.setVisible(false);
    this.fillPixel.setFillStyle(TERRAIN_COLOR);
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
