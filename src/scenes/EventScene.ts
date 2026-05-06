import Phaser from 'phaser';
import { SceneKeys } from '@/config/SceneKeys';
import { registry } from '@/data/Registry';
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
    this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, 0x111014, 1));

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2c2933, 0.32);
    for (let x = 60; x < width; x += 88) {
      grid.lineBetween(x, 110, x, height - 56);
    }
    for (let y = 126; y < height - 52; y += 58) {
      grid.lineBetween(42, y, width - 42, y);
    }
    grid.lineStyle(2, 0x625176, 0.42);
    grid.lineBetween(42, 104, width - 42, 104);
    this.addViewObject(grid);
  }

  private renderEventText(): void {
    const { width } = this.scale;

    this.addViewObject(this.add.text(width / 2, 72, 'Evento', {
      fontSize: '15px',
      color: '#9d91ad',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    this.addViewObject(this.add.text(width / 2, 132, this.eventData.title, {
      fontSize: '42px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      align: 'center',
    }).setOrigin(0.5));

    this.addViewObject(this.add.text(width / 2, 214, this.eventData.description, {
      fontSize: '19px',
      color: '#c5b9a3',
      fontFamily: 'Georgia, serif',
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
    const accent = met ? 0xd1ad63 : 0x5f5450;
    const bg = this.add.rectangle(x, y, OPTION_WIDTH, OPTION_HEIGHT, met ? 0x201b20 : 0x181619, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, accent, met ? 0.84 : 0.58);
    const title = this.add.text(x + 16, y + 14, option.text, {
      fontSize: '18px',
      color: met ? '#f0e4c8' : '#78706a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      fixedWidth: OPTION_WIDTH - 32,
    });
    const requirementText = this.requirementsLabel(option.requirements ?? []);
    const body = this.add.text(x + 16, y + 46, requirementText || 'Sin requisito', {
      fontSize: '13px',
      color: met ? '#b8ac98' : '#7b5d5d',
      fontFamily: 'Georgia, serif',
      wordWrap: { width: OPTION_WIDTH - 32, useAdvancedWrap: true },
    });

    this.addViewObject(bg);
    this.addViewObject(title);
    this.addViewObject(body);

    if (!met) return;

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, 0xd1ad63, 1);
      title.setColor('#fff0ad');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, accent, 0.84);
      title.setColor('#f0e4c8');
    });
    bg.on('pointerdown', () => this.chooseOption(option));
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
    const panel = this.add.rectangle(width / 2, 360, 780, 138, 0x1b1720, 0.98)
      .setStrokeStyle(2, 0xd1ad63, 0.9)
      .setDepth(800);
    const text = this.add.text(width / 2, 360, message, {
      fontSize: '17px',
      color: '#f0e4c8',
      fontFamily: 'Georgia, serif',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: 720, useAdvancedWrap: true },
    }).setOrigin(0.5).setDepth(801);

    this.addViewObject(panel);
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
