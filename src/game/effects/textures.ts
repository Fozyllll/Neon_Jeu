import type Phaser from 'phaser';
import { TILE, VIEW_H, VIEW_W } from '../config/balance';
import type { Palette } from '../config/palette';
import { Rng } from '../utils/rng';

/** Index des tuiles dans la texture « tiles ». Les murs suivent : WALL_BASE + masque (N=1, E=2, S=4, O=8). */
export const TILE_INDEX = {
  floor: 0,
  floorAlt: 1,
  basePad: 2,
  rareFloor: 3,
  wallBase: 4,
} as const;
export const TILE_COUNT = 20;

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function generate(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const gr = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gr << 8) | bl;
}

function polygon(
  g: Phaser.GameObjects.Graphics,
  pts: number[],
  fill: number,
  fillAlpha: number,
  stroke: number,
  width = 2,
) {
  const points = [];
  for (let i = 0; i < pts.length; i += 2)
    points.push({ x: pts[i] as number, y: pts[i + 1] as number });
  g.fillStyle(fill, fillAlpha);
  g.fillPoints(points, true);
  g.lineStyle(width, stroke, 1);
  g.strokePoints(points, true);
}

function drawTiles(g: Phaser.GameObjects.Graphics, p: Palette): void {
  const T = TILE;
  const floorBase = p.floor;
  for (let i = 0; i < TILE_COUNT; i++) {
    const ox = i * T;
    if (i === TILE_INDEX.floor || i === TILE_INDEX.floorAlt) {
      g.fillStyle(i === 0 ? floorBase : p.floorAlt, 1);
      g.fillRect(ox, 0, T, T);
      g.lineStyle(1, p.grid, 0.35);
      g.strokeRect(ox + 0.5, 0.5, T - 1, T - 1);
      if (i === 1) {
        g.lineStyle(1, p.grid, 0.4);
        g.lineBetween(ox + 6, T - 6, ox + T - 6, 6);
      }
    } else if (i === TILE_INDEX.basePad) {
      g.fillStyle(mixColor(floorBase, p.base, 0.16), 1);
      g.fillRect(ox, 0, T, T);
      g.lineStyle(1, p.base, 0.28);
      g.strokeRect(ox + 0.5, 0.5, T - 1, T - 1);
      g.lineStyle(1, p.base, 0.18);
      for (let k = -T; k < T; k += 8) g.lineBetween(ox + k, T, ox + k + T, 0);
    } else if (i === TILE_INDEX.rareFloor) {
      g.fillStyle(mixColor(floorBase, p.rare, 0.2), 1);
      g.fillRect(ox, 0, T, T);
      g.lineStyle(1, p.rare, 0.3);
      g.strokeRect(ox + 0.5, 0.5, T - 1, T - 1);
      g.fillStyle(p.rare, 0.35);
      g.fillCircle(ox + T / 2, T / 2, 1.5);
    } else {
      const mask = i - TILE_INDEX.wallBase;
      g.fillStyle(p.wall, 1);
      g.fillRect(ox, 0, T, T);
      g.lineStyle(1, 0xffffff, 0.04);
      g.strokeRect(ox + 0.5, 0.5, T - 1, T - 1);
      const edges: Array<[number, () => void, () => void]> = [
        [1, () => g.fillRect(ox, 0, T, 5), () => g.fillRect(ox, 0, T, 2)],
        [2, () => g.fillRect(ox + T - 5, 0, 5, T), () => g.fillRect(ox + T - 2, 0, 2, T)],
        [4, () => g.fillRect(ox, T - 5, T, 5), () => g.fillRect(ox, T - 2, T, 2)],
        [8, () => g.fillRect(ox, 0, 5, T), () => g.fillRect(ox, 0, 2, T)],
      ];
      for (const [bit, glow, line] of edges) {
        if ((mask & bit) === 0) continue;
        g.fillStyle(p.edge, 0.16);
        glow();
        g.fillStyle(p.edge, 0.95);
        line();
      }
    }
  }
}

/** Génère toutes les textures du jeu par code : aucun fichier image, aucune licence externe. */
export function createTextures(scene: Phaser.Scene, p: Palette): void {
  generate(scene, 'tiles', TILE * TILE_COUNT, TILE, (g) => drawTiles(g, p));
  const tilesTexture = scene.textures.get('tiles');
  for (let i = 0; i < TILE_COUNT; i++) {
    tilesTexture.add(i, 0, i * TILE, 0, TILE, TILE);
  }

  generate(scene, 'player', 32, 32, (g) => {
    polygon(g, [29, 16, 22, 4.5, 10, 4.5, 3, 16, 10, 27.5, 22, 27.5], 0x0b1a3a, 1, p.player, 2);
    g.fillStyle(p.player, 0.25);
    g.fillCircle(15, 16, 8);
    g.fillStyle(p.playerCore, 1);
    g.fillCircle(15, 16, 3.5);
    g.fillStyle(p.core, 1);
    g.fillRect(25, 14, 5, 4);
  });

  generate(scene, 'enemy-scout', 28, 28, (g) => {
    polygon(g, [26, 14, 4, 3, 8, 14, 4, 25], 0x2a0a2e, 1, p.scout, 2);
    g.fillStyle(p.scout, 1);
    g.fillCircle(14, 14, 2.5);
  });

  generate(scene, 'enemy-sentinel', 44, 44, (g) => {
    polygon(
      g,
      [14, 3, 30, 3, 41, 14, 41, 30, 30, 41, 14, 41, 3, 30, 3, 14],
      0x2b1607,
      1,
      p.sentinel,
      3,
    );
    g.lineStyle(2, p.sentinel, 0.6);
    g.lineBetween(12, 22, 32, 22);
    g.lineBetween(22, 12, 22, 32);
    g.fillStyle(p.sentinel, 1);
    g.fillCircle(22, 22, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(22, 22, 2);
    g.fillStyle(p.sentinel, 1);
    g.fillRect(36, 19, 8, 6);
  });

  generate(scene, 'enemy-hunter', 36, 36, (g) => {
    polygon(g, [18, 2, 34, 18, 18, 34, 2, 18], 0x300a10, 1, p.hunter, 2);
    polygon(g, [26, 18, 12, 10, 12, 26], p.hunter, 0.35, p.hunter, 1);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(19, 18, 2);
    g.fillStyle(p.hunter, 1);
    g.fillTriangle(34, 18, 28, 14, 28, 22);
  });

  generate(scene, 'res-scrap', 20, 20, (g) => {
    g.fillStyle(p.scrap, 0.35);
    g.fillRect(4, 4, 12, 12);
    g.lineStyle(2, p.scrap, 1);
    g.strokeRect(4, 4, 12, 12);
    g.lineStyle(1, p.scrap, 0.9);
    g.lineBetween(4, 4, 16, 16);
  });
  generate(scene, 'res-cell', 20, 20, (g) => {
    g.fillStyle(p.cell, 0.3);
    g.fillCircle(10, 10, 8);
    g.lineStyle(2, p.cell, 1);
    g.strokeCircle(10, 10, 8);
    g.lineStyle(2, p.cell, 1);
    g.lineBetween(10, 5, 10, 15);
    g.lineBetween(5, 10, 15, 10);
  });
  generate(scene, 'res-crystal', 20, 20, (g) => {
    polygon(g, [10, 1, 17, 10, 10, 19, 3, 10], p.crystal, 0.4, p.crystal, 2);
    g.lineStyle(1, 0xffffff, 0.8);
    g.lineBetween(10, 3, 10, 17);
  });
  generate(scene, 'res-component', 20, 20, (g) => {
    polygon(g, [10, 2, 18, 17, 2, 17], p.component, 0.4, p.component, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 12.5, 1.8);
  });
  generate(scene, 'res-core', 24, 24, (g) => {
    const pts: number[] = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? 11 : 5.5;
      const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
      pts.push(12 + Math.cos(a) * r, 12 + Math.sin(a) * r);
    }
    polygon(g, pts, p.core, 0.45, p.core, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 2.5);
  });

  generate(scene, 'bolt', 18, 8, (g) => {
    g.fillStyle(p.playerBolt, 0.35);
    g.fillRoundedRect(0, 0, 18, 8, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(3, 2.5, 12, 3, 1.5);
  });
  generate(scene, 'ebolt', 16, 16, (g) => {
    polygon(g, [8, 1, 15, 8, 8, 15, 1, 8], p.enemyBolt, 0.6, p.enemyBolt, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 2.5);
  });
  generate(scene, 'spark', 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 3.5);
  });
  generate(scene, 'ring', 64, 64, (g) => {
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(32, 32, 29);
  });
  generate(scene, 'arrow', 18, 18, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(17, 9, 2, 1, 2, 17);
  });

  canvasTexture(scene, 'glow', 64, 64, (ctx) => {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  });

  canvasTexture(scene, 'vignette', VIEW_W, VIEW_H, (ctx) => {
    const grad = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.35,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_W * 0.62,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  });

  // Obscurité de la « panne de lumière » : deux fois la taille de l'écran, halo transparent au centre.
  canvasTexture(scene, 'darkness', VIEW_W * 2, VIEW_H * 2, (ctx) => {
    const cx = VIEW_W;
    const cy = VIEW_H;
    ctx.fillStyle = 'rgba(2,3,10,0.95)';
    ctx.fillRect(0, 0, VIEW_W * 2, VIEW_H * 2);
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.92)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W * 2, VIEW_H * 2);
  });

  generate(scene, 'skyline', VIEW_W, 360, (g) => {
    const rng = new Rng('neon-salvage-skyline');
    const layers = [
      { color: 0x0a0d26, minH: 120, maxH: 260, alpha: 1, window: 0x2a3a8a },
      { color: 0x0d1233, minH: 60, maxH: 200, alpha: 1, window: p.edge },
    ];
    for (const layer of layers) {
      let x = -10;
      while (x < VIEW_W) {
        const w = rng.int(28, 70);
        const h = rng.int(layer.minH, layer.maxH);
        g.fillStyle(layer.color, layer.alpha);
        g.fillRect(x, 360 - h, w, h);
        for (let wy = 360 - h + 10; wy < 350; wy += 14) {
          for (let wx = x + 6; wx < x + w - 8; wx += 10) {
            if (rng.chance(0.22)) {
              g.fillStyle(rng.chance(0.15) ? p.core : layer.window, 0.7);
              g.fillRect(wx, wy, 4, 6);
            }
          }
        }
        x += w + rng.int(2, 10);
      }
    }
  });
}
