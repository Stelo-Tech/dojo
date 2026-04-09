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
  LEMMING_BODY_COLOR,
  LEMMING_SKIN_COLOR,
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

// Leg swing offsets (2-frame cycle: left-fwd/right-fwd, alternating)
// Each tuple is [leftLegOffsetY, rightLegOffsetY] relative to foot line
const LEG_FRAMES: ReadonlyArray<[number, number]> = [
  [-2, 0],
  [0, -2],
];

export class Lemming implements LemmingEntity {
  readonly id: number;
  x = 0;
  y = 0;
  direction: 1 | -1 = 1;
  fallDistance = 0;
  alive = false;
  saved = false;
  isClimber = false;
  isFloater = false;

  private readonly states: ReadonlyMap<string, State<LemmingEntity>>;
  private currentState: State<LemmingEntity>;
  private currentStateName = 'walker';

  // Sprite parts — multi-part silhouette (no external assets)
  private readonly torso: Phaser.GameObjects.Rectangle;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly hairTuft: Phaser.GameObjects.Rectangle;
  private readonly eyeDot: Phaser.GameObjects.Arc;
  private readonly legLeft: Phaser.GameObjects.Rectangle;
  private readonly legRight: Phaser.GameObjects.Rectangle;
  // Legacy rectangle kept alive as the "body" reference used by flash logic
  // (zero-size, invisible, same depth — just a handle)
  private readonly body: Phaser.GameObjects.Rectangle;

  private changingState = false;
  private pendingState: string | null = null;
  private walkCycleElapsed = 0;
  private legFrame = 0;

  private readonly flash: FlashState = {
    active: false,
    elapsed: 0,
    duration: 0,
    color: 0xffffff,
    type: 'none',
  };

  constructor(scene: Phaser.Scene, id: number) {
    this.id = id;

    // Invisible zero-size rectangle — only used as a flash color handle so
    // existing flash logic does not need restructuring.
    this.body = scene.add.rectangle(0, 0, 0, 0, LEMMING_BODY_COLOR);
    this.body.setOrigin(0.5, 1);
    this.body.setVisible(false);
    this.body.setDepth(100);

    // Torso — 8x8px blue rectangle, centered at foot-line minus half height
    this.torso = scene.add.rectangle(0, 0, 8, 8, LEMMING_BODY_COLOR);
    this.torso.setOrigin(0.5, 1);
    this.torso.setVisible(false);
    this.torso.setDepth(100);

    // Head — 7px arc (circle), skin tone
    this.head = scene.add.arc(0, 0, 3.5, 0, 360, false, LEMMING_SKIN_COLOR);
    this.head.setVisible(false);
    this.head.setDepth(101);

    // Hair tuft — 6x3px bright rectangle above head
    this.hairTuft = scene.add.rectangle(0, 0, 6, 3, HAIR_COLOR);
    this.hairTuft.setOrigin(0.5, 1);
    this.hairTuft.setVisible(false);
    this.hairTuft.setDepth(102);

    // Eye — 1.5px dot, dark, offset toward direction
    this.eyeDot = scene.add.arc(0, 0, 1.5, 0, 360, false, 0x111122);
    this.eyeDot.setVisible(false);
    this.eyeDot.setDepth(102);

    // Legs — two 3x4px rectangles
    this.legLeft = scene.add.rectangle(0, 0, 3, 4, LEMMING_BODY_COLOR);
    this.legLeft.setOrigin(0.5, 0);
    this.legLeft.setVisible(false);
    this.legLeft.setDepth(99);

    this.legRight = scene.add.rectangle(0, 0, 3, 4, LEMMING_BODY_COLOR);
    this.legRight.setOrigin(0.5, 0);
    this.legRight.setVisible(false);
    this.legRight.setDepth(99);

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
    this.isClimber = false;
    this.isFloater = false;
    this.changingState = false;
    this.pendingState = null;
    this.walkCycleElapsed = 0;
    this.legFrame = 0;

    this.flash.active = false;
    this.flash.elapsed = 0;
    this.flash.type = 'none';

    // Reset all parts to full alpha/scale
    const parts = [this.torso, this.head, this.hairTuft, this.eyeDot, this.legLeft, this.legRight];
    for (const part of parts) {
      part.setAlpha(1);
      part.setScale(1);
      part.setVisible(true);
    }

    // Torso color drives state color
    this.torso.setFillStyle(STATE_COLORS['faller'] ?? LEMMING_BODY_COLOR);

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
    this.updateWalkCycle(dt);
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
    for (const part of [this.body, this.torso, this.head, this.hairTuft, this.eyeDot, this.legLeft, this.legRight]) {
      part.setVisible(false);
    }
  }

  destroy(): void {
    for (const part of [this.body, this.torso, this.head, this.hairTuft, this.eyeDot, this.legLeft, this.legRight]) {
      part.destroy();
    }
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
      this.torso.setFillStyle(color);
      this.legLeft.setFillStyle(color);
      this.legRight.setFillStyle(color);
    }
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
    // Tint torso to flash color
    this.torso.setFillStyle(this.flash.color);
  }

  private updateWalkCycle(dt: number): void {
    if (this.currentStateName !== 'walker') return;
    // Advance cycle at ~5 steps per second
    this.walkCycleElapsed += dt;
    if (this.walkCycleElapsed >= 0.1) {
      this.walkCycleElapsed = 0;
      this.legFrame = (this.legFrame + 1) % LEG_FRAMES.length;
    }
  }

  private updateFlash(dt: number): void {
    if (!this.flash.active) return;
    this.flash.elapsed += dt * 1000;
    if (this.flash.elapsed >= this.flash.duration) {
      this.flash.active = false;
      this.flash.type = 'none';
      const stateColor = STATE_COLORS[this.currentStateName] ?? LEMMING_BODY_COLOR;
      this.torso.setFillStyle(stateColor);
      this.legLeft.setFillStyle(stateColor);
      this.legRight.setFillStyle(stateColor);
      return;
    }
    const progress = this.flash.elapsed / this.flash.duration;
    const flashParts = [this.torso, this.head, this.hairTuft, this.eyeDot, this.legLeft, this.legRight];
    if (this.flash.type === 'saved') {
      const scale = 1 + progress * 0.5;
      for (const part of flashParts) {
        part.setScale(scale);
        part.setAlpha(1 - progress * 0.8);
      }
    } else if (this.flash.type === 'death') {
      for (const part of flashParts) {
        part.setAlpha(1 - progress * 0.6);
      }
    }
  }

  private syncGraphic(): void {
    // Anchor: this.x, this.y is the foot point (bottom-center)
    // Heights: legs 4px, torso 8px (sits on top of legs), head 7px diameter
    const footY = this.y;

    // Legs — placed side by side at foot line
    const legFrame = LEG_FRAMES[this.legFrame] ?? [0, 0];
    this.legLeft.setPosition(this.x - 2, footY + legFrame[0]);
    this.legRight.setPosition(this.x + 2, footY + legFrame[1]);

    // Torso — sits on top of legs (origin bottom-center)
    const torsoBottomY = footY - 2; // slight overlap with legs
    this.torso.setPosition(this.x, torsoBottomY);

    // Head — sits above torso
    const headCenterY = torsoBottomY - 8 - 3.5; // torso height 8 + head radius
    this.head.setPosition(this.x, headCenterY);

    // Hair tuft — above head (origin bottom-center)
    this.hairTuft.setPosition(this.x, headCenterY - 3.5);

    // Eye dot — offset toward direction (front of head)
    const eyeOffsetX = this.direction * 2;
    this.eyeDot.setPosition(this.x + eyeOffsetX, headCenterY - 1);
  }
}
