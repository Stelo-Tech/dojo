---
name: game-development
description: Patterns et architecture Phaser 3 pour jeux 2D. Couvre les scenes, game objects, physics, input, state machines, object pooling et optimisation.
user-invocable: true
allowed-tools: Read Grep Glob Write Edit WebSearch WebFetch
---

# Game Development — Patterns Phaser 3

## Architecture Scene

```typescript
// Pattern Scene avec lifecycle clair
export class GameScene extends Phaser.Scene {
  private systems: GameSystem[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Chargement des assets (déjà fait en BootScene normalement)
  }

  create(data: LevelConfig): void {
    // Initialisation des systèmes
    this.systems = [
      new TerrainSystem(this, data.tilemap),
      new SpawnSystem(this.eventBus, data),
      new PhysicsSystem(this),
    ];
  }

  update(time: number, delta: number): void {
    for (const system of this.systems) {
      system.update(delta);
    }
  }

  shutdown(): void {
    for (const system of this.systems) {
      system.destroy();
    }
  }
}
```

## FSM (Finite State Machine) pour les lemmings

```typescript
interface State<T> {
  enter(entity: T): void;
  update(entity: T, delta: number): void;
  exit(entity: T): void;
}

class StateMachine<T> {
  private current: State<T> | null = null;
  private states = new Map<string, State<T>>();

  addState(name: string, state: State<T>): void {
    this.states.set(name, state);
  }

  transition(entity: T, to: string): void {
    this.current?.exit(entity);
    this.current = this.states.get(to) ?? null;
    this.current?.enter(entity);
  }

  update(entity: T, delta: number): void {
    this.current?.update(entity, delta);
  }
}
```

## Object Pooling

```typescript
class ObjectPool<T> {
  private available: T[] = [];
  private active = new Set<T>();

  constructor(
    private factory: () => T,
    private reset: (item: T) => void,
    initialSize: number
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T | null {
    const item = this.available.pop() ?? null;
    if (item) this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (this.active.delete(item)) {
      this.reset(item);
      this.available.push(item);
    }
  }
}
```

## EventBus typé

```typescript
type EventMap = {
  'lemming:spawn': { id: number; x: number; y: number };
  'lemming:saved': { id: number };
  'lemming:died': { id: number; cause: string };
  'skill:assigned': { lemmingId: number; skill: string };
  'level:complete': { saved: number; total: number; time: number };
};

class EventBus {
  private listeners = new Map<string, Set<Function>>();

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event as string)?.forEach(fn => fn(data));
  }

  on<K extends keyof EventMap>(event: K, fn: (data: EventMap[K]) => void): void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(fn);
  }

  off<K extends keyof EventMap>(event: K, fn: Function): void {
    this.listeners.get(event as string)?.delete(fn);
  }
}
```

## Terrain destructible

```typescript
// Approche RenderTexture pour terrain pixel-perfect
class DestructibleTerrain {
  private texture: Phaser.GameObjects.RenderTexture;

  destroy(x: number, y: number, radius: number): void {
    // Dessiner un cercle transparent pour "creuser"
    this.texture.erase('circle', x - radius, y - radius);
  }

  isGround(x: number, y: number): boolean {
    // Vérifier le pixel à cette position
    const pixel = this.texture.getPixel(x, y);
    return pixel.alpha > 0;
  }
}
```

## Optimisations clés

1. **Object pooling** pour lemmings et particules — jamais de `new` en boucle update
2. **Spatial hashing** si > 50 entités — éviter O(n²) collision checks
3. **Dirty flag** — ne recalculer que ce qui a changé
4. **Texture atlas** — 1 draw call pour tous les sprites du même atlas
5. **Camera culling** — ne pas updater/render ce qui est hors écran
