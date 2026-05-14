// ← CAMBIAR ESTAS DOS LÍNEAS para cambiar el tema visual completo
const ACCENT_HEX = '#9b8fff'
const ACCENT_NUM = 0x9b8fff

export const THEME = {
  // Acento (intercambiable con las dos constantes de arriba)
  accent:        ACCENT_NUM,
  accentHex:     ACCENT_HEX,
  accentDim:     0x6040c0,
  accentDimHex:  '#6040c0',
  accentDeep:    0x3020a0,
  accentDeepHex: '#3020a0',

  // Fondos
  bgDeep:    0x08080f,
  bgDeepHex: '#08080f',
  bgPanel:   0x0d0b18,
  bgPanelHex:'#0d0b18',

  // Texto
  textPrimary:    '#c0b0e0',
  textPrimaryNum: 0xc0b0e0,
  textDim:        '#5040a0',
  textDimNum:     0x5040a0,
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
      fontSize: '32px',
      color: ACCENT_HEX,
      letterSpacing: 4,
    },
    label: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      color: '#5040a0',
      letterSpacing: 3,
    },
    button: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '20px',
      color: ACCENT_HEX,
      letterSpacing: 2,
    },
    hud: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '16px',
      color: '#c0b0e0',
      letterSpacing: 1,
    },
    hudSmall: {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      color: '#c0b0e0',
      letterSpacing: 1,
    },
    body: {
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      fontSize: '20px',
      color: '#c0b0e0',
    },
    dialogue: {
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      fontSize: '22px',
      color: '#c0b0e0',
      fontStyle: 'italic',
    },
  },
} as const
