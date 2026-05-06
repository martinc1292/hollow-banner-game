import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { saveManager } from '@/systems/SaveManager';
import { gameState } from '@/systems/GameState';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.MAIN_MENU });
  }

  preload(): void {
    this.load.image('menu-bg', 'assets/backgrounds/menu.png');
  }

  create(): void {
    const { width, height } = this.scale;

    if (this.textures.exists('menu-bg')) {
      this.add.image(width / 2, height / 2, 'menu-bg')
        .setDisplaySize(width, height);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0e0c0a);
    }

    // Subtle decorative lines
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x2a2520, 0.6);
    for (let x = 0; x < width; x += 80) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) gfx.lineBetween(0, y, width, y);
    gfx.lineStyle(2, 0x3a3020, 0.8);
    gfx.lineBetween(width / 2 - 280, height / 2 - 180, width / 2 + 280, height / 2 - 180);

    this.add
      .text(width / 2, height / 2 - 120, 'HOLLOW BANNER', {
        fontSize: '72px',
        color: '#f0d37a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 64, 'el estandarte de los caídos', {
        fontSize: '20px',
        color: '#7a6e5a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    const hasSave = saveManager.hasSave();

    if (hasSave) {
      makeTextButton(this, width / 2, height / 2 + 18, 'Continuar run', () => {
        const loaded = saveManager.load();
        if (loaded) {
          this.scene.start(SceneKeys.MAP);
        } else {
          this.scene.restart();
        }
      }, {
        fontSize: '32px',
        color: '#f0d37a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      });

      makeTextButton(this, width / 2, height / 2 + 78, 'Nueva run', () => {
        this.showNewRunConfirm();
      }, {
        fontSize: '24px',
        color: '#9f9070',
        fontFamily: 'Georgia, serif',
      });
    } else {
      makeTextButton(this, width / 2, height / 2 + 38, 'Iniciar run', () => {
        this.scene.start(SceneKeys.PARTY_SELECT);
      }, {
        fontSize: '32px',
        color: '#f0d37a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      });
    }
  }

  private showNewRunConfirm(): void {
    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setInteractive().setDepth(100);
    const panel = this.add.rectangle(width / 2, height / 2, 480, 180, 0x1c1714, 0.98)
      .setStrokeStyle(2, 0x6a5a42).setDepth(101);
    const msg = this.add.text(width / 2, height / 2 - 40, '¿Abandonar la run actual?', {
      fontSize: '22px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setDepth(102);

    const confirmBtn = makeTextButton(this, width / 2 - 80, height / 2 + 30, 'Sí, nueva run', () => {
      saveManager.clearSave();
      gameState.reset();
      [shade, panel, msg, confirmBtn, cancelBtn].forEach((o) => o.destroy());
      this.scene.start(SceneKeys.PARTY_SELECT);
    }, { fontSize: '20px', color: '#ff9f9f', fontFamily: 'Georgia, serif' });
    confirmBtn.setDepth(102);

    const cancelBtn = makeTextButton(this, width / 2 + 100, height / 2 + 30, 'Cancelar', () => {
      [shade, panel, msg, confirmBtn, cancelBtn].forEach((o) => o.destroy());
    }, { fontSize: '20px', color: '#aaaaaa', fontFamily: 'Georgia, serif' });
    cancelBtn.setDepth(102);
  }
}
