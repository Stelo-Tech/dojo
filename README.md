# Lemmings Mobile Game

Jeu mobile puzzle/action inspiré de Lemmings. Phaser 3 + TypeScript.

## Setup rapide (Mac / Linux)

### Prérequis

- **Node.js** 18+ : `brew install node`
- **pnpm** 9+ : `npm install -g pnpm`

### Installation et lancement

```bash
# 1. Cloner le repo
git clone https://github.com/Stelo-Tech/dojo.git
cd dojo

# 2. Switcher sur la branche de dev
git checkout claude/audit-agents-workflow-kpPxQ

# 3. Installer les dépendances
pnpm install

# 4. Lancer le serveur de dev
pnpm dev
```

Ouvre **http://localhost:3000** dans Chrome ou Safari.

### Commandes disponibles

```bash
pnpm dev            # Serveur de dev (hot reload)
pnpm build          # Build production
pnpm preview        # Preview du build
pnpm typecheck      # Vérification TypeScript
pnpm test           # Tests unitaires (Vitest)
pnpm lint           # Linter ESLint
pnpm format         # Formatter Prettier
```

### Ce que tu devrais voir

1. **BootScene** : "Loading..." pendant 0.5s
2. **MenuScene** : Titre "LEMMINGS" + "Tap to Play" clignotant
3. **GameScene** : Des petits rectangles verts (lemmings) qui spawn, tombent, marchent sur le sol et meurent aux bords

### Troubleshooting

| Problème | Solution |
|----------|----------|
| `pnpm: command not found` | `npm install -g pnpm` |
| Port 3000 occupé | `pnpm dev -- --port 3001` |
| Écran noir | Ouvrir la console (F12) et vérifier les erreurs |
