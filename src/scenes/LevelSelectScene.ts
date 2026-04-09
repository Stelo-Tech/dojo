import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import { DifficultyConfig } from '@/levels/LevelData';

const LEVELS_PER_TIER = 6;

const TIERS = [
  { name: 'Tutoriel', color: 0x4ade80, lemmings: 10 },
  { name: 'Facile',   color: 0x60a5fa, lemmings: 15 },
  { name: 'Normal',   color: 0xfbbf24, lemmings: 20 },
  { name: 'Difficile', color: 0xf97316, lemmings: 25 },
  { name: 'Expert',   color: 0xef4444, lemmings: 30 },
];

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem('lemmings_progress');
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch { /* ignore */ }
  return {};
}

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

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a).setDepth(0);

    // Scrollable content area — we build everything in a container
    const contentY = 8;

    // Title bar
    this.add.rectangle(GAME_WIDTH / 2, contentY + 20, GAME_WIDTH - 40, 36, 0x1e293b, 0.8)
      .setDepth(1);
    this.add.text(GAME_WIDTH / 2, contentY + 20, 'Niveaux', {
      fontSize: '18px', color: '#e2e8f0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Layout: horizontal scrollable tiers
    const tierStartY = contentY + 52;
    const tierH = 80;
    const tierGap = 6;

    for (let t = 0; t < TIERS.length; t++) {
      const tier = TIERS[t];
      if (!tier) continue;
      const rowY = tierStartY + t * (tierH + tierGap);

      this.buildTierRow(t + 1, tier.name, tier.color, tier.lemmings, rowY, tierH, progress);
    }

    // Bottom: random button
    const bottomY = tierStartY + TIERS.length * (tierH + tierGap) + 4;
    this.buildRandomButton(bottomY);
  }

  private buildTierRow(
    tierNum: number, name: string, color: number, lemmings: number,
    y: number, h: number, progress: Record<string, number>,
  ): void {
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    // Row background
    const rowBg = this.add.graphics().setDepth(1);
    rowBg.fillStyle(0x1e293b, 0.5);
    rowBg.fillRoundedRect(16, y, GAME_WIDTH - 32, h, 10);

    // Tier label (left side)
    const labelX = 30;
    this.add.text(labelX, y + 16, name, {
      fontSize: '14px', color: colorHex, fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(2);

    // Sub info
    this.add.text(labelX, y + 36, `${lemmings} lemmings`, {
      fontSize: '10px', color: '#64748b', fontFamily: 'Arial',
    }).setDepth(2);

    // Total stars for this tier
    let totalStars = 0;
    const maxStars = LEVELS_PER_TIER * 3;
    for (let lvl = 0; lvl < LEVELS_PER_TIER; lvl++) {
      const seed = tierNum * 1000 + lvl;
      totalStars += progress[`${tierNum}-${seed}`] ?? 0;
    }
    this.drawMiniStar(labelX + 4, y + 56, 5, true);
    this.add.text(labelX + 14, y + 56, `${totalStars}/${maxStars}`, {
      fontSize: '10px', color: '#94a3b8', fontFamily: 'Arial',
    }).setOrigin(0, 0.5).setDepth(2);

    // Level cards (right side)
    const cardsStartX = 120;
    const cardW = 58;
    const cardH = h - 12;
    const cardGap = 8;

    for (let lvl = 0; lvl < LEVELS_PER_TIER; lvl++) {
      const cx = cardsStartX + lvl * (cardW + cardGap);
      const cy = y + 6;
      const seed = tierNum * 1000 + lvl;
      const levelKey = `${tierNum}-${seed}`;
      const stars = progress[levelKey] ?? 0;

      this.buildCard(cx, cy, cardW, cardH, lvl + 1, stars, color, tierNum, seed);
    }
  }

  private buildCard(
    x: number, y: number, w: number, h: number,
    num: number, stars: number, color: number, tier: number, seed: number,
  ): void {
    const g = this.add.graphics().setDepth(2);
    const completed = stars > 0;

    // Card body
    g.fillStyle(completed ? 0x1e3a5f : 0x0f1729, 1);
    g.fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(1.5, color, completed ? 0.7 : 0.25);
    g.strokeRoundedRect(x, y, w, h, 6);

    // Completion accent line at top
    if (completed) {
      g.fillStyle(color, 0.4);
      g.fillRect(x + 4, y + 2, w - 8, 2);
    }

    // Level number
    this.add.text(x + w / 2, y + h / 2 - 8, `${num}`, {
      fontSize: '20px', color: completed ? '#ffffff' : '#94a3b8',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    // 3 mini stars at bottom of card
    const starY = y + h - 12;
    const starGap = 12;
    const starStartX = x + w / 2 - starGap;
    for (let s = 0; s < 3; s++) {
      this.drawMiniStar(starStartX + s * starGap, starY, 4, s < stars);
    }

    // Interactive
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true }).setDepth(4);

    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x233a5a, 1);
      g.fillRoundedRect(x, y, w, h, 6);
      g.lineStyle(2, color, 0.9);
      g.strokeRoundedRect(x, y, w, h, 6);
    });

    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(completed ? 0x1e3a5f : 0x0f1729, 1);
      g.fillRoundedRect(x, y, w, h, 6);
      g.lineStyle(1.5, color, completed ? 0.7 : 0.25);
      g.strokeRoundedRect(x, y, w, h, 6);
      if (completed) {
        g.fillStyle(color, 0.4);
        g.fillRect(x + 4, y + 2, w - 8, 2);
      }
    });

    zone.on('pointerdown', () => { this.launchLevel(tier, seed); });
  }

  private drawMiniStar(cx: number, cy: number, r: number, filled: boolean): void {
    const g = this.add.graphics().setDepth(3);
    const innerR = r * 0.4;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : innerR;
      pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    g.fillStyle(filled ? 0xfbbf24 : 0x334155, 1);
    g.fillPoints(pts, true);
  }

  private buildRandomButton(y: number): void {
    const bw = 200;
    const bh = 36;
    const bx = GAME_WIDTH / 2 - bw / 2;

    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x1e293b, 1);
    g.fillRoundedRect(bx, y, bw, bh, 8);
    g.lineStyle(1.5, 0x3b82f6, 0.6);
    g.strokeRoundedRect(bx, y, bw, bh, 8);

    this.add.text(GAME_WIDTH / 2, y + bh / 2, 'Niveau aleatoire', {
      fontSize: '13px', color: '#60a5fa', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    const zone = this.add.zone(GAME_WIDTH / 2, y + bh / 2, bw, bh)
      .setInteractive({ useHandCursor: true }).setDepth(3);

    zone.on('pointerdown', () => {
      this.launchLevel(Phaser.Math.Between(1, 5), Date.now());
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
