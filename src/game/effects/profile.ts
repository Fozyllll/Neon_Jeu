import type { Settings } from '../save/types';

export interface EffectsProfile {
  /** Multiplicateur du nombre de particules (0 = aucune). */
  particleFactor: number;
  glow: boolean;
  shake: boolean;
  flash: boolean;
  /** Éclairage dynamique (panne de lumière avec halo autour du drone). */
  light: boolean;
  floatingText: boolean;
  rainDrops: number;
}

/** Traduit les options d'accessibilité et de performance en réglages d'effets. */
export function effectsProfile(settings: Settings): EffectsProfile {
  const perf = settings.performanceMode;
  const reduced = settings.reduceEffects || perf;
  return {
    particleFactor: perf ? 0.15 : settings.reduceEffects ? 0.4 : 1,
    glow: !perf,
    shake: !settings.reduceShake && !reduced,
    flash: !settings.noFlash && !reduced,
    light: !perf,
    floatingText: !perf,
    rainDrops: perf ? 0 : settings.reduceEffects ? 25 : 60,
  };
}
