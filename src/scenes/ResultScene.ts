import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { LevelData } from '@/levels/LevelData';
import { ScoringSystem, type LevelResult, type ScoreBreakdown } from '@/systems/ScoringSystem';
import { saveSystem } from '@/systems/SaveSystem';
import { AchievementSystem } from '@/systems/AchievementSystem';
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
  timeElapsed?: number;
  skillsUsed?: Record<string, number>;
  skillsAvailable?: Record<string, number>;
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

const RANK_COLORS: Readonly<Record<string, string>> = {
  S: '#ffd700',
  A: '#4488ff',
  B: '#44dd66',
  C: '#aaaaaa',
  F: '#dd4444',
};

const RANK_BG_COLORS: Readonly<Record<string, number>> = {
  S: 0x6b5a00,
  A: 0x1a3a6a,
  B: 0x1a5a2a,
  C: 0x3a3a3a,
  F: 0x5a1a1a,
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: unknown): void {
    const d: ResultSceneData = isResultSceneData(data)
      ? data
      : { saved: 0, dead: 0, total: 0, required: 1, levelName: '???', tier: 1 as const, won: false };

    const won = d.saved >= d.required;

    // Calculate score using ScoringSystem
    const levelResult: LevelResult = {
      levelId: d.levelData ? d.levelData.seed : 0,
      saved: d.saved,
      total: d.total,
      par: d.required,
      timeElapsed: d.timeElapsed ?? 0,
      timeLimit: 0, // No time limit by default
      skillsUsed: d.skillsUsed ?? {},
      skillsAvailable: d.skillsAvailable ?? {},
    };
    const score: ScoreBreakdown = ScoringSystem.calculate(levelResult);
    const stars = score.stars;

    // Check personal best
    let isNewRecord = false;
    if (d.levelData) {
      const levelKey = `${d.tier}-${d.levelData.seed}`;
      saveProgress(levelKey, stars);

      // Update save system with score data
      const levelId = d.levelData.seed;
      const previousProgress = saveSystem.getLevelProgress(levelId);
      const previousBest = previousProgress ? previousProgress.bestScore : 0;
      isNewRecord = score.totalScore > previousBest && won;

      saveSystem.updateLevelProgress(
        levelId,
        d.saved,
        d.total,
        d.timeElapsed ?? 0,
        score.totalScore,
        score.rank,
      );
      saveSystem.save();
    }

    // Check achievements
    const achievementSystem = new AchievementSystem();
    const newlyUnlocked = achievementSystem.checkAchievements(saveSystem.getData());
    for (const achievement of newlyUnlocked) {
      saveSystem.unlockAchievement(achievement.id);
    }
    if (newlyUnlocked.length > 0) {
      saveSystem.save();
    }

    // Dark overlay
    this.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, 0x060a14, 0.9).setDepth(0);

    // Panel - taller to fit score
    const pw = 440;
    const ph = 460;
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
    this.add.text(CX, py + 28, headerText, {
      fontSize: '22px', color: headerColor, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Level name
    this.add.text(CX, py + 52, d.levelName, {
      fontSize: '11px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);

    // Saved count
    this.add.text(CX, py + 80, `Sauves: ${d.saved} / ${d.total}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    const reqColor = d.saved >= d.required ? '#44dd66' : '#dd4444';
    this.add.text(CX, py + 105, `Requis: ${d.required}`, {
      fontSize: '13px', color: reqColor, fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);

    // Stars
    const starY = py + 145;
    const starR = 18;
    const starGap = 55;
    for (let i = 0; i < 3; i++) {
      const sx = CX + (i - 1) * starGap;
      this.drawStar(sx, starY, starR, i < stars);
    }

    // --- Score Breakdown ---
    const scoreY = py + 185;

    // Rank badge (large, on the left side)
    const rankX = px + 50;
    const rankColor = RANK_COLORS[score.rank] ?? '#aaaaaa';
    const rankBg = RANK_BG_COLORS[score.rank] ?? 0x333333;
    const rankG = this.add.graphics().setDepth(2);
    rankG.fillStyle(rankBg, 0.8);
    rankG.fillRoundedRect(rankX - 28, scoreY - 4, 56, 56, 8);
    rankG.lineStyle(2, Phaser.Display.Color.HexStringToColor(rankColor).color, 0.9);
    rankG.strokeRoundedRect(rankX - 28, scoreY - 4, 56, 56, 8);

    this.add.text(rankX, scoreY + 24, score.rank, {
      fontSize: '36px', color: rankColor, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    // Score details (right of rank)
    const detailX = px + 120;
    const lineH = 22;

    const saveScoreVal = Math.round(score.saveRatio * 500);
    this.add.text(detailX, scoreY + 4, `Sauvetage: ${saveScoreVal}`, {
      fontSize: '13px', color: '#ccddee', fontFamily: 'Arial',
    }).setDepth(2);

    this.add.text(detailX + 160, scoreY + 4, `Temps: ${Math.round(score.timeBonus)}`, {
      fontSize: '13px', color: '#ccddee', fontFamily: 'Arial',
    }).setDepth(2);

    this.add.text(detailX, scoreY + 4 + lineH, `Efficacite: ${Math.round(score.efficiencyBonus)}`, {
      fontSize: '13px', color: '#ccddee', fontFamily: 'Arial',
    }).setDepth(2);

    // Time display
    if (d.timeElapsed !== undefined && d.timeElapsed > 0) {
      this.add.text(detailX + 160, scoreY + 4 + lineH, `Chrono: ${formatTime(d.timeElapsed)}`, {
        fontSize: '13px', color: '#aabbcc', fontFamily: 'Arial',
      }).setDepth(2);
    }

    // Total score
    const totalScoreY = scoreY + 4 + lineH * 2 + 4;
    this.add.text(CX, totalScoreY, `Score: ${score.totalScore} / 1000`, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Score bar
    const barW = pw - 80;
    const barH = 8;
    const barX = CX - barW / 2;
    const barY = totalScoreY + 18;
    const barG = this.add.graphics().setDepth(2);
    barG.fillStyle(0x1e293b, 1);
    barG.fillRoundedRect(barX, barY, barW, barH, 4);
    const fillW = (score.totalScore / 1000) * barW;
    const barColor = Phaser.Display.Color.HexStringToColor(rankColor).color;
    barG.fillStyle(barColor, 0.8);
    barG.fillRoundedRect(barX, barY, fillW, barH, 4);

    // New record indicator
    const recordY = barY + 18;
    if (isNewRecord) {
      this.add.text(CX, recordY, 'Nouveau record !', {
        fontSize: '14px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(2);
    }

    // Achievement toast (show first newly unlocked)
    if (newlyUnlocked.length > 0) {
      const toastY = recordY + (isNewRecord ? 22 : 4);
      const firstAchievement = newlyUnlocked[0];
      if (firstAchievement) {
        const achieveText = `Succes debloque : ${firstAchievement.name}`;
        this.add.text(CX, toastY, achieveText, {
          fontSize: '12px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(2);

        if (newlyUnlocked.length > 1) {
          this.add.text(CX, toastY + 16, `+${newlyUnlocked.length - 1} autre(s)`, {
            fontSize: '10px', color: '#ccaa44', fontFamily: 'Arial',
          }).setOrigin(0.5).setDepth(2);
        }
      }
    }

    // Buttons
    const btnW = 160;
    const btnH = 44;
    const btnY = py + ph - btnH - 22;
    const btnGap = 16;

    this.createButton(CX - btnW - btnGap / 2, btnY, btnW, btnH, 'REJOUER', 0x1a3a6a, 0x4488cc, () => {
      this.scene.start('GameScene', { levelData: d.levelData });
    });

    this.createButton(CX + btnGap / 2, btnY, btnW, btnH, 'NIVEAUX', 0x1a2530, 0x445566, () => {
      this.scene.start('LevelSelectScene');
    });
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
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(bg, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, border, 0.9);
    g.strokeRoundedRect(x, y, w, h, 8);

    this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '16px', color: '#ccddee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);

    zone.on('pointerdown', () => { onTap(); });
  }
}
