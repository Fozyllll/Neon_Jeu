import type { ResourceKind } from '../types';

export interface ResourceDef {
  kind: ResourceKind;
  label: string;
  description: string;
  /** Valeur de base (crédits) avant multiplicateurs de secteur et de distance. */
  value: number;
  /** Place occupée dans la soute. */
  weight: number;
  /** Rare = visible par le scanner. */
  rare: boolean;
  /** Forme utilisée pour ne pas dépendre uniquement de la couleur. */
  shape: string;
}

export const RESOURCES: Record<ResourceKind, ResourceDef> = {
  scrap: {
    kind: 'scrap',
    label: 'Ferraille',
    description: 'Commune, peu de valeur, légère.',
    value: 4,
    weight: 1,
    rare: false,
    shape: 'carré',
  },
  cell: {
    kind: 'cell',
    label: 'Cellule énergétique',
    description: 'Recharge la batterie immédiatement. Ne prend pas de place.',
    value: 0,
    weight: 0,
    rare: false,
    shape: 'cercle',
  },
  crystal: {
    kind: 'crystal',
    label: 'Cristal néon',
    description: 'Précieux et assez léger.',
    value: 12,
    weight: 2,
    rare: false,
    shape: 'losange',
  },
  component: {
    kind: 'component',
    label: 'Composant rare',
    description: 'Très recherché, souvent gardé.',
    value: 30,
    weight: 3,
    rare: true,
    shape: 'triangle',
  },
  core: {
    kind: 'core',
    label: 'Noyau instable',
    description: 'Énorme valeur, mais il aspire un peu d’énergie tant que tu le portes.',
    value: 70,
    weight: 4,
    rare: true,
    shape: 'étoile',
  },
};

export const RESOURCE_KINDS: readonly ResourceKind[] = [
  'scrap',
  'cell',
  'crystal',
  'component',
  'core',
];
