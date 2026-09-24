import Phaser from 'phaser';
import { SECTOR_COUNT, VIEW_W } from '../config/balance';
import { save } from '../services';
import { addBackdrop, drawPanel, makeText } from '../ui/theme';
import { Menu } from '../ui/Menu';

/**
 * Panneau développeur local : réservé au propriétaire du navigateur qui l'ouvre.
 * Il n'y a pas de comptes ni de serveur dans ce jeu (voir README) : ce panneau ne modifie
 * QUE la sauvegarde locale de CE navigateur, jamais celle d'un autre joueur.
 */
export class DevPanelScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private menu!: Menu;

  constructor() {
    super('DevPanel');
  }

  create(): void {
    addBackdrop(this);
    makeText(this, VIEW_W / 2, 24, 'Panneau développeur (local uniquement)', 18, 'warn', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });
    makeText(
      this,
      VIEW_W / 2,
      48,
      'Ces actions ne changent que la sauvegarde de ce navigateur.',
      11,
      'dim',
      { origin: [0.5, 0.5], fixedSize: true },
    );
    drawPanel(this, VIEW_W / 2 - 220, 64, 440, 30, 0xff9a3c, 0.5);
    this.status = makeText(this, VIEW_W / 2, 79, '', 12, 'good', {
      origin: [0.5, 0.5],
      fixedSize: true,
    });
    this.refreshStatus();

    this.menu = new Menu(
      this,
      [
        { label: () => 'Ajouter 100 crédits', onSelect: () => this.grantCredits(100) },
        { label: () => 'Ajouter 1000 crédits', onSelect: () => this.grantCredits(1000) },
        { label: () => 'Débloquer tous les secteurs', onSelect: () => this.unlockAll() },
        { label: () => 'Maximiser toutes les améliorations', onSelect: () => this.maxUpgrades() },
        { label: () => 'Réinitialiser toute la progression', onSelect: () => this.resetAll() },
        { label: () => 'Retour au menu', onSelect: () => this.scene.start('Title') },
      ],
      { x: VIEW_W / 2, y: 130, spacing: 34, size: 15, onBack: () => this.scene.start('Title') },
    );
  }

  private refreshStatus(): void {
    this.status.setText(
      `Crédits : ${save.data.credits}   ·   Secteurs débloqués : ${save.data.unlockedSector}/${SECTOR_COUNT}`,
    );
  }

  private grantCredits(amount: number): void {
    save.update((d) => {
      d.credits += amount;
    });
    this.refreshStatus();
  }

  private unlockAll(): void {
    save.update((d) => {
      d.unlockedSector = SECTOR_COUNT;
    });
    this.refreshStatus();
  }

  private maxUpgrades(): void {
    save.update((d) => {
      for (const id of Object.keys(d.upgrades) as Array<keyof typeof d.upgrades>) {
        d.upgrades[id] = 5;
      }
    });
    this.refreshStatus();
  }

  private resetAll(): void {
    save.reset();
    this.refreshStatus();
    this.menu.refresh();
  }
}
