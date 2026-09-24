import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { UPGRADES } from '../config/upgrades';
import { describeEffect, tryPurchase, upgradeCost } from '../progression/upgrades';
import { audio, save } from '../services';
import { addBackdrop, drawPanel, makeText, uiColor } from '../ui/theme';
import { Menu } from '../ui/Menu';

interface UpgradeArgs {
  from: string;
  sectorId?: number;
}

export class UpgradeScene extends Phaser.Scene {
  private from = 'Title';
  private sectorId?: number;
  private creditsText!: Phaser.GameObjects.Text;
  private menu!: Menu;
  private descTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Upgrade');
  }

  init(args: UpgradeArgs): void {
    this.from = args?.from ?? 'Title';
    this.sectorId = args?.sectorId;
  }

  create(): void {
    addBackdrop(this);
    makeText(this, VIEW_W / 2, 22, 'Atelier du drone N-07', 22, 'accent', {
      origin: [0.5, 0.5],
      bold: true,
      fixedSize: true,
    });
    this.creditsText = makeText(this, VIEW_W / 2, 46, '', 14, 'warn', {
      origin: [0.5, 0.5],
      fixedSize: true,
    });

    drawPanel(this, 20, 66, VIEW_W - 40, 120, 0xff9a3c, 0.45);
    this.descTexts = [];

    const items = UPGRADES.map((def) => ({
      label: () => {
        const level = save.data.upgrades[def.id] ?? 0;
        const maxed = level >= def.maxLevel;
        const cost = maxed ? null : upgradeCost(def.id, level);
        return `${def.label}  Nv.${level}/${def.maxLevel}${maxed ? '  (max)' : `  — ${cost} cr`}`;
      },
      onSelect: () => this.buy(def.id),
      enabled: () =>
        (save.data.upgrades[def.id] ?? 0) < def.maxLevel &&
        save.data.credits >= upgradeCost(def.id, save.data.upgrades[def.id] ?? 0),
    }));

    this.menu = new Menu(this, items, {
      x: VIEW_W / 2,
      y: 210,
      spacing: 24,
      size: 13,
      wrap: VIEW_W - 60,
      onFocus: (i) => this.showDetail(i),
      onBack: () => this.leave(),
    });

    new Menu(this, [{ label: () => 'Retour', onSelect: () => this.leave() }], {
      x: VIEW_W / 2,
      y: VIEW_H - 22,
      size: 14,
    });

    this.refresh();
  }

  private showDetail(i: number): void {
    for (const t of this.descTexts) t.destroy();
    this.descTexts = [];
    const def = UPGRADES[i];
    if (!def) return;
    const level = save.data.upgrades[def.id] ?? 0;
    const t1 = makeText(this, VIEW_W / 2, 84, def.description, 12, 'text', {
      origin: [0.5, 0.5],
      wrap: VIEW_W - 70,
      align: 'center',
      fixedSize: true,
    });
    const t2 = makeText(
      this,
      VIEW_W / 2,
      112,
      `Actuel : ${describeEffect(def.id, level)}`,
      12,
      'good',
      { origin: [0.5, 0.5], fixedSize: true },
    );
    const t3 = makeText(
      this,
      VIEW_W / 2,
      132,
      level < def.maxLevel
        ? `Niveau suivant : ${describeEffect(def.id, level + 1)}`
        : 'Niveau maximum atteint',
      12,
      'accent',
      { origin: [0.5, 0.5], fixedSize: true },
    );
    this.descTexts.push(t1, t2, t3);
  }

  private buy(id: (typeof UPGRADES)[number]['id']): void {
    const result = tryPurchase(save.data.credits, save.data.upgrades, id);
    if (!result.ok) {
      audio.play('error');
      return;
    }
    save.update((d) => {
      d.credits -= result.cost;
      d.upgrades[id] = result.newLevel;
    });
    audio.play('upgrade');
    this.refresh();
    this.menu.refresh();
    this.showDetail(this.menu.index);
  }

  private refresh(): void {
    this.creditsText.setText(`Crédits disponibles : ${save.data.credits}`);
    this.creditsText.setColor(uiColor('warn'));
  }

  private leave(): void {
    if (this.sectorId) this.scene.start('SectorSelect');
    else this.scene.start(this.from);
  }
}
