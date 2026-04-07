---
name: capgo
description: Intégration Capacitor avancée. Builds mobile, live updates, configuration plugins natifs, et pipeline de déploiement iOS/Android.
user-invocable: true
allowed-tools: Read Grep Glob Bash Write Edit WebSearch
---

# Capgo — Capacitor avancé

## Configuration Capacitor pour le projet

### capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@anthropic-ai/capacitor-cli';

const config: CapacitorConfig = {
  appId: 'com.stelotech.lemmings',
  appName: 'Lemmings',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#1A1A2E',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1A1A2E',
    },
    Keyboard: {
      resize: 'none', // Pas de resize pour un jeu
    },
    ScreenOrientation: {
      orientation: 'landscape',
    },
  },
  android: {
    buildOptions: {
      signingType: 'apksigner',
    },
  },
  ios: {
    scheme: 'Lemmings',
  },
};

export default config;
```

## Commandes essentielles

```bash
# Sync web → natif
npx cap sync

# Ouvrir dans IDE natif
npx cap open android
npx cap open ios

# Build de production
pnpm build && npx cap sync

# Live reload pendant le dev
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

## Plugins Capacitor utilisés

| Plugin | Usage | Config |
|--------|-------|--------|
| `@capacitor/app` | Lifecycle, back button | Gérer pause/resume du jeu |
| `@capacitor/status-bar` | Masquer la status bar | Hidden en gameplay |
| `@capacitor/screen-orientation` | Forcer landscape | Lock orientation |
| `@capacitor/splash-screen` | Écran de chargement | Hide après BootScene |
| `@capacitor/haptics` | Vibration feedback | Impact léger sur actions |
| `@capacitor/preferences` | Stockage key-value natif | Fallback si localStorage KO |

## Gestion du lifecycle mobile

```typescript
import { App } from '@capacitor/app';

// Pause quand l'app passe en background
App.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) {
    game.scene.pause('GameScene');
    audioSystem.pauseAll();
  } else {
    // Ne pas auto-resume — afficher l'écran pause
    game.scene.launch('PauseScene');
  }
});

// Back button Android
App.addListener('backButton', () => {
  const activeScene = game.scene.getScenes(true)[0];
  if (activeScene.scene.key === 'GameScene') {
    game.scene.launch('PauseScene');
  } else if (activeScene.scene.key === 'MenuScene') {
    App.exitApp();
  } else {
    game.scene.stop(activeScene.scene.key);
  }
});
```

## Build pipeline

```
pnpm build → dist/
     ↓
npx cap sync → android/ + ios/
     ↓
Android: ./gradlew assembleRelease → app-release.apk
iOS: xcodebuild archive → Lemmings.ipa
     ↓
Signing (GitHub Secrets) → Store upload
```
