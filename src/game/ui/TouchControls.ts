import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config/balance';

/**
 * Manette virtuelle tactile : un joystick de déplacement en bas à gauche et un
 * bouton d'action ("E") en bas à droite. Ne s'active que sur un appareil tactile,
 * et laisse le reste de l'écran libre pour viser/tirer au doigt comme à la souris.
 */
export class TouchControls {
  readonly active: boolean;
  private readonly stickBase = { x: 88, y: VIEW_H - 88 };
  private readonly stickRadius = 44;
  private readonly actionPos = { x: VIEW_W - 66, y: VIEW_H - 66 };
  private readonly actionRadius = 32;
  private stickPointerId: number | null = null;
  private actionPointerId: number | null = null;
  private vec = { x: 0, y: 0 };
  private acting = false;
  private nub?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene) {
    this.active = scene.sys.game.device.input.touch;
    if (!this.active) return;

    const depth = 900;
    scene.add
      .circle(this.stickBase.x, this.stickBase.y, this.stickRadius, 0x38e8ff, 0.12)
      .setScrollFactor(0)
      .setDepth(depth)
      .setStrokeStyle(2, 0x38e8ff, 0.5);
    this.nub = scene.add
      .circle(this.stickBase.x, this.stickBase.y, 18, 0x38e8ff, 0.35)
      .setScrollFactor(0)
      .setDepth(depth);

    const btn = scene.add
      .circle(this.actionPos.x, this.actionPos.y, this.actionRadius, 0xff3df2, 0.22)
      .setScrollFactor(0)
      .setDepth(depth)
      .setStrokeStyle(2, 0xff3df2, 0.6);
    scene.add
      .text(this.actionPos.x, this.actionPos.y, 'E', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    void btn;

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.inZone(p.x, p.y, this.actionPos, this.actionRadius + 12)) {
        this.actionPointerId = p.id;
        this.acting = true;
        return;
      }
      if (
        this.stickPointerId === null &&
        this.inZone(p.x, p.y, this.stickBase, this.stickRadius + 30)
      ) {
        this.stickPointerId = p.id;
        this.updateStick(p.x, p.y);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) this.updateStick(p.x, p.y);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) {
        this.stickPointerId = null;
        this.vec = { x: 0, y: 0 };
        this.nub?.setPosition(this.stickBase.x, this.stickBase.y);
      }
      if (p.id === this.actionPointerId) {
        this.actionPointerId = null;
        this.acting = false;
      }
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  /** Vrai si ce point de l'écran appartient à la manette (à exclure de la visée/tir). */
  isReserved(x: number, y: number): boolean {
    if (!this.active) return false;
    return (
      this.inZone(x, y, this.stickBase, this.stickRadius + 30) ||
      this.inZone(x, y, this.actionPos, this.actionRadius + 12)
    );
  }

  get vector(): { x: number; y: number } {
    return this.vec;
  }

  get actionHeld(): boolean {
    return this.acting;
  }

  private inZone(
    x: number,
    y: number,
    center: { x: number; y: number },
    radius: number,
  ): boolean {
    return Phaser.Math.Distance.Between(x, y, center.x, center.y) <= radius;
  }

  private updateStick(x: number, y: number): void {
    const dx = x - this.stickBase.x;
    const dy = y - this.stickBase.y;
    const dist = Math.min(Math.hypot(dx, dy), this.stickRadius);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * dist;
    const ny = Math.sin(angle) * dist;
    this.nub?.setPosition(this.stickBase.x + nx, this.stickBase.y + ny);
    const deadzone = 8;
    this.vec =
      dist > deadzone
        ? { x: nx / this.stickRadius, y: ny / this.stickRadius }
        : { x: 0, y: 0 };
  }
}
