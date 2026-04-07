import Phaser from 'phaser';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TOOLS_AVAILABLE,
  ToolType,
  HUD_BUTTON_WIDTH,
  HUD_BUTTON_HEIGHT,
  HUD_BUTTON_GAP,
  TOOL_ICON_COLORS,
  TOOL_LABELS,
} from '@/utils/Constants';

interface ToolButton {
  background: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  tool: ToolType;
}

export class HUD {
  private readonly buttons: ToolButton[] = [];
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly activeToolIndicator: Phaser.GameObjects.Text;
  private selectedTool: ToolType | null = null;
  private readonly toolCounts: Record<ToolType, number>;
  private readonly hudUpdateHandler: (data: { alive: number; saved: number; dead: number }) => void;

  constructor(scene: Phaser.Scene) {
    this.toolCounts = {
      dig: TOOLS_AVAILABLE.dig,
      stairs: TOOLS_AVAILABLE.stairs,
      wall: TOOLS_AVAILABLE.wall,
      ramp: TOOLS_AVAILABLE.ramp,
    };

    this.statusText = scene.add
      .text(8, 8, 'Alive: 0 | Saved: 0 | Dead: 0', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setDepth(200);

    this.activeToolIndicator = scene.add
      .text(GAME_WIDTH - 8, 8, '', {
        fontSize: '16px',
        color: '#ffff00',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(200);

    const tools: ToolType[] = ['dig', 'stairs', 'wall', 'ramp'];
    const totalWidth = tools.length * HUD_BUTTON_WIDTH + (tools.length - 1) * HUD_BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const buttonY = GAME_HEIGHT - 35;

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      if (!tool) continue;

      const bx = startX + i * (HUD_BUTTON_WIDTH + HUD_BUTTON_GAP) + HUD_BUTTON_WIDTH / 2;
      const by = buttonY;

      const border = scene.add
        .rectangle(bx, by, HUD_BUTTON_WIDTH + 6, HUD_BUTTON_HEIGHT + 6)
        .setStrokeStyle(2, 0x666666)
        .setFillStyle(0x000000, 0)
        .setDepth(199);

      const background = scene.add
        .rectangle(bx, by, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT, 0x333333)
        .setDepth(200)
        .setInteractive({ useHandCursor: true });

      const iconColor = TOOL_ICON_COLORS[tool];
      const icon = scene.add
        .rectangle(bx - HUD_BUTTON_WIDTH / 2 + 14, by - 6, 10, 10, iconColor)
        .setDepth(201);

      const labelText = TOOL_LABELS[tool];
      const label = scene.add
        .text(bx + 6, by - 6, labelText, {
          fontSize: '13px',
          color: '#ffffff',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(201);

      const countText = scene.add
        .text(bx, by + 14, String(this.toolCounts[tool]), {
          fontSize: '18px',
          color: '#aaaaaa',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(201);

      background.on('pointerdown', () => {
        this.selectTool(tool);
      });

      this.buttons.push({ background, border, icon, label, countText, tool });
    }

    this.hudUpdateHandler = (data: { alive: number; saved: number; dead: number }) => {
      this.statusText.setText(
        `Alive: ${data.alive} | Saved: ${data.saved} | Dead: ${data.dead}`,
      );
    };
    gameEventBus.on('hud:update', this.hudUpdateHandler);
    gameEventBus.emit('tool:counts', { ...this.toolCounts });
  }

  private selectTool(tool: ToolType): void {
    if (this.selectedTool === tool) {
      this.selectedTool = null;
      gameEventBus.emit('tool:selected', { tool: null });
    } else {
      this.selectedTool = tool;
      gameEventBus.emit('tool:selected', { tool });
    }
    this.updateButtonVisuals();
    this.updateActiveIndicator();
  }

  getSelectedTool(): ToolType | null {
    return this.selectedTool;
  }

  consumeTool(tool: ToolType): boolean {
    const count = this.toolCounts[tool];
    if (count <= 0) return false;
    this.toolCounts[tool] = count - 1;
    this.updateCountTexts();
    gameEventBus.emit('tool:counts', { ...this.toolCounts });
    return true;
  }

  private updateButtonVisuals(): void {
    for (const btn of this.buttons) {
      if (btn.tool === this.selectedTool) {
        btn.background.setFillStyle(0x555555);
        btn.border.setStrokeStyle(3, 0xffff00);
      } else {
        btn.background.setFillStyle(0x333333);
        btn.border.setStrokeStyle(2, 0x666666);
      }
    }
  }

  private updateCountTexts(): void {
    for (const btn of this.buttons) {
      btn.countText.setText(String(this.toolCounts[btn.tool]));
    }
  }

  private updateActiveIndicator(): void {
    if (this.selectedTool) {
      const label = TOOL_LABELS[this.selectedTool];
      this.activeToolIndicator.setText(`Active: ${label}`);
    } else {
      this.activeToolIndicator.setText('');
    }
  }

  destroy(): void {
    gameEventBus.off('hud:update', this.hudUpdateHandler);
    for (const btn of this.buttons) {
      btn.background.destroy();
      btn.border.destroy();
      btn.icon.destroy();
      btn.label.destroy();
      btn.countText.destroy();
    }
    this.buttons.length = 0;
    this.statusText.destroy();
    this.activeToolIndicator.destroy();
  }
}
