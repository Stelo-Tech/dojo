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
  EXIT_PULSE_SPEED,
} from '@/utils/Constants';
import { gameEventBus } from '@/utils/EventBus';
import { LemmingPool } from '@/entities/LemmingPool';
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
  private exitZone: Phaser.GameObjects.Graphics | null = null;
  private exitGlow: Phaser.GameObjects.Graphics | null = null;
  private exitLabel: Phaser.GameObjects.Text | null = null;
  private savedCount = 0;
  private deadCount = 0;
  private diedHandler: ((data: { id: number; cause: string }) => void) | null = null;
  private elapsedTime = 0;

  private bgGraphics: Phaser.GameObjects.Graphics | null = null;
  private readonly starGraphics: Phaser.GameObjects.Arc[] = [];
  private spawnPortal: Phaser.GameObjects.Graphics | null = null;
  private spawnLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.savedCount = 0;
    this.deadCount = 0;
    this.elapsedTime = 0;

    this.createBackground();
    this.createStars();

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
    this.touchControls = new TouchControls(this, this.hud, this.terrainSystem);

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
    // Simulate a vertical gradient by drawing thin horizontal strips that
    // interpolate between BG_COLOR_TOP (top) → BG_COLOR_MID (sky line) →
    // BG_COLOR_BOTTOM (ground level).  Using 60 strips gives a smooth
    // appearance without any external shader dependency.
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

    const skyFraction = 0.65; // top 65 % is sky, bottom 35 % is underground glow

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

    // Subtle atmospheric haze near terrain line
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

      // Colour temperature: mostly white, some warm/cool tints
      const tint = nextRand();
      let color = 0xffffff;
      if (tint < 0.15) color = 0xffe8d0; // warm
      else if (tint < 0.3) color = 0xd0e8ff; // cool blue

      const star = this.add.circle(sx, sy, radius, color, baseAlpha).setDepth(1);
      this.starGraphics.push(star);

      // Gentle twinkle tween with randomised delay
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

  private buildLevel(): void {
    if (!this.terrainSystem) return;
    this.terrainSystem.fillRect(PLATFORM_LEFT.x, PLATFORM_LEFT.y, PLATFORM_LEFT.w, PLATFORM_LEFT.h);
    const slopeStartX = PLATFORM_LEFT.x + PLATFORM_LEFT.w;
    const slopeTopY = PLATFORM_LEFT.y + PLATFORM_LEFT.h;
    const slopeSteps = 10;
    const stepW = 5;
    const stepH = Math.ceil((TERRAIN_Y - slopeTopY) / slopeSteps);
    for (let s = 0; s < slopeSteps; s++) {
      const sx = slopeStartX + s * stepW;
      const sy = slopeTopY + s * stepH;
      this.terrainSystem.fillRect(sx, sy, stepW, TERRAIN_Y - sy + 10);
    }
    this.terrainSystem.eraseRect(LEFT_CLIFF_GAP.x, LEFT_CLIFF_GAP.y, LEFT_CLIFF_GAP.w, LEFT_CLIFF_GAP.h);
    this.terrainSystem.eraseRect(FOSSE_GAP.x, FOSSE_GAP.y, FOSSE_GAP.w, FOSSE_GAP.h);
    this.terrainSystem.fillRect(WALL_VERT.x, WALL_VERT.y, WALL_VERT.w, WALL_VERT.h);
    this.terrainSystem.fillRect(EXIT_PLATFORM.x, EXIT_PLATFORM.y, EXIT_PLATFORM.w, EXIT_PLATFORM.h);
  }

  private createSpawnPortal(): void {
    const portalX = SPAWN_X;
    const portalY = SPAWN_Y - 10;
    const pw = SPAWN_PORTAL_WIDTH + 10;
    const ph = SPAWN_PORTAL_HEIGHT + 10;

    const g = this.add.graphics().setDepth(50);
    this.spawnPortal = g;

    // Outer glow ring
    g.fillStyle(0x2255cc, 0.25);
    g.fillEllipse(portalX, portalY, pw + 20, ph + 20);

    // Portal rim (darker blue ring)
    g.fillStyle(0x1a44bb, 0.85);
    g.fillEllipse(portalX, portalY, pw + 8, ph + 8);

    // Portal inner (bright core)
    g.fillStyle(0x66aaff, 0.9);
    g.fillEllipse(portalX, portalY, pw, ph);

    // Specular highlight
    g.fillStyle(0xeef4ff, 0.5);
    g.fillEllipse(portalX - pw * 0.18, portalY - ph * 0.25, pw * 0.4, ph * 0.28);

    // Downward-pointing arrow to signal lemmings come from here
    g.fillStyle(0xffffff, 0.8);
    const ax = portalX;
    const ay = portalY + ph * 0.5 + 6;
    g.fillTriangle(ax - 6, ay, ax + 6, ay, ax, ay + 9);

    // Pulsing outer aura tween
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
    const cx = EXIT_X + EXIT_WIDTH / 2;
    const cy = EXIT_Y + EXIT_HEIGHT / 2;

    // Outer glow halo — soft warm gold
    const halo = this.add.graphics().setDepth(49);
    halo.fillStyle(0xffd700, 0.12);
    halo.fillRoundedRect(EXIT_X - 8, EXIT_Y - 8, EXIT_WIDTH + 16, EXIT_HEIGHT + 16, 8);
    this.exitGlow = halo;

    // Door frame — two pillars + lintel
    const frame = this.add.graphics().setDepth(50);
    // Left pillar
    frame.fillStyle(0x8b7355, 1);
    frame.fillRect(EXIT_X, EXIT_Y, 5, EXIT_HEIGHT);
    // Right pillar
    frame.fillRect(EXIT_X + EXIT_WIDTH - 5, EXIT_Y, 5, EXIT_HEIGHT);
    // Lintel (top bar)
    frame.fillStyle(0x6b5635, 1);
    frame.fillRect(EXIT_X, EXIT_Y, EXIT_WIDTH, 5);
    // Door interior — warm amber with gradient strips
    const stripCount = 6;
    const stripW = (EXIT_WIDTH - 10) / stripCount;
    for (let s = 0; s < stripCount; s++) {
      const t = s / (stripCount - 1);
      const r = Math.round(0x33 + t * (0x88 - 0x33));
      const g = Math.round(0x22 + t * (0x55 - 0x22));
      const b = Math.round(0x00);
      frame.fillStyle((r << 16) | (g << 8) | b, 0.85);
      frame.fillRect(EXIT_X + 5 + s * stripW, EXIT_Y + 5, Math.ceil(stripW), EXIT_HEIGHT - 5);
    }
    // Threshold line at bottom
    frame.fillStyle(0xffd700, 0.6);
    frame.fillRect(EXIT_X + 5, EXIT_Y + EXIT_HEIGHT - 2, EXIT_WIDTH - 10, 2);
    // Arch highlight above door
    frame.fillStyle(0xffe066, 0.5);
    frame.fillRoundedRect(EXIT_X + 5, EXIT_Y + 2, EXIT_WIDTH - 10, 4, 2);

    this.exitZone = frame;

    this.exitLabel = this.add
      .text(cx, EXIT_Y - 14, 'SORTIE', {
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
    // Also animate the exit label brightness
    if (this.exitLabel) {
      const labelAlpha = 0.7 + Math.sin(this.elapsedTime * EXIT_PULSE_SPEED) * 0.3;
      this.exitLabel.setAlpha(labelAlpha);
    }
  }

  private isAtExit(x: number, y: number): boolean {
    const TOLERANCE = 2;
    return x >= EXIT_X && x <= EXIT_X + EXIT_WIDTH &&
           y >= EXIT_Y - TOLERANCE && y <= EXIT_Y + EXIT_HEIGHT + TOLERANCE;
  }

  shutdown(): void { this.cleanUp(); }
  destroy(): void { this.cleanUp(); }

  private cleanUp(): void {
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
