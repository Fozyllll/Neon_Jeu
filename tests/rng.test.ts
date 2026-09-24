import { describe, expect, it } from 'vitest';
import { Rng, normalizeSeed, randomSeed } from '../src/game/utils/rng';

describe('Rng', () => {
  it('produit la même séquence pour la même seed', () => {
    const a = new Rng('NEON');
    const b = new Rng('NEON');
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('produit des séquences différentes pour des seeds différentes', () => {
    expect(new Rng('A').next()).not.toBe(new Rng('B').next());
  });

  it('reste dans les bornes', () => {
    const rng = new Rng('bounds');
    for (let i = 0; i < 500; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      const k = rng.int(3, 7);
      expect(k).toBeGreaterThanOrEqual(3);
      expect(k).toBeLessThanOrEqual(7);
    }
  });

  it('mélange sans perdre d’éléments', () => {
    const shuffled = new Rng('s').shuffle([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('pick lève une erreur sur une liste vide', () => {
    expect(() => new Rng('x').pick([])).toThrow();
  });
});

describe('seeds', () => {
  it('normalise la saisie du joueur', () => {
    expect(normalizeSeed(' ab c!d ')).toBe('ABCD');
  });

  it('génère une seed si la saisie est vide ou absente', () => {
    expect(normalizeSeed('')).toHaveLength(6);
    expect(normalizeSeed(null)).toHaveLength(6);
    expect(randomSeed()).toMatch(/^[A-Z2-9]{6}$/);
  });
});
