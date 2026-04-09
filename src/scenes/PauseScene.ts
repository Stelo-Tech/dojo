import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';
import { Button } from '@/ui/components/Button';

/**
 * PauseScene — overlay launched on top of GameScene.
 *
 * Usage (from GameScene):
 *   this.scene.launch('PauseScene');
 *   this.scene.pause('GameScene');
 *
 * The scene resumes or exits GameScene as appropriate based on button choice.
 */
export class PauseScene extends Phaser.Scene {
  private resumeButton: Button | null = null;
  private restartButton: Button | null = null;
  private quitButton: Button | null = null;

  private static readonly BTN_WIDTH = 220;
  private static readonly BTN_HEIGHT = 52;
  private static readonly BTN_GAP = 16;

  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    this.createOverlay();
    this.createTitle();
    this.createButtons();
  }

  private createOverlay(): void {
    // Semi-transparent dark overlay covering the full screen
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setDepth(0)
      .setInteractive(); // block clicks from passing through
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'PAUSED', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private createButtons(): void {
    const cx = GAME_WIDTH / 2;
    const btnH = PauseScene.BTN_HEIGHT;
    const gap = PauseScene.BTN_GAP;
    // Three buttons centred vertically below the title
    const totalH = btnH * 3 + gap * 2;
    const startY = GAME_HEIGHT / 2 - totalH / 2 + btnH / 2;

    this.resumeButton = new Button(this, {
      x: cx,
      y: startY,
      width: PauseScene.BTN_WIDTH,
      height: btnH,
      text: 'Resume',
      fontSize: 20,
      bgColor: 0x2a7a2a,
      hoverColor: 0x3aaa3a,
      pressColor: 0x1a5a1a,
      onClick: () => this.resume(),
    });

    this.restartButton = new Button(this, {
      x: cx,
      y: startY + btnH + gap,
      width: PauseScene.BTN_WIDTH,
      height: btnH,
      text: 'Restart',
      fontSize: 20,
      bgColor: 0x2a5a8a,
      hoverColor: 0x4a90d9,
      pressColor: 0x1a3a5a,
      onClick: () => this.restart(),
    });

    this.quitButton = new Button(this, {
      x: cx,
      y: startY + (btnH + gap) * 2,
      width: PauseScene.BTN_WIDTH,
      height: btnH,
      text: 'Quit',
      fontSize: 20,
      bgColor: 0x7a2a2a,
      hoverColor: 0xaa3a3a,
      pressColor: 0x5a1a1a,
      onClick: () => this.quit(),
    });
  }

  private resume(): void {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private restart(): void {
    this.scene.stop('PauseScene');
    // Stopping the overlay first avoids the double-cleanup edge case
    this.scene.start('GameScene');
  }

  private quit(): void {
    this.scene.stop('PauseScene');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }

  shutdown(): void {
    if (this.resumeButton !== null) {
      this.resumeButton.destroy();
      this.resumeButton = null;
    }
    if (this.restartButton !== null) {
      this.restartButton.destroy();
      this.restartButton = null;
    }
    if (this.quitButton !== null) {
      this.quitButton.destroy();
      this.quitButton = null;
    }
  }
}
