import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';
import { gameState } from '@/systems/GameState';
import { saveManager } from '@/systems/SaveManager';
import {
  applyPermanentStatReward,
  describeStatReward,
  rarityLabel,
  rollItemDrop,
  rollPermanentStatReward,
  type CombatRewardSummary,
  type LevelUpResult,
  type PermanentStatReward,
} from '@/systems/Progression';
import {
  ItemCategory,
  SkillType,
  type EncounterType,
  type ItemData,
  type SkillData,
  type StatKey,
} from '@/types';

export type RewardSceneInitData = Partial<CombatRewardSummary>;

type RewardOptionKind = 'skill_upgrade' | 'stat' | 'item';

interface RewardOption {
  id: string;
  kind: RewardOptionKind;
  title: string;
  kicker: string;
  body: string;
  accent: number;
  skillId?: string;
  characterId?: string;
  statReward?: PermanentStatReward;
  itemId?: string;
}

const FALLBACK_ENCOUNTER_TYPE: EncounterType = 'normal';
const CARD_WIDTH = 330;
const CARD_HEIGHT = 238;
const CARD_GAP = 24;
const RARITY_COLORS = {
  COMMON: 0xb9aa8c,
  UNCOMMON: 0x78b56f,
  RARE: 0x74a8d8,
  EPIC: 0xc88dde,
  CURSED: 0xc55f65,
} as const;

export class RewardScene extends Phaser.Scene {
  private summary!: CombatRewardSummary;
  private rewardOptions: RewardOption[] = [];
  private resolved = false;
  private feedbackObjects: Phaser.GameObjects.GameObject[] = [];
  private pactObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.REWARD });
  }

  init(data: RewardSceneInitData = {}): void {
    this.summary = {
      encounterId: data.encounterId ?? 'unknown_encounter',
      encounterType: data.encounterType ?? FALLBACK_ENCOUNTER_TYPE,
      xpGained: data.xpGained ?? 0,
      goldGained: data.goldGained ?? 0,
      levelUps: data.levelUps ?? [],
      fixedRewardItemIds: data.fixedRewardItemIds ?? [],
      actComplete: data.actComplete ?? false,
      demoComplete: data.demoComplete ?? false,
      partyHealPercent: data.partyHealPercent,
    };
    this.rewardOptions = [];
    this.resolved = false;
    this.feedbackObjects = [];
    this.pactObjects = [];
  }

  create(): void {
    if (this.hasFixedRewardFlow()) {
      this.renderBackground();
      this.renderFixedRewardOutcome();
      return;
    }

    this.rewardOptions = this.buildRewardOptions();
    this.renderBackground();
    this.renderHeader();
    this.renderLevelUps();
    this.renderRewardCards();
    this.renderSkipButton();
  }

  private hasFixedRewardFlow(): boolean {
    return (
      (this.summary.fixedRewardItemIds?.length ?? 0) > 0
      || this.summary.actComplete === true
      || this.summary.demoComplete === true
    );
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1);
    addVignette(this, width, height);

    const graphics = this.add.graphics();
    graphics.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 62; x < width; x += 80) {
      graphics.lineBetween(x, 136, x, height - 58);
    }
    for (let y = 140; y < height - 48; y += 58) {
      graphics.lineBetween(48, y, width - 48, y);
    }
    drawSeparator(this, 42, 112, width - 84, THEME.accent, 0.4);
  }

  private renderHeader(): void {
    const { width } = this.scale;
    const encounterLabel = this.encounterLabel(this.summary.encounterType);

    this.add.text(width / 2, 28, 'RECOMPENSA', {
      ...THEME.fonts.heading,
      fontSize: '32px',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, 66, encounterLabel.toUpperCase(), {
      ...THEME.fonts.label,
      fontSize: '12px',
    }).setOrigin(0.5, 0);

    this.renderPill(width - 262, 38, `XP +${this.summary.xpGained}`, THEME.bgPanel, THEME.textPrimary);
    this.renderPill(width - 124, 38, `ORO +${this.summary.goldGained}`, THEME.bgPanel, THEME.accentHex);
  }

  private renderFixedRewardOutcome(): void {
    const { width, height } = this.scale;
    const title = this.summary.actComplete ? 'Acto 1 completado' : 'El Pregonero cae';
    const subtitle = this.summary.demoComplete
      ? 'La demo del MVP termina acá. Gracias por jugar.'
      : 'La voz del camino se apaga, pero deja una marca útil.';
    const itemLines = (this.summary.fixedRewardItemIds ?? [])
      .map((itemId) => `Reliquia: ${registry.getItem(itemId).name}`);
    const healLine = this.summary.partyHealPercent
      ? `Cura de party: ${Math.round(this.summary.partyHealPercent * 100)}% HP max`
      : null;
    const rewards = [
      `XP +${this.summary.xpGained}`,
      `Oro +${this.summary.goldGained}`,
      ...itemLines,
      ...(healLine ? [healLine] : []),
    ].join('\n');

    this.add.text(width / 2, 120, title.toUpperCase(), {
      ...THEME.fonts.heading,
      fontSize: '42px',
    }).setOrigin(0.5);

    this.add.text(width / 2, 176, subtitle, {
      ...THEME.fonts.dialogue,
      fontSize: '18px',
      color: THEME.textPrimary,
      align: 'center',
      wordWrap: { width: 760, useAdvancedWrap: true },
    }).setOrigin(0.5);

    const pw = 620, ph = 220;
    const px = width / 2 - pw / 2;
    const py = height / 2 - 94;
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(THEME.bgPanel, 0.98);
    panelGfx.fillRect(px, py, pw, ph);
    drawCornerBox(panelGfx, px, py, pw, ph, 14, THEME.accent, 0.8);

    this.add.text(width / 2, height / 2 - 78, 'RECOMPENSAS', {
      ...THEME.fonts.label,
      fontSize: '13px',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 44, rewards, {
      ...THEME.fonts.body,
      fontSize: '17px',
      color: THEME.textPrimary,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);

    const button = this.add.text(width / 2, height - 92, 'CONTINUAR', {
      ...THEME.fonts.button,
      fontSize: '20px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#ffffff'));
    button.on('pointerout', () => button.setColor(THEME.accentHex));
    button.on('pointerdown', () => this.finishFixedRewardFlow());
  }

  private finishFixedRewardFlow(): void {
    if (this.resolved) return;

    this.resolved = true;
    if (this.summary.demoComplete) {
      gameState.clearActiveCombat();
      const mapState = gameState.currentMap;
      const currentNode = mapState?.getCurrentNode();
      if (mapState && currentNode && !currentNode.completed) {
        mapState.completeNode(currentNode.id);
      }
      this.scene.start(SceneKeys.DEMO_COMPLETE);
      return;
    }

    gameState.clearActiveCombat();
    this.scene.start(SceneKeys.MAP, { completedCombat: true });
  }

  private renderPill(
    x: number,
    y: number,
    label: string,
    fill: number,
    color: string,
  ): void {
    const pillGfx = this.add.graphics();
    pillGfx.fillStyle(fill, 0.96);
    pillGfx.fillRect(x - 56, y - 17, 112, 34);
    drawCornerBox(pillGfx, x - 56, y - 17, 112, 34, 6, THEME.accentDim, 0.6);
    this.add.text(x, y, label, {
      ...THEME.fonts.hudSmall,
      fontSize: '13px',
      color,
    }).setOrigin(0.5);
  }

  private renderLevelUps(): void {
    const { width } = this.scale;
    const panelX = 42;
    const panelY = 132;
    const panelW = width - 84;
    const panelH = 84;

    const levelGfx = this.add.graphics();
    levelGfx.fillStyle(THEME.bgPanel, 0.95);
    levelGfx.fillRect(panelX, panelY, panelW, panelH);
    drawCornerBox(levelGfx, panelX, panelY, panelW, panelH, 10, THEME.accentDim, 0.5);

    this.add.text(panelX + 18, panelY + 15, 'PROGRESO', {
      ...THEME.fonts.label,
      fontSize: '12px',
    });

    const text = this.summary.levelUps.length > 0
      ? this.summary.levelUps.map((levelUp) => this.formatLevelUp(levelUp)).join('\n')
      : 'Sin subidas de nivel. La experiencia queda guardada para la siguiente batalla.';

    this.add.text(panelX + 140, panelY + 15, text, {
      ...THEME.fonts.body,
      fontSize: '13px',
      color: THEME.textPrimary,
      lineSpacing: 5,
      wordWrap: { width: panelW - 170, useAdvancedWrap: true },
    });
  }

  private renderRewardCards(): void {
    const { width } = this.scale;
    const totalWidth = CARD_WIDTH * 3 + CARD_GAP * 2;
    const startX = (width - totalWidth) / 2;
    const y = 255;

    this.rewardOptions.forEach((option, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_GAP);
      this.renderRewardCard(option, x, y);
    });
  }

  private renderRewardCard(option: RewardOption, x: number, y: number): void {
    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(THEME.bgPanel, 0.97);
    cardGfx.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT);
    drawCornerBox(cardGfx, x, y, CARD_WIDTH, CARD_HEIGHT, 12, option.accent, 0.7);
    cardGfx.setInteractive(
      new Phaser.Geom.Rectangle(x, y, CARD_WIDTH, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    const strip = this.add.rectangle(x, y, CARD_WIDTH, 5, option.accent, 0.85).setOrigin(0, 0);

    const kicker = this.add.text(x + 18, y + 20, option.kicker.toUpperCase(), {
      ...THEME.fonts.hudSmall,
      fontSize: '11px',
      color: THEME.textDim,
    });

    const title = this.add.text(x + 18, y + 44, option.title.toUpperCase(), {
      ...THEME.fonts.hud,
      fontSize: '14px',
      wordWrap: { width: CARD_WIDTH - 36, useAdvancedWrap: true },
    });

    const body = this.add.text(x + 18, y + 96, option.body, {
      ...THEME.fonts.body,
      fontSize: '14px',
      color: THEME.textPrimary,
      lineSpacing: 5,
      wordWrap: { width: CARD_WIDTH - 36, useAdvancedWrap: true },
    });

    const footer = this.add.text(x + 18, y + CARD_HEIGHT - 30, 'ELEGIR', {
      ...THEME.fonts.hudSmall,
      color: THEME.accentHex,
    });

    cardGfx.on('pointerover', () => {
      cardGfx.clear();
      cardGfx.fillStyle(THEME.bgPanel, 0.97);
      cardGfx.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT);
      drawCornerBox(cardGfx, x, y, CARD_WIDTH, CARD_HEIGHT, 12, option.accent, 1);
      footer.setColor('#ffffff');
    });
    cardGfx.on('pointerout', () => {
      cardGfx.clear();
      cardGfx.fillStyle(THEME.bgPanel, 0.97);
      cardGfx.fillRect(x, y, CARD_WIDTH, CARD_HEIGHT);
      drawCornerBox(cardGfx, x, y, CARD_WIDTH, CARD_HEIGHT, 12, option.accent, 0.7);
      footer.setColor(THEME.accentHex);
    });
    cardGfx.on('pointerdown', () => this.applyReward(option));

    [kicker, title, body, footer, strip].forEach(() => {});
  }

  private renderSkipButton(): void {
    const { width } = this.scale;
    const button = this.add.text(width / 2, 642, 'SALTEAR RECOMPENSA', {
      ...THEME.fonts.hudSmall,
      fontSize: '13px',
      color: THEME.textDim,
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setColor(THEME.textPrimary));
    button.on('pointerout', () => button.setColor(THEME.textDim));
    button.on('pointerdown', () => this.finishRewards('Solo XP y oro reclamados.'));
  }

  private buildRewardOptions(): RewardOption[] {
    return [
      this.buildSkillUpgradeOption(),
      this.buildStatRewardOption(),
      this.buildItemRewardOption(),
    ];
  }

  private buildSkillUpgradeOption(): RewardOption {
    const skill = this.pickSkillForUpgrade();
    const characterName = skill ? this.shortName(registry.getCharacter(skill.characterId).name) : 'Party';

    return {
      id: 'skill_upgrade',
      kind: 'skill_upgrade',
      title: skill ? skill.name : 'Entrenamiento',
      kicker: `${characterName} - mejora futura`,
      body: 'La mejora de habilidades queda reservada para el sistema de campamento. No aplica cambios por ahora.',
      accent: 0xd1ad63,
      skillId: skill?.id,
      characterId: skill?.characterId,
    };
  }

  private buildStatRewardOption(): RewardOption {
    const reward = rollPermanentStatReward(gameState.party);

    return {
      id: 'stat_reward',
      kind: 'stat',
      title: describeStatReward(reward.stat, reward.amount),
      kicker: this.shortName(reward.characterName),
      body: `Bonus permanente para la run. ${this.shortName(reward.characterName)} conserva esta mejora en los próximos combates.`,
      accent: 0x87b879,
      characterId: reward.characterId,
      statReward: reward,
    };
  }

  private buildItemRewardOption(): RewardOption {
    const item = rollItemDrop(registry.getAllItems(), this.summary.encounterType);
    const accent = RARITY_COLORS[item.rarity];

    return {
      id: 'item_reward',
      kind: 'item',
      title: item.name,
      kicker: `${rarityLabel(item.rarity)} - ${this.categoryLabel(item.category)}`,
      body: this.itemBody(item),
      accent,
      itemId: item.id,
    };
  }

  private applyReward(option: RewardOption): void {
    if (this.resolved) return;

    if (option.kind === 'stat' && option.statReward) {
      const character = gameState.party.find((member) => member.data.id === option.statReward?.characterId);
      if (!character) {
        throw new Error(`RewardScene: character not found '${option.statReward.characterId}'`);
      }
      applyPermanentStatReward(character, option.statReward);
      this.finishRewards(`${this.shortName(character.data.name)} gana ${describeStatReward(option.statReward.stat, option.statReward.amount)}.`);
      return;
    }

    if (option.kind === 'item' && option.itemId) {
      const item = registry.getItem(option.itemId);
      if (item.id === 'pacto_hambre' && gameState.party.length > 0) {
        this.showPactTargetSelection(item);
        return;
      }
      gameState.addItem(item.id);
      this.finishRewards(`${item.name} agregado al inventario.`);
      return;
    }

    this.finishRewards('Entrenamiento reservado para mejoras futuras.');
  }

  private finishRewards(message: string): void {
    if (this.resolved) return;

    this.resolved = true;
    this.showFeedback(message);
    gameState.clearActiveCombat();
    saveManager.save();
    this.time.delayedCall(650, () => {
      this.scene.start(SceneKeys.MAP, { completedCombat: true });
    });
  }

  private showFeedback(message: string): void {
    for (const object of this.feedbackObjects) {
      object.destroy();
    }
    this.feedbackObjects = [];

    const { width } = this.scale;
    const bg = this.add.rectangle(width / 2, 585, 560, 44, THEME.bgPanel, 0.98)
      .setStrokeStyle(1, THEME.accent, 0.7);
    const text = this.add.text(width / 2, 585, message, {
      ...THEME.fonts.hud,
      fontSize: '14px',
    }).setOrigin(0.5);

    this.feedbackObjects.push(bg, text);
  }

  private showPactTargetSelection(item: ItemData): void {
    for (const object of this.pactObjects) {
      object.destroy();
    }
    this.pactObjects = [];

    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.62)
      .setInteractive()
      .setDepth(700);
    const pw = 520, ph = 230;
    const px = width / 2 - pw / 2;
    const py = height / 2 - ph / 2;
    const panelGfx = this.add.graphics().setDepth(701);
    panelGfx.fillStyle(THEME.bgPanel, 0.98);
    panelGfx.fillRect(px, py, pw, ph);
    drawCornerBox(panelGfx, px, py, pw, ph, 14, 0xc55f65, 0.9);
    const title = this.add.text(width / 2, height / 2 - 78, 'PACTO DEL HAMBRE', {
      ...THEME.fonts.heading,
      fontSize: '24px',
    }).setOrigin(0.5).setDepth(702);
    const body = this.add.text(width / 2, height / 2 - 42, 'Elegir portador: +1 accion por round, no puede curarse.', {
      ...THEME.fonts.body,
      fontSize: '14px',
      color: THEME.textPrimary,
    }).setOrigin(0.5).setDepth(702);

    this.pactObjects.push(shade, panelGfx, title, body);

    const gap = 150;
    const startX = width / 2 - ((gameState.party.length - 1) * gap) / 2;
    gameState.party.forEach((character, index) => {
      const x = startX + index * gap;
      const button = this.add.text(x, height / 2 + 36, this.shortName(character.data.name).toUpperCase(), {
        ...THEME.fonts.hud,
        fontSize: '16px',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(702);

      button.on('pointerover', () => button.setColor('#ffffff'));
      button.on('pointerout', () => button.setColor(THEME.accentHex));
      button.on('pointerdown', () => {
        gameState.addItem(item.id, { relicTargetCharacterId: character.data.id });
        this.finishRewards(`${item.name} ligado a ${this.shortName(character.data.name)}.`);
      });

      this.pactObjects.push(button);
    });
  }

  private pickSkillForUpgrade(): SkillData | null {
    const candidates = gameState.party.flatMap((character) => (
      character.data.skillIds
        .map((skillId) => registry.getSkill(skillId))
        .filter((skill) => skill.type === SkillType.ACTIVE && !skill.id.endsWith('_basic'))
    ));

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private formatLevelUp(levelUp: LevelUpResult): string {
    const stats = this.formatStats(levelUp.gainedStats);
    return `${this.shortName(levelUp.characterName)} nivel ${levelUp.fromLevel} -> ${levelUp.toLevel}: ${stats}`;
  }

  private formatStats(stats: Partial<Record<StatKey, number>>): string {
    return Object.entries(stats)
      .map(([stat, amount]) => describeStatReward(stat as StatKey, amount ?? 0))
      .join(', ');
  }

  private itemBody(item: ItemData): string {
    const effects = item.effects.map((effect) => effect.description).join('\n');
    return `${item.description}${effects && effects !== item.description ? `\n${effects}` : ''}`;
  }

  private categoryLabel(category: ItemCategory): string {
    switch (category) {
      case ItemCategory.CONSUMABLE:
        return 'Consumible';
      case ItemCategory.EQUIPMENT:
        return 'Equipo';
      case ItemCategory.RELIC:
        return 'Reliquia';
      case ItemCategory.CURSED_RELIC:
        return 'Reliquia maldita';
    }
  }

  private encounterLabel(encounterType: EncounterType): string {
    switch (encounterType) {
      case 'normal':
        return 'Combate normal';
      case 'elite':
        return 'Combate elite';
      case 'miniboss':
        return 'Mini-jefe';
      case 'boss':
        return 'Jefe';
    }
  }

  private shortName(fullName: string): string {
    const comma = fullName.indexOf(',');
    return comma >= 0 ? fullName.slice(0, comma) : fullName;
  }
}
