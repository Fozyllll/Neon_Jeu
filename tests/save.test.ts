import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS } from '../src/game/config/keys';
import { defaultSave, migrateSave, sanitizeSave, SAVE_VERSION } from '../src/game/save/saveData';
import { SAVE_KEY, SaveManager, type StorageLike } from '../src/game/save/saveManager';

class MemoryStorage implements StorageLike {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe('validation des données de sauvegarde', () => {
  it('retourne les valeurs par défaut pour des données invalides', () => {
    for (const junk of [null, undefined, 42, 'texte', [], true]) {
      expect(sanitizeSave(junk)).toEqual(defaultSave());
    }
  });

  it('borne et corrige les champs incohérents', () => {
    const data = sanitizeSave({
      credits: -50,
      unlockedSector: 99,
      upgrades: { battery: 42, hull: 'abc', inconnu: 3 },
      bestScores: { '1': 1200, '9': 5, '2': -3, '3': 'x' },
      settings: { masterVolume: 7, textScale: 0.1, musicOn: 'oui' },
    });
    expect(data.credits).toBe(0);
    expect(data.unlockedSector).toBe(5);
    expect(data.upgrades.battery).toBe(5);
    expect(data.upgrades.hull).toBe(0);
    expect(data.bestScores).toEqual({ '1': 1200 });
    expect(data.settings.masterVolume).toBe(1);
    expect(data.settings.textScale).toBe(0.9);
    expect(data.settings.musicOn).toBe(true);
  });

  it('refuse deux actions liées à la même touche', () => {
    const data = sanitizeSave({ settings: { keys: { up: 70, down: 70 } } });
    expect(data.settings.keys.up).toBe(70);
    expect(data.settings.keys.down).toBe(DEFAULT_KEYS.down);
  });

  it('nettoie la dernière seed', () => {
    expect(sanitizeSave({ lastSeed: '<img src=x onerror=1>' }).lastSeed).not.toContain('<');
  });
});

describe('migration', () => {
  it('reconnaît une sauvegarde à jour', () => {
    expect(migrateSave(defaultSave()).status).toBe('current');
  });

  it('migre une sauvegarde sans version en conservant les champs valides', () => {
    const outcome = migrateSave({ credits: 120, upgrades: { battery: 2 } });
    expect(outcome.status).toBe('migrated');
    expect(outcome.data.credits).toBe(120);
    expect(outcome.data.upgrades.battery).toBe(2);
    expect(outcome.data.version).toBe(SAVE_VERSION);
  });

  it('lit prudemment une sauvegarde d’une version plus récente', () => {
    const outcome = migrateSave({ ...defaultSave(), version: SAVE_VERSION + 5, credits: 10 });
    expect(outcome.status).toBe('from-future');
    expect(outcome.data.credits).toBe(10);
  });
});

describe('SaveManager', () => {
  it('démarre sur une sauvegarde neuve', () => {
    const manager = new SaveManager(new MemoryStorage());
    expect(manager.loadStatus).toBe('fresh');
    expect(manager.data).toEqual(defaultSave());
  });

  it('enregistre puis recharge les données', () => {
    const storage = new MemoryStorage();
    const first = new SaveManager(storage);
    first.update((d) => {
      d.credits = 250;
      d.upgrades.engine = 2;
      d.settings.sfxOn = false;
    });
    const second = new SaveManager(storage);
    expect(second.loadStatus).toBe('ok');
    expect(second.data.credits).toBe(250);
    expect(second.data.upgrades.engine).toBe(2);
    expect(second.data.settings.sfxOn).toBe(false);
  });

  it('gère une sauvegarde corrompue : valeurs sûres et copie de secours', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{ceci n’est pas du json');
    const manager = new SaveManager(storage);
    expect(manager.loadStatus).toBe('corrupt');
    expect(manager.data).toEqual(defaultSave());
    expect(storage.getItem(`${SAVE_KEY}:corrupt-backup`)).toContain('ceci n’est pas du json');
    expect(() => JSON.parse(storage.getItem(SAVE_KEY) ?? '')).not.toThrow();
  });

  it('fonctionne sans stockage disponible', () => {
    const manager = new SaveManager(null);
    expect(manager.loadStatus).toBe('unavailable');
    manager.update((d) => {
      d.credits = 5;
    });
    expect(manager.data.credits).toBe(5);
    expect(manager.isPersistent).toBe(false);
  });

  it('survit à une erreur d’écriture (quota dépassé)', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(() =>
      manager.update((d) => {
        d.credits = 9;
      }),
    ).not.toThrow();
    expect(manager.isPersistent).toBe(false);
    expect(manager.data.credits).toBe(9);
  });

  it('réinitialise toutes les données', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    manager.update((d) => {
      d.credits = 500;
    });
    manager.reset();
    expect(manager.data).toEqual(defaultSave());
    expect(new SaveManager(storage).data.credits).toBe(0);
  });

  it('notifie les abonnés', () => {
    const manager = new SaveManager(new MemoryStorage());
    let calls = 0;
    const off = manager.subscribe(() => calls++);
    manager.update((d) => {
      d.credits = 1;
    });
    off();
    manager.update((d) => {
      d.credits = 2;
    });
    expect(calls).toBe(1);
  });
});
