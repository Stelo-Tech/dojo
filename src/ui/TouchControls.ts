import Phaser from 'phaser';
import { LemmingPool } from '@/entities/LemmingPool';
import { Lemming } from '@/entities/Lemming';
import { HUD } from '@/ui/HUD';
import { gameEventBus } from '@/utils/EventBus';

const HIT_MARGIN = 8;

export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly pool: LemmingPool;
  private readonly hud: HUD;

  constructor(scene: Phaser.Scene, pool: LemmingPool, hud: HUD) {
    this.scene = scene;
    this.pool = pool;
    this.hud = hud;

    this.scene.input.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    const tapped = this.findLemmingAt(worldX, worldY);

    if (tapped) {
      const selectedSkill = this.hud.getSelectedSkill();
      if (selectedSkill) {
        const consumed = this.hud.consumeSkill(selectedSkill);
        if (consumed) {
          tapped.assignSkill(selectedSkill);
          gameEventBus.emit('hud:lemmingTapped', { lemmingId: tapped.id });
        }
      } else {
        tapped.flashSelection();
      }
    }
  }

  private findLemmingAt(worldX: number, worldY: number): Lemming | null {
    const active = this.pool.getActive();
    for (let i = active.length - 1; i >= 0; i--) {
      const lemming = active[i];
      if (!lemming || !lemming.alive) continue;

      const bounds = lemming.getBounds();
      if (
        worldX >= bounds.x - HIT_MARGIN &&
        worldX <= bounds.x + bounds.width + HIT_MARGIN &&
        worldY >= bounds.y - HIT_MARGIN &&
        worldY <= bounds.y + bounds.height + HIT_MARGIN
      ) {
        return lemming;
      }
    }
    return null;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
  }
}
