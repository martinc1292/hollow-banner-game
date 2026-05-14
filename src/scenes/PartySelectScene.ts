import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
import { gameState } from '@/systems/GameState';
import { createCharacterInstance } from '@/systems/battle/BattleState';
import {
  CharacterClass,
  SkillType,
  type CharacterData,
  type SkillData,
  type Stats,
} from '@/types';
import { THEME } from '@/ui/UITheme';
import { drawSeparator, addVignette } from '@/ui/UIHelpers';

const MAX_PARTY_SIZE = 4;
const CARD_HEIGHT = 438;
const CARD_GAP = 18;

const CLASS_LABELS: Record<CharacterClass, string> = {
  [CharacterClass.KNIGHT]: 'Caballero',
  [CharacterClass.MERCENARY]: 'Mercenaria',
  [CharacterClass.SORCERESS]: 'Hechicera',
  [CharacterClass.PRIEST]: 'Sacerdote',
  [CharacterClass.HUNTER]: 'Cazadora',
};

const PORTRAIT_ASSETS: Record<string, { key: string; path: string }> = {
  bram: { key: 'portrait_bram', path: '/assets/characters/bram_tank.png' },
  vera: { key: 'portrait_vera', path: '/assets/characters/vera_dps.png' },
  mira: { key: 'portrait_mira', path: '/assets/characters/mira_mage.png' },
  aren: { key: 'portrait_aren', path: '/assets/characters/aren_support.png' },
  lyra: { key: 'portrait_lyra', path: '/assets/characters/lyra_control.png' },
};

// Acentos por personaje — no cambian con el tema global
const CHARACTER_ACCENTS: Record<string, number> = {
  bram: 0xd5b46a,
  vera: 0xc5695a,
  mira: 0x8aa7c7,
  aren: 0x8dc08b,
  lyra: 0xb98dc7,
};

interface CharacterCardView {
  background: Phaser.GameObjects.Rectangle;
  selectionPlate: Phaser.GameObjects.Rectangle;
  selectionText: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
  hoverGlow: Phaser.GameObjects.Rectangle;
}

export class PartySelectScene extends Phaser.Scene {
  private availableCharacters: CharacterData[] = [];
  private selectedIds = new Set<string>();
  private cardViews = new Map<string, CharacterCardView>();
  private hoveredIds = new Set<string>();
  private startButton!: Phaser.GameObjects.Text;
  private partySummary!: Phaser.GameObjects.Text;
  private limitNotice!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.PARTY_SELECT });
  }

  preload(): void {
    for (const character of registry.getAllCharacters()) {
      const portrait = PORTRAIT_ASSETS[character.id];
      if (portrait && !this.textures.exists(portrait.key)) {
        this.load.image(portrait.key, portrait.path);
      }
    }
  }

  init(): void {
    this.availableCharacters = registry.getAllCharacters();
    this.selectedIds = new Set<string>();
    this.cardViews = new Map<string, CharacterCardView>();
    this.hoveredIds = new Set<string>();
  }

  create(): void {
    this.renderBackground();
    this.renderHeader();
    this.renderCharacterCards();
    this.renderFooter();
    this.updateSelectionUi();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1);

    addVignette(this, width, height);

    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 56; x < width; x += 74) {
      grid.lineBetween(x, 98, x, height - 72);
    }
    for (let y = 104; y < height - 52; y += 58) {
      grid.lineBetween(48, y, width - 48, y);
    }

    // Banner de header — solo línea de separación
    const banner = this.add.graphics();
    banner.fillStyle(THEME.bgPanel, 0.85);
    banner.fillRect(0, 0, width, 92);
  }

  private renderHeader(): void {
    const { width } = this.scale;

    this.add
      .text(42, 22, 'SELECCIÓN DE PARTY', {
        ...THEME.fonts.heading,
        fontSize: '28px',
      })
      .setOrigin(0, 0);

    this.add
      .text(44, 58, 'El estandarte solo avanza con quienes lo cargan.', {
        ...THEME.fonts.dialogue,
        fontSize: '14px',
        color: THEME.textDim,
      })
      .setOrigin(0, 0);

    this.add
      .text(width - 44, 34, `${this.availableCharacters.length} DISPONIBLES`, {
        ...THEME.fonts.label,
        fontSize: '14px',
      })
      .setOrigin(1, 0);

    drawSeparator(this, 0, 92, width, THEME.accent, 0.35);
  }

  private renderCharacterCards(): void {
    const { width } = this.scale;
    const count = Math.max(1, Math.min(this.availableCharacters.length, 5));
    const usableWidth = width - 132;
    const cardWidth = Math.min(246, (usableWidth - CARD_GAP * (count - 1)) / count);
    const totalWidth = cardWidth * count + CARD_GAP * (count - 1);
    const startX = (width - totalWidth) / 2;
    const topY = 108;

    this.availableCharacters.forEach((character, index) => {
      const x = startX + index * (cardWidth + CARD_GAP);
      this.renderCharacterCard(character, x, topY, cardWidth);
    });
  }

  private renderCharacterCard(
    character: CharacterData,
    x: number,
    y: number,
    cardWidth: number,
  ): void {
    const accent = CHARACTER_ACCENTS[character.id] ?? 0xd0b36f;
    const container = this.add.container(x, y);
    container.setSize(cardWidth, CARD_HEIGHT);

    const hitArea = this.add
      .rectangle(cardWidth / 2, CARD_HEIGHT / 2, cardWidth, CARD_HEIGHT, 0x000000, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      this.hoveredIds.add(character.id);
      this.updateCardState(character.id);
    });
    hitArea.on('pointerout', () => {
      this.hoveredIds.delete(character.id);
      this.updateCardState(character.id);
    });
    hitArea.on('pointerdown', () => this.toggleCharacter(character.id));

    const hoverGlow = this.add
      .rectangle(-5, -5, cardWidth + 10, CARD_HEIGHT + 10, accent, 0.08)
      .setOrigin(0, 0)
      .setVisible(false);
    const background = this.add
      .rectangle(0, 0, cardWidth, CARD_HEIGHT, THEME.bgPanel, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, THEME.accentDim, 0.4);
    const headerStrip = this.add
      .rectangle(0, 0, cardWidth, 5, accent, 0.85)
      .setOrigin(0, 0);

    container.add([hoverGlow, background, headerStrip]);
    this.renderPortrait(container, character, cardWidth, accent);
    this.renderCardText(container, character, cardWidth);

    const selectionPlate = this.add
      .rectangle(cardWidth - 72, 18, 58, 22, THEME.bgDeep, 0.92)
      .setOrigin(0.5)
      .setStrokeStyle(1, accent, 0.68);
    const selectionText = this.add
      .text(cardWidth - 72, 18, '', {
        ...THEME.fonts.hudSmall,
        color: THEME.accentHex,
      })
      .setOrigin(0.5);
    const marker = this.add
      .text(18, 18, '', {
        ...THEME.fonts.hud,
        color: THEME.accentHex,
      })
      .setOrigin(0.5);
    container.add([selectionPlate, selectionText, marker, hitArea]);

    this.cardViews.set(character.id, {
      background,
      hoverGlow,
      selectionPlate,
      selectionText,
      marker,
    });
  }

  private renderPortrait(
    container: Phaser.GameObjects.Container,
    character: CharacterData,
    cardWidth: number,
    accent: number,
  ): void {
    const frame = this.add
      .rectangle(cardWidth / 2, 58, 88, 88, THEME.bgDeep, 0.95)
      .setStrokeStyle(1, accent, 0.7);
    container.add(frame);

    const portrait = PORTRAIT_ASSETS[character.id];
    if (portrait && this.textures.exists(portrait.key)) {
      const image = this.add.image(cardWidth / 2, 58, portrait.key).setDisplaySize(74, 74);
      container.add(image);
      return;
    }

    const sigil = this.add
      .circle(cardWidth / 2, 58, 32, accent, 0.34)
      .setStrokeStyle(1, THEME.textPrimaryNum, 0.4);
    const initials = this.add.text(cardWidth / 2, 58, this.getInitials(character.name), {
      ...THEME.fonts.heading,
      fontSize: '22px',
    }).setOrigin(0.5);
    container.add([sigil, initials]);
  }

  private renderCardText(
    container: Phaser.GameObjects.Container,
    character: CharacterData,
    cardWidth: number,
  ): void {
    const contentWidth = cardWidth - 28;
    const skills = this.getCharacterSkills(character);
    const skillText = skills.map((skill) => this.formatSkillName(skill)).join('\n');

    const name = this.add.text(cardWidth / 2, 109, character.name.toUpperCase(), {
      ...THEME.fonts.hud,
      fontSize: '14px',
      color: THEME.textPrimary,
      align: 'center',
      fixedWidth: contentWidth,
      wordWrap: { width: contentWidth, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);

    const classText = this.add.text(cardWidth / 2, 132, CLASS_LABELS[character.className].toUpperCase(), {
      ...THEME.fonts.label,
      fontSize: '11px',
      align: 'center',
      fixedWidth: contentWidth,
    }).setOrigin(0.5, 0);

    const stats = this.renderStatsGrid(character.baseStats, cardWidth, 158);

    const description = this.add.text(14, 228, this.shortDescription(character.description), {
      ...THEME.fonts.body,
      fontSize: '11px',
      color: THEME.textPrimary,
      lineSpacing: 3,
      wordWrap: { width: contentWidth, useAdvancedWrap: true },
    });

    const skillsTitle = this.add.text(14, 296, 'HABILIDADES', {
      ...THEME.fonts.label,
      fontSize: '10px',
    });

    const skillsList = this.add.text(14, 314, skillText, {
      ...THEME.fonts.body,
      fontSize: '10px',
      color: THEME.textDim,
      lineSpacing: 2,
      wordWrap: { width: contentWidth, useAdvancedWrap: true },
    });

    container.add([name, classText, ...stats, description, skillsTitle, skillsList]);
  }

  private renderStatsGrid(stats: Stats, cardWidth: number, y: number): Phaser.GameObjects.GameObject[] {
    const rows: Array<[string, string]> = [
      ['HP', `${stats.hpMax}`],
      ['ATQ', `${stats.attack}`],
      ['POD', `${stats.power}`],
      ['DEF', `${stats.defense}`],
      ['VEL', `${stats.speed}`],
      ['CRIT', `${stats.crit}%`],
    ];
    const objects: Phaser.GameObjects.GameObject[] = [];
    const boxGap = 6;
    const boxWidth = (cardWidth - 28 - boxGap * 2) / 3;
    const boxHeight = 26;

    rows.forEach(([label, value], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 14 + col * (boxWidth + boxGap);
      const boxY = y + row * (boxHeight + 5);
      const box = this.add
        .rectangle(x, boxY, boxWidth, boxHeight, THEME.bgDeep, 0.96)
        .setOrigin(0, 0)
        .setStrokeStyle(1, THEME.accentDeep, 0.6);
      const statText = this.add.text(x + boxWidth / 2, boxY + boxHeight / 2, `${label} ${value}`, {
        ...THEME.fonts.hudSmall,
        color: THEME.textPrimary,
      }).setOrigin(0.5);
      objects.push(box, statText);
    });

    return objects;
  }

  private renderFooter(): void {
    const { width, height } = this.scale;

    drawSeparator(this, 0, height - 80, width, THEME.accent, 0.3);

    const footerGfx = this.add.graphics();
    footerGfx.fillStyle(THEME.bgPanel, 0.92);
    footerGfx.fillRect(0, height - 80, width, 80);

    this.partySummary = this.add.text(64, height - 62, '', {
      ...THEME.fonts.hud,
      color: THEME.textPrimary,
      fixedWidth: width - 360,
      wordWrap: { width: width - 360, useAdvancedWrap: true },
    });

    this.limitNotice = this.add.text(64, height - 36, '', {
      ...THEME.fonts.hudSmall,
      color: THEME.textDim,
      fixedWidth: width - 360,
      wordWrap: { width: width - 360, useAdvancedWrap: true },
    });

    this.startButton = this.createSceneButton(width - 205, height - 42, 'COMENZAR RUN', () => {
      this.startRun();
    }, {
      baseColor: THEME.accentHex,
      hoverColor: '#ffffff',
      disabledColor: THEME.accentDeepHex,
      fontSize: '20px',
    });

    this.createSceneButton(width - 82, height - 20, 'VOLVER', () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    }, {
      baseColor: THEME.textDim,
      hoverColor: THEME.accentHex,
      fontSize: '14px',
    });
  }

  private createSceneButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    options: {
      baseColor: string;
      hoverColor: string;
      disabledColor?: string;
      fontSize: string;
    },
  ): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      ...THEME.fonts.button,
      fontSize: options.fontSize,
      color: options.baseColor,
    }).setOrigin(0.5);

    button.setData('baseColor', options.baseColor);
    button.setData('hoverColor', options.hoverColor);
    button.setData('disabledColor', options.disabledColor ?? options.baseColor);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      if (button.input?.enabled) {
        button.setColor(button.getData('hoverColor') as string);
      }
    });
    button.on('pointerout', () => {
      button.setColor(button.getData('baseColor') as string);
    });
    button.on('pointerdown', () => {
      if (button.input?.enabled) {
        onClick();
      }
    });

    return button;
  }

  private toggleCharacter(characterId: string): void {
    if (this.selectedIds.has(characterId)) {
      this.selectedIds.delete(characterId);
      this.updateSelectionUi();
      return;
    }

    if (this.selectedIds.size >= MAX_PARTY_SIZE) {
      this.limitNotice.setText(`Máximo ${MAX_PARTY_SIZE} personajes en la party.`);
      return;
    }

    this.selectedIds.add(characterId);
    this.updateSelectionUi();
  }

  private updateSelectionUi(): void {
    for (const character of this.availableCharacters) {
      this.updateCardState(character.id);
    }

    const selectedNames = this.availableCharacters
      .filter((character) => this.selectedIds.has(character.id))
      .map((character) => this.shortName(character.name));
    const selectedCount = this.selectedIds.size;

    this.partySummary.setText(
      selectedNames.length > 0
        ? `Party: ${selectedNames.join(' / ')}`
        : 'Party: sin integrantes',
    );
    this.limitNotice.setText(
      selectedCount > 0
        ? `${selectedCount}/${MAX_PARTY_SIZE} elegidos. Sin personajes repetidos.`
        : `Elige de 1 a ${MAX_PARTY_SIZE} personajes para iniciar la run.`,
    );
    this.updateStartButtonState();
  }

  private updateCardState(characterId: string): void {
    const view = this.cardViews.get(characterId);
    if (!view) return;

    const isSelected = this.selectedIds.has(characterId);
    const isHovered = this.hoveredIds.has(characterId);
    const accent = CHARACTER_ACCENTS[characterId] ?? 0xd0b36f;

    view.background.setFillStyle(isSelected ? 0x120f1e : THEME.bgPanel, 0.98);
    view.background.setStrokeStyle(isSelected ? 2 : isHovered ? 1 : 1, isSelected ? THEME.accent : THEME.accentDim, isSelected ? 0.8 : 0.35);
    view.hoverGlow.setVisible(isSelected || isHovered);
    view.hoverGlow.setFillStyle(isSelected ? THEME.accent : accent, isSelected ? 0.1 : 0.06);
    view.selectionPlate.setFillStyle(isSelected ? THEME.accent : THEME.bgDeep, isSelected ? 0.85 : 0.7);
    view.selectionText.setText(isSelected ? 'ELEGIDO' : '');
    view.selectionText.setColor(isSelected ? THEME.bgDeepHex : THEME.accentHex);
    view.marker.setText(isSelected ? '◆' : '');
  }

  private updateStartButtonState(): void {
    const canStart = this.selectedIds.size >= 1 && this.selectedIds.size <= MAX_PARTY_SIZE;

    if (canStart) {
      this.startButton.setInteractive({ useHandCursor: true });
      this.startButton.setColor(this.startButton.getData('baseColor') as string);
      return;
    }

    this.startButton.disableInteractive();
    this.startButton.setColor(this.startButton.getData('disabledColor') as string);
  }

  private startRun(): void {
    if (this.selectedIds.size < 1 || this.selectedIds.size > MAX_PARTY_SIZE) {
      return;
    }

    const party = this.availableCharacters
      .filter((character) => this.selectedIds.has(character.id))
      .map((character) => createCharacterInstance(character));

    gameState.startNewRun();
    gameState.setParty(party);
    this.scene.start(SceneKeys.MAP);
  }

  private getCharacterSkills(character: CharacterData): SkillData[] {
    return character.skillIds.map((skillId) => registry.getSkill(skillId));
  }

  private formatSkillName(skill: SkillData): string {
    const badge: Record<SkillType, string> = {
      [SkillType.ACTIVE]: 'Act',
      [SkillType.PASSIVE]: 'Pas',
      [SkillType.NATIVE]: 'Nat',
      [SkillType.ULTIMATE]: 'Ult',
    };
    return `${badge[skill.type]} — ${skill.name}`;
  }

  private shortDescription(description: string): string {
    if (description.length <= 105) {
      return description;
    }

    const clipped = description.slice(0, 102);
    const lastSpace = clipped.lastIndexOf(' ');
    return `${clipped.slice(0, lastSpace > 70 ? lastSpace : 102)}...`;
  }

  private shortName(name: string): string {
    return name.split(',')[0];
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
