import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { getSector } from '../config/sectors';
import { RESOURCES } from '../config/resources';
import type { RunResult } from '../types';
import { formatTime } from '../utils/math';
import { audio, save } from '../services';
import { addBackdrop, drawPanel, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

interface ResultArgs {
  result: RunResult;
}

/** Écran de fin de partie, utilisé pour la victoire, la simple extraction et la défaite. */
export class ResultScene extends Phaser.Scene {
  private result!: RunResult;

  constructor(key: string) {
    super(key);
  }

  init(args: ResultArgs): void {
    this.result = args.result;
  }

  create(): void {
    addBackdrop(this);
    const r = this.result;
    const sector = getSector(r.sectorId);
    const won = r.outcome === 'victory';
    const title = won
      ? 'Extraction réussie !'
      : r.outcome === 'extraction'
        ? 'Retour à la base'
        : 'Drone hors service';
    const color = won ? 'good' : r.outcome === 'extraction' ? 'accent' : 'bad';

    makeText(this, VIEW_W / 2, 46, title, 28, color, {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });
    makeText(this, VIEW_W / 2, 76, sector.name, 14, 'dim', { origin: [0.5, 0.5], fixedSize: true });

    drawPanel(
      this,
      VIEW_W / 2 - 220,
      100,
      440,
      210,
      won ? 0x4dff9a : r.outcome === 'defeat' ? 0xff4d5e : 0x38e8ff,
      0.5,
    );
    const lines = [
      `Score final : ${r.score}`,
      `Crédits gagnés : ${r.creditsGained}${r.outcome === 'defeat' ? ' (cargaison partiellement récupérée)' : ''}`,
      `Valeur de cargaison : ${r.cargoValue}`,
      `Éliminations : ${r.kills}`,
      `Durée : ${formatTime(r.timeSeconds)}`,
      `Ressources : ${
        Object.entries(r.collected)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${RESOURCES[k as keyof typeof RESOURCES].label} ×${n}`)
          .join('  ·  ') || 'aucune'
      }`,
    ];
    let y = 122;
    for (const line of lines) {
      makeText(this, VIEW_W / 2, y, line, 13, 'text', {
        origin: [0.5, 0.5],
        wrap: 410,
        align: 'center',
        fixedSize: true,
      });
      y += 30;
    }

    const best = save.data.bestScores[String(sector.id)];
    if (best === r.score) {
      makeText(this, VIEW_W / 2, y + 4, 'Nouveau meilleur score !', 13, 'warn', {
        origin: [0.5, 0.5],
        bold: true,
        fixedSize: true,
      });
    }

    new Menu(
      this,
      [
        {
          label: () => 'Rejouer ce secteur',
          onSelect: () => this.scene.start('Game', { sectorId: sector.id, seed: r.seed }),
        },
        {
          label: () => 'Atelier d’amélioration',
          onSelect: () =>
            this.scene.start('Upgrade', { from: 'SectorSelect', sectorId: sector.id }),
        },
        { label: () => 'Choisir un secteur', onSelect: () => this.scene.start('SectorSelect') },
        { label: () => 'Menu principal', onSelect: () => this.scene.start('Title') },
      ],
      {
        x: VIEW_W / 2,
        y: VIEW_H - 110,
        spacing: 32,
        size: 15,
        onBack: () => this.scene.start('SectorSelect'),
      },
    );

    audio.play(won ? 'win' : r.outcome === 'defeat' ? 'lose' : 'click');
  }
}

export class GameOverScene extends ResultScene {
  constructor() {
    super('GameOver');
  }
}

export class VictoryScene extends ResultScene {
  constructor() {
    super('Victory');
  }
}
