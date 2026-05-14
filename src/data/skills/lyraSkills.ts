import {
  ResourceCost,
  SkillData,
  SkillTarget,
  SkillType,
  StatusEffectId,
} from '@/types';

const lyraMarcarPresaPlus: SkillData = {
  id: 'lyra_marcar_presa_plus',
  name: 'Marcar Presa+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 2,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'apply_status', statusId: StatusEffectId.MARKED, stacks: 2 },
    { type: 'apply_status', statusId: StatusEffectId.VULNERABLE, stacks: 1 },
  ],
  description: 'Aplica Marcado x2 y Vulnerable a un enemigo.',
  characterId: 'lyra',
};

const lyraFlechaPonzonaPlus: SkillData = {
  id: 'lyra_flecha_ponzona_plus',
  name: 'Flecha Ponzoña+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 3,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'apply_status', statusId: StatusEffectId.POISON, stacks: 5 },
  ],
  description: '6 daño físico + Veneno (5 stacks).',
  characterId: 'lyra',
};

const lyraDisparoAturdidorPlus: SkillData = {
  id: 'lyra_disparo_aturdidor_plus',
  name: 'Disparo Aturdidor+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 4,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'apply_status', statusId: StatusEffectId.STUN, stacks: 1 },
    { type: 'apply_status', statusId: StatusEffectId.WEAKENED, stacks: 1 },
  ],
  description: '6 daño + Aturdimiento (1 turno) + Debilitado al objetivo.',
  characterId: 'lyra',
};

export const lyraSkills: SkillData[] = [
  {
    id: 'lyra_basic',
    name: 'Disparo',
    type: SkillType.ACTIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 5, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'gain_resource', amount: 1 },
    ],
    description: '5 daño físico. Genera +1 Vigor.',
    characterId: 'lyra',
  },
  {
    id: 'lyra_marcar_presa',
    name: 'Marcar Presa',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 1,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'apply_status', statusId: StatusEffectId.MARKED, stacks: 1 },
    ],
    description: 'Aplica Marcado (3 turnos) a un enemigo. El próximo golpe al Marcado es crítico garantizado.',
    characterId: 'lyra',
    improvedVersion: lyraMarcarPresaPlus,
  },
  {
    id: 'lyra_flecha_ponzona',
    name: 'Flecha Ponzoña',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 2,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.POISON, stacks: 3 },
    ],
    description: '6 daño físico + Veneno (3 stacks).',
    characterId: 'lyra',
    improvedVersion: lyraFlechaPonzonaPlus,
  },
  {
    id: 'lyra_disparo_aturdidor',
    name: 'Disparo Aturdidor',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 3,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 4, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.STUN, stacks: 1 },
    ],
    description: '4 daño + Aturdimiento garantizado (1 turno).',
    characterId: 'lyra',
    improvedVersion: lyraDisparoAturdidorPlus,
  },
  {
    id: 'lyra_ult_caza',
    name: 'Caza Hueca',
    type: SkillType.ULTIMATE,
    costType: ResourceCost.VIGOR,
    costAmount: 10,
    target: SkillTarget.ALL_ENEMIES,
    effects: [
      { type: 'apply_status', statusId: StatusEffectId.MARKED, stacks: 1 },
    ],
    description: 'Marca a TODOS los enemigos. El próximo ataque de cualquier aliado a un Marcado es crítico garantizado.',
    characterId: 'lyra',
  },
  {
    id: 'lyra_native_marca',
    name: 'Marca del Velo',
    type: SkillType.NATIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'El primer ataque que recibe un enemigo Marcado se convierte en crítico garantizado (x1.5).',
    characterId: 'lyra',
  },
  {
    id: 'lyra_passive_ojos',
    name: 'Ojos Lentos',
    type: SkillType.PASSIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Cuando Lyra actúa primero en un round, gana +20% de daño durante ese round.',
    characterId: 'lyra',
  },
];
