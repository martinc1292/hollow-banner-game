import Phaser from 'phaser';
import { registry } from '@/data/Registry';
import { StatusEffectId, type CharacterInstance, type EnemyInstance, type SkillData } from '@/types';
import { BattleState, ensureBattleRuntime, type Combatant } from './BattleState';
import { applyDamage, calculateDamage, type DamageResult, type DamageType } from './DamageCalculator';

export const BattleEvents = {
  TURN_START: 'turn_start',
  PLAYER_TURN_START: 'player_turn_start',
  ENEMY_TURN_START: 'enemy_turn_start',
  DAMAGE_DEALT: 'damage_dealt',
  UNIT_DIED: 'unit_died',
  RESOURCE_CHANGED: 'resource_changed',
  DEFENDED: 'defended',
  STATUS_APPLIED: 'status_applied',
  ROUND_STARTED: 'round_started',
  ROUND_ENDED: 'round_ended',
  BATTLE_WON: 'battle_won',
  BATTLE_LOST: 'battle_lost',
} as const;

export interface DamageEvent {
  source: Combatant;
  target: Combatant;
  amount: number;
  blocked: number;
  wasCrit: boolean;
  consumedMark: boolean;
}

export interface ResourceChangedEvent {
  unit: CharacterInstance;
  vigorDelta: number;
  reason: string;
}

export interface DefendEvent {
  actor: CharacterInstance;
  defendBonus: number;
}

export interface StatusAppliedEvent {
  target: Combatant;
  statusId: StatusEffectId;
  stacks: number;
}

export function isCharacterInstance(c: Combatant): c is CharacterInstance {
  return 'currentResources' in c;
}

const DEFEND_BONUS = 5;
const ENEMY_BASIC_DAMAGE = 5;
const BRAM_ID = 'bram';

export class BattleManager {
  readonly events = new Phaser.Events.EventEmitter();
  private waitingForPlayerInput = false;

  constructor(public readonly state: BattleState) {}

  startBattle(): void {
    this.startRound();
  }

  startRound(): void {
    this.state.phase = 'start_round';
    this.state.turnQueue = this.buildTurnQueue();
    this.state.currentActorIndex = -1;
    this.events.emit(BattleEvents.ROUND_STARTED, this.state.currentRound);
    this.nextTurn();
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

    this.executeBasicAttack(actor, target);
    this.nextTurn();
  }

  performDefend(actor: CharacterInstance): void {
    if (!this.canResolvePlayerAction(actor)) return;
    this.waitingForPlayerInput = false;

    ensureBattleRuntime(actor).defendBonus = DEFEND_BONUS;
    this.events.emit(BattleEvents.DEFENDED, { actor, defendBonus: DEFEND_BONUS } as DefendEvent);
    this.nextTurn();
  }

  private canResolvePlayerAction(actor: CharacterInstance): boolean {
    return (
      this.waitingForPlayerInput
      && this.state.turnQueue[this.state.currentActorIndex] === actor
      && !actor.isDown
    );
  }

  private beginActorTurn(actor: Combatant): void {
    const runtime = ensureBattleRuntime(actor);
    runtime.defendBonus = 0;

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
        this.applyStatus(target, effect.statusId, effect.stacks ?? 1);
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
    const target = this.state.party.find((p) => !p.isDown);
    if (target) {
      this.resolveDamage(enemy, target, ENEMY_BASIC_DAMAGE, 'physical');
    }
    this.nextTurn();
  }

  private resolveDamage(
    source: Combatant,
    target: Combatant,
    baseDamage: number,
    damageType: DamageType,
  ): DamageResult {
    const result = calculateDamage(source, target, baseDamage, damageType);
    const { died } = applyDamage(target, result.finalDamage);

    this.events.emit(BattleEvents.DAMAGE_DEALT, {
      source,
      target,
      amount: result.finalDamage,
      blocked: result.blocked,
      wasCrit: result.wasCrit,
      consumedMark: result.consumedMark,
    } as DamageEvent);

    if (result.finalDamage > 0) {
      this.triggerBramJuramento(source, target);
    }

    if (died) {
      this.events.emit(BattleEvents.UNIT_DIED, target);
    }

    return result;
  }

  private triggerBramJuramento(source: Combatant, target: Combatant): void {
    if (isCharacterInstance(source) || !isCharacterInstance(target)) return;

    const bram = this.state.party.find((member) => member.data.id === BRAM_ID && !member.isDown);
    if (!bram || bram === target) return;

    const runtime = ensureBattleRuntime(bram);
    if (runtime.bramVigorGainedThisTurn >= 2) return;

    const gained = this.gainVigor(bram, 1, 'bram_native_juramento');
    if (gained > 0) {
      runtime.bramVigorGainedThisTurn += 1;
    }
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
        reason,
      } as ResourceChangedEvent);
    }

    return vigorDelta;
  }

  private applyStatus(target: Combatant, rawStatusId: string, stacks: number): void {
    const statusId = rawStatusId as StatusEffectId;
    const statusData = registry.getStatusEffect(statusId);
    const appliedStacks = Math.max(1, stacks);
    const duration = this.getDefaultStatusDuration(statusId);
    const existing = target.statusEffects.find((s) => s.id === statusId);

    if (existing) {
      const nextStacks = statusData.stackable
        ? existing.stacks + appliedStacks
        : Math.max(existing.stacks, appliedStacks);
      existing.stacks = statusData.maxStacks === null
        ? nextStacks
        : Math.min(statusData.maxStacks, nextStacks);
      existing.duration = duration;
    } else {
      const cappedStacks = statusData.maxStacks === null
        ? appliedStacks
        : Math.min(statusData.maxStacks, appliedStacks);
      target.statusEffects.push({ id: statusId, stacks: cappedStacks, duration });
    }

    this.events.emit(BattleEvents.STATUS_APPLIED, {
      target,
      statusId,
      stacks: appliedStacks,
    } as StatusAppliedEvent);
  }

  private getDefaultStatusDuration(statusId: StatusEffectId): number {
    switch (statusId) {
      case StatusEffectId.VULNERABLE:
      case StatusEffectId.WEAKENED:
        return 2;
      case StatusEffectId.MARKED:
      case StatusEffectId.PROTECTED:
      case StatusEffectId.STUN:
        return 1;
      default:
        return 2;
    }
  }

  private endRound(): void {
    this.state.phase = 'end_round';
    this.tickStatusEffectsPlaceholder();
    this.events.emit(BattleEvents.ROUND_ENDED, this.state.currentRound);

    if (this.checkBattleEnd()) return;

    this.state.currentRound += 1;
    this.startRound();
  }

  private buildTurnQueue(): Combatant[] {
    const all: Combatant[] = [...this.state.party, ...this.state.enemies].filter(
      (u) => !u.isDown,
    );

    return all.sort((a, b) => {
      const speedDiff = b.currentStats.speed - a.currentStats.speed;
      if (speedDiff !== 0) return speedDiff;
      // Tie-breaker: party before enemies.
      const aIsPlayer = isCharacterInstance(a) ? 0 : 1;
      const bIsPlayer = isCharacterInstance(b) ? 0 : 1;
      return aIsPlayer - bIsPlayer;
    });
  }

  private tickStatusEffectsPlaceholder(): void {
    const tick = (unit: Combatant) => {
      unit.statusEffects = unit.statusEffects
        .map((s) => ({ ...s, duration: s.duration > 0 ? s.duration - 1 : s.duration }))
        .filter((s) => s.duration !== 0);
    };
    this.state.party.forEach(tick);
    this.state.enemies.forEach(tick);
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
