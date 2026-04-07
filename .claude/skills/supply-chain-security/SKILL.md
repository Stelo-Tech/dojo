---
name: supply-chain-security
description: Vérification de la sécurité des dépendances. Audit npm/pnpm, détection de packages malveillants, politique de mise à jour.
user-invocable: true
allowed-tools: Read Grep Glob Bash WebSearch
---

# Supply Chain Security — Sécurité des dépendances

## Processus d'audit des dépendances

### Avant d'ajouter une dépendance

1. **Vérifier la légitimité** :
   - Auteur/organisation connu ?
   - Nombre de téléchargements hebdomadaires (> 1000 pour les libs critiques)
   - Dernière mise à jour < 1 an
   - Issues/PRs actives (projet maintenu)
   - Licence compatible (MIT, Apache 2.0, BSD — éviter GPL pour du mobile commercial)

2. **Analyser le package** :
   - Taille du bundle (via bundlephobia.com mentalement)
   - Nombre de dépendances transitives (moins = mieux)
   - Présence de `postinstall` scripts (red flag si non justifié)
   - Code source lisible et auditable

3. **Alternatives** :
   - Peut-on faire sans ? (20 lignes de code > 1 dépendance)
   - Y a-t-il une alternative plus légère/maintenue ?
   - La stdlib ou Phaser fournit-il déjà cette fonctionnalité ?

### Audit régulier

```bash
# Audit des vulnérabilités
pnpm audit --audit-level=high

# Vérifier les packages obsolètes
pnpm outdated

# Vérifier l'intégrité du lockfile
pnpm install --frozen-lockfile
```

### Politique de mise à jour

| Type | Fréquence | Processus |
|------|-----------|-----------|
| Patch (x.x.X) | Automatique via CI | Dependabot/Renovate |
| Minor (x.X.0) | Hebdomadaire | Review + tests |
| Major (X.0.0) | Mensuel | Review approfondi + migration guide |
| Security fix | Immédiat | Hotfix branch |

## Red flags

- ⚠️ Package avec `postinstall` script non documenté
- ⚠️ Package récent (< 6 mois) avec peu de stars mais beaucoup de downloads (typosquatting)
- ⚠️ Changement de mainteneur récent
- ⚠️ Dépendance transitive avec vulnérabilité connue
- ⚠️ Package qui demande des permissions réseau sans raison

## Règles du projet

1. **Lockfile toujours committé** — `pnpm-lock.yaml` versionné
2. **`--frozen-lockfile` en CI** — jamais d'install implicite
3. **Audit bloquant** — le CI fail si vulnérabilité high/critical
4. **Minimal dependencies** — chaque dépendance doit être justifiée
