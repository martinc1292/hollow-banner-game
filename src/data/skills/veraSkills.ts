import {
  ResourceCost,
  SkillData,
  SkillTarget,
  SkillType,
  StatusEffectId,
} from '@/types';

const veraTajoDoblePlus: SkillData = {
  id: 'vera_tajo_doble_plus',
  name: 'Tajo Doble+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 2,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'apply_status', statusId: StatusEffectId.BLEED, stacks: 2 },
  ],
  description: '2 golpes de 6 dano cada uno. Aplica 2 stacks de Sangrado.',
  characterId: 'vera',
};

const veraCorteProfundoPlus: SkillData = {
  id: 'vera_corte_profundo_plus',
  name: 'Corte Profundo+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 3,
  target: SkillTarget.SINGLE_ENEMY,
  effects: [
    { type: 'damage', amount: 12, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'apply_status', statusId: StatusEffectId.BLEED, stacks: 4 },
  ],
  description: '12 dano + 4 stacks de Sangrado.',
  characterId: 'vera',
};

const veraDanzaAceroPlus: SkillData = {
  id: 'vera_danza_acero_plus',
  name: 'Danza de Acero+',
  type: SkillType.ACTIVE,
  costType: ResourceCost.VIGOR,
  costAmount: 4,
  target: SkillTarget.RANDOM_ENEMIES,
  effects: [
    { type: 'damage', amount: 7, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'damage', amount: 7, scalingStat: 'attack', scalingMultiplier: 1.0 },
    { type: 'damage', amount: 7, scalingStat: 'attack', scalingMultiplier: 1.0 },
  ],
  description: 'Golpea a 3 enemigos al azar por 7 dano cada uno.',
  characterId: 'vera',
};

export const veraSkills: SkillData[] = [
  {
    id: 'vera_basic',
    name: 'Tajo',
    type: SkillType.ACTIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 7, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'gain_resource', amount: 1 },
    ],
    description: '7 daño físico. Genera +1 Vigor.',
    characterId: 'vera',
  },
  {
    id: 'vera_tajo_doble',
    name: 'Tajo Doble',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 2,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 5, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'damage', amount: 5, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.BLEED, stacks: 1 },
    ],
    description: '2 golpes de 5 daño cada uno. Aplica 1 stack de Sangrado.',
    characterId: 'vera',
    improvedVersion: veraTajoDoblePlus,
  },
  {
    id: 'vera_corte_profundo',
    name: 'Corte Profundo',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 3,
    target: SkillTarget.SINGLE_ENEMY,
    effects: [
      { type: 'damage', amount: 10, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'apply_status', statusId: StatusEffectId.BLEED, stacks: 3 },
    ],
    description: '10 daño + 3 stacks de Sangrado.',
    characterId: 'vera',
    improvedVersion: veraCorteProfundoPlus,
  },
  {
    id: 'vera_danza_acero',
    name: 'Danza de Acero',
    type: SkillType.ACTIVE,
    costType: ResourceCost.VIGOR,
    costAmount: 4,
    target: SkillTarget.RANDOM_ENEMIES,
    effects: [
      { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
      { type: 'damage', amount: 6, scalingStat: 'attack', scalingMultiplier: 1.0 },
    ],
    description: 'Golpea a 3 enemigos al azar por 6 daño cada uno.',
    characterId: 'vera',
    improvedVersion: veraDanzaAceroPlus,
  },
  {
    id: 'vera_ult_carniceria',
    name: 'Carnicería',
    type: SkillType.ULTIMATE,
    costType: ResourceCost.VIGOR,
    costAmount: 10,
    target: SkillTarget.ALL_ENEMIES,
    effects: [
      { type: 'damage', amount: 15, scalingStat: 'attack', scalingMultiplier: 1.0 },
    ],
    description: 'Golpea a todos los enemigos con Sangrado por 15 daño.',
    characterId: 'vera',
  },
  {
    id: 'vera_native_sed',
    name: 'Sed de Hierro',
    type: SkillType.NATIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description:
      'Si Vera mata un enemigo, gana +2 Vigor y actúa otra vez en ese round (una vez por combate).',
    characterId: 'vera',
  },
  {
    id: 'vera_passive_frenesi',
    name: 'Frenesí',
    type: SkillType.PASSIVE,
    costType: null,
    costAmount: 0,
    target: SkillTarget.SELF,
    effects: [],
    description: 'Por cada enemigo con Sangrado, +10% daño de Vera.',
    characterId: 'vera',
  },
];
