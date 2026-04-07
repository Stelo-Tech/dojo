# Règles Git

## Commits

- **Conventional commits** obligatoire : `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Message en anglais, impératif : "add level loader" pas "added level loader"
- 1 commit = 1 changement logique
- Pas de commit qui casse le build

## Branches

- `main` : toujours stable, déployable
- `feat/xxx` : nouvelle fonctionnalité
- `fix/xxx` : correction de bug
- `refactor/xxx` : refactoring sans changement de comportement

## Pull Requests

- Titre court (< 70 caractères)
- Description avec : ce qui change, pourquoi, comment tester
- Au moins 1 review d'un agent compétent sur le domaine
- Tous les tests doivent passer
- Pas de merge sans CI vert
