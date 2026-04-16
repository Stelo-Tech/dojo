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

// ---------------------------------------------------------------------------
// Walk animation — 4-frame cycle
// Each tuple: [leftLegOffsetY, rightLegOffsetY, leftArmOffsetY, rightArmOffsetY, headBobY]
// ---------------------------------------------------------------------------
type WalkFrame = [number, number, number, number, number];
const WALK_FRAMES: ReadonlyArray<WalkFrame> = [
  [-3,  0, -1,  1,  0],  // frame 0: left foot forward
  [-1,  0,  0,  0, -1],  // frame 1: mid-step
  [ 0, -3,  1, -1,  0],  // frame 2: right foot forward
  [ 0, -1,  0,  0, -1],  // frame 3: mid-step
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

  // ---------------------------------------------------------------------------
  // Sprite parts — procedural pixel art (no external assets)
  // ---------------------------------------------------------------------------

  // Shadow circle beneath lemming
  private readonly shadow: Phaser.GameObjects.Arc;

  // Body parts
  private readonly torso: Phaser.GameObjects.Rectangle;
  private readonly torsoHi: Phaser.GameObjects.Rectangle; // top highlight strip
  private readonly toolBelt: Phaser.GameObjects.Rectangle; // tiny belt detail

  // Head
  private readonly head: Phaser.GameObjects.Arc;
  private readonly hairTuft: Phaser.GameObjects.Rectangle;
  private readonly eyeLeft: Phaser.GameObjects.Arc;
  private readonly eyeRight: Phaser.GameObjects.Arc;

  // Arms
  private readonly armLeft: Phaser.GameObjects.Rectangle;
  private readonly armRight: Phaser.GameObjects.Rectangle;

  // Legs (slightly thicker than before)
  private readonly legLeft: Phaser.GameObjects.Rectangle;
  private readonly legRight: Phaser.GameObjects.Rectangle;

  // Foot highlights
  private readonly footLeft: Phaser.GameObjects.Rectangle;
  private readonly footRight: Phaser.GameObjects.Rectangle;

  // Bomber countdown — shown above head when in bomber state
  private readonly bomberLabel: Phaser.GameObjects.Text;

  // Legacy zero-size rectangle — kept as flash color handle only
  private readonly body: Phaser.GameObjects.Rectangle;

  private changingState = false;
  private pendingState: string | null = null;
  private walkCycleElapsed = 0;
  private walkFrame = 0;
  private animElapsed = 0; // generic animation timer for non-walk states
  private animFrame = 0;

  private readonly flash: FlashState = {
    active: false,
    elapsed: 0,
    duration: 0,
    color: 0xffffff,
    type: 'none',
  };

  constructor(scene: Phaser.Scene, id: number) {
    this.id = id;

    // Invisible zero-size rectangle — only used as a flash color handle
    this.body = scene.add.rectangle(0, 0, 0, 0, LEMMING_BODY_COLOR);
    this.body.setOrigin(0.5, 1);
    this.body.setVisible(false);
    this.body.setDepth(100);

    // --- Shadow (depth 98, drawn below everything) ---
    this.shadow = scene.add.arc(0, 0, 5, 0, 360, false, 0x000000, 0.28);
    this.shadow.setVisible(false);
    this.shadow.setDepth(98);

    // --- Legs (depth 99, behind torso) ---
    this.legLeft = scene.add.rectangle(0, 0, 3, 5, LEMMING_BODY_COLOR);
    this.legLeft.setOrigin(0.5, 0);
    this.legLeft.setVisible(false);
    this.legLeft.setDepth(99);

    this.legRight = scene.add.rectangle(0, 0, 3, 5, LEMMING_BODY_COLOR);
    this.legRight.setOrigin(0.5, 0);
    this.legRight.setVisible(false);
    this.legRight.setDepth(99);

    // Foot highlights (tiny lighter square at bottom of leg)
    this.footLeft = scene.add.rectangle(0, 0, 3, 2, 0x88ccff);
    this.footLeft.setOrigin(0.5, 0);
    this.footLeft.setVisible(false);
    this.footLeft.setDepth(99);

    this.footRight = scene.add.rectangle(0, 0, 3, 2, 0x88ccff);
    this.footRight.setOrigin(0.5, 0);
    this.footRight.setVisible(false);
    this.footRight.setDepth(99);

    // --- Torso (depth 100) — 10x10px body ---
    this.torso = scene.add.rectangle(0, 0, 10, 10, LEMMING_BODY_COLOR);
    this.torso.setOrigin(0.5, 1);
    this.torso.setVisible(false);
    this.torso.setDepth(100);

    // 1px top highlight on torso
    this.torsoHi = scene.add.rectangle(0, 0, 10, 2, 0x88ccff);
    this.torsoHi.setOrigin(0.5, 1);
    this.torsoHi.setVisible(false);
    this.torsoHi.setDepth(101);

    // Small belt strip in the middle of torso
    this.toolBelt = scene.add.rectangle(0, 0, 10, 2, 0x225588);
    this.toolBelt.setOrigin(0.5, 0.5);
    this.toolBelt.setVisible(false);
    this.toolBelt.setDepth(101);

    // --- Arms (depth 100, same as torso) ---
    this.armLeft = scene.add.rectangle(0, 0, 2, 5, LEMMING_BODY_COLOR);
    this.armLeft.setOrigin(0.5, 0);
    this.armLeft.setVisible(false);
    this.armLeft.setDepth(100);

    this.armRight = scene.add.rectangle(0, 0, 2, 5, LEMMING_BODY_COLOR);
    this.armRight.setOrigin(0.5, 0);
    this.armRight.setVisible(false);
    this.armRight.setDepth(100);

    // --- Head (depth 101) ---
    this.head = scene.add.arc(0, 0, 4.5, 0, 360, false, LEMMING_SKIN_COLOR);
    this.head.setVisible(false);
    this.head.setDepth(101);

    // Hair tuft — 8x3px rectangle above head
    this.hairTuft = scene.add.rectangle(0, 0, 8, 3, HAIR_COLOR);
    this.hairTuft.setOrigin(0.5, 1);
    this.hairTuft.setVisible(false);
    this.hairTuft.setDepth(102);

    // Eyes — two 1.5px dots when facing, one dot in profile
    this.eyeLeft = scene.add.arc(0, 0, 1.5, 0, 360, false, 0x111122);
    this.eyeLeft.setVisible(false);
    this.eyeLeft.setDepth(103);

    this.eyeRight = scene.add.arc(0, 0, 1.5, 0, 360, false, 0x111122);
    this.eyeRight.setVisible(false);
    this.eyeRight.setDepth(103);

    // --- Bomber countdown text (depth 110) ---
    this.bomberLabel = scene.add.text(0, 0, '', {
      fontSize: '10px',
      color: '#ff2200',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#440000',
      strokeThickness: 2,
    });
    this.bomberLabel.setOrigin(0.5, 1);
    this.bomberLabel.setVisible(false);
    this.bomberLabel.setDepth(110);

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
    this.walkFrame = 0;
    this.animElapsed = 0;
    this.animFrame = 0;

    this.flash.active = false;
    this.flash.elapsed = 0;
    this.flash.type = 'none';

    // Reset all parts
    const parts = [
      this.shadow, this.torso, this.torsoHi, this.toolBelt,
      this.head, this.hairTuft, this.eyeLeft, this.eyeRight,
      this.armLeft, this.armRight,
      this.legLeft, this.legRight, this.footLeft, this.footRight,
    ];
    for (const part of parts) {
      part.setAlpha(1);
      part.setScale(1);
      part.setVisible(true);
    }
    this.bomberLabel.setText('');
    this.bomberLabel.setVisible(false);

    // Start in faller state (spawning)
    this.torso.setFillStyle(STATE_COLORS['faller'] ?? LEMMING_BODY_COLOR);
    this.armLeft.setFillStyle(STATE_COLORS['faller'] ?? LEMMING_BODY_COLOR);
    this.armRight.setFillStyle(STATE_COLORS['faller'] ?? LEMMING_BODY_COLOR);
    this.legLeft.setFillStyle(STATE_COLORS['faller'] ?? LEMMING_BODY_COLOR);
    this.legRight.setFillStyle(STATE_COLORS['faller'] ?? LEMMING_BODY_COLOR);

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
    this.updateAnimCycle(dt);
    this.updateFlash(dt);
    this.updateBomberLabel();
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
    this.animElapsed = 0;
    this.animFrame = 0;
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
    for (const part of [
      this.body, this.shadow, this.torso, this.torsoHi, this.toolBelt,
      this.head, this.hairTuft, this.eyeLeft, this.eyeRight,
      this.armLeft, this.armRight,
      this.legLeft, this.legRight, this.footLeft, this.footRight,
      this.bomberLabel,
    ]) {
      part.setVisible(false);
    }
  }

  destroy(): void {
    for (const part of [
      this.body, this.shadow, this.torso, this.torsoHi, this.toolBelt,
      this.head, this.hairTuft, this.eyeLeft, this.eyeRight,
      this.armLeft, this.armRight,
      this.legLeft, this.legRight, this.footLeft, this.footRight,
      this.bomberLabel,
    ]) {
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

  // ---------------------------------------------------------------------------
  // Private — visuals
  // ---------------------------------------------------------------------------

  private applyStateVisuals(): void {
    const color = STATE_COLORS[this.currentStateName];
    if (color !== undefined) {
      this.torso.setFillStyle(color);
      this.armLeft.setFillStyle(color);
      this.armRight.setFillStyle(color);
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
    this.torso.setFillStyle(this.flash.color);
  }

  /** Advance walk/general animation cycle */
  private updateAnimCycle(dt: number): void {
    const frameDuration = this.currentStateName === 'walker' ? 0.1 : 0.15;
    this.walkCycleElapsed += dt;
    this.animElapsed += dt;
    if (this.walkCycleElapsed >= frameDuration) {
      this.walkCycleElapsed = 0;
      const frameCount = this.currentStateName === 'walker' ? WALK_FRAMES.length : 4;
      this.walkFrame = (this.walkFrame + 1) % frameCount;
      this.animFrame = (this.animFrame + 1) % 4;
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
      this.armLeft.setFillStyle(stateColor);
      this.armRight.setFillStyle(stateColor);
      this.legLeft.setFillStyle(stateColor);
      this.legRight.setFillStyle(stateColor);
      return;
    }
    const progress = this.flash.elapsed / this.flash.duration;
    const flashParts = [
      this.torso, this.torsoHi, this.toolBelt,
      this.head, this.hairTuft, this.eyeLeft, this.eyeRight,
      this.armLeft, this.armRight,
      this.legLeft, this.legRight, this.footLeft, this.footRight,
    ];
    if (this.flash.type === 'saved') {
      const scale = 1 + progress * 0.6;
      for (const part of flashParts) {
        part.setScale(scale);
        part.setAlpha(1 - progress * 0.8);
      }
      this.shadow.setAlpha((1 - progress * 0.8) * 0.28);
    } else if (this.flash.type === 'death') {
      for (const part of flashParts) {
        part.setAlpha(1 - progress * 0.7);
      }
      this.shadow.setAlpha((1 - progress * 0.7) * 0.28);
    }
  }

  /** Show bomber countdown label above head */
  private updateBomberLabel(): void {
    if (this.currentStateName !== 'bomber') {
      this.bomberLabel.setVisible(false);
      return;
    }
    const bomberState = this.states.get('bomber');
    // BomberState exposes getCountdown() — narrowing via duck-typed check
    if (
      bomberState !== undefined &&
      typeof (bomberState as { getCountdown?: () => number }).getCountdown === 'function'
    ) {
      const countdown = (bomberState as unknown as { getCountdown: () => number }).getCountdown();
      const secs = Math.ceil(countdown);
      this.bomberLabel.setText(secs > 0 ? `${secs}` : '!');
      this.bomberLabel.setVisible(true);
      // Pulse size: bigger when countdown just ticked over
      const frac = countdown - Math.floor(countdown);
      const scale = 1 + (1 - frac) * 0.3;
      this.bomberLabel.setScale(scale);
    }
  }

  // ---------------------------------------------------------------------------
  // syncGraphic — positions every sprite part based on state + animation frame
  // ---------------------------------------------------------------------------

  private syncGraphic(): void {
    const footY = this.y; // anchor = foot point (bottom-center)

    // --- Shadow: flat ellipse at foot level ---
    this.shadow.setPosition(this.x, footY - 1);

    switch (this.currentStateName) {
      case 'walker':
        this.syncWalker(footY);
        break;
      case 'faller':
        this.syncFaller(footY);
        break;
      case 'digger':
        this.syncDigger(footY);
        break;
      case 'builder':
        this.syncBuilder(footY);
        break;
      case 'blocker':
        this.syncBlocker(footY);
        break;
      case 'bomber':
        this.syncBomber(footY);
        break;
      case 'climber':
        this.syncClimber(footY);
        break;
      case 'floater':
        this.syncFloater(footY);
        break;
      case 'saved':
        this.syncSaved(footY);
        break;
      default:
        // basher, miner, dead — use walker layout as fallback
        this.syncWalker(footY);
        break;
    }

    // Bomber label above head
    if (this.currentStateName === 'bomber') {
      const headCenterY = footY - 5 - 10 - 4.5;
      this.bomberLabel.setPosition(this.x, headCenterY - 4.5 - 2);
    }
  }

  /** Standard upright walk pose with 4-frame cycle */
  private syncWalker(footY: number): void {
    const frame = WALK_FRAMES[this.walkFrame] ?? WALK_FRAMES[0] ?? [0, 0, 0, 0, 0];
    const [llY, rlY, laY, raY, headBob] = frame;

    // Legs
    this.legLeft.setPosition(this.x - 3, footY + llY);
    this.legRight.setPosition(this.x + 3, footY + rlY);
    this.footLeft.setPosition(this.x - 3, footY + llY + 3);
    this.footRight.setPosition(this.x + 3, footY + rlY + 3);

    // Torso (10px tall, sits on legs)
    const torsoBottomY = footY - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms swing opposite to legs
    this.armLeft.setPosition(this.x - 6, torsoBottomY - 10 + laY + 2);
    this.armRight.setPosition(this.x + 6, torsoBottomY - 10 + raY + 2);

    // Head bobs slightly
    const headCenterY = torsoBottomY - 10 - 4.5 + headBob;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'walk');
  }

  /** Faller: arms up, legs spread, alarmed */
  private syncFaller(footY: number): void {
    // Legs spread
    const legSpread = 4 + this.animFrame; // spread grows over frames
    this.legLeft.setPosition(this.x - legSpread, footY);
    this.legRight.setPosition(this.x + legSpread, footY);
    this.footLeft.setPosition(this.x - legSpread, footY + 3);
    this.footRight.setPosition(this.x + legSpread, footY + 3);

    const torsoBottomY = footY - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms raised high
    this.armLeft.setPosition(this.x - 7, torsoBottomY - 12);
    this.armRight.setPosition(this.x + 7, torsoBottomY - 12);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'alarmed');
  }

  /** Digger: hunched forward, arms at sides digging */
  private syncDigger(footY: number): void {
    this.legLeft.setPosition(this.x - 2, footY);
    this.legRight.setPosition(this.x + 2, footY);
    this.footLeft.setPosition(this.x - 2, footY + 3);
    this.footRight.setPosition(this.x + 2, footY + 3);

    // Hunched: torso tilted, lower anchor
    const torsoBottomY = footY - 3;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms alternate up-down for digging motion
    const digBob = this.animFrame < 2 ? -3 : 3;
    this.armLeft.setPosition(this.x - 6, torsoBottomY - 8 + digBob);
    this.armRight.setPosition(this.x + 6, torsoBottomY - 8 - digBob);

    const headCenterY = torsoBottomY - 10 - 4.5 + 3; // tilted forward
    this.head.setPosition(this.x + this.direction * 2, headCenterY);
    this.hairTuft.setPosition(this.x + this.direction * 2, headCenterY - 4.5);
    this.setEyes(headCenterY, 'walk');
  }

  /** Builder: arm extending forward laying brick */
  private syncBuilder(footY: number): void {
    this.legLeft.setPosition(this.x - 3, footY);
    this.legRight.setPosition(this.x + 3, footY);
    this.footLeft.setPosition(this.x - 3, footY + 3);
    this.footRight.setPosition(this.x + 3, footY + 3);

    const torsoBottomY = footY - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // One arm extending forward, one back
    const extendFwd = this.animFrame < 2 ? 6 : 8;
    this.armLeft.setPosition(this.x + this.direction * extendFwd, torsoBottomY - 8);
    this.armRight.setPosition(this.x - this.direction * 4, torsoBottomY - 6);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'walk');
  }

  /** Blocker: arms spread wide, feet planted */
  private syncBlocker(footY: number): void {
    // Feet wider than normal
    this.legLeft.setPosition(this.x - 5, footY);
    this.legRight.setPosition(this.x + 5, footY);
    this.footLeft.setPosition(this.x - 5, footY + 3);
    this.footRight.setPosition(this.x + 5, footY + 3);

    const torsoBottomY = footY - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms fully spread
    this.armLeft.setPosition(this.x - 9, torsoBottomY - 8);
    this.armRight.setPosition(this.x + 9, torsoBottomY - 8);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'alarmed');
  }

  /** Bomber: flashing, crouching slightly, arms out */
  private syncBomber(footY: number): void {
    const crouchOffset = this.animFrame < 2 ? 1 : 0;
    this.legLeft.setPosition(this.x - 3, footY + crouchOffset);
    this.legRight.setPosition(this.x + 3, footY + crouchOffset);
    this.footLeft.setPosition(this.x - 3, footY + 3 + crouchOffset);
    this.footRight.setPosition(this.x + 3, footY + 3 + crouchOffset);

    const torsoBottomY = footY - 4 + crouchOffset;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    this.armLeft.setPosition(this.x - 7, torsoBottomY - 9);
    this.armRight.setPosition(this.x + 7, torsoBottomY - 9);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'alarmed');
  }

  /** Climber: clinging to wall, head tilted up */
  private syncClimber(footY: number): void {
    this.legLeft.setPosition(this.x - 2, footY + this.animFrame);
    this.legRight.setPosition(this.x + 2, footY - this.animFrame);
    this.footLeft.setPosition(this.x - 2, footY + 3 + this.animFrame);
    this.footRight.setPosition(this.x + 2, footY + 3 - this.animFrame);

    const torsoBottomY = footY - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms gripping (one up, one mid)
    const grip = this.animFrame < 2 ? -10 : -5;
    this.armLeft.setPosition(this.x - 5, torsoBottomY + grip);
    this.armRight.setPosition(this.x + 5, torsoBottomY + grip + 5);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'walk');
  }

  /** Floater: arms/legs spread, slow descent */
  private syncFloater(footY: number): void {
    const sway = Math.sin(this.animElapsed * 3) * 1.5;
    this.legLeft.setPosition(this.x - 5 + sway, footY);
    this.legRight.setPosition(this.x + 5 - sway, footY);
    this.footLeft.setPosition(this.x - 5 + sway, footY + 3);
    this.footRight.setPosition(this.x + 5 - sway, footY + 3);

    const torsoBottomY = footY - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms wide like a parachute
    this.armLeft.setPosition(this.x - 9, torsoBottomY - 11 + sway);
    this.armRight.setPosition(this.x + 9, torsoBottomY - 11 - sway);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'walk');
  }

  /** Saved: jumping celebration, arms raised */
  private syncSaved(footY: number): void {
    // Jump arc using elapsed time
    const jumpArc = Math.sin(this.animElapsed * Math.PI * 2) * 4;
    const actualFoot = footY - Math.max(0, jumpArc);

    this.legLeft.setPosition(this.x - 4, actualFoot);
    this.legRight.setPosition(this.x + 4, actualFoot);
    this.footLeft.setPosition(this.x - 4, actualFoot + 3);
    this.footRight.setPosition(this.x + 4, actualFoot + 3);

    const torsoBottomY = actualFoot - 4;
    this.torso.setPosition(this.x, torsoBottomY);
    this.torsoHi.setPosition(this.x, torsoBottomY - 10 + 2);
    this.toolBelt.setPosition(this.x, torsoBottomY - 5);

    // Arms up in celebration
    this.armLeft.setPosition(this.x - 8, torsoBottomY - 13);
    this.armRight.setPosition(this.x + 8, torsoBottomY - 13);

    const headCenterY = torsoBottomY - 10 - 4.5;
    this.head.setPosition(this.x, headCenterY);
    this.hairTuft.setPosition(this.x, headCenterY - 4.5);
    this.setEyes(headCenterY, 'walk');
  }

  /**
   * Position the eye dots based on direction and expression.
   * mode 'walk' = standard forward-facing, 'alarmed' = wide open
   */
  private setEyes(headCenterY: number, mode: 'walk' | 'alarmed'): void {
    if (mode === 'alarmed') {
      // Both eyes visible, slightly wider apart (alarmed expression)
      this.eyeLeft.setPosition(this.x - 1.5, headCenterY - 0.5);
      this.eyeRight.setPosition(this.x + 1.5, headCenterY - 0.5);
      this.eyeLeft.setVisible(true);
      this.eyeRight.setVisible(true);
    } else {
      // Direction-facing: dominant eye toward direction, secondary behind
      const eyeOffsetX = this.direction * 1.5;
      this.eyeLeft.setPosition(this.x + eyeOffsetX, headCenterY - 0.5);
      this.eyeRight.setPosition(this.x - eyeOffsetX * 0.5, headCenterY - 0.5);
      this.eyeLeft.setVisible(true);
      this.eyeRight.setVisible(true);
    }
  }
}
