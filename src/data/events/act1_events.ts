import {
  ItemCategory,
  Rarity,
  StatusEffectId,
  type EventData,
} from '@/types';

export const act1Events: EventData[] = [
  {
    id: 'caravana_abandonada',
    title: 'Caravana abandonada',
    description:
      'Ruedas partidas bloquean el barro. Entre lonas secas hay cajas cerradas y marcas recientes de botas.',
    options: [
      {
        id: 'search',
        text: 'Revisar la carga',
        resultText: 'La caravana decide su precio.',
        outcomes: [
          {
            weight: 1,
            resultText: 'Una cuerda tensa se corta: los bandidos salen de los arboles.',
            effects: [
              { type: 'trigger_combat', encounterId: 'act1_normal_bandit_pair' },
            ],
          },
          {
            weight: 1,
            resultText: 'Solo queda polvo, pero bajo una manta aparecen 30g y un consumible.',
            effects: [
              { type: 'gain_gold', amount: 30 },
              { type: 'gain_item', category: ItemCategory.CONSUMABLE, rarity: Rarity.COMMON },
            ],
          },
        ],
      },
      {
        id: 'leave',
        text: 'Irse',
        resultText: 'La ruta sigue sin deuda.',
        effects: [],
      },
    ],
  },
  {
    id: 'cruce_rios',
    title: 'Cruce de rios',
    description:
      'El agua arrastra ceniza fria. Hay un vado peligroso, un rodeo largo y una barca con un hombre que no mira a los ojos.',
    options: [
      {
        id: 'ford',
        text: 'Vadear',
        resultText: 'El rio muerde tobillos y orgullo. La party pierde 5 HP.',
        effects: [
          { type: 'damage_party', amount: 5 },
        ],
      },
      {
        id: 'detour',
        text: 'Bordear',
        resultText: 'El rodeo consume el dia. Un nodo no-combate cercano se pierde si hay ruta alternativa.',
        effects: [
          { type: 'skip_next_free_node' },
        ],
      },
      {
        id: 'ferryman',
        text: 'Pagar al barquero',
        resultText: 'El barquero cobra 30g y los deja del otro lado sin una palabra.',
        requirements: [
          { type: 'gold', amount: 30 },
        ],
        effects: [
          { type: 'lose_gold', amount: 30 },
        ],
      },
    ],
  },
  {
    id: 'peregrino_moribundo',
    title: 'Peregrino moribundo',
    description:
      'Un peregrino respira contra una piedra. Pide que alguien escuche su ultima confesion.',
    options: [
      {
        id: 'listen',
        text: 'Escuchar',
        resultText: 'La historia se apaga, pero deja una reliquia en manos temblorosas.',
        effects: [
          { type: 'gain_item', rarity: Rarity.COMMON, relicOnly: true },
        ],
      },
      {
        id: 'hurry',
        text: 'Apurar el final',
        resultText: 'Obtienen 20g. El silencio pesa: toda la party queda Debilitada para el proximo combate.',
        effects: [
          { type: 'gain_gold', amount: 20 },
          {
            type: 'gain_status_party',
            statusId: StatusEffectId.WEAKENED,
            stacks: 1,
            duration: 2,
          },
        ],
      },
      {
        id: 'ignore',
        text: 'Ignorar',
        resultText: 'Nadie mira atras.',
        effects: [],
      },
    ],
  },
  {
    id: 'confesionario',
    title: 'Confesionario',
    description:
      'Una capilla hundida conserva un confesionario intacto. Bram reconoce el hierro de sus bisagras.',
    options: [
      {
        id: 'confess',
        text: 'Confesar',
        resultText: 'Bram deja algo de si ahi dentro: -15 HP max, +1 Defensa.',
        requirements: [
          { type: 'character', characterId: 'bram' },
        ],
        effects: [
          { type: 'modify_character_stat', characterId: 'bram', stat: 'hpMax', amount: -15 },
          { type: 'modify_character_stat', characterId: 'bram', stat: 'defense', amount: 1 },
        ],
      },
      {
        id: 'leave',
        text: 'Irse',
        resultText: 'La puerta se cierra sola cuando se alejan.',
        effects: [],
      },
    ],
  },
  {
    id: 'estatua_hueca',
    title: 'Estatua hueca',
    description:
      'La estatua no tiene rostro. Donde deberia haber ojos, hay dos huecos pulidos por dedos viejos.',
    options: [
      {
        id: 'touch',
        text: 'Tocar',
        resultText: 'La piedra decide.',
        outcomes: [
          {
            weight: 1,
            resultText: 'La estatua concede una mejora: +1 stat random a un personaje.',
            effects: [
              {
                type: 'modify_random_character_stat',
                amount: 1,
                stats: ['attack', 'power', 'defense'],
              },
            ],
          },
          {
            weight: 1,
            resultText: 'La estatua cobra su parte: -1 stat random a un personaje.',
            effects: [
              {
                type: 'modify_random_character_stat',
                amount: -1,
                stats: ['attack', 'power', 'defense'],
              },
            ],
          },
        ],
      },
      {
        id: 'break',
        text: 'Romper',
        resultText: 'La estatua se abre como cascara. Hay una reliquia, y sangre en todas las manos.',
        effects: [
          { type: 'gain_item', rarity: Rarity.UNCOMMON, relicOnly: true },
          {
            type: 'gain_status_party',
            statusId: StatusEffectId.BLEED,
            stacks: 5,
            duration: 3,
          },
        ],
      },
    ],
  },
];
