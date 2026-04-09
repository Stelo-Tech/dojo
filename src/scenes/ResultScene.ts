import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BG_COLOR_TOP,
  BG_COLOR_MID,
  BG_COLOR_BOTTOM,
} from '@/utils/Constants';
import { Button } from '@/ui/components/Button';

export interface ResultData {
  levelId: number;
  saved: number;
  total: number;
  par: number;
  time: number; // seconds elapsed
}

/**
 * ResultScene — shown after a level ends (complete or failed).
 *
 * Star rating rules:
 *   3 stars → 100% lemmings saved
 *   2 stars → 75%+ saved AND par met
 *   1 star  → par met (saved >= par)
 *   0 stars → failed (saved < par)
 */
export class ResultScene extends Phaser.Scene {
  private nextButton: Button | null = null;
  private retryButton: Button | null = null;
  private selectButton: Button | null = null;

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: unknown): void {
    const result = this.parseData(data);

    this.createBackground();
    this.createHeader(result);
    this.createStats(result);
    this.createStars(result);
    this.createButtons(result);

    // Persist completion to unlock next level in LevelSelectScene
    if (result.saved >= result.par) {
      this.markLevelComplete(result.levelId);
    }
  }

  private createBackground(): void {
    const bandH = Math.ceil(GAME_HEIGHT / 3);
    this.add.rectangle(GAME_WIDTH / 2, bandH / 2,               GAME_WIDTH, bandH,     BG_COLOR_TOP).setDepth(0);
    this.add.rectangle(GAME_WIDTH / 2, bandH + bandH / 2,        GAME_WIDTH, bandH,     BG_COLOR_MID).setDepth(0);
    this.add.rectangle(GAME_WIDTH / 2, bandH * 2 + bandH / 2,   GAME_WIDTH, bandH + 1, BG_COLOR_BOTTOM).setDepth(0);
  }

  private createHeader(result: ResultData): void {
    const passed = result.saved >= result.par;
    const title = passed ? 'LEVEL COMPLETE!' : 'LEVEL FAILED';
    const color = passed ? '#00ff88' : '#ff4444';

    this.add
      .text(GAME_WIDTH / 2, 60, title, {
        fontSize: '40px',
        color,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private createStats(result: ResultData): void {
    const cx = GAME_WIDTH / 2;
    const startY = 150;
    const lineH = 36;

    const lines: string[] = [
      `Saved:  ${result.saved} / ${result.total}`,
      `Par:    ${result.par}`,
      `Time:   ${this.formatTime(result.time)}`,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      this.add
        .text(cx, startY + i * lineH, line, {
          fontSize: '22px',
          color: '#ffffff',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setDepth(10);
    }
  }

  private createStars(result: ResultData): void {
    const starCount = this.calculateStars(result);
    const cx = GAME_WIDTH / 2;
    const cy = 310;
    const starSpacing = 60;
    const starSize = 36;

    for (let i = 0; i < 3; i++) {
      const filled = i < starCount;
      const sx = cx + (i - 1) * starSpacing;
      // Star drawn as a circle to avoid Phaser polygon complexity;
      // replace with star polygon asset when artist delivers sprites
      const gfx = this.add.graphics().setDepth(10);
      if (filled) {
        gfx.fillStyle(0xffcc00, 1);
      } else {
        gfx.fillStyle(0x333333, 1);
        gfx.lineStyle(2, 0x666666, 1);
      }
      gfx.fillCircle(sx, cy, starSize / 2);
      if (!filled) {
        gfx.strokeCircle(sx, cy, starSize / 2);
      }

      this.add
        .text(sx, cy, filled ? '*' : 'o', {
          fontSize: '28px',
          color: filled ? '#ffe066' : '#555555',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(11);
    }
  }

  private createButtons(result: ResultData): void {
    const passed = result.saved >= result.par;
    const cx = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT - 55;
    const btnW = 160;
    const btnH = 52;
    const gap = 20;

    if (passed) {
      // Three buttons: Next Level | Retry | Level Select
      const totalW = btnW * 3 + gap * 2;
      const startX = cx - totalW / 2 + btnW / 2;

      this.nextButton = new Button(this, {
        x: startX,
        y: btnY,
        width: btnW,
        height: btnH,
        text: 'Next Level',
        fontSize: 16,
        bgColor: 0x2a7a2a,
        hoverColor: 0x3aaa3a,
        pressColor: 0x1a5a1a,
        onClick: () => {
          this.scene.start('GameScene', { levelId: result.levelId + 1 });
        },
      });

      this.retryButton = new Button(this, {
        x: startX + btnW + gap,
        y: btnY,
        width: btnW,
        height: btnH,
        text: 'Retry',
        fontSize: 16,
        bgColor: 0x2a5a8a,
        hoverColor: 0x4a90d9,
        pressColor: 0x1a3a5a,
        onClick: () => {
          this.scene.start('GameScene', { levelId: result.levelId });
        },
      });

      this.selectButton = new Button(this, {
        x: startX + (btnW + gap) * 2,
        y: btnY,
        width: btnW,
        height: btnH,
        text: 'Level Select',
        fontSize: 16,
        bgColor: 0x555555,
        hoverColor: 0x777777,
        pressColor: 0x333333,
        onClick: () => {
          this.scene.start('LevelSelectScene');
        },
      });
    } else {
      // Two buttons: Retry | Level Select
      const totalW = btnW * 2 + gap;
      const startX = cx - totalW / 2 + btnW / 2;

      this.retryButton = new Button(this, {
        x: startX,
        y: btnY,
        width: btnW,
        height: btnH,
        text: 'Retry',
        fontSize: 16,
        bgColor: 0x2a5a8a,
        hoverColor: 0x4a90d9,
        pressColor: 0x1a3a5a,
        onClick: () => {
          this.scene.start('GameScene', { levelId: result.levelId });
        },
      });

      this.selectButton = new Button(this, {
        x: startX + btnW + gap,
        y: btnY,
        width: btnW,
        height: btnH,
        text: 'Level Select',
        fontSize: 16,
        bgColor: 0x555555,
        hoverColor: 0x777777,
        pressColor: 0x333333,
        onClick: () => {
          this.scene.start('LevelSelectScene');
        },
      });
    }
  }

  /** Star rating: 3 → 100%, 2 → 75%+, 1 → par met, 0 → failed */
  private calculateStars(result: ResultData): number {
    if (result.total === 0) return 0;
    if (result.saved < result.par) return 0;
    const ratio = result.saved / result.total;
    if (ratio >= 1) return 3;
    if (ratio >= 0.75) return 2;
    return 1;
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Persist level completion so LevelSelectScene can unlock the next level.
   * Key: "lemmings_level_<id>_done" = "true"
   */
  private markLevelComplete(levelId: number): void {
    try {
      localStorage.setItem(`lemmings_level_${levelId}_done`, 'true');
    } catch {
      // localStorage may be unavailable — silently ignore
    }
  }

  /**
   * Parse scene data passed via this.scene.start('ResultScene', data).
   * Phaser passes scene init data as a plain object; we validate the shape
   * here rather than using `as` casting.
   */
  private parseData(raw: unknown): ResultData {
    if (
      raw !== null &&
      typeof raw === 'object' &&
      'levelId' in raw &&
      'saved' in raw &&
      'total' in raw &&
      'par' in raw &&
      'time' in raw &&
      typeof (raw as Record<string, unknown>)['levelId'] === 'number' &&
      typeof (raw as Record<string, unknown>)['saved'] === 'number' &&
      typeof (raw as Record<string, unknown>)['total'] === 'number' &&
      typeof (raw as Record<string, unknown>)['par'] === 'number' &&
      typeof (raw as Record<string, unknown>)['time'] === 'number'
    ) {
      const r = raw as Record<string, number>;
      return {
        levelId: r['levelId'] ?? 1,
        saved: r['saved'] ?? 0,
        total: r['total'] ?? 0,
        par: r['par'] ?? 0,
        time: r['time'] ?? 0,
      };
    }
    // Fallback — should never happen in production but keeps the scene safe
    return { levelId: 1, saved: 0, total: 0, par: 1, time: 0 };
  }

  shutdown(): void {
    if (this.nextButton !== null) {
      this.nextButton.destroy();
      this.nextButton = null;
    }
    if (this.retryButton !== null) {
      this.retryButton.destroy();
      this.retryButton = null;
    }
    if (this.selectButton !== null) {
      this.selectButton.destroy();
      this.selectButton = null;
    }
  }
}
