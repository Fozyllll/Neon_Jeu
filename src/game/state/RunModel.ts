import { ENERGY, RUN, SCORE, SHIELD, PLAYER } from '../config/balance';
import { RESOURCES } from '../config/resources';
import type { SectorConfig } from '../config/sectors';
import { applyPlayerDamage } from '../combat/damage';
import { energyChangePerSec, shotEnergyCost } from '../systems/energy';
import {
  creditsFromCargo,
  extractionBonus,
  killScore,
  pickupScore,
  streakMultiplier,
} from '../systems/score';
import type {
  CargoItem,
  DefeatCause,
  PlayerStats,
  ResourceKind,
  RunOutcome,
  RunResult,
} from '../types';
import { clamp } from '../utils/math';

export type CollectResult =
  | { accepted: true; value: number; scoreGain: number; energyGained: number }
  | { accepted: false; reason: 'full' };

export interface TickInput {
  sprinting: boolean;
  inBase: boolean;
}

/** Règles d'une partie, sans aucune dépendance au moteur de jeu (testable seule). */
export class RunModel {
  time = 0;
  hp: number;
  energy: number;
  shield: number;
  cargo: CargoItem[] = [];
  score = 0;
  streak = 0;
  kills = 0;
  rareCollected = 0;
  secondaryDone = false;
  surgeActive = false;
  recoveryActive = false;
  ended = false;
  collected: Record<ResourceKind, number> = {
    scrap: 0,
    cell: 0,
    crystal: 0,
    component: 0,
    core: 0,
  };

  private streakTimer = 0;
  private invulnerability = 0;
  private shieldDelay = 0;

  constructor(
    readonly sector: SectorConfig,
    readonly seed: string,
    readonly stats: PlayerStats,
  ) {
    this.hp = stats.maxHp;
    this.energy = stats.maxEnergy;
    this.shield = stats.maxShield;
  }

  get cargoWeight(): number {
    return this.cargo.reduce((sum, item) => sum + RESOURCES[item.kind].weight, 0);
  }

  get cargoValue(): number {
    return this.cargo.reduce((sum, item) => sum + item.value, 0);
  }

  get quotaReached(): boolean {
    return this.cargoValue >= this.sector.quota;
  }

  get carriedCores(): number {
    return this.cargo.filter((c) => c.kind === 'core').length;
  }

  get streakMultiplier(): number {
    return streakMultiplier(this.streak);
  }

  get isDead(): boolean {
    return this.hp <= 0 || this.energy <= 0;
  }

  get deathCause(): DefeatCause | null {
    if (this.hp <= 0) return 'hull';
    if (this.energy <= 0) return 'energy';
    return null;
  }

  get isInvulnerable(): boolean {
    return this.invulnerability > 0;
  }

  canCarry(kind: ResourceKind): boolean {
    return RESOURCES[kind].weight <= this.stats.capacity - this.cargoWeight;
  }

  collect(kind: ResourceKind, valueMult: number): CollectResult {
    if (kind === 'cell') {
      const bonus = this.surgeActive ? ENERGY.surgeCellBonus : 1;
      const before = this.energy;
      this.energy = Math.min(this.stats.maxEnergy, this.energy + ENERGY.cellRestore * bonus);
      const gain = Math.round(SCORE.cellPoints * this.stats.scoreMultiplier);
      this.score += gain;
      this.collected.cell++;
      return { accepted: true, value: 0, scoreGain: gain, energyGained: this.energy - before };
    }
    if (!this.canCarry(kind)) return { accepted: false, reason: 'full' };

    const recovery = this.recoveryActive ? SCORE.recoveryMult : 1;
    const value = Math.max(
      1,
      Math.round(RESOURCES[kind].value * this.sector.valueMult * valueMult * recovery),
    );
    this.cargo.push({ kind, value });
    this.collected[kind]++;
    if (RESOURCES[kind].rare) this.rareCollected++;

    this.streak = Math.min(this.streak + 1, SCORE.maxStreak);
    this.streakTimer = SCORE.streakWindowSec;
    const scoreGain = pickupScore(value, this.streak - 1, {
      scoreMultiplier: this.stats.scoreMultiplier,
      surge: this.surgeActive,
    });
    this.score += scoreGain;
    return { accepted: true, value, scoreGain, energyGained: 0 };
  }

  registerKill(points: number): number {
    this.kills++;
    const gain = killScore(points, this.stats.scoreMultiplier);
    this.score += gain;
    return gain;
  }

  spendShot(): boolean {
    const cost = shotEnergyCost(this.stats.drainMultiplier);
    if (this.energy <= cost) return false;
    this.energy -= cost;
    return true;
  }

  /**
   * Dégâts subis. `continuous` : dégâts d'environnement (pluie acide) qui ignorent
   * l'invulnérabilité de courte durée et ne la déclenchent pas.
   */
  damage(amount: number, continuous = false): { hullLost: number; shieldLost: number } {
    if (this.ended || amount <= 0) return { hullLost: 0, shieldLost: 0 };
    if (!continuous && this.invulnerability > 0) return { hullLost: 0, shieldLost: 0 };
    const outcome = applyPlayerDamage(this.hp, this.shield, amount);
    this.hp = outcome.hp;
    this.shield = outcome.shield;
    this.shieldDelay = SHIELD.regenDelaySec;
    if (!continuous) this.invulnerability = PLAYER.invulnerabilityAfterHit;
    return { hullLost: outcome.hullLost, shieldLost: outcome.shieldLost };
  }

  tick(dt: number, input: TickInput): void {
    if (this.ended) return;
    this.time += dt;
    this.invulnerability = Math.max(0, this.invulnerability - dt);

    const change = energyChangePerSec({
      sectorDrain: this.sector.drainMult,
      efficiency: this.stats.drainMultiplier,
      sprinting: input.sprinting,
      surge: this.surgeActive,
      carriedCores: this.carriedCores,
      inBase: input.inBase,
    });
    this.energy = clamp(this.energy + change * dt, 0, this.stats.maxEnergy);

    if (input.inBase) {
      this.shield = this.stats.maxShield;
    } else if (this.stats.maxShield > 0) {
      this.shieldDelay = Math.max(0, this.shieldDelay - dt);
      if (this.shieldDelay === 0) {
        this.shield = Math.min(this.stats.maxShield, this.shield + SHIELD.regenPerSec * dt);
      }
    }

    if (this.streak > 0) {
      this.streakTimer -= dt;
      if (this.streakTimer <= 0) this.streak = 0;
    }
  }

  get secondaryProgress(): number {
    const target = this.sector.secondary;
    return Math.min(target.target, target.type === 'kills' ? this.kills : this.rareCollected);
  }

  /** Vrai une seule fois : au moment où l'objectif secondaire est atteint. */
  checkSecondaryCompleted(): boolean {
    if (this.secondaryDone) return false;
    if (this.secondaryProgress < this.sector.secondary.target) return false;
    this.secondaryDone = true;
    this.score += SCORE.secondaryBonus;
    return true;
  }

  /** Termine la partie et calcule le résultat. Ne peut être appelé qu'une fois. */
  finish(outcome: RunOutcome, cause?: DefeatCause): RunResult {
    this.ended = true;
    const cargoValue = this.cargoValue;
    const returned = outcome !== 'defeat';
    const finalScore = returned
      ? this.score + extractionBonus(cargoValue, this.energy)
      : this.score;
    return {
      sectorId: this.sector.id,
      seed: this.seed,
      outcome,
      cause,
      score: Math.round(finalScore),
      creditsGained: creditsFromCargo(
        cargoValue,
        this.sector.rewardMult,
        outcome,
        RUN.defeatSalvageRatio,
      ),
      cargoValue,
      collected: { ...this.collected },
      kills: this.kills,
      timeSeconds: Math.round(this.time),
    };
  }

  /** Extraction à la base : victoire si le quota est atteint, repli sinon. */
  extract(): RunResult {
    return this.finish(this.quotaReached ? 'victory' : 'extraction');
  }
}
