import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { Button } from '@/ui/components/Button';

export interface ModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Modal dialog component.
 * Renders a centred panel with a semi-transparent overlay that blocks
 * interaction with the scene behind it.
 * Animates in from scale 0.8 to 1 (200ms ease-out).
 */
export class Modal extends Phaser.GameObjects.Container {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly confirmButton: Button;
  private cancelButton: Button | null = null;

  private static readonly PANEL_WIDTH = 400;
  private static readonly PANEL_HEIGHT = 250;
  private static readonly PANEL_BG = 0x16213e;
  private static readonly OVERLAY_ALPHA = 0.75;

  constructor(scene: Phaser.Scene, cfg: ModalConfig) {
    // Container positioned at screen centre
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Full-screen overlay blocks input to the scene underneath
    this.overlay = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, Modal.OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setInteractive(); // swallow pointer events

    // Panel background
    this.panel = scene.add.graphics();
    this.drawPanel();

    // Title
    scene.add
      .text(0, -85, cfg.title, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);

    // Message
    scene.add
      .text(0, -30, cfg.message, {
        fontSize: '16px',
        color: '#aaaaaa',
        fontFamily: 'Arial',
        wordWrap: { width: Modal.PANEL_WIDTH - 40 },
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    // Confirm button
    const hasCancelButton = cfg.cancelText !== undefined && cfg.onCancel !== undefined;
    const confirmX = hasCancelButton ? 80 : 0;

    this.confirmButton = new Button(scene, {
      x: confirmX,
      y: 75,
      width: 140,
      height: 48,
      text: cfg.confirmText ?? 'OK',
      bgColor: 0x2a7a2a,
      hoverColor: 0x3aaa3a,
      pressColor: 0x1a5a1a,
      onClick: () => {
        this.close();
        cfg.onConfirm();
      },
    });

    // Optional cancel button
    if (hasCancelButton && cfg.onCancel !== undefined) {
      const onCancel = cfg.onCancel;
      this.cancelButton = new Button(scene, {
        x: -80,
        y: 75,
        width: 140,
        height: 48,
        text: cfg.cancelText ?? 'Cancel',
        bgColor: 0x7a2a2a,
        hoverColor: 0xaa3a3a,
        pressColor: 0x5a1a1a,
        onClick: () => {
          this.close();
          onCancel();
        },
      });
      // Adjust confirm button position now that we know cancel exists
      this.confirmButton.setPosition(80, 75);
    }

    // Animate in
    this.setScale(0.8);
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Power2Out',
    });

    scene.add.existing(this);
  }

  private drawPanel(): void {
    const w = Modal.PANEL_WIDTH;
    const h = Modal.PANEL_HEIGHT;
    this.panel.clear();
    this.panel.fillStyle(Modal.PANEL_BG, 1);
    this.panel.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.panel.lineStyle(2, 0x4a90d9, 0.6);
    this.panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  }

  private close(): void {
    this.overlay.destroy();
    this.destroy(true);
  }

  destroy(fromScene?: boolean): void {
    this.confirmButton.destroy();
    if (this.cancelButton !== null) {
      this.cancelButton.destroy();
      this.cancelButton = null;
    }
    super.destroy(fromScene);
  }
}
