import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';

// ─── Design tokens (shared palette with the rest of the project) ─────────────
const COLOR_OVERLAY = 0x060a14;
const COLOR_PANEL = 0x111827;
const COLOR_PANEL_BORDER = 0x334d6e;
const COLOR_BTN_RESUME = 0x1a3a6a;
const COLOR_BTN_RESUME_BORDER = 0x4488cc;
const COLOR_BTN_QUIT = 0x2a1a1a;
const COLOR_BTN_QUIT_BORDER = 0x884444;

const PANEL_W = 320;
const PANEL_H = 240;
const PANEL_X = GAME_WIDTH / 2 - PANEL_W / 2;
const PANEL_Y = GAME_HEIGHT / 2 - PANEL_H / 2;
const PANEL_RADIUS = 14;

/** Button height: 52px satisfies the 44px minimum touch target (Apple HIG). */
const BTN_W = 220;
const BTN_H = 52;
const BTN_RADIUS = 10;

/**
 * PauseScene — launched as an overlay on top of GameScene.
 *
 * Start via:
 *   this.scene.launch('PauseScene');
 *   this.scene.pause('GameScene');
 *
 * Resume via the "Continuer" button which stops this overlay and resumes GameScene.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    this.buildOverlay();
    this.buildPanel();
    this.buildTitle();
    this.buildButtons();
    this.animateEntrance();
  }

  // ─── Visual builders ──────────────────────────────────────────────────────

  private buildOverlay(): void {
    // Dim everything behind the pause panel — 70% opaque dark overlay
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLOR_OVERLAY, 0.7)
      .setDepth(200)
      .setScrollFactor(0);
  }

  private buildPanel(): void {
    const g = this.add.graphics().setDepth(210).setScrollFactor(0);

    // Shadow layer
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(PANEL_X + 5, PANEL_Y + 7, PANEL_W, PANEL_H, PANEL_RADIUS);

    // Panel body
    g.fillStyle(COLOR_PANEL, 1);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);

    // Subtle inner highlight on the top half
    g.fillStyle(0x1e293b, 0.5);
    g.fillRoundedRect(
      PANEL_X + 2,
      PANEL_Y + 2,
      PANEL_W - 4,
      (PANEL_H - 4) / 2,
      PANEL_RADIUS - 2,
    );

    // Border
    g.lineStyle(2, COLOR_PANEL_BORDER, 1);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);

    this.tagAsPanelObject(g);
  }

  private buildTitle(): void {
    const title = this.add
      .text(GAME_WIDTH / 2, PANEL_Y + 38, 'PAUSE', {
        fontSize: '28px',
        color: '#e2e8f0',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(211)
      .setAlpha(0)
      .setScrollFactor(0);

    this.tagAsPanelObject(title);
  }

  private buildButtons(): void {
    const cx = GAME_WIDTH / 2;
    const resumeY = PANEL_Y + 110;
    const quitY = PANEL_Y + 176;

    this.createButton(
      cx - BTN_W / 2,
      resumeY,
      BTN_W,
      BTN_H,
      'CONTINUER',
      COLOR_BTN_RESUME,
      COLOR_BTN_RESUME_BORDER,
      '#66bbff',
      () => {
        // Stop this overlay; GameScene resumes automatically
        this.scene.stop('PauseScene');
        this.scene.resume('GameScene');
      },
    );

    this.createButton(
      cx - BTN_W / 2,
      quitY,
      BTN_W,
      BTN_H,
      'QUITTER',
      COLOR_BTN_QUIT,
      COLOR_BTN_QUIT_BORDER,
      '#cc7777',
      () => {
        this.scene.stop('PauseScene');
        this.scene.stop('GameScene');
        this.scene.start('LevelSelectScene');
      },
    );
  }

  /**
   * Creates a touch-friendly button with hover and press states.
   * Hit area is at least BTN_H = 52px > 44px minimum.
   */
  private createButton(
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
    const g = this.add.graphics().setDepth(211).setAlpha(0).setScrollFactor(0);

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
    this.tagAsPanelObject(g);

    const txt = this.add
      .text(x + w / 2, y + h / 2, label, {
        fontSize: '16px',
        color: textColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(212)
      .setAlpha(0)
      .setScrollFactor(0);

    this.tagAsPanelObject(txt);

    // Invisible rectangle used as the interactive hit target
    const hit = this.add
      .rectangle(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(213)
      .setScrollFactor(0);

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

  // ─── Entrance animation ───────────────────────────────────────────────────

  /**
   * Panel fades and slides in from above.
   * Duration 260ms stays within the 300ms UI animation cap.
   */
  private animateEntrance(): void {
    const panelObjects = this.children.getAll().filter(
      // Phaser GameObjects do not carry custom properties in their type;
      // we use the narrowly-typed intersection we wrote in tagAsPanelObject.
      (obj) => (obj as { _pausePanel?: boolean })._pausePanel === true,
    );

    panelObjects.forEach((obj) => {
      const go = obj as Phaser.GameObjects.GameObject & { y: number };
      go.y -= 100;
    });

    this.tweens.add({
      targets: panelObjects,
      props: {
        y: { value: '+100' },
        alpha: { value: 1, from: 0 },
      },
      duration: 260,
      ease: 'Power2.easeOut',
    });
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  /**
   * Marks a game object as belonging to the pause panel for batch animation.
   * The `as` cast is required because Phaser.GameObject has no index signature;
   * we restrict the added property to a known boolean field to keep it narrow.
   */
  private tagAsPanelObject(obj: Phaser.GameObjects.GameObject): void {
    (obj as Phaser.GameObjects.GameObject & { _pausePanel: boolean })._pausePanel = true;
  }
}
