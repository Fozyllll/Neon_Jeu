export interface DamageOutcome {
  hp: number;
  shield: number;
  shieldLost: number;
  hullLost: number;
}

/** Le bouclier absorbe en premier ; le reste attaque la coque. Jamais de valeur négative. */
export function applyPlayerDamage(hp: number, shield: number, amount: number): DamageOutcome {
  const damage = Math.max(0, amount);
  const shieldLost = Math.min(shield, damage);
  const hullLost = Math.min(hp, damage - shieldLost);
  return {
    hp: hp - hullLost,
    shield: shield - shieldLost,
    shieldLost,
    hullLost,
  };
}

export interface EnemyDamageOutcome {
  hp: number;
  dead: boolean;
}

export function applyEnemyDamage(hp: number, amount: number): EnemyDamageOutcome {
  const next = Math.max(0, hp - Math.max(0, amount));
  return { hp: next, dead: next <= 0 };
}
