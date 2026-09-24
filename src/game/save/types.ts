import type { KeyAction } from '../types';
import type { UpgradeLevels } from '../progression/upgrades';

export interface Settings {
  musicOn: boolean;
  sfxOn: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  colorblind: boolean;
  reduceEffects: boolean;
  reduceShake: boolean;
  noFlash: boolean;
  highContrast: boolean;
  performanceMode: boolean;
  textScale: number;
  keys: Record<KeyAction, number>;
}

export interface LifetimeStats {
  runs: number;
  victories: number;
  extractions: number;
  defeats: number;
  totalCollected: number;
  totalKills: number;
  totalCredits: number;
  playSeconds: number;
}

export interface SaveData {
  version: number;
  credits: number;
  upgrades: UpgradeLevels;
  /** Meilleur score par identifiant de secteur. */
  bestScores: Record<string, number>;
  unlockedSector: number;
  stats: LifetimeStats;
  lastSeed: string;
  settings: Settings;
}
