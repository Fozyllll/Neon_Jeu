# Neon Salvage

Un roguelite de récupération cyberpunk, jouable directement dans le
navigateur. Pilote le drone **N-07**, explore une ville abandonnée générée
proceduralement, récupère des ressources, évite ou affronte des drones
ennemis, et reviens à la base avant la panne d'énergie.

![Aperçu du jeu](docs/screenshot-placeholder.txt)

## Gameplay
- Parties de 3 à 8 minutes, cartes procédurales déterministes (par seed).
- 5 secteurs de difficulté croissante, 3 types d'ennemis, 5 ressources.
- 10 améliorations permanentes, sauvegarde locale, aucun compte requis.
- Options d'accessibilité complètes (daltonisme, contraste, texte,
  réduction des effets, touches reconfigurables, jouable sans son).

## Contrôles
| Action | Touche |
| --- | --- |
| Déplacement | Z/Q/S/D ou flèches |
| Viser / tirer | Souris |
| Récupérer / Extraire | E (maintenir à la base) |
| Accélération | Maj |
| Pause | Échap |
| Rejouer après défaite | R |

Reconfigurables dans **Paramètres**.

## Technologies
TypeScript · Phaser 3 · Vite · Vitest · ESLint · Prettier · GitHub Actions

## Installation et lancement
```bash
npm install
npm run dev
```
Ouvre ensuite l'URL affichée (par défaut http://localhost:5173).

## Build de production
```bash
npm run build      # génère dist/
npm run preview     # prévisualise la build localement
```

## Tests et qualité
```bash
npm run test        # tests unitaires (Vitest)
npm run typecheck    # TypeScript strict
npm run lint         # ESLint
npm run format       # Prettier
```

## Déploiement sur GitHub Pages
Le workflow `.github/workflows/deploy.yml` construit et publie
automatiquement `dist/` sur GitHub Pages à chaque push sur `main`
(à activer une fois dans Settings → Pages → Source : GitHub Actions).
Le chemin des assets est relatif (`base: './'`), donc la build fonctionne
quel que soit le nom du dépôt.

## Structure du projet
```
src/
  main.ts              point d'entrée, configuration Phaser
  game/
    config/             constantes d'équilibrage, secteurs, touches, palette
    types/               types partagés
    utils/                RNG déterministe, fonctions mathématiques
    generation/          génération procédurale + validation de carte
    world/                 grille, collisions, champ de flux (poursuite)
    combat/                calcul des dégâts
    systems/              énergie, score, événements aléatoires
    state/                 règles d'une partie (RunModel)
    progression/         améliorations, statistiques dérivées
    save/                  sauvegarde locale (validation, migration)
    entities/             joueur, ennemis, ressources, projectiles
    effects/               textures procédurales, particules
    audio/                 audio 100 % synthétique (Web Audio API)
    ui/                     HUD, menus, mini-carte, thème
    scenes/                écrans du jeu (titre, jeu, pause, etc.)
tests/                    tests unitaires (Vitest)
```

## Sauvegarde locale
Stockée dans le `localStorage` du navigateur : améliorations, meilleurs
scores, secteurs débloqués, statistiques, paramètres. Données validées et
bornées au chargement ; une sauvegarde corrompue est mise de côté sans
casser le jeu, une nouvelle sauvegarde saine est créée automatiquement.
Aucune donnée n'est envoyée à un serveur.

## Panneau développeur (local uniquement)
Sur l'écran titre, taper `ADMIN` au clavier ouvre un panneau qui permet
d'ajouter des crédits, débloquer les secteurs ou maximiser les
améliorations — **uniquement sur la sauvegarde du navigateur local**. Il
n'y a pas de comptes utilisateurs ni de serveur dans cette version : ce
panneau n'agit jamais sur la progression d'un autre joueur.

## Limitations connues
- Pas de multijoueur ni de comptes (hors scope de cette v1, nécessiterait
  un serveur).
- Une seule taille d'écran testée en continu (le jeu est responsive mais
  vérifie ton propre matériel pour les performances).

## Feuille de route
- Illustrations et animations plus poussées.
- Nouveaux types d'ennemis et de secteurs.
- Éventuel mode multijoueur asynchrone avec backend dédié (hors scope v1).

## Licences
Code sous licence MIT (voir `LICENSE`). Tous les assets visuels et sonores
sont générés par code, aucune ressource externe protégée n'est utilisée
(voir `CREDITS.md`).

## Contribuer
Voir `CONTRIBUTING.md`. Code de conduite : `CODE_OF_CONDUCT.md`.
