import Phaser from 'phaser';
import {
  State,
  LemmingEntity,
  TerrainAccess,
  WalkerState,
  FallerState,
  DeadState,
  DiggerState,
  BuilderState,
  BlockerState,
  ClimberState,
  SavedState,
} from '@/entities/LemmingStates';
import { gameEventBus } from '@/utils/EventBus';
import {
  SkillType,
  LEMMING_WIDTH,
  LEMMING_HEIGHT,
  STATE_COLORS,
  HAIR_COLOR,
  DIRECTION_COLOR,
  FLASH_DURATION_DEATH,
  FLASH_DURATION_SAVED,
  FLASH_DURATION_SKILL,
} from '@/utils/Constants';

interface FlashState {
  active: boolean;
  elapsed: number;
  duration: number;
  color: number;
  type: 'death' | 'saved' | 'skill' | 'none';
}

export class Lemming implements LemmingEntity {
  readonly id: number;
  x = 0;
  y = 0;
  direction: 1 | -1 = 1;
  fallDistance = 0;
  alive = false;
  saved = false;
  isBlocker = false;

  private readonly assignedSkills = new Set<SkillType>();
  private readonly states: ReadonlyMap<string, State<LemmingEntity>>;
  private currentState: State<LemmingEntity>;
  private currentStateName = 'walker';
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly hair: Phaser.GameObjects.Rectangle;
  private readonly directionIndicator: Phaser.GameObjects.Triangle;
  private changingState = false;
  private pendingState: string | null = null;
  private terrainAccess: TerrainAccess | null = null;

  private readonly flash: FlashState = {
    active: false,
    elapsed: 0,
    duration: 0,
    color: 0xffffff,
    type: 'none',
  };

  private shakeOffset = 0;
  private shakeTimer = 0;

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
    const digger = new DiggerState();
    const builder = new BuilderState();
    const blocker = new BlockerState();
    const climber = new ClimberState();
    const savedState = new SavedState();

    this.states = new Map<string, State<LemmingEntity>>([
      ['walker', walker],
      ['faller', faller],
      ['dead', dead],
      ['digger', digger],
      ['builder', builder],
      ['blocker', blocker],
      ['climber', climber],
      ['saved', savedState],
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
    this.isBlocker = false;
    this.changingState = false;
    this.pendingState = null;
    this.assignedSkills.clear();
    this.shakeOffset = 0;
    this.shakeTimer = 0;

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
    this.updateShake(dt);
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

  assignSkill(skill: SkillType): void {
    if (skill === 'climber') {
      this.assignedSkills.add('climber');
      this.startFlash('skill');
      gameEventBus.emit('skill:assigned', { lemmingId: this.id, skill });
      return;
    }

    if (skill === 'blocker' && this.currentStateName !== 'walker') return;
    if (skill === 'digger' && this.currentStateName !== 'walker') return;
    if (skill === 'builder' && this.currentStateName !== 'walker') return;

    this.assignedSkills.add(skill);
    this.startFlash('skill');
    this.changeState(skill);
    gameEventBus.emit('skill:assigned', { lemmingId: this.id, skill });
  }

  hasSkill(skill: string): boolean {
    return this.assignedSkills.has(skill as SkillType);
  }

  setColor(color: number): void {
    this.body.setFillStyle(color);
  }

  setTerrainAccess(terrain: TerrainAccess): void {
    this.terrainAccess = terrain;
  }

  getTerrainAccess(): TerrainAccess | null {
    return this.terrainAccess;
  }

  flashSelection(): void {
    this.startFlash('skill');
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
    const w = this.isBlocker ? 18 : LEMMING_WIDTH;
    const h = this.isBlocker ? 18 : LEMMING_HEIGHT;
    return {
      x: this.x - w / 2,
      y: this.y - h,
      width: w,
      height: h,
    };
  }

  private applyStateVisuals(): void {
    const color = STATE_COLORS[this.currentStateName];
    if (color !== undefined) {
      this.body.setFillStyle(color);
    }

    if (this.currentStateName === 'blocker') {
      this.body.setDisplaySize(18, 18);
    } else {
      this.body.setDisplaySize(LEMMING_WIDTH, LEMMING_HEIGHT);
    }

    if (this.currentStateName === 'dead') {
      this.startFlash('death');
    }

    if (this.currentStateName === 'saved') {
      this.startFlash('saved');
    }
  }

  private startFlash(type: 'death' | 'saved' | 'skill'): void {
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
      case 'skill':
        this.flash.duration = FLASH_DURATION_SKILL;
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

  private updateShake(dt: number): void {
    if (this.currentStateName !== 'digger') {
      this.shakeOffset = 0;
      return;
    }
    this.shakeTimer += dt * 1000;
    this.shakeOffset = Math.sin(this.shakeTimer * 0.03) * 1;
  }

  private syncGraphic(): void {
    const displayY = this.y + this.shakeOffset;
    this.body.setPosition(this.x, displayY);
    this.hair.setPosition(this.x, displayY - LEMMING_HEIGHT);
    const dirOffsetX = this.direction * (LEMMING_WIDTH / 2 + 3);
    const dirY = displayY - LEMMING_HEIGHT / 2;
    this.directionIndicator.setPosition(this.x + dirOffsetX, dirY);
    this.directionIndicator.setScale(this.direction, 1);
  }
}
