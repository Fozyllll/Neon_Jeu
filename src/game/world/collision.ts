import { TILE } from '../config/balance';
import type { GameMap } from '../types';
import { isWall, isWallAtPx } from './grid';

type Solid = Pick<GameMap, 'width' | 'height' | 'tiles'>;

/** Vrai si un cercle (centre x,y ; rayon r) chevauche un mur. */
export function circleHitsWall(map: Solid, x: number, y: number, r: number): boolean {
  const minTx = Math.floor((x - r) / TILE);
  const maxTx = Math.floor((x + r) / TILE);
  const minTy = Math.floor((y - r) / TILE);
  const maxTy = Math.floor((y + r) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isWall(map, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

export interface MoveResult {
  x: number;
  y: number;
  hitX: boolean;
  hitY: boolean;
}

/**
 * Déplace un cercle en glissant le long des murs (axe X puis axe Y).
 * Le déplacement est découpé en petits pas pour ne jamais traverser un mur.
 */
export function moveCircle(
  map: Solid,
  x: number,
  y: number,
  dx: number,
  dy: number,
  r: number,
): MoveResult {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  const sx = dx / steps;
  const sy = dy / steps;
  let hitX = false;
  let hitY = false;
  let cx = x;
  let cy = y;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      if (circleHitsWall(map, cx + sx, cy, r)) hitX = true;
      else cx += sx;
    }
    if (sy !== 0) {
      if (circleHitsWall(map, cx, cy + sy, r)) hitY = true;
      else cy += sy;
    }
  }
  return { x: cx, y: cy, hitX, hitY };
}

/** Vrai si le segment ne croise aucun mur (échantillonné tous les 8 px). */
export function hasLineOfSight(
  map: Solid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWallAtPx(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}
