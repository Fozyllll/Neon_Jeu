import Phaser from 'phaser';
import {
  ENEMIES,
  ENEMY_ALERT_DELAY_SEC,
  ENEMY_CONTACT_COOLDOWN_SEC,
  ENEMY_GUARD_RADIUS_PX,
  type EnemyDef,
} from '../config/enemies';
import type { Palette } from '../config/palette';
import type { EnemyKind, GameMap } from '../types';
import { clamp } from '../utils/math';
import { hasLineOfSight, moveCircle } from '../world/collision';
import type { FlowField } from '../world/flowField';
import { pxToTile, tileCenter } from '../world/grid';

export interface EnemyContext {
  map: GameMap;
  flow: FlowField;
  player: { x: number; y: number; radius: number };
  playerInBase: boolean;
  playerSprinting: boolean;
  dt: number;
  others: readonly Enemy[];
  flashAllowed: boolean;
  damagePlayer(amount: number, fromX: number, fromY: number): void;
  fireBolt(x: number, y: number, angle: number, speed: number, damage: number): void;
  alertGroup(groupId: number, source: Enemy): void;
}

export type EnemyState = 'idle' | 'alert' | 'chase' | 'telegraph' | 'cooldown';

export interface EnemyInit {
  kind: EnemyKind;
  x: number;
  y: number;
  groupId: number;
  guardX?: number;
  guardY?: number;
}

export class Enemy {
  readonly def: EnemyDef;
  readonly sprite: Phaser.GameObjects.Image;
  readonly groupId: number;
  x: number;
  y: number;
  hp: number;
  state: EnemyState = 'idle';
  alive = true;
  aimAngle = 0;

  private readonly glow: Phaser.GameObjects.Image | null;
  private readonly marker: Phaser.GameObjects.Text;
  private homeX: number;
  private homeY: number;
  private stateTime = 0;
  private contactCd = 0;
  private giveUpCd = 0;
  private chaseTimer = Infinity;
  private lostSight = 0;
  private aggressive = false;
  private fireCd = 0.8;
  private hitFlash = 0;
  private knockX = 0;
  private knockY = 0;
  private los = false;
  private losTimer = Math.random() * 0.12;
  private wanderX: number;
  private wanderY: number;
  private wanderTimer = 0;

  constructor(scene: Phaser.Scene, init: EnemyInit, palette: Palette, glow: boolean) {
    this.def = ENEMIES[init.kind];
    this.groupId = init.groupId;
    this.x = init.x;
    this.y = init.y;
    this.homeX = init.guardX ?? init.x;
    this.homeY = init.guardY ?? init.y;
    this.wanderX = init.x;
    this.wanderY = init.y;
    this.hp = this.def.hp;
    const color = palette[init.kind];
    this.sprite = scene.add.image(init.x, init.y, `enemy-${init.kind}`).setDepth(10);
    this.glow = glow
      ? scene.add
          .image(init.x, init.y, 'glow')
          .setDepth(9)
          .setTint(color)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.4)
          .setScale(this.def.radius / 11)
      : null;
    this.marker = scene.add
      .text(init.x, init.y, '!', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ff9a3c',
        stroke: '#000000',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setVisible(false);
    this.aimAngle = Math.random() * Math.PI * 2;
  }

  get maxHp(): number {
    return this.def.hp;
  }

  /** Progression 0..1 de l'avertissement avant un tir (sentinelle). */
  get telegraphProgress(): number {
    if (this.state !== 'telegraph') return 0;
    return clamp(this.stateTime / (this.def.telegraphSec ?? 1), 0, 1);
  }

  forceAlert(): void {
    if (this.state === 'idle' && this.def.kind !== 'sentinel' && this.giveUpCd <= 0) this.toAlert();
  }

  /** Poursuite obstinée (vagues d'événement). */
  forceChase(): void {
    if (this.def.kind === 'sentinel') return;
    this.state = 'chase';
    this.stateTime = 0;
    this.aggressive = true;
    this.chaseTimer = Infinity;
    this.lostSight = 0;
    this.marker.setVisible(true);
  }

  /** Retourne true si l'ennemi est détruit. */
  takeDamage(amount: number, fromAngle: number, flashAllowed: boolean): boolean {
    this.hp = Math.max(0, this.hp - amount);
    if (flashAllowed) this.hitFlash = 0.07;
    this.knockX = Math.cos(fromAngle) * 150;
    this.knockY = Math.sin(fromAngle) * 150;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    if (this.def.kind !== 'sentinel' && (this.state === 'idle' || this.state === 'alert')) {
      this.state = 'chase';
      this.stateTime = 0;
      this.lostSight = 0;
      this.chaseTimer = this.def.chaseSec ?? Infinity;
      this.giveUpCd = 0;
    }
    return false;
  }

  update(ctx: EnemyContext): void {
    if (!this.alive) return;
    const dt = ctx.dt;
    this.contactCd = Math.max(0, this.contactCd - dt);
    this.giveUpCd = Math.max(0, this.giveUpCd - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    const dx = ctx.player.x - this.x;
    const dy = ctx.player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.state === 'idle' && dist > 1100) {
      this.syncSprite();
      return;
    }

    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = 0.12;
      this.los = hasLineOfSight(ctx.map, this.x, this.y, ctx.player.x, ctx.player.y);
    }

    if (this.def.kind === 'sentinel') this.updateSentinel(ctx, dist);
    else this.updateMobile(ctx, dist);

    if (Math.abs(this.knockX) > 1 || Math.abs(this.knockY) > 1) {
      this.moveBy(ctx, this.knockX * dt, this.knockY * dt);
      const decay = Math.max(0, 1 - 9 * dt);
      this.knockX *= decay;
      this.knockY *= decay;
    }

    if (
      !ctx.playerInBase &&
      dist < this.def.radius + ctx.player.radius + 2 &&
      this.contactCd <= 0
    ) {
      ctx.damagePlayer(this.def.contactDamage, this.x, this.y);
      this.contactCd = ENEMY_CONTACT_COOLDOWN_SEC;
      const away = Math.atan2(-dy, -dx);
      this.knockX = Math.cos(away) * 170;
      this.knockY = Math.sin(away) * 170;
    }

    this.syncSprite();
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow?.destroy();
    this.marker.destroy();
  }

  private detects(ctx: EnemyContext, dist: number): boolean {
    if (ctx.playerInBase) return false;
    if (dist > this.def.detectRange) return false;
    if (dist < 70 || this.los) return true;
    // Le chasseur entend une accélération toute proche, même sans ligne de vue.
    return this.def.kind === 'hunter' && ctx.playerSprinting && dist < 260;
  }

  private toAlert(): void {
    this.state = 'alert';
    this.stateTime = 0;
    this.marker.setVisible(true);
  }

  private giveUp(cooldown: number): void {
    this.state = 'idle';
    this.stateTime = 0;
    this.giveUpCd = cooldown;
    this.aggressive = false;
    this.homeX = this.x;
    this.homeY = this.y;
    this.marker.setVisible(false);
  }

  private updateMobile(ctx: EnemyContext, dist: number): void {
    const dt = ctx.dt;
    switch (this.state) {
      case 'idle':
        if (this.giveUpCd <= 0 && this.detects(ctx, dist)) {
          this.toAlert();
          if (this.def.kind === 'scout') ctx.alertGroup(this.groupId, this);
          break;
        }
        this.wander(ctx);
        break;
      case 'alert':
        this.stateTime += dt;
        this.aimAngle = Math.atan2(ctx.player.y - this.y, ctx.player.x - this.x);
        if (this.stateTime >= ENEMY_ALERT_DELAY_SEC) {
          this.state = 'chase';
          this.stateTime = 0;
          this.chaseTimer = this.def.chaseSec ?? Infinity;
          this.lostSight = 0;
        }
        break;
      case 'chase': {
        if (ctx.playerInBase) {
          this.giveUp(0.5);
          break;
        }
        if (this.los && dist < this.def.detectRange * 1.6) this.lostSight = 0;
        else this.lostSight += dt;
        this.chaseTimer -= dt;
        const maxLost = this.aggressive ? 12 : 3.5;
        const maxDist = this.aggressive ? 1400 : 560;
        if (this.chaseTimer <= 0 || this.lostSight > maxLost || dist > maxDist) {
          this.giveUp(this.def.giveUpCooldownSec ?? 2);
          break;
        }
        this.chase(ctx);
        break;
      }
      default:
        this.state = 'idle';
    }
  }

  private chase(ctx: EnemyContext): void {
    let tx = ctx.player.x;
    let ty = ctx.player.y;
    if (!this.los) {
      const step = ctx.flow.nextStep(pxToTile(this.x), pxToTile(this.y));
      if (step) {
        const c = tileCenter(step.tx, step.ty);
        tx = c.x;
        ty = c.y;
      }
    }
    this.moveToward(ctx, tx, ty, this.def.speed);
    this.separate(ctx);
  }

  private wander(ctx: EnemyContext): void {
    this.wanderTimer -= ctx.dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 1.5 + Math.random() * 2;
      this.wanderX = this.homeX + (Math.random() - 0.5) * 80;
      this.wanderY = this.homeY + (Math.random() - 0.5) * 80;
    }
    if (Math.hypot(this.wanderX - this.x, this.wanderY - this.y) > 5) {
      this.moveToward(ctx, this.wanderX, this.wanderY, this.def.speed * 0.3);
    }
  }

  private updateSentinel(ctx: EnemyContext, dist: number): void {
    const dt = ctx.dt;
    const def = this.def;
    const toPlayer = Math.atan2(ctx.player.y - this.y, ctx.player.x - this.x);
    switch (this.state) {
      case 'idle': {
        const sees = this.detects(ctx, dist);
        if (sees) this.aimAngle = rotateToward(this.aimAngle, toPlayer, 3 * dt);
        else this.aimAngle += dt * 0.4;
        if (sees && this.fireCd <= 0) {
          this.state = 'telegraph';
          this.stateTime = 0;
          this.marker.setVisible(true).setText('‼');
          break;
        }
        const homeDist = Math.hypot(this.homeX - this.x, this.homeY - this.y);
        if (sees && dist > 210 && homeDist < ENEMY_GUARD_RADIUS_PX) {
          this.moveToward(ctx, ctx.player.x, ctx.player.y, def.speed);
        } else if (!sees && homeDist > 12) {
          this.moveToward(ctx, this.homeX, this.homeY, def.speed * 0.8);
        }
        break;
      }
      case 'telegraph': {
        this.stateTime += dt;
        const total = def.telegraphSec ?? 0.9;
        if (ctx.playerInBase) {
          this.state = 'idle';
          this.fireCd = 0.8;
          this.marker.setVisible(false);
          break;
        }
        if (this.stateTime < total * 0.6)
          this.aimAngle = rotateToward(this.aimAngle, toPlayer, 6 * dt);
        if (this.stateTime >= total) {
          ctx.fireBolt(this.x, this.y, this.aimAngle, def.boltSpeed ?? 250, def.rangedDamage ?? 12);
          this.state = 'cooldown';
          this.stateTime = 0;
          this.fireCd = def.fireCooldownSec ?? 2;
          this.marker.setVisible(false).setText('!');
        }
        break;
      }
      case 'cooldown':
        this.stateTime += dt;
        if (this.stateTime >= 0.5) this.state = 'idle';
        break;
      default:
        this.state = 'idle';
    }
  }

  private moveToward(ctx: EnemyContext, tx: number, ty: number, speed: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    const step = Math.min(len, speed * ctx.dt);
    this.moveBy(ctx, (dx / len) * step, (dy / len) * step);
    if (this.def.kind !== 'sentinel') this.aimAngle = Math.atan2(dy, dx);
  }

  private moveBy(ctx: EnemyContext, dx: number, dy: number): void {
    const result = moveCircle(ctx.map, this.x, this.y, dx, dy, this.def.radius);
    this.x = result.x;
    this.y = result.y;
  }

  /** Évite que les ennemis se superposent en un seul point. */
  private separate(ctx: EnemyContext): void {
    for (const other of ctx.others) {
      if (other === this || !other.alive) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const min = this.def.radius + other.def.radius;
      const d = Math.hypot(dx, dy);
      if (d > 0.001 && d < min) {
        const push = (min - d) * 3 * ctx.dt;
        this.moveBy(ctx, (dx / d) * push, (dy / d) * push);
      }
    }
  }

  private syncSprite(): void {
    this.sprite.setPosition(this.x, this.y).setRotation(this.aimAngle);
    this.glow?.setPosition(this.x, this.y);
    this.marker.setPosition(this.x, this.y - this.def.radius - 14);
    if (this.hitFlash > 0) this.sprite.setTintFill(0xffffff);
    else this.sprite.clearTint();
    if (this.state === 'idle' && this.marker.visible && this.def.kind !== 'sentinel') {
      this.marker.setVisible(false);
    }
  }
}

function rotateToward(current: number, target: number, maxStep: number): number {
  let diff = Phaser.Math.Angle.Wrap(target - current);
  diff = clamp(diff, -maxStep, maxStep);
  return current + diff;
}
