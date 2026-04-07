import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  EXIT_X,
  EXIT_Y,
  EXIT_WIDTH,
  EXIT_HEIGHT,
  TERRAIN_Y,
  SPAWN_X,
  SPAWN_Y,
  BG_COLOR_TOP,
  BG_COLOR_MID,
  BG_COLOR_BOTTOM,
  BG_STAR_COUNT,
  PLATFORM_LEFT,
  LEFT_CLIFF_GAP,
  FOSSE_GAP,
  WALL_VERT,
  EXIT_PLATFORM,
  SPAWN_PORTAL_WIDTH,
  SPAWN_PORTAL_HEIGHT,
  SPAWN_PORTAL_COLOR,
  EXIT_PULSE_SPEED,
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
  private exitGlow: Phaser.GameObjects.Rectangle | null = null;
  private exitLabel: Phaser.GameObjects.Text | null = null;
  private savedCount = 0;
  private deadCount = 0;
  private diedHandler: ((data: { id: number; cause: string }) => void) | null = null;
  private elapsedTime = 0;

  private readonly bgLayers: Phaser.GameObjects.Rectangle[] = [];
  private readonly starGraphics: Phaser.GameObjects.Rectangle[] = [];
  private readonly gridLines: Phaser.GameObjects.Line[] = [];
  private spawnPortal: Phaser.GameObjects.Rectangle | null = null;
  private spawnLabel: Phaser.GameObjects.Text | null = null;
  private spawnTriangle: Phaser.GameObjects.Triangle | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.savedCount = 0;
    this.deadCount = 0;
    this.elapsedTime = 0;

    this.createBackground();
    this.createStars();
    this.createGrid();

    this.terrainSystem = new TerrainSystem(this);
    this.buildLevel();

    this.createSpawnPortal();
    this.createExitZone();

    this.lemmingPool = new LemmingPool(this, 20);

    this.spawnSystem = new SpawnSystem(this.lemmingPool, {
      x: SPAWN_X,
      y: SPAWN_Y,
      maxLemmings: 20,
      spawnInterval: 1000,
    });
    this.physicsSystem = new PhysicsSystem(this.lemmingPool, this.terrainSystem);

    this.hud = new HUD(this);
    this.touchControls = new TouchControls(this, this.lemmingPool, this.hud);

    this.diedHandler = (_data: { id: number; cause: string }) => {
      this.deadCount++;
    };
    gameEventBus.on('lemming:died', this.diedHandler);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.elapsedTime += dt;

    if (this.spawnSystem) {
      this.spawnSystem.update(dt);
    }

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

    this.animateExit();

    if (this.lemmingPool) {
      const alive = this.lemmingPool.activeCount;
      gameEventBus.emit('hud:update', {
        alive,
        saved: this.savedCount,
        dead: this.deadCount,
      });
    }
  }

  private createBackground(): void {
    const bandHeight = Math.ceil(GAME_HEIGHT / 3);
    const topBand = this.add
      .rectangle(GAME_WIDTH / 2, bandHeight / 2, GAME_WIDTH, bandHeight, BG_COLOR_TOP)
      .setDepth(0);
    const midBand = this.add
      .rectangle(GAME_WIDTH / 2, bandHeight + bandHeight / 2, GAME_WIDTH, bandHeight, BG_COLOR_MID)
      .setDepth(0);
    const bottomBand = this.add
      .rectangle(GAME_WIDTH / 2, bandHeight * 2 + bandHeight / 2, GAME_WIDTH, bandHeight + 1, BG_COLOR_BOTTOM)
      .setDepth(0);
    this.bgLayers.push(topBand, midBand, bottomBand);
  }

  private createStars(): void {
    let seed = 12345;
    const nextRand = (): number => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const sx = nextRand() * GAME_WIDTH;
      const sy = nextRand() * (TERRAIN_Y - 40);
      const size = 1 + Math.floor(nextRand() * 2);
      const alpha = 0.3 + nextRand() * 0.7;
      const star = this.add
        .rectangle(sx, sy, size, size, 0xffffff, alpha)
        .setDepth(1);
      this.starGraphics.push(star);
    }
  }

  private createGrid(): void {
    const gridAlpha = 0.05;
    const gridSpacing = 50;

    for (let gx = 0; gx <= GAME_WIDTH; gx += gridSpacing) {
      const line = this.add
        .line(0, 0, gx, 0, gx, GAME_HEIGHT, 0xffffff, gridAlpha)
        .setOrigin(0, 0)
        .setDepth(2);
      this.gridLines.push(line);
    }

    for (let gy = 0; gy <= GAME_HEIGHT; gy += gridSpacing) {
      const line = this.add
        .line(0, 0, 0, gy, GAME_WIDTH, gy, 0xffffff, gridAlpha)
        .setOrigin(0, 0)
        .setDepth(2);
      this.gridLines.push(line);
    }
  }

  private buildLevel(): void {
    if (!this.terrainSystem) return;
    this.terrainSystem.fillRect(PLATFORM_LEFT.x, PLATFORM_LEFT.y, PLATFORM_LEFT.w, PLATFORM_LEFT.h);
    this.terrainSystem.eraseRect(LEFT_CLIFF_GAP.x, LEFT_CLIFF_GAP.y, LEFT_CLIFF_GAP.w, LEFT_CLIFF_GAP.h);
    this.terrainSystem.eraseRect(FOSSE_GAP.x, FOSSE_GAP.y, FOSSE_GAP.w, FOSSE_GAP.h);
    this.terrainSystem.fillRect(WALL_VERT.x, WALL_VERT.y, WALL_VERT.w, WALL_VERT.h);
    this.terrainSystem.fillRect(EXIT_PLATFORM.x, EXIT_PLATFORM.y, EXIT_PLATFORM.w, EXIT_PLATFORM.h);
  }

  private createSpawnPortal(): void {
    const portalX = SPAWN_X;
    const portalY = SPAWN_Y - 10;
    this.spawnPortal = this.add
      .rectangle(portalX, portalY, SPAWN_PORTAL_WIDTH, SPAWN_PORTAL_HEIGHT, SPAWN_PORTAL_COLOR, 0.7)
      .setDepth(50);
    this.spawnLabel = this.add
      .text(portalX, portalY - 18, 'SPAWN', {
        fontSize: '10px',
        color: '#4488ff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.spawnTriangle = this.add
      .triangle(portalX, portalY + 14, 0, 0, 10, 0, 5, 8, SPAWN_PORTAL_COLOR, 0.9)
      .setDepth(50);
  }

  private createExitZone(): void {
    this.exitGlow = this.add
      .rectangle(
        EXIT_X + EXIT_WIDTH / 2,
        EXIT_Y + EXIT_HEIGHT / 2,
        EXIT_WIDTH + 10,
        EXIT_HEIGHT + 10,
        0x00ff00,
        0.15,
      )
      .setDepth(49);
    this.exitZone = this.add
      .rectangle(
        EXIT_X + EXIT_WIDTH / 2,
        EXIT_Y + EXIT_HEIGHT / 2,
        EXIT_WIDTH,
        EXIT_HEIGHT,
        0x00ff00,
        0.5,
      )
      .setDepth(50);
    this.exitLabel = this.add
      .text(EXIT_X + EXIT_WIDTH / 2, EXIT_Y - 12, 'EXIT', {
        fontSize: '14px',
        color: '#00ff00',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50);
  }

  private animateExit(): void {
    if (!this.exitGlow) return;
    const pulse = 0.225 + Math.sin(this.elapsedTime * EXIT_PULSE_SPEED) * 0.125;
    this.exitGlow.setAlpha(pulse);
    const scalePulse = 1 + Math.sin(this.elapsedTime * EXIT_PULSE_SPEED) * 0.05;
    this.exitGlow.setScale(scalePulse);
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
    if (this.exitGlow) {
      this.exitGlow.destroy();
      this.exitGlow = null;
    }
    if (this.exitLabel) {
      this.exitLabel.destroy();
      this.exitLabel = null;
    }
    if (this.spawnPortal) {
      this.spawnPortal.destroy();
      this.spawnPortal = null;
    }
    if (this.spawnLabel) {
      this.spawnLabel.destroy();
      this.spawnLabel = null;
    }
    if (this.spawnTriangle) {
      this.spawnTriangle.destroy();
      this.spawnTriangle = null;
    }
    for (const layer of this.bgLayers) {
      layer.destroy();
    }
    this.bgLayers.length = 0;
    for (const star of this.starGraphics) {
      star.destroy();
    }
    this.starGraphics.length = 0;
    for (const line of this.gridLines) {
      line.destroy();
    }
    this.gridLines.length = 0;
  }
}
