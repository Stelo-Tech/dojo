---
name: security-review
description: Audit de sécurité du code. Vérifie les vulnérabilités OWASP, l'injection, le stockage sécurisé, et les bonnes pratiques de sécurité mobile.
user-invocable: true
allowed-tools: Read Grep Glob Bash
---

# Security Review — Audit de sécurité

## Checklist de sécurité pour jeu mobile

### 1. Stockage local
- [ ] Pas de données sensibles en `localStorage` non chiffré
- [ ] Pas de tokens/API keys stockés côté client
- [ ] Sauvegarde de progression : intégrité vérifiée (checksum/hash)
- [ ] Pas de manipulation facile des scores (anti-cheat basique)

### 2. Code côté client
- [ ] Pas de secrets dans le bundle JS (API keys, passwords)
- [ ] Pas d'`eval()`, `new Function()`, ou `innerHTML` avec données dynamiques
- [ ] CSP (Content Security Policy) configuré
- [ ] Source maps désactivées en production

### 3. Dépendances
- [ ] `pnpm audit` sans vulnérabilité high/critical
- [ ] Pas de dépendance non maintenue (> 2 ans sans commit)
- [ ] Lockfile versionné et vérifié en CI
- [ ] Pas de `postinstall` scripts non audités

### 4. Communication réseau
- [ ] HTTPS uniquement
- [ ] Pas de données personnelles envoyées sans consentement
- [ ] Analytics anonymisées (pas de PII)
- [ ] Validation des données reçues du serveur

### 5. Capacitor / Mobile
- [ ] Deep links validés (pas d'injection d'URL)
- [ ] Permissions minimum demandées (pas de caméra/micro pour un puzzle)
- [ ] WebView configuré en mode sécurisé
- [ ] Certificats SSL vérifiés (pas de bypass)

## Patterns sécurisés pour le projet

```typescript
// Validation de sauvegarde avec checksum
function validateSave(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false;
  const save = data as Record<string, unknown>;
  if (typeof save.version !== 'number') return false;
  if (typeof save.checksum !== 'string') return false;
  return computeChecksum(save.payload) === save.checksum;
}

// Sanitisation d'input utilisateur (noms de niveau custom)
function sanitizeInput(input: string, maxLength = 50): string {
  return input.replace(/[<>&"']/g, '').slice(0, maxLength).trim();
}
```

## Processus de review

1. Scanner le code avec la checklist ci-dessus
2. Vérifier les dépendances (`pnpm audit`)
3. Chercher les patterns dangereux (`eval`, `innerHTML`, hardcoded secrets)
4. Vérifier les permissions Capacitor dans `capacitor.config.ts`
5. Documenter les findings avec sévérité (critical/high/medium/low)
