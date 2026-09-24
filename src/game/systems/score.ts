import { SCORE } from '../config/balance';
import type { RunOutcome } from '../types';

export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(0, streak), SCORE.maxStreak) * SCORE.streakStep;
}

export interface ScoreModifiers {
  scoreMultiplier: number;
  surge: boolean;
}

export function pickupScore(value: number, streak: number, mods: ScoreModifiers): number {
  const surge = mods.surge ? SCORE.surgeMult : 1;
  return Math.round(value * streakMultiplier(streak) * mods.scoreMultiplier * surge);
}

export function killScore(points: number, scoreMultiplier: number): number {
  return Math.round(points * scoreMultiplier);
}

/** Bonus de fin de partie : uniquement si la cargaison est rentrée à la base. */
export function extractionBonus(cargoValue: number, energy: number): number {
  return Math.round(
    cargoValue * SCORE.extractionBonusPerValue + Math.max(0, energy) * SCORE.energyBonusPerUnit,
  );
}

export function creditsFromCargo(
  cargoValue: number,
  rewardMult: number,
  outcome: RunOutcome,
  salvageRatio: number,
): number {
  const full = cargoValue * rewardMult;
  return Math.round(outcome === 'defeat' ? full * salvageRatio : full);
}
