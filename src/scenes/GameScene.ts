import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TERRAIN_Y,
  BG_COLOR_TOP,
  BG_COLOR_MID,
  BG_COLOR_BOTTOM,
  BG_STAR_COUNT,
  SPAWN_PORTAL_WIDTH,
  SPAWN_PORTAL_HEIGHT,
  EXIT_PULSE_SPEED,
} from '@/utils/Constants';
import { gameEventBus } from '@/utils/EventBus';
import { LemmingPool } from '@/entities/LemmingPool';
import { SpawnSystem } from '@/systems/SpawnSystem';
import { PhysicsSystem } from '@/systems/PhysicsSystem';
import { TerrainSystem } from '@/systems/TerrainSystem';
import { HUD } from '@/ui/HUD';
import { TouchControls } from '@/ui/TouchControls';
import { LevelData, DifficultyConfig } from '@/levels/LevelData';
import { LevelGenerator, DIFFICULTY_PRESETS } from '@/levels/LevelGenerator';
import { LevelValidator } from '@/levels/LevelValidator';
import { LevelLoader } from '@/levels/LevelLoader';

export class GameScene extends Phaser.Scene {
  private lemmingPool: LemmingPool | null = null;
  private spawnSystem: SpawnSystem | null = null;
  private physicsSystem: PhysicsSystem | null = null;
  private terrainSystem: TerrainSystem | null = null;
  private hud: HUD | null = null;
  private touchControls: TouchControls | null = null;
  private exitZone: Phaser.GameObjects.Graphics | null = null;
  private exitGlow: Phaser.GameObjects.Graphics | null = null;
  private exitLabel: Phaser.GameObjects.Text | null = null;
  private savedCount = 0;
  private deadCount = 0;
  private diedHandler: ((data: { id: number; cause: string }) => void) | null = null;
  private elapsedTime = 0;
  private levelData: LevelData | null = null;
  private levelEnded = false;
  private endDelay = 0;

  private bgGraphics: Phaser.GameObjects.Graphics | null = null;
  private readonly starGraphics: Phaser.GameObjects.Arc[] = [];
  private spawnPortal: Phaser.GameObjects.Graphics | null = null;
  private spawnLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: { levelData?: LevelData }): void {
    this.savedCount = 0;
    this.deadCount = 0;
    this.elapsedTime = 0;
    this.levelEnded = false;
    this.endDelay = 0;

    // Get or generate level data
    if (data?.levelData) {
      this.levelData = data.levelData;
    } else {
      this.levelData = this.generateValidLevel(1, Date.now());
    }

    this.createBackground();
    this.createStars();

    // Build terrain from level data
    this.terrainSystem = new TerrainSystem(this);
    const loader = new LevelLoader();
    loader.load(this.levelData, this.terrainSystem);

    this.createSpawnPortal();
    this.createExitZone();

    this.lemmingPool = new LemmingPool(this, this.levelData.lemmingCount);

    this.spawnSystem = new SpawnSystem(this.lemmingPool, {
      x: this.levelData.spawn.x,
      y: this.levelData.spawn.y,
      maxLemmings: this.levelData.lemmingCount,
      spawnInterval: this.levelData.spawnInterval,
    });
    this.physicsSystem = new PhysicsSystem(this.lemmingPool, this.terrainSystem);

    this.hud = new HUD(this, this.levelData.toolBudget);
    this.touchControls = new TouchControls(this, this.hud, this.terrainSystem, this.levelData.exit);

    this.diedHandler = (_data: { id: number; cause: string }) => {
      this.deadCount++;
    };
    gameEventBus.on('lemming:died', this.diedHandler);

    // Register cleanup on Phaser scene lifecycle events
    this.events.once('shutdown', this.cleanUp, this);
    this.events.once('destroy', this.cleanUp, this);
  }

  /** Generate a level and validate it. Retry with different seeds if invalid. */
  private generateValidLevel(tier: number, baseSeed: number): LevelData {
    const config = DIFFICULTY_PRESETS[tier - 1];
    if (!config) {
      return this.generateValidLevel(1, baseSeed);
    }
    const generator = new LevelGenerator();
    const validator = new LevelValidator();

    for (let attempt = 0; attempt < 20; attempt++) {
      const level = generator.generate(config, baseSeed + attempt);
      const result = validator.validate(level);
      if (result.solvable) {
        return level;
      }
    }
    // Fallback: tier 1 with a simple seed
    const fallback = generator.generate(DIFFICULTY_PRESETS[0] as DifficultyConfig, 42);
    return fallback;
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.elapsedTime += dt;

    if (this.spawnSystem) {
      this.spawnSystem.update(dt);
    }
    if (this.lemmingPool) {
      this.lemmingPool.updateAll(dt);
    }
    if (this.physicsSystem) {
      this.physicsSystem.update(dt);
    }

    if (this.lemmingPool && this.levelData) {
      const active = this.lemmingPool.getActive();
      const ex = this.levelData.exit;
      for (let i = active.length - 1; i >= 0; i--) {
        const lemming = active[i];
        if (!lemming || !lemming.alive) continue;
        if (this.isAtExit(lemming.x, lemming.y, ex.x, ex.y, ex.width, ex.height)) {
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

      // End-of-level detection: all spawned and none alive
      if (!this.levelEnded && this.spawnSystem && this.levelData) {
        const allSpawned = this.spawnSystem.getSpawnedCount() >= this.levelData.lemmingCount;
        if (allSpawned && alive === 0) {
          this.endDelay += dt;
          // Small delay so player sees the last lemming exit/die
          if (this.endDelay >= 1.0) {
            this.levelEnded = true;
            const won = this.savedCount >= this.levelData.requiredSaves;
            this.scene.start('ResultScene', {
              saved: this.savedCount,
              dead: this.deadCount,
              total: this.levelData.lemmingCount,
              required: this.levelData.requiredSaves,
              levelName: this.levelData.name,
              tier: this.levelData.tier,
              won,
              levelData: this.levelData,
            });
          }
        }
      }
    }
  }

  private createBackground(): void {
    const g = this.add.graphics().setDepth(0);
    this.bgGraphics = g;

    const STRIPS = 60;
    const stripH = Math.ceil(GAME_HEIGHT / STRIPS) + 1;

    const rT = (BG_COLOR_TOP >> 16) & 0xff;
    const gT = (BG_COLOR_TOP >> 8) & 0xff;
    const bT = BG_COLOR_TOP & 0xff;

    const rM = (BG_COLOR_MID >> 16) & 0xff;
    const gM = (BG_COLOR_MID >> 8) & 0xff;
    const bM = BG_COLOR_MID & 0xff;

    const rB = (BG_COLOR_BOTTOM >> 16) & 0xff;
    const gB = (BG_COLOR_BOTTOM >> 8) & 0xff;
    const bB = BG_COLOR_BOTTOM & 0xff;

    const skyFraction = 0.65;

    for (let i = 0; i < STRIPS; i++) {
      const t = i / (STRIPS - 1);
      let r: number, gr: number, b: number;
      if (t <= skyFraction) {
        const s = t / skyFraction;
        r = Math.round(rT + (rM - rT) * s);
        gr = Math.round(gT + (gM - gT) * s);
        b = Math.round(bT + (bM - bT) * s);
      } else {
        const s = (t - skyFraction) / (1 - skyFraction);
        r = Math.round(rM + (rB - rM) * s);
        gr = Math.round(gM + (gB - gM) * s);
        b = Math.round(bM + (bB - bM) * s);
      }
      const color = (r << 16) | (gr << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, i * (GAME_HEIGHT / STRIPS), GAME_WIDTH, stripH);
    }

    g.fillStyle(0x2a3a6a, 0.18);
    g.fillRect(0, TERRAIN_Y - 60, GAME_WIDTH, 80);
  }

  private createStars(): void {
    let seed = 12345;
    const nextRand = (): number => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    const skyBottom = TERRAIN_Y - 60;

    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const sx = nextRand() * GAME_WIDTH;
      const sy = nextRand() * skyBottom;
      const radius = 0.6 + nextRand() * 1.8;
      const baseAlpha = 0.35 + nextRand() * 0.65;

      const tint = nextRand();
      let color = 0xffffff;
      if (tint < 0.15) color = 0xffe8d0;
      else if (tint < 0.3) color = 0xd0e8ff;

      const star = this.add.circle(sx, sy, radius, color, baseAlpha).setDepth(1);
      this.starGraphics.push(star);

      const delay = nextRand() * 3000;
      const duration = 1500 + nextRand() * 2500;
      this.tweens.add({
        targets: star,
        alpha: { from: baseAlpha, to: baseAlpha * 0.2 },
        duration,
        delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createSpawnPortal(): void {
    if (!this.levelData) return;
    const portalX = this.levelData.spawn.x;
    const portalY = this.levelData.spawn.y - 10;
    const pw = SPAWN_PORTAL_WIDTH + 10;
    const ph = SPAWN_PORTAL_HEIGHT + 10;

    const g = this.add.graphics().setDepth(50);
    this.spawnPortal = g;

    g.fillStyle(0x2255cc, 0.25);
    g.fillEllipse(portalX, portalY, pw + 20, ph + 20);
    g.fillStyle(0x1a44bb, 0.85);
    g.fillEllipse(portalX, portalY, pw + 8, ph + 8);
    g.fillStyle(0x66aaff, 0.9);
    g.fillEllipse(portalX, portalY, pw, ph);
    g.fillStyle(0xeef4ff, 0.5);
    g.fillEllipse(portalX - pw * 0.18, portalY - ph * 0.25, pw * 0.4, ph * 0.28);
    g.fillStyle(0xffffff, 0.8);
    const ax = portalX;
    const ay = portalY + ph * 0.5 + 6;
    g.fillTriangle(ax - 6, ay, ax + 6, ay, ax, ay + 9);

    this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0.75 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.spawnLabel = this.add
      .text(portalX, portalY - ph * 0.5 - 12, 'ENTREE', {
        fontSize: '10px',
        color: '#88bbff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  private createExitZone(): void {
    if (!this.levelData) return;
    const ex = this.levelData.exit;
    const cx = ex.x + ex.width / 2;

    const halo = this.add.graphics().setDepth(49);
    halo.fillStyle(0xffd700, 0.12);
    halo.fillRoundedRect(ex.x - 8, ex.y - 8, ex.width + 16, ex.height + 16, 8);
    this.exitGlow = halo;

    const frame = this.add.graphics().setDepth(50);
    frame.fillStyle(0x8b7355, 1);
    frame.fillRect(ex.x, ex.y, 5, ex.height);
    frame.fillRect(ex.x + ex.width - 5, ex.y, 5, ex.height);
    frame.fillStyle(0x6b5635, 1);
    frame.fillRect(ex.x, ex.y, ex.width, 5);
    const stripCount = 6;
    const stripW = (ex.width - 10) / stripCount;
    for (let s = 0; s < stripCount; s++) {
      const t = s / (stripCount - 1);
      const r = Math.round(0x33 + t * (0x88 - 0x33));
      const gCol = Math.round(0x22 + t * (0x55 - 0x22));
      const b = Math.round(0x00);
      frame.fillStyle((r << 16) | (gCol << 8) | b, 0.85);
      frame.fillRect(ex.x + 5 + s * stripW, ex.y + 5, Math.ceil(stripW), ex.height - 5);
    }
    frame.fillStyle(0xffd700, 0.6);
    frame.fillRect(ex.x + 5, ex.y + ex.height - 2, ex.width - 10, 2);
    frame.fillStyle(0xffe066, 0.5);
    frame.fillRoundedRect(ex.x + 5, ex.y + 2, ex.width - 10, 4, 2);

    this.exitZone = frame;

    this.exitLabel = this.add
      .text(cx, ex.y - 14, 'SORTIE', {
        fontSize: '11px',
        color: '#ffd700',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#3a2800',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  private animateExit(): void {
    if (!this.exitGlow) return;
    const pulse = 0.18 + Math.sin(this.elapsedTime * EXIT_PULSE_SPEED) * 0.12;
    this.exitGlow.setAlpha(pulse);
    const scalePulse = 1 + Math.sin(this.elapsedTime * EXIT_PULSE_SPEED) * 0.04;
    this.exitGlow.setScale(scalePulse);
    if (this.exitLabel) {
      const labelAlpha = 0.7 + Math.sin(this.elapsedTime * EXIT_PULSE_SPEED) * 0.3;
      this.exitLabel.setAlpha(labelAlpha);
    }
  }

  private isAtExit(x: number, y: number, exX: number, exY: number, exW: number, exH: number): boolean {
    const TOLERANCE = 2;
    return x >= exX && x <= exX + exW &&
           y >= exY - TOLERANCE && y <= exY + exH + TOLERANCE;
  }

  private cleanUp(): void {
    // Remove lifecycle listeners to avoid double-cleanup
    this.events.off('shutdown', this.cleanUp, this);
    this.events.off('destroy', this.cleanUp, this);
    // Kill all tweens before destroying their targets to prevent
    // tween callbacks firing on destroyed game objects
    this.tweens.killAll();
    if (this.diedHandler) { gameEventBus.off('lemming:died', this.diedHandler); this.diedHandler = null; }
    if (this.touchControls) { this.touchControls.destroy(); this.touchControls = null; }
    if (this.hud) { this.hud.destroy(); this.hud = null; }
    if (this.spawnSystem) { this.spawnSystem.destroy(); this.spawnSystem = null; }
    if (this.physicsSystem) { this.physicsSystem.destroy(); this.physicsSystem = null; }
    if (this.terrainSystem) { this.terrainSystem.destroy(); this.terrainSystem = null; }
    if (this.lemmingPool) { this.lemmingPool.destroy(); this.lemmingPool = null; }
    if (this.exitZone) { this.exitZone.destroy(); this.exitZone = null; }
    if (this.exitGlow) { this.exitGlow.destroy(); this.exitGlow = null; }
    if (this.exitLabel) { this.exitLabel.destroy(); this.exitLabel = null; }
    if (this.spawnPortal) { this.spawnPortal.destroy(); this.spawnPortal = null; }
    if (this.spawnLabel) { this.spawnLabel.destroy(); this.spawnLabel = null; }
    if (this.bgGraphics) { this.bgGraphics.destroy(); this.bgGraphics = null; }
    for (const star of this.starGraphics) { star.destroy(); }
    this.starGraphics.length = 0;
  }
}
