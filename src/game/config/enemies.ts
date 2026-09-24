import type { EnemyKind } from '../types';

export interface EnemyDef {
  kind: EnemyKind;
  label: string;
  description: string;
  hp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  detectRange: number;
  scorePoints: number;
  /** Ranged / telegraph (sentinelle). */
  rangedDamage?: number;
  rangedRange?: number;
  telegraphSec?: number;
  fireCooldownSec?: number;
  boltSpeed?: number;
  /** Poursuite limitée (chasseur) en secondes. */
  chaseSec?: number;
  giveUpCooldownSec?: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  scout: {
    kind: 'scout',
    label: 'Drone éclaireur',
    description: 'Rapide et fragile. Attaque en groupe au contact.',
    hp: 18,
    speed: 135,
    radius: 10,
    contactDamage: 8,
    detectRange: 230,
    scorePoints: 15,
  },
  sentinel: {
    kind: 'sentinel',
    label: 'Sentinelle',
    description: 'Lente et solide. Tire à distance après un signal lumineux.',
    hp: 70,
    speed: 40,
    radius: 16,
    contactDamage: 10,
    detectRange: 330,
    scorePoints: 60,
    rangedDamage: 14,
    rangedRange: 330,
    telegraphSec: 0.9,
    fireCooldownSec: 2.2,
    boltSpeed: 250,
  },
  hunter: {
    kind: 'hunter',
    label: 'Chasseur',
    description: 'Repère de loin et poursuit, mais finit par abandonner.',
    hp: 45,
    speed: 150,
    radius: 13,
    contactDamage: 16,
    detectRange: 360,
    scorePoints: 80,
    chaseSec: 7,
    giveUpCooldownSec: 6,
  },
};

/** Durée avant qu'un ennemi puisse reprendre le joueur en chasse après avoir abandonné. */
export const ENEMY_CONTACT_COOLDOWN_SEC = 0.9;
export const ENEMY_ALERT_DELAY_SEC = 0.35;
export const ENEMY_GUARD_RADIUS_PX = 90;
