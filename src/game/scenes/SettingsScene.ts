import Phaser from 'phaser';
import { VIEW_W } from '../config/balance';
import { KEY_ACTIONS, KEY_ACTION_LABELS, keyLabel } from '../config/keys';
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN } from '../save/saveData';
import { audio, save } from '../services';
import { clamp } from '../utils/math';
import { addBackdrop, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

interface SettingsArgs {
  from: string;
}

export class SettingsScene extends Phaser.Scene {
  private from = 'Title';
  private menu!: Menu;
  private rebinding: (typeof KEY_ACTIONS)[number] | null = null;
  private hint!: Phaser.GameObjects.Text;
  private rebindHandler = (e: KeyboardEvent) => this.onRebindKey(e);

  constructor() {
    super('Settings');
  }

  init(args: SettingsArgs): void {
    this.from = args?.from ?? 'Title';
  }

  create(): void {
    addBackdrop(this);
    makeText(this, VIEW_W / 2, 24, 'Paramètres', 24, 'accent', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });
    this.hint = makeText(
      this,
      VIEW_W / 2,
      46,
      'Flèches/W-S : naviguer · Flèches/A-D : ajuster · Entrée : valider',
      11,
      'dim',
      {
        origin: [0.5, 0.5],
        fixedSize: true,
      },
    );

    const s = save.data.settings;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const step = (value: number, delta: number, min: number, max: number) =>
      clamp(value + delta, min, max);

    const items = [
      {
        label: () => `Musique : ${s.musicOn ? 'Activée' : 'Désactivée'}`,
        toggle: () => this.set((d) => (d.settings.musicOn = !d.settings.musicOn)),
      },
      { label: () => `Volume musique : ${pct(s.musicVolume)}`, left: -0.1, right: 0.1 },
      {
        label: () => `Effets sonores : ${s.sfxOn ? 'Activés' : 'Désactivés'}`,
        toggle: () => this.set((d) => (d.settings.sfxOn = !d.settings.sfxOn)),
      },
      { label: () => `Volume effets : ${pct(s.sfxVolume)}`, left: -0.1, right: 0.1, sfxKey: true },
      {
        label: () => `Volume général : ${pct(s.masterVolume)}`,
        left: -0.1,
        right: 0.1,
        masterKey: true,
      },
      {
        label: () => `Mode daltonien : ${s.colorblind ? 'Activé' : 'Désactivé'}`,
        toggle: () => this.set((d) => (d.settings.colorblind = !d.settings.colorblind)),
      },
      {
        label: () => `Contraste renforcé : ${s.highContrast ? 'Activé' : 'Désactivé'}`,
        toggle: () => this.set((d) => (d.settings.highContrast = !d.settings.highContrast)),
      },
      {
        label: () => `Réduire les effets : ${s.reduceEffects ? 'Activé' : 'Désactivé'}`,
        toggle: () => this.set((d) => (d.settings.reduceEffects = !d.settings.reduceEffects)),
      },
      {
        label: () => `Réduire les secousses : ${s.reduceShake ? 'Activé' : 'Désactivé'}`,
        toggle: () => this.set((d) => (d.settings.reduceShake = !d.settings.reduceShake)),
      },
      {
        label: () => `Supprimer le clignotement : ${s.noFlash ? 'Activé' : 'Désactivé'}`,
        toggle: () => this.set((d) => (d.settings.noFlash = !d.settings.noFlash)),
      },
      {
        label: () => `Mode performance : ${s.performanceMode ? 'Activé' : 'Désactivé'}`,
        toggle: () => this.set((d) => (d.settings.performanceMode = !d.settings.performanceMode)),
      },
      {
        label: () => `Taille du texte : ${Math.round(s.textScale * 100)}%`,
        left: -0.1,
        right: 0.1,
        textScale: true,
      },
      ...KEY_ACTIONS.map((action) => ({
        label: () =>
          this.rebinding === action
            ? `${KEY_ACTION_LABELS[action]} : appuie sur une touche… (Échap pour annuler)`
            : `${KEY_ACTION_LABELS[action]} : ${keyLabel(s.keys[action])}`,
        toggle: () => this.startRebind(action),
      })),
      {
        label: () => 'Réinitialiser les données (confirmation requise)',
        toggle: () => this.confirmReset(),
      },
      { label: () => 'Retour', toggle: () => this.scene.start(this.from) },
    ];

    this.menu = new Menu(
      this,
      items.map((item) => ({
        label: item.label,
        onSelect: () => {
          if ('toggle' in item && item.toggle) item.toggle();
        },
        onLeft: 'left' in item ? () => this.adjust(item as (typeof items)[number], -1) : undefined,
        onRight: 'right' in item ? () => this.adjust(item as (typeof items)[number], 1) : undefined,
      })),
      {
        x: VIEW_W / 2,
        y: 84,
        spacing: 26,
        size: 14,
        wrap: VIEW_W - 80,
        onBack: () => this.scene.start(this.from),
      },
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off('keydown', this.rebindHandler),
    );
    void step; // utilisé via adjust()
  }

  private adjust(
    item: {
      left?: number;
      right?: number;
      sfxKey?: boolean;
      masterKey?: boolean;
      textScale?: boolean;
    },
    dir: -1 | 1,
  ): void {
    const delta = (dir > 0 ? item.right : item.left) ?? 0;
    this.set((d) => {
      if (item.textScale) {
        d.settings.textScale = clamp(d.settings.textScale + delta, TEXT_SCALE_MIN, TEXT_SCALE_MAX);
      } else if (item.masterKey) {
        d.settings.masterVolume = clamp(d.settings.masterVolume + delta, 0, 1);
      } else if (item.sfxKey) {
        d.settings.sfxVolume = clamp(d.settings.sfxVolume + delta, 0, 1);
      } else {
        d.settings.musicVolume = clamp(d.settings.musicVolume + delta, 0, 1);
      }
    });
  }

  private set(mutate: (d: typeof save.data) => void): void {
    save.update(mutate);
    audio.applySettings();
    this.menu.refresh();
    this.scene.restart({ from: this.from });
  }

  private startRebind(action: (typeof KEY_ACTIONS)[number]): void {
    this.rebinding = action;
    this.menu.setLocked(true);
    this.hint.setText('Appuie sur une nouvelle touche pour cette action (Échap pour annuler).');
    this.input.keyboard?.on('keydown', this.rebindHandler);
  }

  private onRebindKey(e: KeyboardEvent): void {
    if (!this.rebinding) return;
    const action = this.rebinding;
    this.input.keyboard?.off('keydown', this.rebindHandler);
    this.rebinding = null;
    this.menu.setLocked(false);
    this.hint.setText('Flèches/W-S : naviguer · Flèches/A-D : ajuster · Entrée : valider');
    if (e.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) return;
    this.set((d) => {
      for (const other of KEY_ACTIONS)
        if (d.settings.keys[other] === e.keyCode) d.settings.keys[other] = d.settings.keys[action];
      d.settings.keys[action] = e.keyCode;
    });
  }

  private confirmReset(): void {
    // Deuxième pression pour confirmer : le libellé change temporairement.
    if (this.confirming) {
      save.reset();
      audio.applySettings();
      this.scene.restart({ from: this.from });
      return;
    }
    this.confirming = true;
    this.hint.setText(
      'Sélectionne de nouveau « Réinitialiser » pour confirmer — action irréversible.',
    );
    this.time.delayedCall(3000, () => {
      this.confirming = false;
    });
  }

  private confirming = false;
}
