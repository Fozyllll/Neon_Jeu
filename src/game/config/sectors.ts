import type { EventKind } from '../types';

export interface SecondaryObjective {
  type: 'kills' | 'rare';
  target: number;
}

export interface SectorConfig {
  id: number;
  name: string;
  tagline: string;
  description: string;
  mapW: number;
  mapH: number;
  roomCount: number;
  minRooms: number;
  resourceDensity: number;
  scoutChance: number;
  sentinelChance: number;
  hunterChance: number;
  maxEnemies: number;
  /** Rayon de sécurité (en tuiles de chemin) autour de la base : aucun ennemi n'y apparaît. */
  safeRadius: number;
  valueMult: number;
  rewardMult: number;
  drainMult: number;
  quota: number;
  secondary: SecondaryObjective;
  eventInterval: readonly [number, number];
  events: readonly EventKind[];
  accent: number;
}

export const SECTORS: readonly SectorConfig[] = [
  {
    id: 1,
    name: 'Secteur 1 · Découverte',
    tagline: 'Les faubourgs endormis',
    description: 'Peu de patrouilles, un bon terrain pour apprendre à récupérer et à viser.',
    mapW: 56,
    mapH: 38,
    roomCount: 9,
    minRooms: 6,
    resourceDensity: 0.05,
    scoutChance: 0.5,
    sentinelChance: 0.25,
    hunterChance: 0.15,
    maxEnemies: 8,
    safeRadius: 16,
    valueMult: 1,
    rewardMult: 1,
    drainMult: 1,
    quota: 40,
    secondary: { type: 'kills', target: 3 },
    eventInterval: [40, 65],
    events: ['recoveryBonus', 'abandonedChest', 'rareDetected'],
    accent: 0x38e8ff,
  },
  {
    id: 2,
    name: 'Secteur 2 · Ruines industrielles',
    tagline: 'Usines, grues et coupures de courant',
    description: 'Plus de drones, des pannes de lumière et des vagues de renfort.',
    mapW: 68,
    mapH: 44,
    roomCount: 12,
    minRooms: 8,
    resourceDensity: 0.05,
    scoutChance: 0.6,
    sentinelChance: 0.35,
    hunterChance: 0.3,
    maxEnemies: 14,
    safeRadius: 16,
    valueMult: 1.15,
    rewardMult: 1.2,
    drainMult: 1.1,
    quota: 75,
    secondary: { type: 'rare', target: 1 },
    eventInterval: [35, 60],
    events: ['recoveryBonus', 'abandonedChest', 'rareDetected', 'blackout', 'enemyWave'],
    accent: 0xff9a3c,
  },
  {
    id: 3,
    name: 'Secteur 3 · Zone de quarantaine',
    tagline: 'L’air y ronge la coque',
    description: 'La pluie acide abîme la coque et les sentinelles gardent les meilleurs butins.',
    mapW: 76,
    mapH: 50,
    roomCount: 14,
    minRooms: 9,
    resourceDensity: 0.05,
    scoutChance: 0.6,
    sentinelChance: 0.45,
    hunterChance: 0.35,
    maxEnemies: 18,
    safeRadius: 18,
    valueMult: 1.3,
    rewardMult: 1.4,
    drainMult: 1.2,
    quota: 110,
    secondary: { type: 'kills', target: 5 },
    eventInterval: [32, 55],
    events: [
      'recoveryBonus',
      'abandonedChest',
      'rareDetected',
      'acidRain',
      'enemyWave',
      'blackout',
    ],
    accent: 0x4dff9a,
  },
  {
    id: 4,
    name: 'Secteur 4 · Cœur énergétique',
    tagline: 'Là où le réseau bat encore',
    description: 'Les surcharges accélèrent ta batterie mais doublent les points de récupération.',
    mapW: 84,
    mapH: 54,
    roomCount: 16,
    minRooms: 10,
    resourceDensity: 0.05,
    scoutChance: 0.65,
    sentinelChance: 0.45,
    hunterChance: 0.4,
    maxEnemies: 22,
    safeRadius: 18,
    valueMult: 1.5,
    rewardMult: 1.7,
    drainMult: 1.3,
    quota: 160,
    secondary: { type: 'rare', target: 2 },
    eventInterval: [30, 50],
    events: [
      'recoveryBonus',
      'abandonedChest',
      'rareDetected',
      'energySurge',
      'enemyWave',
      'blackout',
    ],
    accent: 0xff3df2,
  },
  {
    id: 5,
    name: 'Secteur 5 · Secteur expérimental',
    tagline: 'Rien ici n’était censé fonctionner',
    description: 'Grande carte, tous les dangers, les plus grosses récompenses.',
    mapW: 96,
    mapH: 60,
    roomCount: 18,
    minRooms: 12,
    resourceDensity: 0.05,
    scoutChance: 0.7,
    sentinelChance: 0.5,
    hunterChance: 0.45,
    maxEnemies: 28,
    safeRadius: 20,
    valueMult: 1.8,
    rewardMult: 2.1,
    drainMult: 1.4,
    quota: 220,
    secondary: { type: 'kills', target: 8 },
    eventInterval: [28, 46],
    events: [
      'recoveryBonus',
      'abandonedChest',
      'rareDetected',
      'blackout',
      'acidRain',
      'energySurge',
      'enemyWave',
    ],
    accent: 0xf2f2ff,
  },
];

export function getSector(id: number): SectorConfig {
  const sector = SECTORS.find((s) => s.id === id);
  if (!sector) throw new Error(`Secteur inconnu : ${id}`);
  return sector;
}
