import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';
import {
  addRolledItem,
  addStatusToParty,
  completeCurrentMapNode,
  ensureRunParty,
  itemRarityColor,
} from '@/systems/noncombat/NonCombatActions';
import { saveManager } from '@/systems/SaveManager';
import { Rarity, StatusEffectId, type ItemData } from '@/types';

const TRAP_CHANCE = 0.25;

export class TreasureScene extends Phaser.Scene {
  private opened = false;
  private viewObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.TREASURE });
  }

  init(): void {
    this.opened = false;
    this.viewObjects = [];
  }

  create(): void {
    ensureRunParty();
    this.render();
  }

  private render(): void {
    this.clearViewObjects();
    this.renderBackground();
    this.renderHeader();
    this.renderChest();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1));
    this.addViewObject(addVignette(this, width, height));

    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 56; x < width; x += 82) {
      grid.lineBetween(x, 108, x, height - 58);
    }
    for (let y = 128; y < height - 52; y += 58) {
      grid.lineBetween(46, y, width - 46, y);
    }
    this.addViewObject(grid);
    this.addViewObject(drawSeparator(this, 42, 104, width - 84, THEME.accent, 0.4));
  }

  private renderHeader(): void {
    const { width } = this.scale;
    this.addViewObject(this.add.text(width / 2, 30, 'TESORO', {
      ...THEME.fonts.heading,
      fontSize: '32px',
    }).setOrigin(0.5, 0));

    this.addViewObject(this.add.text(width / 2, 66, 'Un cofre sellado en hierro negro. Puede ser botin o castigo.', {
      ...THEME.fonts.dialogue,
      fontSize: '15px',
      color: THEME.textDim,
    }).setOrigin(0.5, 0));
  }

  private renderChest(): void {
    const { width, height } = this.scale;
    const x = width / 2;
    const y = height / 2 + 12;

    const shadow = this.add.ellipse(x, y + 96, 280, 42, 0x000000, 0.28);
    const base = this.add.rectangle(x, y + 28, 260, 130, 0x4b2f1f, 1)
      .setStrokeStyle(3, 0xb8903f, 0.9);
    const lid = this.add.rectangle(x, y - 52, 268, 78, 0x5a3824, 1)
      .setStrokeStyle(3, 0xd2a24d, 0.95);
    const lock = this.add.rectangle(x, y + 10, 42, 54, 0xc59643, 1)
      .setStrokeStyle(2, 0x4b3218, 1);
    const seam = this.add.rectangle(x, y - 10, 268, 8, 0x231812, 1);

    this.addViewObject(shadow);
    this.addViewObject(base);
    this.addViewObject(lid);
    this.addViewObject(lock);
    this.addViewObject(seam);

    this.tweens.add({
      targets: [lid, lock],
      y: '-=5',
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const open = this.createActionText(x, y + 178, 'ABRIR', () => this.openChest(), 18, THEME.accentHex);
    this.addViewObject(open);
  }

  private openChest(): void {
    if (this.opened) return;
    this.opened = true;

    const trapped = Math.random() < TRAP_CHANCE;
    const itemResult = trapped
      ? addRolledItem({ rarity: Rarity.CURSED, relicOnly: true })
      : addRolledItem({ rarity: Rarity.RARE, relicOnly: true });

    if (trapped) {
      addStatusToParty(StatusEffectId.BLEED, 3, 3);
      this.showResult(
        'Trampa',
        `La cerradura sangra. Toda la party recibe Sangrado x3.\nReliquia maldita: ${itemResult.item.name}.`,
        itemResult.item,
      );
    } else {
      this.showResult(
        'Botin limpio',
        `El cofre abre sin reclamar nada.\nReliquia rara: ${itemResult.item.name}.`,
        itemResult.item,
      );
    }

    completeCurrentMapNode();
    saveManager.save();
    this.time.delayedCall(1650, () => this.scene.start(SceneKeys.MAP));
  }

  private showResult(title: string, body: string, item: ItemData): void {
    const { width } = this.scale;
    const pw = 680, ph = 92;
    const px = width / 2 - pw / 2;
    const py = 528;
    const panelGfx = this.add.graphics().setDepth(800);
    panelGfx.fillStyle(THEME.bgPanel, 0.98);
    panelGfx.fillRect(px, py, pw, ph);
    drawCornerBox(panelGfx, px, py, pw, ph, 12, itemRarityColor(item.rarity), 0.9);

    const titleText = this.add.text(width / 2, 544, title.toUpperCase(), {
      ...THEME.fonts.hud,
      fontSize: '16px',
    }).setOrigin(0.5).setDepth(801);
    const bodyText = this.add.text(width / 2, 572, body, {
      ...THEME.fonts.body,
      fontSize: '14px',
      color: THEME.textPrimary,
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 620, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(801);

    this.addViewObject(panelGfx);
    this.addViewObject(titleText);
    this.addViewObject(bodyText);
  }

  private createActionText(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    fontSize: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, label, {
      ...THEME.fonts.hudSmall,
      fontSize: `${fontSize}px`,
      color,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.setData('baseColor', color);
    text.on('pointerover', () => text.setColor('#ffffff'));
    text.on('pointerout', () => text.setColor(text.getData('baseColor') as string));
    text.on('pointerdown', onClick);
    return text;
  }

  private addViewObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.viewObjects.push(object);
    return object;
  }

  private clearViewObjects(): void {
    for (const object of this.viewObjects) {
      object.destroy();
    }
    this.viewObjects = [];
  }
}
