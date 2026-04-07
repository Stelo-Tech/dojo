import Phaser from 'phaser';
import { gameEventBus } from '@/utils/EventBus';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SKILLS_AVAILABLE,
  SkillType,
  HUD_BUTTON_WIDTH,
  HUD_BUTTON_HEIGHT,
  HUD_BUTTON_GAP,
  SKILL_ICON_COLORS,
} from '@/utils/Constants';

interface SkillButton {
  background: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  skill: SkillType;
}

export class HUD {
  private readonly buttons: SkillButton[] = [];
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly activeSkillIndicator: Phaser.GameObjects.Text;
  private selectedSkill: SkillType | null = null;
  private readonly skillCounts: Record<SkillType, number>;
  private readonly hudUpdateHandler: (data: { alive: number; saved: number; dead: number }) => void;

  constructor(scene: Phaser.Scene) {
    this.skillCounts = {
      digger: SKILLS_AVAILABLE.digger,
      builder: SKILLS_AVAILABLE.builder,
      blocker: SKILLS_AVAILABLE.blocker,
      climber: SKILLS_AVAILABLE.climber,
    };

    this.statusText = scene.add
      .text(8, 8, 'Alive: 0 | Saved: 0 | Dead: 0', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setDepth(200);

    this.activeSkillIndicator = scene.add
      .text(GAME_WIDTH - 8, 8, '', {
        fontSize: '16px',
        color: '#ffff00',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(200);

    const skills: SkillType[] = ['digger', 'builder', 'blocker', 'climber'];
    const totalWidth = skills.length * HUD_BUTTON_WIDTH + (skills.length - 1) * HUD_BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const buttonY = GAME_HEIGHT - 35;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      if (!skill) continue;

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

      const iconColor = SKILL_ICON_COLORS[skill];
      const icon = scene.add
        .rectangle(bx - HUD_BUTTON_WIDTH / 2 + 14, by - 6, 10, 10, iconColor)
        .setDepth(201);

      const labelText = skill.charAt(0).toUpperCase() + skill.slice(1);
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
        .text(bx, by + 14, String(this.skillCounts[skill]), {
          fontSize: '18px',
          color: '#aaaaaa',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(201);

      background.on('pointerdown', () => {
        this.selectSkill(skill);
      });

      this.buttons.push({ background, border, icon, label, countText, skill });
    }

    this.hudUpdateHandler = (data: { alive: number; saved: number; dead: number }) => {
      this.statusText.setText(
        `Alive: ${data.alive} | Saved: ${data.saved} | Dead: ${data.dead}`,
      );
    };
    gameEventBus.on('hud:update', this.hudUpdateHandler);
    gameEventBus.emit('skill:counts', { ...this.skillCounts });
  }

  private selectSkill(skill: SkillType): void {
    if (this.selectedSkill === skill) {
      this.selectedSkill = null;
      gameEventBus.emit('skill:selected', { skill: null });
    } else {
      this.selectedSkill = skill;
      gameEventBus.emit('skill:selected', { skill });
    }
    this.updateButtonVisuals();
    this.updateActiveIndicator();
  }

  getSelectedSkill(): SkillType | null {
    return this.selectedSkill;
  }

  consumeSkill(skill: SkillType): boolean {
    const count = this.skillCounts[skill];
    if (count <= 0) return false;
    this.skillCounts[skill] = count - 1;
    this.updateCountTexts();
    gameEventBus.emit('skill:counts', { ...this.skillCounts });
    return true;
  }

  private updateButtonVisuals(): void {
    for (const btn of this.buttons) {
      if (btn.skill === this.selectedSkill) {
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
      btn.countText.setText(String(this.skillCounts[btn.skill]));
    }
  }

  private updateActiveIndicator(): void {
    if (this.selectedSkill) {
      const label = this.selectedSkill.charAt(0).toUpperCase() + this.selectedSkill.slice(1);
      this.activeSkillIndicator.setText(`Active: ${label}`);
    } else {
      this.activeSkillIndicator.setText('');
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
    this.activeSkillIndicator.destroy();
  }
}
