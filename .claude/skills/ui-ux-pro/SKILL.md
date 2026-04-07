---
name: ui-ux-pro
description: Design system mobile avancé. Composants réutilisables, tokens, responsive landscape, animations, et patterns d'interaction tactile pour jeu mobile.
user-invocable: true
allowed-tools: Read Grep Glob Write Edit WebSearch
---

# UI/UX Pro — Design system mobile pour jeu

## Design System du projet

### Tokens de design

```typescript
export const DesignTokens = {
  // Couleurs
  colors: {
    primary: '#4A90D9',
    primaryDark: '#2A5A8A',
    success: '#4CAF50',
    danger: '#F44336',
    warning: '#FF9800',
    text: '#FFFFFF',
    textDim: '#AAAAAA',
    background: '#1A1A2E',
    surface: '#16213E',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Espacement (multiples de 4)
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },

  // Typographie
  font: {
    family: 'PressStart2P', // Pixel font
    sizes: { xs: 10, sm: 12, md: 14, lg: 18, xl: 24, xxl: 32 },
  },

  // Animation
  animation: {
    instant: 0,
    fast: 100,
    normal: 200,
    slow: 400,
    easeOut: 'Power2',
    easeIn: 'Power1',
    bounce: 'Bounce',
  },

  // Touch
  touch: {
    minTarget: 44,    // px minimum
    hitSlop: 8,       // px extension invisible
    feedbackDelay: 0, // ms avant feedback visuel
  },
} as const;
```

### Composants UI réutilisables

```
ui/components/
├── Button.ts          # Bouton tactile avec états (normal, pressed, disabled)
├── IconButton.ts      # Bouton avec icône (toolbar compétences)
├── Panel.ts           # Container avec fond semi-transparent
├── Modal.ts           # Popup centré avec overlay
├── Toast.ts           # Notification temporaire (haut de l'écran)
├── ProgressBar.ts     # Barre de progression (lemmings sauvés)
├── StarRating.ts      # Affichage 1-3 étoiles (résultat)
├── Counter.ts         # Compteur animé (score, timer)
└── ScrollView.ts      # Liste scrollable (sélection niveaux)
```

### Patterns d'interaction

| Action | Geste | Feedback |
|--------|-------|----------|
| Sélectionner compétence | Tap bouton toolbar | Highlight + son |
| Assigner compétence | Tap sur lemming | Flash + animation skill |
| Scroll carte | Drag horizontal | Inertie naturelle |
| Zoom | Pinch | Zoom fluide 0.5x-2x |
| Pause | Tap bouton pause | Overlay + blur |
| Accélérer | Double-tap zone vide | Indicateur vitesse x2 |

### Layout landscape

```
┌─────────────────────────────────────────────────────┐
│ [⏸] [⏩]                              Sauvés: 12/20 │  ← Top bar (5%)
│                                                      │
│                                                      │
│                   ZONE DE JEU                        │  ← Game area (75%)
│                                                      │
│                                                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│ [⛏5] [🧱3] [🚫2] [💣1] [⛰3] [🧗2] [☂4]  ⏱ 2:30  │  ← Toolbar (20%)
└─────────────────────────────────────────────────────┘
```

## Règles de responsive

- **Phone landscape** (640-812px) : toolbar compacte, icônes 44px
- **Tablet landscape** (1024-1366px) : toolbar spacieuse, icônes 56px
- **Safe area** : `env(safe-area-inset-left/right)` pour le notch en landscape
