# Lemmings Mobile Game

Jeu mobile puzzle/action inspiré de Lemmings. Phaser 3 + TypeScript.

## Setup rapide (Mac / Linux)

### Prérequis

- **Node.js** 18+ : `brew install node` (installe aussi npm)

### Installation et lancement

```bash
# 1. Cloner le repo
git clone https://github.com/Stelo-Tech/dojo.git
cd dojo

# 2. Switcher sur la branche de dev
git checkout claude/audit-agents-workflow-kpPxQ

# 3. Installer les dépendances (au choix)
npm install          # option A : avec npm (déjà installé)
pnpm install         # option B : avec pnpm (npm install -g pnpm)

# 4. Lancer le serveur de dev
npx vite             # fonctionne avec npm ou pnpm
```

Ouvre **http://localhost:3000** dans Chrome ou Safari.

### Commandes disponibles

```bash
npx vite             # Serveur de dev (hot reload)
npx tsc --noEmit     # Vérification TypeScript
npx vitest run       # Tests unitaires
npx vite build       # Build production
npx vite preview     # Preview du build
```

### Ce que tu devrais voir

1. **BootScene** : "Loading..." pendant 0.5s
2. **MenuScene** : Titre "LEMMINGS" + "Tap to Play" clignotant
3. **GameScene** : Des petits rectangles verts (lemmings) qui spawn, tombent sur un terrain marron, marchent et meurent aux bords
4. **HUD** : 4 boutons de skills en bas (Digger, Builder, Blocker, Climber) + compteur en haut
5. **Gameplay** : Clique sur un skill puis sur un lemming pour l'assigner. Zone EXIT verte à droite.

### Troubleshooting

| Problème | Solution |
|----------|----------|
| `node: command not found` | `brew install node` |
| Port 3000 occupé | `npx vite --port 3001` |
| Écran noir | Ouvrir la console (Cmd+Option+J) et vérifier les erreurs |
| Module not found | `npm install` puis relancer |
