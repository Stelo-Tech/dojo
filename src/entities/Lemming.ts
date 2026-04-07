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
import { SkillType } from '@/utils/Constants';

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
  private readonly graphic: Phaser.GameObjects.Rectangle;
  private changingState = false;
  private pendingState: string | null = null;
  private terrainAccess: TerrainAccess | null = null;

  constructor(scene: Phaser.Scene, id: number) {
    this.id = id;
    this.graphic = scene.add.rectangle(0, 0, 8, 12, 0x00ff00);
    this.graphic.setOrigin(0.5, 1);
    this.graphic.setVisible(false);

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

    this.graphic.setVisible(true);
    this.graphic.setFillStyle(0x00ff00);

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
      gameEventBus.emit('skill:assigned', { lemmingId: this.id, skill });
      return;
    }

    if (skill === 'blocker' && this.currentStateName !== 'walker') return;
    if (skill === 'digger' && this.currentStateName !== 'walker') return;
    if (skill === 'builder' && this.currentStateName !== 'walker') return;

    this.assignedSkills.add(skill);
    this.changeState(skill);
    gameEventBus.emit('skill:assigned', { lemmingId: this.id, skill });
  }

  hasSkill(skill: string): boolean {
    return this.assignedSkills.has(skill as SkillType);
  }

  setColor(color: number): void {
    this.graphic.setFillStyle(color);
  }

  setTerrainAccess(terrain: TerrainAccess): void {
    this.terrainAccess = terrain;
  }

  getTerrainAccess(): TerrainAccess | null {
    return this.terrainAccess;
  }

  flashSelection(): void {
    this.graphic.setFillStyle(0xffffff);
  }

  deactivate(): void {
    this.alive = false;
    this.graphic.setVisible(false);
  }

  destroy(): void {
    this.graphic.destroy();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - 4,
      y: this.y - 12,
      width: 8,
      height: 12,
    };
  }

  private syncGraphic(): void {
    this.graphic.setPosition(this.x, this.y);
  }
}
