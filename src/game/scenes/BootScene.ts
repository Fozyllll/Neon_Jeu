import Phaser from 'phaser';
import { getPalette } from '../config/palette';
import { createTextures } from '../effects/textures';
import { save } from '../services';

/** Génère toutes les textures procédurales une seule fois avant le reste du jeu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createTextures(this, getPalette(save.data.settings.colorblind));
    this.scene.start('Title');
    const boot = document.getElementById('boot-text');
    boot?.classList.add('hidden');
  }
}
