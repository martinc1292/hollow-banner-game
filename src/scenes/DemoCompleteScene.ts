import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { THEME } from '@/ui/UITheme';
import { addVignette, drawSeparator } from '@/ui/UIHelpers';
import { gameState } from '@/systems/GameState';
import { saveManager } from '@/systems/SaveManager';

export class DemoCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.DEMO_COMPLETE });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1);
    addVignette(this, width, height);

    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 80; x < width; x += 96) {
      grid.lineBetween(x, 80, x, height - 80);
    }
    for (let y = 96; y < height; y += 72) {
      grid.lineBetween(88, y, width - 88, y);
    }

    this.add.text(width / 2, height / 2 - 116, 'DEMO COMPLETADA', {
      ...THEME.fonts.title,
      fontSize: '52px',
    }).setOrigin(0.5);

    drawSeparator(this, width / 2 - 280, height / 2 - 56, 560, THEME.accent, 0.5);

    this.add.text(width / 2, height / 2 - 32, 'Gracias por jugar Hollow Banner.', {
      ...THEME.fonts.heading,
      fontSize: '24px',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 14, 'El estandarte sigue en pie. El Acto 2 queda para otra marcha.', {
      ...THEME.fonts.dialogue,
      fontSize: '17px',
      color: THEME.textPrimary,
      align: 'center',
      wordWrap: { width: 720, useAdvancedWrap: true },
    }).setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 92, 'VOLVER AL MENÚ', () => {
      saveManager.clearSave();
      gameState.reset();
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      ...THEME.fonts.button,
      fontSize: '22px',
    });
  }
}
