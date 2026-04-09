import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { LevelData } from '@/levels/LevelData';
import { saveProgress } from '@/scenes/LevelSelectScene';

export interface ResultSceneData {
  saved: number;
  dead: number;
  total: number;
  required: number;
  levelName: string;
  tier: 1 | 2 | 3 | 4 | 5;
  won: boolean;
  levelData?: LevelData;
}

function isResultSceneData(value: unknown): value is ResultSceneData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['saved'] === 'number' &&
    typeof v['total'] === 'number' &&
    typeof v['required'] === 'number' &&
    typeof v['levelName'] === 'string' &&
    typeof v['won'] === 'boolean'
  );
}

const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: unknown): void {
    const d: ResultSceneData = isResultSceneData(data)
      ? data
      : { saved: 0, dead: 0, total: 0, required: 1, levelName: '???', tier: 1 as const, won: false };

    const won = d.saved >= d.required;
    const stars = this.getStars(d.saved, d.total, d.required);

    // Save progression
    if (d.levelData) {
      const levelKey = `${d.tier}-${d.levelData.seed}`;
      saveProgress(levelKey, stars);
    }

    // Dark overlay
    this.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, 0x060a14, 0.9).setDepth(0);

    // Panel
    const pw = 400;
    const ph = 340;
    const px = CX - pw / 2;
    const py = CY - ph / 2;
    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(px + 4, py + 4, pw, ph, 12);
    panel.fillStyle(0x111827, 1);
    panel.fillRoundedRect(px, py, pw, ph, 12);
    panel.lineStyle(2, won ? 0x44dd66 : 0xdd4444, 0.9);
    panel.strokeRoundedRect(px, py, pw, ph, 12);

    // Header
    const headerColor = won ? '#44dd66' : '#dd4444';
    const headerText = won ? 'NIVEAU REUSSI !' : 'NIVEAU ECHOUE';
    this.add.text(CX, py + 30, headerText, {
      fontSize: '24px', color: headerColor, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Level name
    this.add.text(CX, py + 60, d.levelName, {
      fontSize: '12px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);

    // Score
    this.add.text(CX, py + 95, `Sauves: ${d.saved} / ${d.total}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    const reqColor = d.saved >= d.required ? '#44dd66' : '#dd4444';
    this.add.text(CX, py + 125, `Requis: ${d.required}`, {
      fontSize: '14px', color: reqColor, fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);

    // Stars
    const starY = py + 180;
    const starR = 20;
    const starGap = 60;
    for (let i = 0; i < 3; i++) {
      const sx = CX + (i - 1) * starGap;
      this.drawStar(sx, starY, starR, i < stars);
    }

    // Buttons — simple rectangles with direct interactive
    const btnW = 160;
    const btnH = 46;
    const btnY = py + ph - btnH - 24;
    const btnGap = 16;

    this.createButton(CX - btnW - btnGap / 2, btnY, btnW, btnH, 'REJOUER', 0x1a3a6a, 0x4488cc, () => {
      this.scene.start('GameScene', { levelData: d.levelData });
    });

    this.createButton(CX + btnGap / 2, btnY, btnW, btnH, 'NIVEAUX', 0x1a2530, 0x445566, () => {
      this.scene.start('LevelSelectScene');
    });
  }

  private getStars(saved: number, total: number, required: number): 0 | 1 | 2 | 3 {
    if (saved < required) return 0;
    if (total > 0 && saved === total) return 3;
    if (total > 0 && saved >= Math.ceil(total * 0.8)) return 2;
    return 1;
  }

  private drawStar(cx: number, cy: number, r: number, filled: boolean): void {
    const g = this.add.graphics().setDepth(3);
    const innerR = r * 0.4;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : innerR;
      pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    if (filled) {
      g.fillStyle(0xffd700, 1);
      g.fillPoints(pts, true);
    } else {
      g.fillStyle(0x334466, 1);
      g.fillPoints(pts, true);
      g.lineStyle(1, 0x556688, 0.6);
      g.strokePoints(pts, true);
    }
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, bg: number, border: number, onTap: () => void,
  ): void {
    // Visual button
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(bg, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, border, 0.9);
    g.strokeRoundedRect(x, y, w, h, 8);

    // Label
    this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '16px', color: '#ccddee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    // Interactive zone — same position, no animation offset
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);

    zone.on('pointerdown', () => { onTap(); });
  }
}
