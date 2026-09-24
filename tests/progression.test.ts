import { describe, expect, it } from 'vitest';
import { PLAYER_BASE_STATS } from '../src/game/config/balance';
import { UPGRADES } from '../src/game/config/upgrades';
import {
  computeStats,
  describeEffect,
  emptyUpgradeLevels,
  tryPurchase,
  unlockedAfterVictory,
  upgradeCost,
} from '../src/game/progression/upgrades';

describe('améliorations', () => {
  it('sans amélioration, les statistiques de base sont inchangées', () => {
    const stats = computeStats(emptyUpgradeLevels());
    expect(stats.maxEnergy).toBe(PLAYER_BASE_STATS.maxEnergy);
    expect(stats.maxShield).toBe(0);
    expect(stats.magnetRadius).toBe(0);
  });

  it('chaque amélioration modifie réellement une statistique', () => {
    const base = computeStats(emptyUpgradeLevels());
    for (const def of UPGRADES) {
      const upgraded = computeStats({ ...emptyUpgradeLevels(), [def.id]: 3 });
      expect(JSON.stringify(upgraded)).not.toBe(JSON.stringify(base));
    }
  });

  it('les niveaux sont bornés au maximum', () => {
    const stats = computeStats({ ...emptyUpgradeLevels(), battery: 99 });
    expect(stats.maxEnergy).toBe(PLAYER_BASE_STATS.maxEnergy + 20 * 5);
  });

  it('le coût augmente à chaque niveau', () => {
    for (const def of UPGRADES) {
      expect(upgradeCost(def.id, 1)).toBeGreaterThan(upgradeCost(def.id, 0));
    }
  });

  it('refuse un achat sans assez de crédits ou au niveau maximum', () => {
    const levels = emptyUpgradeLevels();
    expect(tryPurchase(0, levels, 'battery')).toEqual({ ok: false, reason: 'credits' });
    levels.battery = 5;
    expect(tryPurchase(99999, levels, 'battery')).toEqual({ ok: false, reason: 'max' });
  });

  it('accepte un achat avec assez de crédits', () => {
    const result = tryPurchase(1000, emptyUpgradeLevels(), 'hull');
    expect(result).toEqual({ ok: true, cost: upgradeCost('hull', 0), newLevel: 1 });
  });

  it('décrit l’effet de chaque amélioration', () => {
    for (const def of UPGRADES) expect(describeEffect(def.id, 2).length).toBeGreaterThan(3);
  });

  it('débloque le secteur suivant, jamais au-delà du dernier', () => {
    expect(unlockedAfterVictory(1, 1)).toBe(2);
    expect(unlockedAfterVictory(3, 1)).toBe(3);
    expect(unlockedAfterVictory(5, 5)).toBe(5);
  });
});
