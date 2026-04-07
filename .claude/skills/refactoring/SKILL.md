---
name: refactoring
description: Refactoring guidé et sécurisé du code TypeScript. Identifier les code smells, proposer des améliorations, refactorer sans changer le comportement.
user-invocable: true
allowed-tools: Read Grep Glob Bash Write Edit
---

# Refactoring — Amélioration continue du code

## Processus de refactoring sécurisé

1. **Vérifier que les tests passent** avant de toucher au code
2. **Identifier le smell** et la transformation à appliquer
3. **Petits pas** : une transformation à la fois, relancer les tests entre chaque
4. **Commit fréquent** : chaque étape de refactoring = 1 commit

## Code smells courants dans un jeu Phaser

| Smell | Signal | Transformation |
|-------|--------|----------------|
| God class | Scene avec > 300 lignes | Extract System classes |
| Switch on type | `switch(lemming.state)` | State pattern / FSM |
| Primitive obsession | `x: number, y: number` partout | Extract `Vector2` type |
| Feature envy | Un système qui accède à 5+ propriétés d'un autre | Move method |
| Long parameter list | Fonction avec > 4 params | Extract config object |
| Duplicate code | Même logique dans 2+ états | Extract method / base class |
| Magic numbers | `if (y > 600)` | Extract constant |
| Shotgun surgery | Changer 1 feature = modifier 5+ fichiers | Consolidate |

## Transformations sûres

### Extract Method
```typescript
// Avant
update(delta: number) {
  this.x += this.vx * delta;
  this.y += this.vy * delta;
  this.vy += GRAVITY * delta;
  if (this.y > groundLevel) { this.y = groundLevel; this.vy = 0; }
}

// Après
update(delta: number) {
  this.applyVelocity(delta);
  this.applyGravity(delta);
  this.clampToGround();
}
```

### Replace Conditional with Polymorphism (State pattern)
```typescript
// Avant : switch géant
update() {
  switch(this.state) {
    case 'walker': /* 20 lignes */ break;
    case 'digger': /* 20 lignes */ break;
  }
}

// Après : State pattern
interface LemmingState {
  update(lemming: Lemming, delta: number): void;
  enter(lemming: Lemming): void;
  exit(lemming: Lemming): void;
}
```

## Règle d'or

> "Refactorer, c'est changer la structure du code sans changer son comportement observable."

Si les tests ne passent plus après un refactoring, c'est qu'on a introduit un bug — rollback immédiat.
