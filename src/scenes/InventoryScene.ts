import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';
import { gameState } from '@/systems/GameState';
import {
  canEquip,
  calculateActiveSets,
  calculateEffectiveStats,
  equipmentSlotToKey,
  getActiveSetBonusDetails,
  getMissingRequirements,
  syncCharacterEffectiveStats,
  type ActiveSet,
  type RequirementCheck,
} from '@/systems/StatsCalculator';
import { createCharacterInstance } from '@/systems/battle/BattleState';
import {
  CharacterClass,
  EquipmentSlot,
  ItemCategory,
  Rarity,
  type CharacterEquipment,
  type CharacterInstance,
  type ItemData,
  type StatKey,
  type Stats,
} from '@/types';

export interface InventorySceneInitData {
  returnScene?: SceneKey;
  inCombat?: boolean;
}

interface InventoryEntry {
  item: ItemData;
  count: number;
}

interface ConsumableResult {
  consumed: boolean;
  message: string;
}

const PARTY_PANEL = { x: 42, y: 112, width: 756, height: 532 };
const INVENTORY_PANEL = { x: 826, y: 112, width: 410, height: 532 };
const INVENTORY_ROWS_PER_PAGE = 7;

const PORTRAIT_ASSETS: Record<string, { key: string; path: string }> = {
  bram: { key: 'portrait_bram', path: '/assets/characters/bram_tank.png' },
  vera: { key: 'portrait_vera', path: '/assets/characters/vera_dps.png' },
  mira: { key: 'portrait_mira', path: '/assets/characters/mira_mage.png' },
};

const CLASS_LABELS: Record<CharacterClass, string> = {
  [CharacterClass.KNIGHT]: 'Caballero',
  [CharacterClass.MERCENARY]: 'Mercenaria',
  [CharacterClass.SORCERESS]: 'Hechicera',
  [CharacterClass.PRIEST]: 'Sacerdote',
  [CharacterClass.HUNTER]: 'Cazadora',
};

const SLOT_LABELS: Record<keyof CharacterEquipment, string> = {
  weapon: 'Arma',
  armor: 'Armadura',
  amulet: 'Amuleto',
};

const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  hpMax: 'HP max',
  attack: 'Ataque',
  power: 'Poder',
  defense: 'Defensa',
  speed: 'Velocidad',
  crit: 'Crítico',
  resistance: 'Resistencia',
};

const RARITY_COLORS: Record<Rarity, number> = {
  [Rarity.COMMON]: 0xb0a070,
  [Rarity.UNCOMMON]: 0x5a9a50,
  [Rarity.RARE]: 0x5090c8,
  [Rarity.EPIC]: 0xe8b840,
  [Rarity.CURSED]: 0xd04040,
};

const RARITY_LABELS: Record<Rarity, string> = {
  [Rarity.COMMON]: 'Común',
  [Rarity.UNCOMMON]: 'Poco común',
  [Rarity.RARE]: 'Rara',
  [Rarity.EPIC]: 'Épica',
  [Rarity.CURSED]: 'Maldita',
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.CONSUMABLE]: 'Consumible',
  [ItemCategory.EQUIPMENT]: 'Equipo',
  [ItemCategory.RELIC]: 'Reliquia',
  [ItemCategory.CURSED_RELIC]: 'Reliquia maldita',
};

export class InventoryScene extends Phaser.Scene {
  private returnScene: SceneKey = SceneKeys.MAP;
  private inCombat = false;
  private selectedItemId: string | null = null;
  private targetingConsumableId: string | null = null;
  private inventoryPage = 0;
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private toastObjects: Phaser.GameObjects.GameObject[] = [];
  private tooltipObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.INVENTORY });
  }

  preload(): void {
    for (const portrait of Object.values(PORTRAIT_ASSETS)) {
      if (!this.textures.exists(portrait.key)) {
        this.load.image(portrait.key, portrait.path);
      }
    }
  }

  init(data: InventorySceneInitData = {}): void {
    this.returnScene = data.returnScene ?? SceneKeys.MAP;
    this.inCombat = data.inCombat ?? false;
    this.selectedItemId = null;
    this.targetingConsumableId = null;
    this.inventoryPage = 0;
    this.viewObjects = [];
    this.toastObjects = [];
    this.tooltipObjects = [];
  }

  create(): void {
    this.ensureParty();
    this.input.keyboard?.on('keydown-ESC', () => this.handleEscape());
    this.render();
  }

  private ensureParty(): void {
    if (gameState.party.length > 0) return;

    gameState.setParty([
      createCharacterInstance(registry.getCharacter('bram')),
      createCharacterInstance(registry.getCharacter('vera')),
      createCharacterInstance(registry.getCharacter('mira')),
    ]);
  }

  private render(): void {
    this.clearViewObjects();
    this.hideTooltip();
    this.clampInventoryPage();
    this.renderBackground();
    this.renderHeader();
    this.renderPartyPanel();
    this.renderInventoryPanel();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1));
    this.addViewObject(addVignette(this, width, height));

    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 48; x < width; x += 78) {
      grid.lineBetween(x, 92, x, height - 48);
    }
    for (let y = 112; y < height - 52; y += 56) {
      grid.lineBetween(38, y, width - 38, y);
    }
    this.addViewObject(grid);
    this.addViewObject(drawSeparator(this, 0, 92, width, THEME.accent, 0.3));
  }

  private renderHeader(): void {
    const { width } = this.scale;

    this.addViewObject(this.add.text(42, 22, 'INVENTARIO', {
      ...THEME.fonts.heading,
      fontSize: '28px',
    }));

    this.addViewObject(this.add.text(44, 60, this.headerStatus(), {
      ...THEME.fonts.hudSmall,
      color: THEME.textDim,
    }));

    this.addViewObject(this.add.text(width - 44, 28, `ORO: ${gameState.runMeta.gold}`, {
      ...THEME.fonts.hudSmall,
      color: THEME.accentHex,
      letterSpacing: 2,
    }).setOrigin(1, 0));

    const back = this.createActionText(width - 116, 64, 'VOLVER', () => {
      this.scene.start(this.returnScene);
    }, 14, THEME.textDim);
    this.addViewObject(back);
  }

  private headerStatus(): string {
    if (this.targetingConsumableId) {
      const item = registry.getItem(this.targetingConsumableId);
      return `${item.name}: elige un aliado`;
    }

    if (!this.selectedItemId) {
      return 'Equipo de campamento y mochila de la run.';
    }

    const item = registry.getItem(this.selectedItemId);
    if (item.category === ItemCategory.EQUIPMENT) {
      return `${item.name}: elige un portador valido`;
    }
    return item.name;
  }

  private renderPartyPanel(): void {
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(THEME.bgPanel, 0.95);
    panelGfx.fillRect(PARTY_PANEL.x, PARTY_PANEL.y, PARTY_PANEL.width, PARTY_PANEL.height);
    drawCornerBox(panelGfx, PARTY_PANEL.x, PARTY_PANEL.y, PARTY_PANEL.width, PARTY_PANEL.height, 12, THEME.accentDim, 0.6);
    this.addViewObject(panelGfx);

    this.addViewObject(this.add.text(PARTY_PANEL.x + 18, PARTY_PANEL.y + 14, 'PARTY', {
      ...THEME.fonts.label,
      fontSize: '13px',
    }));

    const cardHeight = 108;
    const gap = 14;
    const startY = PARTY_PANEL.y + 52;

    gameState.party.forEach((character, index) => {
      const y = startY + index * (cardHeight + gap);
      this.renderCharacterCard(character, PARTY_PANEL.x + 18, y, PARTY_PANEL.width - 36, cardHeight);
    });
  }

  private renderCharacterCard(
    character: CharacterInstance,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const selectedEquipment = this.getSelectedEquipment();
    const missing = selectedEquipment
      ? getMissingRequirements(character, selectedEquipment)
      : [];
    const equipable = selectedEquipment ? missing.length === 0 : false;
    const consumableTarget = Boolean(this.targetingConsumableId);
    const accent = this.characterAccent(character.data.id);
    const stroke = consumableTarget
      ? 0x82d083
      : selectedEquipment
        ? equipable ? 0x82d083 : 0xc96363
        : accent;
    const fill = selectedEquipment || consumableTarget ? 0x1d2a28 : 0x1a2326;

    const container = this.add.container(x, y);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    const bg = this.add.rectangle(0, 0, width, height, fill, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(selectedEquipment || consumableTarget ? 3 : 1, stroke, 0.9);
    const strip = this.add.rectangle(0, 0, 6, height, accent, 0.9).setOrigin(0, 0);
    container.add([bg, strip]);

    this.renderPortrait(container, character, 42, 52, accent);
    this.renderCharacterTexts(container, character);
    this.renderStatsGrid(container, calculateEffectiveStats(character), 196, 22);
    this.renderEquipmentSlots(container, character, width - 226, 20);
    this.renderSetSummary(container, character, 196, 84, x + 196, y + 84);

    container.on('pointerover', () => {
      bg.setStrokeStyle(3, stroke, 1);
      if (selectedEquipment && !equipable) {
        this.showRequirementTooltip(missing, x + width - 250, y + 8);
      }
    });
    container.on('pointerout', () => {
      bg.setStrokeStyle(selectedEquipment || consumableTarget ? 3 : 1, stroke, 0.9);
      this.hideTooltip();
    });
    container.on('pointerdown', () => this.handleCharacterClick(character));

    this.addViewObject(container);
  }

  private renderPortrait(
    container: Phaser.GameObjects.Container,
    character: CharacterInstance,
    x: number,
    y: number,
    accent: number,
  ): void {
    const frame = this.add.rectangle(x, y, 66, 66, 0x101617, 0.98)
      .setStrokeStyle(1, accent, 0.76);
    container.add(frame);

    const portrait = PORTRAIT_ASSETS[character.data.id];
    if (portrait && this.textures.exists(portrait.key)) {
      container.add(this.add.image(x, y, portrait.key).setDisplaySize(58, 58));
      return;
    }

    const sigil = this.add.circle(x, y, 24, accent, 0.38);
    const initials = this.add.text(x, y, this.getInitials(character.data.name), {
      fontSize: '18px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([sigil, initials]);
  }

  private renderCharacterTexts(
    container: Phaser.GameObjects.Container,
    character: CharacterInstance,
  ): void {
    container.add(this.add.text(86, 20, this.shortName(character.data.name).toUpperCase(), {
      ...THEME.fonts.hud,
      fontSize: '14px',
      fixedWidth: 98,
    }));

    container.add(this.add.text(86, 46, CLASS_LABELS[character.data.className].toUpperCase(), {
      ...THEME.fonts.hudSmall,
      color: THEME.textDim,
      fixedWidth: 98,
    }));

    container.add(this.add.text(86, 66, this.resourceLine(character), {
      ...THEME.fonts.hudSmall,
      color: THEME.vigorHex,
      fixedWidth: 98,
    }));
  }

  private renderStatsGrid(
    container: Phaser.GameObjects.Container,
    stats: Stats,
    x: number,
    y: number,
  ): void {
    const rows: Array<[string, string]> = [
      ['HP', `${this.formatStat(stats.hp)}/${this.formatStat(stats.hpMax)}`],
      ['ATQ', this.formatStat(stats.attack)],
      ['POD', this.formatStat(stats.power)],
      ['DEF', this.formatStat(stats.defense)],
      ['VEL', this.formatStat(stats.speed)],
      ['CRIT', `${this.formatStat(stats.crit)}%`],
    ];
    const boxWidth = 74;
    const boxHeight = 24;
    const gap = 7;

    rows.forEach(([label, value], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const boxX = x + col * (boxWidth + gap);
      const boxY = y + row * (boxHeight + 8);
      const box = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, THEME.bgDeep, 0.88)
        .setOrigin(0, 0)
        .setStrokeStyle(1, THEME.accentDeep, 0.8);
      const text = this.add.text(boxX + boxWidth / 2, boxY + boxHeight / 2, `${label} ${value}`, {
        ...THEME.fonts.hudSmall,
        fontSize: '11px',
      }).setOrigin(0.5);
      container.add([box, text]);
    });
  }

  private renderEquipmentSlots(
    container: Phaser.GameObjects.Container,
    character: CharacterInstance,
    x: number,
    y: number,
  ): void {
    const slots: Array<keyof CharacterEquipment> = ['weapon', 'armor', 'amulet'];
    slots.forEach((slot, index) => {
      this.renderEquipmentSlot(container, character, slot, x, y + index * 28);
    });
  }

  private renderEquipmentSlot(
    container: Phaser.GameObjects.Container,
    character: CharacterInstance,
    slot: keyof CharacterEquipment,
    x: number,
    y: number,
  ): void {
    const itemId = character.equipment[slot];
    const item = itemId ? registry.getItem(itemId) : null;
    const width = 206;
    const bg = this.add.rectangle(x, y, width, 23, item ? THEME.bgPanel : THEME.bgDeep, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, item ? RARITY_COLORS[item.rarity] : THEME.accentDeep, item ? 0.84 : 0.58);
    const label = this.add.text(x + 8, y + 5, SLOT_LABELS[slot].toUpperCase(), {
      ...THEME.fonts.hudSmall,
      fontSize: '10px',
      color: THEME.textDim,
      fixedWidth: 54,
    });
    const itemName = this.add.text(x + 68, y + 5, item ? this.truncate(item.name, 17) : 'Vacio', {
      ...THEME.fonts.hudSmall,
      fontSize: '10px',
      color: item ? THEME.textPrimary : THEME.textDim,
      fixedWidth: 96,
    });
    const remove = this.add.text(x + width - 8, y + 5, item ? 'QUITAR' : '', {
      ...THEME.fonts.hudSmall,
      fontSize: '10px',
      color: THEME.accentHex,
    }).setOrigin(1, 0);

    container.add([bg, label, itemName, remove]);

    if (!itemId || !item) return;

    const equippedItem = item;

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, RARITY_COLORS[equippedItem.rarity], 1);
      this.showItemTooltip(equippedItem, PARTY_PANEL.x + PARTY_PANEL.width - 286, PARTY_PANEL.y + 22);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, RARITY_COLORS[equippedItem.rarity], 0.84);
      this.hideTooltip();
    });
    bg.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.unequipItem(character, slot);
    });
  }

  private renderSetSummary(
    container: Phaser.GameObjects.Container,
    character: CharacterInstance,
    x: number,
    y: number,
    sceneX: number,
    sceneY: number,
  ): void {
    const activeSets = calculateActiveSets(character.equipment, gameState.runMeta.relics);
    const visibleSets = activeSets.filter((activeSet) => (
      activeSet.set.bonuses.length > 0 || activeSet.piecesEquipped > 0
    ));

    const label = this.add.text(x, y + 3, 'SETS', {
      ...THEME.fonts.hudSmall,
      fontSize: '10px',
      color: THEME.textDim,
    });
    container.add(label);

    if (visibleSets.length === 0) {
      const empty = this.add.text(x + 40, y + 3, '-', {
        ...THEME.fonts.hudSmall,
        fontSize: '10px',
        color: THEME.textDim,
      });
      container.add(empty);
      return;
    }

    visibleSets.slice(0, 2).forEach((activeSet, index) => {
      const bonusActive = getActiveSetBonusDetails([activeSet]).length > 0;
      const chipX = x + 40 + index * 126;
      const chipWidth = 118;
      const chip = this.add.rectangle(
        chipX,
        y,
        chipWidth,
        20,
        bonusActive ? 0x233322 : THEME.bgDeep,
        0.96,
      )
        .setOrigin(0, 0)
        .setStrokeStyle(1, bonusActive ? 0x82d083 : THEME.accentDeep, bonusActive ? 0.96 : 0.78)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(chipX + 7, y + 4, this.setChipLabel(activeSet), {
        ...THEME.fonts.hudSmall,
        fontSize: '10px',
        color: bonusActive ? '#d8f0c6' : THEME.textPrimary,
        fixedWidth: chipWidth - 14,
      });

      chip.on('pointerover', () => {
        chip.setStrokeStyle(2, bonusActive ? 0x9de39e : 0xc3b06f, 1);
        this.showSetTooltip(activeSet, sceneX + 36 + index * 126, sceneY - 112);
      });
      chip.on('pointerout', () => {
        chip.setStrokeStyle(1, bonusActive ? 0x82d083 : 0x536467, bonusActive ? 0.96 : 0.78);
        this.hideTooltip();
      });
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.showSetTooltip(activeSet, sceneX + 36 + index * 126, sceneY - 112));
      text.on('pointerout', () => this.hideTooltip());

      container.add([chip, text]);
    });
  }

  private renderInventoryPanel(): void {
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(THEME.bgPanel, 0.95);
    panelGfx.fillRect(INVENTORY_PANEL.x, INVENTORY_PANEL.y, INVENTORY_PANEL.width, INVENTORY_PANEL.height);
    drawCornerBox(panelGfx, INVENTORY_PANEL.x, INVENTORY_PANEL.y, INVENTORY_PANEL.width, INVENTORY_PANEL.height, 12, THEME.accentDim, 0.6);
    this.addViewObject(panelGfx);

    this.addViewObject(this.add.text(INVENTORY_PANEL.x + 18, INVENTORY_PANEL.y + 14, 'MOCHILA', {
      ...THEME.fonts.label,
      fontSize: '13px',
    }));

    const entries = this.inventoryEntries();
    if (entries.length === 0) {
      this.addViewObject(this.add.text(INVENTORY_PANEL.x + 24, INVENTORY_PANEL.y + 72, 'Sin items en la mochila.', {
        ...THEME.fonts.body,
        fontSize: '14px',
        color: THEME.textDim,
      }));
      this.renderSelectedItemDetails(null);
      return;
    }

    const start = this.inventoryPage * INVENTORY_ROWS_PER_PAGE;
    const visibleEntries = entries.slice(start, start + INVENTORY_ROWS_PER_PAGE);
    visibleEntries.forEach((entry, index) => {
      const y = INVENTORY_PANEL.y + 54 + index * 50;
      this.renderInventoryRow(entry, INVENTORY_PANEL.x + 16, y, INVENTORY_PANEL.width - 32, 42);
    });

    this.renderInventoryPager(entries.length);
    this.renderSelectedItemDetails(this.selectedItemId ? registry.getItem(this.selectedItemId) : null);
  }

  private renderInventoryRow(
    entry: InventoryEntry,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const selected = entry.item.id === this.selectedItemId;
    const bg = this.add.rectangle(x, y, width, height, selected ? 0x1a1428 : THEME.bgDeep, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(selected ? 2 : 1, selected ? THEME.accent : THEME.accentDeep, selected ? 0.9 : 0.6)
      .setInteractive({ useHandCursor: true });
    const rarity = this.add.rectangle(x, y, 5, height, RARITY_COLORS[entry.item.rarity], 0.92)
      .setOrigin(0, 0);
    const name = this.add.text(x + 13, y + 6, this.truncate(entry.item.name, 28).toUpperCase(), {
      ...THEME.fonts.hudSmall,
      fixedWidth: width - 64,
    });
    const count = this.add.text(x + width - 10, y + 6, entry.count > 1 ? `x${entry.count}` : '', {
      ...THEME.fonts.hudSmall,
      color: THEME.accentHex,
    }).setOrigin(1, 0);
    const meta = this.add.text(x + 13, y + 25, this.itemMeta(entry.item), {
      ...THEME.fonts.body,
      fontSize: '11px',
      color: THEME.textDim,
      fixedWidth: width - 26,
    });

    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, RARITY_COLORS[entry.item.rarity], 0.95);
      name.setColor('#ffffff');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(selected ? 2 : 1, selected ? THEME.accent : THEME.accentDeep, selected ? 0.9 : 0.6);
      name.setColor(THEME.textPrimary);
    });
    bg.on('pointerdown', () => {
      this.selectedItemId = entry.item.id;
      this.targetingConsumableId = null;
      this.render();
    });

    this.addViewObject(bg);
    this.addViewObject(rarity);
    this.addViewObject(name);
    this.addViewObject(count);
    this.addViewObject(meta);
  }

  private renderInventoryPager(totalEntries: number): void {
    const pages = Math.ceil(totalEntries / INVENTORY_ROWS_PER_PAGE);
    if (pages <= 1) return;

    const y = INVENTORY_PANEL.y + 410;
    const previous = this.createActionText(INVENTORY_PANEL.x + 88, y, 'ANTERIOR', () => {
      this.inventoryPage = Math.max(0, this.inventoryPage - 1);
      this.render();
    }, 12, this.inventoryPage > 0 ? THEME.textPrimary : THEME.textDim);
    const next = this.createActionText(INVENTORY_PANEL.x + INVENTORY_PANEL.width - 88, y, 'SIGUIENTE', () => {
      this.inventoryPage = Math.min(pages - 1, this.inventoryPage + 1);
      this.render();
    }, 12, this.inventoryPage < pages - 1 ? THEME.textPrimary : THEME.textDim);
    const page = this.add.text(INVENTORY_PANEL.x + INVENTORY_PANEL.width / 2, y - 8, `${this.inventoryPage + 1}/${pages}`, {
      ...THEME.fonts.hudSmall,
      fontSize: '12px',
      color: THEME.textDim,
    }).setOrigin(0.5, 0);

    if (this.inventoryPage <= 0) previous.disableInteractive();
    if (this.inventoryPage >= pages - 1) next.disableInteractive();

    this.addViewObject(previous);
    this.addViewObject(next);
    this.addViewObject(page);
  }

  private renderSelectedItemDetails(item: ItemData | null): void {
    const x = INVENTORY_PANEL.x + 16;
    const y = INVENTORY_PANEL.y + 424;
    const width = INVENTORY_PANEL.width - 32;
    const height = 92;
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(THEME.bgPanel, 0.96);
    bgGfx.fillRect(x, y, width, height);
    drawCornerBox(bgGfx, x, y, width, height, 8, THEME.accentDim, 0.5);
    this.addViewObject(bgGfx);

    if (!item) {
      this.addViewObject(this.add.text(x + 14, y + 28, 'Selecciona un item.', {
        ...THEME.fonts.body,
        fontSize: '14px',
        color: THEME.textDim,
      }));
      return;
    }

    this.addViewObject(this.add.text(x + 14, y + 12, item.name.toUpperCase(), {
      ...THEME.fonts.hud,
      fontSize: '13px',
      fixedWidth: width - 118,
    }));

    this.addViewObject(this.add.text(x + width - 14, y + 13, RARITY_LABELS[item.rarity].toUpperCase(), {
      ...THEME.fonts.hudSmall,
      fontSize: '11px',
      color: this.colorString(RARITY_COLORS[item.rarity]),
    }).setOrigin(1, 0));

    this.addViewObject(this.add.text(x + 14, y + 34, this.detailsText(item), {
      ...THEME.fonts.body,
      fontSize: '12px',
      color: THEME.textPrimary,
      lineSpacing: 3,
      wordWrap: { width: width - 28, useAdvancedWrap: true },
    }));

    if (item.category === ItemCategory.CONSUMABLE) {
      const canUse = !this.inCombat && gameState.runMeta.items.includes(item.id);
      const useButton = this.createActionText(
        x + width - 42,
        y + height - 18,
        'USAR',
        () => {
          if (!canUse) {
            this.showToast(this.inCombat ? 'No disponible en combate.' : 'Ya no esta en la mochila.');
            return;
          }
          this.targetingConsumableId = item.id;
          this.render();
        },
        12,
        canUse ? THEME.accentHex : THEME.textDim,
      );
      if (!canUse) useButton.disableInteractive();
      this.addViewObject(useButton);
    }
  }

  private handleCharacterClick(character: CharacterInstance): void {
    if (this.targetingConsumableId) {
      this.useConsumableOn(character);
      return;
    }

    const item = this.getSelectedEquipment();
    if (!item) return;

    if (!canEquip(character, item)) {
      const missing = getMissingRequirements(character, item);
      this.showToast(this.requirementText(missing));
      return;
    }

    this.equipItem(character, item);
  }

  private equipItem(character: CharacterInstance, item: ItemData): void {
    if (item.category !== ItemCategory.EQUIPMENT || !item.slot) return;
    if (!gameState.runMeta.items.includes(item.id)) {
      this.showToast('Ese item ya no esta en la mochila.');
      this.render();
      return;
    }

    const slot = equipmentSlotToKey(item.slot);
    const previousEquipment = { ...character.equipment };
    const replacedItemId = character.equipment[slot];

    gameState.removeItem(item.id);
    if (replacedItemId) {
      gameState.addItem(replacedItemId);
    }
    character.equipment[slot] = item.id;
    syncCharacterEffectiveStats(character, previousEquipment);

    this.selectedItemId = null;
    this.targetingConsumableId = null;
    this.render();
    this.showToast(`${item.name} equipado en ${this.shortName(character.data.name)}.`);
  }

  private unequipItem(character: CharacterInstance, slot: keyof CharacterEquipment): void {
    const itemId = character.equipment[slot];
    if (!itemId) return;

    const item = registry.getItem(itemId);
    const previousEquipment = { ...character.equipment };
    character.equipment[slot] = null;
    gameState.addItem(itemId);
    syncCharacterEffectiveStats(character, previousEquipment);

    this.selectedItemId = itemId;
    this.targetingConsumableId = null;
    this.render();
    this.showToast(`${item.name} vuelve a la mochila.`);
  }

  private useConsumableOn(character: CharacterInstance): void {
    if (!this.targetingConsumableId) return;

    const item = registry.getItem(this.targetingConsumableId);
    if (item.category !== ItemCategory.CONSUMABLE) return;
    if (this.inCombat) {
      this.showToast('No disponible en combate.');
      return;
    }
    if (!gameState.runMeta.items.includes(item.id)) {
      this.showToast('Ese consumible ya no esta en la mochila.');
      this.targetingConsumableId = null;
      this.render();
      return;
    }

    const result = this.applyConsumable(item, character);
    if (!result.consumed) {
      this.showToast(result.message);
      this.targetingConsumableId = null;
      this.render();
      return;
    }

    gameState.removeItem(item.id);
    this.selectedItemId = null;
    this.targetingConsumableId = null;
    this.render();
    this.showToast(result.message);
  }

  private applyConsumable(item: ItemData, character: CharacterInstance): ConsumableResult {
    switch (item.id) {
      case 'pocion_roja':
        return this.healCharacter(character, 25);
      case 'pocion_vigor':
        return this.restoreVigor(character, 5);
      case 'antidoto':
        return this.cleanseNegativeStatuses(character);
      case 'granada_cenizas':
        return {
          consumed: false,
          message: 'Ese consumible se reserva para el flujo de combate.',
        };
      default:
        return {
          consumed: false,
          message: `${item.name} no tiene uso fuera de combate por ahora.`,
        };
    }
  }

  private healCharacter(character: CharacterInstance, amount: number): ConsumableResult {
    if (gameState.isHealingBlocked(character)) {
      return { consumed: false, message: `${this.shortName(character.data.name)} no puede curarse.` };
    }

    const before = character.currentStats.hp;
    character.currentStats.hp = Math.min(
      character.currentStats.hpMax,
      character.currentStats.hp + amount,
    );
    const healed = character.currentStats.hp - before;

    if (healed <= 0) {
      return { consumed: false, message: `${this.shortName(character.data.name)} ya tiene HP completo.` };
    }

    character.isDown = false;
    return {
      consumed: true,
      message: `${this.shortName(character.data.name)} recupera ${this.formatStat(healed)} HP.`,
    };
  }

  private restoreVigor(character: CharacterInstance, amount: number): ConsumableResult {
    const before = character.currentResources.vigor;
    character.currentResources.vigor = Math.min(
      character.currentResources.vigorMax,
      character.currentResources.vigor + amount,
    );
    const gained = character.currentResources.vigor - before;

    if (gained <= 0) {
      return { consumed: false, message: `${this.shortName(character.data.name)} ya tiene Vigor completo.` };
    }

    return {
      consumed: true,
      message: `${this.shortName(character.data.name)} recupera ${this.formatStat(gained)} Vigor.`,
    };
  }

  private cleanseNegativeStatuses(character: CharacterInstance): ConsumableResult {
    const before = character.statusEffects.length;
    character.statusEffects = character.statusEffects.filter(
      (status) => !registry.getStatusEffect(status.id).isNegative,
    );
    const removed = before - character.statusEffects.length;

    if (removed <= 0) {
      return { consumed: false, message: `${this.shortName(character.data.name)} no tiene estados negativos.` };
    }

    return {
      consumed: true,
      message: `${this.shortName(character.data.name)} limpia ${removed} estado${removed === 1 ? '' : 's'}.`,
    };
  }

  private getSelectedEquipment(): ItemData | null {
    if (!this.selectedItemId) return null;

    const item = registry.getItem(this.selectedItemId);
    return item.category === ItemCategory.EQUIPMENT ? item : null;
  }

  private inventoryEntries(): InventoryEntry[] {
    const byId = new Map<string, InventoryEntry>();
    for (const itemId of gameState.runMeta.items) {
      const item = registry.getItem(itemId);
      const existing = byId.get(item.id);
      if (existing) {
        existing.count += 1;
      } else {
        byId.set(item.id, { item, count: 1 });
      }
    }

    return Array.from(byId.values()).sort((a, b) => (
      this.categoryRank(a.item.category) - this.categoryRank(b.item.category)
      || this.rarityRank(b.item.rarity) - this.rarityRank(a.item.rarity)
      || a.item.name.localeCompare(b.item.name)
    ));
  }

  private clampInventoryPage(): void {
    const pageCount = Math.max(1, Math.ceil(this.inventoryEntries().length / INVENTORY_ROWS_PER_PAGE));
    this.inventoryPage = Math.max(0, Math.min(pageCount - 1, this.inventoryPage));
  }

  private itemMeta(item: ItemData): string {
    const slot = item.slot ? ` / ${this.equipmentSlotLabel(item.slot)}` : '';
    const set = item.setId ? ` / ${this.setName(item.setId)}` : '';
    return `${CATEGORY_LABELS[item.category]}${slot}${set} / ${this.effectLine(item)}`;
  }

  private detailsText(item: ItemData): string {
    const parts = [CATEGORY_LABELS[item.category]];

    if (item.setId) {
      parts.push(`Set: ${this.setName(item.setId)}`);
    }

    if (item.category === ItemCategory.EQUIPMENT) {
      parts.push(item.requirements.length > 0 ? this.requirementsLine(item) : 'Sin requisitos');
    }

    parts.push(item.effects.map((effect) => effect.description).join(' / ') || item.description);
    return parts.join('\n');
  }

  private effectLine(item: ItemData): string {
    const text = item.effects[0]?.description ?? item.description;
    return this.truncate(text, 34);
  }

  private requirementsLine(item: ItemData): string {
    return `Req: ${item.requirements
      .map((requirement) => `${STAT_LABELS[requirement.stat]} ${this.formatStat(requirement.minValue)}`)
      .join(', ')}`;
  }

  private requirementText(missing: RequirementCheck[]): string {
    if (missing.length === 0) return 'Requisitos cumplidos.';
    return missing
      .map((check) => (
        `Requiere ${this.formatStat(check.required)} de ${STAT_LABELS[check.stat]} `
        + `(${this.formatStat(check.actual)})`
      ))
      .join(' / ');
  }

  private resourceLine(character: CharacterInstance): string {
    const resources = character.currentResources;
    const parts = [`V ${this.formatStat(resources.vigor)}/${this.formatStat(resources.vigorMax)}`];
    if (resources.manaMax > 0) {
      parts.push(`M ${this.formatStat(resources.mana)}/${this.formatStat(resources.manaMax)}`);
    }
    return parts.join('  ');
  }

  private showRequirementTooltip(missing: RequirementCheck[], x: number, y: number): void {
    this.showTooltip(this.requirementText(missing), x, y, 0x2a1414, 0xc96363);
  }

  private showItemTooltip(item: ItemData, x: number, y: number): void {
    this.showTooltip(`${item.name}\n${this.detailsText(item)}`, x, y, 0x101617, RARITY_COLORS[item.rarity], 308, 96);
  }

  private showSetTooltip(activeSet: ActiveSet, x: number, y: number): void {
    const bonusLines = activeSet.set.bonuses.length > 0
      ? activeSet.set.bonuses.map((bonus) => {
        const active = activeSet.piecesEquipped >= bonus.piecesRequired;
        const marker = active ? 'Activo' : `${activeSet.piecesEquipped}/${bonus.piecesRequired}`;
        return `${marker}: ${bonus.description}`;
      }).join('\n')
      : 'Sin bonus en el MVP.';
    const itemLines = activeSet.set.itemIds
      .map((itemId) => {
        const owned = activeSet.equippedItemIds.includes(itemId) ? '+' : '-';
        return `${owned} ${registry.getItem(itemId).name}`;
      })
      .join('\n');
    const bonusActive = getActiveSetBonusDetails([activeSet]).length > 0;
    const text = [
      activeSet.set.name,
      `${activeSet.piecesEquipped}/${activeSet.set.itemIds.length} piezas`,
      bonusLines,
      itemLines,
    ].join('\n');

    this.showTooltip(text, x, y, 0x101617, bonusActive ? 0x82d083 : 0xc3b06f, 344, 126);
  }

  private showTooltip(
    text: string,
    x: number,
    y: number,
    fill: number,
    stroke: number,
    width = 286,
    height = 74,
  ): void {
    this.hideTooltip();
    const bg = this.add.rectangle(x, y, width, height, fill, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, stroke, 0.9)
      .setDepth(1000);
    const label = this.add.text(x + 10, y + 9, text, {
      ...THEME.fonts.body,
      fontSize: '12px',
      color: THEME.textPrimary,
      lineSpacing: 3,
      wordWrap: { width: width - 20, useAdvancedWrap: true },
    }).setDepth(1001);
    this.tooltipObjects.push(bg, label);
  }

  private hideTooltip(): void {
    for (const object of this.tooltipObjects) {
      object.destroy();
    }
    this.tooltipObjects = [];
  }

  private showToast(message: string): void {
    for (const object of this.toastObjects) {
      object.destroy();
    }
    this.toastObjects = [];

    const { width } = this.scale;
    const bg = this.add.rectangle(width / 2, 672, 620, 42, THEME.bgPanel, 0.98)
      .setStrokeStyle(1, THEME.accent, 0.7)
      .setDepth(900);
    const text = this.add.text(width / 2, 672, message, {
      ...THEME.fonts.hud,
      fontSize: '14px',
    }).setOrigin(0.5).setDepth(901);

    this.toastObjects.push(bg, text);
    this.time.delayedCall(1800, () => {
      for (const object of this.toastObjects) {
        object.destroy();
      }
      this.toastObjects = [];
    });
  }

  private handleEscape(): void {
    if (this.targetingConsumableId) {
      this.targetingConsumableId = null;
      this.render();
      return;
    }

    this.scene.start(this.returnScene);
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
    text.on('pointerover', () => {
      if (text.input?.enabled) text.setColor('#ffffff');
    });
    text.on('pointerout', () => {
      text.setColor(text.getData('baseColor') as string);
    });
    text.on('pointerdown', () => {
      if (text.input?.enabled) onClick();
    });

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

  private categoryRank(category: ItemCategory): number {
    switch (category) {
      case ItemCategory.EQUIPMENT:
        return 0;
      case ItemCategory.CONSUMABLE:
        return 1;
      case ItemCategory.RELIC:
        return 2;
      case ItemCategory.CURSED_RELIC:
        return 3;
    }
  }

  private rarityRank(rarity: Rarity): number {
    switch (rarity) {
      case Rarity.CURSED:
        return 5;
      case Rarity.EPIC:
        return 4;
      case Rarity.RARE:
        return 3;
      case Rarity.UNCOMMON:
        return 2;
      case Rarity.COMMON:
        return 1;
    }
  }

  private equipmentSlotLabel(slot: EquipmentSlot): string {
    return SLOT_LABELS[equipmentSlotToKey(slot)];
  }

  private setName(setId: string): string {
    return registry.getSet(setId).name;
  }

  private setChipLabel(activeSet: ActiveSet): string {
    return `${this.truncate(activeSet.set.name, 13)} ${activeSet.piecesEquipped}/${activeSet.set.itemIds.length}`;
  }

  private characterAccent(characterId: string): number {
    switch (characterId) {
      case 'bram':
        return 0xd5b46a;
      case 'vera':
        return 0xc5695a;
      case 'mira':
        return 0x8aa7c7;
      default:
        return 0x8dc08b;
    }
  }

  private colorString(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private formatStat(value: number): string {
    return Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;
  }

  private shortName(name: string): string {
    return name.split(',')[0];
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
  }

  private getInitials(name: string): string {
    return name
      .split(/[ ,]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
