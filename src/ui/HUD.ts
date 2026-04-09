import Phaser from 'phaser';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  TOOLS_AVAILABLE,
  SKILLS_AVAILABLE,
  ToolType,
  SkillType,
  TOOL_ICON_COLORS,
  TOOL_LABELS,
  SKILL_ICON_COLORS,
  SKILL_LABELS,
  HUD_BUTTON_WIDTH,
  HUD_BUTTON_HEIGHT,
  HUD_BUTTON_GAP,
  HUD_BAR_HEIGHT,
  HUD_BAR_Y,
  SKILL_ROW_HEIGHT,
} from '@/utils/Constants';

interface ButtonEntry {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  iconGraphic: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Rectangle;
}

interface ToolButton extends ButtonEntry {
  tool: ToolType;
}

interface SkillButton extends ButtonEntry {
  skill: SkillType;
}

/** Skill button dimensions (slightly smaller to fit 8 buttons) */
const SKILL_BUTTON_WIDTH = 68;
const SKILL_BUTTON_HEIGHT = 36;
const SKILL_BUTTON_GAP = 6;

export class HUD {
  private readonly toolButtons: ToolButton[] = [];
  private readonly skillButtons: SkillButton[] = [];
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly barBackground: Phaser.GameObjects.Graphics;
  private selectedTool: ToolType | null = null;
  private selectedSkill: SkillType | null = null;
  private readonly toolCounts: Record<ToolType, number>;
  private readonly skillCounts: Record<SkillType, number>;
  private readonly hudUpdateHandler: (data: { alive: number; saved: number; dead: number }) => void;

  constructor(
    scene: Phaser.Scene,
    toolBudget?: Readonly<Record<ToolType, number>>,
    skillBudget?: Readonly<Record<SkillType, number>>,
  ) {
    const tBudget = toolBudget ?? TOOLS_AVAILABLE;
    this.toolCounts = {
      dig: tBudget.dig,
      stairs: tBudget.stairs,
      wall: tBudget.wall,
      ramp: tBudget.ramp,
    };

    const sBudget = skillBudget ?? SKILLS_AVAILABLE;
    this.skillCounts = {
      digger: sBudget.digger,
      basher: sBudget.basher,
      miner: sBudget.miner,
      builder: sBudget.builder,
      blocker: sBudget.blocker,
      climber: sBudget.climber,
      floater: sBudget.floater,
      bomber: sBudget.bomber,
    };

    // Dark bar background spanning both rows
    this.barBackground = scene.add.graphics().setDepth(190).setScrollFactor(0);
    // Separator line at top
    this.barBackground.fillStyle(0x334466, 1);
    this.barBackground.fillRect(0, HUD_BAR_Y, GAME_WIDTH, 2);
    // Bar body
    this.barBackground.fillStyle(0x111827, 1);
    this.barBackground.fillRect(0, HUD_BAR_Y + 2, GAME_WIDTH, HUD_BAR_HEIGHT - 2);
    // Separator between skill row and tool row
    this.barBackground.fillStyle(0x2a3a5a, 0.6);
    this.barBackground.fillRect(0, HUD_BAR_Y + SKILL_ROW_HEIGHT, GAME_WIDTH, 1);

    // Status text (French)
    this.statusText = scene.add
      .text(14, HUD_BAR_Y + 4, 'Vivants: 0 | Sauves: 0 | Morts: 0', {
        fontSize: '11px',
        color: '#aabbcc',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setDepth(200)
      .setScrollFactor(0);

    // ---- SKILL ROW (top half of HUD bar) ----
    const skills: SkillType[] = ['digger', 'basher', 'miner', 'builder', 'blocker', 'climber', 'floater', 'bomber'];
    const skillTotalWidth = skills.length * SKILL_BUTTON_WIDTH + (skills.length - 1) * SKILL_BUTTON_GAP;
    const skillStartX = (GAME_WIDTH - skillTotalWidth) / 2;
    const skillCenterY = HUD_BAR_Y + 6 + SKILL_BUTTON_HEIGHT / 2;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      if (!skill) continue;
      const bx = skillStartX + i * (SKILL_BUTTON_WIDTH + SKILL_BUTTON_GAP) + SKILL_BUTTON_WIDTH / 2;
      this.createSkillButton(scene, skill, bx, skillCenterY);
    }

    // ---- TOOL ROW (bottom half of HUD bar) ----
    const tools: ToolType[] = ['dig', 'stairs', 'wall', 'ramp'];
    const totalWidth = tools.length * HUD_BUTTON_WIDTH + (tools.length - 1) * HUD_BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const toolCenterY = HUD_BAR_Y + SKILL_ROW_HEIGHT + 6 + HUD_BUTTON_HEIGHT / 2;

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      if (!tool) continue;
      const bx = startX + i * (HUD_BUTTON_WIDTH + HUD_BUTTON_GAP) + HUD_BUTTON_WIDTH / 2;
      this.createToolButton(scene, tool, bx, toolCenterY);
    }

    this.hudUpdateHandler = (data: { alive: number; saved: number; dead: number }) => {
      this.statusText.setText(
        `Vivants: ${data.alive} | Sauves: ${data.saved} | Morts: ${data.dead}`,
      );
    };
    gameEventBus.on('hud:update', this.hudUpdateHandler);
    gameEventBus.emit('tool:counts', { ...this.toolCounts });
  }

  // ---- SKILL BUTTON CREATION ----

  private createSkillButton(scene: Phaser.Scene, skill: SkillType, cx: number, cy: number): void {
    const hw = SKILL_BUTTON_WIDTH / 2;
    const hh = SKILL_BUTTON_HEIGHT / 2;

    const bg = scene.add.graphics().setScrollFactor(0);
    this.drawSkillButtonBg(bg, cx - hw, cy - hh, SKILL_BUTTON_WIDTH, SKILL_BUTTON_HEIGHT, false);

    const iconG = scene.add.graphics().setScrollFactor(0);
    this.drawSkillIcon(iconG, skill, cx - hw + 8, cy);

    const label = scene.add
      .text(cx + 8, cy - 4, SKILL_LABELS[skill], {
        fontSize: '9px',
        color: '#e0e8f0',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const countText = scene.add
      .text(cx, cy + 11, `x${this.skillCounts[skill]}`, {
        fontSize: '10px',
        color: '#cc8855',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const container = scene.add.container(0, 0, [bg, iconG, label, countText])
      .setDepth(200)
      .setScrollFactor(0);

    const hitZone = scene.add.rectangle(cx, cy, SKILL_BUTTON_WIDTH, SKILL_BUTTON_HEIGHT)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(201)
      .setScrollFactor(0);

    hitZone.on('pointerdown', () => {
      this.selectSkill(skill);
    });

    this.skillButtons.push({ container, background: bg, iconGraphic: iconG, label, countText, hitZone, skill });
  }

  private drawSkillButtonBg(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, selected: boolean): void {
    g.clear();
    const radius = 5;
    if (selected) {
      g.fillStyle(0x884422, 0.3);
      g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
      g.fillStyle(0x3a2520, 1);
      g.fillRoundedRect(x, y, w, h, radius);
      g.lineStyle(2, 0xff8844, 1);
      g.strokeRoundedRect(x, y, w, h, radius);
    } else {
      g.fillStyle(0x1a2040, 1);
      g.fillRoundedRect(x, y, w, h, radius);
      g.lineStyle(1, 0x443322, 0.8);
      g.strokeRoundedRect(x, y, w, h, radius);
    }
  }

  private drawSkillIcon(g: Phaser.GameObjects.Graphics, skill: SkillType, x: number, y: number): void {
    const color = SKILL_ICON_COLORS[skill];
    g.clear();
    switch (skill) {
      case 'digger':
        // Downward arrow
        g.fillStyle(color, 1);
        g.fillRect(x + 2, y - 6, 3, 8);
        g.fillTriangle(x, y + 2, x + 7, y + 2, x + 3, y + 6);
        break;
      case 'basher':
        // Horizontal arrow
        g.fillStyle(color, 1);
        g.fillRect(x, y - 2, 8, 3);
        g.fillTriangle(x + 8, y - 4, x + 8, y + 3, x + 12, y);
        break;
      case 'miner':
        // Diagonal arrow
        g.fillStyle(color, 1);
        g.fillRect(x, y - 4, 2, 8);
        g.fillTriangle(x - 2, y + 4, x + 4, y + 4, x + 1, y + 8);
        g.fillRect(x + 2, y, 4, 2);
        break;
      case 'builder':
        // Steps going up
        g.fillStyle(color, 1);
        g.fillRect(x, y + 2, 5, 2);
        g.fillRect(x + 3, y, 5, 2);
        g.fillRect(x + 6, y - 2, 5, 2);
        break;
      case 'blocker':
        // Stop sign / hand
        g.fillStyle(color, 1);
        g.fillRect(x + 1, y - 6, 5, 12);
        g.fillRect(x - 1, y - 4, 9, 2);
        break;
      case 'climber':
        // Upward arrow
        g.fillStyle(color, 1);
        g.fillRect(x + 2, y - 4, 3, 8);
        g.fillTriangle(x, y - 4, x + 7, y - 4, x + 3, y - 8);
        break;
      case 'floater':
        // Umbrella shape
        g.fillStyle(color, 1);
        g.fillRect(x + 3, y - 2, 2, 8);
        g.fillTriangle(x, y, x + 8, y, x + 4, y - 6);
        break;
      case 'bomber':
        // Explosion / star
        g.fillStyle(color, 1);
        g.fillCircle(x + 4, y, 4);
        g.fillRect(x + 3, y - 6, 2, 3);
        break;
    }
  }

  // ---- TOOL BUTTON CREATION ----

  private createToolButton(scene: Phaser.Scene, tool: ToolType, cx: number, cy: number): void {
    const hw = HUD_BUTTON_WIDTH / 2;
    const hh = HUD_BUTTON_HEIGHT / 2;

    const bg = scene.add.graphics().setScrollFactor(0);
    this.drawToolButtonBg(bg, cx - hw, cy - hh, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT, false);

    const iconG = scene.add.graphics().setScrollFactor(0);
    this.drawToolIcon(iconG, tool, cx - hw + 14, cy - 4);

    const label = scene.add
      .text(cx + 6, cy - 5, TOOL_LABELS[tool], {
        fontSize: '12px',
        color: '#e0e8f0',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const countText = scene.add
      .text(cx, cy + 14, `x${this.toolCounts[tool]}`, {
        fontSize: '13px',
        color: '#88aacc',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const container = scene.add.container(0, 0, [bg, iconG, label, countText])
      .setDepth(200)
      .setScrollFactor(0);

    const hitZone = scene.add.rectangle(cx, cy, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(201)
      .setScrollFactor(0);

    hitZone.on('pointerdown', () => {
      this.selectTool(tool);
    });

    this.toolButtons.push({ container, background: bg, iconGraphic: iconG, label, countText, hitZone, tool });
  }

  private drawToolButtonBg(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, selected: boolean): void {
    g.clear();
    const radius = 6;
    if (selected) {
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
        g.fillStyle(color, 1);
        g.fillRect(x, y - 6, 2, 12);
        g.fillTriangle(x - 4, y - 6, x + 6, y - 6, x + 1, y - 2);
        break;
      case 'stairs':
        g.fillStyle(color, 1);
        g.fillRect(x, y + 4, 6, 3);
        g.fillRect(x + 3, y + 1, 6, 3);
        g.fillRect(x + 6, y - 2, 6, 3);
        g.fillRect(x + 9, y - 5, 6, 3);
        break;
      case 'wall':
        g.fillStyle(color, 1);
        g.fillRect(x, y - 6, 12, 3);
        g.fillRect(x + 2, y - 3, 12, 3);
        g.fillRect(x, y, 12, 3);
        g.fillRect(x + 2, y + 3, 12, 3);
        break;
      case 'ramp':
        g.fillStyle(color, 1);
        g.fillTriangle(x, y + 6, x + 14, y + 6, x + 14, y - 4);
        break;
    }
  }

  // ---- SELECTION LOGIC ----

  private selectSkill(skill: SkillType): void {
    // Deselect any tool when selecting a skill
    if (this.selectedTool !== null) {
      this.selectedTool = null;
      gameEventBus.emit('tool:selected', { tool: null });
      this.updateToolButtonVisuals();
    }

    if (this.selectedSkill === skill) {
      this.selectedSkill = null;
      gameEventBus.emit('skill:selected', { skill: null });
    } else {
      this.selectedSkill = skill;
      gameEventBus.emit('skill:selected', { skill });
    }
    this.updateSkillButtonVisuals();
  }

  private selectTool(tool: ToolType): void {
    // Deselect any skill when selecting a tool
    if (this.selectedSkill !== null) {
      this.selectedSkill = null;
      gameEventBus.emit('skill:selected', { skill: null });
      this.updateSkillButtonVisuals();
    }

    if (this.selectedTool === tool) {
      this.selectedTool = null;
      gameEventBus.emit('tool:selected', { tool: null });
    } else {
      this.selectedTool = tool;
      gameEventBus.emit('tool:selected', { tool });
    }
    this.updateToolButtonVisuals();
  }

  // ---- PUBLIC API ----

  getSelectedTool(): ToolType | null {
    return this.selectedTool;
  }

  getSelectedSkill(): SkillType | null {
    return this.selectedSkill;
  }

  consumeTool(tool: ToolType): boolean {
    const count = this.toolCounts[tool];
    if (count <= 0) return false;
    this.toolCounts[tool] = count - 1;
    this.updateToolCountTexts();
    gameEventBus.emit('tool:counts', { ...this.toolCounts });
    return true;
  }

  getToolCounts(): Readonly<Record<ToolType, number>> {
    return { ...this.toolCounts };
  }

  consumeSkill(skill: SkillType): boolean {
    const count = this.skillCounts[skill];
    if (count <= 0) return false;
    this.skillCounts[skill] = count - 1;
    this.updateSkillCountTexts();
    return true;
  }

  // ---- VISUAL UPDATES ----

  private updateToolButtonVisuals(): void {
    const tools: ToolType[] = ['dig', 'stairs', 'wall', 'ramp'];
    const totalWidth = tools.length * HUD_BUTTON_WIDTH + (tools.length - 1) * HUD_BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const toolCenterY = HUD_BAR_Y + SKILL_ROW_HEIGHT + 6 + HUD_BUTTON_HEIGHT / 2;

    for (let i = 0; i < this.toolButtons.length; i++) {
      const btn = this.toolButtons[i];
      if (!btn) continue;
      const bx = startX + i * (HUD_BUTTON_WIDTH + HUD_BUTTON_GAP);
      const selected = btn.tool === this.selectedTool;
      this.drawToolButtonBg(btn.background, bx, toolCenterY - HUD_BUTTON_HEIGHT / 2, HUD_BUTTON_WIDTH, HUD_BUTTON_HEIGHT, selected);
      btn.label.setColor(selected ? '#ffffff' : '#e0e8f0');
      btn.countText.setColor(selected ? '#66aaff' : '#88aacc');
    }
  }

  private updateSkillButtonVisuals(): void {
    const skills: SkillType[] = ['digger', 'basher', 'miner', 'builder', 'blocker', 'climber', 'floater', 'bomber'];
    const skillTotalWidth = skills.length * SKILL_BUTTON_WIDTH + (skills.length - 1) * SKILL_BUTTON_GAP;
    const skillStartX = (GAME_WIDTH - skillTotalWidth) / 2;
    const skillCenterY = HUD_BAR_Y + 6 + SKILL_BUTTON_HEIGHT / 2;

    for (let i = 0; i < this.skillButtons.length; i++) {
      const btn = this.skillButtons[i];
      if (!btn) continue;
      const bx = skillStartX + i * (SKILL_BUTTON_WIDTH + SKILL_BUTTON_GAP);
      const selected = btn.skill === this.selectedSkill;
      this.drawSkillButtonBg(btn.background, bx, skillCenterY - SKILL_BUTTON_HEIGHT / 2, SKILL_BUTTON_WIDTH, SKILL_BUTTON_HEIGHT, selected);
      btn.label.setColor(selected ? '#ffffff' : '#e0e8f0');
      btn.countText.setColor(selected ? '#ff8844' : '#cc8855');
    }
  }

  private updateToolCountTexts(): void {
    for (const btn of this.toolButtons) {
      btn.countText.setText(`x${this.toolCounts[btn.tool]}`);
    }
  }

  private updateSkillCountTexts(): void {
    for (const btn of this.skillButtons) {
      btn.countText.setText(`x${this.skillCounts[btn.skill]}`);
    }
  }

  destroy(): void {
    gameEventBus.off('hud:update', this.hudUpdateHandler);
    for (const btn of this.toolButtons) {
      btn.hitZone.destroy();
      btn.container.destroy();
    }
    this.toolButtons.length = 0;
    for (const btn of this.skillButtons) {
      btn.hitZone.destroy();
      btn.container.destroy();
    }
    this.skillButtons.length = 0;
    this.statusText.destroy();
    this.barBackground.destroy();
  }
}
