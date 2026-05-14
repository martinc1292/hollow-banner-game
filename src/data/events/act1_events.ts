import {
  ItemCategory,
  Rarity,
  StatusEffectId,
  type EventData,
} from '@/types';

export const act1Events: EventData[] = [
  // ── SANTUARIO DEL ESTANDARTE ──────────────────────────────────────────────
  {
    id: 'santuario_del_estandarte',
    title: 'Santuario del Estandarte',
    description:
      'Un paño sin viento cuelga sobre piedra negra. La tela reconoce la sangre de la compañía y ofrece una gracia con deuda.',
    options: [
      {
        id: 'blessing',
        text: 'Aceptar la bendición',
        resultText:
          'El estandarte pesa menos durante un instante. La party sana y encuentra una reliquia entre cenizas apagadas.',
        effects: [
          { type: 'heal_party', percent: 0.2 },
          { type: 'gain_item', rarity: Rarity.RARE, relicOnly: true },
        ],
      },
      {
        id: 'curse',
        text: 'Tomar la deuda',
        resultText:
          'La tela se enrolla sobre una reliquia maldita. El camino concede poder, pero deja una marca abierta.',
        effects: [
          { type: 'gain_item', rarity: Rarity.CURSED, relicOnly: true, includeCursed: true },
          {
            type: 'gain_status_party',
            statusId: StatusEffectId.VULNERABLE,
            stacks: 1,
            duration: 2,
          },
        ],
      },
    ],
  },

  // ── CARAVANA ABANDONADA ────────────────────────────────────────────────────
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

  // ── CRUCE DE RIOS ──────────────────────────────────────────────────────────
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

  // ── PEREGRINO MORIBUNDO ────────────────────────────────────────────────────
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
        resultText: 'Obtienen 20g. El silencio pesa: toda la party queda Debilitada para el próximo combate.',
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

  // ── CONFESIONARIO ─────────────────────────────────────────────────────────
  {
    id: 'confesionario',
    title: 'Confesionario',
    description:
      'Una capilla hundida conserva un confesionario intacto. Bram reconoce el hierro de sus bisagras. La madera tiembla como si llevara anos esperando.',
    options: [
      {
        id: 'confess',
        text: 'Confesarse por completo',
        resultText: 'Bram deja algo de si ahi dentro para siempre. La caja devuelve lo que no puede guardarse: una reliquia epica.',
        requirements: [
          { type: 'character', characterId: 'bram' },
        ],
        effects: [
          { type: 'modify_character_stat', characterId: 'bram', stat: 'hpMax', amount: -20 },
          { type: 'gain_item', rarity: Rarity.EPIC, relicOnly: true },
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

  // ── ESTATUA HUECA ─────────────────────────────────────────────────────────
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

  // ── EL FORJADOR HUECO ─────────────────────────────────────────────────────
  {
    id: 'forjador_hueco',
    title: 'El Forjador Hueco',
    description:
      'Un hombre sin ojos trabaja el metal junto a una fragua de carbon negro. Su martillo nunca yerra. No habla, pero senala su trabajo.',
    options: [
      {
        id: 'pay_gold',
        text: 'Pagar con oro (50g)',
        resultText: 'El forjador toma las monedas sin contarlas y devuelve equipamiento bien forjado.',
        requirements: [
          { type: 'gold', amount: 50 },
        ],
        effects: [
          { type: 'lose_gold', amount: 50 },
          { type: 'gain_item', category: ItemCategory.EQUIPMENT, rarity: Rarity.RARE },
        ],
      },
      {
        id: 'pay_blood',
        text: 'Pagar con sangre',
        resultText: 'El forjador toma la mano sin pedir permiso. La party pierde 18 HP. El trabajo queda hecho.',
        effects: [
          { type: 'damage_party', amount: 18 },
          { type: 'gain_item', category: ItemCategory.EQUIPMENT, rarity: Rarity.UNCOMMON },
        ],
      },
      {
        id: 'leave',
        text: 'Irse',
        resultText: 'La fragua sigue ardiendo cuando se alejan.',
        effects: [],
      },
    ],
  },

  // ── EL POZO DE LOS NOMBRES ────────────────────────────────────────────────
  {
    id: 'pozo_nombres',
    title: 'El Pozo de los Nombres',
    description:
      'Las paredes del pozo estan cubiertas de nombres tallados. El agua no refleja nada. Una voz sin cuerpo pregunta que ofrecen.',
    options: [
      {
        id: 'offer_gold',
        text: 'Arrojar oro (60g)',
        resultText: 'El oro cae sin sonido. Un nombre brilla en la pared: alguien de la party gana +2 a una estadistica.',
        requirements: [
          { type: 'gold', amount: 60 },
        ],
        effects: [
          { type: 'lose_gold', amount: 60 },
          {
            type: 'modify_random_character_stat',
            amount: 2,
            stats: ['attack', 'power', 'defense', 'speed'],
          },
        ],
      },
      {
        id: 'offer_blood',
        text: 'Derramar sangre',
        resultText: 'El pozo bebe. La party pierde 20 HP, pero todos sienten el nombre escrito en los huesos: +1 Ataque a la party.',
        effects: [
          { type: 'damage_party', amount: 20 },
          { type: 'modify_party_stat', stat: 'attack', amount: 1 },
        ],
      },
      {
        id: 'leave',
        text: 'No arrojar nada',
        resultText: 'El pozo espera. Siempre espera.',
        effects: [],
      },
    ],
  },

  // ── EL NINO EN LA NIEBLA ──────────────────────────────────────────────────
  {
    id: 'nino_niebla',
    title: 'El Nino en la Niebla',
    description:
      'Una figura pequena espera al borde del camino. No tiene cara, pero llora. La niebla a su alrededor no se mueve.',
    options: [
      {
        id: 'approach',
        text: 'Acercarse',
        resultText: 'La niebla decide.',
        outcomes: [
          {
            weight: 1,
            resultText: 'La figura sonrie y deja caer una reliquia. La party siente calor por primera vez en dias.',
            effects: [
              { type: 'heal_party', amount: 15 },
              { type: 'gain_item', rarity: Rarity.UNCOMMON, relicOnly: true },
            ],
          },
          {
            weight: 1,
            resultText: 'La figura explota en niebla negra. La party recibe 12 dano y queda Debilitada.',
            effects: [
              { type: 'damage_party', amount: 12 },
              {
                type: 'gain_status_party',
                statusId: StatusEffectId.WEAKENED,
                stacks: 2,
                duration: 3,
              },
            ],
          },
        ],
      },
      {
        id: 'ignore',
        text: 'Ignorar',
        resultText: 'Los sollozos se apagan con la distancia.',
        effects: [],
      },
    ],
  },

  // ── EL ESPEJO HUECO ───────────────────────────────────────────────────────
  {
    id: 'espejo_hueco',
    title: 'El Espejo Hueco',
    description:
      'Un espejo sin marco yace apoyado contra un arbol muerto. La imagen devuelta es la correcta, pero los ojos son de otro.',
    options: [
      {
        id: 'accept_curse',
        text: 'Tocar el cristal',
        resultText: 'La mano atraviesa el reflejo. Algo se adhiere a los dedos que no se va: una reliquia maldita.',
        effects: [
          { type: 'gain_item', relicOnly: true, rarity: Rarity.CURSED, includeCursed: true },
        ],
      },
      {
        id: 'break',
        text: 'Romperlo',
        resultText: 'El espejo decide su precio.',
        outcomes: [
          {
            weight: 1,
            resultText: 'Entre los fragmentos hay una reliquia que nadie se explica.',
            effects: [
              { type: 'gain_item', rarity: Rarity.RARE, relicOnly: true },
            ],
          },
          {
            weight: 1,
            resultText: 'Los fragmentos cortan. La party pierde 15 HP y queda Sangrando.',
            effects: [
              { type: 'damage_party', amount: 15 },
              {
                type: 'gain_status_party',
                statusId: StatusEffectId.BLEED,
                stacks: 3,
                duration: 3,
              },
            ],
          },
        ],
      },
      {
        id: 'leave',
        text: 'No mirar',
        resultText: 'Se alejan sintiendo los ojos del espejo en la nuca.',
        effects: [],
      },
    ],
  },

  // ── LA MESA DE LOS CAIDOS ─────────────────────────────────────────────────
  {
    id: 'mesa_caidos',
    title: 'La Mesa de los Caidos',
    description:
      'Una mesa larga en mitad de un claro. Sillas volcadas, pero la comida sigue caliente. Los platos estan puestos para exactamente el numero de personas que llegan.',
    options: [
      {
        id: 'sit_and_eat',
        text: 'Sentarse y comer',
        resultText: 'La comida no tiene nombre pero nutre algo mas que el cuerpo. Toda la party gana +5 HP max.',
        effects: [
          { type: 'modify_party_stat', stat: 'hpMax', amount: 5 },
        ],
      },
      {
        id: 'take_weapon',
        text: 'Tomar el arma del caido',
        resultText: 'Hay una espada bajo la silla principal. Pesa demasiado: toda la party pierde 1 Ataque, pero el arma vale algo.',
        effects: [
          { type: 'modify_party_stat', stat: 'attack', amount: -1 },
          { type: 'gain_item', category: ItemCategory.EQUIPMENT, rarity: Rarity.RARE },
        ],
      },
      {
        id: 'leave',
        text: 'No sentarse',
        resultText: 'La comida sigue caliente cuando se alejan.',
        effects: [],
      },
    ],
  },

  // ── EL PACTO DEL TRONO ────────────────────────────────────────────────────
  {
    id: 'pacto_trono',
    title: 'El Pacto del Trono',
    description:
      'Una piedra tallada con un trono vacio. Quien pone la mano sobre ella escucha una voz que ofrece poder. El precio es una marca que no se borra.',
    options: [
      {
        id: 'accept',
        text: 'Aceptar el pacto',
        resultText: 'La marca arde en todas las manos. Toda la party gana +2 Ataque y +2 Poder, pero queda Debilitada al inicio del próximo combate.',
        effects: [
          { type: 'modify_party_stat', stat: 'attack', amount: 2 },
          { type: 'modify_party_stat', stat: 'power', amount: 2 },
          {
            type: 'gain_status_party',
            statusId: StatusEffectId.WEAKENED,
            stacks: 1,
            duration: 1,
          },
        ],
      },
      {
        id: 'refuse',
        text: 'Rechazar',
        resultText: 'La voz no insiste. El trono sigue esperando.',
        effects: [],
      },
    ],
  },
];
