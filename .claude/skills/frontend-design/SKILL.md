---
name: frontend-design
description: Principes de design UI/UX pour interfaces mobiles. Couvre l'accessibilité, le responsive, les patterns tactiles et les design systems.
user-invocable: true
allowed-tools: Read WebSearch WebFetch
---

# Frontend Design — Principes UI/UX mobile

## Principes fondamentaux

### Touch-first design
- Zone tactile minimum : **44x44px** (Apple HIG) / **48x48dp** (Material)
- Espacement entre éléments interactifs : ≥ 8px
- Les actions principales sont accessibles au pouce (zone du bas de l'écran)
- Pas de hover states — tout doit fonctionner au tap

### Feedback
- Chaque interaction a une réponse visuelle < 100ms
- États : default → pressed → active → disabled
- Animations : 200-300ms, ease-out pour les entrées, ease-in pour les sorties
- Haptic feedback via Capacitor pour les actions importantes

### Accessibilité (WCAG AA minimum)
- Contraste texte : ratio ≥ 4.5:1 (texte normal), ≥ 3:1 (grand texte)
- Taille texte minimum : 14px (mobile)
- Ne pas transmettre d'information uniquement par la couleur
- Support des préférences système (dark mode, reduce motion, font size)

### Responsive mobile
- Orientation : landscape uniquement pour ce projet
- Breakpoints : phone landscape (640-812px), tablet landscape (1024-1366px)
- Safe areas : gérer notch, dynamic island, barre de navigation Android
- DPI : supporter 1x, 2x, 3x (via assets haute résolution)

## Patterns de navigation mobile

### Pour un jeu puzzle
```
Écran titre → Menu principal → Sélection monde → Sélection niveau → Gameplay
                    ↓                                        ↓
              Paramètres                                  Pause → Résultat
```

- Navigation simple, peu de profondeur (max 3 niveaux)
- Bouton retour toujours visible
- Pas de hamburger menu dans un jeu

## Design tokens

```typescript
const tokens = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  fontSize: { sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
  animation: { fast: 150, normal: 300, slow: 500 },
  touchTarget: { min: 44 },
};
```
