import { PLAYER_BASE_STATS, SECTOR_COUNT } from '../config/balance';
import { UPGRADE_COST_GROWTH, UPGRADES, UPGRADE_IDS } from '../config/upgrades';
import type { PlayerStats, UpgradeId } from '../types';

export type UpgradeLevels = Record<UpgradeId, number>;

export function emptyUpgradeLevels(): UpgradeLevels {
  const levels = {} as UpgradeLevels;
  for (const id of UPGRADE_IDS) levels[id] = 0;
  return levels;
}

export function getUpgradeDef(id: UpgradeId) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Amélioration inconnue : ${id}`);
  return def;
}

/** Coût pour passer du niveau `level` au niveau suivant. */
export function upgradeCost(id: UpgradeId, level: number): number {
  return Math.round(getUpgradeDef(id).baseCost * Math.pow(UPGRADE_COST_GROWTH, level));
}

const MAGNET_RADIUS = [0, 50, 80, 110, 140, 170];
const SCANNER_RADIUS = [0, 320, 520, 720, 960, 1300];

/** Statistiques du drone calculées à partir des niveaux d'amélioration. */
export function computeStats(levels: UpgradeLevels): PlayerStats {
  const b = PLAYER_BASE_STATS;
  const lv = (id: UpgradeId) => Math.max(0, Math.min(levels[id] ?? 0, getUpgradeDef(id).maxLevel));
  return {
    maxHp: b.maxHp + 25 * lv('hull'),
    maxEnergy: b.maxEnergy + 20 * lv('battery'),
    speed: Math.round(b.speed * (1 + 0.12 * lv('engine'))),
    toolDamage: Math.round(b.toolDamage * (1 + 0.3 * lv('tool')) * 10) / 10,
    capacity: b.capacity + 3 * lv('capacity'),
    pickupRange: b.pickupRange,
    magnetRadius: MAGNET_RADIUS[lv('magnet')] ?? 0,
    maxShield: 20 * lv('shield'),
    scannerRadius: SCANNER_RADIUS[lv('scanner')] ?? 0,
    scoreMultiplier: Math.round((1 + 0.1 * lv('multiplier')) * 100) / 100,
    drainMultiplier: Math.round(Math.pow(0.93, lv('efficiency')) * 1000) / 1000,
  };
}

/** Texte décrivant l'effet actuel d'une amélioration à un niveau donné. */
export function describeEffect(id: UpgradeId, level: number): string {
  const s = computeStats({ ...emptyUpgradeLevels(), [id]: level });
  switch (id) {
    case 'battery':
      return `Énergie max : ${s.maxEnergy}`;
    case 'hull':
      return `Coque max : ${s.maxHp}`;
    case 'engine':
      return `Vitesse : ${s.speed} px/s`;
    case 'tool':
      return `Dégâts de l’outil : ${s.toolDamage}`;
    case 'capacity':
      return `Capacité de soute : ${s.capacity}`;
    case 'magnet':
      return s.magnetRadius > 0 ? `Rayon d’attraction : ${s.magnetRadius} px` : 'Aimant inactif';
    case 'shield':
      return s.maxShield > 0 ? `Bouclier : ${s.maxShield}` : 'Aucun bouclier';
    case 'scanner':
      return s.scannerRadius > 0 ? `Portée du scanner : ${s.scannerRadius} px` : 'Scanner inactif';
    case 'multiplier':
      return `Score : ×${s.scoreMultiplier.toFixed(2)}`;
    case 'efficiency':
      return `Consommation : ×${s.drainMultiplier.toFixed(2)}`;
  }
}

export type PurchaseResult =
  { ok: true; cost: number; newLevel: number } | { ok: false; reason: 'max' | 'credits' };

export function tryPurchase(credits: number, levels: UpgradeLevels, id: UpgradeId): PurchaseResult {
  const def = getUpgradeDef(id);
  const level = levels[id] ?? 0;
  if (level >= def.maxLevel) return { ok: false, reason: 'max' };
  const cost = upgradeCost(id, level);
  if (credits < cost) return { ok: false, reason: 'credits' };
  return { ok: true, cost, newLevel: level + 1 };
}

/** Le secteur suivant est débloqué par une victoire dans le secteur courant. */
export function unlockedAfterVictory(unlocked: number, sectorId: number): number {
  return Math.min(SECTOR_COUNT, Math.max(unlocked, sectorId + 1));
}
