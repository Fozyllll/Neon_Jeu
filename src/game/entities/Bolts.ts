import type Phaser from 'phaser';
import type { GameMap } from '../types';
import { isWallAtPx } from '../world/grid';

export interface Bolt {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  friendly: boolean;
  active: boolean;
}

export interface BoltHooks {
  /** Retourne true si le projectile a touché une cible (il est alors retiré). */
  tryHit(bolt: Bolt): boolean;
  onWallHit(bolt: Bolt): void;
}

/** Projectiles du joueur et des sentinelles, avec réutilisation des sprites (pas d'allocation en jeu). */
export class BoltSystem {
  private readonly bolts: Bolt[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  spawn(
    x: number,
    y: number,
    angle: number,
    speed: number,
    life: number,
    damage: number,
    friendly: boolean,
  ): void {
    let bolt = this.bolts.find((b) => !b.active && b.friendly === friendly);
    if (!bolt) {
      const sprite = this.scene.add.image(x, y, friendly ? 'bolt' : 'ebolt').setDepth(12);
      bolt = { sprite, vx: 0, vy: 0, life: 0, damage: 0, friendly, active: false };
      this.bolts.push(bolt);
    }
    bolt.active = true;
    bolt.life = life;
    bolt.damage = damage;
    bolt.vx = Math.cos(angle) * speed;
    bolt.vy = Math.sin(angle) * speed;
    bolt.sprite.setPosition(x, y).setRotation(angle).setVisible(true).setActive(true);
  }

  update(dt: number, map: GameMap, hooks: BoltHooks): void {
    for (const bolt of this.bolts) {
      if (!bolt.active) continue;
      bolt.life -= dt;
      const steps = Math.max(1, Math.ceil((Math.hypot(bolt.vx, bolt.vy) * dt) / 8));
      let consumed = false;
      for (let i = 0; i < steps && !consumed; i++) {
        bolt.sprite.x += (bolt.vx * dt) / steps;
        bolt.sprite.y += (bolt.vy * dt) / steps;
        if (isWallAtPx(map, bolt.sprite.x, bolt.sprite.y)) {
          hooks.onWallHit(bolt);
          consumed = true;
        } else if (hooks.tryHit(bolt)) {
          consumed = true;
        }
      }
      if (!bolt.friendly) bolt.sprite.rotation += dt * 8;
      if (consumed || bolt.life <= 0) this.release(bolt);
    }
  }

  clear(): void {
    for (const bolt of this.bolts) this.release(bolt);
  }

  destroy(): void {
    for (const bolt of this.bolts) bolt.sprite.destroy();
    this.bolts.length = 0;
  }

  private release(bolt: Bolt): void {
    bolt.active = false;
    bolt.sprite.setVisible(false).setActive(false);
  }
}
