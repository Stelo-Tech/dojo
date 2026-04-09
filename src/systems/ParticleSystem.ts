import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Particle — single pooled unit
// ---------------------------------------------------------------------------

interface Particle {
  gfx: Phaser.GameObjects.Rectangle;
  active: boolean;
  vx: number;
  vy: number;
  lifetime: number;
  elapsed: number;
  gravity: number;
  color: number;
  startAlpha: number;
}

// ---------------------------------------------------------------------------
// Deterministic seeded PRNG (LCG) — avoids Math.random() for reproducibility
// ---------------------------------------------------------------------------

class Rng {
  private seed: number;
  constructor(seed = 0xdeadbeef) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

const rng = new Rng(0xa7c3e1);

// ---------------------------------------------------------------------------
// ParticleSystem
// ---------------------------------------------------------------------------

const POOL_SIZE = 128;

export class ParticleSystem {
  private readonly pool: Particle[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const gfx = scene.add.rectangle(0, 0, 2, 2, 0xffffff, 0);
      gfx.setDepth(80);
      gfx.setActive(false);
      gfx.setVisible(false);
      this.pool.push({
        gfx,
        active: false,
        vx: 0,
        vy: 0,
        lifetime: 0,
        elapsed: 0,
        gravity: 0,
        color: 0xffffff,
        startAlpha: 1,
      });
    }
  }

  // ---------- Public API ---------------------------------------------------

  /** Brown dirt particles flying outward when digging downward */
  emitDigParticles(x: number, y: number): void {
    const count = Math.floor(rng.range(8, 13));
    const colors = [0x7a4a1a, 0x9b6430, 0x5c3510, 0xb07840];
    for (let i = 0; i < count; i++) {
      const angle = rng.range(Math.PI * 1.1, Math.PI * 1.9); // mostly upward
      const speed = rng.range(25, 70);
      const color = colors[Math.floor(rng.range(0, colors.length))] ?? 0x7a4a1a;
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.3, 0.7), 60, 1, color, 2);
    }
  }

  /** Yellow/cyan sparks when a builder places a brick */
  emitBuildParticles(x: number, y: number): void {
    const count = Math.floor(rng.range(4, 7));
    const colors = [0xffdd44, 0x00ccff, 0xffffff, 0xff8800];
    for (let i = 0; i < count; i++) {
      const angle = rng.range(-Math.PI, 0); // upward hemisphere
      const speed = rng.range(15, 50);
      const color = colors[Math.floor(rng.range(0, colors.length))] ?? 0xffdd44;
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.25, 0.5), 80, 1, color, 2);
    }
  }

  /** Big explosion: 20–30 particles in all directions (red/orange/yellow) */
  emitExplosion(x: number, y: number): void {
    const count = Math.floor(rng.range(22, 31));
    const colors = [0xff2200, 0xff6600, 0xffaa00, 0xffff44, 0xffffff];
    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const speed = rng.range(30, 130);
      const color = colors[Math.floor(rng.range(0, colors.length))] ?? 0xff4400;
      const size = Math.floor(rng.range(2, 5));
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.5, 1.2), 50, 1, color, size);
    }
    // Add some slower ember particles
    for (let i = 0; i < 8; i++) {
      const angle = rng.range(Math.PI * 1.1, Math.PI * 1.9);
      const speed = rng.range(10, 40);
      const color = 0xff8800;
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.8, 1.8), 30, 1, color, 3);
    }
  }

  /** Gold/white sparkles floating upward when a lemming is saved */
  emitSaveEffect(x: number, y: number): void {
    const count = Math.floor(rng.range(10, 16));
    const colors = [0xffd700, 0xffffff, 0xffe87c, 0xaaffee];
    for (let i = 0; i < count; i++) {
      const angle = rng.range(-Math.PI, 0); // upward
      const speed = rng.range(15, 55);
      const color = colors[Math.floor(rng.range(0, colors.length))] ?? 0xffd700;
      // Very low gravity so sparkles float elegantly
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.5, 1.0), 10, 1, color, 2);
    }
  }

  /** Grey poof particles expanding outward on death */
  emitDeathPoof(x: number, y: number): void {
    const count = 8;
    const colors = [0x888899, 0xaabbcc, 0x667788];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = rng.range(15, 40);
      const color = colors[Math.floor(rng.range(0, colors.length))] ?? 0x888899;
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.3, 0.6), 25, 1, color, 3);
    }
  }

  /** Blue/white splash particles when hitting water */
  emitSplash(x: number, y: number): void {
    const count = Math.floor(rng.range(6, 9));
    const colors = [0x3399ff, 0x55bbff, 0xaaddff, 0xffffff];
    for (let i = 0; i < count; i++) {
      // Splash arcs upward in a fan
      const t = i / (count - 1);
      const angle = Math.PI * (0.9 + t * (-0.8));
      const speed = rng.range(30, 80);
      const color = colors[Math.floor(rng.range(0, colors.length))] ?? 0x3399ff;
      this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rng.range(0.4, 0.8), 60, 1, color, 2);
    }
  }

  // ---------- Per-frame update — call from scene.update() -----------------

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.elapsed += dt;
      if (p.elapsed >= p.lifetime) {
        this.releaseParticle(p);
        continue;
      }
      const progress = p.elapsed / p.lifetime;
      // Integrate velocity
      p.vy += p.gravity * dt;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      // Fade out
      p.gfx.setAlpha(p.startAlpha * (1 - progress));
    }
  }

  destroy(): void {
    for (const p of this.pool) {
      p.gfx.destroy();
    }
  }

  // ---------- Internal helpers ---------------------------------------------

  private emit(
    x: number,
    y: number,
    vx: number,
    vy: number,
    lifetime: number,
    gravity: number,
    startAlpha: number,
    color: number,
    size: number,
  ): void {
    const p = this.acquire();
    if (!p) return; // pool exhausted — skip silently
    p.vx = vx;
    p.vy = vy;
    p.lifetime = lifetime;
    p.elapsed = 0;
    p.gravity = gravity;
    p.startAlpha = startAlpha;
    p.color = color;
    p.gfx.setFillStyle(color, startAlpha);
    p.gfx.setDisplaySize(size, size);
    p.gfx.setPosition(x, y);
    p.gfx.setAlpha(startAlpha);
    p.gfx.setActive(true);
    p.gfx.setVisible(true);
    p.active = true;
  }

  private acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null; // pool exhausted
  }

  private releaseParticle(p: Particle): void {
    p.active = false;
    p.gfx.setActive(false);
    p.gfx.setVisible(false);
  }
}
