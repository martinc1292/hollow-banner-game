import type { CharacterInstance, EnemyInstance, SkillData } from '@/types';
import { ResourceCost, SkillTarget, SkillType, StatusEffectId } from '@/types';
import { gameState } from '@/systems/GameState';
import type { BattleState, Combatant } from './BattleState';
import { ensureBattleRuntime, isCharacterInstance } from './BattleState';
import { calculateDamage, applyDamage, type DamageType } from './DamageCalculator';
import type { DamageResult } from './DamageCalculator';
import type { StatusEffectManager } from './StatusEffectManager';

/**
 * Describes a single hit resolved during skill execution (for event emission).
 */
export interface SkillHitResult {
  source: Combatant;
  target: Combatant;
  damageResult: DamageResult;
}

export interface SkillHealResult {
  target: Combatant;
  amount: number;
}

export interface SkillExecutionResult {
  hits: SkillHitResult[];
  heals: SkillHealResult[];
  resourceSpent: number;
  resourceChanges: SkillResourceChange[];
  /** Deaths caused by this skill, in order */
  deaths: Combatant[];
  /** Taunt was activated this execution */
  taunted: boolean;
  /** Inspired was consumed to waive this skill's cost */
  consumedInspired: boolean;
}

export interface SkillResourceChange {
  unit: CharacterInstance;
  vigorDelta: number;
  manaDelta: number;
  reason: string;
}

/** Bonus defense percentage applied while Provocar is active (0.3 = +30%). */
const PROVOCAR_DEFENSE_BONUS_PCT = 0.3;
const VERA_ID = 'vera';
const VERA_ULT_ID = 'vera_ult_carniceria';
const MIRA_ULT_ID = 'mira_ult_pira';

export class SkillExecutor {
  constructor(
    private readonly state: BattleState,
    private readonly statusManager: StatusEffectManager,
  ) {}

  canUseSkill(actor: CharacterInstance, skill: SkillData): boolean {
    if (skill.id === VERA_ULT_ID && this.getBleedingEnemies().length === 0) {
      return false;
    }

    if (skill.type === SkillType.ULTIMATE && !this.hasFullUltimateResource(actor, skill)) {
      return false;
    }

    if (this.statusManager.hasEffect(actor, StatusEffectId.INSPIRED)) {
      return true;
    }

    if (skill.costType === ResourceCost.VIGOR) {
      return actor.currentResources.vigor >= skill.costAmount;
    }
    if (skill.costType === ResourceCost.MANA) {
      return actor.currentResources.mana >= skill.costAmount;
    }
    return true;
  }

  /**
   * Executes a skill. Callers must verify canUseSkill first.
   * Returns structured results so BattleManager can emit events.
   */
  executeSkill(
    actor: CharacterInstance,
    skill: SkillData,
    /** Pre-resolved target list from the scene (single target or AoE). */
    targets: Combatant[],
  ): SkillExecutionResult {
    const hits: SkillHitResult[] = [];
    const deaths: Combatant[] = [];
    const heals: SkillHealResult[] = [];
    const resourceChanges: SkillResourceChange[] = [];
    let taunted = false;
    const consumesInspired = (
      skill.costType !== null
      && skill.costAmount > 0
      && this.statusManager.hasEffect(actor, StatusEffectId.INSPIRED)
    );
    const spendBeforeEffects = skill.type === SkillType.ULTIMATE && !consumesInspired;
    let resourceSpent = 0;

    if (spendBeforeEffects) {
      const spent = this.spendSkillResource(actor, skill);
      resourceSpent = spent.amount;
      if (spent.change) resourceChanges.push(spent.change);
    }

    for (const effect of skill.effects) {
      switch (effect.type) {
        case 'damage': {
          const damageType: DamageType = effect.scalingStat === 'power' ? 'magical' : 'physical';
          const base = this.getSkillBaseDamage(skill, effect.amount ?? 0);
          const damageMultiplier = this.getPassiveDamageMultiplier(actor);
          for (const t of targets) {
            if (t.isDown) continue;
            const result = calculateDamage(actor, t, base, damageType, { damageMultiplier });
            const { died } = applyDamage(t, result.finalDamage);
            hits.push({ source: actor, target: t, damageResult: result });
            if (died) deaths.push(t);
          }
          break;
        }

        case 'heal': {
          const amount = effect.amount ?? 0;
          for (const t of targets) {
            if (t.isDown) continue;
            if (isCharacterInstance(t) && gameState.isHealingBlocked(t)) continue;
            const before = t.currentStats.hp;
            t.currentStats.hp = Math.min(
              t.currentStats.hpMax,
              t.currentStats.hp + amount,
            );
            const healed = t.currentStats.hp - before;
            if (healed > 0) {
              heals.push({ target: t, amount: healed });
            }
          }
          break;
        }

        case 'apply_status':
          // Delegated to BattleManager.applyStatus via the returned result —
          // SkillExecutor doesn't own the status registry call. We mark the
          // effect so BattleManager can iterate hits and apply statuses.
          // Handled externally; see BattleManager.performSkill.
          break;

        case 'buff': {
          // Provocar: +30% defense bonus for this turn.
          // Generic buff type for now only supports this one case.
          if (skill.id === 'bram_provocar' || skill.id === 'bram_provocar_plus') {
            const runtime = ensureBattleRuntime(actor);
            const bonus = Math.floor(actor.currentStats.defense * PROVOCAR_DEFENSE_BONUS_PCT);
            runtime.defendBonus += bonus;
            runtime.tauntActive = true;
            runtime.tauntCharges = skill.id === 'bram_provocar_plus' ? 2 : 1;
            taunted = true;
          }
          break;
        }

        case 'block': {
          const amount = effect.amount ?? 0;
          for (const t of targets) {
            if (t.isDown) continue;
            t.block += amount;
          }
          break;
        }

        case 'gain_resource': {
          const amount = effect.amount ?? 0;
          for (const unit of this.resolveResourceGainTargets(actor, skill, targets)) {
            const vigorDelta = this.gainVigor(unit, amount);
            if (vigorDelta > 0) {
              resourceChanges.push({
                unit,
                vigorDelta,
                manaDelta: 0,
                reason: 'gain_resource',
              });
            }
          }
          break;
        }
      }
    }

    // Spend resource after execution. Inspirado waives and consumes the cost.
    if (consumesInspired) {
      this.statusManager.removeEffect(actor, StatusEffectId.INSPIRED, 'consumed');
    } else if (!spendBeforeEffects) {
      const spent = this.spendSkillResource(actor, skill);
      resourceSpent = spent.amount;
      if (spent.change) resourceChanges.push(spent.change);
    }

    return {
      hits,
      heals,
      resourceSpent: consumesInspired ? 0 : resourceSpent,
      resourceChanges,
      deaths,
      taunted,
      consumedInspired: consumesInspired,
    };
  }

  /**
   * Resolve the correct target list for a skill based on its SkillTarget enum.
   * The scene calls this after the player picks a target (for SINGLE_*) or
   * immediately (for AoE).
   */
  resolveTargets(
    actor: CharacterInstance,
    skill: SkillData,
    pickedTarget?: Combatant,
  ): Combatant[] {
    switch (skill.target) {
      case SkillTarget.SINGLE_ENEMY:
        return pickedTarget && !isCharacterInstance(pickedTarget) && !pickedTarget.isDown
          ? [pickedTarget]
          : [];

      case SkillTarget.ALL_ENEMIES:
        if (skill.id === VERA_ULT_ID) {
          return this.getBleedingEnemies();
        }
        return this.state.enemies.filter((e) => !e.isDown);

      case SkillTarget.RANDOM_ENEMIES: {
        const alive = this.state.enemies.filter((e) => !e.isDown);
        if (alive.length === 0) return [];
        // Pick N random targets (with repetition), where N = number of damage effects.
        const damageCount = skill.effects.filter((e) => e.type === 'damage').length;
        const picked: EnemyInstance[] = [];
        for (let i = 0; i < damageCount; i++) {
          picked.push(alive[Math.floor(Math.random() * alive.length)]);
        }
        return picked;
      }

      case SkillTarget.SINGLE_ALLY:
        return pickedTarget && isCharacterInstance(pickedTarget) && !pickedTarget.isDown
          ? [pickedTarget]
          : [];

      case SkillTarget.ALL_ALLIES:
        return this.state.party.filter((p) => !p.isDown);

      case SkillTarget.SELF:
        return [actor];
    }
  }

  /** Check whether this skill requires the player to pick a target. */
  needsTargetSelection(skill: SkillData): boolean {
    return (
      skill.target === SkillTarget.SINGLE_ENEMY
      || skill.target === SkillTarget.SINGLE_ALLY
    );
  }

  private hasFullUltimateResource(actor: CharacterInstance, skill: SkillData): boolean {
    if (skill.costType === ResourceCost.VIGOR) {
      const required = Math.max(skill.costAmount, actor.currentResources.vigorMax);
      return actor.currentResources.vigor >= required;
    }
    if (skill.costType === ResourceCost.MANA) {
      const required = Math.max(skill.costAmount, actor.currentResources.manaMax);
      return actor.currentResources.mana >= required;
    }
    return true;
  }

  private spendSkillResource(
    actor: CharacterInstance,
    skill: SkillData,
  ): { amount: number; change: SkillResourceChange | null } {
    if (skill.costType === ResourceCost.VIGOR) {
      const spent = skill.type === SkillType.ULTIMATE
        ? actor.currentResources.vigor
        : skill.costAmount;
      actor.currentResources.vigor = Math.max(0, actor.currentResources.vigor - spent);
      return {
        amount: spent,
        change: spent > 0
          ? { unit: actor, vigorDelta: -spent, manaDelta: 0, reason: 'resource_spent' }
          : null,
      };
    }

    if (skill.costType === ResourceCost.MANA) {
      const spent = skill.type === SkillType.ULTIMATE
        ? actor.currentResources.mana
        : skill.costAmount;
      actor.currentResources.mana = Math.max(0, actor.currentResources.mana - spent);
      return {
        amount: spent,
        change: spent > 0
          ? { unit: actor, vigorDelta: 0, manaDelta: -spent, reason: 'resource_spent' }
          : null,
      };
    }

    return { amount: 0, change: null };
  }

  private gainVigor(unit: CharacterInstance, amount: number): number {
    if (amount <= 0) return 0;

    const before = unit.currentResources.vigor;
    unit.currentResources.vigor = Math.min(
      unit.currentResources.vigorMax,
      unit.currentResources.vigor + amount,
    );
    return unit.currentResources.vigor - before;
  }

  private resolveResourceGainTargets(
    actor: CharacterInstance,
    skill: SkillData,
    targets: Combatant[],
  ): CharacterInstance[] {
    if (skill.target === SkillTarget.ALL_ALLIES) {
      return targets.filter(isCharacterInstance);
    }
    return [actor];
  }

  private getSkillBaseDamage(skill: SkillData, base: number): number {
    if (skill.id === MIRA_ULT_ID) {
      return base + this.state.ashes * 3;
    }
    return base;
  }

  private getPassiveDamageMultiplier(actor: CharacterInstance): number {
    let multiplier = 1;
    if (
      actor.data.id === VERA_ID
      && actor.data.skillIds.includes('vera_passive_frenesi')
    ) {
      multiplier += this.getBleedingEnemies().length * 0.1;
    }
    if (gameState.hasRelic('craneo_cuervo')) {
      multiplier += 0.3;
    }
    return multiplier;
  }

  private getBleedingEnemies(): EnemyInstance[] {
    return this.state.enemies.filter(
      (enemy) => !enemy.isDown && this.statusManager.hasEffect(enemy, StatusEffectId.BLEED),
    );
  }

  /**
   * If Provocar is active on the target and the attacker is an enemy,
   * redirect the attack to Bram (the taunter).
   */
  resolveProvocaTaunt(target: Combatant): Combatant {
    if (isCharacterInstance(target)) return target;

    const bram = this.state.party.find(
      (p) => !p.isDown && ensureBattleRuntime(p).tauntActive,
    );
    return bram ?? target;
  }
}
