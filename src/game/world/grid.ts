import { TILE, TILE_WALL } from '../config/balance';
import type { GameMap, Rect } from '../types';

export function tileIndex(map: Pick<GameMap, 'width'>, tx: number, ty: number): number {
  return ty * map.width + tx;
}

export function inBounds(map: Pick<GameMap, 'width' | 'height'>, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
}

/** Hors de la carte, tout est mur. */
export function isWall(
  map: Pick<GameMap, 'width' | 'height' | 'tiles'>,
  tx: number,
  ty: number,
): boolean {
  if (!inBounds(map, tx, ty)) return true;
  return map.tiles[ty * map.width + tx] === TILE_WALL;
}

export function isWallAtPx(
  map: Pick<GameMap, 'width' | 'height' | 'tiles'>,
  px: number,
  py: number,
): boolean {
  return isWall(map, Math.floor(px / TILE), Math.floor(py / TILE));
}

export function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function pxToTile(px: number): number {
  return Math.floor(px / TILE);
}

export function rectContainsTile(rect: Rect, tx: number, ty: number): boolean {
  return tx >= rect.x && ty >= rect.y && tx < rect.x + rect.w && ty < rect.y + rect.h;
}

export function rectContainsPx(rect: Rect, px: number, py: number): boolean {
  return rectContainsTile(rect, Math.floor(px / TILE), Math.floor(py / TILE));
}

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Distances de chemin (4 directions) depuis une tuile ; -1 pour les murs et les tuiles inatteignables.
 */
export function bfsDistances(
  width: number,
  height: number,
  tiles: Uint8Array,
  startTx: number,
  startTy: number,
): Int32Array {
  const dist = new Int32Array(width * height).fill(-1);
  if (startTx < 0 || startTy < 0 || startTx >= width || startTy >= height) return dist;
  if (tiles[startTy * width + startTx] === TILE_WALL) return dist;
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const start = startTy * width + startTx;
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const current = queue[head++] as number;
    const cx = current % width;
    const cy = (current - cx) / width;
    const next = (dist[current] as number) + 1;
    for (const [dx, dy] of ORTHO) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (tiles[ni] === TILE_WALL || dist[ni] !== -1) continue;
      dist[ni] = next;
      queue[tail++] = ni;
    }
  }
  return dist;
}

export function countFloor(tiles: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < tiles.length; i++) if (tiles[i] !== TILE_WALL) n++;
  return n;
}
