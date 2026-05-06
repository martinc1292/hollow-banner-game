import Phaser from 'phaser';

export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, label, {
      fontSize: '28px',
      color: '#cccccc',
      fontFamily: 'sans-serif',
      ...style,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setColor('#ffffff'));
  btn.on('pointerout', () => btn.setColor('#cccccc'));
  btn.on('pointerdown', onClick);

  return btn;
}
