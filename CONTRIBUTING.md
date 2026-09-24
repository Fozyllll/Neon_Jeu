# Contribuer à Neon Salvage

Merci de l'intérêt porté à ce projet ! Ce guide résume comment proposer
un changement.

## Mise en route
```bash
npm install
npm run dev        # serveur de développement (http://localhost:5173)
npm run test        # tests unitaires (Vitest)
npm run lint         # ESLint
npm run typecheck    # vérification TypeScript stricte
npm run build         # build de production dans dist/
```

## Style de code
- TypeScript strict, pas de `any` implicite.
- Fonctions courtes, noms explicites, pas de code mort.
- Les constantes d'équilibrage vivent dans `src/game/config/`, jamais en dur
  ailleurs dans le code.
- Formatage automatique via Prettier (`npm run format`).

## Avant une pull request
1. `npm run lint && npm run typecheck && npm run test && npm run build`
   doivent tous passer sans erreur.
2. Décrivez clairement : fichiers modifiés, objectif du changement, comment
   le tester, limites connues.
3. Pas de secrets, clés API, ni assets sans licence claire dans un commit.
4. Les changements d'architecture importants ou de licence doivent être
   discutés dans une *issue* avant la pull request.

## Rapporter un bug
Ouvrez une *issue* avec : étapes de reproduction, comportement attendu vs
observé, navigateur/OS, et si possible la seed de génération concernée.
