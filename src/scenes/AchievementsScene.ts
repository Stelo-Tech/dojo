import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { AchievementSystem } from '@/systems/AchievementSystem';

export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // Background
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a);

    // Title
    this.add.rectangle(cx, 30, GAME_WIDTH - 40, 36, 0x1e293b, 0.8);
    this.add.text(cx, 30, 'Succes', {
      fontSize: '18px', color: '#e2e8f0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Load achievements
    const system = new AchievementSystem();
    const achievements = system.getAllAchievements();
    const unlocked = system.getUnlockedCount();

    // Progress bar
    const barW = 300;
    const barH = 16;
    const barX = cx - barW / 2;
    const barY = 60;
    const progress = achievements.length > 0 ? unlocked / achievements.length : 0;

    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 4);
    bg.fillStyle(0x8b5cf6, 1);
    bg.fillRoundedRect(barX, barY, barW * progress, barH, 4);

    this.add.text(cx, barY + barH / 2, `${unlocked} / ${achievements.length}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Achievement list
    const startY = 90;
    const itemH = 40;
    const cols = 2;
    const colW = (GAME_WIDTH - 60) / cols;

    for (let i = 0; i < achievements.length; i++) {
      const a = achievements[i];
      if (!a) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 30 + col * colW;
      const y = startY + row * itemH;

      const g = this.add.graphics();
      g.fillStyle(a.unlocked ? 0x1e3a5f : 0x111827, 1);
      g.fillRoundedRect(x, y, colW - 10, itemH - 4, 4);
      if (a.unlocked) {
        g.lineStyle(1, 0x8b5cf6, 0.5);
        g.strokeRoundedRect(x, y, colW - 10, itemH - 4, 4);
      }

      // Icon
      this.add.text(x + 8, y + itemH / 2 - 2, a.unlocked ? a.icon : '?', {
        fontSize: '16px', color: a.unlocked ? '#fbbf24' : '#334155', fontFamily: 'Arial',
      }).setOrigin(0, 0.5);

      // Name
      this.add.text(x + 30, y + 8, a.unlocked ? a.name : '???', {
        fontSize: '11px', color: a.unlocked ? '#e2e8f0' : '#475569',
        fontFamily: 'Arial', fontStyle: 'bold',
      });

      // Description
      this.add.text(x + 30, y + 22, a.unlocked ? a.description : '???', {
        fontSize: '9px', color: a.unlocked ? '#94a3b8' : '#334155', fontFamily: 'Arial',
      });
    }

    // Back button
    const backY = GAME_HEIGHT - 40;
    const backG = this.add.graphics();
    backG.fillStyle(0x1e293b, 1);
    backG.fillRoundedRect(cx - 60, backY - 16, 120, 32, 6);
    backG.lineStyle(1, 0x64748b, 0.5);
    backG.strokeRoundedRect(cx - 60, backY - 16, 120, 32, 6);

    this.add.text(cx, backY, 'Retour', {
      fontSize: '13px', color: '#94a3b8', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.zone(cx, backY, 120, 32)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.scene.start('MenuScene'); });
  }
}
