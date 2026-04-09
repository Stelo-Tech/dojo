import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.text(centerX, centerY, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
