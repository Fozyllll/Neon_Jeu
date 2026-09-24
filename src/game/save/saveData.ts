import { SECTOR_COUNT } from '../config/balance';
import { DEFAULT_KEYS, KEY_ACTIONS } from '../config/keys';
import { UPGRADES } from '../config/upgrades';
import { emptyUpgradeLevels } from '../progression/upgrades';
import { clamp } from '../utils/math';
import type { LifetimeStats, SaveData, Settings } from './types';

export const SAVE_VERSION = 1;
export const TEXT_SCALE_MIN = 0.9;
export const TEXT_SCALE_MAX = 1.5;

export function defaultSettings(): Settings {
  return {
    musicOn: true,
    sfxOn: true,
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    colorblind: false,
    reduceEffects: false,
    reduceShake: false,
    noFlash: false,
    highContrast: false,
    performanceMode: false,
    textScale: 1,
    keys: { ...DEFAULT_KEYS },
  };
}

function defaultStats(): LifetimeStats {
  return {
    runs: 0,
    victories: 0,
    extractions: 0,
    defeats: 0,
    totalCollected: 0,
    totalKills: 0,
    totalCredits: 0,
    playSeconds: 0,
  };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    credits: 0,
    upgrades: emptyUpgradeLevels(),
    bestScores: {},
    unlockedSector: 1,
    stats: defaultStats(),
    lastSeed: '',
    settings: defaultSettings(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(num(value, fallback, min, max));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isRecord(raw)) return d;
  const keys = { ...d.keys };
  if (isRecord(raw.keys)) {
    const used = new Set<number>();
    for (const action of KEY_ACTIONS) {
      const code = raw.keys[action];
      if (
        typeof code === 'number' &&
        Number.isInteger(code) &&
        code > 0 &&
        code < 256 &&
        !used.has(code)
      ) {
        keys[action] = code;
      }
      used.add(keys[action]);
    }
  }
  return {
    musicOn: bool(raw.musicOn, d.musicOn),
    sfxOn: bool(raw.sfxOn, d.sfxOn),
    masterVolume: num(raw.masterVolume, d.masterVolume, 0, 1),
    musicVolume: num(raw.musicVolume, d.musicVolume, 0, 1),
    sfxVolume: num(raw.sfxVolume, d.sfxVolume, 0, 1),
    colorblind: bool(raw.colorblind, d.colorblind),
    reduceEffects: bool(raw.reduceEffects, d.reduceEffects),
    reduceShake: bool(raw.reduceShake, d.reduceShake),
    noFlash: bool(raw.noFlash, d.noFlash),
    highContrast: bool(raw.highContrast, d.highContrast),
    performanceMode: bool(raw.performanceMode, d.performanceMode),
    textScale: num(raw.textScale, d.textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX),
    keys,
  };
}

/**
 * Valide et normalise des données quelconques en sauvegarde utilisable.
 * Chaque champ invalide est remplacé par sa valeur par défaut, sans jamais lever d'erreur.
 */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isRecord(raw)) return d;

  const upgrades = emptyUpgradeLevels();
  if (isRecord(raw.upgrades)) {
    for (const def of UPGRADES) {
      upgrades[def.id] = int(raw.upgrades[def.id], 0, 0, def.maxLevel);
    }
  }

  const bestScores: Record<string, number> = {};
  if (isRecord(raw.bestScores)) {
    for (let id = 1; id <= SECTOR_COUNT; id++) {
      const value = raw.bestScores[String(id)];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        bestScores[String(id)] = Math.round(clamp(value, 0, 1e9));
      }
    }
  }

  const s = isRecord(raw.stats) ? raw.stats : {};
  const big = 1e9;
  const seed =
    typeof raw.lastSeed === 'string'
      ? raw.lastSeed.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16)
      : '';

  return {
    version: SAVE_VERSION,
    credits: int(raw.credits, 0, 0, big),
    upgrades,
    bestScores,
    unlockedSector: int(raw.unlockedSector, 1, 1, SECTOR_COUNT),
    stats: {
      runs: int(s.runs, 0, 0, big),
      victories: int(s.victories, 0, 0, big),
      extractions: int(s.extractions, 0, 0, big),
      defeats: int(s.defeats, 0, 0, big),
      totalCollected: int(s.totalCollected, 0, 0, big),
      totalKills: int(s.totalKills, 0, 0, big),
      totalCredits: int(s.totalCredits, 0, 0, big),
      playSeconds: int(s.playSeconds, 0, 0, big),
    },
    lastSeed: seed,
    settings: sanitizeSettings(raw.settings),
  };
}

export type MigrationOutcome = { data: SaveData; status: 'current' | 'migrated' | 'from-future' };

/**
 * Amène des données de n'importe quelle version au format courant.
 * - version absente ou < courante : les champs connus sont conservés (« migrated ») ;
 * - version > courante (sauvegarde d'une build plus récente) : lecture prudente (« from-future »).
 * Les migrations spécifiques à une version s'ajoutent dans `MIGRATIONS` lors d'un changement de format.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrateSave(raw: unknown): MigrationOutcome {
  if (!isRecord(raw)) return { data: defaultSave(), status: 'current' };
  const version =
    typeof raw.version === 'number' && Number.isInteger(raw.version) ? raw.version : 0;
  if (version > SAVE_VERSION) return { data: sanitizeSave(raw), status: 'from-future' };
  let current: Record<string, unknown> = raw;
  for (let v = version; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (step) current = step(current);
  }
  return {
    data: sanitizeSave(current),
    status: version === SAVE_VERSION ? 'current' : 'migrated',
  };
}
