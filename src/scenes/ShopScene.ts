import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
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
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, 0x151210, 1));

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x3b3023, 0.32);
    for (let x = 60; x < width; x += 86) {
      grid.lineBetween(x, 106, x, height - 56);
    }
    for (let y = 126; y < height - 52; y += 58) {
      grid.lineBetween(42, y, width - 42, y);
    }
    grid.lineStyle(2, 0x805f30, 0.45);
    grid.lineBetween(42, 96, width - 42, 96);
    this.addViewObject(grid);
  }

  private renderHeader(): void {
    const { width } = this.scale;

    this.addViewObject(this.add.text(42, 25, 'Tienda del Acto 1', {
      fontSize: '36px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }));

    this.addViewObject(this.add.text(44, 66, 'Compra equipo, consumibles o quita una reliquia maldita.', {
      fontSize: '15px',
      color: '#a7977e',
      fontFamily: 'Georgia, serif',
    }));

    this.addViewObject(this.add.text(width - 44, 30, `Oro ${gameState.runMeta.gold}`, {
      fontSize: '22px',
      color: '#f0d37a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
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
    const bgColor = offer.sold ? 0x191714 : 0x231d17;
    const strokeColor = offer.sold ? 0x5b554b : canBuy ? accent : 0x6b4a42;

    const card = this.add.rectangle(x, y, SHOP_CARD_WIDTH, SHOP_CARD_HEIGHT, bgColor, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(canBuy ? 2 : 1, strokeColor, offer.sold ? 0.48 : 0.9);
    const strip = this.add.rectangle(x, y, SHOP_CARD_WIDTH, 7, accent, offer.sold ? 0.3 : 0.9)
      .setOrigin(0, 0);
    const title = this.add.text(x + 16, y + 24, offer.item.name, {
      fontSize: '20px',
      color: offer.sold ? '#777064' : '#f0e4c8',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      wordWrap: { width: SHOP_CARD_WIDTH - 32, useAdvancedWrap: true },
    });
    const meta = this.add.text(x + 16, y + 74, `${this.categoryLabel(offer.item)} / ${itemRarityLabel(offer.item.rarity)}`, {
      fontSize: '12px',
      color: offer.sold ? '#6a6358' : '#ad9b82',
      fontFamily: 'Georgia, serif',
    });
    const body = this.add.text(x + 16, y + 98, offer.item.description, {
      fontSize: '13px',
      color: offer.sold ? '#6f695f' : '#c6b89f',
      fontFamily: 'Georgia, serif',
      lineSpacing: 4,
      wordWrap: { width: SHOP_CARD_WIDTH - 32, useAdvancedWrap: true },
    });
    const price = this.add.text(x + 16, y + SHOP_CARD_HEIGHT - 34, offer.sold ? 'Vendido' : `${offer.price}g`, {
      fontSize: '17px',
      color: offer.sold ? '#777064' : canBuy ? '#f0d37a' : '#c96363',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });
    const action = this.add.text(x + SHOP_CARD_WIDTH - 16, y + SHOP_CARD_HEIGHT - 34, 'Comprar', {
      fontSize: '15px',
      color: canBuy ? '#e8ca79' : '#625b51',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.addViewObject(card);
    this.addViewObject(strip);
    this.addViewObject(title);
    this.addViewObject(meta);
    this.addViewObject(body);
    this.addViewObject(price);
    this.addViewObject(action);

    if (!offer.sold) {
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => {
        card.setStrokeStyle(3, canBuy ? accent : 0xc96363, 1);
        if (canBuy) action.setColor('#fff0ad');
      });
      card.on('pointerout', () => {
        card.setStrokeStyle(canBuy ? 2 : 1, strokeColor, 0.9);
        action.setColor(canBuy ? '#e8ca79' : '#625b51');
      });
      card.on('pointerdown', () => this.buyOffer(offer.offerId));
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

    const bg = this.add.rectangle(x, y, width, 96, available ? 0x201815 : 0x171513, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(canUse ? 2 : 1, canUse ? 0xc55f65 : 0x5b5147, canUse ? 0.9 : 0.6);
    const title = this.add.text(x + 20, y + 18, 'Servicio: Quitar reliquia maldita', {
      fontSize: '20px',
      color: available ? '#f0e4c8' : '#827a6d',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });
    const bodyText = cursedRelic
      ? `${cursedRelic.name} sera removida de la run.`
      : 'No hay reliquias malditas activas.';
    const body = this.add.text(x + 20, y + 50, bodyText, {
      fontSize: '14px',
      color: available ? '#bba992' : '#6f675d',
      fontFamily: 'Georgia, serif',
    });
    const action = this.add.text(x + width - 22, y + 34, `${CURSE_SERVICE_PRICE}g`, {
      fontSize: '18px',
      color: canUse ? '#f0d37a' : '#625b51',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.addViewObject(bg);
    this.addViewObject(title);
    this.addViewObject(body);
    this.addViewObject(action);

    if (!available) return;

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setStrokeStyle(3, canUse ? 0xc55f65 : 0x7b504f, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(canUse ? 2 : 1, canUse ? 0xc55f65 : 0x5b5147, 0.9));
    bg.on('pointerdown', () => this.removeCursedRelic());
  }

  private renderExit(): void {
    const button = this.createActionText(this.scale.width / 2, 642, 'Salir', () => {
      completeCurrentMapNode();
      saveManager.save();
      this.scene.start(SceneKeys.MAP);
    }, 24, '#d5c7a7');
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
      fontSize: `${fontSize}px`,
      color,
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.setData('baseColor', color);
    text.on('pointerover', () => text.setColor('#fff0ad'));
    text.on('pointerout', () => text.setColor(text.getData('baseColor') as string));
    text.on('pointerdown', onClick);
    return text;
  }

  private showToast(message: string): void {
    this.clearToast();

    const bg = this.add.rectangle(this.scale.width / 2, 590, 520, 42, 0x241b16, 0.98)
      .setStrokeStyle(1, 0xd1ad63, 0.82)
      .setDepth(900);
    const text = this.add.text(this.scale.width / 2, 590, message, {
      fontSize: '16px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
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
