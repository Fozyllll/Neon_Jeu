# Neon Salvage — Document de conception

## Concept
Un drone de récupération (N-07) explore une ville cyberpunk abandonnée,
générée proceduralement par secteur et par seed. Chaque sortie dure 3 à 8
minutes : explorer, récupérer des ressources, éviter ou combattre des
drones ennemis, puis revenir à la base avant la panne d'énergie.

## Public cible
Joueurs occasionnels et amateurs de roguelites simples, jouables directement
dans un navigateur, sans compte ni installation.

## Boucle de jeu
Base → exploration → collecte → risque croissant → retour → extraction →
achat d'améliorations → secteur suivant, plus difficile.

## Contrôles
ZQSD/flèches : déplacement · souris : viser/tirer · E : récupérer/extraire ·
Maj : accélération · Échap : pause · R : rejouer après une défaite.
(Reconfigurables dans Paramètres.)

## Score et progression
- Score en jeu : valeur des ressources (bonus de série), éliminations,
  objectif secondaire par secteur, bonus d'extraction si retour réussi.
- Crédits (persistants) : convertis depuis la valeur de la cargaison ramenée ;
  une défaite n'en rapporte qu'une fraction.
- 10 améliorations permanentes (5 niveaux chacune) dans l'atelier.
- 5 secteurs de difficulté croissante, débloqués par victoire.

## Ennemis
Éclaireur (rapide, groupe), Sentinelle (télégraphie son tir, garde les
zones rares), Chasseur (poursuite limitée dans le temps).

## Ressources
Ferraille, cellule énergétique (recharge immédiate), cristal néon, composant
rare, noyau instable (grande valeur, consomme un peu d'énergie porté).

## Génération procédurale
Salles + couloirs reliés par un arbre couvrant minimal, seed déterministe,
validation automatique (accessibilité, quota atteignable, absence d'ennemi
près de la base) avec variantes de repli si une carte échoue.

## Direction artistique / sonore
Palette néon sombre (cyan/magenta/orange), toutes les textures générées par
code (aucune image externe). Audio 100 % synthétique (Web Audio API).

## Accessibilité
Mode daltonien, contraste renforcé, réduction des effets/secousses/flashs,
taille de texte ajustable, touches reconfigurables, jeu jouable sans son.

## Contraintes techniques
Aucun serveur obligatoire, sauvegarde locale versionnée et validée,
GitHub Pages comme cible de déploiement, performances pensées pour du
matériel modeste (rendu par Tilemap, pas d'objet par tuile).

## Critères de réussite
Voir la section « Critères de réussite » du README.
