---
name: algorithmic-art
description: Génération procédurale de patterns, textures et effets visuels pour le jeu. Couvre le pixel art algorithmique, les palettes de couleurs et les effets de particules.
user-invocable: true
allowed-tools: Read Write Edit Bash
---

# Algorithmic Art — Art procédural pour le jeu

## Domaines d'application

### Génération de terrain
- Bruit de Perlin pour les variations de terrain naturel
- Cellular automata pour les grottes
- Wave Function Collapse pour les tilesets cohérents

### Palettes de couleurs
- Génération de palettes harmonieuses (complémentaires, analogues, triadiques)
- Limitation à 16 couleurs par biome pour cohérence pixel art
- Dégradés calculés pour les backgrounds (ciel, souterrain)

### Effets de particules
- Systèmes de particules pour : explosions, poussière de creusement, eau, lave
- Paramètres : émission rate, lifetime, gravité, taille, couleur, alpha
- Optimisation : object pooling obligatoire pour les particules

### Patterns répétitifs
- Textures tileable pour backgrounds
- Dithering patterns pour les transitions entre biomes
- Noise textures pour la variation visuelle

## Exemple : génération de palette biome

```typescript
interface BiomePalette {
  name: string;
  primary: string[];    // 4 couleurs principales
  secondary: string[];  // 4 couleurs secondaires
  accent: string[];     // 2 couleurs accent
  background: string[]; // 4 couleurs fond (gradient)
  ui: string[];         // 2 couleurs UI overlay
}

// Earth biome
const earthPalette: BiomePalette = {
  name: 'earth',
  primary: ['#8B6914', '#6B4E0A', '#4A3508', '#2D1F05'],
  secondary: ['#4CAF50', '#388E3C', '#2E7D32', '#1B5E20'],
  accent: ['#FF8F00', '#F57F17'],
  background: ['#87CEEB', '#5BA3D9', '#3A7ABD', '#1E4D6B'],
  ui: ['#FFFFFF', '#333333'],
};
```

## Règles

- Toujours seed-based pour la reproductibilité (même seed = même résultat)
- Prévisualisation possible sans lancer le jeu complet
- Performance : génération offline (build time), pas en runtime
