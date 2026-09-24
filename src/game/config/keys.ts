import type { KeyAction } from '../types';

export const KEY = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  ESC: 27,
  SPACE: 32,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  A: 65,
  D: 68,
  E: 69,
  R: 82,
  S: 83,
  W: 87,
} as const;

export const DEFAULT_KEYS: Record<KeyAction, number> = {
  up: KEY.W,
  down: KEY.S,
  left: KEY.A,
  right: KEY.D,
  interact: KEY.E,
  sprint: KEY.SHIFT,
  pause: KEY.ESC,
  restart: KEY.R,
};

export const KEY_ACTIONS: readonly KeyAction[] = [
  'up',
  'down',
  'left',
  'right',
  'interact',
  'sprint',
  'pause',
  'restart',
];

export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
  interact: 'Récupérer / Extraire',
  sprint: 'Accélération',
  pause: 'Pause',
  restart: 'Rejouer',
};

const SPECIAL_LABELS: Record<number, string> = {
  [KEY.BACKSPACE]: 'Retour arr.',
  [KEY.TAB]: 'Tab',
  [KEY.ENTER]: 'Entrée',
  [KEY.SHIFT]: 'Maj',
  [KEY.CTRL]: 'Ctrl',
  [KEY.ALT]: 'Alt',
  [KEY.ESC]: 'Échap',
  [KEY.SPACE]: 'Espace',
  [KEY.LEFT]: '←',
  [KEY.UP]: '↑',
  [KEY.RIGHT]: '→',
  [KEY.DOWN]: '↓',
};

/** Libellé lisible d'un code de touche (keyCode). */
export function keyLabel(code: number): string {
  const special = SPECIAL_LABELS[code];
  if (special) return special;
  if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90)) return String.fromCharCode(code);
  if (code >= 112 && code <= 123) return `F${code - 111}`;
  return `Touche ${code}`;
}
