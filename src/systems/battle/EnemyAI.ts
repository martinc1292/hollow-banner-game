import { intentPatterns } from '@/data/enemies/intentPatterns';
import type { EnemyInstance, EnemyIntent } from '@/types';
import type { BattleState } from './BattleState';

export class EnemyAI {
  calculateIntent(enemy: EnemyInstance, state: BattleState): EnemyIntent {
    const patternFn = intentPatterns[enemy.data.intentPattern];
    if (!patternFn) {
      return {
        type: 'attack',
        targetType: 'single_ally',
        value: enemy.currentStats.attack,
        description: 'Ataca',
      };
    }
    return patternFn(enemy, state, state.currentRound);
  }

  resolveTarget(intent: EnemyIntent, state: BattleState): import('@/systems/battle/BattleState').Combatant | null {
    const alive = state.party.filter((p) => !p.isDown);
    if (alive.length === 0) return null;

    switch (intent.targetType) {
      case 'single_ally':
        return alive.reduce((min, p) =>
          p.currentStats.hp < min.currentStats.hp ? p : min,
        );
      case 'highest_hp_ally':
        return alive.reduce((max, p) =>
          p.currentStats.hp > max.currentStats.hp ? p : max,
        );
      case 'lowest_speed_ally':
        return alive.reduce((min, p) =>
          p.currentStats.speed < min.currentStats.speed ? p : min,
        );
      case 'random_enemy':
        return alive[Math.floor(Math.random() * alive.length)];
      case 'all_allies':
        return alive[0];
      case 'self':
      case 'ally_lowest_hp':
        return null;
    }
  }
}

export const enemyAI = new EnemyAI();
