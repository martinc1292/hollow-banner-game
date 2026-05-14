# Hollow Banner

Roguelite táctico por turnos. MVP jugable del Acto 1 en browser.

**Stack:** Phaser 3 + TypeScript + Vite

## Estado actual

- Flujo jugable: menú → selección de party → mapa ramificado → combate → recompensas → nodos no-combate → mini-jefe → jefe → cierre de demo.
- Sistemas implementados: party de 4, combate por turnos, intenciones enemigas, estados, recompensas, inventario/equipo, tienda, campamento, tesoro, eventos, guardado local y pantalla de demo completa.
- El Acto 2 todavía no está en desarrollo; la prioridad actual es estabilizar y balancear el Acto 1.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173` en el browser.

## Build

```bash
npm run build
```

El output queda en `dist/`.

Phaser queda incluido en el bundle principal durante el MVP, por lo que Vite puede avisar que el chunk supera 500 kB. Es un warning conocido; se revisará code-splitting si impacta la carga real.

## Tests

```bash
npm test
```

La suite cubre lógica pura de mapa, daño, estados, progresión, guardado, audio y recompensas especiales.

## Prueba manual sugerida

1. Iniciar una nueva run.
2. Elegir 4 personajes.
3. Completar un combate normal y tomar una recompensa.
4. Visitar tienda, campamento, tesoro y evento si aparecen en la ruta.
5. Derrotar al Pregonero y luego al Padre Oxidado.
6. Confirmar que se llega a la pantalla de demo completa.

## Preview del build

```bash
npm run preview
```
