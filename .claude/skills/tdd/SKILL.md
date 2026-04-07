---
name: tdd
description: Test-Driven Development pour TypeScript. Écrire le test d'abord, voir le rouge, implémenter le minimum, voir le vert, refactorer. Utiliser pour développer des systèmes critiques.
user-invocable: true
allowed-tools: Read Grep Glob Bash Write Edit
---

# TDD — Test-Driven Development

## Le cycle Red-Green-Refactor

```
1. RED    → Écrire un test qui échoue (compile mais fail)
2. GREEN  → Écrire le minimum de code pour faire passer le test
3. REFACTOR → Améliorer le code sans changer le comportement (les tests restent verts)
```

## Règles strictes

1. **Ne jamais écrire de code de production sans un test qui échoue d'abord**
2. **Ne pas écrire plus de test que nécessaire pour avoir UN échec**
3. **Ne pas écrire plus de code que nécessaire pour faire passer le test**
4. **Refactorer uniquement quand tous les tests sont verts**

## Workflow concret pour ce projet

### Étape 1 : Écrire le test
```typescript
// tests/unit/entities/Lemming.test.ts
describe('Lemming', () => {
  it('starts in walker state', () => {
    const lemming = new Lemming(100, 50);
    expect(lemming.state).toBe('walker');
  });
});
```

### Étape 2 : Vérifier que ça fail
```bash
pnpm test -- --run tests/unit/entities/Lemming.test.ts
# ❌ FAIL — Lemming is not defined
```

### Étape 3 : Implémenter le minimum
```typescript
// src/entities/Lemming.ts
export class Lemming {
  public state = 'walker';
  constructor(public x: number, public y: number) {}
}
```

### Étape 4 : Vérifier que ça passe
```bash
pnpm test -- --run tests/unit/entities/Lemming.test.ts
# ✅ PASS
```

### Étape 5 : Refactorer si nécessaire
```typescript
// Extraire le type des états
type LemmingState = 'walker' | 'digger' | 'builder' | 'blocker';

export class Lemming {
  public state: LemmingState = 'walker';
  constructor(public x: number, public y: number) {}
}
```

### Étape 6 : Prochain test → recommencer

## Quand utiliser TDD dans ce projet

| Système | TDD obligatoire ? | Raison |
|---------|-------------------|--------|
| FSM Lemming | ✅ Oui | Logique critique, beaucoup d'états |
| PhysicsSystem | ✅ Oui | Edge cases nombreux |
| LevelValidator | ✅ Oui | Validation = spécification exécutable |
| SaveSystem | ✅ Oui | Migrations, formats |
| HUD / UI | ❌ Non | Trop couplé au rendu, tester manuellement |
| Assets pipeline | ❌ Non | Scripts utilitaires, tester par résultat |

## Anti-patterns à éviter

- ❌ Écrire tous les tests d'abord puis tout implémenter
- ❌ Tester les détails d'implémentation (quelles méthodes privées sont appelées)
- ❌ Faire passer le test avec un hack puis oublier de refactorer
- ❌ Ignorer l'étape RED (écrire test + code en même temps)
