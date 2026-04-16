import Phaser from 'phaser';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number;
  bgColor?: number;
  hoverColor?: number;
  pressColor?: number;
  textColor?: string;
  onClick: () => void;
}

/**
 * Reusable touch-friendly button component.
 * Minimum tap target is 44x44px (Apple HIG).
 * Provides visual feedback on pointer over, out, down and up.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly config: Required<Omit<ButtonConfig, 'onClick'>>;
  private readonly onClickCallback: () => void;

  // Ensure touch targets are never below 44px (Apple HIG)
  private static readonly MIN_TAP_SIZE = 44;

  constructor(scene: Phaser.Scene, cfg: ButtonConfig) {
    super(scene, cfg.x, cfg.y);

    this.onClickCallback = cfg.onClick;

    this.config = {
      x: cfg.x,
      y: cfg.y,
      width: Math.max(cfg.width, Button.MIN_TAP_SIZE),
      height: Math.max(cfg.height, Button.MIN_TAP_SIZE),
      text: cfg.text,
      fontSize: cfg.fontSize ?? 18,
      bgColor: cfg.bgColor ?? 0x2a5a8a,
      hoverColor: cfg.hoverColor ?? 0x4a90d9,
      pressColor: cfg.pressColor ?? 0x1a3a5a,
      textColor: cfg.textColor ?? '#ffffff',
    };

    // Background drawn with Graphics to support rounded corners
    this.bg = scene.add.graphics();
    this.drawBackground(this.config.bgColor);
    this.add(this.bg);

    this.label = scene.add
      .text(0, 0, this.config.text, {
        fontSize: `${this.config.fontSize}px`,
        color: this.config.textColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);
    this.add(this.label);

    // Interactive hit area based on button dimensions
    const hitW = this.config.width;
    const hitH = this.config.height;
    this.setSize(hitW, hitH);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);

    scene.add.existing(this);
  }

  private drawBackground(color: number): void {
    const w = this.config.width;
    const h = this.config.height;
    const radius = 8;
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    this.bg.lineStyle(2, 0xffffff, 0.2);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }

  private onPointerOver(): void {
    this.drawBackground(this.config.hoverColor);
    this.setScale(1.04);
  }

  private onPointerOut(): void {
    this.drawBackground(this.config.bgColor);
    this.setScale(1);
  }

  private onPointerDown(): void {
    this.drawBackground(this.config.pressColor);
    this.setScale(0.96);
  }

  private onPointerUp(): void {
    this.drawBackground(this.config.hoverColor);
    this.setScale(1.04);
    this.onClickCallback();
  }

  setText(value: string): void {
    this.label.setText(value);
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.setInteractive({ useHandCursor: true });
      this.drawBackground(this.config.bgColor);
      this.setAlpha(1);
    } else {
      this.disableInteractive();
      this.drawBackground(0x444444);
      this.setAlpha(0.5);
    }
  }

  destroy(): void {
    this.off('pointerover', this.onPointerOver, this);
    this.off('pointerout', this.onPointerOut, this);
    this.off('pointerdown', this.onPointerDown, this);
    this.off('pointerup', this.onPointerUp, this);
    super.destroy(true);
  }
}
