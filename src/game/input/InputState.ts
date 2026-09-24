import type Phaser from 'phaser';
import type { KeyAction } from '../types';
import { KEY_ACTIONS } from '../config/keys';

/** Lit l'état clavier + souris/tactile selon une configuration de touches donnée. */
export class InputState {
  private readonly down = new Set<number>();
  private readonly justDown = new Set<number>();
  pointerX = 0;
  pointerY = 0;
  pointerDown = false;
  private keys: Record<KeyAction, number>;
  private readonly keyDownHandler: (e: KeyboardEvent) => void;
  private readonly keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    keys: Record<KeyAction, number>,
  ) {
    this.keys = keys;
    this.keyDownHandler = (e) => {
      if (!this.down.has(e.keyCode)) this.justDown.add(e.keyCode);
      this.down.add(e.keyCode);
    };
    this.keyUpHandler = (e) => this.down.delete(e.keyCode);
    scene.input.keyboard?.on('keydown', this.keyDownHandler);
    scene.input.keyboard?.on('keyup', this.keyUpHandler);
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerX = p.worldX;
      this.pointerY = p.worldY;
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerDown = true;
      this.pointerX = p.worldX;
      this.pointerY = p.worldY;
    });
    scene.input.on('pointerup', () => (this.pointerDown = false));
  }

  setKeys(keys: Record<KeyAction, number>): void {
    this.keys = keys;
  }

  isDown(action: KeyAction): boolean {
    return this.down.has(this.keys[action]);
  }

  /** Vrai seulement à la frame où la touche vient d'être pressée ; à appeler une fois par frame. */
  consumeJustDown(action: KeyAction): boolean {
    const code = this.keys[action];
    if (this.justDown.has(code)) {
      this.justDown.delete(code);
      return true;
    }
    return false;
  }

  endFrame(): void {
    this.justDown.clear();
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.keyDownHandler);
    this.scene.input.keyboard?.off('keyup', this.keyUpHandler);
  }
}

export { KEY_ACTIONS };
