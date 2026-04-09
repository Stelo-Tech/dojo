import Phaser from 'phaser';
import { Lemming } from '@/entities/Lemming';

const INITIAL_POOL_SIZE = 20;

/**
 * Object pool for Lemming entities.
 *
 * Pre-allocates instances at construction; never calls `new` during gameplay.
 * Inactive lemmings are recycled via acquire/release.
 */
export class LemmingPool {
  private readonly available: Lemming[] = [];
  private readonly active: Lemming[] = [];
  private readonly scene: Phaser.Scene;
  private nextId = 0;

  constructor(scene: Phaser.Scene, initialSize: number = INITIAL_POOL_SIZE) {
    this.scene = scene;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(new Lemming(scene, this.nextId++));
    }
  }

  /**
   * Acquire an inactive lemming from the pool.
   * If the pool is empty, grows by one (but this should be rare
   * thanks to pre-allocation).
   */
  acquire(x: number, y: number): Lemming {
    let lemming = this.available.pop();
    if (!lemming) {
      lemming = new Lemming(this.scene, this.nextId++);
    }
    lemming.init(x, y);
    this.active.push(lemming);
    return lemming;
  }

  /** Return a lemming to the pool for reuse. */
  release(lemming: Lemming): void {
    const idx = this.active.indexOf(lemming);
    if (idx !== -1) {
      this.active.splice(idx, 1);
    }
    lemming.deactivate();
    this.available.push(lemming);
  }

  /** Update every active lemming. */
  updateAll(dt: number): void {
    // Iterate backwards so releases during iteration are safe
    for (let i = this.active.length - 1; i >= 0; i--) {
      const lemming = this.active[i];
      if (lemming) {
        lemming.update(dt);

        // Auto-release dead lemmings
        if (!lemming.alive) {
          this.active.splice(i, 1);
          lemming.deactivate();
          this.available.push(lemming);
        }
      }
    }
  }

  /** Snapshot of currently active lemmings (read-only use). */
  getActive(): readonly Lemming[] {
    return this.active;
  }

  /** Total lemmings ever acquired (active + released). */
  get totalCount(): number {
    return this.active.length + this.available.length;
  }

  get activeCount(): number {
    return this.active.length;
  }

  /** Destroy all lemmings and clean up Phaser objects. */
  destroy(): void {
    for (const l of this.active) {
      l.destroy();
    }
    for (const l of this.available) {
      l.destroy();
    }
    this.active.length = 0;
    this.available.length = 0;
  }
}
