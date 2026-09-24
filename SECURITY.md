# Politique de sécurité

Neon Salvage est un jeu 100 % côté navigateur, sans compte utilisateur ni
serveur en ligne pour cette version. Il n'y a pas de données personnelles
collectées : la seule donnée stockée est la sauvegarde de progression, dans
le `localStorage` du navigateur de chaque joueur, et n'est jamais transmise
à un serveur.

## Signaler un problème
Si vous découvrez une faille (par exemple dans le code source, une dépendance,
ou un comportement du build GitHub Pages), ouvrez une *issue* sur le dépôt en
décrivant le problème et les étapes pour le reproduire. Évitez de publier
publiquement un problème qui permettrait un usage abusif avant qu'un correctif
soit disponible ; dans ce cas, contactez le mainteneur directement via GitHub.

## Bonnes pratiques suivies dans ce dépôt
- Aucun secret ni clé API dans le dépôt.
- Aucune dépendance réseau obligatoire au runtime (le jeu tourne hors-ligne
  une fois chargé).
- Les données de sauvegarde sont validées et bornées avant utilisation
  (voir `src/game/save/saveData.ts`) pour résister à des données corrompues.
- `eval` et les scripts distants non nécessaires sont proscrits (voir
  `eslint.config.js`).
