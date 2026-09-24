/** Toutes les constantes d'équilibrage du jeu sont regroupées ici. */

export const TILE = 32;
export const VIEW_W = 960;
export const VIEW_H = 540;
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;

export const PLAYER_BASE_STATS = {
  maxHp: 100,
  maxEnergy: 100,
  speed: 190,
  toolDamage: 10,
  capacity: 14,
  pickupRange: 46,
  magnetRadius: 0,
  maxShield: 0,
  scannerRadius: 0,
  scoreMultiplier: 1,
  drainMultiplier: 1,
} as const;

export const PLAYER = {
  radius: 11,
  acceleration: 1500,
  sprintSpeedMult: 1.6,
  fireCooldown: 0.24,
  boltSpeed: 560,
  boltLifetime: 0.8,
  invulnerabilityAfterHit: 0.6,
  pickupCooldown: 0.16,
} as const;

export const ENERGY = {
  baseDrainPerSec: 0.45,
  sprintMult: 2.2,
  shotCost: 0.35,
  cellRestore: 18,
  baseRegenPerSec: 14,
  lowRatio: 0.25,
  coreDrainPerSec: 0.1,
  surgeDrainMult: 1.8,
  surgeCellBonus: 1.5,
} as const;

export const SHIELD = {
  regenDelaySec: 5,
  regenPerSec: 12,
} as const;

export const SCORE = {
  streakWindowSec: 4,
  streakStep: 0.1,
  maxStreak: 10,
  cellPoints: 5,
  surgeMult: 2,
  recoveryMult: 1.5,
  extractionBonusPerValue: 1.5,
  energyBonusPerUnit: 1,
  secondaryBonus: 150,
} as const;

export const RUN = {
  extractHoldSec: 1.0,
  defeatSalvageRatio: 0.25,
  endDelaySec: 1.1,
} as const;

export const EVENT_BALANCE = {
  acidDamagePerSec: 1.3,
  blackoutLightRadius: 150,
  waveExtraEnemyCap: 6,
  waveMinSize: 3,
  waveMaxSize: 5,
  pingLifetimeSec: 45,
  firstEventAtSec: 30,
} as const;

export const SECTOR_COUNT = 5;
