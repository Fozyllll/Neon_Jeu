import type Phaser from 'phaser';
import type { EffectsProfile } from './profile';

/** Particules, secousses et textes flottants, avec respect des options d'accessibilité. */
export class Effects {
  private readonly emitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();

  constructor(
    private readonly scene: Phaser.Scene,
    private profile: EffectsProfile,
  ) {}

  setProfile(profile: EffectsProfile): void {
    this.profile = profile;
  }

  burst(x: number, y: number, color: number, count: number): void {
    const n = Math.round(count * this.profile.particleFactor);
    if (n <= 0) return;
    this.emitterFor(color).explode(n, x, y);
  }

  shake(intensity = 0.004, durationMs = 120): void {
    if (!this.profile.shake) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  floatText(x: number, y: number, text: string, color: string): void {
    if (!this.profile.floatingText) return;
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '14px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.scene.tweens.add({
      targets: label,
      y: y - 26,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  destroy(): void {
    for (const emitter of this.emitters.values()) emitter.destroy();
    this.emitters.clear();
  }

  private emitterFor(color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    let emitter = this.emitters.get(color);
    if (!emitter) {
      emitter = this.scene.add.particles(0, 0, 'spark', {
        lifespan: { min: 240, max: 520 },
        speed: { min: 50, max: 200 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: this.profile.glow ? 'ADD' : 'NORMAL',
        tint: color,
        emitting: false,
      });
      emitter.setDepth(25);
      this.emitters.set(color, emitter);
    }
    return emitter;
  }
}
