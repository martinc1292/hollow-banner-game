import type { Combatant } from './BattleState';
import { ensureBattleRuntime } from './BattleState';
import { StatusEffectId } from '@/types';

export type DamageType = 'physical' | 'magical';

export interface DamageOptions {
  /** If true, force a critical hit (e.g. consuming Marcado). */
  forceCrit?: boolean;
  /** Some future effects may read Marcado without consuming it. Defaults true. */
  consumeMark?: boolean;
  /** RNG hook so tests can be deterministic. Returns [0, 100). */
  rng?: () => number;
}

export interface DamageResult {
  finalDamage: number;
  wasCrit: boolean;
  /** Raw damage absorbed by the target's Bloque shield. */
  blocked: number;
  consumedMark: boolean;
}

const VULNERABLE_MULTIPLIER = 1.5;
const WEAKENED_MULTIPLIER = 0.5;
const PROTECTED_MULTIPLIER = 0.5;
const CRIT_MULTIPLIER = 1.5;

function hasStatus(c: Combatant, id: StatusEffectId): boolean {
  return c.statusEffects.some((s) => s.id === id);
}

function removeStatus(c: Combatant, id: StatusEffectId): void {
  c.statusEffects = c.statusEffects.filter((s) => s.id !== id);
}

/**
 * GDD damage formula. Pure function: mutates only the absorbed Bloque on the
 * target and the Marcado status (which the GDD says the consuming hit removes).
 */
export function calculateDamage(
  attacker: Combatant,
  target: Combatant,
  baseDamage: number,
  damageType: DamageType,
  options: DamageOptions = {},
): DamageResult {
  const rng = options.rng ?? Math.random;

  const stat = damageType === 'physical' ? attacker.currentStats.attack : attacker.currentStats.power;
  let damage = baseDamage + stat;

  if (hasStatus(target, StatusEffectId.VULNERABLE)) {
    damage *= VULNERABLE_MULTIPLIER;
  }
  if (hasStatus(attacker, StatusEffectId.WEAKENED)) {
    damage *= WEAKENED_MULTIPLIER;
  }
  if (hasStatus(target, StatusEffectId.PROTECTED)) {
    damage *= PROTECTED_MULTIPLIER;
  }

  let wasCrit = false;
  let consumedMark = false;
  const shouldConsumeMark = options.consumeMark ?? true;
  const hasMarkedTarget = hasStatus(target, StatusEffectId.MARKED);

  if (options.forceCrit || hasMarkedTarget) {
    wasCrit = true;
    if (hasMarkedTarget && shouldConsumeMark) {
      consumedMark = true;
      removeStatus(target, StatusEffectId.MARKED);
    }
  } else if (rng() * 100 < attacker.currentStats.crit) {
    wasCrit = true;
  }

  if (wasCrit) {
    damage *= CRIT_MULTIPLIER;
  }

  const targetRuntime = ensureBattleRuntime(target);
  const defense = target.currentStats.defense + targetRuntime.defendBonus;

  const incomingDamage = Math.max(1, Math.floor(damage - defense));
  let finalDamage = incomingDamage;

  let blocked = 0;
  if (targetRuntime.block > 0) {
    blocked = Math.min(targetRuntime.block, finalDamage);
    targetRuntime.block -= blocked;
    finalDamage -= blocked;
  }

  return { finalDamage, wasCrit, blocked, consumedMark };
}

/**
 * Subtract HP and flag isDown when the unit drops to zero. Returns whether the
 * target died from this hit so callers can emit a death event.
 */
export function applyDamage(target: Combatant, damage: number): { died: boolean } {
  if (target.isDown || damage <= 0) return { died: false };
  target.currentStats.hp = Math.max(0, target.currentStats.hp - damage);
  if (target.currentStats.hp <= 0) {
    target.isDown = true;
    return { died: true };
  }
  return { died: false };
}
