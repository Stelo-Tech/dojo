# Règles TypeScript

Ces règles s'appliquent à tous les fichiers `src/**/*.ts`.

## Obligatoire

- `strict: true` — jamais désactivé
- Zéro `any` — utiliser `unknown` + type guards
- Zéro `as` casting — sauf retours Phaser typés en `any` (documenter pourquoi)
- Zéro `@ts-ignore` ou `@ts-expect-error` sans issue GitHub liée
- Zéro `!` (non-null assertion) — vérifier la nullité explicitement

## Nommage

- **PascalCase** : classes, interfaces, types, enums
- **camelCase** : fonctions, variables, méthodes, propriétés
- **UPPER_SNAKE_CASE** : constantes globales
- **I-prefix interdit** : pas de `ILemming`, juste `Lemming` pour l'interface

## Imports

- Chemins absolus via alias `@/` → `src/`
- Pas d'import circulaire
- Grouper : 1) libs externes, 2) `@/` internes, 3) relatifs

## Exports

- 1 classe/interface principale = 1 fichier
- Nom du fichier = nom de l'export principal
- Préférer les named exports aux default exports
