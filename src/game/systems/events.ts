import type { SectorConfig } from '../config/sectors';
import { EVENT_BALANCE } from '../config/balance';
import type { EventKind } from '../types';
import { Rng } from '../utils/rng';

export type EventPhase = 'warn' | 'start' | 'end';

export interface DirectorSignal {
  kind: EventKind;
  phase: EventPhase;
  /** Durée de l'effet, en secondes (0 = instantané). */
  duration: number;
}

export interface EventDef {
  kind: EventKind;
  label: string;
  warnText: string;
  startText: string;
  warnSec: number;
  durationSec: number;
  /** Un seul événement « majeur » à la fois. */
  major: boolean;
}

export const EVENT_DEFS: Record<EventKind, EventDef> = {
  blackout: {
    kind: 'blackout',
    label: 'Panne de lumière',
    warnText: 'Alerte : panne de lumière dans 4 s.',
    startText: 'Panne de lumière : ta visibilité est réduite.',
    warnSec: 4,
    durationSec: 12,
    major: true,
  },
  acidRain: {
    kind: 'acidRain',
    label: 'Pluie acide',
    warnText: 'Alerte : pluie acide dans 4 s. Rejoins la base pour t’abriter.',
    startText: 'Pluie acide : la coque est rongée en dehors de la base.',
    warnSec: 4,
    durationSec: 14,
    major: true,
  },
  energySurge: {
    kind: 'energySurge',
    label: 'Surcharge énergétique',
    warnText: 'Alerte : surcharge dans 3 s.',
    startText: 'Surcharge : consommation ×1,8 mais points de récupération ×2.',
    warnSec: 3,
    durationSec: 12,
    major: true,
  },
  enemyWave: {
    kind: 'enemyWave',
    label: 'Vague ennemie',
    warnText: 'Alerte : une vague ennemie arrive dans 5 s.',
    startText: 'Vague ennemie ! Des éclaireurs te traquent.',
    warnSec: 5,
    durationSec: 0,
    major: true,
  },
  abandonedChest: {
    kind: 'abandonedChest',
    label: 'Coffre abandonné',
    warnText: '',
    startText: 'Coffre abandonné détecté : un butin précieux t’attend.',
    warnSec: 0,
    durationSec: 0,
    major: false,
  },
  rareDetected: {
    kind: 'rareDetected',
    label: 'Ressource rare détectée',
    warnText: '',
    startText: 'Ressource rare détectée : suis la balise.',
    warnSec: 0,
    durationSec: 0,
    major: false,
  },
  recoveryBonus: {
    kind: 'recoveryBonus',
    label: 'Bonus de récupération',
    warnText: '',
    startText: 'Bonus de récupération : valeur des ressources ×1,5 pendant 15 s.',
    warnSec: 0,
    durationSec: 15,
    major: false,
  },
};

interface TimelineEntry {
  at: number;
  signal: DirectorSignal;
}

/**
 * Planifie les événements aléatoires d'une partie. Déterministe pour une seed donnée
 * (hors variations dues aux actions du joueur, qui n'influencent pas le calendrier).
 */
export class EventDirector {
  private readonly rng: Rng;
  private elapsed = 0;
  private nextTriggerAt: number;
  private timeline: TimelineEntry[] = [];
  private majorBusyUntil = 0;
  private lastKind: EventKind | null = null;
  private readonly runningUntil = new Map<EventKind, number>();

  constructor(
    seed: string,
    private readonly sector: SectorConfig,
  ) {
    this.rng = new Rng(`${seed}|events|${sector.id}`);
    this.nextTriggerAt = EVENT_BALANCE.firstEventAtSec + this.rng.float(0, 10);
  }

  /** Événements avec durée en cours (utile pour l'interface). */
  isRunning(kind: EventKind): boolean {
    return (this.runningUntil.get(kind) ?? 0) > this.elapsed;
  }

  tick(dt: number): DirectorSignal[] {
    this.elapsed += dt;
    const out: DirectorSignal[] = [];

    if (this.elapsed >= this.nextTriggerAt) this.trigger();

    const due = this.timeline.filter((e) => e.at <= this.elapsed);
    if (due.length > 0) {
      this.timeline = this.timeline.filter((e) => e.at > this.elapsed);
      due.sort((a, b) => a.at - b.at);
      for (const entry of due) out.push(entry.signal);
    }
    return out;
  }

  private trigger(): void {
    const [minGap, maxGap] = this.sector.eventInterval;
    const majorBusy = this.majorBusyUntil > this.elapsed;
    const eligible = this.sector.events.filter((kind) => {
      if (kind === this.lastKind && this.sector.events.length > 1) return false;
      return !(EVENT_DEFS[kind].major && majorBusy);
    });
    if (eligible.length === 0) {
      this.nextTriggerAt = this.elapsed + 5;
      return;
    }
    const kind = this.rng.pick(eligible);
    const def = EVENT_DEFS[kind];
    this.lastKind = kind;
    this.nextTriggerAt = this.elapsed + this.rng.float(minGap, maxGap);

    const startAt = this.elapsed + def.warnSec;
    if (def.warnSec > 0) {
      this.timeline.push({
        at: this.elapsed,
        signal: { kind, phase: 'warn', duration: def.durationSec },
      });
    }
    this.timeline.push({
      at: startAt,
      signal: { kind, phase: 'start', duration: def.durationSec },
    });
    if (def.durationSec > 0) {
      this.timeline.push({
        at: startAt + def.durationSec,
        signal: { kind, phase: 'end', duration: def.durationSec },
      });
      this.runningUntil.set(kind, startAt + def.durationSec);
    }
    if (def.major) this.majorBusyUntil = startAt + def.durationSec + 3;
  }
}
