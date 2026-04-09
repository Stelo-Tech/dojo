import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { LevelData } from '@/levels/LevelData';

/** Data passed to ResultScene via scene.start() */
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

/** Guard: ensure an object conforms to ResultSceneData */
function isResultSceneData(value: unknown): value is ResultSceneData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['saved'] === 'number' &&
    typeof v['dead'] === 'number' &&
    typeof v['total'] === 'number' &&
    typeof v['required'] === 'number' &&
    typeof v['levelName'] === 'string' &&
    (v['tier'] === 1 || v['tier'] === 2 || v['tier'] === 3 || v['tier'] === 4 || v['tier'] === 5) &&
    typeof v['won'] === 'boolean'
  );
}

// ─── Design tokens (consistent with the rest of the project) ────────────────
const COLOR_BG_OVERLAY = 0x060a14;
const COLOR_PANEL = 0x111827;
const COLOR_PANEL_BORDER_WIN = 0x44dd66;
const COLOR_PANEL_BORDER_LOSE = 0xdd4444;
const COLOR_SUCCESS = 0x44dd66;
const COLOR_DANGER = 0xdd4444;
const COLOR_STAR_FILLED = 0xffd700;
const COLOR_STAR_OUTLINE = 0x334466;
const COLOR_BTN_PRIMARY = 0x1a3a6a;
const COLOR_BTN_PRIMARY_BORDER = 0x4488cc;
const COLOR_BTN_SECONDARY = 0x1a2530;
const COLOR_BTN_SECONDARY_BORDER = 0x334466;
const COLOR_TEXT_DIM = 0xaaaaaa;

/** Panel dimensions */
const PANEL_W = 480;
const PANEL_H = 320;
const PANEL_X = GAME_WIDTH / 2 - PANEL_W / 2;
const PANEL_Y = GAME_HEIGHT / 2 - PANEL_H / 2;
const PANEL_RADIUS = 14;

/** Button dimensions — tall enough for thumb tap (≥ 44px) */
const BTN_W = 180;
const BTN_H = 52;
const BTN_RADIUS = 10;
const BTN_Y = PANEL_Y + PANEL_H - BTN_H - 20;
const BTN_LEFT_X = GAME_WIDTH / 2 - BTN_W - 14;
const BTN_RIGHT_X = GAME_WIDTH / 2 + 14;

/** Star dimensions */
const STAR_SIZE = 30;
const STAR_SPACING = 20;

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: unknown): void {
    // Validate incoming data; fall back to a safe default
    const sceneData: ResultSceneData = isResultSceneData(data)
      ? data
      : { saved: 0, dead: 0, total: 0, required: 1, levelName: '???', tier: 1, won: false };

    const { saved, total, required, levelName, won } = sceneData;

    // Star count: 1 = reached minimum, 2 = ≥ 80%, 3 = 100%
    const starCount = this.computeStars(saved, total, required, won);

    this.buildBackground();
    this.buildPanel(won);
    this.buildHeader(won, levelName);
    this.buildScore(saved, required, total);
    this.buildStars(starCount);
    this.buildButtons(sceneData);
    this.animatePanelEntrance();
  }

  // ─── Star computation ───────────────────────────────────────────────────────

  private computeStars(
    saved: number,
    total: number,
    required: number,
    won: boolean,
  ): 0 | 1 | 2 | 3 {
    if (!won || saved < required) return 0;
    if (total > 0 && saved === total) return 3;
    if (total > 0 && saved >= Math.ceil(total * 0.8)) return 2;
    return 1;
  }

  // ─── Visual builders ────────────────────────────────────────────────────────

  private buildBackground(): void {
    // Full-screen dark overlay
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLOR_BG_OVERLAY, 0.88)
      .setDepth(100);
  }

  private buildPanel(won: boolean): void {
    const borderColor = won ? COLOR_PANEL_BORDER_WIN : COLOR_PANEL_BORDER_LOSE;
    const g = this.add.graphics().setDepth(101).setAlpha(0);

    // Panel shadow
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(PANEL_X + 6, PANEL_Y + 8, PANEL_W, PANEL_H, PANEL_RADIUS);

    // Panel body
    g.fillStyle(COLOR_PANEL, 1);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);

    // Panel border
    g.lineStyle(2, borderColor, 0.85);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);

    // Subtle top accent strip
    g.fillStyle(borderColor, 0.12);
    g.fillRoundedRect(PANEL_X + 2, PANEL_Y + 2, PANEL_W - 4, 36, { tl: PANEL_RADIUS - 2, tr: PANEL_RADIUS - 2, bl: 0, br: 0 });

    this.setTag(g, 'panel');
  }

  private buildHeader(won: boolean, levelName: string): void {
    const headerText = won ? 'NIVEAU REUSSI !' : 'NIVEAU ECHOUE';
    const headerColor = won ? `#${COLOR_SUCCESS.toString(16).padStart(6, '0')}` : `#${COLOR_DANGER.toString(16).padStart(6, '0')}`;

    const header = this.add
      .text(GAME_WIDTH / 2, PANEL_Y + 22, headerText, {
        fontSize: '22px',
        color: headerColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setAlpha(0);

    this.setTag(header, 'panel');

    // Level name subtitle
    const subtitle = this.add
      .text(GAME_WIDTH / 2, PANEL_Y + 54, levelName, {
        fontSize: '13px',
        color: `#${COLOR_TEXT_DIM.toString(16).padStart(6, '0')}`,
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setAlpha(0);

    this.setTag(subtitle, 'panel');
  }

  private buildScore(saved: number, required: number, total: number): void {
    const scoreY = PANEL_Y + 84;

    // "Sauves: X / Y" — main score line
    const fraction = this.add
      .text(GAME_WIDTH / 2, scoreY, `Sauves: ${saved} / ${total}`, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setAlpha(0);

    this.setTag(fraction, 'panel');

    // Required threshold hint
    const reqColor =
      saved >= required
        ? `#${COLOR_SUCCESS.toString(16).padStart(6, '0')}`
        : `#${COLOR_DANGER.toString(16).padStart(6, '0')}`;

    const reqHint = this.add
      .text(GAME_WIDTH / 2, scoreY + 30, `Requis: ${required}`, {
        fontSize: '14px',
        color: reqColor,
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setAlpha(0);

    this.setTag(reqHint, 'panel');
  }

  private buildStars(count: 0 | 1 | 2 | 3): void {
    const starY = PANEL_Y + 185;
    const totalWidth = 3 * STAR_SIZE * 2 + 2 * STAR_SPACING;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + STAR_SIZE;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (STAR_SIZE * 2 + STAR_SPACING);
      const filled = i < count;
      this.drawStar(cx, starY, STAR_SIZE, filled, i);
    }
  }

  /**
   * Draws a procedural 5-pointed star at (cx, cy).
   * Uses only Phaser Graphics — no external assets.
   */
  private drawStar(
    cx: number,
    cy: number,
    outerR: number,
    filled: boolean,
    index: number,
  ): void {
    const innerR = outerR * 0.42;
    const points: { x: number; y: number }[] = [];

    for (let p = 0; p < 10; p++) {
      const angle = (p * Math.PI) / 5 - Math.PI / 2;
      const r = p % 2 === 0 ? outerR : innerR;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }

    const g = this.add.graphics().setDepth(103).setAlpha(0);

    if (filled) {
      // Gold fill with a subtle inner highlight
      g.fillStyle(COLOR_STAR_FILLED, 1);
      g.fillPoints(points, true);
      // Bright top highlight
      g.fillStyle(0xffef99, 0.45);
      const highlightPoints = points.map((pt) => ({
        x: cx + (pt.x - cx) * 0.55,
        y: cy + (pt.y - cy) * 0.55 - outerR * 0.12,
      }));
      g.fillPoints(highlightPoints, true);
    } else {
      // Gray outline only
      g.fillStyle(COLOR_STAR_OUTLINE, 1);
      g.fillPoints(points, true);
      g.lineStyle(1.5, 0x4a5a7a, 0.7);
      g.strokePoints(points, true);
    }

    this.setTag(g, 'star');

    // Staggered fade-in for each star
    const delay = 220 + index * 130;
    this.time.delayedCall(delay, () => {
      this.tweens.add({
        targets: g,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 0.3, to: 1 },
        scaleY: { from: 0.3, to: 1 },
        duration: 220,
        ease: 'Back.easeOut',
      });
    });
  }

  private buildButtons(sceneData: ResultSceneData): void {
    this.buildButton(
      BTN_LEFT_X,
      BTN_Y,
      BTN_W,
      BTN_H,
      'REJOUER',
      COLOR_BTN_PRIMARY,
      COLOR_BTN_PRIMARY_BORDER,
      '#66bbff',
      () => {
        // Replay the same level
        this.scene.start('GameScene', { levelData: sceneData.levelData });
      },
    );

    this.buildButton(
      BTN_RIGHT_X,
      BTN_Y,
      BTN_W,
      BTN_H,
      'NIVEAUX',
      COLOR_BTN_SECONDARY,
      COLOR_BTN_SECONDARY_BORDER,
      '#66aaff',
      () => {
        this.scene.start('LevelSelectScene');
      },
    );
  }

  /**
   * Creates a single rounded-rect button with a text label and pointer events.
   * Hit area is at least 44px tall (Apple HIG) — BTN_H is set to 52px.
   */
  private buildButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    bgColor: number,
    borderColor: number,
    textColor: string,
    onTap: () => void,
  ): void {
    const g = this.add.graphics().setDepth(102).setAlpha(0);

    const drawNormal = (): void => {
      g.clear();
      g.fillStyle(bgColor, 1);
      g.fillRoundedRect(x, y, w, h, BTN_RADIUS);
      g.lineStyle(2, borderColor, 0.9);
      g.strokeRoundedRect(x, y, w, h, BTN_RADIUS);
    };

    const drawPressed = (): void => {
      g.clear();
      g.fillStyle(bgColor, 0.7);
      g.fillRoundedRect(x + 1, y + 2, w - 2, h - 2, BTN_RADIUS);
      g.lineStyle(2, borderColor, 0.5);
      g.strokeRoundedRect(x + 1, y + 2, w - 2, h - 2, BTN_RADIUS);
    };

    drawNormal();
    this.setTag(g, 'panel');

    const txt = this.add
      .text(x + w / 2, y + h / 2, label, {
        fontSize: '16px',
        color: textColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103)
      .setAlpha(0);

    this.setTag(txt, 'panel');

    // Invisible hit rectangle — ensures consistent 44×44+ tap target
    const hit = this.add
      .rectangle(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(104);

    hit.on('pointerover', () => { drawPressed(); });
    hit.on('pointerout', () => { drawNormal(); });
    hit.on('pointerdown', () => {
      drawPressed();
      this.tweens.add({
        targets: [g, txt],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 80,
        ease: 'Power1',
        yoyo: true,
        onComplete: () => {
          drawNormal();
          onTap();
        },
      });
    });
  }

  // ─── Entrance animation ─────────────────────────────────────────────────────

  /**
   * Panel slides in from the top (starts 120px above final position),
   * then panel elements fade in. Stars animate independently with delays.
   * Total entrance budget: ~300ms (within the 300ms UI animation cap).
   */
  private animatePanelEntrance(): void {
    // Gather all panel-tagged game objects
    const panelObjects = this.children.getAll().filter(
      (obj) => (obj as { _uiTag?: string })._uiTag === 'panel',
    );

    // Slide everything down from above
    panelObjects.forEach((obj) => {
      const go = obj as Phaser.GameObjects.GameObject & { y: number };
      go.y -= 120;
    });

    this.tweens.add({
      targets: panelObjects,
      props: {
        y: { value: `+120` },
        alpha: { value: 1, from: 0 },
      },
      duration: 280,
      ease: 'Power2.easeOut',
    });
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  /**
   * Attaches a _uiTag property to a game object for batch animation targeting.
   * Phaser.GameObject is typed without custom properties, so we use a
   * narrowly-typed Record intersection instead of `any` or `as`.
   */
  private setTag(
    obj: Phaser.GameObjects.GameObject,
    tag: 'panel' | 'star',
  ): void {
    (obj as Phaser.GameObjects.GameObject & { _uiTag: string })._uiTag = tag;
  }
}
