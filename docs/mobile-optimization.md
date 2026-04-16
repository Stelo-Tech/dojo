# Mobile Optimization — Lemmings

## Performance Targets

| Metric | Target |
|--------|--------|
| APK / IPA size | <= 50 MB |
| Memory (runtime) | <= 150 MB |
| Battery drain | <= 5% / hour |
| First screen load | <= 2 seconds |
| Frame rate | >= 55 FPS stable |

## Asset Pipeline

- **Texture atlases**: 1 sprite sheet per category (lemmings, terrain, UI).
  Never load individual textures at runtime — only atlas PNG + JSON.
- **Audio**: ship both OGG and MP3 per file; Phaser picks the format the
  device supports. Lazy-load non-critical audio after BootScene.
- **Sprites**: use WebP where the target WebView supports it
  (`Capacitor.getPlatform()` + feature detection). Fall back to PNG.
- **Tilemaps**: export from Tiled as JSON; keep tile size <= 32x32 px to
  maximize atlas packing efficiency.

## Build Compression (Vite)

Enable gzip and brotli via `vite-plugin-compression` or the Vite built-in
`build.rollupOptions` if serving from a local HTTP server inside Capacitor's
WebView. The WebView on Android 5+ and iOS 9+ supports gzip natively.

```typescript
// vite.config.ts additions (to be done by @engine-dev)
build: {
  target: 'es2020',
  minify: 'terser',
  terserOptions: {
    compress: { drop_console: true, drop_debugger: true },
  },
},
```

## Phaser Module Tree-Shaking

Phaser ships a custom build system. Import only the modules you use instead
of the full Phaser bundle:

```typescript
// Instead of: import Phaser from 'phaser';
import { Game, AUTO } from 'phaser';
import { Scene } from 'phaser';
```

Full tree-shaking requires using the Phaser `phaser/src` entry point with
a custom Webpack/Vite config — measure the size gain before investing effort.

## Capacitor-Specific

- `StatusBar.hide()` is called during `MobileHelper.init()` before Phaser
  starts, so no layout shift occurs.
- `SplashScreen.autoHideDuration: 1000 ms` — the splash is hidden 1 second
  after the native shell launches, by which time Phaser's BootScene should
  have started asset preloading.
- `App.addListener('appStateChange')` should be wired in `GameScene.create()`
  to pause audio and the game loop when the app goes to background.

## Object Pooling

See `LemmingPool.ts`. Every entity that is created and destroyed frequently
must go through the pool. Allocating inside `update()` or render loops will
cause GC pauses that spike frame time above the 16 ms budget.

## Memory Checklist

- [ ] All textures destroyed in `Scene.shutdown()`
- [ ] All event listeners removed in `Scene.shutdown()`
- [ ] No circular references between Scene and systems
- [ ] `Phaser.Cache` cleared between levels if textures are level-specific
- [ ] Audio buffers released when not in use

## Battery

- Run at 60 fps cap (Phaser default) — do not uncap.
- Pause `game.loop` on `appStateChange.isActive === false`.
- Avoid continuous canvas redraws when the game is paused (use
  `game.loop.sleep()` if available, otherwise throttle via `scene.time`).
