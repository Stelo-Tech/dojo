import {
  LEMMING_SPEED,
  GRAVITY,
  LEMMING_FALL_DISTANCE,
  DIGGER_SPEED_MULT,
  BASHER_SPEED_MULT,
  MINER_SPEED_MULT_X,
  MINER_SPEED_MULT_Y,
  CLIMBER_SPEED_MULT,
  FLOATER_GRAVITY_MULT,
  BUILDER_MAX_STEPS,
  BUILDER_STEP_WIDTH,
  BUILDER_STEP_HEIGHT,
  BUILDER_STEP_INTERVAL,
  BOMBER_COUNTDOWN,
} from '@/utils/Constants';
import { gameEventBus } from '@/utils/EventBus';

export interface State<T> {
  readonly name: string;
  enter(entity: T): void;
  update(entity: T, dt: number): void;
  exit(entity: T): void;
}

export interface LemmingEntity {
  x: number;
  y: number;
  direction: 1 | -1;
  fallDistance: number;
  alive: boolean;
  saved: boolean;
  readonly id: number;
  isClimber?: boolean;
  isFloater?: boolean;
  changeState(stateName: string): void;
}

export class WalkerState implements State<LemmingEntity> {
  readonly name = 'walker';

  enter(entity: LemmingEntity): void {
    entity.fallDistance = 0;
    void entity;
  }

  update(entity: LemmingEntity, dt: number): void {
    entity.x += LEMMING_SPEED * entity.direction * dt;
  }

  exit(_entity: LemmingEntity): void {}
}

export class FallerState implements State<LemmingEntity> {
  readonly name = 'faller';

  enter(_entity: LemmingEntity): void {}

  update(entity: LemmingEntity, dt: number): void {
    const delta = GRAVITY * dt;
    entity.y += delta;
    entity.fallDistance += delta;
  }

  exit(entity: LemmingEntity): void {
    if (entity.fallDistance > LEMMING_FALL_DISTANCE) {
      entity.changeState('dead');
    }
  }
}

export class DeadState implements State<LemmingEntity> {
  readonly name = 'dead';

  enter(entity: LemmingEntity): void {
    entity.alive = false;
  }

  update(_entity: LemmingEntity, _dt: number): void {}
  exit(_entity: LemmingEntity): void {}
}

export class SavedState implements State<LemmingEntity> {
  readonly name = 'saved';

  enter(entity: LemmingEntity): void {
    entity.saved = true;
    entity.alive = false;
  }

  update(_entity: LemmingEntity, _dt: number): void {}
  exit(_entity: LemmingEntity): void {}
}

export class DiggerState implements State<LemmingEntity> {
  readonly name = 'digger';

  enter(_entity: LemmingEntity): void {}

  update(entity: LemmingEntity, dt: number): void {
    entity.y += LEMMING_SPEED * DIGGER_SPEED_MULT * dt;
    gameEventBus.emit('digger:dig', {
      id: entity.id,
      x: entity.x,
      y: entity.y,
    });
  }

  exit(_entity: LemmingEntity): void {}
}

export class BasherState implements State<LemmingEntity> {
  readonly name = 'basher';

  enter(_entity: LemmingEntity): void {}

  update(entity: LemmingEntity, dt: number): void {
    entity.x += LEMMING_SPEED * BASHER_SPEED_MULT * entity.direction * dt;
    gameEventBus.emit('basher:dig', {
      id: entity.id,
      x: entity.x,
      y: entity.y,
      direction: entity.direction,
    });
  }

  exit(_entity: LemmingEntity): void {}
}

export class MinerState implements State<LemmingEntity> {
  readonly name = 'miner';

  enter(_entity: LemmingEntity): void {}

  update(entity: LemmingEntity, dt: number): void {
    entity.x += LEMMING_SPEED * MINER_SPEED_MULT_X * entity.direction * dt;
    entity.y += LEMMING_SPEED * MINER_SPEED_MULT_Y * dt;
    gameEventBus.emit('miner:dig', {
      id: entity.id,
      x: entity.x,
      y: entity.y,
      direction: entity.direction,
    });
  }

  exit(_entity: LemmingEntity): void {}
}

export class BuilderState implements State<LemmingEntity> {
  readonly name = 'builder';
  private stepCount = 0;
  private elapsed = 0;

  enter(_entity: LemmingEntity): void {
    this.stepCount = 0;
    this.elapsed = 0;
  }

  update(entity: LemmingEntity, dt: number): void {
    this.elapsed += dt;

    if (this.elapsed >= BUILDER_STEP_INTERVAL) {
      this.elapsed -= BUILDER_STEP_INTERVAL;
      this.stepCount++;

      entity.x += BUILDER_STEP_WIDTH * entity.direction;
      entity.y -= BUILDER_STEP_HEIGHT;

      gameEventBus.emit('builder:build', {
        id: entity.id,
        x: entity.x,
        y: entity.y,
        direction: entity.direction,
      });

      if (this.stepCount >= BUILDER_MAX_STEPS) {
        entity.changeState('walker');
      }
    }
  }

  exit(_entity: LemmingEntity): void {
    this.stepCount = 0;
    this.elapsed = 0;
  }

  getStepCount(): number {
    return this.stepCount;
  }
}

export class BlockerState implements State<LemmingEntity> {
  readonly name = 'blocker';

  enter(_entity: LemmingEntity): void {}

  update(_entity: LemmingEntity, _dt: number): void {
    // Blocker stands still — no movement
  }

  exit(_entity: LemmingEntity): void {}
}

export class ClimberState implements State<LemmingEntity> {
  readonly name = 'climber';

  enter(_entity: LemmingEntity): void {}

  update(entity: LemmingEntity, dt: number): void {
    entity.y -= LEMMING_SPEED * CLIMBER_SPEED_MULT * dt;
  }

  exit(_entity: LemmingEntity): void {}
}

export class FloaterState implements State<LemmingEntity> {
  readonly name = 'floater';

  enter(entity: LemmingEntity): void {
    // Reset fall distance since floater guarantees a safe landing
    entity.fallDistance = 0;
  }

  update(entity: LemmingEntity, dt: number): void {
    entity.y += GRAVITY * FLOATER_GRAVITY_MULT * dt;
    // Floater does NOT accumulate fallDistance — always safe landing
  }

  exit(_entity: LemmingEntity): void {}
}

export class BomberState implements State<LemmingEntity> {
  readonly name = 'bomber';
  private countdown = BOMBER_COUNTDOWN;

  enter(_entity: LemmingEntity): void {
    this.countdown = BOMBER_COUNTDOWN;
  }

  update(entity: LemmingEntity, dt: number): void {
    this.countdown -= dt;

    if (this.countdown <= 0) {
      gameEventBus.emit('bomber:explode', {
        id: entity.id,
        x: entity.x,
        y: entity.y,
      });
      entity.changeState('dead');
    }
  }

  exit(_entity: LemmingEntity): void {
    this.countdown = BOMBER_COUNTDOWN;
  }

  getCountdown(): number {
    return this.countdown;
  }
}
