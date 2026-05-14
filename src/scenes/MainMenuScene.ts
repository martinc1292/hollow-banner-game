import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { makeTextButton } from '@/ui/TextButton';
import { saveManager } from '@/systems/SaveManager';
import { gameState } from '@/systems/GameState';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';

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
        .setDisplaySize(width, height)
        .setTint(0x4a3a7a);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep);
    }

    addVignette(this, width, height);

    // Líneas decorativas sutiles en acento
    const gfx = this.add.graphics();
    gfx.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 0; x < width; x += 80) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) gfx.lineBetween(0, y, width, y);

    // Separador superior
    drawSeparator(this, width / 2 - 260, height / 2 - 190, 520);

    this.add
      .text(width / 2, height / 2 - 140, 'HOLLOW BANNER', {
        ...THEME.fonts.title,
        fontSize: '72px',
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 80, 'el estandarte de los caídos', {
        ...THEME.fonts.dialogue,
        fontSize: '18px',
        color: THEME.textDim,
      })
      .setOrigin(0.5);

    // Separador inferior del header
    drawSeparator(this, width / 2 - 180, height / 2 - 54, 360, THEME.accentDim, 0.4);

    const hasSave = saveManager.hasSave();

    if (hasSave) {
      makeTextButton(this, width / 2, height / 2 + 18, 'CONTINUAR RUN', () => {
        const loaded = saveManager.load();
        if (loaded) {
          this.scene.start(SceneKeys.MAP);
        } else {
          this.scene.restart();
        }
      }, {
        fontSize: '28px',
        letterSpacing: 4,
      });

      makeTextButton(this, width / 2, height / 2 + 78, 'NUEVA RUN', () => {
        this.showNewRunConfirm();
      }, {
        fontSize: '20px',
        color: THEME.textDim,
        letterSpacing: 3,
      });
    } else {
      makeTextButton(this, width / 2, height / 2 + 38, 'INICIAR RUN', () => {
        this.scene.start(SceneKeys.PARTY_SELECT);
      }, {
        fontSize: '28px',
        letterSpacing: 4,
      });
    }

    // Versión
    this.add.text(width - 16, height - 12, 'v0.1.0 — ACTO I', {
      ...THEME.fonts.hudSmall,
      color: THEME.accentDeepHex,
      letterSpacing: 2,
    }).setOrigin(1, 1);
  }

  private showNewRunConfirm(): void {
    const { width, height } = this.scale;

    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive().setDepth(100);

    // Panel Vacío Astral — sin fondo sólido, solo esquinas
    const pw = 500, ph = 200;
    const px = width / 2 - pw / 2;
    const py = height / 2 - ph / 2;
    const panelGfx = this.add.graphics().setDepth(101);
    panelGfx.fillStyle(THEME.bgPanel, 0.97);
    panelGfx.fillRect(px, py, pw, ph);
    drawCornerBox(panelGfx, px, py, pw, ph, 16, THEME.accent, 0.9);

    const msg = this.add.text(width / 2, height / 2 - 44, '¿Abandonar la run actual?', {
      ...THEME.fonts.heading,
      fontSize: '22px',
    }).setOrigin(0.5).setDepth(102);

    drawSeparator(this, width / 2 - 180, height / 2 - 14, 360, THEME.accentDim, 0.4).setDepth(101);

    const confirmBtn = makeTextButton(this, width / 2 - 90, height / 2 + 44, 'SÍ, NUEVA RUN', () => {
      saveManager.clearSave();
      gameState.reset();
      [shade, panelGfx, msg, confirmBtn, cancelBtn].forEach((o) => o.destroy());
      this.scene.start(SceneKeys.PARTY_SELECT);
    }, { fontSize: '16px', color: '#ff9f9f', letterSpacing: 2 });
    confirmBtn.setDepth(102);

    const cancelBtn = makeTextButton(this, width / 2 + 110, height / 2 + 44, 'CANCELAR', () => {
      [shade, panelGfx, msg, confirmBtn, cancelBtn].forEach((o) => o.destroy());
    }, { fontSize: '16px', color: THEME.textDim, letterSpacing: 2 });
    cancelBtn.setDepth(102);
  }
}
