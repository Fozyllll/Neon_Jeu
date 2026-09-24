import { migrateSave, defaultSave, SAVE_VERSION } from './saveData';
import type { SaveData } from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadStatus = 'fresh' | 'ok' | 'migrated' | 'corrupt' | 'unavailable';

export const SAVE_KEY = 'neon-salvage:save';

export class SaveManager {
  private current: SaveData = defaultSave();
  private persistFailed = false;
  private listeners = new Set<(data: SaveData) => void>();
  loadStatus: LoadStatus = 'fresh';

  constructor(
    private readonly storage: StorageLike | null,
    private readonly key: string = SAVE_KEY,
  ) {
    this.load();
  }

  get data(): SaveData {
    return this.current;
  }

  get isPersistent(): boolean {
    return this.storage !== null && !this.persistFailed;
  }

  /** Charge la sauvegarde ; en cas de données illisibles, elles sont mises de côté et le jeu repart d'une base saine. */
  load(): SaveData {
    if (!this.storage) {
      this.loadStatus = 'unavailable';
      this.current = defaultSave();
      return this.current;
    }
    let text: string | null;
    try {
      text = this.storage.getItem(this.key);
    } catch {
      this.loadStatus = 'unavailable';
      this.current = defaultSave();
      return this.current;
    }
    if (text === null) {
      this.loadStatus = 'fresh';
      this.current = defaultSave();
      return this.current;
    }
    try {
      const outcome = migrateSave(JSON.parse(text) as unknown);
      this.current = outcome.data;
      this.loadStatus = outcome.status === 'migrated' ? 'migrated' : 'ok';
      if (outcome.status === 'migrated') this.persist();
    } catch {
      this.loadStatus = 'corrupt';
      this.backupCorrupt(text);
      this.current = defaultSave();
      this.persist();
    }
    return this.current;
  }

  /** Applique une modification puis sauvegarde. */
  update(mutate: (data: SaveData) => void): void {
    mutate(this.current);
    this.current.version = SAVE_VERSION;
    this.persist();
    for (const listener of this.listeners) listener(this.current);
  }

  /** Efface toute la progression et les paramètres. */
  reset(): void {
    this.current = defaultSave();
    this.persist();
    for (const listener of this.listeners) listener(this.current);
  }

  subscribe(listener: (data: SaveData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(this.current));
      this.persistFailed = false;
    } catch {
      this.persistFailed = true;
    }
  }

  private backupCorrupt(text: string): void {
    try {
      this.storage?.setItem(`${this.key}:corrupt-backup`, text.slice(0, 20000));
    } catch {
      // Sauvegarde de secours impossible : on ignore, la progression corrompue est de toute façon inutilisable.
    }
  }
}

/** localStorage si disponible (il peut être bloqué en navigation privée ou par des règles du navigateur). */
export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = '__neon_salvage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
