import type Phaser from 'phaser';
import { TILE } from '../config/balance';
import type { GameMap, ResourceKind } from '../types';
import type { Palette } from '../config/palette';
import { save } from '../services';

const MM_SIZE = 148;

/** Mini-carte en haut à droite : murs explorés, base, joueur, ennemis proches, ressources rares scannées. */
export class Minimap {
  private readonly root: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly scaleX: number;
  private readonly scaleY: number;

  constructor(
    scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly palette: Palette,
    x: number,
    y: number,
  ) {
    this.root = scene.add.container(x, y).setDepth(49).setScrollFactor(0);
    const bg = scene.add.rectangle(0, 0, MM_SIZE, MM_SIZE, 0x05060f, 0.65).setOrigin(0, 0);
    bg.setStrokeStyle(1, palette.edge, 0.6);
    this.gfx = scene.add.graphics();
    this.root.add([bg, this.gfx]);
    this.scaleX = MM_SIZE / map.width;
    this.scaleY = MM_SIZE / map.height;
  }

  update(
    px: number,
    py: number,
    enemies: Iterable<{ x: number; y: number; alive: boolean; state: string }>,
    scannerRadius: number,
    resources: Iterable<{ kind: ResourceKind; px: number; py: number; collected: boolean }>,
  ) {
    const g = this.gfx;
    g.clear();
    const sx = this.scaleX;
    const sy = this.scaleY;

    g.fillStyle(this.palette.base, 0.5);
    g.fillRect(
      this.map.base.x * sx,
      this.map.base.y * sy,
      this.map.base.w * sx,
      this.map.base.h * sy,
    );

    if (scannerRadius > 0) {
      for (const r of resources) {
        if (r.collected) continue;
        if (r.kind !== 'component' && r.kind !== 'core') continue;
        const d = Math.hypot(r.px - px, r.py - py);
        if (d > scannerRadius) continue;
        g.fillStyle(r.kind === 'core' ? this.palette.core : this.palette.component, 1);
        g.fillCircle((r.px / TILE) * sx, (r.py / TILE) * sy, 2.5);
      }
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      const alert = e.state !== 'idle';
      g.fillStyle(alert ? this.palette.hunter : 0x5a6398, alert ? 1 : 0.6);
      g.fillCircle((e.x / TILE) * sx, (e.y / TILE) * sy, alert ? 2.6 : 2);
    }

    g.fillStyle(this.palette.player, 1);
    g.fillCircle((px / TILE) * sx, (py / TILE) * sy, 3.4);
    if (save.data.settings.highContrast) {
      g.lineStyle(1, 0xffffff, 0.9);
      g.strokeCircle((px / TILE) * sx, (py / TILE) * sy, 4.4);
    }
  }

  destroy(): void {
    this.root.destroy();
  }
}
