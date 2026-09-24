import { TILE_FLOOR, TILE_WALL } from '../config/balance';
import { RESOURCES } from '../config/resources';
import type { SectorConfig } from '../config/sectors';
import type { EnemyKind, EnemySpawn, GameMap, ResourceKind, ResourceSpawn, Room } from '../types';
import { Rng } from '../utils/rng';
import { clamp } from '../utils/math';
import { bfsDistances, countFloor, isWall } from '../world/grid';

const MIN_ENEMY_START_DISTANCE_TILES = 12;
const MAX_GENERATION_ATTEMPTS = 15;

function carve(
  tiles: Uint8Array,
  W: number,
  H: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const x0 = clamp(x, 1, W - 2);
  const y0 = clamp(y, 1, H - 2);
  const x1 = clamp(x + w - 1, 1, W - 2);
  const y1 = clamp(y + h - 1, 1, H - 2);
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) tiles[yy * W + xx] = TILE_FLOOR;
  }
}

function overlaps(a: Room, b: Room, margin: number): boolean {
  return (
    a.x - margin < b.x + b.w &&
    a.x + a.w + margin > b.x &&
    a.y - margin < b.y + b.h &&
    a.y + a.h + margin > b.y
  );
}

function center(room: Room): { cx: number; cy: number } {
  return { cx: room.x + Math.floor(room.w / 2), cy: room.y + Math.floor(room.h / 2) };
}

function carveCorridor(
  tiles: Uint8Array,
  W: number,
  H: number,
  a: Room,
  b: Room,
  width: number,
  horizontalFirst: boolean,
): void {
  const { cx: ax, cy: ay } = center(a);
  const { cx: bx, cy: by } = center(b);
  if (horizontalFirst) {
    carve(tiles, W, H, Math.min(ax, bx), ay, Math.abs(bx - ax) + width, width);
    carve(tiles, W, H, bx, Math.min(ay, by), width, Math.abs(by - ay) + width);
  } else {
    carve(tiles, W, H, ax, Math.min(ay, by), width, Math.abs(by - ay) + width);
    carve(tiles, W, H, Math.min(ax, bx), by, Math.abs(bx - ax) + width, width);
  }
}

function isConnected(W: number, H: number, tiles: Uint8Array, sx: number, sy: number): boolean {
  const dist = bfsDistances(W, H, tiles, sx, sy);
  let reachable = 0;
  for (let i = 0; i < dist.length; i++) if ((dist[i] as number) >= 0) reachable++;
  return reachable === countFloor(tiles);
}

function addPillars(
  rng: Rng,
  tiles: Uint8Array,
  W: number,
  H: number,
  rooms: Room[],
  sx: number,
  sy: number,
) {
  for (const room of rooms) {
    if (room.kind === 'base' || room.w < 8 || room.h < 6) continue;
    const count = rng.int(0, 3);
    for (let k = 0; k < count; k++) {
      const size = rng.chance(0.5) ? 2 : 1;
      const px = rng.int(room.x + 2, room.x + room.w - 2 - size);
      const py = rng.int(room.y + 2, room.y + room.h - 2 - size);
      const previous: number[] = [];
      for (let yy = py; yy < py + size; yy++) {
        for (let xx = px; xx < px + size; xx++) {
          previous.push(tiles[yy * W + xx] as number);
          tiles[yy * W + xx] = TILE_WALL;
        }
      }
      if (!isConnected(W, H, tiles, sx, sy)) {
        let i = 0;
        for (let yy = py; yy < py + size; yy++) {
          for (let xx = px; xx < px + size; xx++) tiles[yy * W + xx] = previous[i++] as number;
        }
      }
    }
  }
}

/** Génère une carte de façon déterministe à partir d'une seed et d'un secteur. */
export function generateMap(seed: string, sector: SectorConfig): GameMap {
  const rng = new Rng(`${seed}|map|${sector.id}`);
  const W = sector.mapW;
  const H = sector.mapH;
  const tiles = new Uint8Array(W * H).fill(TILE_WALL);

  const rooms: Room[] = [];
  const baseRoom: Room = {
    x: rng.int(3, Math.max(3, Math.floor(W * 0.2))),
    y: rng.int(3, H - 7 - 3),
    w: 9,
    h: 7,
    kind: 'base',
  };
  rooms.push(baseRoom);
  carve(tiles, W, H, baseRoom.x, baseRoom.y, baseRoom.w, baseRoom.h);

  for (let attempt = 0; attempt < 800 && rooms.length < sector.roomCount; attempt++) {
    const w = rng.int(6, 14);
    const h = rng.int(5, 10);
    const candidate: Room = {
      x: rng.int(2, W - w - 3),
      y: rng.int(2, H - h - 3),
      w,
      h,
      kind: 'normal',
    };
    if (rooms.some((r) => overlaps(r, candidate, 3))) continue;
    rooms.push(candidate);
    carve(tiles, W, H, candidate.x, candidate.y, candidate.w, candidate.h);
  }

  // Arbre couvrant minimal : chaque salle est reliée à la plus proche déjà connectée.
  const connected = new Set<number>([0]);
  const linked = new Set<string>();
  while (connected.size < rooms.length) {
    let bestI = -1;
    let bestJ = -1;
    let bestDist = Infinity;
    for (const i of connected) {
      for (let j = 0; j < rooms.length; j++) {
        if (connected.has(j)) continue;
        const a = center(rooms[i] as Room);
        const b = center(rooms[j] as Room);
        const d = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
        if (d < bestDist) {
          bestDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }
    carveCorridor(tiles, W, H, rooms[bestI] as Room, rooms[bestJ] as Room, 2, rng.chance(0.5));
    linked.add(`${Math.min(bestI, bestJ)}-${Math.max(bestI, bestJ)}`);
    connected.add(bestJ);
  }

  // Boucles supplémentaires pour éviter une carte en simple arbre.
  const extra = Math.floor(rooms.length / 3);
  for (let k = 0; k < extra; k++) {
    const i = rng.int(0, rooms.length - 1);
    const j = rng.int(0, rooms.length - 1);
    const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
    if (i === j || linked.has(key)) continue;
    linked.add(key);
    carveCorridor(
      tiles,
      W,
      H,
      rooms[i] as Room,
      rooms[j] as Room,
      rng.chance(0.4) ? 3 : 2,
      rng.chance(0.5),
    );
  }

  const base = { x: baseRoom.x, y: baseRoom.y, w: baseRoom.w, h: baseRoom.h };
  const startTx = baseRoom.x + Math.floor(baseRoom.w / 2);
  const startTy = baseRoom.y + Math.floor(baseRoom.h / 2);

  addPillars(rng, tiles, W, H, rooms, startTx, startTy);

  const distance = bfsDistances(W, H, tiles, startTx, startTy);
  let maxDistance = 0;
  for (let i = 0; i < distance.length; i++)
    maxDistance = Math.max(maxDistance, distance[i] as number);

  const roomTiles = (room: Room, predicate: (tx: number, ty: number) => boolean) => {
    const out: Array<{ tx: number; ty: number }> = [];
    for (let ty = room.y; ty < room.y + room.h; ty++) {
      for (let tx = room.x; tx < room.x + room.w; tx++) if (predicate(tx, ty)) out.push({ tx, ty });
    }
    return out;
  };
  const isFree = (tx: number, ty: number) =>
    !isWall({ width: W, height: H, tiles }, tx, ty) &&
    !isWall({ width: W, height: H, tiles }, tx + 1, ty) &&
    !isWall({ width: W, height: H, tiles }, tx - 1, ty) &&
    !isWall({ width: W, height: H, tiles }, tx, ty + 1) &&
    !isWall({ width: W, height: H, tiles }, tx, ty - 1);

  const roomDistance = (room: Room): number => {
    let sum = 0;
    let n = 0;
    for (let ty = room.y; ty < room.y + room.h; ty++) {
      for (let tx = room.x; tx < room.x + room.w; tx++) {
        const d = distance[ty * W + tx] as number;
        if (d >= 0) {
          sum += d;
          n++;
        }
      }
    }
    return n > 0 ? sum / n : 0;
  };

  let rareRoomIndex = -1;
  let rareDistance = -1;
  rooms.forEach((room, index) => {
    if (room.kind === 'base') return;
    const d = roomDistance(room);
    if (d > rareDistance) {
      rareDistance = d;
      rareRoomIndex = index;
    }
  });
  if (rareRoomIndex >= 0) (rooms[rareRoomIndex] as Room).kind = 'rare';

  const placed: Array<{ tx: number; ty: number }> = [];
  const tooClose = (tx: number, ty: number, minCheb: number) =>
    placed.some((p) => Math.max(Math.abs(p.tx - tx), Math.abs(p.ty - ty)) < minCheb);

  // --- Ressources ---
  const resources: ResourceSpawn[] = [];
  const tileRatio = (tx: number, ty: number) =>
    clamp(((distance[ty * W + tx] as number) || 0) / Math.max(1, maxDistance), 0, 1);

  const pickKind = (ratio: number): ResourceKind => {
    const weights: Array<[ResourceKind, number]> = [
      ['scrap', 50 - 25 * ratio],
      ['cell', 16],
      ['crystal', 14 + 6 * ratio],
      ['component', 4 + 14 * ratio],
      ['core', 1 + 9 * ratio * ratio],
    ];
    return rng.weighted(weights, (w) => w[1])[0];
  };

  const addResource = (kind: ResourceKind, tx: number, ty: number) => {
    const ratio = tileRatio(tx, ty);
    resources.push({ kind, tx, ty, valueMult: Math.round((1 + 0.6 * ratio) * 100) / 100 });
    placed.push({ tx, ty });
  };

  for (const room of rooms) {
    if (room.kind === 'base') continue;
    const free = rng.shuffle(roomTiles(room, isFree));
    let count = clamp(Math.round(room.w * room.h * sector.resourceDensity), 2, 8);
    if (room.kind === 'rare') count += 3;
    let done = 0;
    for (const tile of free) {
      if (done >= count) break;
      if (tooClose(tile.tx, tile.ty, 2)) continue;
      let kind = pickKind(tileRatio(tile.tx, tile.ty));
      if (room.kind === 'rare' && done === 0) kind = 'core';
      else if (room.kind === 'rare' && done === 1) kind = 'component';
      addResource(kind, tile.tx, tile.ty);
      done++;
    }
  }

  // Une cellule d'énergie à portée raisonnable de la base pour un début de partie doux.
  if (!resources.some((r) => r.kind === 'cell' && (distance[r.ty * W + r.tx] as number) <= 30)) {
    const nearest = rooms
      .filter((r) => r.kind === 'normal')
      .sort((a, b) => roomDistance(a) - roomDistance(b))[0];
    if (nearest) {
      const spot = rng.shuffle(roomTiles(nearest, isFree)).find((t) => !tooClose(t.tx, t.ty, 2));
      if (spot) addResource('cell', spot.tx, spot.ty);
    }
  }

  // --- Ennemis ---
  const enemies: EnemySpawn[] = [];
  let groupId = 0;
  const farEnough = (tx: number, ty: number) =>
    Math.hypot(tx - startTx, ty - startTy) >= MIN_ENEMY_START_DISTANCE_TILES &&
    (distance[ty * W + tx] as number) >= sector.safeRadius;

  const addEnemy = (
    kind: EnemyKind,
    tx: number,
    ty: number,
    group: number,
    guard?: { tx: number; ty: number },
  ) => {
    if (enemies.length >= sector.maxEnemies) return false;
    if (!farEnough(tx, ty) || tooClose(tx, ty, 2)) return false;
    const spawn: EnemySpawn = { kind, tx, ty, groupId: group };
    if (guard) {
      spawn.guardTx = guard.tx;
      spawn.guardTy = guard.ty;
    }
    enemies.push(spawn);
    placed.push({ tx, ty });
    return true;
  };

  const rareRoom = rooms[rareRoomIndex];
  if (rareRoom) {
    const free = rng.shuffle(roomTiles(rareRoom, isFree));
    const guard = resources.find(
      (r) =>
        r.tx >= rareRoom.x &&
        r.tx < rareRoom.x + rareRoom.w &&
        r.ty >= rareRoom.y &&
        r.ty < rareRoom.y + rareRoom.h,
    );
    let sentinels = 0;
    for (const tile of free) {
      if (sentinels >= 2) break;
      if (addEnemy('sentinel', tile.tx, tile.ty, groupId, guard)) sentinels++;
    }
    groupId++;
    for (const tile of free) if (addEnemy('hunter', tile.tx, tile.ty, groupId++)) break;
  }

  const candidateRooms = rng.shuffle(
    rooms.filter((r) => r.kind === 'normal' && roomDistance(r) >= sector.safeRadius + 3),
  );
  for (const room of candidateRooms) {
    if (enemies.length >= sector.maxEnemies) break;
    const ratio = clamp(roomDistance(room) / Math.max(1, maxDistance), 0, 1);
    const free = rng.shuffle(roomTiles(room, isFree));
    if (free.length === 0) continue;

    if (room.w * room.h >= 40 && rng.chance(sector.scoutChance)) {
      const anchor = rng.pick(free);
      const size = rng.int(2, 4);
      const group = groupId++;
      let added = 0;
      for (const tile of free) {
        if (added >= size) break;
        if (Math.max(Math.abs(tile.tx - anchor.tx), Math.abs(tile.ty - anchor.ty)) > 3) continue;
        if (addEnemy('scout', tile.tx, tile.ty, group)) added++;
      }
    }
    if (rng.chance(sector.sentinelChance)) {
      const guardResource = resources.find(
        (r) => r.tx >= room.x && r.tx < room.x + room.w && r.ty >= room.y && r.ty < room.y + room.h,
      );
      const guard = guardResource ? { tx: guardResource.tx, ty: guardResource.ty } : undefined;
      const spot = free.find((t) => {
        if (!guard) return true;
        const d = Math.max(Math.abs(t.tx - guard.tx), Math.abs(t.ty - guard.ty));
        return d >= 2 && d <= 6;
      });
      if (spot) addEnemy('sentinel', spot.tx, spot.ty, groupId++, guard);
    }
    if (rng.chance(sector.hunterChance * (0.5 + ratio))) {
      for (const tile of free) if (addEnemy('hunter', tile.tx, tile.ty, groupId++)) break;
    }
  }

  return {
    seed,
    sectorId: sector.id,
    width: W,
    height: H,
    tiles,
    rooms,
    base,
    start: { tx: startTx, ty: startTy },
    rareRoomIndex,
    resources,
    enemies,
    maxDistance,
    distance,
  };
}

/** Valeur maximale transportable avec une capacité donnée (sélection gloutonne valeur/poids). */
export function maxCargoValue(map: GameMap, sector: SectorConfig, capacity: number): number {
  const items = map.resources
    .filter((r) => RESOURCES[r.kind].weight > 0)
    .map((r) => ({
      weight: RESOURCES[r.kind].weight,
      value: RESOURCES[r.kind].value * sector.valueMult * r.valueMult,
    }))
    .sort((a, b) => b.value / b.weight - a.value / a.weight);
  let left = capacity;
  let total = 0;
  for (const item of items) {
    if (item.weight <= left) {
      left -= item.weight;
      total += item.value;
    }
  }
  return total;
}

/** Vérifie qu'une carte est jouable ; retourne la liste des problèmes (vide si valide). */
export function validateMap(map: GameMap, sector: SectorConfig): string[] {
  const errors: string[] = [];
  const W = map.width;
  const solid = { width: W, height: map.height, tiles: map.tiles };

  if (map.rooms.length < sector.minRooms) errors.push(`Pas assez de salles (${map.rooms.length}).`);

  for (let ty = map.base.y; ty < map.base.y + map.base.h; ty++) {
    for (let tx = map.base.x; tx < map.base.x + map.base.w; tx++) {
      if (isWall(solid, tx, ty)) errors.push('La zone de base contient un mur.');
    }
  }

  const dist = bfsDistances(W, map.height, map.tiles, map.start.tx, map.start.ty);
  let reachable = 0;
  for (let i = 0; i < dist.length; i++) if ((dist[i] as number) >= 0) reachable++;
  if (reachable !== countFloor(map.tiles))
    errors.push('Certaines zones sont inaccessibles depuis la base.');

  const seen = new Set<number>();
  for (const r of map.resources) {
    const idx = r.ty * W + r.tx;
    if (isWall(solid, r.tx, r.ty)) errors.push(`Ressource dans un mur (${r.tx},${r.ty}).`);
    else if ((dist[idx] as number) < 0) errors.push(`Ressource inaccessible (${r.tx},${r.ty}).`);
    if (seen.has(idx)) errors.push(`Deux ressources sur la même tuile (${r.tx},${r.ty}).`);
    seen.add(idx);
  }
  if (map.resources.length < 10) errors.push('Carte trop vide en ressources.');

  const potential = map.resources.reduce(
    (sum, r) => sum + RESOURCES[r.kind].value * sector.valueMult * r.valueMult,
    0,
  );
  if (potential < sector.quota * 2.2)
    errors.push('Quota inatteignable : pas assez de valeur sur la carte.');
  if (maxCargoValue(map, sector, 14) < sector.quota * 1.15) {
    errors.push('Quota difficilement atteignable avec la capacité de départ.');
  }

  if (map.enemies.length > sector.maxEnemies) errors.push('Trop d’ennemis.');
  if (map.enemies.length < 2) errors.push('Trop peu d’ennemis.');
  for (const e of map.enemies) {
    if (isWall(solid, e.tx, e.ty)) errors.push(`Ennemi dans un mur (${e.tx},${e.ty}).`);
    if (Math.hypot(e.tx - map.start.tx, e.ty - map.start.ty) < MIN_ENEMY_START_DISTANCE_TILES) {
      errors.push(`Ennemi trop proche de la base (${e.tx},${e.ty}).`);
    }
    if ((dist[e.ty * W + e.tx] as number) < sector.safeRadius) {
      errors.push(`Ennemi dans le rayon de sécurité (${e.tx},${e.ty}).`);
    }
  }
  return errors;
}

export interface GeneratedMap {
  map: GameMap;
  attempts: number;
}

/** Génère une carte valide : en cas d'échec de validation, une variante dérivée de la même seed est essayée. */
export function generateValidMap(seed: string, sector: SectorConfig): GeneratedMap {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}~${attempt}`;
    const map = generateMap(attemptSeed, sector);
    map.seed = seed;
    if (validateMap(map, sector).length === 0) return { map, attempts: attempt + 1 };
  }
  throw new Error(`Aucune carte valide pour la seed « ${seed} » (secteur ${sector.id}).`);
}
