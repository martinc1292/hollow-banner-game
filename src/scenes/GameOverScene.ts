import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { THEME } from '@/ui/UITheme';
import { addVignette, drawSeparator } from '@/ui/UIHelpers';
import { gameState } from '@/systems/GameState';
import { saveManager } from '@/systems/SaveManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.GAME_OVER });
  }

  create(): void {
    const { width, height } = this.scale;

    saveManager.clearSave();
    gameState.reset();

    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1);
    addVignette(this, width, height);

    this.add.text(width / 2, height / 2 - 90, 'DERROTA', {
      ...THEME.fonts.title,
      fontSize: '72px',
      color: '#c03030',
    }).setOrigin(0.5);

    drawSeparator(this, width / 2 - 220, height / 2 - 26, 440, 0xc03030, 0.5);

    this.add.text(width / 2, height / 2 + 4, 'El estandarte ha caído.', {
      ...THEME.fonts.dialogue,
      fontSize: '22px',
      color: '#8a5050',
    }).setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 80, 'VOLVER AL MENÚ', () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      ...THEME.fonts.button,
      fontSize: '22px',
    });
  }
}
