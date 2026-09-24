# Recherches effectuées

## Sources consultées
- Registre npm (`npm view`) pour les versions actuelles et licences de
  Phaser, Vite, TypeScript, Vitest, ESLint, typescript-eslint, Prettier.
  Date de consultation : 24 septembre 2026.

## Informations utiles
- Phaser 3 (branche stable 3.x, licence MIT) reste la bibliothèque 2D la
  plus documentée pour ce type de jeu ; dernière version stable installée :
  3.90.0.
- Vite propose `base: './'` pour des chemins relatifs, condition nécessaire
  pour que la build fonctionne sur GitHub Pages quel que soit le nom du
  dépôt, sans configuration supplémentaire côté Pages.
- `npm ci` + `actions/setup-node` avec cache npm est le schéma standard et
  stable pour l'intégration continue GitHub Actions sur un projet Node.

## Décisions prises
- Conserver la stack proposée initialement (TypeScript, Vite, Phaser 3,
  Vitest, ESLint, Prettier, GitHub Actions) : stable, documentée, adaptée
  à un jeu 2D solo.
- Déploiement via `actions/deploy-pages` (méthode officielle GitHub,
  remplace l'ancien déploiement par branche `gh-pages`).
- Rendu de la carte via une vraie Tilemap Phaser (et non un objet par
  tuile) pour la performance sur du matériel modeste.

## Éléments écartés
- Pas de framework CSS ni de bibliothèque UI externe : inutile pour une
  interface générée par Phaser, et cela alourdirait le bundle.
- Pas de fichiers audio/image externes : tout est généré par code pour
  éviter toute question de licence d'assets.
