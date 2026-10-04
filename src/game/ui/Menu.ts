import Phaser from 'phaser';
import { VIEW_W } from '../config/balance';
import { KEY } from '../config/keys';
import { audio } from '../services';
import { makeText, uiColor } from './theme';

export interface MenuItem {
  label: () => string;
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  enabled?: () => boolean;
}

export interface MenuOptions {
  x: number;
  y: number;
  spacing?: number;
  size?: number;
  align?: 'center' | 'left';
  wrap?: number;
  onFocus?: (index: number) => void;
  onBack?: () => void;
  /** Si fourni, la liste défile pour tenir dans cette zone au lieu de déborder de l'écran. */
  viewport?: { top: number; height: number };
  /** Faux pour un menu secondaire (ex. bouton isolé) qui ne doit pas capter les flèches/Entrée
   * globales de la scène et entrer en conflit avec le menu principal. Vrai par défaut. */
  keyboardNav?: boolean;
}

/** Liste verticale navigable au clavier (flèches / W-S, Entrée), à la souris et au doigt. */
export class Menu {
  index = 0;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly container?: Phaser.GameObjects.Container;
  private readonly itemY: number[] = [];
  private scrollY = 0;
  private locked = false;
  private readonly handler: (event: KeyboardEvent) => void;
  private readonly wheelHandler?: (
    pointer: Phaser.Input.Pointer,
    objects: unknown,
    dx: number,
    dy: number,
  ) => void;
  private dragPointerId: number | null = null;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragDownHandler?: (p: Phaser.Input.Pointer) => void;
  private dragMoveHandler?: (p: Phaser.Input.Pointer) => void;
  private dragEndHandler?: (p: Phaser.Input.Pointer) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly items: MenuItem[],
    private readonly options: MenuOptions,
  ) {
    const spacing = options.spacing ?? 40;
    const center = (options.align ?? 'center') === 'center';
    const vp = options.viewport;
    if (vp) this.container = scene.add.container(0, 0);

    items.forEach((item, i) => {
      const localY = i * spacing;
      this.itemY.push(localY);
      const text = makeText(
        scene,
        options.x,
        vp ? localY : options.y + localY,
        item.label(),
        options.size ?? 24,
        'text',
        {
          origin: center ? [0.5, 0.5] : [0, 0.5],
          wrap: options.wrap,
        },
      );
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.focus(i, true));
      text.on('pointerdown', () => {
        this.focus(i, true);
        if (!this.isEnabled(i)) {
          audio.play('error');
          return;
        }
        if (item.onSelect) this.select();
        else if (item.onRight) this.adjust(1);
      });
      this.texts.push(text);
      this.container?.add(text);
    });

    if (vp && this.container) {
      this.container.setY(options.y - this.scrollY);
      const maskShape = scene.make.graphics({});
      maskShape.fillStyle(0xffffff);
      maskShape.fillRect(0, vp.top, VIEW_W, vp.height);
      this.container.setMask(maskShape.createGeometryMask());
      this.wheelHandler = (_p, _o, _dx, dy) => this.scrollBy(dy * 0.4);
      scene.input.on('wheel', this.wheelHandler);
      this.dragDownHandler = (p: Phaser.Input.Pointer) => {
        if (p.y < vp.top || p.y > vp.top + vp.height) return;
        this.dragPointerId = p.id;
        this.dragStartY = p.y;
        this.dragStartScroll = this.scrollY;
      };
      this.dragMoveHandler = (p: Phaser.Input.Pointer) => {
        if (p.id !== this.dragPointerId) return;
        this.scrollBy(this.dragStartScroll - (p.y - this.dragStartY) - this.scrollY);
      };
      this.dragEndHandler = (p: Phaser.Input.Pointer) => {
        if (p.id === this.dragPointerId) this.dragPointerId = null;
      };
      scene.input.on('pointerdown', this.dragDownHandler);
      scene.input.on('pointermove', this.dragMoveHandler);
      scene.input.on('pointerup', this.dragEndHandler);
      scene.input.on('pointerupoutside', this.dragEndHandler);
    }

    if (options.onBack) {
      const back = makeText(scene, 14, 14, '‹ Retour', 13, 'dim', {
        origin: [0, 0],
        fixedSize: true,
      });
      back.setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setColor(uiColor('accent')));
      back.on('pointerout', () => back.setColor(uiColor('dim')));
      back.on('pointerdown', () => {
        audio.play('click');
        options.onBack?.();
      });
    }

    this.handler = (event: KeyboardEvent) => this.onKey(event);
    if (options.keyboardNav ?? true) scene.input.keyboard?.on('keydown', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.refresh();
    options.onFocus?.(this.index);
  }

  private scrollBy(delta: number): void {
    const vp = this.options.viewport;
    if (!vp || !this.container) return;
    const spacing = this.options.spacing ?? 40;
    const contentHeight = (this.itemY[this.itemY.length - 1] ?? 0) + spacing;
    const maxScroll = Math.max(0, contentHeight - vp.height);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.container.setY(this.options.y - this.scrollY);
  }

  private ensureVisible(index: number): void {
    const vp = this.options.viewport;
    if (!vp || !this.container) return;
    const spacing = this.options.spacing ?? 40;
    const y = this.itemY[index] ?? 0;
    const margin = spacing * 0.6;
    if (y - this.scrollY < margin) this.scrollBy(y - this.scrollY - margin);
    else if (y - this.scrollY > vp.height - margin)
      this.scrollBy(y - this.scrollY - (vp.height - margin));
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  focus(index: number, silent = false): void {
    const clamped = (index + this.items.length) % this.items.length;
    if (clamped === this.index && silent) return;
    this.index = clamped;
    if (!silent) audio.play('click');
    this.refresh();
    this.ensureVisible(this.index);
    this.options.onFocus?.(this.index);
  }

  refresh(): void {
    this.items.forEach((item, i) => {
      const focused = i === this.index;
      const enabled = this.isEnabled(i);
      const label = item.label();
      const text = this.texts[i] as Phaser.GameObjects.Text;
      text.setText(focused ? `» ${label} «` : label);
      text.setColor(!enabled ? uiColor('dim') : focused ? uiColor('accent') : uiColor('text'));
      text.setAlpha(enabled ? 1 : 0.6);
    });
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.handler);
    if (this.wheelHandler) this.scene.input.off('wheel', this.wheelHandler);
    if (this.dragDownHandler) this.scene.input.off('pointerdown', this.dragDownHandler);
    if (this.dragMoveHandler) this.scene.input.off('pointermove', this.dragMoveHandler);
    if (this.dragEndHandler) {
      this.scene.input.off('pointerup', this.dragEndHandler);
      this.scene.input.off('pointerupoutside', this.dragEndHandler);
    }
    for (const text of this.texts) text.destroy();
    this.texts.length = 0;
    this.container?.destroy();
  }

  private isEnabled(i: number): boolean {
    return this.items[i]?.enabled?.() ?? true;
  }

  private select(): void {
    const item = this.items[this.index];
    if (!item) return;
    if (!this.isEnabled(this.index)) {
      audio.play('error');
      return;
    }
    audio.play('click');
    item.onSelect?.();
    this.refresh();
  }

  private adjust(direction: -1 | 1): void {
    const item = this.items[this.index];
    if (!item || !this.isEnabled(this.index)) return;
    const handler = direction > 0 ? item.onRight : item.onLeft;
    if (!handler) return;
    audio.play('click');
    handler();
    this.refresh();
  }

  private onKey(event: KeyboardEvent): void {
    if (this.locked) return;
    switch (event.keyCode) {
      case KEY.UP:
      case KEY.W:
        this.focus(this.index - 1);
        break;
      case KEY.DOWN:
      case KEY.S:
        this.focus(this.index + 1);
        break;
      case KEY.LEFT:
      case KEY.A:
        this.adjust(-1);
        break;
      case KEY.RIGHT:
      case KEY.D:
        this.adjust(1);
        break;
      case KEY.ENTER:
      case KEY.SPACE: {
        const item = this.items[this.index];
        if (item?.onSelect) this.select();
        else if (item?.onRight) this.adjust(1);
        break;
      }
      case KEY.ESC:
        this.options.onBack?.();
        break;
    }
  }
}
