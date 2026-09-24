import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './game/config/balance';
import { BootScene } from './game/scenes/BootScene';
import { TitleScene } from './game/scenes/TitleScene';
import { SectorSelectScene } from './game/scenes/SectorSelectScene';
import { GameScene } from './game/scenes/GameScene';
import { PauseScene } from './game/scenes/PauseScene';
import { UpgradeScene } from './game/scenes/UpgradeScene';
import { GameOverScene, VictoryScene } from './game/scenes/ResultScene';
import { HelpScene } from './game/scenes/HelpScene';
import { SettingsScene } from './game/scenes/SettingsScene';
import { DevPanelScene } from './game/scenes/DevPanelScene';
import './styles/main.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05060f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_W,
    height: VIEW_H,
    min: { width: 320, height: 180 },
  },
  physics: { default: undefined },
  scene: [
    BootScene,
    TitleScene,
    SectorSelectScene,
    GameScene,
    PauseScene,
    UpgradeScene,
    GameOverScene,
    VictoryScene,
    HelpScene,
    SettingsScene,
    DevPanelScene,
  ],
  render: { pixelArt: false, antialias: true, roundPixels: true },
  disableContextMenu: true,
};

const game = new Phaser.Game(config);

// Empêche la molette et les flèches de faire défiler la page pendant le jeu.
window.addEventListener(
  'keydown',
  (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
      e.preventDefault();
  },
  { passive: false },
);

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
