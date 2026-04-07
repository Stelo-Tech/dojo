import {
  LEMMING_SPEED,
  GRAVITY,
  LEMMING_FALL_DISTANCE,
  DIG_SPEED,
  BUILD_INTERVAL,
  BUILD_MAX_STEPS,
  BUILD_STEP_WIDTH,
  BUILD_STEP_HEIGHT,
  CLIMB_SPEED,
  CLIMB_MAX_HEIGHT,
  STATE_COLORS,
} from '@/utils/Constants';

export interface State<T> {
  readonly name: string;
  enter(entity: T): void;
  update(entity: T, dt: number): void;
  exit(entity: T): void;
}

export interface TerrainAccess {
  isGround(x: number, y: number): boolean;
  isWall(x: number, y: number): boolean;
  digColumn(x: number, y: number, width: number, height: number): void;
  digHorizontal(x: number, y: number, width: number, height: number): void;
  buildStep(x: number, y: number, width: number, height: number): void;
}

export interface LemmingEntity {
  x: number;
  y: number;
  direction: 1 | -1;
  fallDistance: number;
  alive: boolean;
  saved: boolean;
  isBlocker: boolean;
  readonly id: number;
  changeState(stateName: string): void;
  setColor(color: number): void;
  getTerrainAccess(): TerrainAccess | null;
  hasSkill(skill: string): boolean;
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

export class DiggerState implements State<LemmingEntity> {
  readonly name = 'digger';

  enter(entity: LemmingEntity): void {
    entity.setColor(STATE_COLORS['digger'] ?? 0xcd853f);
  }

  update(entity: LemmingEntity, dt: number): void {
    const terrain = entity.getTerrainAccess();
    if (!terrain) {
      entity.changeState('walker');
      return;
    }

    const digAmount = DIG_SPEED * dt;
    const digWidth = 10;
    terrain.digColumn(entity.x - digWidth / 2, entity.y, digWidth, digAmount);
    entity.y += digAmount;

    const hasGroundBelow =
      terrain.isGround(entity.x, entity.y + 1) ||
      terrain.isGround(entity.x - 3, entity.y + 1) ||
      terrain.isGround(entity.x + 3, entity.y + 1);

    if (!hasGroundBelow) {
      entity.changeState('faller');
    }
  }

  exit(_entity: LemmingEntity): void {}
}

export class BuilderState implements State<LemmingEntity> {
  readonly name = 'builder';
  private stepsPlaced = 0;
  private timeSinceLastStep = 0;

  enter(entity: LemmingEntity): void {
    entity.setColor(STATE_COLORS['builder'] ?? 0x00ffff);
    this.stepsPlaced = 0;
    this.timeSinceLastStep = BUILD_INTERVAL;
  }

  update(entity: LemmingEntity, dt: number): void {
    const terrain = entity.getTerrainAccess();
    if (!terrain) {
      entity.changeState('walker');
      return;
    }

    this.timeSinceLastStep += dt * 1000;

    if (this.timeSinceLastStep >= BUILD_INTERVAL) {
      this.timeSinceLastStep -= BUILD_INTERVAL;
      const stepX = entity.direction === 1 ? entity.x : entity.x - BUILD_STEP_WIDTH;
      const stepY = entity.y - BUILD_STEP_HEIGHT;
      terrain.buildStep(stepX, stepY, BUILD_STEP_WIDTH, BUILD_STEP_HEIGHT);
      entity.y -= BUILD_STEP_HEIGHT;
      entity.x += entity.direction * (BUILD_STEP_WIDTH / 2);
      this.stepsPlaced++;
      if (this.stepsPlaced >= BUILD_MAX_STEPS) {
        entity.changeState('walker');
      }
    }
  }

  exit(_entity: LemmingEntity): void {
    this.stepsPlaced = 0;
    this.timeSinceLastStep = 0;
  }
}

export class BlockerState implements State<LemmingEntity> {
  readonly name = 'blocker';

  enter(entity: LemmingEntity): void {
    entity.setColor(STATE_COLORS['blocker'] ?? 0xff4444);
    entity.isBlocker = true;
  }

  update(_entity: LemmingEntity, _dt: number): void {}

  exit(entity: LemmingEntity): void {
    entity.isBlocker = false;
  }
}

export class ClimberState implements State<LemmingEntity> {
  readonly name = 'climber';
  private climbedDistance = 0;

  enter(entity: LemmingEntity): void {
    entity.setColor(STATE_COLORS['climber'] ?? 0xff00ff);
    this.climbedDistance = 0;
  }

  update(entity: LemmingEntity, dt: number): void {
    const terrain = entity.getTerrainAccess();
    if (!terrain) {
      entity.changeState('faller');
      return;
    }

    const climbAmount = CLIMB_SPEED * dt;
    entity.y -= climbAmount;
    this.climbedDistance += climbAmount;

    const checkX = entity.x + entity.direction * 6;
    const wallStillThere = terrain.isWall(checkX, entity.y - 6);
    const topClear = !terrain.isWall(checkX, entity.y - 12);

    if (topClear && !wallStillThere) {
      entity.x += entity.direction * 6;
      entity.changeState('walker');
      return;
    }

    if (this.climbedDistance >= CLIMB_MAX_HEIGHT) {
      entity.direction = entity.direction === 1 ? -1 : 1;
      entity.changeState('faller');
    }
  }

  exit(_entity: LemmingEntity): void {
    this.climbedDistance = 0;
  }
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
