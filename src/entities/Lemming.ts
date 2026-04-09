import Phaser from 'phaser';
import {
  State,
  LemmingEntity,
  WalkerState,
  FallerState,
  DeadState,
  SavedState,
  DiggerState,
  BasherState,
  MinerState,
  BuilderState,
  BlockerState,
  ClimberState,
  FloaterState,
  BomberState,
} from '@/entities/LemmingStates';
import { gameEventBus } from '@/utils/EventBus';
import {
  LEMMING_WIDTH,
  LEMMING_HEIGHT,
  STATE_COLORS,
  HAIR_COLOR,
  DIRECTION_COLOR,
  FLASH_DURATION_DEATH,
  FLASH_DURATION_SAVED,
  FLASH_DURATION_PLACEMENT,
} from '@/utils/Constants';

interface FlashState {
  active: boolean;
  elapsed: number;
  duration: number;
  color: number;
  type: 'death' | 'saved' | 'selection' | 'none';
}

export class Lemming implements LemmingEntity {
  readonly id: number;
  x = 0;
  y = 0;
  direction: 1 | -1 = 1;
  fallDistance = 0;
  alive = false;
  saved = false;
  isClimber?: boolean;
  isFloater?: boolean;

  private readonly states: ReadonlyMap<string, State<LemmingEntity>>;
  private currentState: State<LemmingEntity>;
  private currentStateName = 'walker';
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly hair: Phaser.GameObjects.Rectangle;
  private readonly directionIndicator: Phaser.GameObjects.Triangle;
  private changingState = false;
  private pendingState: string | null = null;

  private readonly flash: FlashState = {
    active: false,
    elapsed: 0,
    duration: 0,
    color: 0xffffff,
    type: 'none',
  };

  constructor(scene: Phaser.Scene, id: number) {
    this.id = id;

    this.body = scene.add.rectangle(0, 0, LEMMING_WIDTH, LEMMING_HEIGHT, 0x00ff00);
    this.body.setOrigin(0.5, 1);
    this.body.setVisible(false);
    this.body.setDepth(100);

    this.hair = scene.add.rectangle(0, 0, 6, 3, HAIR_COLOR);
    this.hair.setOrigin(0.5, 1);
    this.hair.setVisible(false);
    this.hair.setDepth(101);

    this.directionIndicator = scene.add.triangle(0, 0, 0, 0, 4, 2, 0, 4);
    this.directionIndicator.setFillStyle(DIRECTION_COLOR);
    this.directionIndicator.setOrigin(0.5, 0.5);
    this.directionIndicator.setVisible(false);
    this.directionIndicator.setDepth(101);

    const walker = new WalkerState();
    const faller = new FallerState();
    const dead = new DeadState();
    const savedState = new SavedState();

    this.states = new Map<string, State<LemmingEntity>>([
      ['walker', walker],
      ['faller', faller],
      ['dead', dead],
      ['saved', savedState],
      ['digger', new DiggerState()],
      ['basher', new BasherState()],
      ['miner', new MinerState()],
      ['builder', new BuilderState()],
      ['blocker', new BlockerState()],
      ['climber', new ClimberState()],
      ['floater', new FloaterState()],
      ['bomber', new BomberState()],
    ]);

    this.currentState = walker;
  }

  init(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.direction = 1;
    this.fallDistance = 0;
    this.alive = true;
    this.saved = false;
    this.changingState = false;
    this.pendingState = null;
    this.isClimber = undefined;
    this.isFloater = undefined;

    this.flash.active = false;
    this.flash.elapsed = 0;
    this.flash.type = 'none';

    this.body.setDisplaySize(LEMMING_WIDTH, LEMMING_HEIGHT);
    this.body.setVisible(true);
    this.body.setFillStyle(STATE_COLORS['faller'] ?? 0xffff00);
    this.body.setAlpha(1);
    this.body.setScale(1);

    this.hair.setVisible(true);
    this.hair.setAlpha(1);

    this.directionIndicator.setVisible(true);
    this.directionIndicator.setAlpha(1);

    this.currentStateName = 'faller';
    const faller = this.states.get('faller');
    if (faller) {
      this.currentState = faller;
      this.currentState.enter(this);
    }
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.currentState.update(this, dt);
    this.updateFlash(dt);
    this.syncGraphic();
  }

  changeState(stateName: string): void {
    if (stateName === this.currentStateName) return;

    const next = this.states.get(stateName);
    if (!next) return;

    if (this.changingState) {
      this.pendingState = stateName;
      return;
    }

    this.changingState = true;
    const from = this.currentStateName;
    this.currentState.exit(this);

    const actualNext = this.pendingState ?? stateName;
    this.pendingState = null;

    const resolvedState = this.states.get(actualNext);
    if (resolvedState) {
      this.currentStateName = actualNext;
      this.currentState = resolvedState;
      this.currentState.enter(this);
    }

    this.changingState = false;
    this.applyStateVisuals();

    gameEventBus.emit('lemming:stateChanged', {
      id: this.id,
      from,
      to: this.currentStateName,
    });
  }

  getStateName(): string {
    return this.currentStateName;
  }

  flashSelection(): void {
    this.startFlash('selection');
  }

  deactivate(): void {
    this.alive = false;
    this.body.setVisible(false);
    this.hair.setVisible(false);
    this.directionIndicator.setVisible(false);
  }

  destroy(): void {
    this.body.destroy();
    this.hair.destroy();
    this.directionIndicator.destroy();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - LEMMING_WIDTH / 2,
      y: this.y - LEMMING_HEIGHT,
      width: LEMMING_WIDTH,
      height: LEMMING_HEIGHT,
    };
  }

  private applyStateVisuals(): void {
    const color = STATE_COLORS[this.currentStateName];
    if (color !== undefined) {
      this.body.setFillStyle(color);
    }
    this.body.setDisplaySize(LEMMING_WIDTH, LEMMING_HEIGHT);
    if (this.currentStateName === 'dead') {
      this.startFlash('death');
    }
    if (this.currentStateName === 'saved') {
      this.startFlash('saved');
    }
  }

  private startFlash(type: 'death' | 'saved' | 'selection'): void {
    this.flash.active = true;
    this.flash.elapsed = 0;
    this.flash.type = type;
    switch (type) {
      case 'death':
        this.flash.duration = FLASH_DURATION_DEATH;
        this.flash.color = 0xff0000;
        break;
      case 'saved':
        this.flash.duration = FLASH_DURATION_SAVED;
        this.flash.color = 0xffffff;
        break;
      case 'selection':
        this.flash.duration = FLASH_DURATION_PLACEMENT;
        this.flash.color = 0xffff00;
        break;
    }
    this.body.setFillStyle(this.flash.color);
  }

  private updateFlash(dt: number): void {
    if (!this.flash.active) return;
    this.flash.elapsed += dt * 1000;
    if (this.flash.elapsed >= this.flash.duration) {
      this.flash.active = false;
      this.flash.type = 'none';
      const stateColor = STATE_COLORS[this.currentStateName];
      if (stateColor !== undefined) {
        this.body.setFillStyle(stateColor);
      }
      return;
    }
    const progress = this.flash.elapsed / this.flash.duration;
    if (this.flash.type === 'saved') {
      const scale = 1 + progress * 0.5;
      this.body.setScale(scale);
      this.body.setAlpha(1 - progress * 0.8);
      this.hair.setAlpha(1 - progress * 0.8);
      this.directionIndicator.setAlpha(1 - progress * 0.8);
    } else if (this.flash.type === 'death') {
      this.body.setAlpha(1 - progress * 0.6);
      this.hair.setAlpha(1 - progress * 0.6);
      this.directionIndicator.setAlpha(1 - progress * 0.6);
    }
  }

  private syncGraphic(): void {
    this.body.setPosition(this.x, this.y);
    this.hair.setPosition(this.x, this.y - LEMMING_HEIGHT);
    const dirOffsetX = this.direction * (LEMMING_WIDTH / 2 + 3);
    const dirY = this.y - LEMMING_HEIGHT / 2;
    this.directionIndicator.setPosition(this.x + dirOffsetX, dirY);
    this.directionIndicator.setScale(this.direction, 1);
  }
}
