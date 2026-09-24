export type ResourceKind = 'scrap' | 'cell' | 'crystal' | 'component' | 'core';
export type EnemyKind = 'scout' | 'sentinel' | 'hunter';
export type UpgradeId =
  | 'battery'
  | 'hull'
  | 'engine'
  | 'tool'
  | 'capacity'
  | 'magnet'
  | 'shield'
  | 'scanner'
  | 'multiplier'
  | 'efficiency';
export type EventKind =
  | 'blackout'
  | 'acidRain'
  | 'energySurge'
  | 'enemyWave'
  | 'abandonedChest'
  | 'rareDetected'
  | 'recoveryBonus';
export type KeyAction =
  'up' | 'down' | 'left' | 'right' | 'interact' | 'sprint' | 'pause' | 'restart';
export type RunOutcome = 'victory' | 'extraction' | 'defeat';
export type DefeatCause = 'hull' | 'energy' | 'abandoned';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TilePos {
  tx: number;
  ty: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RoomKind = 'base' | 'normal' | 'rare';

export interface Room extends Rect {
  kind: RoomKind;
}

export interface ResourceSpawn {
  kind: ResourceKind;
  tx: number;
  ty: number;
  /** Multiplicateur de valeur lié à l'éloignement de la base (prise de risque). */
  valueMult: number;
}

export interface EnemySpawn {
  kind: EnemyKind;
  tx: number;
  ty: number;
  groupId: number;
  guardTx?: number;
  guardTy?: number;
}

export interface GameMap {
  seed: string;
  sectorId: number;
  width: number;
  height: number;
  /** 0 = sol, 1 = mur. Indexation : ty * width + tx. */
  tiles: Uint8Array;
  rooms: Room[];
  base: Rect;
  start: TilePos;
  rareRoomIndex: number;
  resources: ResourceSpawn[];
  enemies: EnemySpawn[];
  /** Plus grande distance (en tuiles) depuis la base. */
  maxDistance: number;
  /** Distance de chemin (en tuiles) depuis la base pour chaque tuile, -1 si mur. */
  distance: Int32Array;
}

export interface PlayerStats {
  maxHp: number;
  maxEnergy: number;
  speed: number;
  toolDamage: number;
  capacity: number;
  pickupRange: number;
  magnetRadius: number;
  maxShield: number;
  scannerRadius: number;
  scoreMultiplier: number;
  drainMultiplier: number;
}

export interface CargoItem {
  kind: ResourceKind;
  value: number;
}

export interface RunResult {
  sectorId: number;
  seed: string;
  outcome: RunOutcome;
  cause?: DefeatCause;
  score: number;
  creditsGained: number;
  cargoValue: number;
  collected: Record<ResourceKind, number>;
  kills: number;
  timeSeconds: number;
}
