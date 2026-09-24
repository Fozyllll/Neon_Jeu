import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { RESOURCES } from '../config/resources';
import { ENEMIES } from '../config/enemies';
import { KEY_ACTION_LABELS, keyLabel } from '../config/keys';
import { save } from '../services';
import { addBackdrop, drawPanel, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

interface HelpArgs {
  from: string;
}

export class HelpScene extends Phaser.Scene {
  private from = 'Title';

  constructor() {
    super('Help');
  }

  init(args: HelpArgs): void {
    this.from = args?.from ?? 'Title';
  }

  create(): void {
    addBackdrop(this);
    makeText(this, VIEW_W / 2, 26, 'Aide', 26, 'accent', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });

    drawPanel(this, 24, 50, VIEW_W / 2 - 34, VIEW_H - 100, 0x38e8ff, 0.5);
    let y = 64;
    makeText(this, 40, y, 'Boucle de jeu', 14, 'text', { bold: true, fixedSize: true });
    y += 20;
    const loop = [
      'Pars de la base et explore la zone.',
      'Récupère des ressources (E ou clic).',
      'Élimine ou évite les drones ennemis.',
      'Surveille ton énergie : elle baisse en continu.',
      'Reviens à la base et maintiens E pour extraire.',
      'Atteins le quota pour remporter le secteur.',
    ];
    for (const line of loop) {
      makeText(this, 40, y, `• ${line}`, 12, 'dim', { wrap: VIEW_W / 2 - 70, fixedSize: true });
      y += 30;
    }

    y += 6;
    makeText(this, 40, y, 'Contrôles', 14, 'text', { bold: true, fixedSize: true });
    y += 20;
    const keys = save.data.settings.keys;
    for (const [action, label] of Object.entries(KEY_ACTION_LABELS)) {
      makeText(
        this,
        40,
        y,
        `${label} : ${keyLabel(keys[action as keyof typeof keys])}`,
        11,
        'dim',
        { fixedSize: true },
      );
      y += 16;
    }
    makeText(this, 40, y, 'Souris : viser et tirer (clic gauche)', 11, 'dim', { fixedSize: true });

    drawPanel(this, VIEW_W / 2 + 10, 50, VIEW_W / 2 - 34, VIEW_H - 100, 0xff9a3c, 0.5);
    let ry = 64;
    makeText(this, VIEW_W / 2 + 26, ry, 'Ressources', 14, 'text', { bold: true, fixedSize: true });
    ry += 20;
    for (const def of Object.values(RESOURCES)) {
      makeText(
        this,
        VIEW_W / 2 + 26,
        ry,
        `${def.label} (${def.shape}) — ${def.description}`,
        11,
        'dim',
        {
          wrap: VIEW_W / 2 - 70,
          fixedSize: true,
        },
      );
      ry += 28;
    }
    ry += 4;
    makeText(this, VIEW_W / 2 + 26, ry, 'Ennemis', 14, 'text', { bold: true, fixedSize: true });
    ry += 20;
    for (const def of Object.values(ENEMIES)) {
      makeText(this, VIEW_W / 2 + 26, ry, `${def.label} — ${def.description}`, 11, 'dim', {
        wrap: VIEW_W / 2 - 70,
        fixedSize: true,
      });
      ry += 30;
    }

    new Menu(this, [{ label: () => 'Retour', onSelect: () => this.scene.start(this.from) }], {
      x: VIEW_W / 2,
      y: VIEW_H - 22,
      size: 16,
      onBack: () => this.scene.start(this.from),
    });
  }
}
