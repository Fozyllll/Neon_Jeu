import { describe, expect, it } from 'vitest';
import { SECTORS } from '../src/game/config/sectors';
import { EVENT_DEFS, EventDirector, type DirectorSignal } from '../src/game/systems/events';

function simulate(seed: string, sectorIndex: number, seconds: number): DirectorSignal[][] {
  const director = new EventDirector(seed, SECTORS[sectorIndex]!);
  const frames: DirectorSignal[][] = [];
  for (let t = 0; t < seconds * 10; t++) frames.push(director.tick(0.1));
  return frames;
}

describe('événements aléatoires', () => {
  it('sont déterministes pour une même seed', () => {
    expect(simulate('EVT', 4, 300)).toEqual(simulate('EVT', 4, 300));
  });

  it('n’en déclenchent aucun avant le délai initial', () => {
    const early = simulate('EARLY', 0, 25).flat();
    expect(early).toEqual([]);
  });

  it('respectent la liste d’événements du secteur', () => {
    const allowed = new Set(SECTORS[0]!.events);
    for (const s of simulate('SECTOR1', 0, 600).flat()) expect(allowed.has(s.kind)).toBe(true);
  });

  it('annoncent toujours les événements majeurs avant de les lancer', () => {
    const signals = simulate('WARN', 4, 900).flat();
    const majors = signals.filter((s) => EVENT_DEFS[s.kind].major);
    for (let i = 0; i < majors.length; i++) {
      const s = majors[i]!;
      if (s.phase === 'start') {
        const warned = majors.slice(0, i).some((m) => m.kind === s.kind && m.phase === 'warn');
        expect(warned).toBe(true);
      }
    }
  });

  it('ne superposent jamais deux événements majeurs', () => {
    const active = new Set<string>();
    for (const s of simulate('OVERLAP', 4, 1200).flat()) {
      if (!EVENT_DEFS[s.kind].major) continue;
      if (s.phase === 'warn') {
        expect(active.size).toBe(0);
        active.add(s.kind);
      } else if (s.phase === 'end' || (s.phase === 'start' && s.duration === 0)) {
        active.delete(s.kind);
      }
    }
  });

  it('terminent chaque événement à durée', () => {
    const signals = simulate('ENDS', 4, 1200).flat();
    const started = signals.filter((s) => s.phase === 'start' && s.duration > 0).length;
    const ended = signals.filter((s) => s.phase === 'end').length;
    expect(ended).toBeGreaterThan(0);
    expect(started - ended).toBeLessThanOrEqual(1);
  });
});
