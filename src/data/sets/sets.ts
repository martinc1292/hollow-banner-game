import type { SetData } from '@/types';

export const sets: SetData[] = [
  {
    id: 'hierro_negro',
    name: 'Hierro Negro',
    description: 'Armas y placas marcadas por la forja oscura de los caminos bajos.',
    flavorText: 'El hierro no brilla: recuerda.',
    itemIds: ['espada_roida', 'cota_hierro_negro'],
    bonuses: [
      {
        piecesRequired: 2,
        effects: [
          { type: 'stat_modifier', stat: 'attack', amount: 2, description: '+2 Ataque' },
        ],
        description: '+2 Ataque adicional.',
      },
    ],
  },
  {
    id: 'velo_cazador',
    name: 'Velo del Cazador',
    description: 'Piezas ligeras para atacar desde el borde del humo.',
    flavorText: 'Donde el golpe falla, el cazador ya no esta.',
    itemIds: ['capa_velo', 'diente_lobo'],
    bonuses: [
      {
        piecesRequired: 2,
        effects: [
          { type: 'stat_modifier', stat: 'crit', amount: 5, description: '+5% Critico' },
        ],
        description: '+5% Critico adicional.',
      },
    ],
  },
  {
    id: 'voto_hueco',
    name: 'Voto Hueco',
    description: 'Juramentos rotos que todavia empujan a la party al inicio del combate.',
    flavorText: 'Un estandarte, un amuleto, una promesa sin nadie que la absuelva.',
    itemIds: ['amuleto_voto', 'estandarte_roto'],
    bonuses: [
      {
        piecesRequired: 2,
        effects: [
          { type: 'on_combat_start', amount: 1, description: '+1 Vigor inicial extra.' },
        ],
        description: '+1 Vigor inicial extra.',
      },
    ],
  },
  {
    id: 'hierro_negro_avanzado',
    name: 'Hierro Negro Avanzado',
    description: 'Forja pesada reservada para combatientes con fuerza probada.',
    itemIds: ['hoja_caido'],
    bonuses: [],
  },
  {
    id: 'voto_hueco_avanzado',
    name: 'Voto Hueco Avanzado',
    description: 'Defensas rituales para quienes sostienen la linea.',
    itemIds: ['yelmo_voto'],
    bonuses: [],
  },
  {
    id: 'cenizas_orden',
    name: 'Cenizas de la Orden',
    description: 'Focos magicos para canalizar fuego ritual.',
    itemIds: ['vara_cenizas'],
    bonuses: [],
  },
];
