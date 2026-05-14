import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';
import { gameState } from '@/systems/GameState';
import {
  completeCurrentMapNode,
  ensureRunParty,
  itemRarityColor,
  itemRarityLabel,
} from '@/systems/noncombat/NonCombatActions';
import { saveManager } from '@/systems/SaveManager';
import {
  ItemCategory,
  Rarity,
  type ItemData,
} from '@/types';

interface ShopOffer {
  offerId: string;
  item: ItemData;
  price: number;
  sold: boolean;
}

const SHOP_CARD_WIDTH = 248;
const SHOP_CARD_HEIGHT = 210;
const SHOP_CARD_GAP = 24;
const CURSE_SERVICE_PRICE = 50;

export class ShopScene extends Phaser.Scene {
  private offers: ShopOffer[] = [];
  private serviceUsed = false;
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private toastObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.SHOP });
  }

  init(): void {
    this.offers = [];
    this.serviceUsed = false;
    this.viewObjects = [];
    this.toastObjects = [];
  }

  create(): void {
    ensureRunParty();
    this.offers = this.buildOffers();
    this.render();
  }

  private render(): void {
    this.clearViewObjects();
    this.renderBackground();
    this.renderHeader();
    this.renderOffers();
    this.renderCurseService();
    this.renderExit();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1));
    this.addViewObject(addVignette(this, width, height));

    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 60; x < width; x += 86) {
      grid.lineBetween(x, 106, x, height - 56);
    }
    for (let y = 126; y < height - 52; y += 58) {
      grid.lineBetween(42, y, width - 42, y);
    }
    this.addViewObject(grid);
    this.addViewObject(drawSeparator(this, 42, 96, width - 84, THEME.accent, 0.4));
  }

  private renderHeader(): void {
    const { width } = this.scale;

    this.addViewObject(this.add.text(width / 2, 36, 'TIENDA', {
      ...THEME.fonts.heading,
      fontSize: '32px',
    }).setOrigin(0.5, 0));

    this.addViewObject(this.add.text(width / 2, 68, 'Equipo, consumibles y servicios del camino.', {
      ...THEME.fonts.dialogue,
      fontSize: '15px',
      color: THEME.textDim,
    }).setOrigin(0.5, 0));

    this.addViewObject(this.add.text(width - 44, 30, `ORO: ${gameState.runMeta.gold}`, {
      ...THEME.fonts.hudSmall,
      color: THEME.accentHex,
      letterSpacing: 2,
    }).setOrigin(1, 0));
  }

  private renderOffers(): void {
    const totalWidth = this.offers.length * SHOP_CARD_WIDTH + (this.offers.length - 1) * SHOP_CARD_GAP;
    const startX = (this.scale.width - totalWidth) / 2;
    const y = 158;

    this.offers.forEach((offer, index) => {
      this.renderOfferCard(offer, startX + index * (SHOP_CARD_WIDTH + SHOP_CARD_GAP), y);
    });
  }

  private renderOfferCard(offer: ShopOffer, x: number, y: number): void {
    const canBuy = !offer.sold && gameState.runMeta.gold >= offer.price;
    const accent = itemRarityColor(offer.item.rarity);
    const borderColor = offer.sold ? THEME.accentDeep : canBuy ? accent : 0x6b4a42;

    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(THEME.bgPanel, offer.sold ? 0.8 : 0.97);
    cardGfx.fillRect(x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT);
    drawCornerBox(cardGfx, x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT, 10, borderColor, offer.sold ? 0.3 : 0.85);

    const strip = this.add.rectangle(x, y, SHOP_CARD_WIDTH, 5, accent, offer.sold ? 0.2 : 0.85).setOrigin(0, 0);
    const title = this.add.text(x + 16, y + 22, offer.item.name.toUpperCase(), {
      ...THEME.fonts.hud,
      fontSize: '14px',
      color: offer.sold ? THEME.textDim : THEME.textPrimary,
      wordWrap: { width: SHOP_CARD_WIDTH - 32, useAdvancedWrap: true },
    });
    const meta = this.add.text(x + 16, y + 66, `${this.categoryLabel(offer.item).toUpperCase()} / ${itemRarityLabel(offer.item.rarity).toUpperCase()}`, {
      ...THEME.fonts.hudSmall,
      fontSize: '11px',
      color: offer.sold ? THEME.textDim : THEME.textDim,
    });
    const body = this.add.text(x + 16, y + 90, offer.item.description, {
      ...THEME.fonts.body,
      fontSize: '13px',
      color: offer.sold ? THEME.textDim : THEME.textPrimary,
      lineSpacing: 4,
      wordWrap: { width: SHOP_CARD_WIDTH - 32, useAdvancedWrap: true },
    });
    const price = this.add.text(x + 16, y + SHOP_CARD_HEIGHT - 34, offer.sold ? 'VENDIDO' : `${offer.price}g`, {
      ...THEME.fonts.hudSmall,
      color: offer.sold ? THEME.textDim : canBuy ? THEME.accentHex : '#c96363',
    });
    const action = this.add.text(x + SHOP_CARD_WIDTH - 16, y + SHOP_CARD_HEIGHT - 34, 'COMPRAR', {
      ...THEME.fonts.hudSmall,
      color: canBuy ? THEME.accentHex : THEME.textDim,
    }).setOrigin(1, 0);

    this.addViewObject(cardGfx);
    this.addViewObject(strip);
    this.addViewObject(title);
    this.addViewObject(meta);
    this.addViewObject(body);
    this.addViewObject(price);
    this.addViewObject(action);

    if (!offer.sold) {
      cardGfx.setInteractive(
        new Phaser.Geom.Rectangle(x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT),
        Phaser.Geom.Rectangle.Contains,
      );
      cardGfx.on('pointerover', () => {
        cardGfx.clear();
        cardGfx.fillStyle(THEME.bgPanel, 0.97);
        cardGfx.fillRect(x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT);
        drawCornerBox(cardGfx, x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT, 10, canBuy ? accent : 0xc96363, 1);
        if (canBuy) action.setColor('#ffffff');
      });
      cardGfx.on('pointerout', () => {
        cardGfx.clear();
        cardGfx.fillStyle(THEME.bgPanel, 0.97);
        cardGfx.fillRect(x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT);
        drawCornerBox(cardGfx, x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT, 10, borderColor, 0.85);
        action.setColor(canBuy ? THEME.accentHex : THEME.textDim);
      });
      cardGfx.on('pointerdown', () => this.buyOffer(offer.offerId));
    }
  }

  private renderCurseService(): void {
    const x = 160;
    const y = 430;
    const width = 960;
    const cursedRelic = this.getFirstCursedRelic();
    const available = Boolean(cursedRelic) && !this.serviceUsed;
    const affordable = gameState.runMeta.gold >= CURSE_SERVICE_PRICE;
    const canUse = available && affordable;
    const borderColor = canUse ? 0xc55f65 : THEME.accentDeep;

    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(THEME.bgPanel, available ? 0.97 : 0.8);
    bgGfx.fillRect(x, y, width, 96);
    drawCornerBox(bgGfx, x, y, width, 96, 10, borderColor, canUse ? 0.85 : 0.4);

    const title = this.add.text(x + 20, y + 16, 'SERVICIO: QUITAR RELIQUIA MALDITA', {
      ...THEME.fonts.hud,
      fontSize: '14px',
      color: available ? THEME.textPrimary : THEME.textDim,
    });
    const bodyText = cursedRelic
      ? `${cursedRelic.name} sera removida de la run.`
      : 'No hay reliquias malditas activas.';
    const body = this.add.text(x + 20, y + 46, bodyText, {
      ...THEME.fonts.body,
      fontSize: '13px',
      color: available ? THEME.textPrimary : THEME.textDim,
    });
    const action = this.add.text(x + width - 22, y + 34, `${CURSE_SERVICE_PRICE}g`, {
      ...THEME.fonts.hud,
      color: canUse ? THEME.accentHex : THEME.textDim,
    }).setOrigin(1, 0);

    this.addViewObject(bgGfx);
    this.addViewObject(title);
    this.addViewObject(body);
    this.addViewObject(action);

    if (!available) return;

    bgGfx.setInteractive(
      new Phaser.Geom.Rectangle(x, y, width, 96),
      Phaser.Geom.Rectangle.Contains,
    );
    bgGfx.on('pointerover', () => {
      bgGfx.clear();
      bgGfx.fillStyle(THEME.bgPanel, 0.97);
      bgGfx.fillRect(x, y, width, 96);
      drawCornerBox(bgGfx, x, y, width, 96, 10, canUse ? 0xc55f65 : 0x7b504f, 1);
    });
    bgGfx.on('pointerout', () => {
      bgGfx.clear();
      bgGfx.fillStyle(THEME.bgPanel, 0.97);
      bgGfx.fillRect(x, y, width, 96);
      drawCornerBox(bgGfx, x, y, width, 96, 10, borderColor, 0.85);
    });
    bgGfx.on('pointerdown', () => this.removeCursedRelic());
  }

  private renderExit(): void {
    const button = this.createActionText(this.scale.width / 2, 642, 'SALIR', () => {
      completeCurrentMapNode();
      saveManager.save();
      this.scene.start(SceneKeys.MAP);
    }, 16, THEME.textPrimary);
    this.addViewObject(button);
  }

  private buyOffer(offerId: string): void {
    const offer = this.offers.find((candidate) => candidate.offerId === offerId);
    if (!offer || offer.sold) return;
    if (gameState.runMeta.gold < offer.price) {
      this.showToast('Oro insuficiente.');
      return;
    }

    gameState.addGold(-offer.price);
    gameState.addItem(offer.item.id);
    offer.sold = true;
    this.render();
    this.showToast(`${offer.item.name} comprado.`);
  }

  private removeCursedRelic(): void {
    const cursedRelic = this.getFirstCursedRelic();
    if (!cursedRelic || this.serviceUsed) return;
    if (gameState.runMeta.gold < CURSE_SERVICE_PRICE) {
      this.showToast('Oro insuficiente.');
      return;
    }

    gameState.addGold(-CURSE_SERVICE_PRICE);
    gameState.removeRelic(cursedRelic.id);
    gameState.removeItem(cursedRelic.id);
    this.serviceUsed = true;
    this.render();
    this.showToast(`${cursedRelic.name} removida.`);
  }

  private buildOffers(): ShopOffer[] {
    const picked = new Set<string>();
    const items = [
      this.pickShopItem((item) => item.category === ItemCategory.CONSUMABLE, picked),
      this.pickShopItem((item) => item.category === ItemCategory.CONSUMABLE, picked),
      this.pickShopItem((item) => item.category === ItemCategory.EQUIPMENT, picked),
      this.pickShopItem((item) => this.isRelic(item), picked),
    ];

    return items.map((item, index) => ({
      offerId: `offer_${index}_${item.id}`,
      item,
      price: this.priceForItem(item),
      sold: false,
    }));
  }

  private pickShopItem(
    predicate: (item: ItemData) => boolean,
    picked: Set<string>,
  ): ItemData {
    const pool = registry.getAllItems().filter((item) => predicate(item) && !picked.has(item.id));
    const candidates = pool.length > 0
      ? pool
      : registry.getAllItems().filter(predicate);
    if (candidates.length === 0) {
      throw new Error('ShopScene: empty item pool for offer');
    }

    const item = candidates[Math.floor(Math.random() * candidates.length)];
    picked.add(item.id);
    return item;
  }

  private priceForItem(item: ItemData): number {
    if (item.category === ItemCategory.CONSUMABLE && item.rarity === Rarity.COMMON) return 20;

    switch (item.rarity) {
      case Rarity.COMMON:
        return 30;
      case Rarity.UNCOMMON:
        return 60;
      case Rarity.RARE:
        return 100;
      case Rarity.EPIC:
        return 200;
      case Rarity.CURSED:
        return 100;
    }
  }

  private getFirstCursedRelic(): ItemData | null {
    return gameState.getActiveRelics().find((item) => item.category === ItemCategory.CURSED_RELIC) ?? null;
  }

  private isRelic(item: ItemData): boolean {
    return item.category === ItemCategory.RELIC || item.category === ItemCategory.CURSED_RELIC;
  }

  private categoryLabel(item: ItemData): string {
    switch (item.category) {
      case ItemCategory.CONSUMABLE:
        return 'Consumible';
      case ItemCategory.EQUIPMENT:
        return item.slot ? 'Equipo' : 'Equipo';
      case ItemCategory.RELIC:
        return 'Reliquia';
      case ItemCategory.CURSED_RELIC:
        return 'Reliquia maldita';
    }
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

  private showToast(message: string): void {
    this.clearToast();

    const bg = this.add.rectangle(this.scale.width / 2, 590, 520, 42, THEME.bgPanel, 0.98)
      .setStrokeStyle(1, THEME.accent, 0.7)
      .setDepth(900);
    const text = this.add.text(this.scale.width / 2, 590, message, {
      ...THEME.fonts.hud,
      fontSize: '14px',
    }).setOrigin(0.5).setDepth(901);

    this.toastObjects.push(bg, text);
    this.time.delayedCall(1500, () => this.clearToast());
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
    this.clearToast();
  }

  private clearToast(): void {
    for (const object of this.toastObjects) {
      object.destroy();
    }
    this.toastObjects = [];
  }
}
