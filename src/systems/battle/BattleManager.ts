import Phaser from 'phaser';
import { registry } from '@/data/Registry';
import { gameState } from '@/systems/GameState';
import {
  calculateActiveSets,
  getActiveSetBonusDetails,
} from '@/systems/StatsCalculator';
import {
  ItemCategory,
  ResourceCost,
  StatusEffectId,
  TriggerTiming,
  type CharacterInstance,
  type EnemyIntent,
  type EnemyIntentTargetType,
  type EnemyInstance,
  type ItemData,
  type SkillData,
} from '@/types';
import {
  BattleState,
  ensureBattleRuntime,
  isCharacterInstance,
  type Combatant,
} from './BattleState';
import { applyDamage, calculateDamage, type DamageResult, type DamageType } from './DamageCalculator';
import { SkillExecutor } from './SkillExecutor';
import {
  StatusEffectManager,
  type StatusApplicationResult,
  type StatusRemovalResult,
  type StatusTickResult,
} from './StatusEffectManager';
import { PassiveHooks, PassiveHookType } from './PassiveHooks';
import { enemyAI } from './EnemyAI';

export { isCharacterInstance } from './BattleState';

export const BattleEvents = {
  TURN_START: 'turn_start',
  PLAYER_TURN_START: 'player_turn_start',
  ENEMY_TURN_START: 'enemy_turn_start',
  DAMAGE_DEALT: 'damage_dealt',
  UNIT_DIED: 'unit_died',
  RESOURCE_CHANGED: 'resource_changed',
  DEFENDED: 'defended',
  STATUS_APPLIED: 'status_applied',
  STATUS_RESISTED: 'status_resisted',
  STATUS_REMOVED: 'status_removed',
  STATUS_TICKED: 'status_ticked',
  SKILL_USED: 'skill_used',
  HEALED: 'healed',
  CONSUMABLE_USED: 'consumable_used',
  RELIC_TRIGGERED: 'relic_triggered',
  ROUND_STARTED: 'round_started',
  ROUND_ENDED: 'round_ended',
  BATTLE_WON: 'battle_won',
  BATTLE_LOST: 'battle_lost',
  ENEMY_WILL_ATTACK: 'enemy_will_attack',
} as const;

export interface EnemyWillAttackEvent {
  enemy: EnemyInstance;
  targets: Combatant[];
  onAnimationDone: () => void;
}

export interface DamageEvent {
  source: Combatant;
  target: Combatant;
  amount: number;
  blocked: number;
  wasCrit: boolean;
  consumedMark: boolean;
}

export interface ResourceChangedEvent {
  unit: Combatant;
  vigorDelta: number;
  manaDelta?: number;
  reason: string;
}

export interface DefendEvent {
  actor: Combatant;
  defendBonus: number;
}

export interface StatusAppliedEvent {
  target: Combatant;
  statusId: StatusEffectId;
  stacks: number;
  duration: number;
}

export interface StatusResistedEvent {
  target: Combatant;
  statusId: StatusEffectId;
}

export interface StatusRemovedEvent {
  target: Combatant;
  statusId: StatusEffectId;
  reason: string;
}

export interface SkillUsedEvent {
  actor: CharacterInstance;
  skill: SkillData;
}

export interface HealedEvent {
  source: Combatant;
  target: Combatant;
  amount: number;
  reason: string;
}

export interface ConsumableUsedEvent {
  actor: CharacterInstance;
  item: ItemData;
  target?: Combatant;
  consumed: boolean;
  message: string;
}

export interface ConsumableUseResult {
  consumed: boolean;
  message: string;
}

export interface RelicTriggeredEvent {
  relicId: string;
  relicName: string;
  message: string;
  source?: Combatant;
  target?: Combatant;
}

export type StatusTickedEvent = StatusTickResult;

const DEFEND_BONUS = 5;
const BRAM_ID = 'bram';
const VERA_ID = 'vera';
const MIRA_ID = 'mira';
const AREN_ID = 'aren';
const LYRA_ID = 'lyra';
const BRAM_NATIVE_ID = 'bram_native_juramento';
const BRAM_PASSIVE_ID = 'bram_passive_voto';
const VERA_NATIVE_ID = 'vera_native_sed';
const MIRA_NATIVE_ID = 'mira_native_ceniza';
const AREN_PASSIVE_ID = 'aren_passive_susurro';
const LYRA_PASSIVE_ID = 'lyra_passive_ojos';
const VERA_PASSIVE_ID = 'vera_passive_frenesi';
const MIRA_ULT_ID = 'mira_ult_pira';
const MAX_ASHES = 5;

export class BattleManager {
  readonly events = new Phaser.Events.EventEmitter();
  readonly statusManager: StatusEffectManager;
  readonly skillExecutor: SkillExecutor;
  readonly passiveHooks = new PassiveHooks();
  private waitingForPlayerInput = false;
  private hooksRegistered = false;
  private stoppedClockApplied = false;

  constructor(public readonly state: BattleState) {
    this.statusManager = new StatusEffectManager(state);
    this.skillExecutor = new SkillExecutor(state, this.statusManager);
  }

  startBattle(): void {
    this.registerPartyHooks();
    this.applyRelicCombatStartBonuses();
    this.applyEquipmentCombatStartBonuses();
    this.applySetCombatStartBonuses();
    this.startRound();
  }

  private applyRelicCombatStartBonuses(): void {
    if (!gameState.hasRelic('estandarte_roto')) return;

    for (const member of this.state.party.filter((p) => !p.isDown)) {
      this.gainVigor(member, 1, 'relic_estandarte_roto');
    }
    this.emitRelicTriggered(
      'estandarte_roto',
      'El Estandarte Roto despierta: la party gana +1 Vigor.',
    );
  }

  private applyEquipmentCombatStartBonuses(): void {
    for (const member of this.state.party.filter((p) => !p.isDown)) {
      for (const item of this.getEquippedItems(member)) {
        for (const effect of item.effects) {
          if (
            effect.type === 'on_combat_start'
            && typeof effect.amount === 'number'
            && effect.amount > 0
          ) {
            this.gainVigor(member, effect.amount, `item_${item.id}`);
          }
        }
      }
    }
  }

  private applySetCombatStartBonuses(): void {
    for (const member of this.state.party.filter((p) => !p.isDown)) {
      const activeSets = calculateActiveSets(member.equipment, gameState.runMeta.relics);
      const combatStartBonuses = getActiveSetBonusDetails(activeSets)
        .filter((bonus) => (
          bonus.effect.type === 'on_combat_start'
          && typeof bonus.effect.amount === 'number'
          && bonus.effect.amount > 0
        ));

      for (const bonus of combatStartBonuses) {
        this.gainVigor(member, bonus.effect.amount ?? 0, `set_${bonus.setId}`);
      }
    }
  }

  private registerPartyHooks(): void {
    if (this.hooksRegistered) return;

    this.passiveHooks.clear();

    for (const member of this.state.party.filter((p) => !p.isDown)) {
      if (member.data.id === BRAM_ID && this.hasSkill(member, BRAM_NATIVE_ID)) {
        this.passiveHooks.register(BRAM_ID, PassiveHookType.ON_DAMAGE_TAKEN, (context) => {
          const { source, target, damageResult } = context;
          if (
            !source
            || !target
            || isCharacterInstance(source)
            || !isCharacterInstance(target)
            || target.data.id === BRAM_ID
            || member.isDown
            || (damageResult?.finalDamage ?? 0) <= 0
          ) {
            return;
          }

          const runtime = ensureBattleRuntime(member);
          if (runtime.bramVigorGainedThisTurn >= 2) return;

          const gained = this.gainVigor(member, 1, BRAM_NATIVE_ID);
          if (gained > 0) {
            runtime.bramVigorGainedThisTurn += 1;
          }
        });
      }

      if (member.data.id === BRAM_ID && this.hasSkill(member, BRAM_PASSIVE_ID)) {
        this.passiveHooks.register(BRAM_ID, PassiveHookType.ON_HP_THRESHOLD, (context) => {
          const target = context.target;
          if (!target || !isCharacterInstance(target) || target !== member || member.isDown) {
            return;
          }

          const runtime = ensureBattleRuntime(member);
          const threshold = Math.floor(member.currentStats.hpMax * 0.25);
          if (runtime.bramVotoTriggered || member.currentStats.hp > threshold) return;

          runtime.bramVotoTriggered = true;
          runtime.bramVotoDefenseBonus = Math.max(
            1,
            Math.ceil(member.currentStats.defense * 0.5),
          );
          this.events.emit(BattleEvents.DEFENDED, {
            actor: member,
            defendBonus: runtime.bramVotoDefenseBonus,
          } as DefendEvent);
        });
      }

      if (member.data.id === VERA_ID && this.hasSkill(member, VERA_NATIVE_ID)) {
        this.passiveHooks.register(VERA_ID, PassiveHookType.ON_KILL, (context) => {
          const { source, killedUnit } = context;
          if (
            source !== member
            || !killedUnit
            || isCharacterInstance(killedUnit)
            || member.isDown
          ) {
            return;
          }

          const runtime = ensureBattleRuntime(member);
          if (runtime.veraSedTriggered) return;

          runtime.veraSedTriggered = true;
          this.gainVigor(member, 2, VERA_NATIVE_ID);
          this.insertExtraTurnAfterCurrent(member);
        });
      }

      if (member.data.id === AREN_ID && this.hasSkill(member, AREN_PASSIVE_ID)) {
        this.passiveHooks.register(AREN_ID, PassiveHookType.ON_ALLY_DOWN, (context) => {
          const fallen = context.target;
          if (
            !fallen
            || !isCharacterInstance(fallen)
            || fallen === member
            || member.isDown
          ) {
            return;
          }

          const runtime = ensureBattleRuntime(member);
          if (runtime.arenSusurroTriggered) return;

          runtime.arenSusurroTriggered = true;
          fallen.isDown = false;
          fallen.currentStats.hp = 1;
          this.events.emit(BattleEvents.HEALED, {
            source: member,
            target: fallen,
            amount: 1,
            reason: AREN_PASSIVE_ID,
          } as HealedEvent);
        });
      }

      if (member.data.id === MIRA_ID && this.hasSkill(member, MIRA_NATIVE_ID)) {
        this.passiveHooks.register(MIRA_ID, PassiveHookType.ON_RESOURCE_SPENT, (context) => {
          if (
            context.actor !== member
            || member.isDown
            || (context.resourceSpent ?? 0) <= 0
            || (
              context.resourceType !== ResourceCost.VIGOR
              && context.resourceType !== ResourceCost.MANA
            )
          ) {
            return;
          }

          this.state.ashes = Math.min(MAX_ASHES, this.state.ashes + 1);
          if (context.skill?.id === MIRA_ULT_ID) return;

          this.events.emit(BattleEvents.RESOURCE_CHANGED, {
            unit: member,
            vigorDelta: 0,
            manaDelta: 0,
            reason: MIRA_NATIVE_ID,
          } as ResourceChangedEvent);
        });
      }
    }

    this.hooksRegistered = true;
  }

  startRound(): void {
    this.state.phase = 'start_round';
    this.updateEnemyPhases();
    this.calculateEnemyIntents();
    this.state.turnQueue = this.buildTurnQueue();
    this.markStoppedClockEnemy();
    this.markLyraOjosLentos();
    this.state.currentActorIndex = -1;
    this.events.emit(BattleEvents.ROUND_STARTED, this.state.currentRound);
    this.nextTurn();
  }

  private calculateEnemyIntents(): void {
    for (const enemy of this.state.enemies) {
      if (!enemy.isDown) {
        enemy.intent = enemyAI.calculateIntent(enemy, this.state);
      }
    }
  }

  private updateEnemyPhases(): void {
    for (const enemy of this.state.enemies) {
      this.updateEnemyPhase(enemy);
    }
  }

  private updateEnemyPhase(enemy: EnemyInstance): boolean {
    if (enemy.phaseTriggers.length === 0 || enemy.isDown) return false;

    const hpPercent = (enemy.currentStats.hp / enemy.currentStats.hpMax) * 100;
    const nextPhase = enemy.phaseTriggers
      .filter((trigger) => hpPercent <= trigger.hpPercent)
      .reduce((phase, trigger) => Math.max(phase, trigger.phase), enemy.phase);

    if (nextPhase === enemy.phase) return false;

    enemy.phase = nextPhase;
    return true;
  }

  nextTurn(): void {
    if (this.checkBattleEnd()) return;

    const actor = this.state.nextActor();
    if (actor === null) {
      this.endRound();
      return;
    }

    if (actor.isDown) {
      this.nextTurn();
      return;
    }

    this.beginActorTurn(actor);
    this.events.emit(BattleEvents.TURN_START, actor);
    this.passiveHooks.trigger(PassiveHookType.ON_TURN_START, {
      state: this.state,
      actor,
    });

    const startTicks = this.statusManager.tickAtTiming(actor, TriggerTiming.TURN_START);
    this.emitStatusTickResults(startTicks);

    if (actor.isDown) {
      if (!this.checkBattleEnd()) this.nextTurn();
      return;
    }

    if (this.checkBattleEnd()) return;

    const runtime = ensureBattleRuntime(actor);
    if (runtime.skipTurnOnce) {
      runtime.skipTurnOnce = false;
      this.emitRelicTriggered(
        'reloj_detenido',
        `${this.combatantName(actor)} pierde su turno.`,
        undefined,
        actor,
      );
      this.finishActorTurn(actor);
      return;
    }

    if (startTicks.some((tick) => tick.kind === 'skip')) {
      this.finishActorTurn(actor);
      return;
    }

    if (isCharacterInstance(actor)) {
      this.state.phase = 'player_turn';
      this.waitingForPlayerInput = true;
      this.events.emit(BattleEvents.PLAYER_TURN_START, actor);
    } else {
      this.state.phase = 'enemy_turn';
      this.events.emit(BattleEvents.ENEMY_TURN_START, actor);
      this.executeEnemyTurn(actor);
    }
  }

  /**
   * Backward-compatible helper for the old placeholder button flow.
   */
  performPlayerAction(actor: CharacterInstance): void {
    const target = this.state.enemies.find((e) => !e.isDown);
    if (target) {
      this.performBasicAttack(actor, target);
    }
  }

  performBasicAttack(actor: CharacterInstance, target: EnemyInstance): void {
    if (!this.canResolvePlayerAction(actor) || target.isDown) return;
    this.waitingForPlayerInput = false;

    if (!this.resolveOnActEffects(actor)) return;
    this.executeBasicAttack(actor, target);
    this.finishActorTurn(actor);
  }

  performDefend(actor: CharacterInstance): void {
    if (!this.canResolvePlayerAction(actor)) return;
    this.waitingForPlayerInput = false;

    if (!this.resolveOnActEffects(actor)) return;
    ensureBattleRuntime(actor).defendBonus = DEFEND_BONUS;
    this.events.emit(BattleEvents.DEFENDED, { actor, defendBonus: DEFEND_BONUS } as DefendEvent);
    this.finishActorTurn(actor);
  }

  /**
   * Called by BattleScene after the player selects a skill and (if needed) a target.
   * `pickedTarget` is required for SINGLE_ENEMY / SINGLE_ALLY skills.
   */
  performSkill(actor: CharacterInstance, skill: SkillData, pickedTarget?: Combatant): void {
    if (!this.canResolvePlayerAction(actor)) return;
    if (!this.skillExecutor.canUseSkill(actor, skill)) return;

    const targets = this.skillExecutor.resolveTargets(actor, skill, pickedTarget);
    if (targets.length === 0 && this.skillExecutor.needsTargetSelection(skill)) return;

    this.waitingForPlayerInput = false;

    if (!this.resolveOnActEffects(actor)) return;
    const result = this.skillExecutor.executeSkill(actor, skill, targets);

    this.events.emit(BattleEvents.SKILL_USED, { actor, skill } as SkillUsedEvent);

    for (const change of result.resourceChanges) {
      this.events.emit(BattleEvents.RESOURCE_CHANGED, {
        unit: change.unit,
        vigorDelta: change.vigorDelta,
        manaDelta: change.manaDelta,
        reason: change.reason,
      } as ResourceChangedEvent);
    }

    if (result.resourceSpent > 0) {
      this.passiveHooks.trigger(PassiveHookType.ON_RESOURCE_SPENT, {
        state: this.state,
        actor,
        skill,
        resourceSpent: result.resourceSpent,
        resourceType: skill.costType,
      });

      if (skill.id === MIRA_ULT_ID) {
        this.state.ashes = 0;
        this.events.emit(BattleEvents.RESOURCE_CHANGED, {
          unit: actor,
          vigorDelta: 0,
          manaDelta: 0,
          reason: 'mira_ult_ashes_consumed',
        } as ResourceChangedEvent);
      }
    }

    if (result.consumedInspired) {
      this.emitStatusRemoval({
        target: actor,
        statusId: StatusEffectId.INSPIRED,
        reason: 'consumed',
      });
    }

    // Emit damage events.
    for (const hit of result.hits) {
      this.emitDamageResult(hit.source, hit.target, hit.damageResult);
    }

    for (const heal of result.heals) {
      this.emitHealResult(actor, heal.target, heal.amount, 'skill');
      this.applyCalizRegen(actor, heal.target, heal.amount);
    }

    // Emit deaths.
    for (const dead of result.deaths) {
      this.emitUnitDied(dead, actor);
    }

    // Apply / remove status effects defined in the skill effects list.
    for (const effect of skill.effects) {
      if (effect.type === 'apply_status' && effect.statusId) {
        for (const t of targets) {
          if (!t.isDown) {
            this.applyStatus(t, effect.statusId, effect.stacks ?? 1, actor);
          }
        }
      }
      if (effect.type === 'purge_negative') {
        for (const t of targets) {
          if (!t.isDown && isCharacterInstance(t)) {
            const removed = this.statusManager.purgeNegative(t);
            removed.forEach((r) => this.emitStatusRemoval(r));
          }
        }
      }
    }

    // Emit block / resource changes.
    for (const t of targets) {
      if (t.block > 0) {
        this.events.emit(BattleEvents.RESOURCE_CHANGED, {
          unit: t,
          vigorDelta: 0,
          reason: 'block_gained',
        });
      }
    }

    // Vigor / Mana change for actor (resource was spent inside executeSkill).
    this.events.emit(BattleEvents.RESOURCE_CHANGED, {
      unit: actor,
      vigorDelta: 0,
      reason: 'skill_used',
    } as ResourceChangedEvent);

    this.finishActorTurn(actor);
  }

  performConsumable(
    actor: CharacterInstance,
    item: ItemData,
    pickedTarget?: Combatant,
  ): ConsumableUseResult {
    const validation = this.validateConsumableUse(actor, item, pickedTarget);
    if (!validation.consumed) return validation;

    this.waitingForPlayerInput = false;

    if (!this.resolveOnActEffects(actor)) {
      return {
        consumed: true,
        message: `${actor.data.name} no puede usar ${item.name}.`,
      };
    }

    const result = this.applyConsumable(actor, item, pickedTarget);
    if (!result.consumed) {
      this.waitingForPlayerInput = true;
      this.events.emit(BattleEvents.CONSUMABLE_USED, {
        actor,
        item,
        target: pickedTarget,
        consumed: false,
        message: result.message,
      } as ConsumableUsedEvent);
      return result;
    }

    gameState.removeItem(item.id);
    this.events.emit(BattleEvents.CONSUMABLE_USED, {
      actor,
      item,
      target: pickedTarget,
      consumed: true,
      message: result.message,
    } as ConsumableUsedEvent);
    this.finishActorTurn(actor);
    return result;
  }

  private canResolvePlayerAction(actor: CharacterInstance): boolean {
    return (
      this.waitingForPlayerInput
      && this.state.turnQueue[this.state.currentActorIndex] === actor
      && !actor.isDown
    );
  }

  private validateConsumableUse(
    actor: CharacterInstance,
    item: ItemData,
    pickedTarget?: Combatant,
  ): ConsumableUseResult {
    if (!this.canResolvePlayerAction(actor)) {
      return { consumed: false, message: 'No es el turno de ese personaje.' };
    }
    if (item.category !== ItemCategory.CONSUMABLE) {
      return { consumed: false, message: `${item.name} no es consumible.` };
    }
    if (!gameState.runMeta.items.includes(item.id)) {
      return { consumed: false, message: `${item.name} ya no esta en la mochila.` };
    }

    switch (item.id) {
      case 'pocion_roja': {
        const target = this.requireConsumableAllyTarget(item, pickedTarget);
        if (!target) return { consumed: false, message: 'Elegi un aliado valido.' };
        if (gameState.isHealingBlocked(target)) {
          return { consumed: false, message: `${target.data.name} no puede curarse.` };
        }
        if (target.currentStats.hp >= target.currentStats.hpMax) {
          return { consumed: false, message: `${target.data.name} ya tiene HP completo.` };
        }
        return { consumed: true, message: '' };
      }

      case 'pocion_vigor': {
        const target = this.requireConsumableAllyTarget(item, pickedTarget);
        if (!target) return { consumed: false, message: 'Elegi un aliado valido.' };
        if (target.currentResources.vigor >= target.currentResources.vigorMax) {
          return { consumed: false, message: `${target.data.name} ya tiene Vigor completo.` };
        }
        return { consumed: true, message: '' };
      }

      case 'antidoto': {
        const target = this.requireConsumableAllyTarget(item, pickedTarget);
        if (!target) return { consumed: false, message: 'Elegi un aliado valido.' };
        if (!target.statusEffects.some((status) => registry.getStatusEffect(status.id).isNegative)) {
          return { consumed: false, message: `${target.data.name} no tiene estados negativos.` };
        }
        return { consumed: true, message: '' };
      }

      case 'granada_cenizas':
        if (this.state.enemies.every((enemy) => enemy.isDown)) {
          return { consumed: false, message: 'No quedan enemigos.' };
        }
        return { consumed: true, message: '' };

      default:
        return { consumed: false, message: `${item.name} no tiene uso en combate.` };
    }
  }

  private requireConsumableAllyTarget(
    item: ItemData,
    pickedTarget?: Combatant,
  ): CharacterInstance | null {
    void item;
    if (!pickedTarget || !isCharacterInstance(pickedTarget) || pickedTarget.isDown) {
      return null;
    }
    return pickedTarget;
  }

  private applyConsumable(
    actor: CharacterInstance,
    item: ItemData,
    pickedTarget?: Combatant,
  ): ConsumableUseResult {
    switch (item.id) {
      case 'pocion_roja':
        return this.applyRedPotion(actor, item, pickedTarget);
      case 'pocion_vigor':
        return this.applyVigorPotion(item, pickedTarget);
      case 'antidoto':
        return this.applyAntidote(item, pickedTarget);
      case 'granada_cenizas':
        return this.applyAshGrenade(actor, item);
      default:
        return { consumed: false, message: `${item.name} no tiene uso en combate.` };
    }
  }

  private applyRedPotion(
    actor: CharacterInstance,
    item: ItemData,
    pickedTarget?: Combatant,
  ): ConsumableUseResult {
    const target = this.requireConsumableAllyTarget(item, pickedTarget);
    if (!target || gameState.isHealingBlocked(target)) {
      return { consumed: false, message: 'La pocion no encuentra un objetivo valido.' };
    }

    const before = target.currentStats.hp;
    target.currentStats.hp = Math.min(target.currentStats.hpMax, target.currentStats.hp + 25);
    const healed = target.currentStats.hp - before;
    if (healed <= 0) {
      return { consumed: false, message: `${target.data.name} ya tiene HP completo.` };
    }

    this.emitHealResult(actor, target, healed, item.id);
    this.applyCalizRegen(actor, target, healed);
    return { consumed: true, message: `${item.name}: ${target.data.name} recupera ${healed} HP.` };
  }

  private applyVigorPotion(item: ItemData, pickedTarget?: Combatant): ConsumableUseResult {
    const target = this.requireConsumableAllyTarget(item, pickedTarget);
    if (!target) return { consumed: false, message: 'La pocion no encuentra un objetivo valido.' };

    const gained = this.gainVigor(target, 5, item.id);
    if (gained <= 0) {
      return { consumed: false, message: `${target.data.name} ya tiene Vigor completo.` };
    }
    return { consumed: true, message: `${item.name}: ${target.data.name} gana ${gained} Vigor.` };
  }

  private applyAntidote(item: ItemData, pickedTarget?: Combatant): ConsumableUseResult {
    const target = this.requireConsumableAllyTarget(item, pickedTarget);
    if (!target) return { consumed: false, message: 'El antidoto no encuentra un objetivo valido.' };

    const removed = this.statusManager.purgeNegative(target);
    removed.forEach((result) => this.emitStatusRemoval(result));
    if (removed.length === 0) {
      return { consumed: false, message: `${target.data.name} no tiene estados negativos.` };
    }
    return {
      consumed: true,
      message: `${item.name}: ${target.data.name} limpia ${removed.length} estado${removed.length === 1 ? '' : 's'}.`,
    };
  }

  private applyAshGrenade(actor: CharacterInstance, item: ItemData): ConsumableUseResult {
    const targets = this.state.enemies.filter((enemy) => !enemy.isDown);
    if (targets.length === 0) {
      return { consumed: false, message: 'No quedan enemigos.' };
    }

    for (const target of targets) {
      const result: DamageResult = {
        finalDamage: 10,
        wasCrit: false,
        blocked: 0,
        consumedMark: false,
      };
      const { died } = applyDamage(target, result.finalDamage);
      this.emitDamageResult(actor, target, result);
      if (died) {
        this.emitUnitDied(target, actor);
      }
      if (!target.isDown) {
        this.applyStatus(target, StatusEffectId.BURN, 1, actor);
      }
    }

    return { consumed: true, message: `${item.name}: 10 dano y Quemadura a todos los enemigos.` };
  }

  private resolveOnActEffects(actor: Combatant): boolean {
    const results = this.statusManager.tickAtTiming(actor, TriggerTiming.ON_ACT);
    this.emitStatusTickResults(results);

    if (actor.isDown) {
      if (!this.checkBattleEnd()) this.nextTurn();
      return false;
    }

    return !this.checkBattleEnd();
  }

  private finishActorTurn(actor: Combatant): void {
    const results = this.statusManager.tickAtTiming(actor, TriggerTiming.TURN_END);
    this.emitStatusTickResults(results);

    if (this.checkBattleEnd()) return;

    this.nextTurn();
  }

  private beginActorTurn(actor: Combatant): void {
    const runtime = ensureBattleRuntime(actor);
    runtime.defendBonus = 0;
    // Taunt expires at the start of Bram's next turn (consumed on first hit or turn reset).
    runtime.tauntActive = false;
    runtime.tauntCharges = 0;

    if (isCharacterInstance(actor) && actor.data.id === BRAM_ID) {
      runtime.bramVigorGainedThisTurn = 0;
    }
  }

  private executeBasicAttack(actor: CharacterInstance, target: EnemyInstance): void {
    const skill = this.getBasicSkill(actor);

    for (const effect of skill.effects) {
      if (effect.type === 'damage') {
        const baseDamage = effect.amount ?? 0;
        const damageType: DamageType = effect.scalingStat === 'power' ? 'magical' : 'physical';
        this.resolveDamage(actor, target, baseDamage, damageType);
      }

      if (effect.type === 'apply_status' && effect.statusId) {
        this.applyStatus(target, effect.statusId, effect.stacks ?? 1, actor);
      }

      if (effect.type === 'gain_resource') {
        this.gainVigor(actor, effect.amount ?? 0, 'basic_attack');
      }
    }
  }

  private getBasicSkill(actor: CharacterInstance): SkillData {
    const basicSkillId = actor.data.skillIds.find((id) => id.endsWith('_basic'));
    if (!basicSkillId) {
      throw new Error(`BattleManager: basic skill not found for '${actor.data.id}'`);
    }
    return registry.getSkill(basicSkillId);
  }

  private executeEnemyTurn(enemy: EnemyInstance): void {
    if (!this.resolveOnActEffects(enemy)) return;

    this.executeEnemyIntent(enemy);
  }

  private executeEnemyIntent(enemy: EnemyInstance): void {
    if (this.updateEnemyPhase(enemy)) {
      enemy.intent = enemyAI.calculateIntent(enemy, this.state);
    }

    const intent = enemy.intent;
    if (!intent) {
      this.finishActorTurn(enemy);
      return;
    }

    if (intent.type === 'defend') {
      this.applyEnemyDefend(enemy, intent);
      this.finishActorTurn(enemy);
      return;
    }

    if (intent.type === 'apply_status' && intent.statusId) {
      for (const target of this.resolveEnemyIntentTargets(enemy, intent.targetType)) {
        if (!target.isDown) {
          this.applyStatus(target, intent.statusId, intent.value, enemy);
        }
      }
      this.finishActorTurn(enemy);
      return;
    }

    if (intent.type === 'heal') {
      for (const target of this.resolveEnemyHealTargets(enemy, intent.targetType)) {
        if (!target.isDown) {
          const before = target.currentStats.hp;
          target.currentStats.hp = Math.min(target.currentStats.hpMax, target.currentStats.hp + intent.value);
          const healed = target.currentStats.hp - before;
          if (healed > 0) {
            this.emitHealResult(enemy, target, healed, 'enemy_heal');
          }
        }
      }
      this.finishActorTurn(enemy);
      return;
    }

    if (intent.type === 'attack') {
      const targets = this.resolveEnemyIntentTargets(enemy, intent.targetType)
        .filter((t) => !t.isDown && t !== enemy);

      const resolveAttack = () => {
        this.performEnemyAttackIntent(enemy, intent);
        this.finishActorTurn(enemy);
      };

      if (this.events.listenerCount(BattleEvents.ENEMY_WILL_ATTACK) > 0) {
        this.events.emit(BattleEvents.ENEMY_WILL_ATTACK, {
          enemy,
          targets,
          onAnimationDone: resolveAttack,
        } as EnemyWillAttackEvent);
        return;
      }

      resolveAttack();
      return;
    }

    this.finishActorTurn(enemy);
  }

  private applyEnemyDefend(enemy: EnemyInstance, intent: EnemyIntent): void {
    const defendBonus = intent.defendBonus ?? 0;
    const block = intent.block ?? intent.value;

    if (defendBonus > 0) {
      ensureBattleRuntime(enemy).defendBonus += defendBonus;
    }
    if (block > 0) {
      enemy.block += block;
    }

    this.events.emit(BattleEvents.DEFENDED, {
      actor: enemy,
      defendBonus,
    } as DefendEvent);

    if (block > 0) {
      this.events.emit(BattleEvents.RESOURCE_CHANGED, {
        unit: enemy,
        vigorDelta: 0,
        manaDelta: 0,
        reason: 'enemy_block_gained',
      } as ResourceChangedEvent);
    }
  }

  private performEnemyAttackIntent(enemy: EnemyInstance, intent: EnemyIntent): void {
    const hitCount = Math.max(1, intent.hits ?? 1);
    const damagedTargets = new Set<Combatant>();

    for (let hit = 0; hit < hitCount; hit += 1) {
      const targets = this.resolveEnemyIntentTargets(enemy, intent.targetType);

      for (const target of targets) {
        if (target.isDown || target === enemy) continue;
        damagedTargets.add(target);
        this.resolveDamage(enemy, target, intent.value, 'physical', {
          forceCrit: intent.forceCrit,
        });
      }
    }

    if (!intent.statusId) return;

    const statusTargets = intent.statusTargetType
      ? this.resolveEnemyIntentTargets(enemy, intent.statusTargetType)
      : Array.from(damagedTargets);

    for (const target of statusTargets) {
      if (!target.isDown) {
        this.applyStatus(target, intent.statusId, 1, enemy);
      }
    }
  }

  private resolveEnemyIntentTargets(
    enemy: EnemyInstance,
    targetType: EnemyIntentTargetType,
  ): Combatant[] {
    if (targetType === 'self') {
      return [enemy];
    }

    const alive = this.state.party.filter((p) => !p.isDown);
    if (alive.length === 0) return [];

    if (targetType === 'all_allies') {
      return alive;
    }

    if (targetType === 'random_enemy') {
      return [this.redirectTauntIfNeeded(alive[Math.floor(Math.random() * alive.length)])];
    }

    if (targetType === 'highest_hp_ally') {
      const target = alive.reduce((max, p) => (
        p.currentStats.hp > max.currentStats.hp ? p : max
      ));
      return [this.redirectTauntIfNeeded(target)];
    }

    if (targetType === 'lowest_speed_ally') {
      const target = alive.reduce((min, p) => (
        p.currentStats.speed < min.currentStats.speed ? p : min
      ));
      return [target];
    }

    const target = alive.reduce((min, p) => (
      p.currentStats.hp < min.currentStats.hp ? p : min
    ));
    return [this.redirectTauntIfNeeded(target)];
  }

  /** Resolve heal targets from the enemy's own side (other enemies). */
  private resolveEnemyHealTargets(
    healer: EnemyInstance,
    targetType: EnemyIntentTargetType,
  ): EnemyInstance[] {
    const alive = this.state.enemies.filter((e) => !e.isDown);
    if (alive.length === 0) return [];

    if (targetType === 'ally_lowest_hp') {
      const target = alive.reduce((min, e) => (
        e.currentStats.hp < min.currentStats.hp ? e : min
      ));
      return [target];
    }

    return [healer];
  }

  private redirectTauntIfNeeded(target: CharacterInstance): CharacterInstance {
    const tauntingMember = this.state.party.find(
      (p) => !p.isDown && ensureBattleRuntime(p).tauntActive,
    );
    if (!tauntingMember || tauntingMember === target) return target;

    const tauntRuntime = ensureBattleRuntime(tauntingMember);
    tauntRuntime.tauntCharges = Math.max(0, tauntRuntime.tauntCharges - 1);
    tauntRuntime.tauntActive = tauntRuntime.tauntCharges > 0;
    return tauntingMember;
  }

  private resolveDamage(
    source: Combatant,
    target: Combatant,
    baseDamage: number,
    damageType: DamageType,
    options: { forceCrit?: boolean } = {},
  ): DamageResult {
    const result = calculateDamage(source, target, baseDamage, damageType, {
      damageMultiplier: this.getPassiveDamageMultiplier(source),
      forceCrit: options.forceCrit,
    });
    const { died } = applyDamage(target, result.finalDamage);

    this.emitDamageResult(source, target, result);

    if (died) {
      this.emitUnitDied(target, source);
    }

    return result;
  }

  private emitDamageResult(
    source: Combatant,
    target: Combatant,
    result: DamageResult,
  ): void {
    this.events.emit(BattleEvents.DAMAGE_DEALT, {
      source,
      target,
      amount: result.finalDamage,
      blocked: result.blocked,
      wasCrit: result.wasCrit,
      consumedMark: result.consumedMark,
    } as DamageEvent);

    if (result.finalDamage <= 0) return;

    const context = {
      state: this.state,
      source,
      target,
      damageResult: result,
    };
    this.passiveHooks.trigger(PassiveHookType.ON_DAMAGE_DEALT, context);
    this.passiveHooks.trigger(PassiveHookType.ON_DAMAGE_TAKEN, context);
    this.passiveHooks.trigger(PassiveHookType.ON_HP_THRESHOLD, context);
  }

  private emitUnitDied(unit: Combatant, source?: Combatant): void {
    this.events.emit(BattleEvents.UNIT_DIED, unit);

    if (isCharacterInstance(unit)) {
      this.triggerHollowMirror(unit);
      this.passiveHooks.trigger(PassiveHookType.ON_ALLY_DOWN, {
        state: this.state,
        target: unit,
        source,
      });
    }

    if (!source) return;

    this.passiveHooks.trigger(PassiveHookType.ON_KILL, {
      state: this.state,
      source,
      killedUnit: unit,
    });
  }

  private triggerHollowMirror(fallenAlly: CharacterInstance): void {
    if (!gameState.hasRelic('espejo_hueco')) return;

    this.emitRelicTriggered(
      'espejo_hueco',
      `${fallenAlly.data.name} cae y el Espejo Hueco responde.`,
      fallenAlly,
    );

    for (const enemy of this.state.enemies.filter((e) => !e.isDown)) {
      const result: DamageResult = {
        finalDamage: 5,
        wasCrit: false,
        blocked: 0,
        consumedMark: false,
      };
      const { died } = applyDamage(enemy, result.finalDamage);
      this.emitDamageResult(fallenAlly, enemy, result);
      if (died) {
        this.emitUnitDied(enemy, fallenAlly);
      }
    }
  }

  private insertExtraTurnAfterCurrent(actor: CharacterInstance): void {
    if (actor.isDown) return;
    this.state.turnQueue.splice(this.state.currentActorIndex + 1, 0, actor);
  }

  private getPassiveDamageMultiplier(source: Combatant): number {
    if (!isCharacterInstance(source)) return 1;

    let multiplier = 1;
    if (source.data.id === VERA_ID && this.hasSkill(source, VERA_PASSIVE_ID)) {
      const bleedingEnemies = this.state.enemies.filter(
        (enemy) => (
          !enemy.isDown
          && enemy.statusEffects.some((status) => status.id === StatusEffectId.BLEED)
        ),
      ).length;

      multiplier += bleedingEnemies * 0.1;
    }
    if (
      source.data.id === LYRA_ID
      && this.hasSkill(source, LYRA_PASSIVE_ID)
      && ensureBattleRuntime(source).lyraOjosFirstThisRound
    ) {
      multiplier += 0.2;
    }
    if (gameState.hasRelic('craneo_cuervo')) {
      multiplier += 0.3;
    }
    return multiplier;
  }

  private hasSkill(character: CharacterInstance, skillId: string): boolean {
    return character.data.skillIds.includes(skillId);
  }

  private gainVigor(unit: CharacterInstance, amount: number, reason: string): number {
    if (amount <= 0) return 0;

    const before = unit.currentResources.vigor;
    unit.currentResources.vigor = Math.min(
      unit.currentResources.vigorMax,
      unit.currentResources.vigor + amount,
    );
    const vigorDelta = unit.currentResources.vigor - before;

    if (vigorDelta > 0) {
      this.events.emit(BattleEvents.RESOURCE_CHANGED, {
        unit,
        vigorDelta,
        manaDelta: 0,
        reason,
      } as ResourceChangedEvent);
    }

    return vigorDelta;
  }

  private emitStatusApplication(result: StatusApplicationResult): void {
    if (result.resisted) {
      this.events.emit(BattleEvents.STATUS_RESISTED, {
        target: result.target,
        statusId: result.statusId,
      } as StatusResistedEvent);
      return;
    }

    this.events.emit(BattleEvents.STATUS_APPLIED, {
      target: result.target,
      statusId: result.statusId,
      stacks: result.stacks,
      duration: result.duration,
    } as StatusAppliedEvent);
  }

  private emitStatusRemoval(result: StatusRemovalResult | null): void {
    if (!result) return;

    this.events.emit(BattleEvents.STATUS_REMOVED, {
      target: result.target,
      statusId: result.statusId,
      reason: result.reason,
    } as StatusRemovedEvent);
  }

  private emitStatusTickResults(results: StatusTickResult[]): void {
    for (const result of results) {
      this.events.emit(BattleEvents.STATUS_TICKED, result as StatusTickedEvent);

      if (result.kind === 'removed') {
        this.events.emit(BattleEvents.STATUS_REMOVED, {
          target: result.unit,
          statusId: result.statusId,
          reason: result.reason ?? 'expired',
        } as StatusRemovedEvent);
      }

      if (result.died) {
        this.emitUnitDied(result.unit);
      }

      if (result.kind === 'damage' && result.amount > 0) {
        this.passiveHooks.trigger(PassiveHookType.ON_HP_THRESHOLD, {
          state: this.state,
          target: result.unit,
        });
      }
    }
  }

  private applyStatus(
    target: Combatant,
    rawStatusId: string,
    stacks: number,
    source?: Combatant,
  ): void {
    const statusId = rawStatusId as StatusEffectId;
    const markEnhanced = (
      statusId === StatusEffectId.MARKED
      && source !== undefined
      && isCharacterInstance(source)
      && gameState.hasRelic('marca_pregonero')
    );
    const duration = this.getDefaultStatusDuration(statusId) + (markEnhanced ? 1 : 0);
    const result = this.statusManager.applyEffect(target, statusId, stacks, duration);
    this.emitStatusApplication(result);

    if (markEnhanced && !result.resisted && !target.isDown) {
      const vulnerable = this.statusManager.applyEffect(
        target,
        StatusEffectId.VULNERABLE,
        1,
        this.getDefaultStatusDuration(StatusEffectId.VULNERABLE),
      );
      this.emitStatusApplication(vulnerable);
    }
  }

  private getDefaultStatusDuration(statusId: StatusEffectId): number {
    switch (statusId) {
      case StatusEffectId.BURN:
      case StatusEffectId.POISON:
      case StatusEffectId.REGEN:
      case StatusEffectId.INSPIRED:
        return -1;
      case StatusEffectId.BLEED:
      case StatusEffectId.MARKED:
        return 3;
      case StatusEffectId.VULNERABLE:
      case StatusEffectId.WEAKENED:
        return 2;
      case StatusEffectId.PROTECTED:
      case StatusEffectId.STUN:
        return 1;
      default:
        return 2;
    }
  }

  private markLyraOjosLentos(): void {
    const lyra = this.state.party.find(
      (p) => !p.isDown && p.data.id === LYRA_ID && this.hasSkill(p, LYRA_PASSIVE_ID),
    );
    if (!lyra) return;

    const firstInQueue = this.state.turnQueue[0];
    const lyraIsFirst = firstInQueue === lyra;

    ensureBattleRuntime(lyra).lyraOjosFirstThisRound = lyraIsFirst;
  }

  private markStoppedClockEnemy(): void {
    if (this.stoppedClockApplied || !gameState.hasRelic('reloj_detenido')) return;

    const firstEnemy = this.state.turnQueue.find((unit) => !isCharacterInstance(unit));
    if (!firstEnemy) return;

    ensureBattleRuntime(firstEnemy).skipTurnOnce = true;
    this.stoppedClockApplied = true;
  }

  private emitHealResult(
    source: Combatant,
    target: Combatant,
    amount: number,
    reason: string,
  ): void {
    if (amount <= 0) return;

    this.events.emit(BattleEvents.HEALED, {
      source,
      target,
      amount,
      reason,
    } as HealedEvent);
  }

  private applyCalizRegen(source: Combatant, target: Combatant, healedAmount: number): void {
    if (
      healedAmount <= 0
      || !gameState.hasRelic('caliz_aren')
      || !isCharacterInstance(target)
      || target.isDown
      || gameState.isHealingBlocked(target)
    ) {
      return;
    }

    const result = this.statusManager.applyEffect(target, StatusEffectId.REGEN, 1, -1);
    this.emitStatusApplication(result);
    this.emitRelicTriggered(
      'caliz_aren',
      'El Caliz de Aren deja Regeneracion.',
      source,
      target,
    );
  }

  private emitRelicTriggered(
    relicId: string,
    message: string,
    source?: Combatant,
    target?: Combatant,
  ): void {
    this.events.emit(BattleEvents.RELIC_TRIGGERED, {
      relicId,
      relicName: registry.getItem(relicId).name,
      message,
      source,
      target,
    } as RelicTriggeredEvent);
  }

  private getEquippedItems(member: CharacterInstance): ItemData[] {
    return [member.equipment.weapon, member.equipment.armor, member.equipment.amulet]
      .filter((itemId): itemId is string => Boolean(itemId))
      .map((itemId) => registry.getItem(itemId));
  }

  private combatantName(combatant: Combatant): string {
    return isCharacterInstance(combatant) ? combatant.data.name : combatant.data.name;
  }

  private endRound(): void {
    this.state.phase = 'end_round';
    this.emitStatusTickResults(this.statusManager.tickRoundEnd());
    this.events.emit(BattleEvents.ROUND_ENDED, this.state.currentRound);

    if (this.checkBattleEnd()) return;

    this.state.currentRound += 1;
    this.startRound();
  }

  private buildTurnQueue(): Combatant[] {
    const all: Combatant[] = [...this.state.party, ...this.state.enemies].filter(
      (u) => !u.isDown,
    );

    const queue = all.sort((a, b) => {
      const speedDiff = b.currentStats.speed - a.currentStats.speed;
      if (speedDiff !== 0) return speedDiff;
      // Tie-breaker: party before enemies.
      const aIsPlayer = isCharacterInstance(a) ? 0 : 1;
      const bIsPlayer = isCharacterInstance(b) ? 0 : 1;
      return aIsPlayer - bIsPlayer;
    });

    this.insertPactExtraAction(queue);
    return queue;
  }

  private insertPactExtraAction(queue: Combatant[]): void {
    const pactBearerId = gameState.getPactBearerId();
    if (!pactBearerId) return;

    const index = queue.findIndex(
      (unit) => isCharacterInstance(unit) && unit.data.id === pactBearerId && !unit.isDown,
    );
    if (index < 0) return;

    queue.splice(index + 1, 0, queue[index]);
  }

  private checkBattleEnd(): boolean {
    if (this.state.areEnemiesDefeated()) {
      this.state.phase = 'victory';
      this.revivePartyOnVictory();
      this.events.emit(BattleEvents.BATTLE_WON);
      return true;
    }
    if (this.state.isPartyDefeated()) {
      this.state.phase = 'defeat';
      this.events.emit(BattleEvents.BATTLE_LOST);
      return true;
    }
    return false;
  }

  private revivePartyOnVictory(): void {
    for (const member of this.state.party) {
      if (member.isDown) {
        member.isDown = false;
        member.currentStats.hp = Math.max(1, Math.floor(member.currentStats.hpMax * 0.3));
      }
    }
  }
}
