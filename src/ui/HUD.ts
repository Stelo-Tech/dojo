import Phaser from 'phaser';
import { gameEventBus } from '@/utils/EventBus';
import { GAME_WIDTH, GAME_HEIGHT, SKILLS_AVAILABLE, SkillType } from '@/utils/Constants';

interface SkillButton {
  background: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  skill: SkillType;
}

export class HUD {
  private readonly buttons: SkillButton[] = [];
  private readonly statusText: Phaser.GameObjects.Text;
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
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setDepth(200);

    const skills: SkillType[] = ['digger', 'builder', 'blocker', 'climber'];
    const buttonWidth = 80;
    const buttonHeight = 40;
    const gap = 10;
    const totalWidth = skills.length * buttonWidth + (skills.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const buttonY = GAME_HEIGHT - 50;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      if (!skill) continue;

      const bx = startX + i * (buttonWidth + gap) + buttonWidth / 2;
      const by = buttonY;

      const background = scene.add
        .rectangle(bx, by, buttonWidth, buttonHeight, 0x333333)
        .setDepth(200)
        .setInteractive({ useHandCursor: true });

      const border = scene.add
        .rectangle(bx, by, buttonWidth + 4, buttonHeight + 4)
        .setStrokeStyle(2, 0x666666)
        .setDepth(199);

      const labelText = skill.charAt(0).toUpperCase() + skill.slice(1);
      const label = scene.add
        .text(bx, by - 6, labelText, {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setDepth(201);

      const countText = scene.add
        .text(bx, by + 10, String(this.skillCounts[skill]), {
          fontSize: '11px',
          color: '#aaaaaa',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setDepth(201);

      background.on('pointerdown', () => {
        this.selectSkill(skill);
      });

      this.buttons.push({ background, border, label, countText, skill });
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
        btn.border.setStrokeStyle(2, 0xffff00);
      } else {
        btn.border.setStrokeStyle(2, 0x666666);
      }
    }
  }

  private updateCountTexts(): void {
    for (const btn of this.buttons) {
      btn.countText.setText(String(this.skillCounts[btn.skill]));
    }
  }

  destroy(): void {
    gameEventBus.off('hud:update', this.hudUpdateHandler);
    for (const btn of this.buttons) {
      btn.background.destroy();
      btn.border.destroy();
      btn.label.destroy();
      btn.countText.destroy();
    }
    this.buttons.length = 0;
    this.statusText.destroy();
  }
}
