import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';

export class PartySelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.PARTY_SELECT });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'Seleccionar party (a implementar)', {
        fontSize: '32px',
        color: '#aaaaaa',
        fontFamily: 'sans-serif',
      })
      .setOrigin(0.5);

    makeTextButton(this, width / 2, height / 2 + 40, 'Continuar', () => {
      this.scene.start(SceneKeys.MAP);
    });
  }
}
