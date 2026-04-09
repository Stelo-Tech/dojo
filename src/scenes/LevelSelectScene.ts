import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
} from '@/utils/Constants';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import { DifficultyConfig } from '@/levels/LevelData';

const TIERS = 5;
const LEVELS_PER_TIER = 8;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0e1a)
      .setDepth(0);

    // Title
    this.add.text(GAME_WIDTH / 2, 30, 'SELECTION DU NIVEAU', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Tier labels and level buttons
    const startY = 70;
    const rowHeight = 85;
    const tierLabels = ['Tutoriel', 'Facile', 'Normal', 'Difficile', 'Expert'];
    const tierColors = [0x44dd66, 0x66bbff, 0xffcc22, 0xff8844, 0xff4444];

    for (let tier = 0; tier < TIERS; tier++) {
      const rowY = startY + tier * rowHeight;
      const tierColor = tierColors[tier] ?? 0xffffff;
      const tierLabel = tierLabels[tier] ?? `Tier ${tier + 1}`;

      // Tier label
      this.add.text(20, rowY, `${tierLabel}`, {
        fontSize: '16px',
        color: `#${tierColor.toString(16).padStart(6, '0')}`,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setDepth(10);

      // Level buttons
      const btnStartX = 140;
      const btnGap = 10;
      const btnW = 80;
      const btnH = 50;

      for (let lvl = 0; lvl < LEVELS_PER_TIER; lvl++) {
        const bx = btnStartX + lvl * (btnW + btnGap);
        const by = rowY + 2;
        const seed = (tier + 1) * 1000 + lvl;

        // Button background
        const btn = this.add.graphics().setDepth(10);
        btn.fillStyle(0x1a2540, 1);
        btn.fillRoundedRect(bx, by, btnW, btnH, 6);
        btn.lineStyle(1, tierColor, 0.6);
        btn.strokeRoundedRect(bx, by, btnW, btnH, 6);

        // Level number
        this.add.text(bx + btnW / 2, by + 14, `${lvl + 1}`, {
          fontSize: '16px',
          color: '#ffffff',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(11);

        // Subtitle (seed info)
        this.add.text(bx + btnW / 2, by + 34, `#${seed}`, {
          fontSize: '9px',
          color: '#667788',
          fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(11);

        // Hit zone
        const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.001)
          .setDepth(12);

        hitZone.on('pointerdown', () => {
          this.launchLevel(tier + 1, seed);
        });
      }
    }

    // Random level button
    const randY = startY + TIERS * rowHeight + 10;
    const randBtn = this.add.graphics().setDepth(10);
    randBtn.fillStyle(0x334466, 1);
    randBtn.fillRoundedRect(GAME_WIDTH / 2 - 100, randY, 200, 45, 8);
    randBtn.lineStyle(2, 0x66aaff, 0.8);
    randBtn.strokeRoundedRect(GAME_WIDTH / 2 - 100, randY, 200, 45, 8);

    this.add.text(GAME_WIDTH / 2, randY + 22, 'NIVEAU ALEATOIRE', {
      fontSize: '14px',
      color: '#66aaff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    const randHit = this.add.rectangle(GAME_WIDTH / 2, randY + 22, 200, 45)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(12);

    randHit.on('pointerdown', () => {
      const tier = Phaser.Math.Between(1, 5);
      this.launchLevel(tier, Date.now());
    });
  }

  private launchLevel(tier: number, seed: number): void {
    const config = DIFFICULTY_PRESETS[tier - 1];
    if (!config) return;

    const generator = new LevelGenerator();
    const validator = new LevelValidator();

    // Try up to 20 seeds to find a solvable level
    for (let attempt = 0; attempt < 20; attempt++) {
      const levelData = generator.generate(config, seed + attempt);
      const result = validator.validate(levelData);
      if (result.solvable) {
        this.scene.start('GameScene', { levelData });
        return;
      }
    }

    // Fallback: generate tier 1
    const fallback = generator.generate(DIFFICULTY_PRESETS[0] as DifficultyConfig, 42);
    this.scene.start('GameScene', { levelData: fallback });
  }
}
