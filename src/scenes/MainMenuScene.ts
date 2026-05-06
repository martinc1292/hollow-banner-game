import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.MAIN_MENU });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 80, 'Hollow Banner', {
        fontSize: '64px',
        color: '#ffffff',
        fontFamily: 'serif',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 40, 'Iniciar run', () => {
      this.scene.start(SceneKeys.PARTY_SELECT);
    });
  }
}
