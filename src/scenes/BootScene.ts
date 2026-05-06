import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.BOOT });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'Hollow Banner', {
        fontSize: '64px',
        color: '#ffffff',
        fontFamily: 'serif',
      })
      .setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    });
  }
}
