import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { PartySelectScene } from '@/scenes/PartySelectScene';
import { MapScene } from '@/scenes/MapScene';
import { BattleScene } from '@/scenes/BattleScene';
import { RewardScene } from '@/scenes/RewardScene';
import { GameOverScene } from '@/scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a1a',
  scene: [
    BootScene,
    MainMenuScene,
    PartySelectScene,
    MapScene,
    BattleScene,
    RewardScene,
    GameOverScene,
  ],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
