import Phaser from 'phaser';
import { HUD } from '@/ui/HUD';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  ToolType,
  TOOL_STAIR_STEPS,
  TOOL_STAIR_STEP_W,
  TOOL_STAIR_STEP_H,
  TOOL_DIG_WIDTH,
  TOOL_DIG_DEPTH,
  TOOL_WALL_WIDTH,
  TOOL_WALL_HEIGHT,
  TOOL_RAMP_LENGTH,
  TOOL_RAMP_HEIGHT,
  WALL_TERRAIN_COLOR,
  EXIT_X,
  EXIT_Y,
  EXIT_WIDTH,
  EXIT_HEIGHT,
  HUD_BAR_Y,
} from '@/utils/Constants';

export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly hud: HUD;
  private readonly terrain: TerrainSystem;
  private readonly flashPool: Phaser.GameObjects.Rectangle[] = [];
  private readonly onPointerDownBound: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPointerMoveBound: (pointer: Phaser.Input.Pointer) => void;

  /** Preview ghost graphics */
  private preview: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, hud: HUD, terrain: TerrainSystem) {
    this.scene = scene;
    this.hud = hud;
    this.terrain = terrain;

    for (let i = 0; i < 4; i++) {
      const flash = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0.6);
      flash.setOrigin(0.5, 0.5);
      flash.setVisible(false);
      flash.setDepth(150);
      this.flashPool.push(flash);
    }

    this.preview = scene.add.graphics().setDepth(180).setAlpha(0.4);

    this.onPointerDownBound = (pointer: Phaser.Input.Pointer) => {
      this.onPointerDown(pointer);
    };
    this.onPointerMoveBound = (pointer: Phaser.Input.Pointer) => {
      this.onPointerMove(pointer);
    };
    this.scene.input.on('pointerdown', this.onPointerDownBound);
    this.scene.input.on('pointermove', this.onPointerMoveBound);
  }

  private isInExitZone(x: number, y: number): boolean {
    const margin = 20;
    return x >= EXIT_X - margin && x <= EXIT_X + EXIT_WIDTH + margin &&
           y >= EXIT_Y - margin && y <= EXIT_Y + EXIT_HEIGHT + margin;
  }

  private isInHudBar(y: number): boolean {
    return y >= HUD_BAR_Y;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const tool = this.hud.getSelectedTool();

    this.preview.clear();

    if (!tool) return;
    if (this.isInHudBar(worldY)) return;
    if (this.isInExitZone(worldX, worldY)) return;

    this.drawPreview(tool, worldX, worldY);
  }

  private drawPreview(tool: ToolType, worldX: number, worldY: number): void {
    const g = this.preview;
    const previewColor = 0x66aaff;

    switch (tool) {
      case 'dig':
        g.lineStyle(2, 0xff6644, 0.7);
        g.strokeRect(worldX - TOOL_DIG_WIDTH / 2, worldY, TOOL_DIG_WIDTH, TOOL_DIG_DEPTH);
        // Cross lines to indicate destruction
        g.lineBetween(worldX - TOOL_DIG_WIDTH / 2, worldY, worldX + TOOL_DIG_WIDTH / 2, worldY + TOOL_DIG_DEPTH);
        g.lineBetween(worldX + TOOL_DIG_WIDTH / 2, worldY, worldX - TOOL_DIG_WIDTH / 2, worldY + TOOL_DIG_DEPTH);
        break;
      case 'stairs': {
        const direction = worldX < GAME_WIDTH / 2 ? 1 : -1;
        g.fillStyle(previewColor, 0.3);
        g.lineStyle(1, previewColor, 0.6);
        for (let step = 0; step < TOOL_STAIR_STEPS; step++) {
          const stepX = direction === 1
            ? worldX + step * TOOL_STAIR_STEP_W
            : worldX - (step + 1) * TOOL_STAIR_STEP_W;
          const stepY = worldY - (step + 1) * TOOL_STAIR_STEP_H;
          g.fillRect(stepX, stepY, TOOL_STAIR_STEP_W, TOOL_STAIR_STEP_H);
          g.strokeRect(stepX, stepY, TOOL_STAIR_STEP_W, TOOL_STAIR_STEP_H);
        }
        break;
      }
      case 'wall':
        g.fillStyle(previewColor, 0.3);
        g.lineStyle(2, previewColor, 0.6);
        g.fillRect(worldX - TOOL_WALL_WIDTH / 2, worldY - TOOL_WALL_HEIGHT, TOOL_WALL_WIDTH, TOOL_WALL_HEIGHT);
        g.strokeRect(worldX - TOOL_WALL_WIDTH / 2, worldY - TOOL_WALL_HEIGHT, TOOL_WALL_WIDTH, TOOL_WALL_HEIGHT);
        break;
      case 'ramp': {
        const dir = worldX < GAME_WIDTH / 2 ? 1 : -1;
        g.fillStyle(previewColor, 0.3);
        if (dir === 1) {
          g.fillTriangle(worldX, worldY, worldX + TOOL_RAMP_LENGTH, worldY, worldX + TOOL_RAMP_LENGTH, worldY - TOOL_RAMP_HEIGHT);
        } else {
          g.fillTriangle(worldX, worldY, worldX - TOOL_RAMP_LENGTH, worldY, worldX - TOOL_RAMP_LENGTH, worldY - TOOL_RAMP_HEIGHT);
        }
        break;
      }
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Ignore clicks in the HUD bar or exit zone
    if (this.isInHudBar(worldY)) return;
    if (this.isInExitZone(worldX, worldY)) return;

    const selectedTool = this.hud.getSelectedTool();
    if (selectedTool === null) return;

    const consumed = this.hud.consumeTool(selectedTool);
    if (!consumed) return;

    this.placeTool(selectedTool, worldX, worldY);
    gameEventBus.emit('tool:placed', { tool: selectedTool, x: worldX, y: worldY });
    this.showPlacementFlash(worldX, worldY);
  }

  private placeTool(tool: ToolType, worldX: number, worldY: number): void {
    switch (tool) {
      case 'dig':
        this.placeDig(worldX, worldY);
        break;
      case 'stairs':
        this.placeStairs(worldX, worldY);
        break;
      case 'wall':
        this.placeWall(worldX, worldY);
        break;
      case 'ramp':
        this.placeRamp(worldX, worldY);
        break;
    }
  }

  private placeDig(worldX: number, worldY: number): void {
    const startX = worldX - TOOL_DIG_WIDTH / 2;
    this.terrain.eraseRect(startX, worldY, TOOL_DIG_WIDTH, TOOL_DIG_DEPTH);
  }

  private placeStairs(worldX: number, worldY: number): void {
    const direction = worldX < GAME_WIDTH / 2 ? 1 : -1;
    for (let step = 0; step < TOOL_STAIR_STEPS; step++) {
      const stepX = direction === 1
        ? worldX + step * TOOL_STAIR_STEP_W
        : worldX - (step + 1) * TOOL_STAIR_STEP_W;
      const stepY = worldY - (step + 1) * TOOL_STAIR_STEP_H;
      this.terrain.buildStep(stepX, stepY, TOOL_STAIR_STEP_W, TOOL_STAIR_STEP_H);
    }
  }

  private placeWall(worldX: number, worldY: number): void {
    const startX = worldX - TOOL_WALL_WIDTH / 2;
    const startY = worldY - TOOL_WALL_HEIGHT;
    this.terrain.fillRect(startX, startY, TOOL_WALL_WIDTH, TOOL_WALL_HEIGHT, WALL_TERRAIN_COLOR);
  }

  private placeRamp(worldX: number, worldY: number): void {
    const direction = worldX < GAME_WIDTH / 2 ? 1 : -1;
    const sliceCount = TOOL_RAMP_LENGTH;
    for (let col = 0; col < sliceCount; col++) {
      const progress = (col + 1) / sliceCount;
      const colHeight = Math.ceil(TOOL_RAMP_HEIGHT * progress);
      const colX = direction === 1 ? worldX + col : worldX - col - 1;
      const colY = worldY - colHeight;
      this.terrain.buildStep(colX, colY, 1, colHeight);
    }
  }

  private showPlacementFlash(worldX: number, worldY: number): void {
    let flash: Phaser.GameObjects.Rectangle | undefined;
    for (const f of this.flashPool) {
      if (!f.visible) {
        flash = f;
        break;
      }
    }
    if (!flash) return;

    flash.setPosition(worldX, worldY);
    flash.setDisplaySize(24, 24);
    flash.setAlpha(0.8);
    flash.setVisible(true);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      displayWidth: 40,
      displayHeight: 40,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        flash.setVisible(false);
      },
    });
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDownBound);
    this.scene.input.off('pointermove', this.onPointerMoveBound);
    this.preview.destroy();
    for (const flash of this.flashPool) {
      flash.destroy();
    }
    this.flashPool.length = 0;
  }
}
