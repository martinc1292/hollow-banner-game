import {
  ResourceCost,
  SkillData,
  SkillTarget,
  SkillType,
  StatusEffectId,
} from '@/types';

const arenManoLuzPlus: SkillData = {
  id: 'aren_mano_luz_plus',
  name: 'Mano de Luz+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 3,
  target: SkillTarget.SINGLE_ALLY,
  effects: [
    { type: 'heal', amount: 18 },
    { type: 'gain_resource', amount: 2 },
  ],
  description: 'Cura 18 HP a un aliado. Aren gana +2 Vigor.',
  characterId: 'aren',
};

const arenPurgarPlus: SkillData = {
  id: 'aren_purgar_plus',
  name: 'Purgar+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 3,
  target: SkillTarget.SINGLE_ALLY,
  effects: [
    { type: 'purge_negative' },
    { type: 'heal', amount: 10 },
    { type: 'gain_resource', amount: 2 },
  ],
  description: 'Limpia todos los estados negativos de un aliado + cura 10 HP. Aren gana +2 Vigor.',
  characterId: 'aren',
};

const arenAuraVigorPlus: SkillData = {
  id: 'aren_aura_vigor_plus',
  name: 'Aura de Vigor+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 4,
  target: SkillTarget.ALL_ALLIES,
  effects: [
    { type: 'gain_resource', amount: 2 },
  ],
  description: 'Da +2 Vigor a todos los aliados.',
  characterId: 'aren',
};

export const arenSkills: SkillData[] = [
  {
    id: 'aren_basic',
    name: 'Bendición',
    type: SkillType.ACTIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 3, scalingStat: 'power', scalingMultiplier: 1.0 },
    ],
    description: '3 daño mágico. No genera Vigor (Voto de Silencio).',
    characterId: 'aren',
  },
  {
    id: 'aren_mano_luz',
    name: 'Mano de Luz',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 2,
    target: SkillTarget.SINGLE_ALLY,
    effects: [
      { type: 'heal', amount: 12 },
      { type: 'gain_resource', amount: 2 },
    ],
    description: 'Cura 12 HP a un aliado. Aren gana +2 Vigor (Voto de Silencio).',
    characterId: 'aren',
    improvedVersion: arenManoLuzPlus,
  },
  {
    id: 'aren_purgar',
    name: 'Purgar',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 2,
    target: SkillTarget.SINGLE_ALLY,
    effects: [
      { type: 'purge_negative' },
      { type: 'heal', amount: 6 },
      { type: 'gain_resource', amount: 2 },
    ],
    description: 'Limpia todos los estados negativos de un aliado + cura 6 HP. Aren gana +2 Vigor.',
    characterId: 'aren',
    improvedVersion: arenPurgarPlus,
  },
  {
    id: 'aren_aura_vigor',
    name: 'Aura de Vigor',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 3,
    target: SkillTarget.ALL_ALLIES,
    effects: [
      { type: 'gain_resource', amount: 1 },
    ],
    description: 'Da +1 Vigor a todos los aliados.',
    characterId: 'aren',
    improvedVersion: arenAuraVigorPlus,
  },
  {
    id: 'aren_ult_coro',
    name: 'Coro Hueco',
    type: SkillType.ULTIMATE,
    costType: ResourceCost.VIGOR,
    costAmount: 10,
    target: SkillTarget.ALL_ALLIES,
    effects: [
      { type: 'heal', amount: 25 },
      { type: 'apply_status', statusId: StatusEffectId.INSPIRED, stacks: 1 },
    ],
    description: 'Cura 25 HP a toda la party. Aplica Inspirado a todos: próxima habilidad cuesta 0 Vigor.',
    characterId: 'aren',
  },
  {
    id: 'aren_native_voto',
    name: 'Voto de Silencio',
    type: SkillType.NATIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Aren no genera Vigor con su ataque básico, pero gana +2 Vigor cada vez que cura a un aliado.',
    characterId: 'aren',
  },
  {
    id: 'aren_passive_susurro',
    name: 'Susurro Final',
    type: SkillType.PASSIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Si un aliado cae en combate, Aren lo revive a 1 HP una vez por combate.',
    characterId: 'aren',
  },
];
