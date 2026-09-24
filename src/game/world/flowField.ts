import { TILE_WALL } from '../config/balance';
import type { GameMap } from '../types';

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Champ de distances depuis une cible (le joueur) : les ennemis en poursuite descendent
 * le gradient, ce qui leur permet de contourner les murs sans algorithme de chemin complet.
 */
export class FlowField {
  private readonly dist: Int16Array;
  private readonly queue: Int32Array;
  private readonly width: number;
  private readonly height: number;
  private readonly tiles: Uint8Array;

  constructor(map: Pick<GameMap, 'width' | 'height' | 'tiles'>) {
    this.width = map.width;
    this.height = map.height;
    this.tiles = map.tiles;
    this.dist = new Int16Array(map.width * map.height).fill(-1);
    this.queue = new Int32Array(map.width * map.height);
  }

  compute(targetTx: number, targetTy: number, maxSteps = 60): void {
    const { width, height, tiles, dist, queue } = this;
    dist.fill(-1);
    if (targetTx < 0 || targetTy < 0 || targetTx >= width || targetTy >= height) return;
    const start = targetTy * width + targetTx;
    if (tiles[start] === TILE_WALL) return;
    let head = 0;
    let tail = 0;
    dist[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const current = queue[head++] as number;
      const d = dist[current] as number;
      if (d >= maxSteps) continue;
      const cx = current % width;
      const cy = (current - cx) / width;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = ny * width + nx;
        if (tiles[ni] === TILE_WALL || dist[ni] !== -1) continue;
        if (dx !== 0 && dy !== 0) {
          // Pas de diagonale qui coupe un coin de mur.
          if (tiles[cy * width + nx] === TILE_WALL || tiles[ny * width + cx] === TILE_WALL)
            continue;
        }
        dist[ni] = d + 1;
        queue[tail++] = ni;
      }
    }
  }

  distanceAt(tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return -1;
    return this.dist[ty * this.width + tx] as number;
  }

  /** Tuile voisine plus proche de la cible, ou null si la tuile est hors du champ. */
  nextStep(tx: number, ty: number): { tx: number; ty: number } | null {
    const here = this.distanceAt(tx, ty);
    if (here <= 0) return null;
    let best: { tx: number; ty: number } | null = null;
    let bestDist = here;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = tx + dx;
      const ny = ty + dy;
      const d = this.distanceAt(nx, ny);
      if (d < 0 || d >= bestDist) continue;
      if (dx !== 0 && dy !== 0) {
        if (this.tiles[ty * this.width + nx] === TILE_WALL) continue;
        if (this.tiles[ny * this.width + tx] === TILE_WALL) continue;
      }
      bestDist = d;
      best = { tx: nx, ty: ny };
    }
    return best;
  }
}
