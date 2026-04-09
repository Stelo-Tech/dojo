# WORKLOG - Lemmings Mobile Game

> Fichier de documentation de travail. Mis a jour a chaque modification pour eviter de relire le projet en entier.
> Derniere mise a jour : 2026-04-09

---

## Architecture des fichiers source

### Entites (`src/entities/`)
| Fichier | Role | Classes/Exports principaux |
|---------|------|--------------------------|
| `Lemming.ts` | Entite Lemming + FSM | `Lemming` (extends Phaser.GameObjects.Sprite) |
| `LemmingPool.ts` | Object pooling | `LemmingPool` |
| `LemmingStates.ts` | Definitions des etats | `LemmingState` (enum), `StateConfig`, `VALID_TRANSITIONS` |

### Systemes (`src/systems/`)
| Fichier | Role | Classes/Exports principaux |
|---------|------|--------------------------|
| `SpawnSystem.ts` | Gestion spawn + detection sortie | `SpawnSystem` |
| `PhysicsSystem.ts` | Collisions + gravite | `PhysicsSystem` |
| `TerrainSystem.ts` | Terrain destructible | `TerrainSystem` |

### Scenes (`src/scenes/`)
| Fichier | Role |
|---------|------|
| `BootScene.ts` | Prechargement assets |
| `MenuScene.ts` | Menu principal |
| `GameScene.ts` | Gameplay principal (orchestre les systemes) |
| `LevelSelectScene.ts` | Selection de niveau |
| `PauseScene.ts` | Overlay pause |

### UI (`src/ui/`)
| Fichier | Role |
|---------|------|
| `HUD.ts` | Toolbar competences + compteurs |
| `TouchControls.ts` | Input tactile |

### Utilitaires (`src/utils/`)
| Fichier | Role |
|---------|------|
| `EventBus.ts` | Pub/sub type entre systemes |
| `Constants.ts` | Constantes globales du jeu |

### Config
| Fichier | Role |
|---------|------|
| `src/config.ts` | Configuration Phaser.Game |
| `src/main.ts` | Point d'entree |

---

## Flux de sortie (Exit Flow) - CRITIQUE

> Ce flux est au coeur du bug #1 (lemmings ne sortent pas).

### Flux attendu :
1. `SpawnSystem` cree une zone de sortie (exit) au chargement du niveau
2. A chaque update, `SpawnSystem` verifie si un lemming chevauche la zone exit
3. Si oui, le lemming passe en etat `EXITING`
4. L'etat `EXITING` joue une animation puis transitionne vers `SAVED`
5. Le compteur de sauves augmente, event `LEMMING_SAVED` emis

### Bugs trouves :
<!-- A remplir apres investigation -->

---

## Modifications effectuees

### 2026-04-09 - Fix exit bug
- **Branche** : `claude/fix-lemming-exit-bug-4gO97`
- **Probleme** : Les lemmings n'arrivent plus a sortir par la porte exit
- **Cause racine** : (a determiner)
- **Fichiers modifies** : (a remplir)
- **Fix applique** : (a remplir)

---

## Notes techniques

### FSM Lemming (etats)
- WALKER, FALLER, DIGGER, BUILDER, BASHER, CLIMBER, FLOATER, BLOCKER, BOMBER, EXITING, DEAD, SAVED
- Transitions valides definies dans `VALID_TRANSITIONS` (LemmingStates.ts)

### EventBus (evenements cles)
- `LEMMING_SAVED`, `LEMMING_DIED`, `LEMMING_SPAWNED`, `LEVEL_COMPLETE`
- `SKILL_ASSIGNED`, `EXIT_REACHED`

### Constantes importantes
- `EXIT_ZONE_WIDTH`, `EXIT_ZONE_HEIGHT` : taille zone de detection sortie
- `WALK_SPEED = 30`, `FATAL_FALL_DISTANCE = 80`
- `SPAWN_INTERVAL = 1000ms`
