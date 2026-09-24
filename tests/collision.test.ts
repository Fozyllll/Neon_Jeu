import { describe, expect, it } from 'vitest';
import { TILE, TILE_FLOOR, TILE_WALL } from '../src/game/config/balance';
import { circleHitsWall, hasLineOfSight, moveCircle } from '../src/game/world/collision';
import { FlowField } from '../src/game/world/flowField';

/** Carte 10x7 : cadre de murs, une cloison verticale en x=5 avec un passage en y=5. */
function makeMap() {
  const width = 10;
  const height = 7;
  const tiles = new Uint8Array(width * height).fill(TILE_FLOOR);
  for (let x = 0; x < width; x++) {
    tiles[x] = TILE_WALL;
    tiles[(height - 1) * width + x] = TILE_WALL;
  }
  for (let y = 0; y < height; y++) {
    tiles[y * width] = TILE_WALL;
    tiles[y * width + width - 1] = TILE_WALL;
  }
  for (let y = 1; y < 5; y++) tiles[y * width + 5] = TILE_WALL;
  return { width, height, tiles };
}

describe('collisions', () => {
  const map = makeMap();

  it('détecte un cercle qui touche un mur', () => {
    expect(circleHitsWall(map, TILE * 1.5, TILE * 1.5, 10)).toBe(false);
    expect(circleHitsWall(map, TILE * 1.1, TILE * 1.5, 12)).toBe(true);
  });

  it('bloque le déplacement contre un mur sans le traverser', () => {
    const result = moveCircle(map, TILE * 4.4, TILE * 2.5, 200, 0, 11);
    expect(result.hitX).toBe(true);
    expect(result.x).toBeLessThan(TILE * 5);
  });

  it('glisse le long d’un mur', () => {
    const result = moveCircle(map, TILE * 4.4, TILE * 2.5, 60, 30, 11);
    expect(result.hitX).toBe(true);
    expect(result.y).toBeGreaterThan(TILE * 2.5);
  });

  it('ne traverse pas un mur même avec un très grand pas', () => {
    const result = moveCircle(map, TILE * 1.5, TILE * 2.5, 1000, 0, 11);
    expect(result.x).toBeLessThan(TILE * 5);
  });

  it('calcule la ligne de vue', () => {
    expect(hasLineOfSight(map, TILE * 2.5, TILE * 2.5, TILE * 4.5, TILE * 2.5)).toBe(true);
    expect(hasLineOfSight(map, TILE * 2.5, TILE * 2.5, TILE * 7.5, TILE * 2.5)).toBe(false);
    expect(hasLineOfSight(map, TILE * 2.5, TILE * 5.5, TILE * 7.5, TILE * 5.5)).toBe(true);
  });
});

describe('champ de flux', () => {
  it('contourne une cloison par le passage', () => {
    const map = makeMap();
    const flow = new FlowField(map);
    flow.compute(7, 2, 60);
    let tx = 2;
    let ty = 2;
    for (let i = 0; i < 30 && !(tx === 7 && ty === 2); i++) {
      const step = flow.nextStep(tx, ty);
      expect(step).not.toBeNull();
      tx = step!.tx;
      ty = step!.ty;
      expect(map.tiles[ty * map.width + tx]).toBe(TILE_FLOOR);
    }
    expect(tx).toBe(7);
    expect(ty).toBe(2);
  });

  it('retourne null pour une tuile hors du champ', () => {
    const map = makeMap();
    const flow = new FlowField(map);
    flow.compute(7, 2, 2);
    expect(flow.nextStep(1, 5)).toBeNull();
  });
});
