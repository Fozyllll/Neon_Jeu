import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { audio } from '../services';
import { drawPanel, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x05060f, 0.6).setDepth(60);
    drawPanel(this, VIEW_W / 2 - 140, VIEW_H / 2 - 110, 280, 220, 0x38e8ff, 0.9).setDepth(61);
    makeText(this, VIEW_W / 2, VIEW_H / 2 - 82, 'Pause', 22, 'accent', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    }).setDepth(62);

    const resume = () => {
      this.scene.stop();
      this.scene.resume('Game');
    };

    const menu = new Menu(
      this,
      [
        { label: () => 'Reprendre', onSelect: resume },
        {
          label: () => 'Paramètres',
          onSelect: () => this.scene.start('Settings', { from: 'Game' }),
        },
        { label: () => 'Abandonner la sortie', onSelect: () => this.quit() },
      ],
      { x: VIEW_W / 2, y: VIEW_H / 2 - 30, spacing: 34, size: 16, onBack: resume },
    );
    void menu;
    audio.setAmbient(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isActive('Game')) audio.setAmbient(true);
    });
  }

  private quit(): void {
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Title');
  }
}
