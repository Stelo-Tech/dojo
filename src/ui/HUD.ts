import Phaser from 'phaser';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  TOOLS_AVAILABLE,
  ToolType,
  TOOL_ICON_COLORS,
  TOOL_LABELS,
  HUD_BUTTON_WIDTH,
  HUD_BUTTON_HEIGHT,
  HUD_BUTTON_GAP,
  HUD_BAR_HEIGHT,
  HUD_BAR_Y,
} from '@/utils/Constants';

interface ToolButton {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  iconGraphic: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Rectangle;
  tool: ToolType;
}

export class HUD {
  private readonly buttons: ToolButton[] = [];
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly barBackground: Phaser.GameObjects.Graphics;
  private selectedTool: ToolType | null = null;
  private readonly toolCounts: Record<ToolType, number>;
  private readonly hudUpdateHandler: (data: { alive: number; saved: number; dead: number }) => void;

  constructor(scene: Phaser.Scene, toolBudget?: Readonly<Record<ToolType, number>>) {
    const budget = toolBudget ?? TOOLS_AVAILABLE;
    this.toolCounts = {
      dig: budget.dig,
      stairs: budget.stairs,
      wall: budget.wall,
      ramp: budget.ramp,
    };

    // Dark bar background
    this.barBackground = scene.add.graphics().setDepth(190).setScrollFactor(0);
    // Separator line
    this.barBackground.fillStyle(0x334466, 1);
    this.barBackground.fillRect(0, HUD_BAR_Y, GAME_WIDTH, 2);
    // Bar body
    this.barBackground.fillStyle(0x111827, 1);
    this.barBackground.fillRect(0, HUD_BAR_Y + 2, GAME_WIDTH, HUD_BAR_HEIGHT - 2);

    // Status text (French)
    this.statusText = scene.add
      .text(14, HUD_BAR_Y + 8, 'Vivants: 0 | Sauves: 0 | Morts: 0', {
        fontSize: '13px',
        color: '#aabbcc',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setDepth(200)
      .setScrollFactor(0);

    // Tool buttons - centered in bar
    const tools: ToolType[] = ['dig', 'stairs', 'wall', 'ramp'];
    const totalWidth = tools.length * HUD_BUTTON_WIDTH + (tools.length - 1) * HUD_BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const buttonCenterY = HUD_BAR_Y + 12 + HUD_BUTTON_HEIGHT / 2;

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      if (!tool) continue;
      const bx = startX + i * (HUD_BUTTON_WIDTH + HUD_BUTTON_GAP) + HUD_BUTTON_WIDTH / 2;
      this.createToolButton(scene, tool, bx, buttonCenterY);
    }

    this.hudUpdateHandler = (data: { alive: number; saved: number; dead: number }) => {
      this.statusText.setText(
        `Vivants: ${data.alive} | Sauves: ${data.saved} | Morts: ${data.dead}`,
      );
    };
    gameEventBus.on('hud:update', this.hudUpdateHandler);
    gameEventBus.emit('tool:counts', { ...this.toolCounts });
  }

  private createToolButton(scene: Phaser.Scene, tool: ToolType, cx: number, cy: number): void {
    const hw = HUD_BUTTON_WIDTH / 2;
    const hh = HUD_BUTTON_HEIGHT / 2;

    // Background with rounded corners
    const bg = scene.add.graphics().setScrollFactor(0);
    this.drawButtonBg(bg, cx - hw, cy - hh, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT, false);

    // Tool icon drawn procedurally
    const iconG = scene.add.graphics().setScrollFactor(0);
    this.drawToolIcon(iconG, tool, cx - hw + 14, cy - 4);

    // Label (French)
    const label = scene.add
      .text(cx + 6, cy - 5, TOOL_LABELS[tool], {
        fontSize: '12px',
        color: '#e0e8f0',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Count
    const countText = scene.add
      .text(cx, cy + 14, `x${this.toolCounts[tool]}`, {
        fontSize: '13px',
        color: '#88aacc',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Container for depth management
    const container = scene.add.container(0, 0, [bg, iconG, label, countText])
      .setDepth(200)
      .setScrollFactor(0);

    // Interactive hit area on the background
    const hitZone = scene.add.rectangle(cx, cy, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(201)
      .setScrollFactor(0);

    hitZone.on('pointerdown', () => {
      this.selectTool(tool);
    });

    this.buttons.push({ container, background: bg, iconGraphic: iconG, label, countText, hitZone, tool });
  }

  private drawButtonBg(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, selected: boolean): void {
    g.clear();
    const radius = 6;
    if (selected) {
      // Selected glow
      g.fillStyle(0x3366aa, 0.3);
      g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
      g.fillStyle(0x2a3f5f, 1);
      g.fillRoundedRect(x, y, w, h, radius);
      g.lineStyle(2, 0x66aaff, 1);
      g.strokeRoundedRect(x, y, w, h, radius);
    } else {
      g.fillStyle(0x1a2540, 1);
      g.fillRoundedRect(x, y, w, h, radius);
      g.lineStyle(1, 0x334466, 0.8);
      g.strokeRoundedRect(x, y, w, h, radius);
    }
  }

  private drawToolIcon(g: Phaser.GameObjects.Graphics, tool: ToolType, x: number, y: number): void {
    const color = TOOL_ICON_COLORS[tool];
    g.clear();
    switch (tool) {
      case 'dig':
        // Pickaxe shape
        g.fillStyle(color, 1);
        g.fillRect(x, y - 6, 2, 12); // handle
        g.fillTriangle(x - 4, y - 6, x + 6, y - 6, x + 1, y - 2); // head
        break;
      case 'stairs':
        // Step shapes
        g.fillStyle(color, 1);
        g.fillRect(x, y + 4, 6, 3);
        g.fillRect(x + 3, y + 1, 6, 3);
        g.fillRect(x + 6, y - 2, 6, 3);
        g.fillRect(x + 9, y - 5, 6, 3);
        break;
      case 'wall':
        // Brick wall
        g.fillStyle(color, 1);
        g.fillRect(x, y - 6, 12, 3);
        g.fillRect(x + 2, y - 3, 12, 3);
        g.fillRect(x, y, 12, 3);
        g.fillRect(x + 2, y + 3, 12, 3);
        break;
      case 'ramp':
        // Triangle ramp
        g.fillStyle(color, 1);
        g.fillTriangle(x, y + 6, x + 14, y + 6, x + 14, y - 4);
        break;
    }
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
    const tools: ToolType[] = ['dig', 'stairs', 'wall', 'ramp'];
    const totalWidth = tools.length * HUD_BUTTON_WIDTH + (tools.length - 1) * HUD_BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const buttonCenterY = HUD_BAR_Y + 12 + HUD_BUTTON_HEIGHT / 2;

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (!btn) continue;
      const bx = startX + i * (HUD_BUTTON_WIDTH + HUD_BUTTON_GAP);
      const selected = btn.tool === this.selectedTool;
      this.drawButtonBg(btn.background, bx, buttonCenterY - HUD_BUTTON_HEIGHT / 2, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT, selected);
      btn.label.setColor(selected ? '#ffffff' : '#e0e8f0');
      btn.countText.setColor(selected ? '#66aaff' : '#88aacc');
    }
  }

  private updateCountTexts(): void {
    for (const btn of this.buttons) {
      btn.countText.setText(`x${this.toolCounts[btn.tool]}`);
    }
  }

  destroy(): void {
    gameEventBus.off('hud:update', this.hudUpdateHandler);
    for (const btn of this.buttons) {
      btn.hitZone.destroy();
      btn.container.destroy();
    }
    this.buttons.length = 0;
    this.statusText.destroy();
    this.barBackground.destroy();
  }
}
