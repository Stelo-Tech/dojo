# Règles Phaser 3

Ces règles s'appliquent à tous les fichiers `src/**/*.ts` qui interagissent avec Phaser.

## Architecture

- Chaque système est une classe indépendante — pas de logique métier dans les Scenes
- Communication inter-systèmes via EventBus uniquement — pas de références directes
- Les entités (Lemming) ne connaissent pas la Scene — elles communiquent via EventBus

## Performance

- **Jamais de `new`** dans `update()` ou les boucles de rendu
- **Object pooling** obligatoire pour les entités récurrentes (lemmings, particules)
- **Texture atlas** : 1 sprite sheet par catégorie, pas de textures individuelles
- **Camera culling** : ne pas traiter les entités hors écran
- Budget frame : ≤ 16ms total, ≤ 0.1ms par lemming

## Scenes

- `preload()` : uniquement dans BootScene
- `create()` : initialisation, pas de logique de jeu
- `update()` : déléguer aux systèmes, pas de logique directe
- `shutdown()` : nettoyer les listeners et détruire les systèmes

## Assets

- Charger tous les assets dans BootScene
- Format sprite : PNG + JSON atlas
- Format audio : OGG + MP3 (dual format)
- Format niveaux : Tiled JSON
