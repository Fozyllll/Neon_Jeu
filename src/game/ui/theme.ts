import type Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';
import { css, getPalette } from '../config/palette';
import { save } from '../services';

export const FONT = 'ui-monospace, "Cascadia Mono", "SF Mono", Consolas, Menlo, monospace';

export type ColorRole = 'text' | 'dim' | 'accent' | 'warn' | 'good' | 'bad' | 'rare';

export function uiColor(role: ColorRole): string {
  const s = save.data.settings;
  const p = getPalette(s.colorblind);
  const contrast = s.highContrast;
  switch (role) {
    case 'text':
      return contrast ? '#ffffff' : '#e8ecff';
    case 'dim':
      return contrast ? '#d6dcff' : '#8d97c9';
    case 'accent':
      return css(p.edge);
    case 'warn':
      return css(p.warn);
    case 'good':
      return css(p.good);
    case 'bad':
      return css(p.hp);
    case 'rare':
      return css(p.rare === 0x0072b2 ? 0x56b4e9 : 0xd08bff);
  }
}

export function textScale(): number {
  return save.data.settings.textScale;
}

export interface TextOptions {
  origin?: [number, number];
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  bold?: boolean;
  /** Ne pas appliquer la taille de texte choisie par le joueur (titres décoratifs). */
  fixedSize?: boolean;
}

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size: number,
  role: ColorRole | string = 'text',
  options: TextOptions = {},
): Phaser.GameObjects.Text {
  const s = save.data.settings;
  const px = Math.round(size * (options.fixedSize ? 1 : s.textScale));
  const color = ['text', 'dim', 'accent', 'warn', 'good', 'bad', 'rare'].includes(role)
    ? uiColor(role as ColorRole)
    : role;
  const text = scene.add.text(x, y, content, {
    fontFamily: FONT,
    fontSize: `${px}px`,
    fontStyle: options.bold ? 'bold' : 'normal',
    color,
    align: options.align ?? 'left',
    stroke: '#000000',
    strokeThickness: s.highContrast ? 4 : 2,
    wordWrap: options.wrap ? { width: options.wrap } : undefined,
    resolution: 2,
  });
  const [ox, oy] = options.origin ?? [0, 0];
  text.setOrigin(ox, oy);
  return text;
}

/** Fond commun des menus : dégradé sombre et silhouette de ville néon. */
export function addBackdrop(scene: Phaser.Scene): void {
  scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x070818).setDepth(-20);
  scene.add
    .rectangle(VIEW_W / 2, VIEW_H * 0.72, VIEW_W, VIEW_H * 0.6, 0x1a0b3a, 0.35)
    .setDepth(-19);
  scene.add
    .image(VIEW_W / 2, VIEW_H - 180, 'skyline')
    .setDepth(-18)
    .setAlpha(0.9);
  scene.add.image(VIEW_W / 2, VIEW_H / 2, 'vignette').setDepth(-17);
}

export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  strokeColor: number,
  alpha = 0.72,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x070818, alpha);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(save.data.settings.highContrast ? 3 : 2, strokeColor, 0.9);
  g.strokeRoundedRect(x, y, w, h, 8);
  return g;
}
