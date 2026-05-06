import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.GAME_OVER });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'Game Over', {
        fontSize: '56px',
        color: '#cc3333',
        fontFamily: 'serif',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 40, 'Volver al menú', () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    });
  }
}
