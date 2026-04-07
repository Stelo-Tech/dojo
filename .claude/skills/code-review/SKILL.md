---
name: code-review
description: Review de code structuré avec checklist. Vérifie la qualité, les conventions, la performance et la sécurité de chaque PR.
user-invocable: true
allowed-tools: Read Grep Glob Bash
---

# Code Review — Review structuré

## Checklist de review

### 1. Correction
- [ ] Le code fait ce que la spec demande
- [ ] Les edge cases sont gérés (null, vide, overflow, limites)
- [ ] Pas de bug logique (off-by-one, race condition, état invalide)

### 2. TypeScript
- [ ] Pas de `any`, `as any`, `@ts-ignore`
- [ ] Types explicites sur les fonctions publiques
- [ ] Generics utilisés quand approprié
- [ ] Pas d'assertion `!` non justifiée

### 3. Architecture
- [ ] Respect du pattern établi (FSM, EventBus, Pool)
- [ ] Pas de dépendance circulaire
- [ ] Séparation des responsabilités (1 classe = 1 rôle)
- [ ] Pas de couplage direct entre systèmes

### 4. Performance
- [ ] Pas de `new` dans les boucles update/render
- [ ] Object pooling utilisé pour les entités fréquentes
- [ ] Pas de recherche O(n²) évitable
- [ ] Pas de garbage collection pressure (closures dans les boucles)

### 5. Conventions
- [ ] Nommage : PascalCase classes, camelCase fonctions, UPPER_SNAKE constantes
- [ ] 1 classe = 1 fichier, nom identique
- [ ] Imports via alias `@/`
- [ ] Conventional commit message

### 6. Tests
- [ ] Tests ajoutés pour le nouveau code
- [ ] Tests de régression pour les bugs fixés
- [ ] Pas de `.skip` ou `.only` sans justification
- [ ] Mocks typés (pas de `any`)

### 7. Sécurité
- [ ] Pas de secret en dur
- [ ] Pas d'`eval`, `innerHTML` avec données dynamiques
- [ ] Input utilisateur validé/sanitisé
- [ ] `console.log` retiré (utiliser le logger)

## Format du feedback

```
### [Fichier:Ligne] — [Sévérité: critical/major/minor/suggestion]
Description du problème.

**Suggestion :**
\`\`\`typescript
// Code corrigé proposé
\`\`\`
```

## Règles de review

- Être spécifique : citer le code, proposer une alternative
- Distinguer les bloqueurs (critical/major) des suggestions (minor/suggestion)
- Ne pas bloquer une PR pour du style si le linter n'a rien dit
- Reconnaître ce qui est bien fait, pas seulement ce qui ne va pas
