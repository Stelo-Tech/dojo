import Phaser from 'phaser';
import {
  State,
  LemmingEntity,
  WalkerState,
  FallerState,
  DeadState,
} from '@/entities/LemmingStates';
import { gameEventBus } from '@/utils/EventBus';

/**
 * Lemming — core gameplay entity.
 *
 * Wraps a Phaser Rectangle as a placeholder visual (8x12, green).
 * Owns a simple FSM that delegates behaviour to State objects.
 * Communicates exclusively through the global EventBus.
 */
export class Lemming implements LemmingEntity {
  /** Unique identifier (set by the pool on acquire). */
  readonly id: number;

  /** World position */
  x = 0;
  y = 0;

  /** Horizontal walk direction: 1 = right, -1 = left */
  direction: 1 | -1 = 1;

  /** Cumulative pixels fallen (reset on landing). */
  fallDistance = 0;

  /** Whether this lemming is currently alive and active. */
  alive = false;

  /** Whether this lemming reached the exit. */
  saved = false;

  // FSM ----------------------------------------------------------------

  /** Pre-allocated state instances — never created at runtime. */
  private readonly states: ReadonlyMap<string, State<LemmingEntity>>;

  private currentState: State<LemmingEntity>;
  private currentStateName = 'walker';

  /** Phaser visual placeholder */
  private readonly graphic: Phaser.GameObjects.Rectangle;

  // Guard against re-entrant changeState calls during exit()
  private changingState = false;
  // If a state change was requested during exit(), store it here
  private pendingState: string | null = null;

  constructor(scene: Phaser.Scene, id: number) {
    this.id = id;

    // Placeholder rectangle (8x12, green) — created once, reused via pool
    this.graphic = scene.add.rectangle(0, 0, 8, 12, 0x00ff00);
    this.graphic.setOrigin(0.5, 1); // bottom-center anchor
    this.graphic.setVisible(false);

    // Pre-allocate all states
    const walker = new WalkerState();
    const faller = new FallerState();
    const dead = new DeadState();

    this.states = new Map<string, State<LemmingEntity>>([
      ['walker', walker],
      ['faller', faller],
      ['dead', dead],
    ]);

    this.currentState = walker;
  }

  // -- Public API -------------------------------------------------------

  /** Re-initialise the lemming for a new life (called by the pool). */
  init(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.direction = 1;
    this.fallDistance = 0;
    this.alive = true;
    this.saved = false;
    this.changingState = false;
    this.pendingState = null;

    this.graphic.setVisible(true);

    // Start in faller state so physics picks it up immediately
    this.currentStateName = 'faller';
    const faller = this.states.get('faller');
    if (faller) {
      this.currentState = faller;
      this.currentState.enter(this);
    }
  }

  /** Advance simulation by dt seconds. */
  update(dt: number): void {
    if (!this.alive) return;
    this.currentState.update(this, dt);
    this.syncGraphic();
  }

  /** Change the active FSM state by name. */
  changeState(stateName: string): void {
    if (stateName === this.currentStateName) return;

    const next = this.states.get(stateName);
    if (!next) return;

    // Guard re-entrant calls (FallerState.exit may call changeState('dead'))
    if (this.changingState) {
      this.pendingState = stateName;
      return;
    }

    this.changingState = true;

    const from = this.currentStateName;
    this.currentState.exit(this);

    // Check if exit() triggered a pending state change
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

  /** Current state name accessor. */
  getStateName(): string {
    return this.currentStateName;
  }

  /** Hide the visual and mark inactive (pool release). */
  deactivate(): void {
    this.alive = false;
    this.graphic.setVisible(false);
  }

  /** Full cleanup — call only when truly destroying the pool. */
  destroy(): void {
    this.graphic.destroy();
  }

  // -- Internal ---------------------------------------------------------

  private syncGraphic(): void {
    this.graphic.setPosition(this.x, this.y);
  }
}
