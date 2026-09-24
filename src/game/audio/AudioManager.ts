import type { Settings } from '../save/types';

export type SfxName =
  | 'collect'
  | 'damage'
  | 'upgrade'
  | 'win'
  | 'lose'
  | 'alert'
  | 'shoot'
  | 'enemyDie'
  | 'click'
  | 'error';

type ContextCtor = typeof AudioContext;

/**
 * Audio 100 % synthétique (Web Audio) : aucun fichier sonore, donc aucune licence à gérer.
 * Le jeu reste jouable si l'audio est impossible : chaque méthode échoue silencieusement.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientStop: (() => void) | null = null;
  private blipTimer: number | null = null;
  private wantAmbient = false;
  private failed = false;

  constructor(private readonly getSettings: () => Settings) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend().catch(() => undefined);
        else void this.ctx.resume().catch(() => undefined);
      });
    }
  }

  get available(): boolean {
    return this.ctx !== null && !this.failed;
  }

  /** À appeler depuis un geste du joueur : les navigateurs interdisent la lecture automatique. */
  unlock(): void {
    if (this.failed) return;
    try {
      if (!this.ctx) {
        const Ctor: ContextCtor | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: ContextCtor }).webkitAudioContext;
        if (!Ctor) {
          this.failed = true;
          return;
        }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applySettings();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    } catch {
      this.failed = true;
    }
  }

  applySettings(): void {
    const s = this.getSettings();
    if (this.master) this.master.gain.value = s.masterVolume;
    if (this.musicGain) this.musicGain.gain.value = s.musicOn ? s.musicVolume * 0.6 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = s.sfxOn ? s.sfxVolume : 0;
    this.syncAmbient();
  }

  /** Demande l'ambiance de fond (jouée seulement si la musique est activée et l'audio débloqué). */
  setAmbient(wanted: boolean): void {
    this.wantAmbient = wanted;
    this.syncAmbient();
  }

  play(name: SfxName): void {
    if (!this.ctx || this.failed || !this.getSettings().sfxOn) return;
    try {
      switch (name) {
        case 'collect':
          this.tone(660, 0.09, 'triangle', 0.25);
          this.tone(990, 0.12, 'triangle', 0.22, undefined, 0.07);
          break;
        case 'damage':
          this.noise(0.25, 0.35, 900);
          this.tone(140, 0.25, 'sawtooth', 0.3, 60);
          break;
        case 'upgrade':
          [440, 554, 659, 880].forEach((f, i) =>
            this.tone(f, 0.12, 'square', 0.14, undefined, i * 0.08),
          );
          break;
        case 'win':
          [523, 659, 784, 1047, 1319].forEach((f, i) =>
            this.tone(f, 0.22, 'triangle', 0.24, undefined, i * 0.11),
          );
          break;
        case 'lose':
          this.tone(330, 0.45, 'sawtooth', 0.28, 110);
          this.tone(220, 0.7, 'sawtooth', 0.25, 55, 0.3);
          break;
        case 'alert':
          this.tone(880, 0.12, 'square', 0.16);
          this.tone(880, 0.12, 'square', 0.16, undefined, 0.2);
          break;
        case 'shoot':
          this.tone(900, 0.08, 'square', 0.08, 300);
          break;
        case 'enemyDie':
          this.noise(0.2, 0.3, 2500);
          this.tone(300, 0.2, 'sawtooth', 0.18, 80);
          break;
        case 'click':
          this.tone(520, 0.04, 'square', 0.08);
          break;
        case 'error':
          this.tone(180, 0.15, 'square', 0.16);
          break;
      }
    } catch {
      // Un son manquant ne doit jamais interrompre le jeu.
    }
  }

  private syncAmbient(): void {
    const shouldPlay = this.wantAmbient && !!this.ctx && !this.failed && this.getSettings().musicOn;
    if (shouldPlay && !this.ambientStop) this.startAmbient();
    else if (!shouldPlay && this.ambientStop) this.stopAmbient();
  }

  private startAmbient(): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
      gain.connect(out);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      filter.connect(gain);

      const oscillators: OscillatorNode[] = [55, 82.41, 110.6].map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0.22;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        return osc;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 140;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      const scale = [220, 261.6, 329.6, 392, 440, 523.3];
      const scheduleBlip = () => {
        if (!this.ctx || !this.musicGain) return;
        const freq = scale[Math.floor(Math.random() * scale.length)] as number;
        this.tone(freq, 0.9, 'sine', 0.05, undefined, 0, this.musicGain);
        this.blipTimer = window.setTimeout(scheduleBlip, 3500 + Math.random() * 4500);
      };
      this.blipTimer = window.setTimeout(scheduleBlip, 2500);

      this.ambientStop = () => {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        for (const osc of [...oscillators, lfo]) osc.stop(now + 0.7);
        window.setTimeout(() => gain.disconnect(), 800);
      };
    } catch {
      this.ambientStop = null;
    }
  }

  private stopAmbient(): void {
    if (this.blipTimer !== null) {
      window.clearTimeout(this.blipTimer);
      this.blipTimer = null;
    }
    try {
      this.ambientStop?.();
    } catch {
      // Le contexte a pu être fermé : rien à faire.
    }
    this.ambientStop = null;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    slideTo?: number,
    delay = 0,
    destination?: GainNode,
  ): void {
    const ctx = this.ctx;
    const out = destination ?? this.sfxGain;
    if (!ctx || !out) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== undefined)
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(duration: number, volume: number, cutoff: number): void {
    const ctx = this.ctx;
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start();
  }
}
