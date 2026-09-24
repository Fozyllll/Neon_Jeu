import Phaser from 'phaser';
import type { Palette } from '../config/palette';
import type { ResourceKind } from '../types';

export class ResourceNode {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image | null;
  private readonly tween: Phaser.Tweens.Tween;
  collected = false;

  constructor(
    scene: Phaser.Scene,
    readonly kind: ResourceKind,
    readonly x: number,
    readonly y: number,
    readonly valueMult: number,
    palette: Palette,
    glow: boolean,
  ) {
    this.sprite = scene.add.image(x, y, `res-${kind}`).setDepth(8);
    this.glow = glow
      ? scene.add
          .image(x, y, 'glow')
          .setDepth(7)
          .setTint(palette[kind])
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.55)
          .setScale(kind === 'core' || kind === 'component' ? 0.95 : 0.7)
      : null;
    this.tween = scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.92, to: 1.12 },
      duration: 700 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 600,
    });
  }

  /** Décale la position d'affichage (attraction de l'aimant). */
  moveTo(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.glow?.setPosition(x, y);
  }

  get px(): number {
    return this.sprite.x;
  }

  get py(): number {
    return this.sprite.y;
  }

  destroy(): void {
    this.collected = true;
    this.tween.stop();
    this.sprite.destroy();
    this.glow?.destroy();
  }
}
