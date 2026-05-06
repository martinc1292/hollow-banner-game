import {
  ResourceCost,
  SkillData,
  SkillTarget,
  SkillType,
  StatusEffectId,
} from '@/types';

const miraLlamaradaPlus: SkillData = {
  id: 'mira_llamarada_plus',
  name: 'Llamarada+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.MANA,
  costAmount: 2,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'damage', amount: 11, scalingStat: 'power', scalingMultiplier: 1.0 },
    { type: 'apply_status', statusId: StatusEffectId.BURN, stacks: 3 },
  ],
  description: '11 dano magico a un enemigo + Quemadura (3 stacks).',
  characterId: 'mira',
};

const miraTormentaPlus: SkillData = {
  id: 'mira_tormenta_plus',
  name: 'Tormenta de Brasas+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.MANA,
  costAmount: 4,
  target: SkillTarget.ALL_ENEMIES,
  effects: [
    { type: 'damage', amount: 6, scalingStat: 'power', scalingMultiplier: 1.0 },
    { type: 'apply_status', statusId: StatusEffectId.BURN, stacks: 2 },
  ],
  description: '6 dano magico AoE + Quemadura (2 stacks) a todos.',
  characterId: 'mira',
};

const miraVeloHumoPlus: SkillData = {
  id: 'mira_velo_humo_plus',
  name: 'Velo de Humo+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 2,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'apply_status', statusId: StatusEffectId.VULNERABLE, stacks: 1 },
    { type: 'apply_status', statusId: StatusEffectId.MARKED, stacks: 1 },
  ],
  description: 'Aplica Vulnerable y Marcado a un enemigo.',
  characterId: 'mira',
};

export const miraSkills: SkillData[] = [
  {
    id: 'mira_basic',
    name: 'Centella',
    type: SkillType.ACTIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 4, scalingStat: 'power', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.BURN, stacks: 1 },
      { type: 'gain_resource', amount: 1 },
    ],
    description: '4 daño mágico + 1 stack de Quemadura. Genera +1 Vigor.',
    characterId: 'mira',
  },
  {
    id: 'mira_llamarada',
    name: 'Llamarada',
    type: SkillType.ACTIVE,
    costType: ResourceCost.MANA,
    costAmount: 2,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 8, scalingStat: 'power', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.BURN, stacks: 2 },
    ],
    description: '8 daño mágico a un enemigo + Quemadura (2 stacks).',
    characterId: 'mira',
    improvedVersion: miraLlamaradaPlus,
  },
  {
    id: 'mira_tormenta',
    name: 'Tormenta de Brasas',
    type: SkillType.ACTIVE,
    costType: ResourceCost.MANA,
    costAmount: 4,
    target: SkillTarget.ALL_ENEMIES,
    effects: [
      { type: 'damage', amount: 5, scalingStat: 'power', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.BURN, stacks: 1 },
    ],
    description: '5 daño mágico AoE + Quemadura a todos.',
    characterId: 'mira',
    improvedVersion: miraTormentaPlus,
  },
  {
    id: 'mira_velo_humo',
    name: 'Velo de Humo',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 2,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'apply_status', statusId: StatusEffectId.VULNERABLE, stacks: 1 },
    ],
    description: 'Aplica Vulnerable (50% más daño recibido) a un enemigo por 2 turnos.',
    characterId: 'mira',
    improvedVersion: miraVeloHumoPlus,
  },
  {
    id: 'mira_ult_pira',
    name: 'Pira Hueca',
    type: SkillType.ULTIMATE,
    costType: ResourceCost.MANA,
    costAmount: 10,
    target: SkillTarget.ALL_ENEMIES,
    effects: [
      { type: 'damage', amount: 10, scalingStat: 'power', scalingMultiplier: 1.0 },
    ],
    description: '10 daño AoE + 3 daño extra por Ceniza acumulada. Consume las cenizas.',
    characterId: 'mira',
  },
  {
    id: 'mira_native_ceniza',
    name: 'Ceniza Acumulada',
    type: SkillType.NATIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Cada vez que Mira gasta Vigor o Mana, deja una Ceniza en el campo (máx 5). Su definitiva escala con cenizas.',
    characterId: 'mira',
  },
  {
    id: 'mira_passive_catalizadora',
    name: 'Catalizadora',
    type: SkillType.PASSIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description: 'Las quemaduras hacen +50% daño mientras Mira esté viva.',
    characterId: 'mira',
  },
];
