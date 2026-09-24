import { describe, expect, it } from 'vitest';
import { SECTORS } from '../src/game/config/sectors';
import { TILE_WALL } from '../src/game/config/balance';
import { generateMap, generateValidMap, validateMap } from '../src/game/generation/mapGenerator';
import { bfsDistances } from '../src/game/world/grid';

const SEEDS = ['A', 'NEON', 'SALVAGE', '12345', 'X-RAY', 'ZZZZ', 'demo', 'K7Q2M9'];

describe('génération de carte', () => {
  it('est déterministe pour une même seed', () => {
    for (const sector of SECTORS) {
      const a = generateValidMap('DETERMINISM', sector).map;
      const b = generateValidMap('DETERMINISM', sector).map;
      expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
      expect(a.resources).toEqual(b.resources);
      expect(a.enemies).toEqual(b.enemies);
    }
  });

  it('donne des cartes différentes pour des seeds différentes', () => {
    const sector = SECTORS[0]!;
    const a = generateValidMap('ONE', sector).map;
    const b = generateValidMap('TWO', sector).map;
    expect(Array.from(a.tiles)).not.toEqual(Array.from(b.tiles));
  });

  it('produit des cartes valides pour tous les secteurs et beaucoup de seeds', () => {
    for (const sector of SECTORS) {
      for (const seed of SEEDS) {
        const { map } = generateValidMap(seed, sector);
        expect(validateMap(map, sector)).toEqual([]);
        expect(map.resources.length).toBeGreaterThanOrEqual(10);
        expect(map.enemies.length).toBeLessThanOrEqual(sector.maxEnemies);
      }
    }
  });

  it('garde toutes les tuiles de sol accessibles depuis la base', () => {
    const sector = SECTORS[2]!;
    const { map } = generateValidMap('CONNECT', sector);
    const dist = bfsDistances(map.width, map.height, map.tiles, map.start.tx, map.start.ty);
    for (let i = 0; i < map.tiles.length; i++) {
      if (map.tiles[i] !== TILE_WALL) expect(dist[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it('n’apparie aucun ennemi près de la base', () => {
    for (const sector of SECTORS) {
      const { map } = generateValidMap('SAFE', sector);
      for (const e of map.enemies) {
        expect(Math.hypot(e.tx - map.start.tx, e.ty - map.start.ty)).toBeGreaterThanOrEqual(12);
        expect(map.distance[e.ty * map.width + e.tx]).toBeGreaterThanOrEqual(sector.safeRadius);
      }
    }
  });

  it('place une salle rare gardée', () => {
    const sector = SECTORS[1]!;
    const { map } = generateValidMap('RARE', sector);
    expect(map.rareRoomIndex).toBeGreaterThan(0);
    expect(map.rooms[map.rareRoomIndex]?.kind).toBe('rare');
  });
});

describe('validation de carte', () => {
  const sector = SECTORS[0]!;

  it('détecte une ressource enfermée dans un mur', () => {
    const { map } = generateValidMap('VALID', sector);
    const r = map.resources[0]!;
    map.tiles[r.ty * map.width + r.tx] = TILE_WALL;
    expect(validateMap(map, sector).length).toBeGreaterThan(0);
  });

  it('détecte une zone coupée de la base', () => {
    const map = generateMap('CUT', sector);
    const room = map.rooms[1]!;
    // On emmure une salle complète avec des murs autour de son centre d'accès.
    for (let y = room.y - 3; y < room.y + room.h + 3; y++) {
      for (let x = room.x - 3; x < room.x + room.w + 3; x++) {
        const inside = x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
        if (!inside && x > 0 && y > 0 && x < map.width - 1 && y < map.height - 1) {
          map.tiles[y * map.width + x] = TILE_WALL;
        }
      }
    }
    expect(validateMap(map, sector).join(' ')).toContain('inaccessibles');
  });

  it('détecte un ennemi trop proche de la base', () => {
    const { map } = generateValidMap('NEARBY', sector);
    map.enemies.push({ kind: 'scout', tx: map.start.tx + 1, ty: map.start.ty, groupId: 99 });
    expect(validateMap(map, sector).join(' ')).toContain('trop proche');
  });
});
