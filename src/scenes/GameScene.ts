import Phaser from 'phaser';
import { GAME_WIDTH } from '@/utils/Constants';
import { LemmingPool } from '@/entities/LemmingPool';
import { SpawnSystem } from '@/systems/SpawnSystem';
import { PhysicsSystem } from '@/systems/PhysicsSystem';

/** Y coordinate of the simple ground line used in Phase 2. */
const GROUND_Y = 450;

/**
 * GameScene — main gameplay scene.
 *
 * All game logic is delegated to systems; this scene only wires them
 * together and forwards the update loop.
 */
export class GameScene extends Phaser.Scene {
  private lemmingPool: LemmingPool | null = null;
  private spawnSystem: SpawnSystem | null = null;
  private physicsSystem: PhysicsSystem | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // -- Visual: ground line (grey rectangle) --
    this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 2, GAME_WIDTH, 4, 0x888888);

    // -- Systems --
    this.lemmingPool = new LemmingPool(this, 20);
    this.spawnSystem = new SpawnSystem(this.lemmingPool, {
      x: 100,
      y: 100,
      maxLemmings: 20, // small count for Phase 2 demo
      spawnInterval: 1000,
    });
    this.physicsSystem = new PhysicsSystem(this.lemmingPool, GROUND_Y);

    // -- HUD counter --
    this.statusText = this.add
      .text(8, 8, '', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setDepth(100);
  }

  update(_time: number, delta: number): void {
    // Phaser passes delta in ms; systems expect seconds
    const dt = delta / 1000;

    if (this.spawnSystem) {
      this.spawnSystem.update(dt);
    }
    if (this.lemmingPool) {
      this.lemmingPool.updateAll(dt);
    }
    if (this.physicsSystem) {
      this.physicsSystem.update(dt);
    }

    // Update HUD
    if (this.statusText && this.lemmingPool && this.spawnSystem) {
      const alive = this.lemmingPool.activeCount;
      const total = this.spawnSystem.getSpawnedCount();
      this.statusText.setText(`Lemmings: ${alive} alive / ${total} total`);
    }
  }

  shutdown(): void {
    this.cleanUp();
  }

  destroy(): void {
    this.cleanUp();
  }

  private cleanUp(): void {
    if (this.spawnSystem) {
      this.spawnSystem.destroy();
      this.spawnSystem = null;
    }
    if (this.physicsSystem) {
      this.physicsSystem.destroy();
      this.physicsSystem = null;
    }
    if (this.lemmingPool) {
      this.lemmingPool.destroy();
      this.lemmingPool = null;
    }
    this.statusText = null;
  }
}
