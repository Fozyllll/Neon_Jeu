export interface Palette {
  bg: number;
  wall: number;
  floor: number;
  floorAlt: number;
  grid: number;
  edge: number;
  player: number;
  playerCore: number;
  scrap: number;
  cell: number;
  crystal: number;
  component: number;
  core: number;
  scout: number;
  sentinel: number;
  hunter: number;
  enemyBolt: number;
  playerBolt: number;
  base: number;
  rare: number;
  warn: number;
  good: number;
  hp: number;
  energy: number;
  shield: number;
}

/** Palette néon par défaut. */
export const PALETTE_DEFAULT: Palette = {
  bg: 0x05060f,
  wall: 0x0d1030,
  floor: 0x0a0d24,
  floorAlt: 0x0c1030,
  grid: 0x1a2258,
  edge: 0x38e8ff,
  player: 0x38e8ff,
  playerCore: 0xffffff,
  scrap: 0x9aa4c8,
  cell: 0x4dff9a,
  crystal: 0x38e8ff,
  component: 0xff9a3c,
  core: 0xff3df2,
  scout: 0xff3df2,
  sentinel: 0xff9a3c,
  hunter: 0xff4d5e,
  enemyBolt: 0xff9a3c,
  playerBolt: 0x9ff6ff,
  base: 0x4dff9a,
  rare: 0xb36bff,
  warn: 0xff9a3c,
  good: 0x4dff9a,
  hp: 0xff4d5e,
  energy: 0x4dff9a,
  shield: 0x38e8ff,
};

/** Palette Okabe-Ito, lisible pour la plupart des formes de daltonisme. */
export const PALETTE_COLORBLIND: Palette = {
  ...PALETTE_DEFAULT,
  edge: 0x56b4e9,
  player: 0x56b4e9,
  scrap: 0xb0b0b0,
  cell: 0xf0e442,
  crystal: 0x56b4e9,
  component: 0xe69f00,
  core: 0xcc79a7,
  scout: 0xcc79a7,
  sentinel: 0xe69f00,
  hunter: 0xd55e00,
  enemyBolt: 0xd55e00,
  playerBolt: 0xbfe6ff,
  base: 0xf0e442,
  rare: 0x0072b2,
  warn: 0xe69f00,
  good: 0xf0e442,
  hp: 0xd55e00,
  energy: 0xf0e442,
  shield: 0x56b4e9,
};

export function getPalette(colorblind: boolean): Palette {
  return colorblind ? PALETTE_COLORBLIND : PALETTE_DEFAULT;
}

export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
