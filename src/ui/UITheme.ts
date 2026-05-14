// ← CAMBIAR ESTAS DOS LÍNEAS para cambiar el tema visual completo
const ACCENT_HEX = '#e8b840'
const ACCENT_NUM = 0xe8b840

export const THEME = {
  // Acento (intercambiable con las dos constantes de arriba)
  accent:        ACCENT_NUM,
  accentHex:     ACCENT_HEX,
  accentDim:     0xa07830,
  accentDimHex:  '#a07830',
  accentDeep:    0x604818,
  accentDeepHex: '#604818',

  // Fondos
  bgDeep:    0x0c1428,
  bgDeepHex: '#0c1428',
  bgPanel:   0x101c38,
  bgPanelHex:'#101c38',

  // Texto
  textPrimary:    '#e8dfc8',
  textPrimaryNum: 0xe8dfc8,
  textDim:        '#8a7850',
  textDimNum:     0x8a7850,
  textAccent:     ACCENT_HEX,

  // Colores de juego — NO cambian con el tema
  hpGreen:  0x3cb371,
  hpLow:    0xd94f2e,
  vigor:    0x4a90d9,
  vigorHex: '#4a90d9',
  mana:     0x9b59b6,
  manaHex:  '#9b59b6',

  // Tipografía
  fonts: {
    title: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '54px',
      color: ACCENT_HEX,
      letterSpacing: 6,
    },
    heading: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '36px',
      color: ACCENT_HEX,
      letterSpacing: 4,
    },
    label: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '20px',
      color: '#8a7850',
      letterSpacing: 3,
    },
    button: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '22px',
      color: ACCENT_HEX,
      letterSpacing: 2,
    },
    hud: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      color: '#e8dfc8',
      letterSpacing: 1,
    },
    hudSmall: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '15px',
      color: '#e8dfc8',
      letterSpacing: 1,
    },
    body: {
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      fontSize: '20px',
      color: '#e8dfc8',
    },
    dialogue: {
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      fontSize: '22px',
      color: '#e8dfc8',
      fontStyle: 'italic',
    },
  },
} as const
