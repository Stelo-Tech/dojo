import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { DailyChallengeSystem } from '@/systems/DailyChallengeSystem';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import { DifficultyConfig } from '@/levels/LevelData';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // Background
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a);

    // Title
    this.add.text(cx, 80, 'LEMMINGS', {
      fontSize: '56px',
      color: '#00ff88',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 130, 'Sauve-les tous !', {
      fontSize: '16px',
      color: '#64748b',
      fontFamily: 'Arial',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Menu buttons
    const buttonY = 200;
    const buttonGap = 56;

    this.createMenuButton(cx, buttonY, 'JOUER', 0x22c55e, () => {
      this.scene.start('LevelSelectScene');
    });

    // Daily challenge
    const streak = DailyChallengeSystem.getStreak();
    const dailyLabel = DailyChallengeSystem.isCompleted()
      ? `DEFI DU JOUR (fait - serie: ${streak})`
      : `DEFI DU JOUR (serie: ${streak})`;

    this.createMenuButton(cx, buttonY + buttonGap, dailyLabel, 0xf59e0b, () => {
      this.launchDailyChallenge();
    });

    this.createMenuButton(cx, buttonY + buttonGap * 2, 'SUCCES', 0x8b5cf6, () => {
      this.scene.start('AchievementsScene');
    });

    // Stats display at bottom
    this.createStatsPanel(cx, GAME_HEIGHT - 60);
  }

  private createMenuButton(x: number, y: number, text: string, color: number, onClick: () => void): void {
    const w = 280;
    const h = 44;

    const g = this.add.graphics();
    g.fillStyle(0x1e293b, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(2, color, 0.7);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
    this.add.text(x, y, text, {
      fontSize: '15px',
      color: colorHex,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x2a3a5a, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      g.lineStyle(2, color, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });

    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x1e293b, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      g.lineStyle(2, color, 0.7);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });

    zone.on('pointerdown', onClick);
  }

  private createStatsPanel(x: number, y: number): void {
    try {
      const raw = localStorage.getItem('lemmings_progress');
      const progress = raw ? JSON.parse(raw) as Record<string, number> : {};
      const totalStars = Object.values(progress).reduce((sum, s) => sum + s, 0);
      const levelsCompleted = Object.values(progress).filter(s => s > 0).length;

      this.add.text(x, y, `${totalStars} etoiles | ${levelsCompleted} niveaux completes`, {
        fontSize: '12px',
        color: '#475569',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    } catch {
      // ignore
    }
  }

  private launchDailyChallenge(): void {
    const seed = DailyChallengeSystem.getTodaySeed();
    const tier = DailyChallengeSystem.getTodayTier();
    const config = DIFFICULTY_PRESETS[tier - 1];
    if (!config) return;

    const generator = new LevelGenerator();
    const validator = new LevelValidator();

    for (let attempt = 0; attempt < 20; attempt++) {
      const levelData = generator.generate(config, seed + attempt);
      const result = validator.validate(levelData);
      if (result.solvable) {
        this.scene.start('GameScene', { levelData, isDaily: true });
        return;
      }
    }

    const fallback = generator.generate(DIFFICULTY_PRESETS[0] as DifficultyConfig, seed);
    this.scene.start('GameScene', { levelData: fallback, isDaily: true });
  }
}
