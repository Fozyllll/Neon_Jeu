import Phaser from 'phaser';
import { PLAYER } from '../config/balance';
import type { PlayerStats } from '../types';
import { moveCircle } from '../world/collision';
import type { GameMap } from '../types';

export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image | null;
  x: number;
  y: number;
  aimAngle = 0;
  private invulnFlash = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, glow: boolean) {
    this.x = x;
    this.y = y;
    this.sprite = scene.add.image(x, y, 'player').setDepth(15);
    this.glow = glow
      ? scene.add
          .image(x, y, 'glow')
          .setDepth(14)
          .setTint(color)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.5)
          .setScale(0.85)
      : null;
  }

  move(map: GameMap, dx: number, dy: number): void {
    const result = moveCircle(map, this.x, this.y, dx, dy, PLAYER.radius);
    this.x = result.x;
    this.y = result.y;
  }

  aimAt(px: number, py: number): void {
    this.aimAngle = Math.atan2(py - this.y, px - this.x);
  }

  sync(invulnerable: boolean): void {
    this.sprite.setPosition(this.x, this.y).setRotation(this.aimAngle);
    this.glow?.setPosition(this.x, this.y);
    if (invulnerable) {
      this.invulnFlash += 1;
      this.sprite.setAlpha(this.invulnFlash % 6 < 3 ? 0.4 : 1);
    } else {
      this.sprite.setAlpha(1);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow?.destroy();
  }
}

export function baseSpeedFor(stats: PlayerStats, sprinting: boolean): number {
  return sprinting ? stats.speed * 1.6 : stats.speed;
}
