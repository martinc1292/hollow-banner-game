import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { gameState } from '@/systems/GameState';
import { saveManager } from '@/systems/SaveManager';

export class DemoCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.DEMO_COMPLETE });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x12100e, 1);

    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3a3024, 0.55);
    for (let x = 80; x < width; x += 96) {
      graphics.lineBetween(x, 80, x, height - 80);
    }
    for (let y = 96; y < height; y += 72) {
      graphics.lineBetween(88, y, width - 88, y);
    }

    this.add.text(width / 2, height / 2 - 116, 'Demo completada', {
      fontSize: '54px',
      color: '#f0d37a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 44, 'Gracias por jugar Hollow Banner.', {
      fontSize: '24px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 2, 'El estandarte sigue en pie. El Acto 2 queda para otra marcha.', {
      fontSize: '17px',
      color: '#a99e87',
      fontFamily: 'Georgia, serif',
      align: 'center',
      wordWrap: { width: 720, useAdvancedWrap: true },
    }).setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 92, 'Volver al menu', () => {
      saveManager.clearSave();
      gameState.reset();
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      fontSize: '24px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
  }
}
