import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
import { THEME } from '@/ui/UITheme';
import { drawCornerBox, drawSeparator, addVignette } from '@/ui/UIHelpers';
import { gameState } from '@/systems/GameState';
import {
  addRolledItem,
  addStatusToParty,
  completeCurrentMapNode,
  damageParty,
  ensureRunParty,
  getShortName,
  healPartyByAmount,
  healPartyByPercent,
  modifyCharacterStat,
  modifyPartyStat,
  statLabel,
} from '@/systems/noncombat/NonCombatActions';
import { saveManager } from '@/systems/SaveManager';
import {
  type EventData,
  type EventEffect,
  type EventOption,
  type EventOutcome,
  type EventRequirement,
  type ItemData,
  type StatKey,
} from '@/types';

interface EventSceneInitData {
  eventId?: string;
}

interface EffectResolution {
  message: string | null;
  combatEncounterId: string | null;
}

const OPTION_WIDTH = 330;
const OPTION_HEIGHT = 94;
const OPTION_GAP = 22;

export class EventScene extends Phaser.Scene {
  private eventData!: EventData;
  private pendingEventId?: string;
  private resolved = false;
  private viewObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SceneKeys.EVENT });
  }

  init(data: EventSceneInitData = {}): void {
    this.pendingEventId = data.eventId;
    this.resolved = false;
    this.viewObjects = [];
  }

  create(): void {
    ensureRunParty();
    this.eventData = this.resolveEvent();
    this.render();
  }

  private render(): void {
    this.clearViewObjects();
    this.renderBackground();
    this.renderEventText();
    this.renderOptions();
  }

  private renderBackground(): void {
    const { width, height } = this.scale;
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, THEME.bgDeep, 1));
    this.addViewObject(addVignette(this, width, height));

    const grid = this.add.graphics();
    grid.lineStyle(1, THEME.accentDeep, 0.07);
    for (let x = 60; x < width; x += 88) {
      grid.lineBetween(x, 110, x, height - 56);
    }
    for (let y = 126; y < height - 52; y += 58) {
      grid.lineBetween(42, y, width - 42, y);
    }
    this.addViewObject(grid);
    this.addViewObject(drawSeparator(this, 42, 104, width - 84, THEME.accent, 0.4));
  }

  private renderEventText(): void {
    const { width } = this.scale;

    this.addViewObject(this.add.text(width / 2, 68, 'EVENTO', {
      ...THEME.fonts.label,
      fontSize: '13px',
    }).setOrigin(0.5));

    this.addViewObject(this.add.text(width / 2, 128, this.eventData.title.toUpperCase(), {
      ...THEME.fonts.heading,
      fontSize: '38px',
      align: 'center',
    }).setOrigin(0.5));

    this.addViewObject(drawSeparator(this, width / 2 - 300, 168, 600, THEME.accentDim, 0.4));

    this.addViewObject(this.add.text(width / 2, 196, this.eventData.description, {
      ...THEME.fonts.dialogue,
      fontSize: '18px',
      color: THEME.textPrimary,
      align: 'center',
      lineSpacing: 7,
      wordWrap: { width: 760, useAdvancedWrap: true },
    }).setOrigin(0.5));
  }

  private renderOptions(): void {
    const count = this.eventData.options.length;
    const totalWidth = count * OPTION_WIDTH + (count - 1) * OPTION_GAP;
    const startX = this.scale.width / 2 - totalWidth / 2;
    const y = 484;

    this.eventData.options.forEach((option, index) => {
      this.renderOption(option, startX + index * (OPTION_WIDTH + OPTION_GAP), y);
    });
  }

  private renderOption(option: EventOption, x: number, y: number): void {
    const met = this.requirementsMet(option.requirements ?? []);
    const accentColor = met ? THEME.accent : THEME.accentDeep;
    const accentAlpha = met ? 0.85 : 0.35;

    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(THEME.bgPanel, met ? 0.97 : 0.85);
    bgGfx.fillRect(x, y, OPTION_WIDTH, OPTION_HEIGHT);
    drawCornerBox(bgGfx, x, y, OPTION_WIDTH, OPTION_HEIGHT, 12, accentColor, accentAlpha);

    const title = this.add.text(x + 16, y + 14, option.text.toUpperCase(), {
      ...THEME.fonts.button,
      fontSize: '15px',
      color: met ? THEME.accentHex : THEME.accentDeepHex,
      fixedWidth: OPTION_WIDTH - 32,
      letterSpacing: 2,
    });
    const requirementText = this.requirementsLabel(option.requirements ?? []);
    const body = this.add.text(x + 16, y + 46, requirementText || 'Sin requisito', {
      ...THEME.fonts.body,
      fontSize: '12px',
      color: met ? THEME.textPrimary : THEME.textDim,
      wordWrap: { width: OPTION_WIDTH - 32, useAdvancedWrap: true },
    });

    this.addViewObject(bgGfx);
    this.addViewObject(title);
    this.addViewObject(body);

    if (!met) return;

    bgGfx.setInteractive(new Phaser.Geom.Rectangle(x, y, OPTION_WIDTH, OPTION_HEIGHT), Phaser.Geom.Rectangle.Contains);
    bgGfx.on('pointerover', () => {
      title.setColor('#ffffff');
    });
    bgGfx.on('pointerout', () => {
      title.setColor(THEME.accentHex);
    });
    bgGfx.on('pointerdown', () => this.chooseOption(option));
  }

  private chooseOption(option: EventOption): void {
    if (this.resolved || !this.requirementsMet(option.requirements ?? [])) return;
    this.resolved = true;

    const outcome = this.pickOutcome(option.outcomes);
    const effects = outcome?.effects ?? option.effects ?? [];
    const messages = [outcome?.resultText ?? option.resultText];
    let combatEncounterId: string | null = null;

    for (const effect of effects) {
      const result = this.applyEffect(effect);
      if (result.message) messages.push(result.message);
      if (result.combatEncounterId) combatEncounterId = result.combatEncounterId;
    }

    this.showResult(messages.filter(Boolean).join('\n'));

    if (combatEncounterId) {
      this.time.delayedCall(900, () => {
        this.scene.start(SceneKeys.BATTLE, {
          party: ensureRunParty(),
          encounterId: combatEncounterId,
        });
      });
      return;
    }

    completeCurrentMapNode();
    saveManager.save();
    this.time.delayedCall(2000, () => this.scene.start(SceneKeys.MAP));
  }

  private applyEffect(effect: EventEffect): EffectResolution {
    switch (effect.type) {
      case 'gain_gold':
        gameState.addGold(effect.amount);
        return { message: `Oro +${effect.amount}.`, combatEncounterId: null };

      case 'lose_gold':
        gameState.addGold(-effect.amount);
        return { message: `Oro -${effect.amount}.`, combatEncounterId: null };

      case 'gain_item':
        return this.applyGainItem(effect);

      case 'lose_item': {
        const removed = gameState.removeItem(effect.itemId);
        const item = registry.getItem(effect.itemId);
        return {
          message: removed ? `${item.name} se pierde.` : `${item.name} no estaba en la mochila.`,
          combatEncounterId: null,
        };
      }

      case 'gain_status_party':
        addStatusToParty(effect.statusId, effect.stacks, effect.duration);
        return {
          message: `Toda la party recibe ${registry.getStatusEffect(effect.statusId).name} x${effect.stacks}.`,
          combatEncounterId: null,
        };

      case 'heal_party': {
        const healed = typeof effect.percent === 'number'
          ? healPartyByPercent(effect.percent)
          : healPartyByAmount(effect.amount ?? 0);
        return { message: `La party recupera ${healed} HP.`, combatEncounterId: null };
      }

      case 'damage_party': {
        const damage = damageParty(effect.amount);
        return { message: `La party pierde ${damage} HP.`, combatEncounterId: null };
      }

      case 'modify_character_stat':
        return this.applyCharacterStatEffect(effect.characterId, effect.stat, effect.amount);

      case 'modify_random_character_stat':
        return this.applyRandomStatEffect(effect.stats, effect.amount);

      case 'modify_party_stat': {
        modifyPartyStat(effect.stat, effect.amount);
        const sign = effect.amount > 0 ? '+' : '';
        return {
          message: `Toda la party ${sign}${effect.amount} ${statLabel(effect.stat)}.`,
          combatEncounterId: null,
        };
      }

      case 'skip_next_free_node':
        gameState.scheduleSkipNextFreeNode();
        return {
          message: 'El tiempo perdido cerrara un nodo no-combate cercano si existe una ruta alternativa.',
          combatEncounterId: null,
        };

      case 'recruit':
        return { message: 'Reclutamiento reservado para una version futura.', combatEncounterId: null };

      case 'trigger_combat':
        return {
          message: 'El evento escala a combate.',
          combatEncounterId: effect.encounterId,
        };
    }
  }

  private applyGainItem(effect: Extract<EventEffect, { type: 'gain_item' }>): EffectResolution {
    let item: ItemData;
    if (effect.itemId) {
      item = registry.getItem(effect.itemId);
      gameState.addItem(item.id);
    } else {
      item = addRolledItem({
        category: effect.category,
        rarity: effect.rarity,
        relicOnly: effect.relicOnly,
        includeCursed: effect.includeCursed,
      }).item;
    }

    return {
      message: `${item.name} agregado a la mochila.`,
      combatEncounterId: null,
    };
  }

  private applyCharacterStatEffect(
    characterId: string,
    stat: StatKey,
    amount: number,
  ): EffectResolution {
    const character = ensureRunParty().find((member) => member.data.id === characterId);
    if (!character) {
      return { message: 'El personaje requerido no esta en la party.', combatEncounterId: null };
    }

    modifyCharacterStat(character, stat, amount);
    const sign = amount > 0 ? '+' : '';
    return {
      message: `${getShortName(character.data.name)} ${sign}${amount} ${statLabel(stat)}.`,
      combatEncounterId: null,
    };
  }

  private applyRandomStatEffect(
    stats: StatKey[],
    amount: number,
  ): EffectResolution {
    const party = ensureRunParty();
    const character = party[Math.floor(Math.random() * party.length)];
    const stat = stats[Math.floor(Math.random() * stats.length)];
    modifyCharacterStat(character, stat, amount);
    const sign = amount > 0 ? '+' : '';

    return {
      message: `${getShortName(character.data.name)} ${sign}${amount} ${statLabel(stat)}.`,
      combatEncounterId: null,
    };
  }

  private pickOutcome(outcomes?: EventOutcome[]): EventOutcome | null {
    if (!outcomes || outcomes.length === 0) return null;

    const totalWeight = outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const outcome of outcomes) {
      roll -= outcome.weight;
      if (roll <= 0) return outcome;
    }

    return outcomes[outcomes.length - 1];
  }

  private requirementsMet(requirements: EventRequirement[]): boolean {
    return requirements.every((requirement) => {
      switch (requirement.type) {
        case 'gold':
          return gameState.runMeta.gold >= requirement.amount;
        case 'item':
          return gameState.runMeta.items.includes(requirement.itemId);
        case 'character':
          return ensureRunParty().some((member) => member.data.id === requirement.characterId);
        case 'character_stat': {
          const character = ensureRunParty().find((member) => member.data.id === requirement.characterId);
          return Boolean(character && character.currentStats[requirement.stat] >= requirement.minValue);
        }
      }
    });
  }

  private requirementsLabel(requirements: EventRequirement[]): string {
    if (requirements.length === 0) return '';

    return requirements.map((requirement) => {
      switch (requirement.type) {
        case 'gold':
          return `Requiere ${requirement.amount}g`;
        case 'item':
          return `Requiere ${registry.getItem(requirement.itemId).name}`;
        case 'character':
          return `Requiere ${registry.getCharacter(requirement.characterId).name}`;
        case 'character_stat':
          return `Requiere ${statLabel(requirement.stat)} ${requirement.minValue}`;
      }
    }).join(' / ');
  }

  private resolveEvent(): EventData {
    const mapState = gameState.ensureAct1Map();
    const currentNode = mapState.getCurrentNode();
    const eventId = this.pendingEventId ?? currentNode?.eventId;

    if (eventId) {
      return registry.getEvent(eventId);
    }

    const events = registry.getAllEvents();
    if (events.length === 0) {
      throw new Error('EventScene: no events registered');
    }

    return events[Math.floor(Math.random() * events.length)];
  }

  private showResult(message: string): void {
    const { width } = this.scale;
    const pw = 780, ph = 138;
    const px = width / 2 - pw / 2;
    const py = 291;

    const panelGfx = this.add.graphics().setDepth(800);
    panelGfx.fillStyle(THEME.bgPanel, 0.98);
    panelGfx.fillRect(px, py, pw, ph);
    drawCornerBox(panelGfx, px, py, pw, ph, 16, THEME.accent, 0.9);

    const text = this.add.text(width / 2, 360, message, {
      ...THEME.fonts.dialogue,
      fontSize: '17px',
      color: THEME.textPrimary,
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: 720, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(801);

    this.addViewObject(panelGfx);
    this.addViewObject(text);
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
