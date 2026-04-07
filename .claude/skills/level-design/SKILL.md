---
name: level-design
description: Patterns de level design pour puzzle/action type Lemmings. Couvre la courbe de difficulté, le format Tiled, la validation de solvabilité et les principes de design de niveaux.
user-invocable: true
allowed-tools: Read Grep Glob Write Edit
---

# Level Design — Design de niveaux Lemmings

## Principes fondamentaux

### 1. Enseignement par le jeu
- **Niveau 1** : marcher tout droit vers la sortie (comprendre le concept)
- **Niveau 2** : creuser un obstacle simple (1ère compétence)
- **Niveau 3** : construire un pont simple (2ème compétence)
- Chaque mécanique a son "niveau tutoriel" dédié

### 2. Difficulté progressive

```
Difficulté
  ▲
5 │                              ┌──────
  │                         ┌────┘
4 │                    ┌────┘
  │               ┌────┘
3 │          ┌────┘
  │     ┌────┘
2 │┌────┘
  ││
1 ││
  └┴──────────────────────────────────── Niveaux
   1    5    10   15   20   25   30   40
   └tutoriel┘└──normal──┘└─avancé─┘└expert┘
```

### 3. Économie de compétences
- Max 5 types de compétences par niveau
- Le nombre d'utilisations est calibré pour :
  - Solution minimum : juste assez
  - Solution optimale (3 étoiles) : nécessite de la créativité

### 4. Multiple solutions
- Au moins 1 solution "évidente" pour chaque niveau
- Les meilleurs scores récompensent les solutions créatives
- Pas de solution unique pixel-perfect

## Format de niveau Tiled

### Layers obligatoires

| Layer | Type | Contenu |
|-------|------|---------|
| `terrain` | Tile Layer | Sol destructible/indestructible |
| `hazards` | Tile Layer | Eau, lave, pièges |
| `background` | Tile Layer | Décor (non-collision) |
| `objects` | Object Layer | Spawn, exit, triggers |

### Propriétés custom (Object Layer)

```json
{
  "objects": [
    {
      "name": "spawn",
      "type": "spawn_point",
      "x": 100, "y": 50,
      "properties": {
        "direction": "right",
        "delay": 0
      }
    },
    {
      "name": "exit",
      "type": "exit_point",
      "x": 700, "y": 400,
      "properties": {
        "capacity": -1
      }
    }
  ]
}
```

### Tile properties

| Property | Type | Usage |
|----------|------|-------|
| `destructible` | bool | Le lemming peut creuser/basher |
| `climbable` | bool | Le lemming peut grimper |
| `deadly` | bool | Tue au contact |
| `bouncy` | bool | Rebondit le lemming |

## Système de scoring

```
Score = (lemmings_saved / total) * 1000
      + time_bonus (si < par_time)
      + skill_bonus (compétences non utilisées * 50)

Étoiles :
  ★     : min_saved atteint
  ★★    : 80% saved + sous le par_time
  ★★★   : 100% saved + sous le par_time + skill_bonus > 0
```

## Checklist de validation (LevelValidator)

- [ ] Spawn point existe et a du sol en dessous
- [ ] Exit point existe et est atteignable
- [ ] `min_saved ≤ total_lemmings`
- [ ] Au moins 1 solution existe avec les compétences données
- [ ] Max 5 types de compétences
- [ ] Toutes les tiles référencent un tileset existant
- [ ] Metadata complète (name, difficulty, par_time, par_score)
- [ ] Pas de zone de piège invisible (deadly tile sans indication visuelle)
