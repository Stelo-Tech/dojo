---
name: webapp-testing
description: Stratégies et patterns de test pour applications web/jeux. Couvre les tests unitaires Vitest, E2E Playwright, mocking Phaser, et tests de performance.
user-invocable: true
allowed-tools: Read Grep Glob Bash Write Edit
---

# Webapp Testing — Stratégies de test

## Principes fondamentaux

1. **Tester le comportement, pas l'implémentation** — assert sur les résultats, pas les détails internes
2. **Arrange-Act-Assert** — structure claire pour chaque test
3. **1 assertion par concept** — un test ne vérifie qu'une seule chose
4. **Tests déterministes** — pas de flaky tests, pas de dépendance au timing

## Stack de test du projet

- **Vitest** : tests unitaires et d'intégration
- **Playwright** : tests E2E (flows complets dans le navigateur)
- **Testing Library patterns** : même philosophie (tester comme l'utilisateur)

## Patterns pour tester du code Phaser

```typescript
// Mock minimal d'une Scene Phaser pour tests unitaires
const createMockScene = (): Partial<Phaser.Scene> => ({
  add: { sprite: vi.fn(), text: vi.fn() } as any,
  physics: { add: { sprite: vi.fn() } } as any,
  time: { addEvent: vi.fn() } as any,
  events: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any,
});

// Test d'un système indépendant
describe('SpawnSystem', () => {
  let system: SpawnSystem;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    system = new SpawnSystem(mockEventBus, { rate: 2, total: 10 });
  });

  it('spawns lemmings at the configured rate', () => {
    system.update(1000); // 1 seconde
    expect(mockEventBus.emitted('lemming:spawn')).toHaveLength(2);
  });
});
```

## Tests de performance

```typescript
describe('Performance', () => {
  it('updates 100 lemmings under 10ms', () => {
    const lemmings = Array.from({ length: 100 }, () => createTestLemming());
    const start = performance.now();
    lemmings.forEach(l => l.update(16));
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});
```

## Checklist avant PR

- [ ] Tous les tests passent (`pnpm test`)
- [ ] Coverage ≥ seuils définis
- [ ] Pas de `.only` ou `.skip` sans justification
- [ ] Pas de `any` dans les tests
- [ ] Tests de régression pour chaque bug fix
