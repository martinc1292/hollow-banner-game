import Phaser from 'phaser';
import { THEME } from './UITheme';

export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  const defaultColor = THEME.accentHex;
  const hoverColor = '#ffffff';

  const btn = scene.add
    .text(x, y, label, {
      ...THEME.fonts.button,
      ...style,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setColor(hoverColor));
  btn.on('pointerout', () => btn.setColor((style.color as string) ?? defaultColor));
  btn.on('pointerdown', onClick);

  return btn;
}
