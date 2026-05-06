# Hollow Banner — Roadmap de tickets MVP

**Stack:** Phaser 3 + TypeScript + Vite
**Objetivo:** MVP jugable del Acto 1 completo, corriendo en browser
**Modo de trabajo:** cada ticket es una unidad de trabajo. Pasarle uno a la vez a Claude Code, validar que funciona, commitear, siguiente.

---

## Cómo usar este documento

1. Cada ticket tiene: **objetivo, prompt para Claude Code, criterio de aceptación, dependencias**.
2. **No saltees tickets.** Las dependencias importan.
3. Después de cada ticket: probar en el browser, commit a Git con el número del ticket en el mensaje (ej.: `feat: T1.4 - battle manager loop`).
4. Si Claude Code se desvía o agrega cosas no pedidas, pedile que se ajuste estrictamente al ticket.
5. Cuando un ticket diga "pasarle al chat principal", significa que es algo de diseño/balance que conviene discutir conmigo (Claude principal) antes de implementar.

---

# ETAPA 0 — Setup del proyecto

## Ticket 0.1 — Inicializar proyecto Phaser 3 + TypeScript + Vite

**Objetivo:** tener un proyecto vacío corriendo en `localhost` con una escena de Phaser que muestre "Hollow Banner".

**Prompt para Claude Code:**
```
Crear un proyecto nuevo de Phaser 3 con TypeScript usando Vite.

Requisitos:
- Estructura de carpetas:
  src/
    scenes/
    systems/
    data/
    ui/
    config/
    types/
  public/
    assets/
  index.html
  package.json
  tsconfig.json
  vite.config.ts

- Phaser 3 (última versión estable)
- TypeScript en strict mode
- Vite como bundler
- Configurar tsconfig con paths absolutos (@/ → src/)
- Crear una escena BootScene que muestre el texto "Hollow Banner" centrado en pantalla
- Resolución base: 1280x720
- Background color: #1a1a1a (gris oscuro)
- Configurar scripts en package.json: dev, build, preview
- Agregar .gitignore apropiado (node_modules, dist, etc.)
- Agregar un README.md mínimo con instrucciones para correr el proyecto

NO instales librerías extras (state management, UI, etc.). Solo Phaser, TypeScript, Vite y sus tipos.
```

**Criterio de aceptación:**
- `npm run dev` levanta el servidor
- En `localhost:5173` se ve "Hollow Banner" centrado sobre fondo gris oscuro
- Sin errores en consola

**Dependencias:** ninguna

---

## Ticket 0.2 — Estructura de scenes y router básico

**Objetivo:** tener las escenas principales esqueleto creadas y un sistema simple para navegar entre ellas.

**Prompt para Claude Code:**
```
Crear el esqueleto de las escenas principales del juego en src/scenes/:

1. BootScene (ya existe, ajustar): carga inicial, transición a MainMenuScene
2. MainMenuScene: muestra "Hollow Banner" + botón "Iniciar run"
3. PartySelectScene: pantalla placeholder con texto "Seleccionar party (a implementar)" + botón "Continuar"
4. MapScene: pantalla placeholder con texto "Mapa (a implementar)" + botón "Combate de prueba"
5. BattleScene: pantalla placeholder con texto "Combate (a implementar)" + botón "Volver al mapa"
6. RewardScene: pantalla placeholder con texto "Recompensas (a implementar)" + botón "Continuar"
7. GameOverScene: texto "Game Over" + botón "Volver al menú"

Requisitos:
- Cada botón es texto clickeable simple (sin imágenes), con hover state (cambio de color)
- Registrar todas las escenas en el config de Phaser
- El flujo entre escenas usa scene.start() de Phaser
- Crear un archivo src/config/SceneKeys.ts con constantes para los nombres de las escenas (no usar strings sueltos)
- Mantener todo en TypeScript estricto
```

**Criterio de aceptación:**
- Podés navegar: Boot → Menu → PartySelect → Map → Battle → Reward → Map (loop) o GameOver → Menu
- Sin errores en consola
- Cada escena se ve identificable

**Dependencias:** 0.1

---

# ETAPA 1 — Modelos de datos y sistemas core

## Ticket 1.1 — Tipos base de Character, Stats y Resources

**Objetivo:** definir las interfaces y tipos TypeScript que representan personajes, sus stats y recursos.

**Prompt para Claude Code:**
```
Crear los tipos base del juego en src/types/.

1. src/types/Stats.ts:
   - Interface Stats con: hp, hpMax, attack, power, defense, speed, crit, resistance
   - Interface Resources con: vigor, vigorMax, mana, manaMax
   - Type StatKey = keyof Stats

2. src/types/Character.ts:
   - Enum CharacterClass: KNIGHT, MERCENARY, SORCERESS, PRIEST, HUNTER
   - Enum PrimaryStat: ATTACK, POWER, DEFENSE, SPEED
   - Interface CharacterData (datos estáticos del personaje):
     - id: string
     - name: string
     - className: CharacterClass
     - primaryStat: PrimaryStat
     - baseStats: Stats
     - baseResources: Resources
     - usesMana: boolean (true para Mira, Aren; false para Bram, Vera; Lyra: false en MVP)
     - skillIds: string[] (IDs de las habilidades nativas/base)
     - description: string
   - Interface CharacterInstance (personaje vivo durante una run):
     - data: CharacterData
     - currentStats: Stats (puede modificarse por buffs/items)
     - currentResources: Resources
     - level: number
     - xp: number
     - equipment: { weapon: string|null, armor: string|null, amulet: string|null }
     - statusEffects: StatusEffectInstance[] (placeholder, definir tipo vacío por ahora)
     - isDown: boolean

3. NO implementar lógica todavía. Solo tipos e interfaces.
4. Exportar todo desde un index.ts en src/types/.
```

**Criterio de aceptación:**
- Compila sin errores con `tsc --noEmit`
- Los tipos están bien organizados y reutilizables

**Dependencias:** 0.2

---

## Ticket 1.2 — Tipos de Skill, StatusEffect e Item

**Objetivo:** completar el resto de tipos del dominio.

**Prompt para Claude Code:**
```
En src/types/, agregar:

1. src/types/Skill.ts:
   - Enum SkillType: ACTIVE, PASSIVE, NATIVE, ULTIMATE
   - Enum SkillTarget: SELF, SINGLE_ALLY, ALL_ALLIES, SINGLE_ENEMY, ALL_ENEMIES, RANDOM_ENEMIES
   - Enum ResourceCost: VIGOR, MANA
   - Interface SkillEffect:
     - type: 'damage' | 'heal' | 'apply_status' | 'buff' | 'block' | 'gain_resource'
     - amount?: number
     - statusId?: string
     - stacks?: number
     - scalingStat?: StatKey
     - scalingMultiplier?: number
   - Interface SkillData:
     - id: string
     - name: string
     - type: SkillType
     - costType: ResourceCost | null
     - costAmount: number
     - target: SkillTarget
     - effects: SkillEffect[]
     - description: string
     - characterId: string (a quién pertenece)

2. src/types/StatusEffect.ts:
   - Enum StatusEffectId: BLEED, BURN, POISON, STUN, MARKED, PROTECTED, INSPIRED, VULNERABLE, REGEN, WEAKENED
   - Enum TriggerTiming: TURN_START, TURN_END, ON_ACT, ON_DAMAGE_TAKEN, ON_DAMAGE_DEALT
   - Interface StatusEffectData:
     - id: StatusEffectId
     - name: string
     - description: string
     - stackable: boolean
     - maxStacks: number | null (null = sin cap)
     - triggerTiming: TriggerTiming
     - isNegative: boolean
   - Interface StatusEffectInstance:
     - id: StatusEffectId
     - stacks: number
     - duration: number (turnos restantes; -1 = permanente)

3. src/types/Item.ts:
   - Enum ItemCategory: CONSUMABLE, EQUIPMENT, RELIC, CURSED_RELIC
   - Enum EquipmentSlot: WEAPON, ARMOR, AMULET
   - Enum Rarity: COMMON, UNCOMMON, RARE, EPIC, CURSED
   - Interface StatRequirement:
     - stat: StatKey
     - minValue: number
   - Interface ItemEffect:
     - type: 'stat_modifier' | 'resource_modifier' | 'on_combat_start' | 'on_kill' | 'passive_effect'
     - stat?: StatKey
     - amount?: number
     - description: string
   - Interface ItemData:
     - id: string
     - name: string
     - category: ItemCategory
     - rarity: Rarity
     - slot?: EquipmentSlot (solo para equipment)
     - requirements: StatRequirement[] (vacío si no requiere nada)
     - setId?: string (si pertenece a un set)
     - effects: ItemEffect[]
     - description: string
     - flavorText?: string

4. Actualizar el statusEffects: StatusEffectInstance[] en CharacterInstance del ticket 1.1.
5. Exportar todo desde src/types/index.ts.
```

**Criterio de aceptación:**
- Compila sin errores
- Los tipos cubren todos los conceptos del GDD §6, §9, §10, §11

**Dependencias:** 1.1

---

## Ticket 1.3 — Data registry y carga de datos estáticos

**Objetivo:** crear un registry centralizado para acceder a personajes, habilidades, ítems y estados desde cualquier parte del código.

**Prompt para Claude Code:**
```
Crear un sistema de data registry en src/data/.

1. src/data/characters/ — un archivo .ts por personaje (bram.ts, vera.ts, mira.ts) con la CharacterData hardcodeada según el GDD que paso al final.
2. src/data/skills/ — un archivo .ts por personaje con sus skills (bramSkills.ts, etc.)
3. src/data/items/ — un solo archivo items.ts con los 20 ítems del MVP.
4. src/data/statusEffects/ — un solo archivo statusEffects.ts con los 10 estados.

5. src/data/Registry.ts: clase Registry con métodos:
   - getCharacter(id: string): CharacterData
   - getSkill(id: string): SkillData
   - getItem(id: string): ItemData
   - getStatusEffect(id: StatusEffectId): StatusEffectData
   - getAllCharacters(): CharacterData[]
   Exponer una instancia singleton: export const registry = new Registry();

6. Si se pide un id que no existe → tirar Error con mensaje claro.

DATOS A CARGAR (del GDD v0.1):

Personajes (los 3 del MVP):
- Bram, el Caballero Caído: HP 80, Velocidad 4, Defensa 6, Ataque 4, Poder 1. usesMana: false. Skills: bram_basic, bram_provocar, bram_escudo_hierro, bram_embestida, bram_ult_estandarte, bram_native_juramento, bram_passive_voto
- Vera, la Mercenaria del Hierro Negro: HP 60, Velocidad 6, Defensa 3, Ataque 8, Poder 1. usesMana: false. Skills: vera_basic, vera_tajo_doble, vera_corte_profundo, vera_danza_acero, vera_ult_carniceria, vera_native_sed, vera_passive_frenesi
- Mira, la Hechicera de Cenizas: HP 50, Velocidad 5, Defensa 2, Ataque 1, Poder 8. usesMana: true (manaMax: 10, mana inicial 5). Skills: mira_basic, mira_llamarada, mira_tormenta, mira_velo_humo, mira_ult_pira, mira_native_ceniza, mira_passive_catalizadora

Para los costos: revisar las habilidades del GDD. CAMBIO IMPORTANTE: las habilidades de Mira que sean de daño mágico cuestan MANA, no Vigor (Llamarada 2 mana, Tormenta de Brasas 4 mana, Pira Hueca 10 mana ult). Velo de Humo y básico siguen con Vigor.

Stats base de Resources:
- Bram: vigorMax 10, manaMax 0
- Vera: vigorMax 10, manaMax 0
- Mira: vigorMax 8, manaMax 10

Ítems: usar la tabla del GDD §11 (los 20 ítems). Para los que tengan setId, dejarlo undefined por ahora (los sets se implementan en otro ticket).

Estados alterados: usar la tabla del GDD §10 (los 10 estados).
```

**Criterio de aceptación:**
- `registry.getCharacter('bram')` devuelve los datos correctos
- Compila sin errores
- Si pedís un id inexistente, tira error claro

**Dependencias:** 1.2

---

# ETAPA 2 — Combate base

## Ticket 2.1 — BattleState y BattleScene esqueleto

**Objetivo:** tener un estado de combate inicializable y la BattleScene mostrando placeholders de los combatientes.

**Prompt para Claude Code:**
```
Implementar el estado de combate y su visualización inicial.

1. src/systems/battle/BattleState.ts:
   - Class BattleState con:
     - party: CharacterInstance[]
     - enemies: EnemyInstance[] (definir EnemyInstance similar a CharacterInstance pero más simple, en src/types/Enemy.ts: id, name, currentStats, statusEffects, intent: EnemyIntent|null)
     - currentRound: number
     - turnQueue: (CharacterInstance | EnemyInstance)[]
     - currentActorIndex: number
     - phase: 'start_round' | 'player_turn' | 'enemy_turn' | 'end_round' | 'victory' | 'defeat'
   - Métodos: initBattle(party, enemies), nextActor(), isPartyDefeated(), areEnemiesDefeated()

2. src/types/Enemy.ts:
   - EnemyData: id, name, baseStats, intentPattern (string id por ahora), description
   - EnemyInstance: data, currentStats, statusEffects, intent
   - EnemyIntent: type ('attack'|'buff'|'apply_status'|'defend'), targetType, value, description

3. Actualizar BattleScene para:
   - Recibir party y enemies por parámetros (init data)
   - Si no recibe nada, usar un combate de prueba: party con Bram + Vera + Mira (instancias creadas desde el registry), enemies con 2 "Bandido Hueco" hardcodeados
   - Renderizar 4 slots para party (abajo) y 4 slots para enemies (arriba)
   - Cada slot: rectángulo de color + texto con nombre + texto con HP/HPMax
   - Por ahora sin interacción, solo visualizar

4. Asegurarse de que MapScene → BattleScene funcione pasando el combate de prueba.
```

**Criterio de aceptación:**
- Al ir a BattleScene se ven 3 personajes abajo y 2 enemigos arriba con sus HP visibles
- Estado inicial correcto (todos vivos, round 1)

**Dependencias:** 1.3

---

## Ticket 2.2 — Loop de turnos por velocidad

**Objetivo:** implementar el round-based loop con orden por Velocidad.

**Prompt para Claude Code:**
```
Implementar el loop de turnos en BattleManager.

1. src/systems/battle/BattleManager.ts:
   - Recibe un BattleState
   - Método startBattle(): inicia el primer round
   - Método startRound():
     - Construye turnQueue ordenando party + enemies por speed descendente
     - Empates a favor del jugador (party antes que enemies)
     - Filtra unidades caídas (isDown)
     - Llama a nextTurn()
   - Método nextTurn():
     - Avanza currentActorIndex
     - Si terminó la queue → endRound()
     - Si el actor está caído → siguiente
     - Si es player → emite evento 'player_turn_start' con el personaje
     - Si es enemy → ejecuta su intent y avanza
   - Método endRound():
     - Tick de status effects (placeholder por ahora, solo decrementar duración)
     - Chequear victoria/derrota
     - Si nadie ganó → startRound()
   - Usar el sistema de eventos de Phaser (EventEmitter) para comunicar cambios

2. En BattleScene:
   - Crear instancia de BattleManager
   - Suscribirse a eventos: 'turn_start', 'damage_dealt', 'unit_died', 'round_ended', 'battle_won', 'battle_lost'
   - Por ahora, solo loguear cada evento con console.log y mostrar un texto en pantalla "Turno de X"
   - En player_turn_start: mostrar 4 botones placeholder: "Atacar / Habilidad / Defender / Objeto" — todos hacen damage 5 al primer enemigo y avanzan turno
   - En enemy turn: el enemigo hace 5 damage al primer personaje vivo y avanza turno

3. Implementar la chequeada de victoria/derrota:
   - Victoria: todos los enemies con hp <= 0
   - Derrota: todos los party con hp <= 0 al final de un round
   - Al ganar: levantar caídos al 30% HP, mostrar mensaje "Victoria", volver al MapScene tras 2 segundos
   - Al perder: ir a GameOverScene
```

**Criterio de aceptación:**
- Podés ganar y perder un combate clickeando "Atacar"
- El orden de turnos respeta Velocidad
- Los caídos se levantan al 30% al ganar

**Dependencias:** 2.1

---

## Ticket 2.3 — Sistema de daño y defensa

**Objetivo:** implementar correctamente el cálculo de daño con la fórmula del GDD.

**Prompt para Claude Code:**
```
Implementar el sistema de daño en src/systems/battle/DamageCalculator.ts.

1. Función calculateDamage(attacker, target, baseDamage, damageType: 'physical'|'magical', options?):
   - damage_base = baseDamage + (damageType === 'physical' ? attacker.attack : attacker.power)
   - Aplicar modificadores de status (Vulnerable +50%, Debilitado -50% si es del attacker, Protegido -50% si es target)
   - Aplicar crítico: tirar % vs attacker.crit. Si crit → x1.5
   - Si target tiene Marcado y este ataque consume el Marcado → crítico garantizado (x1.5) y se quita Marcado
   - daño_final = max(1, daño - target.defense - bloque_extra_defender)
   - Si target tiene "Bloque" (escudo absorbente, no implementado aún → contemplar el campo, default 0)
   - Retornar { finalDamage, wasCrit, blocked }

2. Función applyDamage(target, damage):
   - Reduce HP, marca isDown si HP <= 0
   - Emitir evento 'damage_dealt' y 'unit_died' si corresponde

3. Acción "Defender":
   - Aplica un buff temporal "defendBonus" al actor que dura hasta su próximo turno
   - El buff suma X a la defensa para el cálculo de daño recibido
   - Valor inicial: defendBonus = 5

4. Reemplazar el "atacar = 5 daño hardcodeado" del ticket 2.2 con un ataque básico real:
   - Cada CharacterData tiene su skill básica (bram_basic, vera_basic, mira_basic)
   - Al clickear "Atacar", se abre selección de target (clickear un enemigo) y se ejecuta la skill básica usando calculateDamage
   - Mostrar números de daño flotantes sobre el target (texto que sube y desaparece, animación simple con tweens)

5. Implementar generación de Vigor:
   - Al usar ataque básico → +1 Vigor al actor
   - Habilidad nativa de Bram (Juramento Hueco): cuando un aliado recibe daño con Bram vivo → Bram gana +1 Vigor (cap +2 por turno; resetear cap al inicio del turno de Bram)
   - Habilidad nativa de Mira (Centella → +1 Vigor al usar básico): contemplada porque su básico es atacar
```

**Criterio de aceptación:**
- Atacar a un enemigo respeta la fórmula del GDD
- Defender reduce el daño recibido en el siguiente turno enemigo
- Vigor sube al atacar
- Crítico funciona y se ve "CRIT!" cuando ocurre

**Dependencias:** 2.2

---

## Ticket 2.4 — Sistema de habilidades activas

**Objetivo:** poder usar las habilidades de cada personaje en combate, gastando Vigor o Mana.

**Prompt para Claude Code:**
```
Implementar la ejecución de habilidades en src/systems/battle/SkillExecutor.ts.

1. Class SkillExecutor:
   - Método canUseSkill(actor, skill): boolean — chequea recurso disponible
   - Método executeSkill(actor, skill, targets, battleState): aplica todos los effects de la skill
     - damage: usa DamageCalculator
     - heal: cura HP, no excede hpMax
     - apply_status: agrega/refresca status effect en target(s)
     - buff: modifica currentStats temporalmente (con duración)
     - block: agrega valor de bloque al target
     - gain_resource: agrega Vigor o Mana al actor
   - Gasta el costo del recurso después de ejecutar
   - Emite eventos correspondientes

2. UI de selección de habilidad en BattleScene:
   - El botón "Habilidad" abre un menú con las habilidades activas del actor
   - Cada habilidad muestra: nombre, costo (con ícono de Vigor o Mana), descripción corta
   - Habilidades sin recurso suficiente → grayed out, no clickeables
   - Tooltip al hover: descripción completa

3. UI de selección de target:
   - Después de elegir skill, si target requiere selección → highlight de targets válidos
   - Click en target válido → ejecuta
   - Click derecho o ESC → cancela y vuelve al menú de habilidades

4. Implementar las habilidades activas de Bram, Vera y Mira:
   - Bram: Provocar (1V), Escudo de Hierro (3V), Embestida (2V)
   - Vera: Tajo Doble (2V), Corte Profundo (3V), Danza de Acero (4V)
   - Mira: Llamarada (2 Mana), Tormenta de Brasas (4 Mana), Velo de Humo (2V)
   - Las definitivas las dejamos para el ticket 2.6

5. Implementar Provocar:
   - Aplica un flag al Bram que redirige el próximo ataque enemigo dirigido a un aliado hacia él
   - +30% defensa este turno (hasta su próximo turno)
   - El flag se consume al recibir el primer ataque redirigido
```

**Criterio de aceptación:**
- Cada personaje puede usar sus 3 habilidades activas
- El recurso (Vigor o Mana) se gasta correctamente
- Habilidades sin recurso suficiente no se pueden usar
- Mira gasta Mana en sus hechizos, Bram y Vera gastan Vigor

**Dependencias:** 2.3

---

## Ticket 2.5 — Sistema de estados alterados completo

**Objetivo:** implementar los 10 estados alterados con sus triggers correctos.

**Prompt para Claude Code:**
```
Implementar el StatusEffectManager en src/systems/battle/StatusEffectManager.ts.

1. Class StatusEffectManager:
   - Método applyEffect(target, effectId, stacks, duration): agrega o refresca el efecto en target
     - Stackeable → suma stacks (respeta maxStacks si tiene)
     - No stackeable → refresca duración si la nueva es mayor
     - Chequea Resistencia: tira % para evitar aplicación inicial
   - Método removeEffect(target, effectId): quita el efecto
   - Método purgeNegative(target): quita todos los isNegative
   - Método tickAtTiming(unit, timing): ejecuta efectos del timing dado
   - Método tickRoundEnd(): -1 duración a todos los efectos con duración finita; remueve los que llegan a 0

2. Lógica específica por estado:
   - BLEED (Sangrado): daño = stacks cuando el afectado actúa (TURN_START si es enemy, ON_ACT si es player)
   - BURN (Quemadura): daño = stacks al final del turno del afectado. Stacks -1 al final del round
   - POISON (Veneno): daño = stacks al inicio del turno del afectado. Stacks -1 al final del round
   - STUN (Aturdimiento): el afectado pierde su turno (saltar en el turn loop). Duración 1 turno
   - MARKED (Marcado): el próximo crítico contra él es garantizado x1.5. Lo consume el primer ataque
   - PROTECTED (Protegido): -50% daño recibido por 1 turno
   - INSPIRED (Inspirado): la próxima habilidad cuesta 0. Se consume al usar
   - VULNERABLE: +50% daño recibido por 2 turnos
   - REGEN (Regeneración): cura = stacks al final del turno. Stacks -1 al final del round
   - WEAKENED (Debilitado): -50% daño infligido por 2 turnos

3. Visualización en BattleScene:
   - Debajo de cada combatiente, fila de íconos (placeholder: cuadraditos de color con letra inicial)
   - Tooltip al hover muestra nombre + stacks + duración
   - Sangrado: rojo. Quemadura: naranja. Veneno: verde. Aturdimiento: amarillo. Etc.

4. Hookear el manager al BattleManager:
   - Antes del turno de cada unidad: tickAtTiming(unit, TURN_START)
   - Después del turno de cada unidad: tickAtTiming(unit, TURN_END)
   - Al final del round: tickRoundEnd()
   - Al actuar (al ejecutar acción): tickAtTiming(unit, ON_ACT)

5. Conectar con las habilidades existentes:
   - Vera Tajo Doble → 1 stack BLEED
   - Vera Corte Profundo → 3 stacks BLEED
   - Mira Llamarada → 2 stacks BURN
   - Mira Tormenta de Brasas → 1 stack BURN AoE
   - Mira Velo de Humo → VULNERABLE (2 turnos)
   - Bram Embestida → STUN (1 turno)
```

**Criterio de aceptación:**
- Los estados se aplican, tickean y se quitan correctamente
- El daño de Sangrado/Quemadura/Veneno aparece en pantalla cuando trigger
- Aturdimiento hace perder el turno
- Resistencia bloquea la aplicación a veces

**Dependencias:** 2.4

---

## Ticket 2.6 — Habilidades pasivas, nativas y definitivas

**Objetivo:** completar el set de habilidades de los 3 personajes del MVP.

**Prompt para Claude Code:**
```
Implementar habilidades pasivas, nativas y definitivas.

1. Sistema de hooks en src/systems/battle/PassiveHooks.ts:
   - Eventos a hookear: ON_DAMAGE_DEALT, ON_DAMAGE_TAKEN, ON_KILL, ON_TURN_START, ON_HP_THRESHOLD, ON_RESOURCE_SPENT
   - PassiveHooks tiene métodos register(characterId, hookType, callback) y trigger(hookType, context)
   - Al inicializar combate, registrar los hooks de cada personaje vivo según sus habilidades nativas y pasivas

2. Implementar habilidades nativas:
   - Bram - Juramento Hueco: ya implementada en ticket 2.3 (verificar que sigue funcionando)
   - Vera - Sed de Hierro: si Vera mata un enemigo, gana +2 Vigor y actúa otra vez (insertar de nuevo en la turn queue justo después de su turno actual). Solo 1 vez por combate (flag por combate)
   - Mira - Ceniza Acumulada: cada vez que Mira gasta Vigor o Mana, deja una "Ceniza" en el campo (max 5). Las cenizas son un contador en BattleState, no un objeto físico

3. Implementar habilidades pasivas:
   - Bram - Voto Inquebrantable: cuando cae a <=25% HP por primera vez en un combate → +50% Defensa permanente en ese combate
   - Vera - Frenesí: por cada enemigo con BLEED en este momento, +10% daño de Vera (calcular en cada ataque)
   - Mira - Catalizadora: las quemaduras hacen +50% daño mientras Mira esté viva (modificador en el cálculo de daño de BURN)

4. Implementar definitivas (cuestan 10 del recurso, gastan todo el recurso, requieren tener el recurso lleno):
   - Bram - Estandarte Hueco (10 V): toda la party gana 10 de Bloque y +2 Vigor inmediato
   - Vera - Carnicería (10 V): golpea a todos los enemigos con BLEED por 15 daño cada uno
   - Mira - Pira Hueca (10 Mana): 10 daño AoE + 3 daño extra por Ceniza acumulada. Consume las cenizas

5. UI: agregar un botón especial "Definitiva" en el menú del personaje, grayed out hasta tener recurso lleno (>=10).

6. Sistema de Bloque: agregar campo `block: number` a CharacterInstance/EnemyInstance. El bloque absorbe daño antes que el HP. Se mantiene entre rounds salvo que se diga lo contrario por la habilidad.
```

**Criterio de aceptación:**
- Las 3 nativas funcionan correctamente
- Las 3 pasivas activan en sus triggers
- Las 3 definitivas se pueden usar cuando hay recurso lleno y tienen el efecto descrito
- Bloque absorbe daño correctamente

**Dependencias:** 2.5

---

# ETAPA 3 — Enemigos del Acto 1

## Ticket 3.1 — Sistema de IA enemiga e intenciones

**Objetivo:** los enemigos calculan su intención al inicio del round y la cumplen en su turno.

**Prompt para Claude Code:**
```
Implementar el sistema de IA enemiga.

1. src/systems/battle/EnemyAI.ts:
   - Class EnemyAI con método calculateIntent(enemy, battleState): EnemyIntent
   - Cada enemyData tiene un intentPatternId que indica su patrón
   - Patrones disponibles (definidos como funciones en src/data/enemies/intentPatterns.ts):
     - 'simple_attacker': 100% atacar al personaje con menor HP
     - 'bleeder': 50% atacar normal, 50% aplicar BLEED al random
     - 'defensive': cada 3 turnos defender, resto atacar al random
     - 'random_target_attacker': atacar al random
     - 'caster': cada 2 turnos aplica un debuff random, resto atacar
   - El método tira los dados al inicio del round y devuelve la intent

2. Visualización de intent:
   - Sobre cada enemigo, ícono + texto pequeño
   - 'attack' → ⚔️ + número de daño esperado
   - 'apply_status' → símbolo del estado + nombre
   - 'defend' → 🛡️
   - 'buff' → ↑

3. Crear los enemigos del Acto 1 en src/data/enemies/:
   - bandido_hueco.ts: HP 25, Atk 6, Def 1, Vel 3, intentPattern 'simple_attacker'
   - lobo_corrupto.ts: HP 20, Atk 4, Def 0, Vel 7, intentPattern 'bleeder'
   - peregrino_vacio.ts: HP 30, Atk 3, Def 4, Vel 2, intentPattern 'defensive'
   - cuervo_carronero.ts: HP 15, Atk 5, Def 0, Vel 8, intentPattern 'random_target_attacker'
   - acólito_susurrante.ts: HP 22, Atk 2, Pwr 5, Def 1, Vel 4, intentPattern 'caster' (aplica VULNERABLE o WEAKENED)
   - guardián_oxidado.ts: HP 40, Atk 7, Def 5, Vel 2, intentPattern 'simple_attacker'

4. Registry: agregar getEnemy(id) y registrar los 6 enemigos.

5. En BattleManager: al inicio de cada round, llamar a calculateIntent para cada enemigo vivo y guardarlo en enemy.intent. Al ejecutarse el turno del enemigo, ejecutar la intent.
```

**Criterio de aceptación:**
- Los 6 enemigos están creados
- Cada uno muestra su intent al inicio del round
- Las intents se ejecutan correctamente

**Dependencias:** 2.6

---

## Ticket 3.2 — Encuentros de combate y selección de combate desde el mapa

**Objetivo:** poder definir grupos de enemigos como "encuentros" y elegir cuál pelear.

**Prompt para Claude Code:**
```
Implementar el sistema de encuentros.

1. src/types/Encounter.ts:
   - Interface Encounter:
     - id: string
     - type: 'normal' | 'elite' | 'miniboss' | 'boss'
     - enemies: string[] (array de IDs de enemyData)
     - actNumber: number
     - difficulty: number (1-10, escala interna)

2. src/data/encounters/act1_encounters.ts: crear 8-10 encuentros para el Acto 1:
   - 5 encuentros normales (mix de los enemigos básicos, 2-4 enemigos cada uno)
   - 2 encuentros élite (1 enemigo fuerte o 2 medios + buff)
   - 1 mini-jefe placeholder (usar guardián_oxidado por ahora hasta el ticket del Pregonero)
   - 1 jefe placeholder (usar 2x guardián_oxidado por ahora hasta el ticket del Padre Oxidado)

3. Registry: agregar getEncounter(id), getEncountersByActAndType(act, type).

4. Modificar BattleScene para:
   - Recibir un encounterId en lugar de enemies hardcodeados
   - Inicializar los enemy instances desde el encounter
   - Si no recibe encounterId, usar uno por default (modo dev)

5. En MapScene: por ahora, agregar 3 botones temporales: "Combate normal aleatorio", "Combate élite aleatorio", "Combate jefe". Cada uno selecciona un encuentro de su tipo y va a BattleScene.
```

**Criterio de aceptación:**
- Hay al menos 8 encuentros distintos jugables
- Desde el mapa podés elegir tipo de combate
- Cada combate carga el encuentro correcto

**Dependencias:** 3.1

---

# ETAPA 4 — Mapa y progresión

## Ticket 4.1 — Generación del mapa Acto 1

**Objetivo:** generar un grafo dirigido de nodos estilo Slay the Spire para el Acto 1.

**Prompt para Claude Code:**
```
Implementar la generación procedural del mapa.

1. src/systems/map/MapNode.ts:
   - Interface MapNode:
     - id: string
     - column: number (0 a 5)
     - row: number (0 a 3)
     - type: 'normal' | 'elite' | 'event' | 'shop' | 'camp' | 'treasure' | 'miniboss' | 'boss' | 'special'
     - connections: string[] (IDs de los siguientes nodos)
     - completed: boolean
     - encounterId?: string (asignado al generarse, solo para combates)
     - eventId?: string (futuro)

2. src/systems/map/MapGenerator.ts:
   - Función generateAct1Map(seed?): MapNode[]
   - Reglas:
     - 6 columnas
     - Columna 0: 3-4 nodos normales (puntos de partida)
     - Columnas 1-3: mezcla según pesos del GDD §5 (50% normal, 10% élite, 15% evento, 8% tienda, 8% camp, 5% tesoro, 3% especial)
     - Columna 4: 1 mini-jefe (todos los caminos convergen)
     - Columna 5: ramas de nuevo (3-4 nodos mixtos)
     - Columna 6: 1 jefe (todos convergen)
   - Cada nodo se conecta con 1-2 nodos de la siguiente columna (asegurar que cada nodo tenga al menos un padre alcanzable desde columna 0)
   - Asignar encounterId a los nodos de combate desde el pool del Acto 1
   - Determinístico si se pasa seed

3. src/systems/map/MapState.ts:
   - Class MapState:
     - nodes: MapNode[]
     - currentNodeId: string | null (null = aún no empezó)
     - actNumber: number
   - Método getAvailableNodes(): los nodos a los que puede ir desde el actual
   - Método moveToNode(nodeId): valida y mueve

4. Persistir el MapState en el GameState global (crear si no existe en src/systems/GameState.ts: singleton que mantiene party, currentMap, runMeta como gold, items, etc.)
```

**Criterio de aceptación:**
- Llamando a generateAct1Map() obtenés un grafo válido
- Las conexiones son consistentes (no hay nodos huérfanos)
- Los nodos de combate tienen encounter asignado

**Dependencias:** 3.2

---

## Ticket 4.2 — Visualización del mapa

**Objetivo:** mostrar el mapa generado en MapScene con nodos clickeables.

**Prompt para Claude Code:**
```
Implementar la visualización del mapa.

1. Reescribir MapScene:
   - Al entrar, si no hay mapa generado en GameState, generar uno
   - Renderizar los nodos como círculos con ícono según tipo (placeholder: letra inicial dentro del círculo: N=normal, E=élite, V=evento, S=shop, C=camp, T=tesoro, M=miniboss, J=boss)
   - Renderizar las conexiones como líneas entre nodos
   - Distribución: columnas horizontales, nodos espaciados verticalmente
   - El nodo actual destacado (anillo dorado)
   - Los nodos disponibles para moverse: brillan/pulsan
   - Los nodos completados: tildados visualmente (gris/check)
   - Los nodos no alcanzables: opacidad baja

2. Click en nodo disponible:
   - Si es combate: actualizar currentNodeId, cargar BattleScene con el encounter del nodo
   - Si es evento: por ahora, mostrar "Evento (a implementar)" y marcar completado
   - Si es shop/camp/tesoro: igual, placeholder + completado
   - Si es miniboss/boss: como combate

3. Al volver a MapScene desde BattleScene tras victoria:
   - Marcar el nodo actual como completed
   - Recalcular nodos disponibles (los conectados al actual no completado)
   - Si el nodo era jefe → ir a una pantalla "Acto 1 completado" (placeholder simple)

4. UI:
   - Esquina superior derecha: oro actual + lista de ítems/reliquias adquiridos (placeholder por ahora)
   - Esquina superior izquierda: botón "Ver party" (placeholder)
   - Botón "Volver al menú" en una esquina (con confirmación)
```

**Criterio de aceptación:**
- El mapa se ve, podés navegarlo
- Los nodos completados se marcan
- Solo podés clickear nodos disponibles

**Dependencias:** 4.1

---

## Ticket 4.3 — Pantalla de selección de party

**Objetivo:** al iniciar una run, elegir hasta 4 personajes (los 3 disponibles del MVP).

**Prompt para Claude Code:**
```
Implementar PartySelectScene.

1. Mostrar los personajes disponibles del registry como cards:
   - Cada card: nombre, clase, stats base, descripción corta, lista de habilidades
   - Click en card: seleccionar/deseleccionar (toggle)
   - Indicador visual de seleccionado

2. Reglas:
   - Mínimo 1 personaje
   - Máximo 4 personajes
   - El MVP solo tiene 3, pero el sistema debe estar preparado para 5 (Aren, Lyra futuro)
   - Por ahora NO permitir personajes repetidos

3. Botón "Comenzar run":
   - Habilitado solo si hay 1-4 seleccionados
   - Crea las CharacterInstance desde los CharacterData seleccionados
   - Resetea el GameState (oro inicial: 50, items vacío, mapa nuevo)
   - Va a MapScene

4. Botón "Volver" → MainMenuScene
```

**Criterio de aceptación:**
- Podés elegir entre 1 y 4 personajes
- La run inicia con la party elegida
- Las instancias tienen stats correctos

**Dependencias:** 4.2

---

## Ticket 4.4 — XP, niveles y pantalla de recompensa

**Objetivo:** ganar XP por combate, subir de nivel, y elegir 1 de 3 recompensas.

**Prompt para Claude Code:**
```
Implementar XP, niveles y recompensas.

1. Sistema de XP en src/systems/Progression.ts:
   - Cada CharacterInstance tiene xp, level
   - XP por combate: normal=20, élite=40, miniboss=60, boss=100
   - Curva de nivel: nextLevelXp = level * 50
   - Al subir nivel: +5 HP máx, +1 a primaryStat, +0.5 Velocidad, recupera HP completo
   - Función awardXp(party, amount) → emite evento si alguien sube de nivel

2. Al ganar un combate, antes de volver al mapa:
   - Otorgar XP a toda la party
   - Otorgar oro: normal=15-25, élite=30-50, miniboss=60, boss=100
   - Ir a RewardScene con el contexto del combate

3. Reescribir RewardScene:
   - Mostrar XP ganado, oro ganado, level ups si los hubo
   - Mostrar 3 cards de recompensa a elegir:
     - Opción A: mejorar una habilidad de un personaje (placeholder por ahora si no hay sistema de mejoras)
     - Opción B: +stat permanente para un personaje (random: +5 HP / +1 Defensa / +1 Ataque o Poder según primary)
     - Opción C: ítem (random del pool del acto, según rareza por tipo de combate)
   - Click en una opción → aplicarla, volver a MapScene
   - Botón "Saltear" (toma solo XP y oro, sin la recompensa de las 3 cards)

4. Pool de drop por tipo de combate (implementar tabla simple):
   - normal: 70% común, 25% poco común, 5% rara
   - élite: 30% poco común, 60% rara, 10% épica
   - miniboss: 100% rara
   - boss: 100% épica

5. Al adquirir un ítem, agregarlo al inventario del GameState (lista global de ítems disponibles para equipar/usar).
```

**Criterio de aceptación:**
- Ganás XP y subís de nivel correctamente
- Aparecen 3 opciones de recompensa coherentes
- Los ítems van al inventario

**Dependencias:** 4.3

---

# ETAPA 5 — Equipamiento, sets y consumibles

## Ticket 5.1 — Pantalla de inventario y equipamiento con requisitos de stats

**Objetivo:** poder equipar ítems en los slots de cada personaje, respetando los requisitos.

**Prompt para Claude Code:**
```
Implementar la pantalla de inventario y equipamiento.

1. Crear src/scenes/InventoryScene.ts:
   - Vista dividida: izquierda los personajes de la party, derecha el inventario
   - Cada personaje muestra: stats actuales + 3 slots (arma/armadura/amuleto) con lo equipado
   - Inventario: lista de ítems con nombre, rareza (color), categoría, efecto

2. Sistema de equipar:
   - Click en ítem del inventario → muestra qué personajes pueden equiparlo
   - Para cada personaje:
     - Verde si cumple los requirements (todos los stats >= mínimos)
     - Rojo si no cumple, con tooltip "Requiere X de Y"
     - Click en personaje verde: equipa (si tenía algo en ese slot, lo desequipa al inventario)
   - Stats efectivos del personaje recalculados con el equipamiento puesto

3. Sistema de stats efectivos en src/systems/StatsCalculator.ts:
   - Función calculateEffectiveStats(character, equipment, statusEffects, buffs): Stats
   - Suma base + modificadores de cada item equipado + status temporales
   - Esta función es la fuente única de verdad para "qué stats tiene X en este momento"

4. Sistema de requirements:
   - Función canEquip(character, item, currentEquipment): boolean
   - Calcula stats sin el item objetivo (porque puede que el item actual aporte stats que el otro requiere — chequear sin contar el slot que se va a reemplazar)
   - Compara cada requirement contra los stats efectivos resultantes

5. Consumibles:
   - Botón "Usar" en consumibles del inventario
   - Selección de target (si aplica)
   - Solo se pueden usar fuera de combate desde inventario (las pociones de combate son otro flujo, ver ticket de combate)
   - Al usar: aplicar efecto, remover del inventario

6. Acceso a InventoryScene desde MapScene (botón "Inventario") y desde BattleScene (botón "Inventario" deshabilitado en combate por ahora; los consumibles en combate usan otro flujo)
```

**Criterio de aceptación:**
- Podés equipar/desequipar ítems
- Los requirements bloquean correctamente
- Los stats se actualizan al equipar

**Dependencias:** 4.4

---

## Ticket 5.2 — Sistema de sets de equipamiento

**Objetivo:** implementar bonus por equipar piezas del mismo set.

**Prompt para Claude Code:**
```
Implementar el sistema de sets.

1. Extender ItemData con setId opcional (ya está definido en tipos).

2. Crear src/types/Set.ts:
   - Interface SetBonus:
     - piecesRequired: number (2, 3)
     - effects: ItemEffect[]
     - description: string
   - Interface SetData:
     - id: string
     - name: string
     - description: string
     - flavorText?: string
     - itemIds: string[] (todos los items que pertenecen)
     - bonuses: SetBonus[] (ej: [{piecesRequired: 2, ...}, {piecesRequired: 3, ...}])

3. Crear src/data/sets/sets.ts con 3 sets iniciales para el MVP:
   - Set "Hierro Negro" (Vera/Bram): items con req. de Ataque o Defensa altos
     - Espada Roída, Cota de Hierro Negro
     - 2 piezas: +2 Ataque adicional
   - Set "Velo del Cazador" (Lyra futuro, igual creamos):
     - Capa del Velo, Diente de Lobo
     - 2 piezas: +5% Crítico adicional
   - Set "Voto Hueco" (cualquiera, foco en Vigor):
     - Amuleto del Voto, Estandarte Roto (relic, hacer que cuente igual)
     - 2 piezas: +1 Vigor inicial extra
   - (Los sets de Mira/Aren los agregamos cuando ampliemos el pool de items mágicos)

4. Asignar setId a los items existentes según corresponda en el data registry.

5. Sistema de bonus:
   - Función calculateActiveSets(equipment, party-relics): { setId: piecesEquipped }[]
   - Función getActiveSetBonuses(activeSets): ItemEffect[]
   - Integrar en calculateEffectiveStats: sumar bonuses de sets activos

6. Visualización en InventoryScene:
   - Cada item con setId muestra el nombre del set
   - Sección "Sets activos" en el panel del personaje muestra cuántas piezas equipadas y qué bonus están activos
   - Tooltip de set: muestra todos los bonuses con indicador de cuáles están activos

7. Sets para items con stat requirements altos (Mago vs Guerrero):
   - Crear 2-3 items extra de tier alto con requirements significativos:
     - "Hoja del Caído" (espada): req Ataque >= 12, +6 Ataque, setId 'hierro_negro_avanzado'
     - "Yelmo del Voto" (armor): req Defensa >= 10, +4 Defensa +5 HP, setId 'voto_hueco_avanzado'
     - "Vara de Cenizas" (báculo): req Poder >= 12, +6 Poder, setId 'cenizas_orden' (para Mira, prep para mago)
```

**Criterio de aceptación:**
- Equipar 2 piezas del mismo set activa el bonus
- El bonus se ve en stats efectivos
- Los items de tier alto requieren stats que solo tienen ciertos personajes
- Visualmente queda claro qué sets están activos

**Dependencias:** 5.1

---

## Ticket 5.3 — Reliquias pasivas y consumibles en combate

**Objetivo:** las reliquias de party-wide se aplican durante toda la run; consumibles usables en combate.

**Prompt para Claude Code:**
```
1. Sistema de reliquias activas:
   - GameState tiene relics: ItemData[] (las que están actualmente "activas" en la party)
   - Al adquirir una reliquia, se agrega automáticamente a relics
   - Cada reliquia tiene effects que se hookean al combate o al GameState según su tipo:
     - on_combat_start: trigger al iniciar cada combate (ej: Estandarte Roto +1 Vigor a todos)
     - passive_effect: efecto continuo (ej: +X stat a la party — sumar a calculateEffectiveStats)
     - on_kill: trigger cuando un personaje mata
     - on_ally_down: trigger cuando un aliado cae (Espejo Hueco)

2. Implementar las reliquias del pool MVP:
   - Estandarte Roto: on_combat_start, +1 Vigor a toda la party
   - Reloj Detenido: on_combat_start, primer enemigo en actuar pierde su turno
   - Cáliz de Aren: hook al sistema de cura → aplica REGEN 1 stack
   - Yelmo del Padre: passive_effect específico de Bram (+10 HP máx, +2 Defensa)
   - Cráneo del Cuervo (maldita): passive_effect, +30% daño party / -5 HP máx por personaje (aplicar al adquirir, revertir si se quita)
   - Pacto del Hambre (maldita): elegir 1 personaje al adquirir (pop-up). +1 acción por round / no puede curarse
   - Marca del Pregonero: hook a aplicación de MARKED, +1 turno y aplica VULNERABLE
   - Sangre Negra: hook a daño con BLEED, x1.5
   - Espejo Hueco: hook a aliado caído, 5 daño AoE
   - Cinta Manchada (maldita): +5 Vigor máx / -10 HP máx por personaje

3. Consumibles en combate:
   - Acción "Objeto" en el menú de turno (ya existe placeholder)
   - Al clickear: muestra inventario filtrado a consumibles
   - Click en consumible: selección de target si aplica
   - Usar consumible NO consume turno por defecto (o sí, según diseño — POR AHORA: consume turno completo, ver al final)
   - Implementar: Poción Roja (cura 25), Poción de Vigor (+5 Vigor), Antídoto (limpia negativos), Granada de Cenizas (10 daño AoE + BURN)

4. PASARLE AL CHAT PRINCIPAL: ¿usar consumible consume turno o es una acción aparte? Default por ahora: consume turno.
```

**Criterio de aceptación:**
- Las reliquias aplicadas tienen efecto real
- Las malditas aplican su penalización
- Los consumibles se pueden usar en combate

**Dependencias:** 5.2

---

# ETAPA 6 — Nodos no-combate

## Ticket 6.1 — Tienda

**Objetivo:** nodo de tienda funcional.

**Prompt para Claude Code:**
```
Implementar ShopScene.

1. Al entrar a un nodo de tipo 'shop' desde el mapa, ir a ShopScene.
2. ShopScene muestra:
   - 4 ítems aleatorios del pool del acto (mix: 2 consumibles, 1 equipamiento, 1 reliquia)
   - 1 servicio: "Quitar reliquia maldita" (50 oro, solo si hay alguna)
   - Cada ítem con su precio:
     - Común: 30g, Poco común: 60g, Rara: 100g, Épica: 200g
     - Consumible común: 20g
   - Oro actual del jugador siempre visible
3. Click en ítem: si hay oro suficiente, comprarlo (resta oro, agrega al inventario, marca el ítem como vendido)
4. Botón "Salir": vuelve al mapa, marca el nodo como completado
5. PASARLE AL CHAT PRINCIPAL: precios y composición de tienda son tentativos, validar.
```

**Criterio de aceptación:** funcional, podés comprar items.

**Dependencias:** 5.3

---

## Ticket 6.2 — Campamento

**Objetivo:** nodo de campamento funcional.

**Prompt para Claude Code:**
```
Implementar CampScene.

1. Al entrar a un nodo de tipo 'camp' desde el mapa, ir a CampScene.
2. Mostrar 3 opciones (elegir 1):
   - Curar 30% HP a toda la party
   - Mejorar una habilidad de un personaje (mostrar selector de personaje + selector de habilidad)
   - Forjar: aplicar +1 Ataque o +1 Poder o +1 Defensa permanente a un personaje (a elección del jugador)
3. La opción elegida se aplica, vuelve al mapa, marca nodo completado.
4. Sistema de mejora de habilidad:
   - Cada SkillData tiene un campo opcional improvedVersion: SkillData (el "+")
   - Por ahora, implementar la versión mejorada de las habilidades del MVP:
     - Tajo Doble+: +1 daño por golpe, segundo golpe aplica BLEED extra
     - Llamarada+: +3 daño, +1 stack BURN
     - Provocar+: dura 2 turnos
     - (Resto: agregar mejoras simples genéricas: +20% efecto principal)
   - Al mejorar, se reemplaza la skill en el array de skills del personaje
```

**Criterio de aceptación:** las 3 opciones funcionan y persisten.

**Dependencias:** 5.3

---

## Ticket 6.3 — Tesoros y eventos

**Objetivo:** nodos de tesoro (cofre con riesgo) y sistema de eventos.

**Prompt para Claude Code:**
```
1. TreasureScene:
   - Al entrar al nodo: animación simple de cofre, click "Abrir"
   - 25% chance de trampa: aplica BLEED a toda la party (3 stacks) + da una reliquia poco común
   - 75% chance de loot limpio: 1 reliquia rara
   - Aplicar y volver al mapa.

2. EventScene + sistema de eventos:
   - src/types/Event.ts: EventData con id, title, description, options[]
   - Cada option tiene: text, requirements? (opcional, ej: necesita oro/stat/item), effects[]
   - Effects posibles: gain_gold, lose_gold, gain_item, lose_item, gain_status_party, heal_party, damage_party, recruit (futuro), trigger_combat (con encounterId)
   - src/data/events/act1_events.ts: implementar 5 eventos:
     - "Caravana abandonada": [revisar (50% trampa: combate vs bandidos / 50% loot: 30g + 1 consumible) | irse]
     - "Cruce de ríos": [vadear (pierde 5 HP toda la party, gratis) | bordear (gasta tiempo: pierde el siguiente nodo gratuito) | pagar al barquero (-30g)]
     - "Peregrino moribundo": [escuchar (gana reliquia común) | apurar el final (gana 20g, todos ganan WEAKENED 2 turnos próximo combate) | ignorar]
     - "Confesionario": [confesar (-15 HP máx Bram permanente / +1 Defensa permanente Bram) | irse]
     - "Estatua hueca": [tocar (50% +1 stat random a un personaje / 50% -1 stat random) | romper (gana 1 reliquia poco común, aplica BLEED 5 a toda la party próximo combate)]

3. EventScene UI:
   - Texto del evento centrado, opciones como botones abajo
   - Mostrar requisitos de cada opción (grayed si no cumple)
   - Al elegir: aplicar effects, mostrar resultado en pantalla por 2 seg, volver al mapa

4. PASARLE AL CHAT PRINCIPAL: si los eventos quedan tematicamente bien, balancear riesgos.
```

**Criterio de aceptación:** los 5 eventos son jugables y aplican sus efectos.

**Dependencias:** 5.3

---

# ETAPA 7 — Mini-jefe y jefe del Acto 1

## Ticket 7.1 — Mini-jefe: El Pregonero

**Prompt para Claude Code:**
```
Implementar el mini-jefe del Acto 1.

1. Crear el enemy data: el_pregonero
   - HP 80, Atk 6, Def 3, Vel 4, Pwr 5
   - Patrón de IA único 'pregonero':
     - Round 1: aplica MARKED a toda la party
     - Round 2: ataca al personaje con más HP por 12
     - Round 3: aplica VULNERABLE a toda la party
     - Round 4: ataque AoE 6 daño + crítico garantizado en marcados
     - Loop desde Round 1
   - Al bajar a 50% HP, salta directamente al patrón de Round 4 una vez extra (rage)

2. Crear encounter act1_miniboss_pregonero (solo el pregonero, solo)

3. Asignarlo como el mini-jefe del Acto 1 en el generador de mapa.

4. Recompensa especial al ganar: reliquia rara fija (ej: Marca del Pregonero) + 80 oro.
```

**Criterio de aceptación:** el mini-jefe es desafiante pero justo, su intent siempre visible.

**Dependencias:** 6.3

---

## Ticket 7.2 — Jefe: Padre Oxidado

**Prompt para Claude Code:**
```
Implementar el jefe del Acto 1.

1. Crear el enemy data: padre_oxidado
   - HP 200, Atk 10, Def 8, Vel 3, Pwr 0
   - Sistema de fases (agregar campo `phase: number` y `phaseTriggers: HpThreshold[]` a EnemyInstance):
     - Fase 1 (HP 100% a 50%): "Defensa Total"
       - Round odd: defender (gana +10 def este turno y +20 bloque)
       - Round even: ataque pesado a un personaje 18 daño
     - Fase 2 (HP 50% a 0%): "Arremetida"
       - Cada round: 2 ataques (a 2 personajes random) por 10 daño cada uno
       - Cada 3 rounds: AoE 8 daño + STUN al objetivo con menor velocidad

2. Crear el patrón de IA 'padre_oxidado' que respete las fases.

3. Crear encounter act1_boss_padre_oxidado.

4. Asignarlo como el boss del Acto 1.

5. Al ganar: pantalla de "Acto 1 completado" + recompensa: reliquia épica fija + cura 50% party.

6. Al ganar el boss del Acto 1, el MVP termina: pantalla de "Demo completada, gracias por jugar".
```

**Criterio de aceptación:** combate de jefe denso, ~12-18 turnos del jugador, las dos fases se sienten distintas.

**Dependencias:** 7.1

---

# ETAPA 8 — UI, polish y cierre

## Ticket 8.1 — HUD de combate refinado

**Prompt para Claude Code:**
```
Refinar la UI de combate sin agregar arte (todo sigue placeholder, pero más prolijo).

1. HUD de combate:
   - Cada combatiente: nombre, barra de HP con número (current/max), barra de Vigor (si tiene), barra de Mana (si tiene)
   - Iconos de status effects con número de stacks
   - Indicador del turno actual (highlight + texto "Turno: Bram")
   - Orden de turnos del round visible (bandeja arriba con avatares en orden de speed)
   - Botones de acción: layout claro abajo (Atacar / Habilidad / Defender / Objeto / Definitiva)

2. Tooltips:
   - Hover sobre habilidad: nombre, costo, descripción completa, daño calculado contra el target seleccionado (si hay)
   - Hover sobre status: nombre, efecto, turnos restantes
   - Hover sobre enemigo: stats, intent detallado

3. Feedback visual:
   - Daño flotante (números que suben y desaparecen) — colores por tipo: blanco normal, amarillo crítico, rojo sangre/quemadura
   - Cura flotante (verde con +)
   - Sacudida de cámara leve al recibir daño grande
   - Tween al actuar (la unidad se mueve un poquito hacia adelante al atacar)

4. Log de combate:
   - Esquina, panel de últimos 5 eventos: "Bram usó Provocar", "Vera causó 12 daño a Bandido", etc.
```

**Criterio de aceptación:** un jugador externo entiende qué pasa sin explicación.

**Dependencias:** 7.2

---

## Ticket 8.2 — Save/Load de la run

**Prompt para Claude Code:**
```
Implementar persistencia de la run en localStorage.

1. src/systems/SaveManager.ts:
   - serialize(gameState): string (JSON)
   - deserialize(json): GameState
   - save(): guarda en localStorage 'hollow_banner_save'
   - load(): retorna GameState o null si no hay save
   - hasSave(): boolean
   - clearSave()

2. Auto-save:
   - Después de cada victoria de combate
   - Después de elegir recompensa
   - Después de cada nodo no-combate completado
   - Al volver al mapa desde cualquier escena

3. Mainmenu:
   - Si hasSave(): mostrar botón "Continuar" arriba
   - Botón "Nueva run" debajo (con confirmación si hay save)
   - Continuar: load, ir a MapScene

4. Al perder o ganar el Acto 1: clearSave().
```

**Criterio de aceptación:** podés cerrar y reabrir el browser y continuar la run.

**Dependencias:** 7.2

---

## Ticket 8.3 — Pulido final, balance y bugs

**Prompt para Claude Code:**
```
Pasar de "funciona" a "se siente bien".

1. Balance pass:
   - Probar una run completa, anotar combates triviales o imposibles
   - Ajustar HP/daño de enemigos para que combates normales duren 3-5 turnos del jugador
   - Élite 6-8, mini-jefe ~10, jefe 12-18
   - Run completa: 60-90 minutos objetivo

2. Bugs visuales:
   - Asegurar que los tweens no se solapen mal
   - Que los menús no se queden abiertos al cambiar escena
   - Que los hover states se limpien

3. Edge cases conocidos:
   - Acción durante animación: bloquear input mientras hay tween de daño activo
   - Definitiva sin target válido (Carnicería sin enemigos sangrantes): grayed
   - Aturdido en su turno: skip automático con mensaje "Aturdido"
   - Status que llegan a 0 stacks: removerlos correctamente
   - Personaje único vivo gana combate: revivir resto al 30%

4. Música y SFX (placeholder):
   - Sin assets reales, dejar hooks SoundManager.play('attack'), play('hit'), play('victory'), etc.
   - Por ahora estos métodos solo loguean. El usuario puede agregar audio después.

5. Build de producción:
   - npm run build genera dist/ desplegable
   - Verificar que el build funciona (npm run preview)
   - README con instrucciones para deploy a itch.io o GitHub Pages.
```

**Criterio de aceptación:** una run del MVP completa se puede jugar de inicio a fin sin crashes.

**Dependencias:** 8.2

---

# Resumen de dependencias

```
0.1 → 0.2 → 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
                                                                ↓
                                                              3.1 → 3.2 → 4.1 → 4.2 → 4.3 → 4.4
                                                                                              ↓
                                                                                            5.1 → 5.2 → 5.3
                                                                                                        ↓
                                                                                                      6.1, 6.2, 6.3 (paralelizables)
                                                                                                        ↓
                                                                                                      7.1 → 7.2
                                                                                                              ↓
                                                                                                            8.1 → 8.2 → 8.3
```

# Cosas que requieren decisión mía (Martín) durante el desarrollo

Cuando un ticket diga "PASARLE AL CHAT PRINCIPAL", parar y traerme la decisión antes de seguir. Lista actual:

- T5.3: ¿usar consumible consume turno o es acción libre?
- T6.1: precios y composición de tienda
- T6.3: balance de eventos
- General: nombres definitivos, ajustes de balance al testear

# Cómo trabajar con Claude Code

1. Al inicio de cada sesión: `cd hollow_banner && git status && git pull` (si trabajás en varias máquinas)
2. Pegarle el ticket completo a Claude Code
3. Revisar lo que generó antes de aceptar (puede irse de scope)
4. Probar en el browser con `npm run dev`
5. Si algo no funciona: pedirle que arregle el bug específico, no rehacer
6. Commit con formato: `feat(T2.4): skill executor and active skills` o `fix(T3.1): enemy intent calculation`
7. Si vas a empezar otro ticket: nuevo chat de Claude Code (mejor contexto fresco)

# Estimación de tiempo

Esto depende mucho de tu nivel y de cuánto valides cada paso, pero una estimación amplia:

- Etapa 0: 1-2 horas
- Etapa 1: 3-5 horas
- Etapa 2: 15-25 horas (es la más densa)
- Etapa 3: 5-8 horas
- Etapa 4: 8-12 horas
- Etapa 5: 8-12 horas
- Etapa 6: 5-8 horas
- Etapa 7: 4-6 horas
- Etapa 8: 8-15 horas (pulido siempre se infla)

Total MVP: ~60-90 horas de trabajo distribuido.
