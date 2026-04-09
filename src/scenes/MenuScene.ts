import { GAME_WIDTH, GAME_HEIGHT } from '@/utils/Constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.text(centerX, centerY - 60, 'LEMMINGS', {
      fontSize: '64px',
      color: '#00ff88',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const tapText = this.add.text(centerX, centerY + 40, 'Tap to Play', {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tapText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      this.scene.start('LevelSelectScene');
    });
  }
}
