import { registry } from '@/data/Registry';
import { gameState } from '@/systems/GameState';
import {
  StatusEffectId,
  TriggerTiming,
  type StatusEffectInstance,
} from '@/types';
import {
  BattleState,
  isCharacterInstance,
  type Combatant,
} from './BattleState';
import { applyDamage } from './DamageCalculator';

export type StatusRemovalReason = 'expired' | 'purged' | 'consumed' | 'manual';

export type StatusTickKind =
  | 'damage'
  | 'heal'
  | 'skip'
  | 'stack_decay'
  | 'removed';

export interface StatusApplicationResult {
  target: Combatant;
  statusId: StatusEffectId;
  applied: boolean;
  resisted: boolean;
  stacks: number;
  duration: number;
}

export interface StatusRemovalResult {
  target: Combatant;
  statusId: StatusEffectId;
  reason: StatusRemovalReason;
}

export interface StatusTickResult {
  unit: Combatant;
  statusId: StatusEffectId;
  kind: StatusTickKind;
  amount: number;
  stacks: number;
  duration: number;
  died?: boolean;
  reason?: StatusRemovalReason;
}

const DECAYS_AT_ROUND_END = new Set<StatusEffectId>([
  StatusEffectId.BURN,
  StatusEffectId.POISON,
  StatusEffectId.REGEN,
]);
const MIRA_ID = 'mira';
const MIRA_CATALIZADORA_ID = 'mira_passive_catalizadora';

export class StatusEffectManager {
  constructor(
    private readonly state: BattleState,
    private readonly rng: () => number = Math.random,
  ) {}

  applyEffect(
    target: Combatant,
    rawEffectId: StatusEffectId | string,
    stacks: number,
    duration: number,
  ): StatusApplicationResult {
    const statusId = rawEffectId as StatusEffectId;
    const statusData = registry.getStatusEffect(statusId);
    const appliedStacks = Math.max(1, Math.floor(stacks));
    const nextDuration = Math.trunc(duration);
    const existing = this.findEffect(target, statusId);

    if (!existing && statusData.isNegative && this.rollResistance(target)) {
      return {
        target,
        statusId,
        applied: false,
        resisted: true,
        stacks: 0,
        duration: nextDuration,
      };
    }

    if (existing) {
      if (statusData.stackable) {
        const nextStacks = existing.stacks + appliedStacks;
        existing.stacks = this.capStacks(nextStacks, statusData.maxStacks);
      } else {
        existing.stacks = this.capStacks(
          Math.max(existing.stacks, appliedStacks),
          statusData.maxStacks,
        );
      }

      existing.duration = this.refreshedDuration(existing.duration, nextDuration);

      return {
        target,
        statusId,
        applied: true,
        resisted: false,
        stacks: existing.stacks,
        duration: existing.duration,
      };
    }

    const cappedStacks = this.capStacks(appliedStacks, statusData.maxStacks);
    target.statusEffects.push({
      id: statusId,
      stacks: cappedStacks,
      duration: nextDuration,
    });

    return {
      target,
      statusId,
      applied: true,
      resisted: false,
      stacks: cappedStacks,
      duration: nextDuration,
    };
  }

  removeEffect(
    target: Combatant,
    rawEffectId: StatusEffectId | string,
    reason: StatusRemovalReason = 'manual',
  ): StatusRemovalResult | null {
    const statusId = rawEffectId as StatusEffectId;
    const before = target.statusEffects.length;
    target.statusEffects = target.statusEffects.filter((s) => s.id !== statusId);

    if (target.statusEffects.length === before) {
      return null;
    }

    return { target, statusId, reason };
  }

  purgeNegative(target: Combatant): StatusRemovalResult[] {
    const removed: StatusRemovalResult[] = [];

    for (const status of [...target.statusEffects]) {
      const data = registry.getStatusEffect(status.id);
      if (data.isNegative) {
        const result = this.removeEffect(target, status.id, 'purged');
        if (result) removed.push(result);
      }
    }

    return removed;
  }

  hasEffect(target: Combatant, rawEffectId: StatusEffectId | string): boolean {
    return this.findEffect(target, rawEffectId as StatusEffectId) !== undefined;
  }

  tickAtTiming(unit: Combatant, timing: TriggerTiming): StatusTickResult[] {
    const results: StatusTickResult[] = [];

    for (const status of [...unit.statusEffects]) {
      const current = this.findEffect(unit, status.id);
      if (!current || unit.isDown) continue;

      switch (status.id) {
        case StatusEffectId.POISON:
          if (timing === TriggerTiming.TURN_START) {
            results.push(this.applyStatusDamage(unit, current, status.id));
          }
          break;

        case StatusEffectId.BLEED:
          if (
            (isCharacterInstance(unit) && timing === TriggerTiming.ON_ACT)
            || (!isCharacterInstance(unit) && timing === TriggerTiming.TURN_START)
          ) {
            results.push(this.applyStatusDamage(unit, current, status.id));
          }
          break;

        case StatusEffectId.STUN:
          if (timing === TriggerTiming.TURN_START) {
            results.push({
              unit,
              statusId: status.id,
              kind: 'skip',
              amount: 0,
              stacks: current.stacks,
              duration: current.duration,
            });
            this.removeEffect(unit, status.id, 'consumed');
          }
          break;

        case StatusEffectId.BURN:
          if (timing === TriggerTiming.TURN_END) {
            results.push(this.applyStatusDamage(unit, current, status.id));
          }
          break;

        case StatusEffectId.REGEN:
          if (timing === TriggerTiming.TURN_END) {
            results.push(this.applyStatusHeal(unit, current, status.id));
          }
          break;

        default:
          break;
      }
    }

    return results.filter((r) => r.kind !== 'damage' || r.amount > 0);
  }

  tickRoundEnd(): StatusTickResult[] {
    const results: StatusTickResult[] = [];

    for (const unit of [...this.state.party, ...this.state.enemies]) {
      for (const status of [...unit.statusEffects]) {
        const current = this.findEffect(unit, status.id);
        if (!current) continue;

        if (DECAYS_AT_ROUND_END.has(current.id)) {
          current.stacks = Math.max(0, current.stacks - 1);
          results.push({
            unit,
            statusId: current.id,
            kind: 'stack_decay',
            amount: 1,
            stacks: current.stacks,
            duration: current.duration,
          });

          if (current.stacks <= 0) {
            this.removeEffect(unit, current.id, 'expired');
            results.push(this.removedTick(unit, current.id, 'expired'));
            continue;
          }
        }

        if (current.duration > 0 && current.id !== StatusEffectId.STUN) {
          current.duration -= 1;

          if (current.duration <= 0) {
            this.removeEffect(unit, current.id, 'expired');
            results.push(this.removedTick(unit, current.id, 'expired'));
          }
        }
      }
    }

    return results;
  }

  private applyStatusDamage(
    unit: Combatant,
    status: StatusEffectInstance,
    statusId: StatusEffectId,
  ): StatusTickResult {
    const amount = this.getStatusDamageAmount(unit, status, statusId);
    const { died } = applyDamage(unit, amount);

    return {
      unit,
      statusId,
      kind: 'damage',
      amount,
      stacks: status.stacks,
      duration: status.duration,
      died,
    };
  }

  private getStatusDamageAmount(
    unit: Combatant,
    status: StatusEffectInstance,
    statusId: StatusEffectId,
  ): number {
    if (
      statusId === StatusEffectId.BLEED
      && gameState.hasRelic('sangre_negra')
      && !isCharacterInstance(unit)
    ) {
      return Math.ceil(status.stacks * 1.5);
    }
    if (statusId === StatusEffectId.BURN && this.isMiraCatalizadoraActive()) {
      return Math.ceil(status.stacks * 1.5);
    }
    return Math.max(0, status.stacks);
  }

  private isMiraCatalizadoraActive(): boolean {
    return this.state.party.some(
      (member) => (
        member.data.id === MIRA_ID
        && !member.isDown
        && member.data.skillIds.includes(MIRA_CATALIZADORA_ID)
      ),
    );
  }

  private applyStatusHeal(
    unit: Combatant,
    status: StatusEffectInstance,
    statusId: StatusEffectId,
  ): StatusTickResult {
    if (isCharacterInstance(unit) && gameState.isHealingBlocked(unit)) {
      return {
        unit,
        statusId,
        kind: 'heal',
        amount: 0,
        stacks: status.stacks,
        duration: status.duration,
      };
    }

    const before = unit.currentStats.hp;
    unit.currentStats.hp = Math.min(
      unit.currentStats.hpMax,
      unit.currentStats.hp + status.stacks,
    );

    return {
      unit,
      statusId,
      kind: 'heal',
      amount: unit.currentStats.hp - before,
      stacks: status.stacks,
      duration: status.duration,
    };
  }

  private removedTick(
    unit: Combatant,
    statusId: StatusEffectId,
    reason: StatusRemovalReason,
  ): StatusTickResult {
    return {
      unit,
      statusId,
      kind: 'removed',
      amount: 0,
      stacks: 0,
      duration: 0,
      reason,
    };
  }

  private findEffect(
    target: Combatant,
    statusId: StatusEffectId,
  ): StatusEffectInstance | undefined {
    return target.statusEffects.find((s) => s.id === statusId);
  }

  private rollResistance(target: Combatant): boolean {
    const resistance = Math.max(0, Math.min(100, target.currentStats.resistance));
    return this.rng() * 100 < resistance;
  }

  private capStacks(stacks: number, maxStacks: number | null): number {
    return maxStacks === null ? stacks : Math.min(maxStacks, stacks);
  }

  private refreshedDuration(current: number, next: number): number {
    if (current < 0 || next < 0) return -1;
    return Math.max(current, next);
  }
}
