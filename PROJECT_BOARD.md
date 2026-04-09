# Lemmings Mobile - Project Board

> Last updated: 2026-04-09
> Status: **Pre-alpha** | 15 source files implemented | Core engine proof-of-concept working

---

## Inventory - Current State

### Implemented (v0.1 - Core Engine)

| File | Size | Status |
|------|------|--------|
| `src/main.ts` | Entry point | Done |
| `src/config.ts` | Phaser config (960x540, arcade physics, scale FIT) | Done |
| `src/scenes/BootScene.ts` | Asset preloading | Done |
| `src/scenes/MenuScene.ts` | Basic menu | Done |
| `src/scenes/GameScene.ts` | Main gameplay loop (9.3KB) | Done |
| `src/entities/Lemming.ts` | Lemming class + FSM (7.1KB) | Done |
| `src/entities/LemmingPool.ts` | Object pooling | Done |
| `src/entities/LemmingStates.ts` | Walker, Faller, Dead, Saved states | Done |
| `src/systems/PhysicsSystem.ts` | Collision + gravity | Done |
| `src/systems/SpawnSystem.ts` | Spawn management | Done |
| `src/systems/TerrainSystem.ts` | Destructible terrain (4.8KB) | Done |
| `src/ui/HUD.ts` | Toolbar (dig, stairs, wall, ramp) + counters | Done |
| `src/ui/TouchControls.ts` | Tap, drag input handling | Done |
| `src/utils/Constants.ts` | All game constants + level geometry | Done |
| `src/utils/EventBus.ts` | Typed pub/sub | Done |

### Missing (from CLAUDE.md plan)

| Category | Missing Items |
|----------|---------------|
| **Scenes** | LevelSelectScene, PauseScene, ResultScene |
| **Lemming Skills** | Digger, Basher, Miner, Builder, Blocker, Climber, Floater, Bomber |
| **Systems** | SaveSystem, AudioSystem |
| **Levels** | LevelLoader, LevelValidator, `levels/data/*.json` |
| **UI** | `ui/components/` (buttons, modals, toasts) |
| **Assets** | Sprites, tilemaps, audio, fonts |
| **Utils** | Analytics.ts (Posthog wrapper) |
| **Tests** | `tests/unit/`, `tests/e2e/` (none exist) |
| **CI/CD** | `.github/workflows/ci.yml`, `deploy.yml` |
| **Tools** | `tools/asset-pipeline.ts`, `tools/level-validator.ts` |
| **Mobile** | Capacitor setup, native plugins |
| **Config** | ESLint config, Prettier config, Playwright config |

---

## Milestones

### M0 - Foundation [DONE]

Core engine proof-of-concept with basic gameplay loop.

- [x] Phaser 3 project setup (Vite + TypeScript strict)
- [x] Main entry point and game config
- [x] BootScene, MenuScene, GameScene
- [x] Lemming entity with FSM (walker, faller, dead, saved)
- [x] LemmingPool (object pooling)
- [x] PhysicsSystem (collision + gravity)
- [x] SpawnSystem (spawn/exit logic)
- [x] TerrainSystem (destructible terrain)
- [x] HUD toolbar (dig, stairs, wall, ramp tools)
- [x] TouchControls (tap, drag)
- [x] EventBus (typed pub/sub)
- [x] Constants and level geometry

---

### M1 - Dev Environment & Quality Tooling

Set up CI, linting, testing, and formatting infrastructure.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 1.1 | Create ESLint flat config (`eslint.config.js`) with TypeScript rules | High | @devops | To Do |
| 1.2 | Create Prettier config (`.prettierrc`) | High | @devops | To Do |
| 1.3 | Set up Vitest config (`vitest.config.ts`) with path aliases | High | @qa-tester | To Do |
| 1.4 | Set up Playwright config for E2E tests | Medium | @qa-tester | To Do |
| 1.5 | Create `.github/workflows/ci.yml` (lint, typecheck, test, build) | High | @devops | To Do |
| 1.6 | Create `.github/workflows/deploy.yml` (production deploy) | Low | @devops | To Do |
| 1.7 | Add `tsconfig.json` path alias `@/` verification | High | @devops | To Do |
| 1.8 | Add `index.html` game container template | High | @devops | To Do |
| 1.9 | Verify `pnpm dev` starts correctly end-to-end | High | @qa-tester | To Do |

---

### M2 - Core Gameplay Complete

Implement all classic Lemmings skills and polish the FSM.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 2.1 | Implement DiggerState (vertical dig through terrain) | High | @engine-dev | To Do |
| 2.2 | Implement BasherState (horizontal dig) | High | @engine-dev | To Do |
| 2.3 | Implement MinerState (diagonal dig) | High | @engine-dev | To Do |
| 2.4 | Implement BuilderState (place bricks, build bridge) | High | @engine-dev | To Do |
| 2.5 | Implement BlockerState (stop other lemmings) | High | @engine-dev | To Do |
| 2.6 | Implement ClimberState (climb vertical walls) | Medium | @engine-dev | To Do |
| 2.7 | Implement FloaterState (parachute, reduce fall damage) | Medium | @engine-dev | To Do |
| 2.8 | Implement BomberState (self-destruct, destroy terrain) | Medium | @engine-dev | To Do |
| 2.9 | Add skill assignment system (tap lemming + select skill) | High | @engine-dev | To Do |
| 2.10 | Unit tests for all lemming states | High | @qa-tester | To Do |
| 2.11 | Unit tests for PhysicsSystem | High | @qa-tester | To Do |
| 2.12 | Unit tests for TerrainSystem | High | @qa-tester | To Do |
| 2.13 | Unit tests for SpawnSystem | Medium | @qa-tester | To Do |
| 2.14 | Performance benchmark: 100 lemmings at 55+ FPS | High | @qa-tester | To Do |

---

### M3 - Level System

Tiled integration, level loading, validation, and first playable levels.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 3.1 | Create LevelLoader (parse Tiled JSON format) | High | @level-architect | To Do |
| 3.2 | Create LevelValidator (check solvability) | High | @level-architect | To Do |
| 3.3 | Define level JSON schema (spawn, exit, terrain, tools, par) | High | @level-architect | To Do |
| 3.4 | Create `tools/level-validator.ts` CLI | Medium | @level-architect | To Do |
| 3.5 | Design & build Level 1 - Tutorial: Walk & Exit | High | @level-architect | To Do |
| 3.6 | Design & build Level 2 - Tutorial: Dig | High | @level-architect | To Do |
| 3.7 | Design & build Level 3 - Tutorial: Build | High | @level-architect | To Do |
| 3.8 | Design & build Level 4 - Tutorial: Block | Medium | @level-architect | To Do |
| 3.9 | Design & build Level 5 - First combo puzzle | Medium | @level-architect | To Do |
| 3.10 | Design & build Levels 6-10 (easy difficulty) | Medium | @level-architect | To Do |
| 3.11 | Design & build Levels 11-20 (medium difficulty) | Low | @level-architect | To Do |
| 3.12 | Design & build Levels 21-30 (hard difficulty) | Low | @level-architect | To Do |
| 3.13 | Refactor GameScene to load levels from LevelLoader | High | @engine-dev | To Do |
| 3.14 | Unit tests for LevelLoader | High | @qa-tester | To Do |
| 3.15 | Unit tests for LevelValidator | High | @qa-tester | To Do |

---

### M4 - Full UI/UX

All scenes, responsive design, accessibility, and mobile-first controls.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 4.1 | Create LevelSelectScene (grid, stars, lock/unlock) | High | @ui-ux | To Do |
| 4.2 | Create PauseScene (overlay with resume, restart, quit) | High | @ui-ux | To Do |
| 4.3 | Create ResultScene (score, stars, saved count, next level) | High | @ui-ux | To Do |
| 4.4 | Create `ui/components/Button.ts` (reusable, accessible) | Medium | @ui-ux | To Do |
| 4.5 | Create `ui/components/Modal.ts` (confirmation dialogs) | Medium | @ui-ux | To Do |
| 4.6 | Create `ui/components/Toast.ts` (notifications) | Low | @ui-ux | To Do |
| 4.7 | Improve HUD: skill counters, speed controls, nuke button | High | @ui-ux | To Do |
| 4.8 | Implement pinch-to-zoom on TouchControls | Medium | @ui-ux | To Do |
| 4.9 | Add camera panning (drag to scroll level) | Medium | @ui-ux | To Do |
| 4.10 | Landscape-only lock + responsive scaling validation | High | @ui-ux | To Do |
| 4.11 | Accessibility: color-blind mode, larger tap targets | Low | @ui-ux | To Do |
| 4.12 | Register all new scenes in config.ts | High | @ui-ux | To Do |
| 4.13 | E2E test: full menu → level select → play → result flow | Medium | @qa-tester | To Do |

---

### M5 - Audio & Visual Polish

Sprites, animations, sound effects, and music.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 5.1 | Create lemming sprite sheet (all states + animations) | High | @artist | To Do |
| 5.2 | Create terrain tileset (ground, platforms, hazards) | High | @artist | To Do |
| 5.3 | Create UI sprite atlas (buttons, icons, frames) | Medium | @artist | To Do |
| 5.4 | Create spawn portal + exit door animations | Medium | @artist | To Do |
| 5.5 | Create background parallax layers | Low | @artist | To Do |
| 5.6 | Create particle effects (dig, build, explode, save) | Medium | @artist | To Do |
| 5.7 | Set up `tools/asset-pipeline.ts` (Aseprite → sprite sheets) | Medium | @devops | To Do |
| 5.8 | Create AudioSystem (volume per category, mute) | High | @audio | To Do |
| 5.9 | Create SFX: assign skill, dig, build, block, save, death | High | @audio | To Do |
| 5.10 | Create SFX: UI click, level complete, level fail | Medium | @audio | To Do |
| 5.11 | Create background music (menu theme, gameplay loop) | Medium | @audio | To Do |
| 5.12 | Dual format audio (OGG + MP3) | High | @audio | To Do |
| 5.13 | Replace rectangle graphics with sprite rendering | High | @engine-dev | To Do |
| 5.14 | Integrate sprites into BootScene preloading | High | @engine-dev | To Do |

---

### M6 - Persistence & Analytics

Save system, progression tracking, and analytics.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 6.1 | Create SaveSystem (localStorage + IndexedDB fallback) | High | @engine-dev | To Do |
| 6.2 | Implement versioned JSON save format with migration | High | @engine-dev | To Do |
| 6.3 | Auto-save: end of level + every 30s | High | @engine-dev | To Do |
| 6.4 | Level progress tracking (stars, best score, unlocks) | High | @engine-dev | To Do |
| 6.5 | Crash recovery: error boundary + state restoration | Medium | @engine-dev | To Do |
| 6.6 | Create Analytics.ts (Posthog wrapper) | Low | @engine-dev | To Do |
| 6.7 | Track key events: level start, complete, fail, skill usage | Low | @engine-dev | To Do |
| 6.8 | Unit tests for SaveSystem | High | @qa-tester | To Do |
| 6.9 | Offline mode validation (100% playable offline) | Medium | @qa-tester | To Do |

---

### M7 - Mobile Deployment

Capacitor integration, native builds, and performance optimization.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 7.1 | Initialize Capacitor project (`@capacitor/core`, `@capacitor/cli`) | High | @devops | To Do |
| 7.2 | Configure Android platform | High | @devops | To Do |
| 7.3 | Configure iOS platform | High | @devops | To Do |
| 7.4 | Set up `pnpm cap:sync` workflow | High | @devops | To Do |
| 7.5 | Configure splash screen + app icon | Medium | @devops | To Do |
| 7.6 | Implement status bar hiding (landscape fullscreen) | Medium | @devops | To Do |
| 7.7 | Performance: APK/IPA size target <= 50MB | High | @devops | To Do |
| 7.8 | Performance: memory target <= 150MB runtime | High | @qa-tester | To Do |
| 7.9 | Performance: battery target <= 5%/hour | Medium | @qa-tester | To Do |
| 7.10 | Performance: first screen load <= 2s | High | @qa-tester | To Do |
| 7.11 | WebGL → Canvas graceful degradation | Medium | @engine-dev | To Do |
| 7.12 | Test on physical Android device | High | @qa-tester | To Do |
| 7.13 | Test on physical iOS device | High | @qa-tester | To Do |

---

### M8 - Quality Assurance & Launch

Full test coverage, final polish, and release preparation.

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 8.1 | Unit test coverage >= 80% for `src/entities/` | High | @qa-tester | To Do |
| 8.2 | Unit test coverage >= 80% for `src/systems/` | High | @qa-tester | To Do |
| 8.3 | E2E: complete playthrough levels 1-5 | High | @qa-tester | To Do |
| 8.4 | E2E: save/load persistence validation | High | @qa-tester | To Do |
| 8.5 | Performance regression test suite | Medium | @qa-tester | To Do |
| 8.6 | Security review (OWASP, data storage, analytics consent) | Medium | @qa-tester | To Do |
| 8.7 | Scoring system: time, saves, skill efficiency | High | @game-designer | To Do |
| 8.8 | Difficulty curve balancing across 30 levels | High | @game-designer | To Do |
| 8.9 | Tutorial flow: progressive skill introduction | High | @game-designer | To Do |
| 8.10 | Final GDD review and sign-off | Medium | @game-designer | To Do |
| 8.11 | App store metadata (description, screenshots, keywords) | Low | @devops | To Do |
| 8.12 | Production deploy pipeline verification | Medium | @devops | To Do |

---

## Summary

| Milestone | Tasks | Priority | Dependencies |
|-----------|-------|----------|--------------|
| **M0 - Foundation** | 12 | - | None | **DONE** |
| **M1 - Dev Environment** | 9 | High | None |
| **M2 - Core Gameplay** | 14 | High | M0 |
| **M3 - Level System** | 15 | High | M2 |
| **M4 - Full UI/UX** | 13 | High | M2 |
| **M5 - Audio & Visual** | 14 | Medium | M2 |
| **M6 - Persistence** | 9 | Medium | M2, M3 |
| **M7 - Mobile Deploy** | 13 | Medium | M1, M5, M6 |
| **M8 - QA & Launch** | 12 | High | All |

**Total: 111 tasks** | M1-M4 can be parallelized | M5-M6 can be parallelized

```
M0 [DONE] ─┬─ M1 (tooling) ────────────────────────────┐
            ├─ M2 (gameplay) ─┬─ M3 (levels) ──────┐    │
            │                 ├─ M4 (UI/UX) ────────┤    │
            │                 ├─ M5 (audio/visual) ─┤    │
            │                 └─ M6 (persistence) ──┤    │
            │                                       ▼    ▼
            └───────────────────────────────── M7 (mobile)
                                                    │
                                                    ▼
                                              M8 (launch)
```
