import {
  LEMMING_SPEED,
  GRAVITY,
  LEMMING_FALL_DISTANCE,
} from '@/utils/Constants';

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
