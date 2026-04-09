import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import { DifficultyConfig } from '@/levels/LevelData';

const TIERS = 5;
const LEVELS_PER_TIER = 6;

const TIER_NAMES = ['Tutoriel', 'Facile', 'Normal', 'Difficile', 'Expert'];
const TIER_COLORS = [0x44dd66, 0x55bbff, 0xffcc22, 0xff8844, 0xff4444];
const TIER_ICONS = ['?', '~', '!', '!!', '!!!'];

/** Load star progress from localStorage */
function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem('lemmings_progress');
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch { /* ignore */ }
  return {};
}

/** Save star progress */
export function saveProgress(levelKey: string, stars: number): void {
  const progress = loadProgress();
  const current = progress[levelKey] ?? 0;
  if (stars > current) {
    progress[levelKey] = stars;
    try { localStorage.setItem('lemmings_progress', JSON.stringify(progress)); } catch { /* ignore */ }
  }
}

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    const progress = loadProgress();

    // Background gradient
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x080c18, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(0x0d1530, 0.6);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 2);

    // Title
    this.add.text(GAME_WIDTH / 2, 28, 'CHOISIR UN NIVEAU', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    // Grid layout
    const marginLeft = 30;
    const labelW = 85;
    const cardW = 68;
    const cardH = 62;
    const cardGapX = 8;
    const cardGapY = 6;
    const startY = 58;
    const rowH = cardH + cardGapY + 18; // card + gap + tier label space

    for (let tier = 0; tier < TIERS; tier++) {
      const tierColor = TIER_COLORS[tier] ?? 0xffffff;
      const tierName = TIER_NAMES[tier] ?? '';
      const colorHex = `#${tierColor.toString(16).padStart(6, '0')}`;
      const rowY = startY + tier * rowH;

      // Tier label + icon
      this.add.text(marginLeft, rowY + cardH / 2, tierName, {
        fontSize: '13px', color: colorHex, fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(1);

      // Tier difficulty dots
      const dots = TIER_ICONS[tier] ?? '';
      this.add.text(marginLeft, rowY + cardH / 2 + 14, dots, {
        fontSize: '10px', color: colorHex, fontFamily: 'Arial',
      }).setOrigin(0, 0.5).setDepth(1).setAlpha(0.6);

      // Level cards
      for (let lvl = 0; lvl < LEVELS_PER_TIER; lvl++) {
        const cx = marginLeft + labelW + lvl * (cardW + cardGapX);
        const cy = rowY;
        const seed = (tier + 1) * 1000 + lvl;
        const levelKey = `${tier + 1}-${seed}`;
        const starCount = progress[levelKey] ?? 0;

        this.createLevelCard(cx, cy, cardW, cardH, lvl + 1, starCount, tierColor, tier + 1, seed);
      }
    }

    // Random button at bottom
    const randY = startY + TIERS * rowH + 4;
    this.createRandomButton(randY);
  }

  private createLevelCard(
    x: number, y: number, w: number, h: number,
    num: number, stars: number, color: number, tier: number, seed: number,
  ): void {
    const g = this.add.graphics().setDepth(1);

    // Card background
    g.fillStyle(0x141e30, 1);
    g.fillRoundedRect(x, y, w, h, 8);

    // Subtle border
    g.lineStyle(1.5, color, stars > 0 ? 0.8 : 0.3);
    g.strokeRoundedRect(x, y, w, h, 8);

    // Completed indicator — subtle top accent
    if (stars > 0) {
      g.fillStyle(color, 0.1);
      g.fillRoundedRect(x + 1, y + 1, w - 2, 16, { tl: 7, tr: 7, bl: 0, br: 0 });
    }

    // Level number
    this.add.text(x + w / 2, y + 18, `${num}`, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // 3 mini stars
    const starY = y + h - 14;
    const starGap = 14;
    const starStartX = x + w / 2 - starGap;
    for (let s = 0; s < 3; s++) {
      const sx = starStartX + s * starGap;
      this.drawMiniStar(sx, starY, 5, s < stars);
    }

    // Interactive zone
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x1a2a44, 1);
      g.fillRoundedRect(x, y, w, h, 8);
      g.lineStyle(2, color, 0.9);
      g.strokeRoundedRect(x, y, w, h, 8);
    });

    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x141e30, 1);
      g.fillRoundedRect(x, y, w, h, 8);
      g.lineStyle(1.5, color, stars > 0 ? 0.8 : 0.3);
      g.strokeRoundedRect(x, y, w, h, 8);
      if (stars > 0) {
        g.fillStyle(color, 0.1);
        g.fillRoundedRect(x + 1, y + 1, w - 2, 16, { tl: 7, tr: 7, bl: 0, br: 0 });
      }
    });

    zone.on('pointerdown', () => {
      this.launchLevel(tier, seed);
    });
  }

  private drawMiniStar(cx: number, cy: number, r: number, filled: boolean): void {
    const g = this.add.graphics().setDepth(2);
    const innerR = r * 0.4;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : innerR;
      pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    if (filled) {
      g.fillStyle(0xffd700, 1);
    } else {
      g.fillStyle(0x2a3040, 1);
    }
    g.fillPoints(pts, true);
  }

  private createRandomButton(y: number): void {
    const bw = 220;
    const bh = 40;
    const bx = GAME_WIDTH / 2 - bw / 2;

    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x1a2a44, 1);
    g.fillRoundedRect(bx, y, bw, bh, 10);
    g.lineStyle(1.5, 0x4488cc, 0.7);
    g.strokeRoundedRect(bx, y, bw, bh, 10);

    this.add.text(GAME_WIDTH / 2, y + bh / 2, 'NIVEAU ALEATOIRE', {
      fontSize: '13px', color: '#66aaff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    const zone = this.add.zone(GAME_WIDTH / 2, y + bh / 2, bw, bh)
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    zone.on('pointerdown', () => {
      const tier = Phaser.Math.Between(1, 5);
      this.launchLevel(tier, Date.now());
    });
  }

  private launchLevel(tier: number, seed: number): void {
    const config = DIFFICULTY_PRESETS[tier - 1];
    if (!config) return;

    const generator = new LevelGenerator();
    const validator = new LevelValidator();

    for (let attempt = 0; attempt < 20; attempt++) {
      const levelData = generator.generate(config, seed + attempt);
      const result = validator.validate(levelData);
      if (result.solvable) {
        this.scene.start('GameScene', { levelData });
        return;
      }
    }

    const fallback = generator.generate(DIFFICULTY_PRESETS[0] as DifficultyConfig, 42);
    this.scene.start('GameScene', { levelData: fallback });
  }
}
