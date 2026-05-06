import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
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

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0808);

    this.add
      .text(width / 2, height / 2 - 80, 'DERROTA', {
        fontSize: '72px',
        color: '#cc3333',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 20, 'El estandarte ha caído.', {
        fontSize: '22px',
        color: '#7a5a5a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 60, 'Volver al menú', () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      fontSize: '28px',
      color: '#d5c7a7',
      fontFamily: 'Georgia, serif',
    });
  }
}
