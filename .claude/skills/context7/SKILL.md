---
name: context7
description: Récupère la documentation live et à jour de Phaser 3, Capacitor, Vite, Vitest et autres libs du projet. Utiliser AVANT de coder pour vérifier les API actuelles.
user-invocable: true
allowed-tools: WebFetch WebSearch Read
---

# Context7 — Documentation live

Quand tu as besoin de vérifier une API ou un pattern d'une librairie du projet :

## Librairies couvertes

- **Phaser 3** : API complète (Scene, GameObjects, Physics, Input, Sound, Loader, etc.)
- **Capacitor 6** : plugins natifs (App, StatusBar, Keyboard, SplashScreen, etc.)
- **Vite** : configuration, plugins, modes
- **Vitest** : API de test, mocking, coverage
- **TypeScript** : types utilitaires, config

## Workflow

1. Identifie la librairie et la fonctionnalité exacte dont tu as besoin
2. Cherche la documentation officielle la plus récente via WebSearch
3. Vérifie la version utilisée dans `package.json` pour éviter les API dépréciées
4. Retourne les exemples de code pertinents avec les types

## Règles

- Ne jamais deviner une API — toujours vérifier
- Préférer les exemples officiels aux articles de blog
- Indiquer la version de la doc consultée
- Si une API est dépréciée, proposer le remplacement officiel

## Sources prioritaires

1. Documentation officielle (phaser.io/docs, capacitorjs.com/docs, vitejs.dev)
2. GitHub repos (exemples officiels, issues résolues)
3. Release notes pour les changements récents
