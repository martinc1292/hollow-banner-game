import { THEME } from './UITheme'

/**
 * Dibuja esquinas de acento en las 4 puntas de un rect (estilo Vacío Astral).
 * No dibuja fondo — solo las esquinas.
 */
export function drawCornerBox(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  size = 14,
  color: number = THEME.accent,
  alpha = 1
): void {
  graphics.lineStyle(1, color, alpha)

  // Esquina superior izquierda
  graphics.beginPath()
  graphics.moveTo(x, y + size)
  graphics.lineTo(x, y)
  graphics.lineTo(x + size, y)
  graphics.strokePath()

  // Esquina superior derecha
  graphics.beginPath()
  graphics.moveTo(x + w - size, y)
  graphics.lineTo(x + w, y)
  graphics.lineTo(x + w, y + size)
  graphics.strokePath()

  // Esquina inferior derecha
  graphics.beginPath()
  graphics.moveTo(x + w, y + h - size)
  graphics.lineTo(x + w, y + h)
  graphics.lineTo(x + w - size, y + h)
  graphics.strokePath()

  // Esquina inferior izquierda
  graphics.beginPath()
  graphics.moveTo(x + size, y + h)
  graphics.lineTo(x, y + h)
  graphics.lineTo(x, y + h - size)
  graphics.strokePath()
}

/**
 * Dibuja una línea horizontal con degradado: transparente → acento → transparente.
 * Retorna el Graphics creado para que la escena pueda destruirlo si lo necesita.
 */
export function drawSeparator(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  color: number = THEME.accent,
  alpha = 0.6
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  const steps = 40
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const a = Math.sin(t * Math.PI) * alpha
    g.lineStyle(1, color, a)
    const px = x + (w * i) / steps
    g.beginPath()
    g.moveTo(px, y)
    g.lineTo(px + w / steps, y)
    g.strokePath()
  }
  return g
}

/**
 * Dibuja un rombo pequeño brillante para indicar elemento activo/seleccionado.
 */
export function drawActiveDot(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size = 5,
  color: number = THEME.accent,
  alpha = 1
): void {
  graphics.fillStyle(color, alpha)
  graphics.fillPoints([
    { x, y: y - size },
    { x: x + size, y },
    { x, y: y + size },
    { x: x - size, y },
  ], true)
}

/**
 * Agrega una viñeta radial oscura sobre toda la escena para dar profundidad.
 * Se dibuja sobre el fondo, debajo de los elementos de UI.
 */
export function addVignette(
  scene: Phaser.Scene,
  width = 1280,
  height = 720,
  depth = -1
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  g.setDepth(depth)

  const cx = width / 2
  const cy = height / 2
  const radius = Math.max(width, height) * 0.75

  // Capas concéntricas de fuera hacia adentro, oscuras en el borde
  const layers = 8
  for (let i = 0; i < layers; i++) {
    const t = 1 - i / layers
    const r = radius * t
    const a = (1 - t) * 0.55
    g.fillStyle(0x000000, a)
    g.fillCircle(cx, cy, r)
  }

  return g
}

/**
 * Dibuja el fondo base de escena (#0c1428).
 */
export function drawSceneBackground(
  scene: Phaser.Scene,
  width = 1280,
  height = 720,
  depth = -10
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  g.setDepth(depth)
  g.fillStyle(THEME.bgDeep, 1)
  g.fillRect(0, 0, width, height)
  return g
}
