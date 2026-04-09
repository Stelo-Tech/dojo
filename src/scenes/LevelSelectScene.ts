import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BG_COLOR_TOP,
  BG_COLOR_MID,
  BG_COLOR_BOTTOM,
} from '@/utils/Constants';
import { Button } from '@/ui/components/Button';

interface LevelEntry {
  readonly id: number;
  readonly name: string;
  readonly difficulty: 1 | 2 | 3;
  readonly unlocked: boolean;
}

/**
 * LevelSelectScene — grid of level buttons.
 * 5 hardcoded levels (will connect to LevelLoader in a later milestone).
 * Level 1 is always unlocked; subsequent levels are unlocked once the
 * previous one has been beaten (saved via localStorage key "level_<n>_done").
 */
export class LevelSelectScene extends Phaser.Scene {
  private readonly buttons: Button[] = [];
  private backButton: Button | null = null;

  private static readonly GRID_COLS = 5;
  private static readonly CELL_W = 120;
  private static readonly CELL_H = 90;
  private static readonly CELL_GAP = 16;
  private static readonly GRID_TOP = 130;

  /** Hardcoded level catalogue — replace with LevelLoader data later */
  private static readonly LEVELS: readonly Omit<LevelEntry, 'unlocked'>[] = [
    { id: 1, name: 'The Gap',       difficulty: 1 },
    { id: 2, name: 'High Walls',    difficulty: 1 },
    { id: 3, name: 'Deep Valley',   difficulty: 2 },
    { id: 4, name: 'The Gauntlet',  difficulty: 2 },
    { id: 5, name: 'Final Push',    difficulty: 3 },
  ];

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createLevelGrid();
    this.createBackButton();
  }

  private createBackground(): void {
    const bandH = Math.ceil(GAME_HEIGHT / 3);
    this.add.rectangle(GAME_WIDTH / 2, bandH / 2,               GAME_WIDTH, bandH,     BG_COLOR_TOP).setDepth(0);
    this.add.rectangle(GAME_WIDTH / 2, bandH + bandH / 2,        GAME_WIDTH, bandH,     BG_COLOR_MID).setDepth(0);
    this.add.rectangle(GAME_WIDTH / 2, bandH * 2 + bandH / 2,   GAME_WIDTH, bandH + 1, BG_COLOR_BOTTOM).setDepth(0);
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 50, 'SELECT LEVEL', {
        fontSize: '36px',
        color: '#00ff88',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private createLevelGrid(): void {
    const levels = this.buildLevelEntries();
    const cols = LevelSelectScene.GRID_COLS;
    const cw = LevelSelectScene.CELL_W;
    const ch = LevelSelectScene.CELL_H;
    const gap = LevelSelectScene.CELL_GAP;
    const totalW = cols * cw + (cols - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cw / 2;
    const startY = LevelSelectScene.GRID_TOP + ch / 2;

    for (let i = 0; i < levels.length; i++) {
      const entry = levels[i];
      if (entry === undefined) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cw + gap);
      const cy = startY + row * (ch + gap);

      this.createLevelCell(entry, cx, cy, cw, ch);
    }
  }

  private createLevelCell(entry: LevelEntry, cx: number, cy: number, cw: number, ch: number): void {
    if (entry.unlocked) {
      const btn = new Button(this, {
        x: cx,
        y: cy,
        width: cw,
        height: ch,
        text: `${entry.id}`,
        fontSize: 22,
        bgColor: 0x1a3a5a,
        hoverColor: 0x2a5a8a,
        pressColor: 0x0a1a3a,
        onClick: () => {
          this.scene.start('GameScene', { levelId: entry.id });
        },
      });
      this.buttons.push(btn);

      // Level name beneath the number
      this.add
        .text(cx, cy + 22, entry.name, {
          fontSize: '11px',
          color: '#aaaaaa',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5, 0)
        .setDepth(20);

      // Difficulty stars above the number
      this.add
        .text(cx, cy - 30, this.starsText(entry.difficulty), {
          fontSize: '14px',
          color: '#ffcc00',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5, 0)
        .setDepth(20);
    } else {
      // Locked cell — drawn as a dimmed graphics panel, no button
      const gfx = this.add.graphics().setDepth(15);
      gfx.fillStyle(0x111111, 0.8);
      gfx.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 8);
      gfx.lineStyle(2, 0x333333, 1);
      gfx.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 8);

      // Lock icon text substitute
      this.add
        .text(cx, cy - 8, 'LOCKED', {
          fontSize: '13px',
          color: '#555555',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(20);

      this.add
        .text(cx, cy + 14, `Level ${entry.id}`, {
          fontSize: '11px',
          color: '#444444',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setDepth(20);
    }
  }

  private createBackButton(): void {
    this.backButton = new Button(this, {
      x: 70,
      y: GAME_HEIGHT - 36,
      width: 120,
      height: 48,
      text: 'Back',
      fontSize: 16,
      bgColor: 0x333333,
      hoverColor: 0x555555,
      pressColor: 0x222222,
      onClick: () => {
        this.scene.start('MenuScene');
      },
    });
  }

  /** Build level entries with unlock state from localStorage */
  private buildLevelEntries(): LevelEntry[] {
    return LevelSelectScene.LEVELS.map((lvl, idx) => {
      const unlocked = idx === 0 || this.isLevelComplete(idx); // level N unlocked if level N-1 done
      return { ...lvl, unlocked };
    });
  }

  /**
   * Check localStorage for level completion flag.
   * Key format: "lemmings_level_<id>_done"
   */
  private isLevelComplete(levelIndex: number): boolean {
    const prevLevel = LevelSelectScene.LEVELS[levelIndex - 1];
    if (prevLevel === undefined) return false;
    try {
      return localStorage.getItem(`lemmings_level_${prevLevel.id}_done`) === 'true';
    } catch {
      // localStorage may be unavailable (private browsing, etc.)
      return false;
    }
  }

  private starsText(difficulty: 1 | 2 | 3): string {
    return '*'.repeat(difficulty) + ' '.repeat(3 - difficulty);
  }

  shutdown(): void {
    for (const btn of this.buttons) {
      btn.destroy();
    }
    this.buttons.length = 0;
    if (this.backButton !== null) {
      this.backButton.destroy();
      this.backButton = null;
    }
  }
}
