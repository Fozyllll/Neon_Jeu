import type { UpgradeId } from '../types';

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  /** Texte de l'effet par niveau, pour l'interface. */
  perLevel: string;
}

export const UPGRADE_COST_GROWTH = 1.6;
export const UPGRADE_MAX_LEVEL = 5;

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'battery',
    label: 'Batterie améliorée',
    description: 'Augmente l’énergie maximale : tu restes plus longtemps sur le terrain.',
    baseCost: 40,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+20 énergie max',
  },
  {
    id: 'hull',
    label: 'Coque renforcée',
    description: 'Encaisse davantage de dégâts avant la destruction.',
    baseCost: 50,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+25 points de coque',
  },
  {
    id: 'engine',
    label: 'Moteur plus rapide',
    description: 'Vitesse de déplacement accrue, y compris pendant l’accélération.',
    baseCost: 45,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+12 % de vitesse',
  },
  {
    id: 'tool',
    label: 'Outil de récupération',
    description: 'Le rayon plasma inflige plus de dégâts aux drones ennemis.',
    baseCost: 60,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+30 % de dégâts',
  },
  {
    id: 'capacity',
    label: 'Capacité de transport',
    description: 'Une soute plus grande pour rapporter plus de butin par sortie.',
    baseCost: 40,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+3 de capacité',
  },
  {
    id: 'magnet',
    label: 'Aimant de ressources',
    description: 'Attire et récupère automatiquement les ressources proches.',
    baseCost: 55,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: 'Rayon d’attraction croissant',
  },
  {
    id: 'shield',
    label: 'Bouclier temporaire',
    description: 'Absorbe des dégâts puis se recharge s’il n’est plus touché.',
    baseCost: 70,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+20 points de bouclier',
  },
  {
    id: 'scanner',
    label: 'Scanner de zones rares',
    description: 'Affiche les composants et noyaux sur la mini-carte.',
    baseCost: 65,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: 'Portée du scanner croissante',
  },
  {
    id: 'multiplier',
    label: 'Multiplicateur de score',
    description: 'Tous les points de récupération et de combat sont augmentés.',
    baseCost: 80,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '+10 % de score',
  },
  {
    id: 'efficiency',
    label: 'Efficacité énergétique',
    description: 'Réduit la consommation d’énergie de tous les systèmes.',
    baseCost: 75,
    maxLevel: UPGRADE_MAX_LEVEL,
    perLevel: '−7 % de consommation',
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);
