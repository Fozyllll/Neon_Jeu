import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { audio, save } from '../services';
import { addBackdrop, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    addBackdrop(this);
    makeText(this, VIEW_W / 2, 120, 'NEON SALVAGE', 44, 'accent', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });
    makeText(this, VIEW_W / 2, 160, 'Récupère. Survis. Reviens.', 15, 'dim', {
      origin: [0.5, 0.5],
      fixedSize: true,
    });

    if (!save.isPersistent) {
      makeText(
        this,
        VIEW_W / 2,
        190,
        'Sauvegarde locale indisponible : la progression ne sera pas conservée.',
        11,
        'warn',
        { origin: [0.5, 0.5], wrap: 500, align: 'center', fixedSize: true },
      );
    }

    const unlock = () => audio.unlock();
    this.input.once('pointerdown', unlock);
    this.input.keyboard?.once('keydown', unlock);

    // Accès local au panneau développeur : tape "ADMIN" au clavier sur cet écran.
    // Aucun bouton visible, aucun compte, aucun serveur : ça n'agit que sur CE navigateur.
    const codeword = 'ADMIN';
    let typed = '';
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      typed = (typed + e.key).slice(-codeword.length).toUpperCase();
      if (typed === codeword) this.scene.start('DevPanel');
    });

    new Menu(
      this,
      [
        { label: () => 'Nouvelle sortie', onSelect: () => this.scene.start('SectorSelect') },
        { label: () => 'Aide', onSelect: () => this.scene.start('Help', { from: 'Title' }) },
        {
          label: () => 'Paramètres',
          onSelect: () => this.scene.start('Settings', { from: 'Title' }),
        },
      ],
      { x: VIEW_W / 2, y: 260, spacing: 44, size: 22 },
    );

    makeText(
      this,
      VIEW_W / 2,
      VIEW_H - 24,
      'Meilleurs scores et améliorations conservés localement dans ce navigateur.',
      11,
      'dim',
      { origin: [0.5, 0.5], fixedSize: true },
    );
    makeText(this, 12, VIEW_H - 14, 'v0.1.0', 10, 'dim', { origin: [0, 0.5], fixedSize: true });
  }
}
