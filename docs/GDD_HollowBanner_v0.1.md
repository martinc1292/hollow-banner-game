# GDD — Hollow Banner (título tentativo)

**Versión:** 0.1 — Borrador inicial
**Autor:** Martín
**Asistencia de diseño:** Claude (rol de Game/Systems/Technical Designer)
**Estado:** Documento de trabajo. Ver al final “Decisiones que necesito que Martín defina”.

---

## 1. Resumen ejecutivo

| Campo | Valor |
|---|---|
| Título tentativo | **Hollow Banner** (alt: *Of Ash and Iron*, *The Pale March*) |
| Género | Roguelite táctico por turnos, party-based |
| Plataformas objetivo | PC (Steam) como prioridad. Web (HTML5) como objetivo secundario tras MVP |
| Motor | Godot 4.x |
| Duración estimada de una run | 60–90 min (objetivo de diseño; ver §3) |
| Tipo de jugador objetivo | Fans de StS, Darkest Dungeon, For the King, Into the Breach. Disfruta runs cortas, builds, lectura táctica del enemigo |
| Modelo | Single-player, offline |

**Elevator pitch:**
*Hollow Banner* es un roguelite táctico por turnos donde una compañía de cuatro caídos cruza un reino consumido por una corrupción silenciosa. Sin cartas: cada personaje gana **Vigor** (y mana dependiendo la clase) combatiendo y lo gasta en habilidades propias. Avanzás por un mapa ramificado de actos, elegís recompensas, formás sinergias entre personajes y enfrentás jefes que obligan a romper tu rutina táctica.

**Fantasía principal del jugador:**
Comandar una pequeña compañía marcada por la derrota, leer al enemigo, decidir cuándo gastar recursos, y llegar al jefe del acto con una build que vos armaste a partir de decisiones reales — no de RNG puro.

**Pilares de diseño:**
1. **Lectura táctica primero, RNG segundo.** El jugador siempre debe poder leer la intención del enemigo y planear el turno.
2. **Identidad por personaje.** Cada personaje tiene caracteristicas y habilidades nativas.
3. **Decisiones que duelen.** Cada nodo, recompensa y evento descarta otra cosa. No hay free lunch.
4. **Combate denso y corto.** Ningún combate común debería pasar de 5 turnos del jugador. Pero dependera de la build del equipo

---

## 2. Concepto del juego

**Premisa general:**
El reino de Velmar fue arrasado por una plaga llamada *La Hueca*: una corrupción que vacía a personas, bestias y dioses dejando cuerpos vivos pero sin alma. Una compañía de cuatro condenados — los únicos que recuerdan quiénes eran antes de ser tocados por La Hueca — marcha hacia el corazón del reino para encontrar la causa.

**Tono:**
Serio, épico oscuro. Sin guiños cómicos. Texto contenido, evocativo, no expositivo. Inspiración tonal: Berserk, Bloodborne, Darkest Dungeon, Souls.

**Mundo:**
Reino post-caída. Aldeas vacías, catedrales tomadas por cultos, bosques con árboles vivos pero sin sonido. La narrativa NO se cuenta con cinemáticas; se cuenta con descripciones cortas de eventos, nombres de enemigos y descripciones de ítems.

**Conflicto principal:**
La compañía debe llegar al **Trono Hueco**, fuente de la corrupción. Cada acto los acerca y los marca más.

**Objetivo del jugador:**
Completar una run llegando al jefe final del acto 3 con la party viva (al menos un personaje en pie).

**Diferenciadores frente a referencias:**

| Toma de | Qué toma | Qué NO copia |
|---      |---       |---          |
| Slay the Spire | Mapa ramificado, intención enemiga visible, recompensas tras combate, reliquias pasivas, decisiones de ruta | Cartas, mazo, sistema de descarte, energía global por turno |
| Pokémon GBA | Combate por turnos lateral, claridad visual, orden por velocidad, estados alterados clásicos | Capturar criaturas, equipos de 6, exploración overworld, narrativa pesada |
| For the King | Party de 4, decisiones compartidas, ítems de party | Tablero hexagonal, focus en cooperativo, sistema de slots de habilidad lentos |
| Darkest Dungeon | Tono, identidad de personaje, sensación de “compañía marcada” | Stress system, formación posicional rígida (4 slots fijos con line-of-fire), permadeath estricto |

---

## 3. Core loop

### Loop de combate (un combate)
```
Inicio combate → Ver intención enemiga →
  Para cada personaje (orden por velocidad):
    Elegir acción (atacar, habilidad, objeto, defender) →
    Resolver →
  Resolver turno enemigo →
Hasta victoria o derrota
```

### Loop de progresión (entre nodos)
```
Resolver encuentro → Ganar XP/oro/ítems →
Elegir 1 de 3 recompensas (habilidad/stat/reliquia) →
Volver al mapa → Elegir próximo nodo
```

### Loop de run completa
```
Elegir party (4 de N) → Acto 1 (mapa de ~12-15 nodos) →
Mini-jefe → Jefe Acto 1 → Acto 2 → Mini-jefe → Jefe Acto 2 →
Acto 3 → Jefe final → Pantalla de cierre (o muerte → meta)
```

### Loop meta (entre runs)
```
Run termina (victoria o derrota) →
Ganar “Memoria” (moneda meta) →
Desbloquear personaje / reliquia / evento nuevo →
Nueva run con pool ampliado
```

**Duración objetivo:**
- Combate común: 2–4 min
- Combate élite: 4–6 min
- Combate de jefe: 8–12 min
- Run completa: 60–90 min

---

## 4. Estructura por actos

### Acto 1 — Las Tierras Quebradas
- **Tema visual:** Llanuras grises, ruinas, cielo bajo, paleta marrón/sepia
- **Enemigos típicos:** Bandidos huecos, lobos corruptos, peregrinos vacíos
- **Mecánica nueva que introduce:** Sistema base + estado **Sangrado**
- **Dificultad esperada:** Tutorial implícito; el juego no te explica con cartelitos, te enseña con encuentros
- **Eventos posibles:** Caravana abandonada, cruce de ríos, peregrino moribundo
- **Mini-jefe:** **El Pregonero** — un heraldo hueco que aplica Marcado a la party
- **Jefe principal:** **Padre Oxidado** — caballero caído en armadura corrompida; alterna fases de defensa total y arremetida
- **Recompensa de cierre:** Reliquia rara fija + curación parcial

### Acto 2 — La Catedral Putrefacta
- **Tema visual:** Interiores de iglesia tomada, vitrales rotos, paleta verde-violeta enferma
- **Enemigos típicos:** Cultistas, no-muertos, bestias plagadas, invocadores
- **Mecánica nueva:** Estado **Veneno** se vuelve común + invocadores que generan minions cada N turnos
- **Dificultad esperada:** Sube ~40%. El jugador necesita lidiar con prioridad de objetivos
- **Eventos posibles:** Confesionario (sacrificio por bendición), reliquia maldita, monje que ofrece cura a cambio de oro
- **Mini-jefe:** **La Coral** — bruja que invoca tres Acólitos cada 3 turnos
- **Jefe principal:** **Obispo Hueco** — dos fases: clerical (curación + buffs) y cadáver (DPS bruto)
- **Recompensa de cierre:** Reliquia épica fija + opción de cambiar 1 personaje (ver §17)

### Acto 3 — El Vacío Coronado
- **Tema visual:** Paisaje imposible, geometría rota, paleta negro-blanco con acentos rojos
- **Enemigos típicos:** Demonios menores, fragmentos del Trono, ecos de jefes anteriores
- **Mecánica nueva:** **Corrupción**: estado que se acumula durante todo el acto y debe gestionarse
- **Dificultad esperada:** Pico. Builds rotas mueren acá si no son completas
- **Eventos posibles:** Espejo del primer acto, eco de un personaje no elegido, pacto final
- **Mini-jefe:** **El Eco del Padre** — versión retorcida del jefe del Acto 1
- **Jefe principal:** **El Rey Hueco** — tres fases con cambio total de patrón en cada una
- **Recompensa de cierre:** Pantalla de victoria + meta-progresión

### Acto opcional/secreto (post-MVP)
**Acto 4 — El Sueño Antes del Reino:** desbloqueable tras completar el juego con condiciones específicas (ej.: terminar sin que muera nadie, o llevar una reliquia maldita hasta el final). Jefe oculto: **El Que Soñó el Trono**.

---

## 5. Mapa y avance

**Estructura:** mapa ramificado tipo Slay the Spire. Por acto: 12–15 nodos en grafo dirigido (no se vuelve atrás), 5–6 columnas, ramas de 2–4 caminos por columna, convergencia obligada en mini-jefe y jefe.

### Tipos de nodo

| Tipo | Frecuencia (Acto 1) | Qué ocurre | Recompensa | Riesgo |
|---|---|---|---|---|
| Combate normal | 50% | 2–4 enemigos básicos | Oro + 1 de 3 recompensas (XP/stat/habilidad) | Bajo–Medio |
| Combate élite | 10% | 1 enemigo fuerte o 2 enemigos medios | Reliquia rara + oro | Alto |
| Evento | 15% | Texto + 2–3 opciones | Variable (ítem, oro, debuff, cura) | Variable |
| Tienda | 8% | Comprar ítems/curaciones/quitar reliquia | Ninguna directa | Costo de oro |
| Campamento | 8% | Elegir 1 de: curar 30%, mejorar habilidad, forjar ítem | Sí (no acumulable) | Pierde el nodo |
| Tesoro | 5% | Cofre con reliquia (puede ser maldita) | Reliquia | Trampa: 25% maldición |
| Mini-jefe | 1 fijo (col 4) | Combate fuerte | Reliquia rara + oro grande | Alto |
| Jefe | 1 fijo (col final) | Combate de cierre | Reliquia épica + cierre acto | Run-ending |
| Especial | 3% | Único por acto (ej.: santuario) | Único | Variable |

**Visibilidad:** el jugador ve todos los nodos del acto desde el inicio, sus tipos, pero NO los enemigos exactos hasta entrar.

**Reglas de movimiento:** solo se avanza por aristas existentes, una columna por vez. No se puede volver atrás.

---

## 6. Sistema de combate por turnos

### Vista y formato
- Vista **top-down 2D**
- **Party (4 personajes)** abajo
- **Enemigos (1–4)** arriba
- Sin cuadrícula. Sin posiciones tácticas

### Orden de turnos
Round-based con turnos individuales ordenados por **Velocidad** (descendente). Empates se resuelven a favor del jugador. En cada round, todas las unidades vivas actúan una vez.

### Recurso: 
reveer el uso del vigor y del mana. Lo que yo quiero es que hayan personajes como el mago que si utilize mana ademas del vigor, y que pueda desarrollarlo mas que este ultimo. No como el guerrero que de pasiva comienza sin mana, a menos que agarre un item o suba un stat que le otorgue mana (lo que seria poco optimo para el personaje pero que el jugador tenga la libertad de elegir)

### Acciones disponibles por turno
1. **Ataque básico**
2. **Habilidad** 
3. **Defender** 
4. **Usar objeto** 

ver los costos y los recursos

### Defensa
Daño recibido = `max(1, daño_entrante - Defensa - bonus_defender)`. Ningún ataque hace 0 (mínimo 1).

### Estados alterados
Ver §10. Se aplican como flags con duración en turnos. Un personaje puede tener varios simultáneos.

### Condición de victoria
Todos los enemigos a 0 HP.

### Condición de derrota
Los 4 personajes caídos al final de un round. Si quedan caídos pero hay vivos, los vivos pueden seguir; al ganar el combate, **los caídos se levantan a 30% HP** (regla de revivir post-combate).

> **Importante:** caer en combate ≠ permadeath. Solo si los 4 caen, run-over.

### Intención enemiga
**Visible siempre.** Cada enemigo muestra ícono de intención sobre su sprite (atacar/buffear/aplicar estado/defender). Inspirado en StS y Into the Breach. Decisión de diseño no negociable: refuerza el pilar 1.

### Duración objetivo
- Combate común: 3–5 turnos del jugador
- Élite: 6–8 turnos
- Jefe: 12–18 turnos

### Ejemplo de un turno (combate normal Acto 1)

> Party: Caballero (Velocidad 4), Mercenaria (V 6), Hechicera (V 5), Sacerdotisa (V 5).
> Enemigos: 2 Bandidos Huecos.
>
> **Round 1:**
> - Bandido A muestra intención: atacar Caballero por 6.
> - Bandido B muestra intención: aplicar Sangrado.
> - Mercenaria (V6) actúa primero → Tajo Doble (cuesta 2 Vigor) a Bandido A → 12 daño → Bandido A muere.
> - Hechicera (V5) → ataque básico (Centella) a Bandido B → 5 daño + +1 Vigor.
> - Sacerdotisa (V5) → Defender (anticipa Sangrado).
> - Caballero (V4) → Provocar (1 Vigor) → Bandido B atacará al Caballero el próximo round.
> - Bandido B (V3) → aplica Sangrado al Caballero (Provocar redirige el target).
>
> **Round 2:** Mercenaria remata, fin del combate. Sacerdotisa cura Sangrado del Caballero.

---

## 7. Personajes jugables

5 personajes iniciales. Cubren los 6 roles base con un diseño de overlap deliberado.

### Formato común
- **HP base / Velocidad base / Defensa base**
- **Estadística primaria:** la que escala mejor con sus habilidades
- **Habilidad nativa:** pasiva única que define su identidad
- **Ataque básico, 3 activas, 1 pasiva, 1 definitiva**

---

### 7.1 Bram, el Caballero Caído (Tanque)

| Stat | Base |
|---|---|
| HP | 80 |
| Velocidad | 4 |
| Defensa | 6 |
| Ataque | 4 |
| Poder | 1 |

- **Estadística primaria:** Defensa
- **Fortaleza:** Aguante, control de aggro
- **Debilidad:** Daño bajo, lento
- **Habilidad nativa — *Juramento Hueco*:** Cuando un aliado recibe daño con Bram vivo, Bram gana +1 Vigor. Máx +2 por turno.
- **Ataque básico — *Mandoble*:** 5 daño físico
- **Activa 1 — *Provocar* (1 Vigor):** El próximo ataque enemigo dirigido a un aliado se redirige a Bram. +30% Defensa este turno.
- **Activa 2 — *Escudo de Hierro* (3 Vigor):** Bram gana 15 de **Bloque** (absorbe daño antes que HP). Aplica Protegido a un aliado.
- **Activa 3 — *Embestida* (2 Vigor):** 8 daño + Aturdimiento (1 turno).
- **Pasiva — *Voto Inquebrantable*:** Cuando cae a 25% HP, gana +50% Defensa permanente en este combate.
- **Definitiva — *Estandarte Hueco* (10 Vigor):** Toda la party gana 10 de Bloque y +2 Vigor inmediato.
- **Caminos de evolución:** *Guardián* (más bloque) / *Vengador* (gana ataque al recibir daño)
- **Sinergias:** Sacerdotisa (la cura llena de Vigor a Bram), Hechicera (Bram tanquea mientras casteo)

---

### 7.2 Vera, la Mercenaria del Hierro Negro (Daño físico)

| Stat | Base |
|---|---|
| HP | 60 |
| Velocidad | 6 |
| Defensa | 3 |
| Ataque | 8 |
| Poder | 1 |

- **Estadística primaria:** Ataque
- **Fortaleza:** DPS sostenido, golpes múltiples
- **Debilidad:** Frágil, depende de aplicar Sangrado
- **Habilidad nativa — *Sed de Hierro*:** Si Vera mata un enemigo, gana +2 Vigor y actúa otra vez en ese round (una vez por combate).
- **Ataque básico — *Tajo*:** 7 daño físico
- **Activa 1 — *Tajo Doble* (2 Vigor):** 2 golpes de 5 daño cada uno. Aplica 1 stack de Sangrado.
- **Activa 2 — *Corte Profundo* (3 Vigor):** 10 daño + 3 stacks de Sangrado.
- **Activa 3 — *Danza de Acero* (4 Vigor):** Golpea a 3 enemigos al azar por 6 cada uno.
- **Pasiva — *Frenesí*:** Por cada enemigo con Sangrado, +10% daño de Vera.
- **Definitiva — *Carnicería* (10 Vigor):** Golpea a todos los enemigos sangrantes por 15 daño.
- **Caminos de evolución:** *Carnicera* (Sangrado masivo) / *Asesina* (crítico contra heridos)
- **Sinergias:** Lyra (Marcado + Sangrado se acumulan), Bram (la tanquea mientras busca kills)

---

### 7.3 Mira, la Hechicera de Cenizas (Daño mágico / AoE)

| Stat | Base |
|---|---|
| HP | 50 |
| Velocidad | 5 |
| Defensa | 2 |
| Ataque | 1 |
| Poder | 8 |

- **Estadística primaria:** Poder
- **Fortaleza:** AoE, daño bruto
- **Debilidad:** HP bajo, lenta para arrancar (Vigor inicial bajo en su pool)
- **Habilidad nativa — *Ceniza Acumulada*:** Cada vez que Mira gasta Vigor, deja una **Ceniza** en el campo (máx 5). Su definitiva escala con cenizas.
- **Ataque básico — *Centella*:** 4 daño mágico + 1 stack de Quemadura.
- **Activa 1 — *Llamarada* (2 Vigor):** 8 daño mágico a un enemigo + Quemadura (2 stacks).
- **Activa 2 — *Tormenta de Brasas* (4 Vigor):** 5 daño mágico AoE + Quemadura a todos.
- **Activa 3 — *Velo de Humo* (2 Vigor):** Aplica Vulnerable (50% más daño recibido) a un enemigo por 2 turnos.
- **Pasiva — *Catalizadora*:** Las quemaduras hacen +50% daño mientras Mira esté viva.
- **Definitiva — *Pira Hueca* (10 Vigor):** 10 daño AoE + 3 daño extra por Ceniza acumulada. Consume las cenizas.
- **Caminos de evolución:** *Pirómaga* (más Quemadura) / *Cenicienta* (más Ceniza, definitivas más frecuentes)
- **Sinergias:** Vera (Vulnerable + DPS bruto), Sacerdotisa (la mantiene viva mientras castea)

---

### 7.4 Aren, la Sacerdotisa Silenciosa (Soporte / Curación)

| Stat | Base |
|---|---|
| HP | 55 |
| Velocidad | 5 |
| Defensa | 4 |
| Ataque | 2 |
| Poder | 6 |

- **Estadística primaria:** Poder (escala curación)
- **Fortaleza:** Cura, limpieza de estados, buffs
- **Debilidad:** Daño muy bajo
- **Habilidad nativa — *Voto de Silencio*:** Aren no genera Vigor con ataques básicos, pero gana +2 Vigor cada vez que cura a un aliado.
- **Ataque básico — *Bendición*:** 3 daño mágico (no genera Vigor por nativa) o cura 4 a un aliado (genera Vigor).
- **Activa 1 — *Mano de Luz* (2 Vigor):** Cura 12 a un aliado.
- **Activa 2 — *Purgar* (2 Vigor):** Limpia todos los estados negativos de un aliado + cura 6.
- **Activa 3 — *Aura de Vigor* (3 Vigor):** Da +1 Vigor a todos los aliados.
- **Pasiva — *Susurro Final*:** Si un aliado cae, Aren lo revive a 1 HP una vez por combate (cooldown: 5 turnos).
- **Definitiva — *Coro Hueco* (10 Vigor):** Cura 25 a toda la party + aplica Inspirado (próxima habilidad cuesta 0 Vigor).
- **Caminos de evolución:** *Inquisidora* (cura ofensiva, daño a no-muertos) / *Madre* (más cura masiva)
- **Sinergias:** Toda la party. Es el pegamento.

---

### 7.5 Lyra, la Cazadora del Velo (Control / Estados)

| Stat | Base |
|---|---|
| HP | 50 |
| Velocidad | 7 |
| Defensa | 3 |
| Ataque | 5 |
| Poder | 4 |

- **Estadística primaria:** Velocidad (actúa primero, prepara el turno)
- **Fortaleza:** Control, debuffs, prioridad de turno
- **Debilidad:** Daño directo bajo si no aplica estados antes
- **Habilidad nativa — *Marca del Velo*:** El primer ataque que recibe un enemigo Marcado se vuelve crítico (x1.5).
- **Ataque básico — *Disparo*:** 5 daño físico
- **Activa 1 — *Marcar Presa* (1 Vigor):** Aplica Marcado (3 turnos) a un enemigo. Marcado se acumula con otros estados.
- **Activa 2 — *Flecha Ponzoña* (2 Vigor):** 6 daño + Veneno (3 stacks).
- **Activa 3 — *Disparo Aturdidor* (3 Vigor):** 4 daño + Aturdimiento garantizado (1 turno).
- **Pasiva — *Ojos Lentos*:** Cuando Lyra actúa primero en un round, +20% daño durante ese round.
- **Definitiva — *Caza Hueca* (10 Vigor):** Marca a TODOS los enemigos. Próximo ataque de cualquier aliado a un Marcado es crítico garantizado.
- **Caminos de evolución:** *Cazadora* (más Marcado, más críticos) / *Envenenadora* (build de Veneno puro)
- **Sinergias:** Vera (Marcado + Sangrado destruye), Mira (Marcado + Vulnerable encadena)

---

### Cobertura de roles
- Tanque: **Bram**
- Daño físico: **Vera**
- Daño mágico: **Mira**
- Soporte/cura: **Aren**
- Control/estados: **Lyra**
- Híbrido: a desbloquear post-MVP (ej.: un Caballero-Mago, un Bardo)

---

## 8. Estadísticas

Sistema deliberadamente compacto. Sin Precisión/Evasión: agregan complejidad y RNG sin pagar.

| Stat | Representa | Efecto en combate | Escalado | ¿Modificable por ítems? |
|---|---|---|---|---|
| **HP** | Vida | A 0 → caído | +5–10 por nivel | Sí |
| **Ataque** | Fuerza física | Daño base de ataques físicos | +1–2 por nivel | Sí |
| **Poder** | Fuerza mágica | Daño base de ataques mágicos y curación | +1–2 por nivel | Sí |
| **Defensa** | Reducción daño | `daño_recibido - Defensa` | +1 por 2 niveles | Sí |
| **Velocidad** | Orden de turno | Mayor → actúa antes | +0.5 por nivel | Sí |
| **Crítico** | % chance daño x1.5 | Al atacar | Base 5%, +1% por nivel | Sí |
| **Resistencia** | Resistencia a estados | % chance de evitar estado al aplicar | Base 10% | Sí |
| **Vigor máximo** | Capacidad de recurso | Determina cap de Vigor | Base 10, modificable por ítems | Sí (ítems específicos) |

> **Decisión:** sin Precisión/Evasión. Todos los ataques pegan. Si querés sensación de “no le pegué”, se modela con Defensa alta o Vulnerable.

---

## 9. Habilidades

### Tipos
- **Activas:** acciones del turno, cuestan Vigor, sin cooldown turnal (gestión por recurso)
- **Pasivas:** efectos permanentes, no requieren input
- **Nativas:** una por personaje, definen identidad
- **Definitivas:** requieren Vigor 10, gastan todo, una por personaje

### Mejoras
Cada habilidad activa tiene **una mejora** que se desbloquea en campamento o como recompensa. Ejemplo:
- *Tajo Doble* base: 2 golpes de 5
- *Tajo Doble+*: 2 golpes de 5, segundo golpe aplica Sangrado x2

### Rareza
No aplica a habilidades base de personaje. Sí aplica a habilidades adquiridas como recompensa (post-MVP, ver §22).

### Formato estándar de ficha de habilidad

| Campo | Ejemplo |
|---|---|
| Nombre | Llamarada |
| Personaje | Mira |
| Tipo | Activa |
| Costo | 2 Vigor |
| Cooldown | — |
| Objetivo | 1 enemigo |
| Efecto | 8 daño mágico + Quemadura (2 stacks) |
| Escalado | +Poder × 1.0 |
| Mejora posible | *Llamarada+*: +3 daño y Quemadura 3 stacks |
| Animación sugerida | Sprite frame de carga + flash de explosión + tinte rojo en target |
| Prioridad MVP | **Sí** (set base de Mira) |

---

## 10. Estados alterados

| Estado | Efecto | Duración | Stack | Aplicación | Remoción | Habilidades que lo usan |
|---|---|---|---|---|---|---|
| **Veneno** | Daño igual a stacks al inicio del turno. -1 stack/turno | Hasta llegar a 0 | Sí, sin cap | Habilidades específicas | Purgar, fin natural | Lyra, eventos |
| **Quemadura** | Daño igual a stacks al final del turno. -1 stack/turno | Hasta 0 | Sí, sin cap | Mira | Purgar, fin natural | Mira |
| **Sangrado** | Daño igual a stacks cuando el afectado **actúa** | Hasta 0 | Sí, sin cap | Vera, enemigos | Purgar, fin natural | Vera |
| **Aturdimiento** | Pierde su próximo turno | 1 turno | No (refresca) | Habilidades específicas | Fin natural | Bram, Lyra |
| **Debilitado** | -50% daño infligido | 2 turnos | No (refresca) | Habilidades específicas | Purgar, fin natural | Aren ofensiva |
| **Marcado** | Próximo crítico contra el target garantizado x1.5 | 3 turnos | No | Lyra | Consumir o fin natural | Lyra |
| **Protegido** | -50% daño recibido | 1 turno | No (refresca) | Bram | Fin natural | Bram |
| **Inspirado** | Próxima habilidad cuesta 0 Vigor | Hasta usar | No (refresca) | Aren definitiva | Consumir | Aren |
| **Vulnerable** | +50% daño recibido | 2 turnos | No (refresca) | Mira | Purgar, fin natural | Mira |
| **Regeneración** | Cura igual a stacks al final del turno. -1 stack/turno | Hasta 0 | Sí, cap 10 | Ítems, eventos | Fin natural | Reliquias, Aren+ |

**Reglas generales:**
- Stacks se aplican aditivamente.
- Estados “sin stack” se refrescan (la duración nueva pisa la vieja si es mayor).
- *Resistencia* puede evitar la aplicación inicial (no remueve estados ya activos).

---

## 11. Ítems, reliquias y equipamiento

### Categorías

| Categoría | Cuándo se usa | Ejemplo |
|---|---|---|
| **Consumible** | Activado por el jugador, una vez | Poción de cura |
| **Equipamiento** | Slot por personaje (1 arma, 1 armadura, 1 amuleto) | Espada Roída |
| **Reliquia pasiva** | Efecto permanente durante la run, party-wide | Estandarte Roto |
| **Mejora permanente de run** | Buff específico al levelear o evento | +5 HP a Bram |
| **Maldita** | Reliquia con beneficio + costo | Cráneo del Cuervo |

### Lista inicial (20 ítems/reliquias para MVP)

| # | Nombre | Categoría | Rareza | Efecto | Build favorita | Riesgo | MVP |
|---|---|---|---|---|---|---|---|
| 1 | Poción Roja | Consumible | Común | Cura 25 HP a un aliado | Cualquiera | — | ✅ |
| 2 | Poción de Vigor | Consumible | Común | +5 Vigor a un aliado | Cualquiera | — | ✅ |
| 3 | Antídoto | Consumible | Común | Limpia todos los estados negativos | Cualquiera | — | ✅ |
| 4 | Granada de Cenizas | Consumible | Poco común | 10 daño AoE + Quemadura | Mira | — | ✅ |
| 5 | Espada Roída | Equipamiento | Común | +3 Ataque | Vera/Bram | — | ✅ |
| 6 | Báculo Hueco | Equipamiento | Común | +3 Poder | Mira/Aren | — | ✅ |
| 7 | Cota de Hierro Negro | Equipamiento | Poco común | +5 Defensa, -1 Velocidad | Bram | Pierde init | ✅ |
| 8 | Capa del Velo | Equipamiento | Poco común | +2 Velocidad, +5% Crítico | Lyra | — | ✅ |
| 9 | Amuleto del Voto | Equipamiento | Rara | Empieza combate con +2 Vigor | Cualquiera | — | ✅ |
| 10 | Estandarte Roto | Reliquia | Rara | Toda la party empieza combate con +1 Vigor | Cualquiera | — | ✅ |
| 11 | Reloj Detenido | Reliquia | Rara | El primer enemigo en actuar cada combate pierde su turno | Control | — | ✅ |
| 12 | Cáliz de Aren | Reliquia | Rara | Toda cura aplica Regeneración (1 stack) | Soporte | — | ✅ |
| 13 | Yelmo del Padre | Reliquia | Épica | Bram gana +10 HP máx y +2 Defensa | Tanque | — | ✅ |
| 14 | Cráneo del Cuervo | Reliquia | Maldita | +30% daño party / pierde 5 HP máx por personaje | Glass cannon | Sí | ✅ |
| 15 | Pacto del Hambre | Reliquia | Maldita | +1 acción por round a un personaje / no puede curarse | Solo | Sí | ✅ |
| 16 | Marca del Pregonero | Reliquia | Épica | Marcar dura +1 turno y aplica Vulnerable | Lyra+Mira | — | ✅ |
| 17 | Sangre Negra | Reliquia | Épica | Sangrado hace x1.5 daño | Vera | — | ✅ |
| 18 | Espejo Hueco | Reliquia | Rara | Cuando un aliado cae, los enemigos reciben 5 daño AoE | Defensiva | — | ✅ |
| 19 | Diente de Lobo | Equipamiento | Común | +5% Crítico | Lyra/Vera | — | ✅ |
| 20 | Cinta Manchada | Reliquia | Maldita | Vigor máx +5 / -10 HP máx por personaje | Definitivas | Sí | ✅ |

> Pool ampliable post-MVP a 50–60 ítems para variedad de runs.

---

## 12. Progresión durante la run

### Cómo crecen los personajes en una partida

1. **XP por combate.** Cada combate da XP a toda la party. Subir nivel da +HP, +1 a stat primaria.
2. **Recompensa post-combate (3 opciones a elegir 1):**
   - Mejorar habilidad (ej.: *Tajo Doble → Tajo Doble+*)
   - +stat permanente para un personaje (ej.: +5 HP, +1 Defensa)
   - Reliquia / consumible / oro
3. **Tiendas:** comprar ítems, quitar maldiciones, eliminar reliquia indeseada
4. **Campamento:** elegir 1 de 3 acciones — curar 30% party, mejorar habilidad, identificar/forjar
5. **Eventos:** decisiones con riesgo/recompensa
6. **Sacrificios opcionales:** algunos eventos ofrecen pérdida (HP máx, descarte de ítem) por ganancia mayor

### Cómo evitar que el jugador siempre elija lo mismo
- **Recompensas con sinergia explícita al party actual** (las 3 opciones se generan considerando los personajes presentes).
- **Coste de oportunidad alto:** no podés tomar más de 1 recompensa, así que “stat aburrida pero útil” compite con “habilidad llamativa”.
- **Reliquias que cambian el plan:** una reliquia de Sangrado puede empujarte a meter más Vera, una de Marcado a más Lyra.
- **Evitar “opción dominante”:** balanceo iterativo. Regla: si en playtest una opción se elige >60% del tiempo en mismo contexto, se nerfea o se buffa la alternativa.

---

## 13. Meta-progresión

### Análisis

| Opción | Pro | Contra |
|---|---|---|
| Sin meta | Pureza tipo FTL, escalable | Run perdida = nada se siente progresivo, frustra |
| Desbloqueo de personajes | Le da meta tangible, scope acotado | Solo si hay personajes interesantes para sumar |
| Desbloqueo de ítems | Variedad creciente | Puede romper balance temprano |
| Árbol general de mejoras | Progresión de RPG | Complejo, mucho contenido para hacer y balancear |
| Logros / codex | Cheap, satisfactorio | Solo reconocimiento, no gameplay |

### Recomendación
**Híbrido mínimo viable:**
1. **Memoria** — moneda meta que se gana al terminar runs (gana o pierda).
2. **Desbloqueables progresivos:**
   - 3 personajes adicionales (más allá de los 5 base; opcional para post-MVP)
   - 10–15 reliquias adicionales al pool
   - 5 eventos adicionales
   - El acto secreto
3. **Codex / bestiario** que se llena con cada enemigo derrotado y reliquia obtenida.
4. **Logros internos** que dan Memoria.

**Lo que NO recomiendo:** árbol de mejoras pasivas que afecte stats base. Genera bola de nieve, dificulta balance, alarga el desarrollo.

---

## 14. Enemigos

### Tabla inicial (12 enemigos para MVP, distribuidos en 3 actos)

| # | Nombre | Acto | HP | Tipo | Comportamiento | Habilidades clave | Intención visible | Recompensa | MVP |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Bandido Hueco | 1 | 18 | Básico | Ataca al personaje con menos HP | Tajo (5), Empujón (3 + retroceso) | Sí | XP+oro | ✅ |
| 2 | Lobo Corrupto | 1 | 14 | Básico ágil | Velocidad alta, ataca primero | Mordisco (4 + Sangrado) | Sí | XP+oro | ✅ |
| 3 | Peregrino Vacío | 1 | 22 | Soporte | Cura a sus aliados | Plegaria (cura 6 al aliado más bajo) | Sí | XP+oro | ✅ |
| 4 | El Pregonero | 1 | 60 | Mini-jefe | Aplica Marcado a toda la party round 1 | Pregón (Marcado AoE), Lanza Negra (10 dmg al Marcado) | Sí | Reliquia rara | ✅ |
| 5 | Padre Oxidado | 1 | 110 | Jefe | 2 fases | Embestida, Defensa total, Estandarte (buffea minions invocados) | Sí | Reliquia épica fija | ✅ |
| 6 | Cultista | 2 | 20 | Básico mágico | Daño mágico, frágil | Maldición (4 dmg + Vulnerable), Susurro (debuff) | Sí | XP+oro | ✅ |
| 7 | No-muerto | 2 | 28 | Tanque | Aguanta, golpea fuerte | Mazazo (8), Resurgir (revive a 50% HP, 1 vez) | Sí | XP+oro | ✅ |
| 8 | Bestia Plagada | 2 | 24 | Veneno | Aplica Veneno por contacto | Zarpazo Pútrido (5 + Veneno x2) | Sí | XP+oro | ✅ |
| 9 | La Coral | 2 | 75 | Mini-jefe | Invocadora | Convocar Acólito cada 3 turnos, Drenaje (cura) | Sí | Reliquia rara | ✅ |
| 10 | Obispo Hueco | 2 | 140 | Jefe | 2 fases | Bendición (heal+buff), Mortaja (DoT AoE), 2da fase: Cadáver (DPS bruto) | Sí | Reliquia épica fija | ✅ |
| 11 | Demonio Menor | 3 | 35 | Élite común | DPS alto y resistente | Garras (10), Aliento (8 dmg + Quemadura) | Sí | Reliquia | ✅ |
| 12 | Rey Hueco | 3 | 220 | Jefe final | 3 fases | Ver §15 | Sí | Victoria | ✅ |

> Para MVP estricto: 8 enemigos comunes + 2 mini-jefes + 3 jefes = **13 fichas de enemigo**. Reusables con variantes (recolor, +HP, +1 habilidad).

---

## 15. Jefes

### 15.1 Padre Oxidado (Acto 1)

- **Concepto:** Caballero caído, antaño protector del reino, ahora corrupto. Armadura oxidada que se rompe en fase 2.
- **Historia breve:** Fue el primero en jurar contra La Hueca y el primero en rendirse ante ella.
- **HP:** 110
- **Fases:**
  - **Fase 1 (HP 100–50%):** Defensivo. Alterna Embestida (12 daño a un personaje) y Postura del Hierro (gana 15 Bloque, +50% Defensa 1 turno).
  - **Fase 2 (HP <50%):** La armadura se rompe. -3 Defensa permanente. Gana Tajo Doble (8+8) y empieza a aplicar Sangrado.
- **Mecánica única:** En fase 2, cada vez que recibe Aturdimiento se pierde la posibilidad de aturdirlo otra vez ese combate (inmunidad creciente). Obliga a no spamear control.
- **Cómo obliga a cambiar de estrategia:** En fase 1 querés DPS sostenido. En fase 2 te obliga a heal + control limitado.
- **Recompensa:** Reliquia épica fija (**Yelmo del Padre**) + 50% cura party.
- **Señales visuales:** Telegraph 1 turno antes de Embestida (icono rojo grande). Animación de armadura rompiéndose al pasar a fase 2.
- **Música:** Tambores graves, coral femenino susurrado. Cambia a tono más caótico en fase 2.

### 15.2 Obispo Hueco (Acto 2)

- **Concepto:** Sacerdote corrupto, dos cuerpos: él y su cadáver suspendido.
- **HP:** 140
- **Fases:**
  - **Fase 1 (Clerical):** Cura sus minions (Acólitos invocados cada 4 turnos), Bendice (buffea +5 daño a un Acólito), Mortaja (DoT AoE 3 turnos).
  - **Fase 2 (Cadáver, HP <40%):** Mata a sus propios minions y se transforma. Pierde curación, gana Tajo Eterno (15 daño).
- **Mecánica única:** En fase 1 los Acólitos son su escudo. Si los matás muy rápido pasa a fase 2 con todo su HP. Hay que decidir: matarlo lento o agresivo.
- **Cómo obliga a cambiar:** Te empuja a pensar en prioridad de targets, no solo a “meter daño al jefe”.
- **Recompensa:** Reliquia épica fija + opción de cambiar 1 personaje del party (mecánica de §17).
- **Señales visuales:** Vitral roto detrás de él. Cadáver visible suspendido desde el inicio.
- **Música:** Coros eclesiásticos invertidos. Fase 2: silencio + percusión seca.

### 15.3 Rey Hueco (Acto 3, jefe final)

- **Concepto:** No es una persona. Es un trono que se mueve.
- **HP:** 220
- **Fases:**
  - **Fase 1 (HP 100–66%):** El trono. Ataca con espinas de hueso (8 dmg targeteado), aplica Corrupción (estado nuevo, x daño cada turno).
  - **Fase 2 (HP 66–33%):** El Coronado. Una figura emerge del trono. AoE constante, debuffs.
  - **Fase 3 (HP <33%):** El Vacío. La pantalla se oscurece, las stats enemigas se revelan distorsionadas (intención más críptica), daño masivo.
- **Mecánica única:** En cada fase el patrón cambia completamente. Lo que funcionó en fase 1 no funciona en fase 3.
- **Cómo obliga a cambiar:** Es la prueba final: el jugador necesita una build completa, no especializada.
- **Recompensa:** Pantalla de victoria, créditos, Memoria grande para meta.
- **Señales visuales:** Cambio de paleta total entre fases. Glitch visual en fase 3.
- **Música:** Tema único orquestal. Cada fase suma capas.

---

## 16. Eventos narrativos

10 eventos iniciales. Tono evocativo, decisiones con consecuencia mecánica clara.

| # | Nombre | Descripción breve | Opciones | Consecuencia |
|---|---|---|---|---|
| 1 | El Peregrino Moribundo | Un peregrino agonizante pide auxilio | A: Curarlo (-1 poción) → reliquia. B: Dejarlo → +Memoria. C: Acabarlo → +oro, -ánimo party | Variable |
| 2 | El Confesionario | Un cubículo de madera carcomida | A: Confesar (-10 HP máx 1 personaje) → reliquia épica. B: Ignorar → nada | Sacrificio por reliquia |
| 3 | La Caravana Abandonada | Caravana volcada, cofres a la vista | A: Saquear → 50% reliquia, 50% emboscada. B: Avanzar → nada | Riesgo |
| 4 | El Forjador Hueco | Un herrero ciego ofrece forjar un arma | A: Pagar 50 oro → upgrade equipamiento. B: Ofrecer sangre (-15 HP) → upgrade. C: Irse | Costo a elección |
| 5 | El Pozo de los Nombres | Un pozo seco que pide un nombre | A: Tirar oro (30) → +1 stat permanente a un personaje. B: Tirar reliquia → reliquia mejor. C: Irse | Cambio de recurso |
| 6 | El Niño en la Niebla | Un niño llora en la niebla | A: Acercarse → 50% trampa (daño), 50% bendición. B: Ignorar → -1 ánimo (sin efecto mecánico real, narrativo) | Riesgo puro |
| 7 | El Espejo Hueco | Un espejo que muestra a otro de tus personajes corrupto | A: Romperlo (-5 HP máx) → reliquia. B: Mirar (1 personaje gana Marcado permanente este acto) → reliquia maldita. C: Irse | Maldición opcional |
| 8 | La Mesa de los Caídos | Una mesa con 4 platos vacíos | A: Comer (cada personaje +5 HP máx) pero -1 Vigor inicial. B: Irse | Trade-off |
| 9 | El Ahorcado | Un hombre colgando, no del todo muerto | A: Bajarlo → se une como mercenario 1 combate. B: Robarle → oro + maldición leve. C: Irse | Aliado temporal |
| 10 | El Pacto del Trono | Voz que ofrece poder | A: Aceptar (+10% daño party, marca permanente “Tocado”) → relacionado con final secreto. B: Rechazar → reliquia rara | Cuelga del meta |

> Los eventos refuerzan mundo sin texto largo. Reglas: máx 4 líneas de descripción, opciones siempre 2–3, consecuencia inmediata (no diferida).

---

## 17. Sistema de vínculos entre personajes

Sistema **opcional**. Versión MVP mínima.

### Cómo sube el vínculo
- +1 punto de **Afinidad** entre A y B cuando A cura/protege/buffea a B
- +1 cuando ambos sobreviven un combate
- Cap: 10 puntos por par

### Beneficios
- Afinidad 3: pasiva pequeña (ej.: +5% daño cuando ambos están vivos)
- Afinidad 7: desbloquea **habilidad combinada** (1 vez por combate, requiere ambos vivos y 5 Vigor cada uno)

### UI
Pantalla de party muestra una grilla de personajes; líneas que se iluminan según afinidad. **No** hay menú dedicado profundo en MVP.

### Riesgos
- Sobrecomplicación: el jugador no presta atención y se pierde el sistema
- Balance: la habilidad combinada puede romper el juego si está disponible siempre

### Versión mínima viable (post-MVP, no esencial)
Implementar solo si el resto del juego ya está sólido. Para MVP estricto: omitir.

### 5 habilidades combinadas propuestas

| # | Nombre | Pareja | Costo | Efecto |
|---|---|---|---|---|
| 1 | Hierro Hueco | Bram + Vera | 5+5 Vigor | Vera ataca por 25 daño, Bram redirige el contraataque |
| 2 | Pira Marcada | Mira + Lyra | 5+5 Vigor | Mira lanza Pira sobre todos los Marcados de Lyra, x2 daño |
| 3 | Coro de Acero | Aren + Bram | 5+5 Vigor | Aren cura 30 a Bram, Bram aplica Provocar AoE |
| 4 | Sangre Negra | Vera + Lyra | 5+5 Vigor | Vera golpea, todos los enemigos sangrantes reciben Veneno x3 |
| 5 | Voto Final | Aren + cualquiera | 5+5 Vigor | Aren transfiere su Vigor al aliado y cura 20% HP a la party |

---

## 18. UI/UX

### Pantallas necesarias

| Pantalla | Objetivo | Elementos críticos | Acción jugador | Errores a evitar |
|---|---|---|---|---|
| Menú principal | Iniciar/seguir | Logo, Nuevo, Continuar, Codex, Opciones | Click | Demasiados subitems |
| Selección de party | Elegir 4 de N | Cards de personajes, stats clave, indicador de roles | Drag & drop o tap | No mostrar sinergias = jugador ciego |
| Mapa de actos | Decidir ruta | Nodos visibles, tipo, conexiones, posición actual | Click en nodo accesible | Nodos pequeños, conexiones poco claras |
| **Combate** | Tomar decisiones tácticas | Party con HP/Vigor/estados, enemigos con HP/intención, panel de acciones, log de turno | Seleccionar acción → target | Desorden visual, intención poco clara, animaciones largas |
| Recompensa | Elegir 1 de 3 | Tres opciones grandes, descripción clara, tooltip | Click | Recompensas con texto chico |
| Inventario | Gestionar ítems | Slots por personaje + comunes | Drag & drop | Demasiados clics |
| Ficha personaje | Ver build actual | Stats, habilidades, equipo, afinidades | Solo lectura | Saturación de info |
| Tienda | Comprar/vender | Lista de ítems con precio | Click compra | Sin confirmación de compras caras |
| Campamento | Elegir mejora | 3 opciones grandes | Click | Confusión sobre qué hace cada una |
| Derrota | Cierre | Resumen, monedas meta, botón retry | Click | Frustración: que no cuente desbloqueos |
| Victoria | Cierre | Stats run, créditos, retry | Click | — |
| Codex / Bestiario | Lore/info | Lista de enemigos, ítems, eventos descubiertos | Click ver detalle | Mostrar info de cosas no encontradas (spoiler) |

### Pantalla de combate — desglose detallado

**Layout (pixel art retro estilo He is Coming):**
``` (esto seria en realidad con el enemigo arriba y el party abajo)
┌──────────────────────────────────────────────────────┐
│  [Round 3]                          [Pausa] [Codex]  │
│                                                      │
│  Party                            Enemigos           │
│  ┌────┐ ┌────┐                   ┌────┐ ┌────┐      │
│  │Bram│ │Vera│        VS         │Ban1│ │Ban2│      │
│  │ HP │ │ HP │                   │ HP │ │ HP │      │
│  │Vig │ │Vig │                   │ ⚔  │ │ ☣  │      │
│  └────┘ └────┘                   └────┘ └────┘      │
│  [Mira] [Aren]                                       │
│                                                      │
│  Estados activos: [Bram: Provocar][Ban2: Sangrado]  │
│                                                      │
│  Turno de: VERA                                      │
│  [Atacar] [Tajo Doble 2V] [Corte 3V] [Defender]     │
│  [Objeto] [Definitiva 10V — bloqueada]               │
└──────────────────────────────────────────────────────┘
```

**Reglas de UI de combate:**
- Intención enemiga **siempre visible**: ícono claro (espada, corazón, gota, etc.) + número de daño/curación si aplica
- Vigor visible numéricamente y como barra
- HP siempre numérico + barra
- Animaciones cortas (≤ 0.6s) y skipeables
- Log de turno opcional, contraído por default
- Tooltips al hover/long-press para habilidades

---

## 19. Dirección artística

### Estilo recomendado
**Pixel art retro de baja resolución**, paleta limitada, inspirado en *He is Coming*. Sprites de personajes ~32×48 px, enemigos hasta 64×64 (jefes hasta 96×96).con ese filtro de monitor viejo o tv antigua CRT

### Perspectiva
**Lateral** (side-view 2D). Combate como Pokémon GBA. Mapa de actos top-down con nodos.

### Paleta general
- Acto 1: marrones, grises, ocres apagados, sepia
- Acto 2: verdes enfermos, púrpura, dorado opaco
- Acto 3: blanco-negro alto contraste, rojo sangre como acento
- UI: marrón oscuro, beige, dorado mate, rojo

### Referencias de tono
- colorido, pixelart, fondo negro contraste de colores. No mucho detalle. Los personajes seran como un sello sin movimiento pero de un color especifico de acuerdo a su clase o a lo que elija el propio jugador
- *Loop Hero* (pixel oscuro denso)
- *Tangledeep* (sprites legibles)
- *He is Coming* (sí, lo nombrado)

### Nivel de detalle recomendado
- Personajes: sin animacion inicialmente
- Enemigos básicos: sin animacion inicialmente
- Jefes: sin animacion inicialmente
- Backgrounds: 1 fondo por bioma (3 fondos para MVP) + capa de partículas opcional


### Cómo evitar scope artístico explosivo
- **Reusar sprites con recolor:** un Bandido y un Bandido Élite comparten base con paleta distinta
- **No animar habilidades complejas:** un flash + partícula simple basta
- **UI con bordes y tipografía bitmap:** evita assets ilustrados
- **Backgrounds estáticos:** sin parallax en MVP

---

## 20. Sonido y música

### Música

| Pista | Cuándo | Estilo |
|---|---|---|
| Menú principal | Pantalla inicial | Cuerda solitaria, ambient melancólico |
| Mapa Acto 1 | Llanuras | Tambores graves, viento, instrumentos secos |
| Mapa Acto 2 | Catedral | Coros susurrados, órgano descompuesto |
| Mapa Acto 3 | Vacío | Drone, percusión irregular |
| Combate común | Cualquier combate | Loop corto, percusivo, no melódico |
| Combate élite | Élite/mini-jefe | Variante intensa de la del bioma |
| Combate jefe | Cada jefe tiene tema | Único, orquestal, con cambios de fase |
| Victoria | Fin combate | Sting de 3 segundos |
| Game over | Derrota | Cuerda triste, 5 segundos |

### Efectos
- UI: click, hover, confirmación, error
- Habilidades: cada una su SFX (golpe, slash, fuego, hielo, cura)
- Daño: hit físico, hit mágico, crítico (más sucio)
- Curación: brillo suave
- Estados: aplicación distinta para cada (gota → veneno, llama → quemadura, etc.)
- Victoria: stinger
- Caída: thud + pulso

### Separación MVP / deseable

**MVP:**
- 4 pistas de música (menú, combate común, jefe, victoria)
- 15–20 SFX core

**Deseable:**
- Música por acto
- Tema único por jefe
- SFX por habilidad individual
- Voice barks ocasionales

> Recurso: Pixabay, Freesound, OpenGameArt, o asset packs en itch. Si no hay presupuesto, asset packs CC0 cubren MVP entero.

---

## 21. Diseño técnico para Godot

### Convenciones
- Godot 4.x, GDScript
- Datos como **Resources personalizados** (.tres) — facilita edición desde editor
- Scenes para todo lo visual y reutilizable
- Singletons (autoload) solo para managers globales

### Escenas (.tscn)

| Scene | Responsabilidad |
|---|---|
| `Main.tscn` | Entry point, switch entre Menu/Run/Combat |
| `MainMenu.tscn` | Pantalla inicial |
| `RunScene.tscn` | Contiene el mapa de acto y maneja flujo entre nodos |
| `MapNode.tscn` | Nodo individual del mapa (botón visual) |
| `BattleScene.tscn` | Pantalla de combate completa |
| `Character.tscn` | Sprite + UI + estado de un personaje en combate |
| `Enemy.tscn` | Sprite + UI + estado + IA de un enemigo |
| `SkillButton.tscn` | Botón de habilidad en panel de combate |
| `RewardScreen.tscn` | Pantalla post-combate de elegir recompensa |
| `EventScene.tscn` | Pantalla de evento narrativo |
| `ShopScene.tscn` | Tienda |
| `CampScene.tscn` | Campamento |
| `CharacterSheet.tscn` | Ficha de personaje (tooltip o pantalla) |
| `StatusIcon.tscn` | Ícono de estado alterado con stack count |

### Resources (.gd / .tres)

| Resource | Campos clave |
|---|---|
| `CharacterData.gd` | id, nombre, hp_base, atk, pod, def, vel, sprite, habilidades[], pasiva, definitiva, nativa |
| `EnemyData.gd` | id, nombre, hp, comportamiento_id, habilidades[], sprite, intención_table, recompensa |
| `SkillData.gd` | id, nombre, tipo, costo_vigor, target_type, efectos[], escalado, animación_id |
| `ItemData.gd` | id, nombre, rareza, categoría, efecto_script, descripción |
| `StatusEffectData.gd` | id, nombre, duración_default, stackeable, tick_phase (start/end_turn), efecto_script |
| `EventData.gd` | id, nombre, descripción, opciones[] (cada opción: texto, consecuencia) |
| `ActData.gd` | id, nombre, mapa_config, pool_enemigos[], pool_eventos[], jefe_id |

### Scripts / Managers

| Script | Tipo | Responsabilidad |
|---|---|---|
| `RunManager.gd` | Autoload | Estado de la run actual: party, oro, reliquias, acto, posición en mapa |
| `BattleManager.gd` | Per-scene | Orquesta el combate: orden de turnos, fases, victoria/derrota |
| `TurnManager.gd` | Componente de Battle | Calcula orden por velocidad, ejecuta turnos |
| `IntentResolver.gd` | Componente | Decide intención enemiga al inicio del round |
| `StatusEffectManager.gd` | Componente | Aplica/remueve/tickea estados |
| `RewardGenerator.gd` | Utilidad | Genera 3 recompensas según contexto del party |
| `MapGenerator.gd` | Utilidad | Genera grafo del acto |
| `EventResolver.gd` | Utilidad | Aplica consecuencias de un evento |
| `SaveManager.gd` | Autoload | Persistencia run actual + meta-progresión |
| `AudioManager.gd` | Autoload | Música y SFX |

### Almacenamiento de datos

| Tipo dato | Formato recomendado |
|---|---|
| Personajes, enemigos, habilidades, ítems, estados | **Resources (.tres)**. Editables desde el editor de Godot, fáciles de versionar |
| Eventos | Resources, con dialog en `String` o vinculado a JSON externo si crece |
| Configuración de actos | Resources |
| Save de run actual | Diccionario serializado a archivo (`user://save.tres`) |
| Meta-progresión | Diccionario serializado a archivo separado |
| Localización (post-MVP) | CSV/JSON externo |

### Pseudocódigo orientativo de un turno

```
BattleManager.start_round():
    intentions = IntentResolver.calc_for_all_enemies()
    units = party + enemies, ordenados por velocidad desc
    for unit in units:
        if unit.alive:
            if unit is Player:
                await player_input(unit)
            else:
                execute_intent(unit, intentions[unit])
            apply_end_turn_effects(unit)
    StatusEffectManager.tick_round()
    if check_victory(): goto reward
    if check_defeat(): goto game_over
    else: start_round()
```

> Pseudocódigo solo. La implementación real requiere queues asincrónicas, animaciones, y eventos.

---

## 22. MVP

### MVP obligatorio (versión 0.1 jugable)
- **3 personajes** jugables (Bram, Vera, Mira) — el party es de 4 pero se permite repetir o se simplifica a party de 3 SOLO si baja scope
- **Acto 1 completo** (12 nodos, mini-jefe, jefe)
- **6 enemigos** + 1 mini-jefe + 1 jefe
- **10 habilidades activas** (3 por personaje base + 1 nativa por personaje)
- **8 ítems/reliquias**
- **5 eventos**
- Sistemas: combate, mapa, recompensas, tienda básica, campamento básico, save/load
- Sin meta-progresión

### Versión 0.2 (post-MVP cercano)
- 2 personajes más (Aren, Lyra) → party de 4 real
- Acto 2 completo
- +6 enemigos, +1 mini-jefe, +1 jefe
- +5 ítems
- +3 eventos
- Mejoras de habilidades

### Versión 0.3
- Acto 3 + jefe final
- 1 personaje extra desbloqueable
- Sistema de afinidad (versión mínima)
- Codex/bestiario
- Meta-progresión (Memoria + desbloqueos)

### Contenido futuro
- Acto 4 secreto
- Habilidades combinadas (afinidad 7)
- 3 personajes extra
- 30+ ítems extra
- 15+ eventos extra
- Modos de dificultad / ascensiones

### Sistemas descartados para MVP
- Posicionamiento táctico (filas)
- Precisión/Evasión
- Habilidades combinadas
- Árbol meta de mejoras pasivas
- Multiplayer
- Modo daily/seed

---

## 23. Roadmap de desarrollo

| Etapa | Objetivo | Entregables | Dificultad | Dependencias | Criterio de aceptación |
|---|---|---|---|---|---|
| 1. Prototipo de combate | Validar combate por turnos en gris | BattleScene funcional con 1 personaje vs 1 enemigo, ataque básico, HP, victoria/derrota | Media | Ninguna | Podés ganar y perder un combate |
| 2. Personajes y habilidades | Sistema de personajes/habilidades data-driven | 3 personajes con 3 activas + nativa, sistema Vigor, Resources | Media-Alta | 1 | Puedo crear un personaje nuevo solo editando un .tres |
| 3. Enemigos y estados | Enemigos con intención + estados alterados | 6 enemigos con IA simple, sistema de estados (Sangrado, Quemadura, Veneno, Aturdimiento) | Alta | 2 | Un enemigo muestra intención y la cumple. Estados se aplican y se quitan correctamente |
| 4. Recompensas e ítems | Sistema de recompensas post-combate | RewardScreen, 8 ítems, modificadores de stats | Media | 2, 3 | Tras un combate elijo 1 de 3 recompensas y mi build cambia |
| 5. Mapa de actos | Sistema de avance | Acto 1 generable, nodos, navegación | Media | 4 | Recorro el acto 1 entero hasta el jefe, encadenando combates |
| 6. Eventos | Sistema de eventos narrativos | EventScene + 5 eventos | Baja-Media | 5 | Un evento aparece, elijo opción, hay consecuencia mecánica |
| 7. UI | Pulido de UI esencial | Pantalla de combate clara + menús | Alta | 1–6 | Un jugador externo entiende qué pasa sin explicación |
| 8. Balance | Ajuste de números | Iteración de stats, costos, daños | Continua | 1–7 | Run promedio dura 60–90 min, ningún encuentro es trivial ni imposible |
| 9. Demo jugable | MVP cerrado | Build playable acto 1 completo | — | 1–8 | Subir a itch.io / Steam page demo |

---

## 24. Riesgos de diseño

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Scope demasiado grande | Alta | Alto | MVP estricto a Acto 1 + 3 personajes. Cualquier feature extra va a 0.2 |
| Combate lento | Media | Alto | Animaciones ≤ 0.6s, skip habilitado, máximo 5 turnos por combate común. Auto-resolución opcional para combates fáciles |
| Demasiados personajes | Media | Medio | 3 en MVP, no más |
| Exceso de estadísticas | Baja | Medio | Sin Precisión/Evasión. Stats limitadas a 8 |
| Falta de identidad propia | Alta | Alto | Vigor individual + 3 fases de jefes + tono dark fantasy diferenciador. Si la build huele a “StS sin cartas” → reforzar pillars |
| Dependencia de arte complejo | Alta | Alto | Pixel art bajo, asset packs CC0, sprites reusados. Sin animaciones complejas en MVP |
| Progresión rota | Media | Alto | Telemetría de elecciones del jugador en testing. Si una opción se elige >60% se rebalancea |
| Jefes injustos | Media | Alto | Cada jefe debe tener 1 mecánica para evitarlo (skip turn, telegraph). Beta-test mínimo antes de publicar |
| Builds dominantes | Alta | Medio | Ítems con sinergia explícita pero también con coste de oportunidad. Caps en stacks de Sangrado/Veneno |
| UI confusa | Alta | Alto | Iteración temprana de UI. Pantalla de combate debe pasar test de “alguien ajeno entiende qué pasa” |
| Vigor poco intuitivo | Media | Alto | Tutorial implícito en primeros 3 combates. Tooltip claro siempre. Considerar reset entre combates (decisión abierta) |
| Aprender Godot mientras se hace | Alta | Alto | Reservar 2 semanas para prototipos puros antes de empezar a meter contenido |

---

## 25. Preguntas abiertas / Decisiones que necesito que Martín defina

### Críticas (definir antes de empezar a producir)

1. **Persistencia del Vigor:** ¿Se resetea entre combates (recomendado, clarifica el sistema) o persiste durante toda la run (más complejo, premia conservación)?
2. **Vigor inicial al entrar combate:** ¿2 fijo, escalable por personaje, o 0?
3. **Tamaño de party en MVP:** ¿4 estricto desde el inicio (más scope) o arrancar el MVP con party de 3 y subir a 4 en 0.2?
4. **Permadeath de run:** confirmado que no hay permadeath de personaje (revive post-combate). ¿Confirmás también que la run se pierde solo si los 4 caen simultáneamente al final de un round? La run termina cuando mueren todos los personajes. Es decir un solo personaje puede terminar la ronda en pie, y eso haria que reviva el resto del party con el porcentaje preestablecido del 30%
5. **Meta-progresión:** ¿OK con la opción “Híbrido mínimo” (Memoria + desbloqueables + codex) o preferís sin meta?

### Importantes (definir antes de cerrar 0.1)

6. **Título definitivo:** ¿“Hollow Banner”, “Of Ash and Iron”, “The Pale March”, u otro? Otro despues lo pensamos
7. **Sistema de afinidad:** ¿incluir versión mínima en MVP o postergar a 0.3?
8. **Idioma:** ¿desarrollo en español como lengua principal y traducir a inglés después, o al revés?
9. **Auto-skip de combates:** ¿permitir auto-resolver combates fáciles cuando ya tengo build dominante?
10. **Visualización de probabilidades en eventos:** ¿se muestra el % de éxito (50% trampa) o se oculta para tensión?

### Opcionales (pueden quedar para después)

11. **Tema musical:** ¿orquestal oscuro, electrónico industrial, folk medieval pesado, mezcla?
12. **Habilidades combinadas (afinidad 7):** ¿prefieres este sistema o un sistema de “combos” basado en estados (ej.: si está Marcado y Sangrando, X aliado hace combo)?
13. **Modos de dificultad:** ¿pensás incluir ascensiones tipo StS o un único nivel por ahora?
14. **Modo Daily/Seed:** ¿interés en runs con seed compartido?
15. **Logros públicos:** ¿integración Steam o solo internos?

---

## Próximos pasos sugeridos

1. Respondé las 5 preguntas críticas.
2. Yo actualizo el GDD a v0.2 con tus decisiones marcadas como definitivas.
3. Empezamos por la **Etapa 1 del roadmap**: prototipo de combate gris en Godot. Te puedo dar la estructura de scenes y resources concreta cuando estemos ahí.
4. Paralelo: pensar nombre definitivo y armar 1 sprite de personaje placeholder para validar feel artístico desde temprano.
