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

### Flux reel (tel qu'implemente) :
1. `GameScene.createExitZone()` dessine un rectangle visuel a (865, 435) 30x30
2. A chaque `GameScene.update()`, boucle sur les lemmings actifs et appelle `isAtExit(x, y)`
3. `isAtExit` fait un AABB check : `x in [850, 880] && y in [420, 450]`
4. Si vrai, `lemming.changeState('saved')` → `SavedState.enter()` met `alive=false`
5. Frame suivante : `lemmingPool.updateAll()` auto-release le lemming (alive=false)

### Bug trouve (2026-04-09) :
**Floating-point boundary mismatch dans `snapToSurface`**
- La gravite donne au lemming un y flottant (ex: 450.7)
- `snapToSurface(x, 450.7)` teste `checkGround(x, 449.7)` → `Math.floor(449.7-300)=149` → pas solide (terrain commence a localY=150)
- Le snap echoue : le lemming reste a y=450.7
- `isAtExit(x, 450.7)` : `450.7 <= 450` → **FALSE** → le lemming traverse la zone sans etre detecte

---

## Modifications effectuees

### 2026-04-09 - Fix exit bug
- **Branche** : `claude/fix-lemming-exit-bug-4gO97`
- **Probleme** : Les lemmings n'arrivent plus a sortir par la porte exit
- **Cause racine** : `snapToSurface()` ne floor pas la position Y float du lemming. Resultat : lemming a y=450.7 au lieu de y=450, et le check `y <= 450` de `isAtExit` echoue.
- **Fichiers modifies** :
  - `src/systems/PhysicsSystem.ts:105` — `Math.floor(startY)` dans `snapToSurface`
  - `src/scenes/GameScene.ts:211-213` — tolerance de 2px dans `isAtExit`
- **Fix applique** :
  1. **Fix principal** : `snapToSurface` floor `startY` pour snapper les lemmings aux pixels entiers
  2. **Defense en profondeur** : `isAtExit` ajoute une tolerance de 2px sur l'axe Y

### 2026-04-09 - Fix click-on-exit instant loss
- **Probleme** : Cliquer pres de la sortie avec un outil (dig) detruit la plateforme exit, les lemmings tombent et meurent
- **Cause racine** : `TouchControls.onPointerDown()` n'avait aucune exclusion pour la zone exit
- **Fix** : Ajout `isInExitZone()` avec marge de 20px dans `src/ui/TouchControls.ts`

### 2026-04-09 - Fix dead lemmings not counted
- **Probleme** : Les lemmings morts par chute fatale ne sont pas comptabilises dans deadCount
- **Cause racine** : `DeadState.enter()` ne emit pas `lemming:died`. L'event n'etait emit que pour les morts hors-limites dans PhysicsSystem
- **Fix** :
  - `src/entities/LemmingStates.ts` : `DeadState.enter()` emet `lemming:died` (centralise toutes les morts)
  - `src/systems/PhysicsSystem.ts` : suppression emission doublon pour out-of-bounds

### 2026-04-09 - Visual upgrade (less pixelated)
- **Probleme** : Textures trop pixelisees, visuels basiques
- **Fichiers modifies** :
  - `src/config.ts` : `pixelArt: false`, `antialias: true`
  - `src/utils/Constants.ts` : nouvelles couleurs (terrain biome, palette amelioree, 60 etoiles)
  - `src/systems/TerrainSystem.ts` : terrain multi-couche (herbe, highlight, terre, ombre profonde) + dithering Bayer 4x4
  - `src/entities/Lemming.ts` : sprite multi-parties (torse, tete, cheveux, yeux, jambes animees)
  - `src/scenes/GameScene.ts` : background gradient, etoiles scintillantes, portail spawn, exit zone amelioree

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
