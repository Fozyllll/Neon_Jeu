import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { SECTORS } from '../config/sectors';
import { normalizeSeed, randomSeed } from '../utils/rng';
import { save } from '../services';
import { addBackdrop, drawPanel, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

export class SectorSelectScene extends Phaser.Scene {
  private index = 0;
  private seed = '';
  private seedText!: Phaser.GameObjects.Text;
  private infoTexts: Phaser.GameObjects.Text[] = [];
  private editingSeed = false;
  private seedKeyHandler = (e: KeyboardEvent) => this.onSeedKey(e);

  constructor() {
    super('SectorSelect');
  }

  create(): void {
    addBackdrop(this);
    this.seed = save.data.lastSeed || randomSeed();
    const unlocked = save.data.unlockedSector;
    this.index = Math.min(unlocked, SECTORS.length) - 1;

    makeText(this, VIEW_W / 2, 22, 'Choix du secteur', 22, 'accent', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });
    makeText(this, 12, VIEW_H - 14, `Crédits : ${save.data.credits}`, 12, 'warn', {
      origin: [0, 0.5],
      fixedSize: true,
    });

    drawPanel(this, 20, 46, VIEW_W - 40, 220, 0x38e8ff, 0.45);
    for (const t of this.infoTexts) t.destroy();
    this.infoTexts = [];

    this.seedText = makeText(this, VIEW_W / 2, VIEW_H - 96, '', 14, 'accent', {
      origin: [0.5, 0.5],
      fixedSize: true,
    });
    this.refreshInfo();

    const items = SECTORS.map((sector) => ({
      label: () => {
        const locked = sector.id > unlocked;
        const best = save.data.bestScores[String(sector.id)];
        return `${sector.name}${locked ? '  (verrouillé)' : best ? `  — meilleur score ${best}` : ''}`;
      },
      onSelect: () => {
        if (sector.id > unlocked) return;
        this.scene.start('Game', { sectorId: sector.id, seed: normalizeSeed(this.seed) });
      },
      enabled: () => sector.id <= unlocked,
    }));

    new Menu(this, items, {
      x: VIEW_W / 2,
      y: 66,
      spacing: 27,
      size: 15,
      onFocus: (i) => {
        this.index = i;
        this.refreshInfo();
      },
      onBack: () => this.scene.start('Title'),
    });

    makeText(
      this,
      VIEW_W / 2,
      VIEW_H - 130,
      'S : nouvelle seed aléatoire   ·   Clic sur la seed pour la saisir   ·   Échap : retour',
      11,
      'dim',
      { origin: [0.5, 0.5], fixedSize: true },
    );
    this.seedText
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startSeedEdit());
    this.input.keyboard?.on('keydown-S', () => {
      if (this.editingSeed) return;
      this.seed = randomSeed();
      this.refreshInfo();
    });

    new Menu(
      this,
      [{ label: () => 'Aide', onSelect: () => this.scene.start('Help', { from: 'SectorSelect' }) }],
      {
        x: VIEW_W / 2,
        y: VIEW_H - 22,
        size: 13,
      },
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off('keydown', this.seedKeyHandler),
    );
  }

  private refreshInfo(): void {
    for (const t of this.infoTexts) t.destroy();
    this.infoTexts = [];
    const sector = SECTORS[this.index] as (typeof SECTORS)[number];
    const lines = [
      sector.tagline,
      sector.description,
      `Quota : ${sector.quota} crédits   ·   Objectif secondaire : ${
        sector.secondary.type === 'kills'
          ? `${sector.secondary.target} éliminations`
          : `${sector.secondary.target} ressources rares`
      }`,
      `Carte ${sector.mapW}×${sector.mapH}   ·   Jusqu'à ${sector.maxEnemies} ennemis   ·   Multiplicateur de valeur ×${sector.valueMult}`,
    ];
    let y = 62;
    for (const line of lines) {
      const t = makeText(this, VIEW_W / 2, y, line, 12, 'text', {
        origin: [0.5, 0.5],
        wrap: VIEW_W - 90,
        align: 'center',
        fixedSize: true,
      });
      this.infoTexts.push(t);
      y += 30;
    }
    this.seedText.setText(`Seed : ${this.seed}`);
  }

  private startSeedEdit(): void {
    this.editingSeed = true;
    this.seedText.setText('Seed : |  (tape puis Entrée, Échap pour annuler)');
    this.input.keyboard?.on('keydown', this.seedKeyHandler);
  }

  private onSeedKey(e: KeyboardEvent): void {
    if (e.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER) {
      this.editingSeed = false;
      this.input.keyboard?.off('keydown', this.seedKeyHandler);
      this.refreshInfo();
      return;
    }
    if (e.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
      this.editingSeed = false;
      this.input.keyboard?.off('keydown', this.seedKeyHandler);
      this.refreshInfo();
      return;
    }
    if (e.keyCode === Phaser.Input.Keyboard.KeyCodes.BACKSPACE) {
      this.seed = this.seed.slice(0, -1);
    } else if (e.key.length === 1 && this.seed.length < 16) {
      this.seed = normalizeSeed(this.seed + e.key);
    }
    this.seedText.setText(`Seed : ${this.seed}|`);
  }
}
