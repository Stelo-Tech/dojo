---
name: ts-types
description: Types TypeScript solides pour le projet. Déclarations, assertions, type guards, generics. Garantir la sûreté de typage sans any.
user-invocable: true
allowed-tools: Read Grep Glob Write Edit
---

# TypeScript Types — Typage solide

## Règles du projet

1. **`strict: true`** — non négociable
2. **Zéro `any`** — utiliser `unknown` + type guards
3. **Zéro `as` casting** sauf pour les retours de Phaser typés en `any`
4. **Interfaces pour les contrats publics**, types pour les unions/intersections

## Types fondamentaux du jeu

```typescript
// États du lemming
type LemmingState =
  | 'walker' | 'faller'
  | 'digger' | 'builder' | 'blocker' | 'basher' | 'miner'
  | 'climber' | 'floater' | 'bomber'
  | 'dead' | 'saved';

// Compétences assignables
type Skill = Exclude<LemmingState, 'walker' | 'faller' | 'dead' | 'saved'>;

// Événements du jeu
type GameEvent =
  | { type: 'lemming:spawn'; data: { id: number; x: number; y: number } }
  | { type: 'lemming:saved'; data: { id: number } }
  | { type: 'lemming:died'; data: { id: number; cause: DeathCause } }
  | { type: 'skill:assigned'; data: { lemmingId: number; skill: Skill } }
  | { type: 'level:complete'; data: { saved: number; total: number } };

type DeathCause = 'fall' | 'water' | 'lava' | 'explosion' | 'crush';

// Configuration de niveau
interface LevelConfig {
  readonly version: number;
  readonly name: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly totalLemmings: number;
  readonly spawnRate: number;
  readonly availableSkills: Readonly<Partial<Record<Skill, number>>>;
  readonly parTime: number;
  readonly minSaved: number;
}
```

## Type Guards

```typescript
function isSkill(value: string): value is Skill {
  return ['digger', 'builder', 'blocker', 'basher', 'miner',
          'climber', 'floater', 'bomber'].includes(value);
}

function isLemmingState(value: string): value is LemmingState {
  return isSkill(value) || ['walker', 'faller', 'dead', 'saved'].includes(value);
}
```

## Generics utiles

```typescript
// EventBus typé
interface TypedEventBus<Events extends Record<string, unknown>> {
  emit<K extends keyof Events>(event: K, data: Events[K]): void;
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
}

// Object Pool typé
interface ObjectPool<T> {
  acquire(): T;
  release(item: T): void;
  readonly activeCount: number;
  readonly availableCount: number;
}
```

## Anti-patterns

- ❌ `any` — utiliser `unknown`
- ❌ `as Type` — utiliser un type guard
- ❌ `!` (non-null assertion) — vérifier la nullité
- ❌ `@ts-ignore` — corriger l'erreur
- ❌ `Object`, `Function`, `{}` — être spécifique
