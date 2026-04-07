import Phaser from 'phaser';
import {
  EXIT_X,
  EXIT_Y,
  EXIT_WIDTH,
  EXIT_HEIGHT,
  TERRAIN_Y,
} from '@/utils/Constants';
import { gameEventBus } from '@/utils/EventBus';
import { LemmingPool } from '@/entities/LemmingPool';
import { Lemming } from '@/entities/Lemming';
import { SpawnSystem } from '@/systems/SpawnSystem';
import { PhysicsSystem } from '@/systems/PhysicsSystem';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { HUD } from '@/ui/HUD';
import { TouchControls } from '@/ui/TouchControls';

export class GameScene extends Phaser.Scene {
  private lemmingPool: LemmingPool | null = null;
  private spawnSystem: SpawnSystem | null = null;
  private physicsSystem: PhysicsSystem | null = null;
  private terrainSystem: TerrainSystem | null = null;
  private hud: HUD | null = null;
  private touchControls: TouchControls | null = null;
  private exitZone: Phaser.GameObjects.Rectangle | null = null;
  private savedCount = 0;
  private deadCount = 0;
  private diedHandler: ((data: { id: number; cause: string }) => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.savedCount = 0;
    this.deadCount = 0;

    // -- Terrain system --
    this.terrainSystem = new TerrainSystem(this);
    this.terrainSystem.eraseRect(350, TERRAIN_Y, 80, 40);
    this.terrainSystem.eraseRect(700, TERRAIN_Y, 60, 30);

    // -- Exit zone --
    this.exitZone = this.add
      .rectangle(EXIT_X + EXIT_WIDTH / 2, EXIT_Y + EXIT_HEIGHT / 2, EXIT_WIDTH, EXIT_HEIGHT, 0x00ff00, 0.5)
      .setDepth(50);
    this.add
      .text(EXIT_X + EXIT_WIDTH / 2, EXIT_Y - 8, 'EXIT', {
        fontSize: '10px',
        color: '#00ff00',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(50);

    // -- Lemming pool --
    this.lemmingPool = new LemmingPool(this, 20);

    // -- Systems --
    this.spawnSystem = new SpawnSystem(this.lemmingPool, {
      x: 100,
      y: TERRAIN_Y - 60,
      maxLemmings: 20,
      spawnInterval: 1000,
    });
    this.physicsSystem = new PhysicsSystem(this.lemmingPool, this.terrainSystem);

    // -- HUD + Touch --
    this.hud = new HUD(this);
    this.touchControls = new TouchControls(this, this.lemmingPool, this.hud);

    // -- EventBus listeners --
    this.diedHandler = (_data: { id: number; cause: string }) => {
      this.deadCount++;
    };
    gameEventBus.on('lemming:died', this.diedHandler);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.spawnSystem) {
      this.spawnSystem.update(dt);
    }

    // Inject terrain access into newly spawned lemmings
    if (this.lemmingPool && this.terrainSystem) {
      const activeLemmings = this.lemmingPool.getActive();
      for (let i = 0; i < activeLemmings.length; i++) {
        const lem = activeLemmings[i] as Lemming | undefined;
        if (lem && lem.getTerrainAccess() === null) {
          lem.setTerrainAccess(this.terrainSystem);
        }
      }
    }

    if (this.lemmingPool) {
      this.lemmingPool.updateAll(dt);
    }
    if (this.physicsSystem) {
      this.physicsSystem.update(dt);
    }

    // -- Exit zone check --
    if (this.lemmingPool) {
      const active = this.lemmingPool.getActive();
      for (let i = active.length - 1; i >= 0; i--) {
        const lemming = active[i];
        if (!lemming || !lemming.alive) continue;

        if (this.isAtExit(lemming.x, lemming.y)) {
          lemming.changeState('saved');
          this.savedCount++;
          gameEventBus.emit('lemming:saved', { id: lemming.id });
        }
      }
    }

    // -- Update HUD counters --
    if (this.lemmingPool) {
      const alive = this.lemmingPool.activeCount;
      gameEventBus.emit('hud:update', {
        alive,
        saved: this.savedCount,
        dead: this.deadCount,
      });
    }
  }

  private isAtExit(x: number, y: number): boolean {
    return (
      x >= EXIT_X &&
      x <= EXIT_X + EXIT_WIDTH &&
      y >= EXIT_Y &&
      y <= EXIT_Y + EXIT_HEIGHT
    );
  }

  shutdown(): void {
    this.cleanUp();
  }

  destroy(): void {
    this.cleanUp();
  }

  private cleanUp(): void {
    if (this.diedHandler) {
      gameEventBus.off('lemming:died', this.diedHandler);
      this.diedHandler = null;
    }
    if (this.touchControls) {
      this.touchControls.destroy();
      this.touchControls = null;
    }
    if (this.hud) {
      this.hud.destroy();
      this.hud = null;
    }
    if (this.spawnSystem) {
      this.spawnSystem.destroy();
      this.spawnSystem = null;
    }
    if (this.physicsSystem) {
      this.physicsSystem.destroy();
      this.physicsSystem = null;
    }
    if (this.terrainSystem) {
      this.terrainSystem.destroy();
      this.terrainSystem = null;
    }
    if (this.lemmingPool) {
      this.lemmingPool.destroy();
      this.lemmingPool = null;
    }
    if (this.exitZone) {
      this.exitZone.destroy();
      this.exitZone = null;
    }
  }
}
