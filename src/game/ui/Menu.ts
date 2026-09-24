import Phaser from 'phaser';
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
}

/** Liste verticale navigable au clavier (flèches / W-S, Entrée) et à la souris. */
export class Menu {
  index = 0;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private locked = false;
  private readonly handler: (event: KeyboardEvent) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly items: MenuItem[],
    private readonly options: MenuOptions,
  ) {
    const spacing = options.spacing ?? 40;
    const center = (options.align ?? 'center') === 'center';
    items.forEach((item, i) => {
      const text = makeText(
        scene,
        options.x,
        options.y + i * spacing,
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
    });

    this.handler = (event: KeyboardEvent) => this.onKey(event);
    scene.input.keyboard?.on('keydown', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.refresh();
    options.onFocus?.(this.index);
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
    for (const text of this.texts) text.destroy();
    this.texts.length = 0;
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
