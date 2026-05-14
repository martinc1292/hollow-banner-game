import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { THEME } from '@/ui/UITheme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.BOOT });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1);
    this.add.text(width / 2, height / 2, 'HOLLOW BANNER', {
      ...THEME.fonts.title,
      fontSize: '64px',
    }).setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    });
  }
}
