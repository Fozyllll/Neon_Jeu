import { ENERGY } from '../config/balance';

export interface EnergyInput {
  sectorDrain: number;
  /** Multiplicateur d'efficacité (< 1 = consomme moins). */
  efficiency: number;
  sprinting: boolean;
  surge: boolean;
  carriedCores: number;
  inBase: boolean;
}

/** Variation d'énergie par seconde : négative en sortie, positive dans la base (recharge). */
export function energyChangePerSec(input: EnergyInput): number {
  if (input.inBase) return ENERGY.baseRegenPerSec;
  let drain = ENERGY.baseDrainPerSec * input.sectorDrain;
  if (input.sprinting) drain *= ENERGY.sprintMult;
  if (input.surge) drain *= ENERGY.surgeDrainMult;
  drain += input.carriedCores * ENERGY.coreDrainPerSec;
  return -drain * input.efficiency;
}

export function shotEnergyCost(efficiency: number): number {
  return ENERGY.shotCost * efficiency;
}
