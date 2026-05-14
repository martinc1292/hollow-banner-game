import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
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
    this.add.rectangle(width / 2, height / 2, width, height, 0x14110f, 1);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x241d17, 0.9);
    graphics.fillRect(0, 0, width, 112);
    graphics.lineStyle(1, 0x625136, 0.55);
    graphics.lineBetween(42, 112, width - 42, 112);

    graphics.lineStyle(1, 0x2c261f, 0.35);
    for (let x = 62; x < width; x += 80) {
      graphics.lineBetween(x, 136, x, height - 58);
    }
    for (let y = 140; y < height - 48; y += 58) {
      graphics.lineBetween(48, y, width - 48, y);
    }
  }

  private renderHeader(): void {
    const { width } = this.scale;
    const encounterLabel = this.encounterLabel(this.summary.encounterType);

    this.add.text(42, 28, 'Botin de victoria', {
      fontSize: '36px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0, 0);

    this.add.text(44, 70, encounterLabel, {
      fontSize: '15px',
      color: '#9f9582',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0, 0);

    this.renderPill(width - 262, 38, `XP +${this.summary.xpGained}`, 0x283424, '#d7f0b2');
    this.renderPill(width - 124, 38, `Oro +${this.summary.goldGained}`, 0x3a2d18, '#f4d57a');
  }

  private renderFixedRewardOutcome(): void {
    const { width, height } = this.scale;
    const title = this.summary.actComplete ? 'Acto 1 completado' : 'El Pregonero cae';
    const subtitle = this.summary.demoComplete
      ? 'La demo del MVP termina aca. Gracias por jugar.'
      : 'La voz del camino se apaga, pero deja una marca util.';
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

    this.add.text(width / 2, 120, title, {
      fontSize: '46px',
      color: '#f0d37a',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, 176, subtitle, {
      fontSize: '18px',
      color: '#bfb49c',
      fontFamily: 'Georgia, serif',
      align: 'center',
      wordWrap: { width: 760, useAdvancedWrap: true },
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, height / 2 + 15, 620, 220, 0x211c17, 0.98)
      .setStrokeStyle(2, 0xd1ad63, 0.82);
    this.add.text(width / 2, height / 2 - 72, 'Recompensas', {
      fontSize: '24px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 22, rewards, {
      fontSize: '19px',
      color: '#d8c8a8',
      fontFamily: 'Georgia, serif',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);

    const button = this.add.text(width / 2, height - 92, 'Continuar', {
      fontSize: '26px',
      color: '#e8ca79',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#fff0ad'));
    button.on('pointerout', () => button.setColor('#e8ca79'));
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
    this.add.rectangle(x, y, 112, 34, fill, 0.96)
      .setStrokeStyle(1, 0x766443, 0.72);
    this.add.text(x, y, label, {
      fontSize: '16px',
      color,
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private renderLevelUps(): void {
    const { width } = this.scale;
    const panelX = 42;
    const panelY = 132;
    const panelW = width - 84;
    const panelH = 84;

    this.add.rectangle(panelX, panelY, panelW, panelH, 0x1d1915, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x554a39, 0.82);

    this.add.text(panelX + 18, panelY + 15, 'Progreso', {
      fontSize: '18px',
      color: '#e4d1a2',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });

    const text = this.summary.levelUps.length > 0
      ? this.summary.levelUps.map((levelUp) => this.formatLevelUp(levelUp)).join('\n')
      : 'Sin subidas de nivel. La experiencia queda guardada para la siguiente batalla.';

    this.add.text(panelX + 140, panelY + 15, text, {
      fontSize: '14px',
      color: '#bfb49c',
      fontFamily: 'Georgia, serif',
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
    const card = this.add.container(x, y);
    card.setSize(CARD_WIDTH, CARD_HEIGHT);

    const glow = this.add.rectangle(-5, -5, CARD_WIDTH + 10, CARD_HEIGHT + 10, option.accent, 0.08)
      .setOrigin(0, 0)
      .setVisible(false);
    const background = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x211c17, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6a5a42, 0.88);
    const strip = this.add.rectangle(0, 0, CARD_WIDTH, 7, option.accent, 0.86)
      .setOrigin(0, 0);

    const kicker = this.add.text(18, 24, option.kicker, {
      fontSize: '12px',
      color: '#a99f8a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });

    const title = this.add.text(18, 48, option.title, {
      fontSize: '24px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      wordWrap: { width: CARD_WIDTH - 36, useAdvancedWrap: true },
    });

    const body = this.add.text(18, 104, option.body, {
      fontSize: '15px',
      color: '#beb49f',
      fontFamily: 'Georgia, serif',
      lineSpacing: 5,
      wordWrap: { width: CARD_WIDTH - 36, useAdvancedWrap: true },
    });

    const footer = this.add.text(18, CARD_HEIGHT - 31, 'Elegir', {
      fontSize: '15px',
      color: '#e8ca79',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    });

    card.add([glow, background, strip, kicker, title, body, footer]);

    background.setInteractive({ useHandCursor: true });
    background.on('pointerover', () => {
      glow.setVisible(true);
      background.setStrokeStyle(3, option.accent, 0.96);
      footer.setColor('#fff0ad');
    });
    background.on('pointerout', () => {
      glow.setVisible(false);
      background.setStrokeStyle(1, 0x6a5a42, 0.88);
      footer.setColor('#e8ca79');
    });
    background.on('pointerdown', () => this.applyReward(option));
  }

  private renderSkipButton(): void {
    const { width } = this.scale;
    const button = this.add.text(width / 2, 642, 'Saltear recompensa', {
      fontSize: '20px',
      color: '#bfb29a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setColor('#ffffff'));
    button.on('pointerout', () => button.setColor('#bfb29a'));
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
      body: `Bonus permanente para la run. ${this.shortName(reward.characterName)} conserva esta mejora en los proximos combates.`,
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
    const bg = this.add.rectangle(width / 2, 585, 560, 44, 0x252018, 0.98)
      .setStrokeStyle(1, 0xd1ad63, 0.8);
    const text = this.add.text(width / 2, 585, message, {
      fontSize: '16px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
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
    const panel = this.add.rectangle(width / 2, height / 2, 520, 230, 0x1c1714, 0.98)
      .setStrokeStyle(2, 0xc55f65, 0.9)
      .setDepth(701);
    const title = this.add.text(width / 2, height / 2 - 78, 'Pacto del Hambre', {
      fontSize: '28px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setDepth(702);
    const body = this.add.text(width / 2, height / 2 - 42, 'Elegir portador: +1 accion por round, no puede curarse.', {
      fontSize: '15px',
      color: '#cbbda1',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setDepth(702);

    this.pactObjects.push(shade, panel, title, body);

    const gap = 150;
    const startX = width / 2 - ((gameState.party.length - 1) * gap) / 2;
    gameState.party.forEach((character, index) => {
      const x = startX + index * gap;
      const button = this.add.text(x, height / 2 + 36, this.shortName(character.data.name), {
        fontSize: '20px',
        color: '#f0d37a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(702);

      button.on('pointerover', () => button.setColor('#fff0ad'));
      button.on('pointerout', () => button.setColor('#f0d37a'));
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
