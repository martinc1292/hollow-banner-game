import {
  ResourceCost,
  SkillData,
  SkillTarget,
  SkillType,
  StatusEffectId,
} from '@/types';

export const bramSkills: SkillData[] = [
  {
    id: 'bram_basic',
    name: 'Mandoble',
    type: SkillType.ACTIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 5, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'gain_resource', amount: 1 },
    ],
    description: '5 daño físico. Genera +1 Vigor.',
    characterId: 'bram',
  },
  {
    id: 'bram_provocar',
    name: 'Provocar',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 1,
    target: SkillTarget.SELF,
    effects: [
      { type: 'buff', amount: 30 },
    ],
    description:
      'El próximo ataque enemigo dirigido a un aliado se redirige a Bram. +30% Defensa este turno.',
    characterId: 'bram',
  },
  {
    id: 'bram_escudo_hierro',
    name: 'Escudo de Hierro',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 3,
    target: SkillTarget.SINGLE_ALLY,
    effects: [
      { type: 'block', amount: 15 },
      { type: 'apply_status', statusId: StatusEffectId.PROTECTED, stacks: 1 },
    ],
    description: 'Bram gana 15 de Bloque. Aplica Protegido a un aliado.',
    characterId: 'bram',
  },
  {
    id: 'bram_embestida',
    name: 'Embestida',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 2,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 8, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.STUN, stacks: 1 },
    ],
    description: '8 daño + Aturdimiento (1 turno).',
    characterId: 'bram',
  },
  {
    id: 'bram_ult_estandarte',
    name: 'Estandarte Hueco',
    type: SkillType.ULTIMATE,
    costType: ResourceCost.VIGOR,
    costAmount: 10,
    target: SkillTarget.ALL_ALLIES,
    effects: [
      { type: 'block', amount: 10 },
      { type: 'gain_resource', amount: 2 },
    ],
    description: 'Toda la party gana 10 de Bloque y +2 Vigor inmediato.',
    characterId: 'bram',
  },
  {
    id: 'bram_native_juramento',
    name: 'Juramento Hueco',
    type: SkillType.NATIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Cuando un aliado recibe daño con Bram vivo, Bram gana +1 Vigor. Máx +2 por turno.',
    characterId: 'bram',
  },
  {
    id: 'bram_passive_voto',
    name: 'Voto Inquebrantable',
    type: SkillType.PASSIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Al caer a 25% HP por primera vez en un combate, gana +50% Defensa permanente en ese combate.',
    characterId: 'bram',
  },
];
