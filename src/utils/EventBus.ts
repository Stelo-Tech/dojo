/**
 * Typed EventBus for decoupled communication between systems.
 * Generic parameter T maps event names to their payload types.
 */
export class EventBus<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(data: never) => void>>();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.add(handler as (data: never) => void);
    }
  }

  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as (data: never) => void);
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as (data: T[K]) => void)(data);
      }
    }
  }

  once<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const wrapper = (data: T[K]): void => {
      this.off(event, wrapper);
      handler(data);
    };
    this.on(event, wrapper);
  }

  clear(event?: keyof T): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/** Game-wide event type map */
export type GameEvents = {
  'lemming:spawned': { id: number };
  'lemming:spawn': { id: number; x: number; y: number };
  'lemming:saved': { id: number };
  'lemming:died': { id: number; cause: string };
  'lemming:stateChanged': { id: number; from: string; to: string };
  'tool:selected': { tool: string | null };
  'tool:placed': { tool: string; x: number; y: number };
  'tool:counts': { dig: number; stairs: number; wall: number; ramp: number };
  'hud:update': { alive: number; saved: number; dead: number };
  'level:complete': { saved: number; total: number };
  'level:failed': { saved: number; total: number };
  'level:allSpawned': Record<string, never>;
  'level:start': { levelId: string };
  'level:pause': undefined;
  'level:resume': undefined;
  'digger:dig': { id: number; x: number; y: number };
  'basher:dig': { id: number; x: number; y: number; direction: 1 | -1 };
  'miner:dig': { id: number; x: number; y: number; direction: 1 | -1 };
  'builder:build': { id: number; x: number; y: number; direction: 1 | -1 };
  'bomber:explode': { id: number; x: number; y: number };
  'skill:assigned': { lemmingId: number; skill: string };
  'skill:selected': { skill: string | null };
  'skill:counts': Record<string, number>;
}

/** Singleton event bus instance for the game */
export const gameEventBus = new EventBus<GameEvents>();
