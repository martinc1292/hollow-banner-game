import { StatusEffectId } from '@/types';
import type { EnemyInstance, EnemyIntent } from '@/types';
import type { BattleState } from '@/systems/battle/BattleState';

export type IntentPatternFn = (enemy: EnemyInstance, state: BattleState, round: number) => EnemyIntent;

export const intentPatterns: Record<string, IntentPatternFn> = {
  simple_attacker: (enemy) => ({
    type: 'attack',
    targetType: 'single_ally',
    value: enemy.currentStats.attack,
    description: `Ataca al aliado con menos HP`,
  }),

  bleeder: (enemy) => {
    if (Math.random() < 0.5) {
      return {
        type: 'attack',
        targetType: 'single_ally',
        value: enemy.currentStats.attack,
        description: `Ataca`,
      };
    }
    return {
      type: 'apply_status',
      targetType: 'random_enemy',
      value: 1,
      description: `Inflige SANGRADO`,
      statusId: StatusEffectId.BLEED,
    };
  },

  defensive: (enemy, _state, round) => {
    if (round % 3 === 0) {
      return {
        type: 'defend',
        targetType: 'self',
        value: 0,
        description: `Se defiende`,
      };
    }
    return {
      type: 'attack',
      targetType: 'random_enemy',
      value: enemy.currentStats.attack,
      description: `Ataca`,
    };
  },

  random_target_attacker: (enemy) => ({
    type: 'attack',
    targetType: 'random_enemy',
    value: enemy.currentStats.attack,
    description: `Ataca a objetivo aleatorio`,
  }),

  caster: (enemy, _state, round) => {
    if (round % 2 === 0) {
      const debuff = Math.random() < 0.5 ? StatusEffectId.VULNERABLE : StatusEffectId.WEAKENED;
      const name = debuff === StatusEffectId.VULNERABLE ? 'VULNERABLE' : 'DEBILITADO';
      return {
        type: 'apply_status',
        targetType: 'random_enemy',
        value: 1,
        description: `Aplica ${name}`,
        statusId: debuff,
      };
    }
    return {
      type: 'attack',
      targetType: 'single_ally',
      value: enemy.currentStats.attack,
      description: `Ataca`,
    };
  },

  pregonero: (enemy, _state, round) => {
    const hpPercent = (enemy.currentStats.hp / enemy.currentStats.hpMax) * 100;
    const rageReady = hpPercent <= 50 && enemy.aiState.pregoneroRageUsed !== true;
    const patternRound = rageReady ? 4 : ((round - 1) % 4) + 1;

    if (rageReady) {
      enemy.aiState.pregoneroRageUsed = true;
    }

    switch (patternRound) {
      case 1:
        return {
          type: 'apply_status',
          targetType: 'all_allies',
          value: 1,
          description: 'Marca a toda la party',
          statusId: StatusEffectId.MARKED,
        };

      case 2:
        return {
          type: 'attack',
          targetType: 'highest_hp_ally',
          value: 12,
          description: 'Golpe al mayor HP (12)',
        };

      case 3:
        return {
          type: 'apply_status',
          targetType: 'all_allies',
          value: 1,
          description: 'Vulnerable a todos',
          statusId: StatusEffectId.VULNERABLE,
        };

      case 4:
      default:
        return {
          type: 'attack',
          targetType: 'all_allies',
          value: 6,
          description: rageReady ? 'Furia: AoE 6, crit en Marcados' : 'AoE 6, crit en Marcados',
        };
    }
  },

  padre_oxidado: (enemy, _state, round) => {
    if (enemy.phase >= 2) {
      if (round % 3 === 0) {
        return {
          type: 'attack',
          targetType: 'all_allies',
          value: 8,
          description: 'Pisoton AoE 8 + Aturde',
          statusId: StatusEffectId.STUN,
          statusTargetType: 'lowest_speed_ally',
        };
      }

      return {
        type: 'attack',
        targetType: 'random_enemy',
        value: 10,
        hits: 2,
        description: 'Arremetida x2 (10)',
      };
    }

    if (round % 2 === 1) {
      return {
        type: 'defend',
        targetType: 'self',
        value: 20,
        block: 20,
        defendBonus: 10,
        description: 'Defensa +10, Bloque 20',
      };
    }

    return {
      type: 'attack',
      targetType: 'random_enemy',
      value: 18,
      description: 'Ataque pesado 18',
    };
  },
};
