# CLAUDE.md — Lemmings Mobile Game Project

## Vision du projet

Jeu mobile puzzle/action inspiré de Lemmings. Le joueur guide des créatures à travers des niveaux 2D en leur assignant des compétences (creuser, construire, bloquer, etc.) pour les mener à la sortie. Orientation **landscape uniquement**.

## Stack technique

| Couche | Technologie | Version min |
|--------|------------|-------------|
| Moteur de jeu | **Phaser 3** | 3.80+ |
| Langage | **TypeScript strict** (`strict: true`) | 5.4+ |
| Bundler | **Vite** | 6+ |
| Mobile wrapper | **Capacitor** | 6+ |
| Package manager | **pnpm** | 9+ |
| Tests unitaires | **Vitest** | 2+ |
| Tests E2E | **Playwright** | 1.40+ |
| Linter/Format | **ESLint** + **Prettier** | 9+ / 3+ |
| Level editor | **Tiled** (export JSON) | 1.10+ |
| Sprites | **Aseprite** → sprite sheets PNG | — |
| CI/CD | **GitHub Actions** | — |
| Analytics | **Posthog** (self-hosted ou cloud) | — |

## Structure du projet

```
dojo/
├── CLAUDE.md                    # Ce fichier — vue d'ensemble
├── .claude/
│   ├── settings.json            # Permissions et configuration Claude Code
│   ├── agents/                  # 8 agents spécialisés
│   │   ├── game-designer/       # Directeur créatif, GDD, balancing
│   │   ├── engine-dev/          # Core gameplay, FSM, physique, systèmes
│   │   ├── level-architect/     # Création/validation niveaux Tiled
│   │   ├── ui-ux/               # Menus, HUD, contrôles tactiles
│   │   ├── artist/              # Pixel art, sprites, tilesets
│   │   ├── audio/               # SFX, musique, ambiance
│   │   ├── qa-tester/           # Tests, coverage, performance
│   │   └── devops/              # CI/CD, builds mobile, pipeline
│   ├── skills/                  # 14 compétences installées
│   │   ├── context7/            # Documentation live (Phaser, Capacitor, Vite...)
│   │   ├── webapp-testing/      # Stratégies de test web
│   │   ├── frontend-design/     # Principes UI/UX mobile
│   │   ├── algorithmic-art/     # Art procédural, palettes, particules
│   │   ├── tdd/                 # Test-Driven Development
│   │   ├── refactoring/         # Refactoring guidé et sécurisé
│   │   ├── ts-types/            # Types TypeScript solides
│   │   ├── security-review/     # Audit sécurité code
│   │   ├── code-review/         # Review structuré avec checklist
│   │   ├── supply-chain-security/ # Audit dépendances
│   │   ├── ui-ux-pro/           # Design system mobile
│   │   ├── capgo/               # Capacitor avancé, builds mobile
│   │   ├── game-development/    # Patterns Phaser 3 (FSM, pools, EventBus)
│   │   └── level-design/        # Level design Lemmings-like
│   └── rules/                   # Règles transversales
│       ├── typescript.md        # Conventions TS strict
│       ├── phaser.md            # Architecture Phaser 3
│       ├── honesty.md           # 5 règles d'honnêteté
│       └── git.md               # Conventional commits, branches, PRs
├── src/
│   ├── main.ts                  # Point d'entrée Phaser
│   ├── config.ts                # Configuration Phaser.Game
│   ├── scenes/
│   │   ├── BootScene.ts         # Préchargement assets
│   │   ├── MenuScene.ts         # Menu principal
│   │   ├── GameScene.ts         # Gameplay principal
│   │   ├── LevelSelectScene.ts  # Sélection de niveau
│   │   ├── PauseScene.ts        # Pause overlay
│   │   └── ResultScene.ts       # Résultats fin de niveau
│   ├── entities/
│   │   ├── Lemming.ts           # Classe Lemming + FSM
│   │   ├── LemmingPool.ts       # Object pooling
│   │   └── LemmingStates.ts     # États : walker, digger, builder, etc.
│   ├── systems/
│   │   ├── PhysicsSystem.ts     # Collision + gravité
│   │   ├── TerrainSystem.ts     # Terrain destructible (pixel-perfect)
│   │   ├── SpawnSystem.ts       # Gestion spawn/exit
│   │   ├── SaveSystem.ts        # Sauvegarde progression
│   │   └── AudioSystem.ts       # Gestion audio centralisée
│   ├── ui/
│   │   ├── HUD.ts               # Toolbar compétences + compteurs
│   │   ├── TouchControls.ts     # Input tactile (tap, drag, pinch)
│   │   └── components/          # Boutons, modals, toasts
│   ├── levels/
│   │   ├── LevelLoader.ts       # Parser Tiled JSON
│   │   ├── LevelValidator.ts    # Validation jouabilité
│   │   └── data/                # Fichiers .json Tiled
│   ├── utils/
│   │   ├── Constants.ts         # Constantes globales
│   │   ├── EventBus.ts          # Pub/sub typé entre systèmes
│   │   └── Analytics.ts         # Wrapper Posthog
│   └── assets/
│       ├── sprites/
│       ├── tilemaps/
│       ├── audio/
│       └── fonts/
├── tests/
│   ├── unit/
│   └── e2e/
├── tools/
│   ├── asset-pipeline.ts        # Export Aseprite → sprite sheets
│   └── level-validator.ts       # CLI validation niveaux
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

## Agents — Matrice des compétences

| Agent | Modèle | Skills | Arbitrage |
|-------|--------|--------|-----------|
| `@game-designer` | opus | context7, level-design, ts-types | **Design** (décision finale) |
| `@engine-dev` | opus | context7, webapp-testing, tdd, refactoring, ts-types, security-review, game-development | **Technique** (décision finale) |
| `@level-architect` | sonnet | context7, tdd, level-design | Niveaux |
| `@ui-ux` | sonnet | context7, frontend-design, ui-ux-pro, ts-types | Interface |
| `@artist` | sonnet | context7, algorithmic-art, game-development | Visuel |
| `@audio` | sonnet | context7 | Son |
| `@qa-tester` | sonnet | context7, webapp-testing, tdd, code-review, security-review | Qualité |
| `@devops` | sonnet | context7, capgo, supply-chain-security, security-review | Infrastructure |

### Orchestration

```
@engine-dev (core) → @level-architect (niveaux) → @game-designer (balancing)
     ↓                        ↓
@ui-ux (interface)      @artist + @audio (assets)
     ↓                        ↓
           @qa-tester (validation)
                    ↓
              @devops (deploy)
```

- Conflits de **design** → `@game-designer` tranche
- Conflits **techniques** → `@engine-dev` tranche
- Aucun agent ne merge seul — review par 1+ agent compétent

## Contraintes de performance

| Métrique | Target |
|----------|--------|
| FPS | ≥ 55 stable |
| Frame budget | ≤ 16ms |
| Par lemming | ≤ 0.1ms update |
| Lemmings simultanés | ≥ 100 |
| Chargement | ≤ 2s premier écran |
| APK/IPA | ≤ 50 MB |
| Mémoire | ≤ 150 MB runtime |
| Batterie | ≤ 5%/heure |

## Systèmes transversaux

### Sauvegarde et progression
- `localStorage` + fallback `IndexedDB`
- Format JSON versionné avec migration auto
- Auto-save : fin de niveau + toutes les 30s
- 100% jouable offline

### Crash recovery
- Error boundary global → écran de recovery
- État du niveau sauvé toutes les 30s → restauration auto
- Graceful degradation : WebGL → Canvas, audio fail → mode silencieux

### Sécurité skills
- Sources autorisées uniquement (voir `.claude/skills/`)
- Protocole d'audit avant toute nouvelle skill
- Voir `.claude/rules/honesty.md` pour les règles d'honnêteté

## Commandes

```bash
# Dev
pnpm install && pnpm dev

# Tests
pnpm test              # Vitest
pnpm test:e2e          # Playwright
pnpm test:coverage     # Coverage

# Build
pnpm build             # Production
pnpm cap:sync          # Sync Capacitor

# Qualité
pnpm lint && pnpm typecheck && pnpm audit
```
