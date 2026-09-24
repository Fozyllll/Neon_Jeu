import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import type { SectorConfig } from '../config/sectors';
import { RESOURCES } from '../config/resources';
import { getPalette } from '../config/palette';
import type { RunModel } from '../state/RunModel';
import { formatTime } from '../utils/math';
import { makeText, uiColor } from './theme';
import { save } from '../services';

interface Bar {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

/** Barre d'état pendant la partie : coque, énergie, bouclier, soute, score, secteur, objectif, notifications. */
export class Hud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly hpBar: Bar;
  private readonly energyBar: Bar;
  private readonly shieldBar: Bar;
  private readonly cargoText: Phaser.GameObjects.Text;
  private readonly creditsText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly sectorText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly secondaryText: Phaser.GameObjects.Text;
  private readonly toolText: Phaser.GameObjects.Text;
  private readonly compass: Phaser.GameObjects.Container;
  private readonly compassArrow: Phaser.GameObjects.Image;
  private readonly compassText: Phaser.GameObjects.Text;
  private readonly notifyText: Phaser.GameObjects.Text;
  private readonly extractHint: Phaser.GameObjects.Text;
  private notifyTimer = 0;
  private notifyQueue: string[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sector: SectorConfig,
  ) {
    this.root = scene.add.container(0, 0).setDepth(50).setScrollFactor(0);

    const panel = scene.add.graphics();
    panel.fillStyle(0x05060f, 0.55);
    panel.fillRect(0, 0, VIEW_W, 66);
    this.root.add(panel);

    this.hpBar = this.makeBar(12, 10, 170, uiColor('bad'));
    this.energyBar = this.makeBar(12, 30, 170, uiColor('good'));
    this.shieldBar = this.makeBar(12, 50, 170, uiColor('accent'));

    this.cargoText = makeText(scene, 200, 12, '', 13, 'text');
    this.creditsText = makeText(scene, 200, 30, '', 13, 'warn');
    this.scoreText = makeText(scene, 200, 48, '', 13, 'text');
    this.root.add([this.cargoText, this.creditsText, this.scoreText]);

    this.sectorText = makeText(scene, VIEW_W - 12, 10, sector.name, 13, 'accent', {
      origin: [1, 0],
    });
    this.timeText = makeText(scene, VIEW_W - 12, 28, '', 13, 'text', { origin: [1, 0] });
    this.objectiveText = makeText(scene, VIEW_W - 12, 46, '', 12, 'dim', { origin: [1, 0] });
    this.secondaryText = makeText(scene, VIEW_W - 12, 60, '', 11, 'rare', { origin: [1, 0] });
    this.root.add([this.sectorText, this.timeText, this.objectiveText, this.secondaryText]);

    this.toolText = makeText(scene, 12, VIEW_H - 24, '', 12, 'dim');
    this.root.add(this.toolText);

    this.compass = scene.add.container(VIEW_W / 2, 84);
    this.compassArrow = scene.add.image(0, 0, 'arrow').setTint(0x4dff9a);
    this.compassText = makeText(scene, 0, 16, '', 11, 'good', { origin: [0.5, 0] });
    this.compass.add([this.compassArrow, this.compassText]);
    this.root.add(this.compass);

    this.notifyText = makeText(scene, VIEW_W / 2, 100, '', 15, 'warn', {
      origin: [0.5, 0],
      align: 'center',
      wrap: VIEW_W - 120,
    });
    this.root.add(this.notifyText);

    this.extractHint = makeText(scene, VIEW_W / 2, VIEW_H - 40, '', 14, 'good', {
      origin: [0.5, 0.5],
      align: 'center',
    });
    this.extractHint.setVisible(false);
    this.root.add(this.extractHint);
  }

  private makeBar(x: number, y: number, w: number, color: string): Bar {
    const bg = this.scene.add.rectangle(x, y, w, 14, 0x101430, 0.9).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x2a3568, 1);
    const fill = this.scene.add
      .rectangle(x + 1, y + 1, w - 2, 12, Phaser.Display.Color.HexStringToColor(color).color, 1)
      .setOrigin(0, 0);
    const label = makeText(this.scene, x + w / 2, y + 7, '', 10, 'text', {
      origin: [0.5, 0.5],
      fixedSize: true,
    });
    this.root.add([bg, fill, label]);
    return { bg, fill, label };
  }

  private setBar(bar: Bar, ratio: number, text: string): void {
    const width = (bar.bg.width - 2) * Phaser.Math.Clamp(ratio, 0, 1);
    bar.fill.width = Math.max(0, width);
    bar.label.setText(text);
  }

  update(run: RunModel, dirTx: number, dirTy: number, inBase: boolean, holdRatio: number): void {
    this.setBar(
      this.hpBar,
      run.hp / run.stats.maxHp,
      `COQUE ${Math.ceil(run.hp)}/${run.stats.maxHp}`,
    );
    const energyLabel = `ÉNERGIE ${Math.ceil(run.energy)}/${run.stats.maxEnergy}`;
    this.setBar(this.energyBar, run.energy / run.stats.maxEnergy, energyLabel);
    this.energyBar.label.setColor(
      run.energy / run.stats.maxEnergy <= 0.25 && Math.floor(run.time * 4) % 2 === 0
        ? uiColor('bad')
        : uiColor('text'),
    );
    if (run.stats.maxShield > 0) {
      this.shieldBar.bg.setVisible(true);
      this.shieldBar.fill.setVisible(true);
      this.shieldBar.label.setVisible(true);
      this.setBar(
        this.shieldBar,
        run.shield / run.stats.maxShield,
        `BOUCLIER ${Math.ceil(run.shield)}/${run.stats.maxShield}`,
      );
    } else {
      this.shieldBar.bg.setVisible(false);
      this.shieldBar.fill.setVisible(false);
      this.shieldBar.label.setVisible(false);
    }

    this.cargoText.setText(
      `Soute : ${run.cargoWeight}/${run.stats.capacity}  (${run.cargoValue} cr en cours)`,
    );
    this.creditsText.setText(`Multiplicateur : ×${run.streakMultiplier.toFixed(1)}`);
    this.scoreText.setText(`Score : ${run.score}`);
    this.timeText.setText(formatTime(run.time));
    this.objectiveText.setText(
      `Quota : ${Math.min(run.cargoValue, this.sector.quota)}/${this.sector.quota} cr`,
    );

    const sec = this.sector.secondary;
    const secLabel = sec.type === 'kills' ? 'Éliminations' : 'Rares récupérés';
    const secDone = run.secondaryProgress >= sec.target;
    this.secondaryText.setText(
      `Objectif secondaire : ${secLabel} ${run.secondaryProgress}/${sec.target}${secDone ? ' ✓' : ''}`,
    );
    this.secondaryText.setColor(secDone ? uiColor('good') : uiColor('rare'));

    this.toolText.setText(
      `Outil : ${run.stats.toolDamage} dég.   Capacité : ${run.stats.capacity}` +
        (run.stats.magnetRadius > 0 ? `   Aimant : ${Math.round(run.stats.magnetRadius)}px` : ''),
    );

    if (inBase) {
      this.compass.setVisible(false);
    } else {
      this.compass.setVisible(true);
      const angle = Math.atan2(dirTy, dirTx);
      this.compassArrow.setRotation(angle);
      this.compassText.setText('Base');
    }

    if (holdRatio > 0) {
      this.extractHint.setVisible(true);
      this.extractHint.setText(
        holdRatio >= 1
          ? 'Extraction !'
          : `Maintiens E pour extraire… ${Math.round(holdRatio * 100)}%`,
      );
    } else if (inBase) {
      this.extractHint.setVisible(true);
      this.extractHint.setText('À la base : maintiens E pour extraire');
    } else {
      this.extractHint.setVisible(false);
    }

    if (this.notifyTimer > 0) {
      this.notifyTimer -= this.scene.game.loop.delta / 1000;
      if (this.notifyTimer <= 0) {
        if (this.notifyQueue.length > 0) {
          this.notifyText.setText(this.notifyQueue.shift() as string);
          this.notifyTimer = 3;
        } else {
          this.notifyText.setText('');
        }
      }
    }
  }

  notify(text: string): void {
    if (this.notifyTimer > 0) {
      this.notifyQueue.push(text);
      return;
    }
    this.notifyText.setText(text);
    this.notifyTimer = 3;
  }

  destroy(): void {
    this.root.destroy();
  }
}

export function resourceGlyph(kind: keyof typeof RESOURCES): string {
  return RESOURCES[kind].shape;
}

export function paletteFromSave() {
  return getPalette(save.data.settings.colorblind);
}
