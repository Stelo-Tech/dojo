import Phaser from 'phaser';
import { GAME_WIDTH } from '@/utils/Constants';

/**
 * Toast notification — appears at the top-centre of the screen and
 * auto-dismisses after `duration` ms (default 2000).
 * Lifecycle: fade-in (200ms) → stay → fade-out (300ms).
 */
export class Toast extends Phaser.GameObjects.Container {
  private static readonly DEFAULT_DURATION = 2000;
  private static readonly FADE_IN = 200;
  private static readonly FADE_OUT = 300;
  private static readonly TOP_OFFSET = 48;
  private static readonly PADDING_H = 24;
  private static readonly PADDING_V = 12;
  private static readonly BG_COLOR = 0x16213e;
  private static readonly BORDER_COLOR = 0x4a90d9;

  /**
   * Factory method — creates a Toast, adds it to the scene and starts the
   * animation cycle automatically.
   */
  static show(scene: Phaser.Scene, message: string, duration: number = Toast.DEFAULT_DURATION): Toast {
    const toast = new Toast(scene, message, duration);
    return toast;
  }

  private constructor(scene: Phaser.Scene, message: string, duration: number) {
    super(scene, GAME_WIDTH / 2, Toast.TOP_OFFSET);

    // Measure text to size the background
    const tempText = scene.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    const textW = tempText.width;
    const textH = tempText.height;
    tempText.destroy();

    const bgW = textW + Toast.PADDING_H * 2;
    const bgH = textH + Toast.PADDING_V * 2;

    const bg = scene.add.graphics();
    bg.fillStyle(Toast.BG_COLOR, 0.95);
    bg.fillRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 8);
    bg.lineStyle(1, Toast.BORDER_COLOR, 0.8);
    bg.strokeRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 8);
    this.add(bg);

    const label = scene.add
      .text(0, 0, message, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);
    this.add(label);

    this.setAlpha(0);
    this.setDepth(1000);
    scene.add.existing(this);

    // Fade in
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: Toast.FADE_IN,
      ease: 'Power1Out',
      onComplete: () => {
        // Stay, then fade out
        scene.time.delayedCall(duration, () => {
          scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: Toast.FADE_OUT,
            ease: 'Power1In',
            onComplete: () => {
              this.destroy();
            },
          });
        });
      },
    });
  }
}
