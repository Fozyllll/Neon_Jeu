import { describe, expect, it } from 'vitest';
import { ENERGY, RUN } from '../src/game/config/balance';
import { SECTORS } from '../src/game/config/sectors';
import { applyEnemyDamage, applyPlayerDamage } from '../src/game/combat/damage';
import { computeStats, emptyUpgradeLevels } from '../src/game/progression/upgrades';
import { RunModel } from '../src/game/state/RunModel';
import { energyChangePerSec } from '../src/game/systems/energy';
import {
  creditsFromCargo,
  extractionBonus,
  pickupScore,
  streakMultiplier,
} from '../src/game/systems/score';

const sector = SECTORS[0]!;
const newRun = (levels = emptyUpgradeLevels()) =>
  new RunModel(sector, 'TEST', computeStats(levels));

describe('dégâts', () => {
  it('le bouclier absorbe avant la coque', () => {
    const r = applyPlayerDamage(100, 20, 30);
    expect(r).toMatchObject({ shield: 0, hp: 90, shieldLost: 20, hullLost: 10 });
  });

  it('ne descend jamais sous zéro et ignore les dégâts négatifs', () => {
    expect(applyPlayerDamage(5, 0, 50).hp).toBe(0);
    expect(applyPlayerDamage(50, 0, -10).hp).toBe(50);
  });

  it('tue un ennemi à zéro point de vie', () => {
    expect(applyEnemyDamage(10, 10)).toEqual({ hp: 0, dead: true });
    expect(applyEnemyDamage(10, 4)).toEqual({ hp: 6, dead: false });
  });
});

describe('énergie', () => {
  const base = {
    sectorDrain: 1,
    efficiency: 1,
    sprinting: false,
    surge: false,
    carriedCores: 0,
    inBase: false,
  };

  it('se vide en marchant, plus vite en accélérant', () => {
    const walk = energyChangePerSec(base);
    const sprint = energyChangePerSec({ ...base, sprinting: true });
    expect(walk).toBeCloseTo(-ENERGY.baseDrainPerSec);
    expect(sprint).toBeLessThan(walk);
  });

  it('se recharge dans la base', () => {
    expect(energyChangePerSec({ ...base, inBase: true })).toBeGreaterThan(0);
  });

  it('un noyau transporté augmente la consommation ; l’efficacité la réduit', () => {
    expect(energyChangePerSec({ ...base, carriedCores: 2 })).toBeLessThan(energyChangePerSec(base));
    expect(energyChangePerSec({ ...base, efficiency: 0.5 })).toBeGreaterThan(
      energyChangePerSec(base),
    );
  });
});

describe('score', () => {
  it('le multiplicateur de série est plafonné', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(5)).toBeCloseTo(1.5);
    expect(streakMultiplier(999)).toBeCloseTo(2);
  });

  it('la surcharge double les points', () => {
    const normal = pickupScore(10, 0, { scoreMultiplier: 1, surge: false });
    const surge = pickupScore(10, 0, { scoreMultiplier: 1, surge: true });
    expect(surge).toBe(normal * 2);
  });

  it('le bonus d’extraction dépend de la cargaison et de l’énergie restante', () => {
    expect(extractionBonus(40, 20)).toBe(80);
  });

  it('une défaite ne rapporte qu’une part de la cargaison', () => {
    expect(creditsFromCargo(100, 1, 'victory', RUN.defeatSalvageRatio)).toBe(100);
    expect(creditsFromCargo(100, 1, 'defeat', RUN.defeatSalvageRatio)).toBe(25);
  });
});

describe('RunModel', () => {
  it('refuse une ressource quand la soute est pleine, mais accepte les cellules', () => {
    const run = newRun();
    let accepted = 0;
    for (let i = 0; i < 40; i++) if (run.collect('scrap', 1).accepted) accepted++;
    expect(accepted).toBe(run.stats.capacity);
    expect(run.collect('crystal', 1)).toEqual({ accepted: false, reason: 'full' });
    expect(run.collect('cell', 1).accepted).toBe(true);
  });

  it('une cellule recharge l’énergie sans dépasser le maximum', () => {
    const run = newRun();
    run.energy = run.stats.maxEnergy - 5;
    const result = run.collect('cell', 1);
    expect(run.energy).toBe(run.stats.maxEnergy);
    expect(result.accepted && result.energyGained).toBeCloseTo(5);
  });

  it('la valeur d’une ressource dépend du multiplicateur de distance', () => {
    const a = newRun();
    const b = newRun();
    const near = a.collect('crystal', 1);
    const far = b.collect('crystal', 1.6);
    expect(near.accepted && far.accepted && far.value > near.value).toBe(true);
  });

  it('se termine en défaite quand l’énergie tombe à zéro', () => {
    const run = newRun();
    run.energy = 0.1;
    run.tick(1, { sprinting: false, inBase: false });
    expect(run.isDead).toBe(true);
    expect(run.deathCause).toBe('energy');
  });

  it('se termine en défaite quand la coque tombe à zéro', () => {
    const run = newRun();
    run.damage(1000);
    expect(run.deathCause).toBe('hull');
  });

  it('applique une brève invulnérabilité après un coup, sauf dégâts continus', () => {
    const run = newRun();
    run.damage(10);
    expect(run.damage(10).hullLost).toBe(0);
    expect(run.damage(1, true).hullLost).toBe(1);
    run.tick(1, { sprinting: false, inBase: false });
    expect(run.damage(10).hullLost).toBe(10);
  });

  it('ne recharge pas l’énergie hors de la base', () => {
    const run = newRun();
    run.energy = 50;
    run.tick(1, { sprinting: false, inBase: false });
    expect(run.energy).toBeLessThan(50);
    run.tick(1, { sprinting: false, inBase: true });
    expect(run.energy).toBeGreaterThan(49);
  });

  it('le bouclier se recharge après un délai', () => {
    const run = newRun({ ...emptyUpgradeLevels(), shield: 2 });
    run.damage(30);
    const after = run.shield;
    run.tick(2, { sprinting: false, inBase: false });
    expect(run.shield).toBe(after);
    run.tick(5, { sprinting: false, inBase: false });
    run.tick(2, { sprinting: false, inBase: false });
    expect(run.shield).toBeGreaterThan(after);
  });

  it('victoire seulement si le quota est atteint, sinon simple extraction', () => {
    const early = newRun();
    early.collect('scrap', 1);
    expect(early.extract().outcome).toBe('extraction');

    const full = newRun();
    while (!full.quotaReached) {
      if (!full.collect('crystal', 1).accepted) break;
    }
    expect(full.quotaReached).toBe(true);
    const result = full.extract();
    expect(result.outcome).toBe('victory');
    expect(result.creditsGained).toBe(Math.round(full.cargoValue * sector.rewardMult));
  });

  it('une défaite ne garde qu’une fraction de la cargaison et pas de bonus d’extraction', () => {
    const run = newRun();
    for (let i = 0; i < 6; i++) run.collect('crystal', 1);
    const value = run.cargoValue;
    const result = run.finish('defeat', 'hull');
    expect(result.creditsGained).toBe(
      Math.round(value * sector.rewardMult * RUN.defeatSalvageRatio),
    );
    expect(result.score).toBe(Math.round(run.score));
  });

  it('l’objectif secondaire rapporte son bonus une seule fois', () => {
    const run = newRun();
    for (let i = 0; i < sector.secondary.target; i++) run.registerKill(10);
    const before = run.score;
    expect(run.checkSecondaryCompleted()).toBe(true);
    expect(run.score).toBeGreaterThan(before);
    expect(run.checkSecondaryCompleted()).toBe(false);
  });

  it('les séries de récupération font monter le multiplicateur puis retombent', () => {
    const run = newRun();
    run.collect('scrap', 1);
    run.collect('scrap', 1);
    expect(run.streak).toBe(2);
    run.tick(10, { sprinting: false, inBase: true });
    expect(run.streak).toBe(0);
  });
});
