# GAME JAM TRAVESIA · SPEC 01 — TRAVESÍA: el juego jugable en el reproductor

> **Status:** Draft
> **Depends on:** SPEC 07 (tetris-juego-real-y-leaderboard), SPEC 08 (arkanoid-juego-real-y-leaderboard), SPEC 09 (snake-juego-real-y-leaderboard)
> **Date:** 2026-11-16
> **Game jam:** tema "Cruza la carretera y el río sin convertirte en papilla."
> **Objective:** Crear desde cero el juego original `TRAVESÍA` en un `<canvas>` en
> `/juegos/travesia/jugar`, registrarlo en `GAME_REGISTRY` y añadirlo a `GAMES` con su portada,
> de forma que se juegue completo en `MODO DEMO`.

## Por qué existe este spec

La game jam pide un juego sobre el tema "Cruza la carretera y el río sin convertirte en papilla".
TRAVESÍA lo interpreta de forma literal en la mecánica: el jugador avanza casilla a casilla por
una carretera con tráfico, cruza un canal saltando sobre objetos que flotan y llega a una puerta
de la orilla superior. Si un vehículo lo atropella, el canvas lo muestra aplastado con el texto
`¡PAPILLA!`.

Es un diseño **original del género "cruzar carriles"**, no la recreación de ningún juego
comercial:

- **Protagonista propio:** Pipo, un repartidor con gorra magenta, chaqueta amarilla y una caja de
  cartón. No hay ningún animal.
- **Escenario urbano:** carretera de 4 carriles (coches, motos, camiones y deportivos) y un canal
  de 3 carriles con barcazas, neumáticos y palés. Arriba hay una fachada con **4 puertas**.
- **Entrega dirigida:** en cada momento solo **una** puerta está encendida (el pedido). Las demás
  están cerradas y no se puede entrar por ellas. Por eso la ruta se planifica hacia un objetivo
  concreto.
- **Acera superior segura:** se puede caminar por ella hasta la puerta encendida. Eso cuesta
  tiempo, y el tiempo cuesta propina.
- **Propina en lugar de cronómetro mortal:** cada entrega empieza con 300 de propina, que baja
  10 por segundo hasta 0. Quedarse sin propina **no mata**: solo puntúa menos.
- **Neumáticos que se hunden con el peso:** pisar un grupo de neumáticos activa su hundimiento.
  Es el jugador quien lo provoca, no un ciclo fijo.
- **Salto largo:** `Espacio` avanza dos filas de golpe, con 4 s de recarga.

El juego no tiene código de referencia ni assets: todo se dibuja por código. Usa la
infraestructura de SPEC 07–09 (`GAME_REGISTRY`, `GameCallbacks`, `GameEngine`) sin cambiarla.

`TRAVESÍA` es un juego **nuevo**. No es `ranaria`, la entrada mock del mismo género en
`lib/data.ts`, que se queda como está.

Este spec deja el juego jugable en `MODO DEMO`. El alta en la tabla `games` y el leaderboard van en
`game-jam/travesia/02-travesia-leaderboard`.

## Scope

**In:**

- **Catálogo (`lib/data.ts`):**
  - nueva entrada `travesia` en la **quinta posición** de `GAMES` (justo después de `snake`):
    title `TRAVESÍA`, cat `ARCADE`, color `yellow`, cover `cover-travesia`, `best: 0`,
    `plays: "0"` y los textos `short`/`long` fijados en Data model;
  - la entrada mock `ranaria` **se mantiene** sin cambios y sigue en `MODO DEMO`.
- **Portada nueva** `.cover-travesia` en `app/globals.css`, en el bloque
  `/* ===== Cover art generators (pure CSS) ===== */` y diseñada con `/frontend-design`. Solo CSS
  (fondos y pseudo-elementos, como `.cover-snake`), sin imágenes. Dibuja, de abajo arriba:
  - una franja de asfalto `#14141c` con una línea discontinua `#c0c0d0`;
  - un vehículo rectangular `#ff006e` con halo magenta sobre el asfalto;
  - una franja de agua `#04263a` con dos rayas de ola `rgba(0, 245, 255, 0.35)`;
  - una barcaza rectangular `#7a4a1e` sobre el agua;
  - arriba, una fachada `#1a1030` con cuatro puertas pequeñas: una amarilla `#f5ff00` con halo y
    tres `#3a2a5a`;
  - un cuadrado amarillo `#f5ff00` (Pipo) sobre la barcaza.
- **Sin assets externos:** no se crea `public/games/travesia/`. Todo se dibuja con la API 2D.
- **Motor** en `lib/games/travesia/`, en TypeScript y sin React ni globals:
  - `lanes.ts`: `LANES` (los 7 carriles con sus datos exactos) y las constantes de los carriles;
  - `engine.ts`: `createTravesiaEngine(canvas, callbacks)`.
- **Canvas y tablero:**
  - resolución lógica 800×600 (4:3), escalada por CSS al 100% de `.crt-screen`, sin bandas ni
    paneles;
  - banda HUD de 800×50 arriba (`y = 0…50`);
  - campo de 16 columnas × 11 filas de 50 px debajo (`y = 50…600`). La fila `r` ocupa
    `y = 50 + 50 × r … 100 + 50 × r` y la columna `c` tiene su centro en `x = 25 + 50 × c`.
- **Filas del campo** (de arriba abajo):

  | Fila | Zona            | Qué es                                           |
  | ---- | --------------- | ------------------------------------------------ |
  | 0    | Fachada         | Muro con 4 puertas en las columnas 1, 5, 10 y 14 |
  | 1    | Acera superior  | Segura                                           |
  | 2    | Canal           | Palés, hacia la derecha                          |
  | 3    | Canal           | Neumáticos que se hunden, hacia la izquierda     |
  | 4    | Canal           | Barcazas, hacia la derecha                       |
  | 5    | Acera central   | Segura                                           |
  | 6    | Carretera       | Deportivos, hacia la derecha                     |
  | 7    | Carretera       | Camiones, hacia la izquierda                     |
  | 8    | Carretera       | Motos, hacia la derecha                          |
  | 9    | Carretera       | Coches, hacia la izquierda                       |
  | 10   | Acera de salida | Segura; Pipo aparece en la columna 7 (`x = 375`) |

- **Carriles** (`LANES`). Cada carril tiene `count` unidades del mismo ancho, separadas
  `1200 / count` px. Todas recorren un circuito de 1200 px, de `x = −200` a `x = 1000` (borde
  izquierdo de la unidad), y reaparecen por el lado contrario al salir. La posición inicial de la
  unidad `i` es `offset + i × 1200 / count`, normalizada al circuito.

  | Fila | Tipo (`kind`) | Ancho (px) | Unidades | Sentido   | Velocidad base (px/s) | `offset` |
  | ---- | ------------- | ---------- | -------- | --------- | --------------------- | -------- |
  | 9    | `car`         | 70         | 3        | izquierda | 70                    | 0        |
  | 8    | `moto`        | 50         | 3        | derecha   | 110                   | 150      |
  | 7    | `truck`       | 140        | 2        | izquierda | 55                    | 300      |
  | 6    | `racer`       | 70         | 2        | derecha   | 150                   | 500      |
  | 4    | `barge`       | 200        | 2        | derecha   | 45                    | 100      |
  | 3    | `tires`       | 100        | 4        | izquierda | 60                    | 0        |
  | 2    | `pallet`      | 150        | 3        | derecha   | 80                    | 250      |

- **Movimiento de Pipo:**
  - una pulsación = un salto de una casilla, instantáneo; `e.repeat` se ignora, así que mantener
    una tecla pulsada no repite el salto;
  - `↑` sube una fila, `↓` baja una fila (como máximo hasta la fila 10), `←`/`→` mueven una
    columna;
  - en la carretera y las aceras la posición es una columna entera (0–15); un movimiento lateral
    que saldría de la columna 0 o 15 se ignora;
  - en el canal la posición horizontal es un número real `x` (centro de Pipo): un movimiento
    lateral suma o resta 50 px y se ignora si el centro quedaría por debajo de 25 o por encima de
    775;
  - al saltar entre filas del canal, o de una acera al canal, `x` se conserva;
  - al saltar del canal a una acera (fila 1 o 5), `x` se ajusta a la columna más cercana:
    `col = round((x − 25) / 50)`, limitada a 0–15;
  - subir desde la fila 1 a la fila 0 solo es posible si la columna de Pipo es la de la puerta
    encendida. En otra columna (muro o puerta cerrada) la pulsación se ignora.
- **Salto largo** con `Espacio`:
  - sube dos filas de golpe (`fila − 2`); la fila intermedia no cuenta para colisiones;
  - solo si la fila destino es ≥ 1. Desde las filas 1 y 2 se ignora;
  - tras usarlo se recarga durante 4.0 s; durante la recarga `Espacio` se ignora;
  - en `'ready'` y en `'dying'` se ignora (no arranca la partida).
- **Carretera:** la caja de colisión de Pipo es `[x − 16, x + 16]` en horizontal dentro de su
  fila. Si se solapa con un vehículo de su fila, Pipo muere **atropellado**. Se comprueba al
  aterrizar y en cada frame.
- **Canal:**
  - Pipo está a salvo si su centro `x` está dentro de `[x, x + ancho]` de una unidad flotante de
    su fila; si no, muere **ahogado**;
  - mientras está sobre una unidad, Pipo se desplaza con ella a su misma velocidad;
  - si el arrastre lleva su centro por debajo de 0 o por encima de 800, muere ahogado;
  - se comprueba al aterrizar y en cada frame.
- **Neumáticos que se hunden** (fila 3). Cada grupo tiene un estado:
  - `'float'`: flota. Si Pipo está sobre él, pasa a `'sinking'` con temporizador 0;
  - `'sinking'`: sigue flotando y sostiene a Pipo; a los `sinkDelay(nivel)` s pasa a `'sunk'`,
    aunque Pipo ya se haya ido;
  - `'sunk'`: es agua durante 2.0 s y después vuelve a `'float'`. Si Pipo está encima al hundirse,
    muere ahogado;
  - `sinkDelay(nivel) = max(0.6, 1.2 − 0.1 × (nivel − 1))` s: 1.2 s en el nivel 1 y 0.6 s desde el
    nivel 7.
- **Puertas y entregas:**
  - 4 puertas (índices 0–3, columnas 1, 5, 10 y 14), cada una `'pending'` o `'delivered'`;
  - la puerta encendida (`target`) se elige al azar entre las `'pending'`;
  - entrar por la puerta encendida es una **entrega**: suma puntos, la puerta pasa a
    `'delivered'`, Pipo vuelve a la columna 7 de la fila 10, la propina vuelve a 300, se vacían
    las filas puntuadas y se enciende otra puerta `'pending'` al azar;
  - con las 4 puertas entregadas se completa la **ruta**: suma el bonus, sube el nivel, las 4
    puertas vuelven a `'pending'` y se enciende una al azar.
- **Propina:**
  - `propina = max(0, 300 − 10 × floor(t))`, con `t` los segundos de `'playing'` desde el inicio
    de la entrega actual;
  - no corre en `'ready'`, en `'dying'` ni en pausa;
  - morir no la reinicia: al reaparecer sigue donde estaba;
  - llegar a 0 no hace perder vida.
- **Puntuación:**
  - avanzar a una fila de la 1 a la 9 que aún no se ha alcanzado en la entrega actual: **+10**.
    El salto largo puntúa la fila intermedia y la de destino, cada una solo si es nueva. Las filas
    ya puntuadas no vuelven a puntuar tras morir dentro de la misma entrega;
  - entrega: **`100 × nivel + propina`**, con el nivel y la propina del instante de la entrega;
  - ruta completa: **`1000 × nivel`** adicionales, con el nivel antes de subir.
- **Niveles:**
  - empieza en el nivel 1 y sube 1 por ruta completa, sin tope;
  - la velocidad de todos los carriles es `velocidad base × speedMult(nivel)`, con
    `speedMult(nivel) = min(1 + 0.15 × (nivel − 1), 2.2)`: 1.15 en el nivel 2 y tope 2.2 desde el
    nivel 9;
  - al subir de nivel los vehículos y plataformas no cambian de posición, solo de velocidad.
- **Vidas:** 3. Atropello o ahogamiento resta 1 al instante y pasa a `'dying'` durante 1.0 s; los
  carriles siguen moviéndose. Después, con vidas > 0, Pipo reaparece en la columna 7 de la fila 10
  con la misma puerta encendida; con 0 vidas, `'gameover'`. Sin vidas extra.
- **Inicio de partida:** estado `'ready'` con el tráfico y el canal en movimiento, Pipo quieto en
  la acera de salida y el texto `PULSA UNA FLECHA PARA EMPEZAR`. La primera pulsación de
  `↑`/`↓`/`←`/`→` o `W`/`A`/`S`/`D` pasa a `'playing'` y ejecuta ese movimiento (`↓` en la fila 10
  pasa a `'playing'` sin moverse).
- **Fin de partida:** la tercera muerte termina la animación de `'dying'` y pasa a `'gameover'` con
  `onGameOver(score)`. No hay victoria: las rutas se repiten con más velocidad.
- **Aspecto neón dibujado por código:**
  - fondo `#05050f`;
  - banda HUD `#0a0a18` con una línea inferior de 2 px `#f5ff00`;
  - fachada (fila 0) `#1a1030` con juntas de ladrillo `#2a1a48`; cada puerta es un rectángulo de
    40×44 centrado en su columna y apoyado en la base de la fila: `#3a2a5a` si está cerrada,
    `#f5ff00` con `shadowBlur` 12 y parpadeo cada 0.25 s entre `#f5ff00` y `#8a8a00` si es la
    encendida, `#00ff88` con una caja `#c8a060` de 16×14 dentro si está entregada;
  - aceras (filas 1, 5 y 10) `#2a2a3a` con juntas verticales `#3a3a4e` cada 50 px;
  - carretera (filas 6–9) `#14141c` con líneas discontinuas `#c0c0d0` (30 px de trazo, 20 px de
    hueco) entre carriles;
  - canal (filas 2–4) `#04263a` con dos rayas de ola `rgba(0, 245, 255, 0.25)` por fila;
  - vehículos de 36 px de alto, centrados en su fila, con faros `#f5ff00` de 6×6 en el frente y
    `shadowBlur` 10 de su color: `car` `#ff006e`, `moto` `#00f5ff`, `truck` `#ff7700`, `racer`
    `#aa00ff`;
  - barcaza `#7a4a1e` con borde de 3 px `#b07030`, 40 px de alto;
  - grupo de neumáticos: dos círculos de radio 22 (relleno `#222230`, borde de 4 px `#8888aa`);
    en `'sinking'` parpadean con `globalAlpha` 0.5 durante sus últimos 0.4 s; en `'sunk'` solo se
    dibuja un anillo `rgba(0, 245, 255, 0.4)`;
  - palé `#c8a060` con tres listones `#8a6a3a`, 36 px de alto;
  - Pipo, centrado en su `x` y en el centro de su fila: cuerpo 28×24 `#f5ff00`, cabeza 16×12
    `#ffd8b0`, gorra 18×6 `#ff006e` y caja 16×14 `#c8a060` delante, con `shadowBlur` 8 `#f5ff00`;
  - muerte por atropello: Pipo aplastado (elipse `#f5ff00` de 44×12 y la caja `#c8a060` partida
    en dos de 8×14) y el texto `¡PAPILLA!` en `#ff006e`;
  - muerte por ahogamiento: tres anillos `#00f5ff` que crecen desde Pipo y el texto `¡AL AGUA!` en
    `#00f5ff`.
- **Mensajes del campo**, centrados en `x = 400`, `y = 325` (acera central), `bold 28px monospace`:
  - `PULSA UNA FLECHA PARA EMPEZAR` en `#f5ff00` mientras dura `'ready'`;
  - `¡PAPILLA!` o `¡AL AGUA!` durante `'dying'`;
  - `¡ENTREGA! +N` en `#00ff88` durante 1.0 s tras una entrega (N = puntos de la entrega);
  - `¡RUTA COMPLETA! +N` en `#00ff88` durante 1.5 s tras completar una ruta (N = bonus de ruta);
    sustituye al de entrega.
- **HUD del canvas** en la banda superior, en todos los estados, `bold 18px monospace` centrado en
  `y = 25`:
  - `SCORE N` en `x = 16`, `#00f5ff`, con `toLocaleString("es-ES")` para coincidir con el HUD
    React;
  - `NIVEL NN` en `x = 230`, `#f5ff00`, con dos dígitos como el HUD React;
  - `PROPINA N` en `x = 380`, `#00ff88` (solo existe en el canvas);
  - `SALTO` en `x = 560`, `#e0e0ff`, y una barra de 60×10 en `x = 630`, `y = 20` con borde
    `#e0e0ff`: llena en `#00ff88` si el salto está listo y rellenándose en `#555570` durante la
    recarga;
  - vidas alineadas a la derecha en `x = 784`, `#ff006e`, con el mismo texto que el HUD React:
    `♥ ♥ ♥`, `♥ ♥`, `♥` o `—` con 0 vidas.
- **Overlay de fin** sobre el campo con fondo `rgba(0, 0, 0, 0.6)`: `GAME OVER` y debajo
  `Puntuación: N`, sin texto de reinicio. Queda visible detrás del modal.
- **Controles del motor:**
  - `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD` (por `e.code`)
    mueven a Pipo; `Space` hace el salto largo;
  - en `'ready'`, `'playing'` y `'dying'` hace `preventDefault` de las cuatro flechas y de `Space`
    para que la página no haga scroll; en `'dying'` las teclas no mueven a Pipo;
  - ignora el teclado y no hace `preventDefault` en pausa, en `'gameover'` o con el foco en un
    `input`/`textarea`/elemento editable;
  - sin ratón; `P`, `Escape` y el reinicio no existen dentro del motor.
- **Notificaciones:** `onScore`, `onLives`, `onLevel` y `onGameOver`, cada una solo cuando el valor
  cambia. TRAVESÍA no llama a `onLines`.
- **Componente** `components/games/travesia-canvas.tsx` (`"use client"`), con el mismo patrón que
  `arkanoid-canvas.tsx`: callbacks en una ref, `onReady(engine)`, `engine.start()` al montar y
  `destroy()` en el cleanup. Reenvía `onScore`, `onLives`, `onLevel` y `onGameOver`. El `<canvas>`
  tiene `width={800}`, `height={600}` y estilo `display: block`, `width: 100%`, `height: auto`.
- **Registro:** entrada `travesia` en `GAME_REGISTRY` con
  `hud: { lives: true, level: true, lines: false }`, sin `skins` y sin `pauseOverlay` (overlay
  "EN PAUSA" completo).
- **HUD React** de TRAVESÍA: Jugador, Puntuación, Vidas y Nivel. Sin Líneas y sin botón `TEMA`.
- `/biblioteca` muestra TRAVESÍA sin cambios en `components/library.tsx`: ya filtra por
  `GAME_REGISTRY`.
- `/juegos/travesia` y `/juegos/travesia/jugar` funcionan sin código nuevo (leen `GAMES`). Sin fila
  en `games`, el modal muestra `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.

**Out of scope (for future specs):**

- Fila en la tabla `games`, guardado de puntuaciones y leaderboard (van en
  `game-jam/travesia/02-travesia-leaderboard`).
- Sonido de cualquier tipo (no hay archivos de sonido disponibles).
- Controles táctiles, soporte para móvil y control con ratón.
- Skins o temas alternativos.
- Vidas extra por puntos, animación de salto entre casillas y salto largo lateral o hacia atrás.
- Objetos coleccionables en el campo, enemigos en las aceras o carriles que cambian de sentido.
- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el mock `ranaria`.
- Unificar los componentes canvas por juego en un canvas genérico.
- Anti-trampas, rate limiting, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES` y cargar el catálogo solo desde Supabase.

## Data model

```ts
// lib/games/registry.ts — entrada nueva
travesia: {
  Canvas: TravesiaCanvas,
  hud: { lives: true, level: true, lines: false },
},
```

```ts
// lib/games/travesia/lanes.ts
export type LaneKind =
  "car" | "moto" | "truck" | "racer" | "barge" | "tires" | "pallet";
export interface LaneDef {
  row: number; // fila del campo (2–4 canal, 6–9 carretera)
  kind: LaneKind;
  width: number; // px de cada unidad
  count: number; // unidades, separadas 1200 / count px
  dir: 1 | -1; // 1 derecha, −1 izquierda
  speed: number; // px/s en el nivel 1
  offset: number; // x inicial de la unidad 0
}
export const LANES: LaneDef[]; // los 7 carriles de la tabla de Scope
export const CIRCUIT_MIN_X = -200;
export const CIRCUIT_LENGTH = 1200;
export const RIVER_ROWS = [2, 3, 4];
export const ROAD_ROWS = [6, 7, 8, 9];
export const SAFE_ROWS = [1, 5, 10];
export const DOOR_COLS = [1, 5, 10, 14];
export const TIRES_RESURFACE = 2.0; // s que un grupo de neumáticos pasa hundido
export const speedMult = (level: number) =>
  Math.min(1 + 0.15 * (level - 1), 2.2);
export const sinkDelay = (level: number) =>
  Math.max(0.6, 1.2 - 0.1 * (level - 1));
```

```ts
// lib/games/travesia/engine.ts
export function createTravesiaEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

```ts
// lib/data.ts — nueva entrada, quinta posición de GAMES (después de "snake")
{
  id: "travesia",
  title: "TRAVESÍA",
  short: "Cruza el tráfico y el canal para entregar cada paquete.",
  long: "Eres Pipo, un repartidor con prisa. Avanza casilla a casilla entre coches, motos y camiones, salta a las barcazas, neumáticos y palés que flotan por el canal y entrega el paquete en la puerta encendida antes de que se esfume la propina. Los neumáticos se hunden con tu peso, el salto largo te ahorra un carril y cada ruta de 4 entregas acelera el tráfico. Tienes 3 vidas: que no te hagan papilla.",
  cat: "ARCADE",
  cover: "cover-travesia",
  color: "yellow",
  best: 0,
  plays: "0",
}
```

Constantes del motor:

| Constante           | Valor   | Significado                                   |
| ------------------- | ------- | --------------------------------------------- |
| `W` × `H`           | 800×600 | resolución lógica                             |
| `HUD_H`             | 50      | alto de la banda HUD                          |
| `CELL`              | 50      | lado de la casilla                            |
| `COLS` × `ROWS`     | 16×11   | campo                                         |
| `START_COL`         | 7       | columna de salida (`x = 375`)                 |
| `START_ROW`         | 10      | fila de salida                                |
| `LIVES`             | 3       | vidas por partida                             |
| `HALF_HITBOX`       | 16      | media anchura de la caja de Pipo en carretera |
| `ROW_POINTS`        | 10      | puntos por fila nueva                         |
| `DELIVERY_POINTS`   | 100     | × nivel por entrega                           |
| `ROUTE_POINTS`      | 1000    | × nivel por ruta completa                     |
| `TIP_START`         | 300     | propina al empezar cada entrega               |
| `TIP_PER_SECOND`    | 10      | propina que se pierde por segundo completo    |
| `JUMP_COOLDOWN`     | 4.0     | s de recarga del salto largo                  |
| `DYING_TIME`        | 1.0     | s de la animación de muerte                   |
| `DELIVERY_MSG_TIME` | 1.0     | s del mensaje `¡ENTREGA! +N`                  |
| `ROUTE_MSG_TIME`    | 1.5     | s del mensaje `¡RUTA COMPLETA! +N`            |

Estado interno del motor (cerrado dentro de `createTravesiaEngine`):

| Variable       | Tipo                                                                                    | Inicial                                    |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `state`        | `'ready' \| 'playing' \| 'dying' \| 'gameover'`                                         | `'ready'`                                  |
| `paused`       | `boolean`, solo lo escribe `setPaused`                                                  | `false`                                    |
| `score`        | `number`                                                                                | `0`                                        |
| `lives`        | `number`                                                                                | `3`                                        |
| `level`        | `number` (≥ 1)                                                                          | `1`                                        |
| `player`       | `{ row: number; x: number }` (`x` = centro en px)                                       | `{ row: 10, x: 375 }`                      |
| `scoredRows`   | `Set<number>` (filas puntuadas en la entrega actual)                                    | vacío                                      |
| `doors`        | `('pending' \| 'delivered')[]`, 4 elementos                                             | las 4 `'pending'`                          |
| `target`       | `number` (índice 0–3 de la puerta encendida)                                            | al azar entre 0 y 3                        |
| `deliveryTime` | `number` (s de `'playing'` en la entrega actual)                                        | `0`                                        |
| `jumpCooldown` | `number` (s restantes; 0 = listo)                                                       | `0`                                        |
| `units`        | `{ lane: number; x: number; sink: 'float' \| 'sinking' \| 'sunk'; sinkTime: number }[]` | posiciones iniciales de `LANES`, `'float'` |
| `dyingTime`    | `number` (s restantes de `'dying'`)                                                     | `0`                                        |
| `deathKind`    | `'squash' \| 'drown' \| null`                                                           | `null`                                     |
| `message`      | `{ text: string; color: string; remaining: number } \| null`                            | `null`                                     |
| `lastTime`     | `number \| null` (timestamp del frame anterior)                                         | `null`                                     |

Estado de React en `GamePlayer` para `travesia` (sin cambios en `GamePlayer`):

| Estado   | Lo escribe                                           | Lo lee                      |
| -------- | ---------------------------------------------------- | --------------------------- |
| `score`  | `onScore`                                            | HUD, modal, `saveScore`     |
| `lives`  | `onLives`; JUGAR DE NUEVO lo pone a 3                | HUD (Vidas)                 |
| `level`  | `onLevel`; JUGAR DE NUEVO lo pone a 1                | HUD (Nivel)                 |
| `over`   | `onGameOver`; JUGAR DE NUEVO lo vuelve `false`       | modal                       |
| `paused` | botón PAUSA, `P`/`Escape`, `blur`/`visibilitychange` | overlay, `engine.setPaused` |

Convenciones:

- Coordenadas lógicas 800×600 con origen arriba a la izquierda. El escalado lo hace solo el CSS.
- Fila `r` del campo en `y = 50 + 50 × r`; columna `c` con centro en `x = 25 + 50 × c`.
- Velocidades en px/s. `dt` en segundos, limitado a 0.05 s por frame.
- Orden de `update` en `'playing'`: mover unidades (con el envoltorio del circuito), arrastrar a
  Pipo si está en el canal, avanzar los estados de los neumáticos, comprobar colisiones, avanzar
  `deliveryTime`, `jumpCooldown` y `message`. En `'ready'` y `'dying'` solo se mueven unidades,
  neumáticos y mensajes (y en `'dying'` baja `dyingTime`).
- Al reanudar se reinicia `lastTime` y se descarta el tiempo de la pausa.
- En pausa y en `'gameover'` el loop sigue dibujando pero no llama a `update`.
- No hay teclas mantenidas ni cola de movimientos: cada `keydown` sin `repeat` es un salto. Por eso
  `setPaused` solo cambia `paused` (y reinicia `lastTime` al reanudar) y `restart` no tiene nada
  que vaciar.
- `restart()` deja `'ready'`, score 0, 3 vidas, nivel 1, Pipo en `(fila 10, x = 375)`, las 4
  puertas `'pending'` y una encendida al azar, `deliveryTime` 0, `jumpCooldown` 0, `scoredRows`
  vacío, unidades en sus posiciones iniciales y `'float'`, sin mensaje ni muerte. Notifica score,
  vidas y nivel solo si cambian.
- `end()` en `'ready'`, `'playing'` o `'dying'` pasa a `'gameover'` y dispara `onGameOver(score)`.
  En `'gameover'` no hace nada.
- `destroy()` cancela el rAF y quita el listener `keydown` de `window`.

## Implementation plan

1. Crear `lib/games/travesia/lanes.ts` con `LaneKind`, `LaneDef`, `LANES` (tabla de Scope) y las
   constantes y funciones de Data model. Todavía no se importa; `npm run build` compila.
2. Crear `lib/games/travesia/engine.ts` con las constantes, el estado inicial, las unidades de
   los carriles con su envoltorio, el movimiento de Pipo (normal y salto largo), las colisiones
   de carretera y canal, los neumáticos, la propina, las entregas, las rutas, los niveles, las
   vidas y `'dying'`, con notificaciones solo-al-cambiar. Todavía no se importa; compila.
3. Completar `createTravesiaEngine`:
   - `draw` con fondo, banda HUD, fachada y puertas, aceras, carretera, canal, unidades, Pipo,
     animaciones de muerte, mensajes y overlay de `'gameover'`;
   - loop rAF con `dt` limitado;
   - input `keydown` en `window` registrado en `start` y quitado en `destroy`;
   - `setPaused`, `end`, `restart` y `destroy`.

   Todavía no se importa; compila.

4. Crear `components/games/travesia-canvas.tsx` y registrar `travesia` en `GAME_REGISTRY` con
   `hud: { lives: true, level: true, lines: false }`. Todavía no hay entrada en `GAMES`; compila.
5. Diseñar con `/frontend-design` la clase `.cover-travesia` en `app/globals.css`, en el bloque de
   portadas, con los elementos fijados en Scope. Todavía no la usa nadie; compila.
6. Agregar la entrada `travesia` en la quinta posición de `GAMES`. Verificación: `/biblioteca`
   muestra TRAVESÍA quinta con su portada, y `/juegos/travesia/jugar` carga el juego real con
   `MODO DEMO` en el modal (aún no está en `games`).
7. Correr `npm run lint` y `npm run build` limpios.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/travesia/` contiene `engine.ts` y `lanes.ts`, y `public/games/travesia/` no
      existe.
- [ ] `grep -rn "document.getElementById" lib/games/travesia` no devuelve resultados.
- [ ] `lib/games/types.ts` y `components/game-player.tsx` no cambian.
- [ ] `/biblioteca` muestra `TRAVESÍA` como quinto juego, después de `ASTEROIDES`, `TETRIS`,
      `ARKANOID` y `SNAKE`, con la portada `.cover-travesia` (fachada con 4 puertas, una
      amarilla, canal con barcaza y carretera con un vehículo magenta).
- [ ] La entrada `ranaria` sigue en `GAMES` y `/juegos/ranaria/jugar` muestra el mock con
      `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.
- [ ] `/juegos/travesia` muestra la ficha con el título `TRAVESÍA` y el texto `long` del spec.
- [ ] `/juegos/travesia/jugar` muestra, dentro del marco CRT y con scanlines encima, la banda HUD,
      la fachada con 4 puertas (una parpadeando en amarillo), el canal con palés, neumáticos y
      barcazas, la carretera con 4 carriles de vehículos y a Pipo en la acera inferior.
- [ ] El canvas ocupa todo el ancho de la pantalla CRT sin bandas ni recortes.
- [ ] En `'ready'` los vehículos y plataformas se mueven, Pipo no, `PROPINA` se queda en 300 y se
      ve `PULSA UNA FLECHA PARA EMPEZAR`.
- [ ] El HUD React de TRAVESÍA muestra Jugador, Puntuación, Vidas (`♥ ♥ ♥`) y Nivel (`01`), y no
      muestra Líneas ni el botón `TEMA`.
- [ ] En todo momento, `SCORE`, `NIVEL` y las vidas del canvas coinciden con Puntuación, Nivel y
      Vidas del HUD React.
- [ ] Flechas y `WASD` mueven a Pipo una casilla por pulsación; mantener la tecla pulsada no lo
      mueve más de una casilla.
- [ ] Pulsar flechas o `Espacio` durante la partida no hace scroll en la página.
- [ ] El primer `↑` desde la acera de salida suma exactamente 10 a la Puntuación; bajar y volver a
      subir a esa fila no suma nada.
- [ ] Tocar un vehículo resta 1 a Vidas, muestra a Pipo aplastado con `¡PAPILLA!` y, 1 s después,
      Pipo reaparece en la acera de salida con la misma puerta encendida y la `PROPINA` que tenía.
- [ ] Caer al agua (fuera de una plataforma) resta 1 a Vidas y muestra `¡AL AGUA!`.
- [ ] Sobre una barcaza o un palé, Pipo se desplaza con ella; si lo arrastra fuera de la pantalla,
      muere ahogado.
- [ ] En el nivel 1, quedarse sobre un grupo de neumáticos lo hunde a los 1.2 s y Pipo muere
      ahogado; el grupo reaparece 2 s después.
- [ ] Saltar de un grupo de neumáticos a otra fila antes de 1.2 s salva a Pipo, y el grupo se hunde
      igualmente.
- [ ] `PROPINA` empieza en 300, baja 10 por cada segundo de juego, se queda en 0 y no resta vidas.
- [ ] En la acera superior, `↑` frente a una puerta cerrada o frente al muro no mueve a Pipo.
- [ ] En el nivel 1, entrar por la puerta encendida suma exactamente `100 + P` (P = valor de
      `PROPINA` justo antes de entrar), muestra `¡ENTREGA! +N`, pinta esa puerta en verde con una
      caja, devuelve a Pipo a la acera de salida, `PROPINA` vuelve a 300 y se enciende otra
      puerta.
- [ ] Desde la acera de salida, `Espacio` (ya en `'playing'`) sube a Pipo a la fila 8 y suma 20 si
      las filas 9 y 8 son nuevas; la barra `SALTO` se vacía y tarda 4 s en volver a estar llena;
      durante la recarga y desde las filas 1 y 2 `Espacio` no hace nada.
- [ ] Tras la cuarta entrega, la Puntuación suma además 1000, se ve `¡RUTA COMPLETA! +1000`,
      Nivel pasa de `01` a `02`, las cuatro puertas vuelven a estar cerradas salvo una encendida y
      los carriles van 1,15 veces más rápido.
- [ ] Perder la tercera vida abre, tras la animación de 1 s, el modal "FIN DEL JUEGO" con la misma
      puntuación del HUD, y detrás el canvas muestra `GAME OVER` y `Puntuación: N`, sin texto de
      reinicio.
- [ ] Sin fila en `games`, el modal muestra `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.
- [ ] El botón PAUSA, `P` y `Escape` congelan el tráfico, el canal, la propina y la recarga del
      salto, y muestran el overlay "EN PAUSA" a pantalla completa.
- [ ] En pausa, flechas, `WASD` y `Espacio` no mueven a Pipo.
- [ ] Al reanudar después de una pausa larga, ningún vehículo ni plataforma salta de posición.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón mostrando "REANUDAR".
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar detrás.
- [ ] Con el modal abierto, flechas, `WASD` y `Espacio` no mueven a Pipo.
- [ ] JUGAR DE NUEVO deja a Pipo en la acera de salida, el texto de inicio, las 4 puertas cerradas
      salvo una encendida, `PROPINA 300` y el HUD en Puntuación 0, Vidas `♥ ♥ ♥` y Nivel `01`.
- [ ] Tras SALIR y volver a entrar a `/juegos/travesia/jugar` tres veces, el tráfico va a la misma
      velocidad que la primera vez y cada pulsación mueve a Pipo una sola casilla (sin listeners
      ni loops duplicados).
- [ ] ASTEROIDES, TETRIS, ARKANOID y SNAKE se juegan igual que antes.
- [ ] La consola del navegador no muestra errores durante una partida completa de TRAVESÍA.

## Decisions

- **Yes:** juego `TRAVESÍA` con `id: "travesia"`. Razón: decidido por el agente game-jam (tema
  "Cruza la carretera y el río sin convertirte en papilla."); una sola palabra en español, como
  el resto del catálogo, que nombra el acto de cruzar sin aludir a ningún juego comercial.
- **No:** `cruzacalles`, `papilla` o `reparto`. Razón: decidido por el agente game-jam (tema
  "Cruza la carretera y el río sin convertirte en papilla."); `papilla` suena a derrota y los
  otros dos son menos claros como título.
- **Yes:** diseño original del género "cruzar carriles": repartidor, 4 puertas con una sola
  encendida, acera superior segura, propina, neumáticos que se hunden con el peso y salto largo.
  Razón: decidido por el agente game-jam (tema "Cruza la carretera y el río sin convertirte en
  papilla."); el encargo pide expresamente no recrear Frogger (ni su nombre, ni una rana, ni su
  arte, niveles o aspecto).
- **No:** una rana, un pollo o un animal como protagonista. Razón: decidido por el agente game-jam
  (tema "Cruza la carretera y el río sin convertirte en papilla."); remitiría a juegos
  comerciales concretos.
- **No:** 5 metas con cronómetro que mata al agotarse. Razón: decidido por el agente game-jam
  (tema "Cruza la carretera y el río sin convertirte en papilla."); es la estructura del juego
  que no se quiere copiar. La propina mantiene la presión sin castigo de vida.
- **Yes:** 4 puertas en las columnas 1, 5, 10 y 14. Razón: decidido por el agente game-jam (tema
  "Cruza la carretera y el río sin convertirte en papilla."); en 16 columnas solo un número par
  de puertas queda simétrico.
- **Yes:** solo la puerta encendida acepta la entrega y las demás bloquean. Razón: decidido por el
  agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); obliga a
  planificar la ruta hacia un objetivo y no castiga con muerte un error de columna.
- **Yes:** acera superior segura. Razón: decidido por el agente game-jam (tema "Cruza la carretera
  y el río sin convertirte en papilla."); con una sola puerta válida, morir por llegar a una
  columna equivocada sería frustrante; caminar cuesta propina.
- **Yes:** propina `max(0, 300 − 10 × floor(t))`, que no se reinicia al morir. Razón: decidido por
  el agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); premia la
  rapidez en el leaderboard; si se reiniciara, morir regalaría propina.
- **Yes:** las filas puntuadas no vuelven a puntuar tras morir en la misma entrega. Razón: decidido
  por el agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); evita
  sumar puntos muriendo a propósito en la primera fila.
- **Yes:** puntos `+10` por fila nueva, `100 × nivel + propina` por entrega y `1000 × nivel` por
  ruta. Razón: decidido por el agente game-jam (tema "Cruza la carretera y el río sin convertirte
  en papilla."); en el nivel 10 una ruta vale unos 15.000 puntos, muy lejos del tope de
  10.000.000 de `scores`.
- **Yes:** neumáticos que se hunden `sinkDelay(nivel)` s después de pisarlos y vuelven a los 2 s.
  Razón: decidido por el agente game-jam (tema "Cruza la carretera y el río sin convertirte en
  papilla."); el peligro lo provoca el jugador, lo que lo distingue de las plataformas con ciclo
  fijo.
- **Yes:** salto largo de dos filas con `Espacio` y 4 s de recarga, solo hacia delante y solo si
  la fila destino es ≥ 1. Razón: decidido por el agente game-jam (tema "Cruza la carretera y el
  río sin convertirte en papilla."); añade una decisión táctica sin permitir saltar dentro de la
  fachada.
- **No:** animación de salto entre casillas. Razón: decidido por el agente game-jam (tema "Cruza
  la carretera y el río sin convertirte en papilla."); con movimiento instantáneo las colisiones
  son exactas y el motor es más corto.
- **Yes:** `e.repeat` ignorado: una pulsación = un salto. Razón: decidido por el agente game-jam
  (tema "Cruza la carretera y el río sin convertirte en papilla."); la autorrepetición lanzaría a
  Pipo contra el tráfico.
- **Yes:** carretera de 4 carriles y canal de 3, con 3 aceras seguras. Razón: decidido por el
  agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); llena
  exactamente 11 filas de 50 px bajo la banda HUD en 800×600.
- **Yes:** circuito de 1200 px (`x = −200 … 1000`). Razón: la unidad más ancha mide 200 px, así
  que nunca aparece ni desaparece dentro de la pantalla.
- **Yes:** velocidad `min(1 + 0.15 × (nivel − 1), 2.2)` y 3 vidas sin vidas extra. Razón: decidido
  por el agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); el tope
  mantiene el juego jugable y las vidas extra quedan para otro spec.
- **Yes:** estado `'ready'` que espera la primera flecha, con el tráfico ya en marcha. Razón:
  decidido por el agente game-jam (tema "Cruza la carretera y el río sin convertirte en
  papilla."); como en SNAKE, el jugador sitúa las manos sin perder propina.
- **Yes:** estado `'dying'` de 1.0 s con `¡PAPILLA!` o `¡AL AGUA!`. Razón: decidido por el agente
  game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); la muerte por
  atropello muestra literalmente la papilla del tema.
- **Yes:** categoría `ARCADE`, color `yellow`, quinta posición en `GAMES`. Razón: decidido por el
  agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); es un arcade
  de reflejos, el amarillo es el de la chaqueta de Pipo y los juegos reales van primero. Efecto
  colateral aceptado: el home (`GAMES.slice(0, 6)`) muestra ASTEROIDES, TETRIS, ARKANOID, SNAKE,
  TRAVESÍA y BLOQUE BUSTER, y `caida` sale de la vista previa.
- **Yes:** convivir con el mock `ranaria`. Razón: decidido por el agente game-jam (tema "Cruza la
  carretera y el río sin convertirte en papilla."); es el comportamiento por defecto
  (`caida`/`tetris`, `bloque-buster`/`arkanoid`) y `ranaria` tiene protagonista, metas y
  mecánica distintos.
- **No:** reemplazar `ranaria`. Razón: decidido por el agente game-jam (tema "Cruza la carretera y
  el río sin convertirte en papilla."); solo se reemplaza un mock casi idéntico, y TRAVESÍA evita
  a propósito la rana y los nenúfares.
- **Yes:** portada nueva `.cover-travesia` diseñada con `/frontend-design`. Razón: decidido por el
  agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); `.cover-rana`
  dibuja una rana verde y ninguna otra portada muestra carretera y agua.
- **No:** reusar `.cover-rana`. Razón: su círculo verde es la rana que el encargo excluye.
- **Yes:** canvas de 800×600 sin bandas ni paneles. Razón: ya es 4:3 como `.crt-screen`.
- **Yes:** todo dibujado por código, sin `public/games/travesia/`. Razón: decidido por el agente
  game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); en
  `references/source-assets/` solo hay `snake-assets`, que no sirve para este juego.
- **Yes:** sonido fuera de alcance. Razón: no hay archivos de sonido disponibles.
- **Yes:** HUD del canvas con `SCORE`, `NIVEL`, `PROPINA`, `SALTO` y vidas. Razón: decidido por el
  agente game-jam (tema "Cruza la carretera y el río sin convertirte en papilla."); propina y
  salto solo existen en el canvas y los demás coinciden con el HUD React como en los otros
  juegos.
- **Yes:** `SCORE` con `toLocaleString("es-ES")`, `NIVEL` con dos dígitos y vidas con el mismo
  texto que React (`—` con 0). Razón: así coinciden con el HUD React.
- **Yes:** `hud: { lives: true, level: true, lines: false }` y overlay de pausa completo (sin
  `pauseOverlay`). Razón: decidido por el agente game-jam (tema "Cruza la carretera y el río sin
  convertirte en papilla."); hay vidas y niveles, no hay líneas y la pausa no tiene interacción.
- **No:** ratón. Razón: no aporta en un movimiento por casillas.
- **No:** `P`/`Escape` ni reinicio dentro del motor. Razón: la pausa y el reinicio son de
  `GamePlayer`, como en SPEC 05.
- **Yes:** usar el registro y el contrato de SPEC 07–09 sin cambiar `lib/games/types.ts` ni
  `GamePlayer`. Razón: `onLives`, `onLevel` y `hud.lives` ya existen (ARKANOID los usa).
- **Yes:** dos specs: el juego (este) y el alta en Supabase con el leaderboard (02). Razón:
  formato de la game jam; este spec deja el juego jugable en `MODO DEMO`.
- **Yes:** `dt` limitado a 0.05 s y `lastTime` reiniciado al reanudar. Razón: una pausa o una
  pestaña lenta no teletransportan vehículos ni plataformas.

## Risks

| Riesgo                                                                                                       | Mitigación                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode (dev) crea dos motores.                                                                    | `destroy()` cancela el rAF y quita el `keydown`; el criterio de las tres navegaciones lo valida.                                                  |
| `WASD` o `Espacio` chocan con escribir el nombre en el modal.                                                | El motor ignora el teclado en `'gameover'` y con el foco en `input`/`textarea`/elemento editable.                                                 |
| Tras pulsar PAUSA/REANUDAR con el ratón, el botón queda con foco y `Espacio` (salto largo) podría activarlo. | El motor hace `preventDefault` de `Space` en juego. Si algún navegador lo activa igualmente, se acepta como en TETRIS, que también usa `Espacio`. |
| Con `dt` de 0.05 s, un vehículo rápido (2.2 × 150 = 330 px/s) avanza 16.5 px por frame.                      | La caja de Pipo mide 32 px y la comprobación es por solapamiento en cada frame: no se atraviesa.                                                  |
| Un hueco en el canal puede ser demasiado largo y obligar a esperar.                                          | Aceptado; la espera se paga en propina, no en vidas, y la acera central es segura.                                                                |
| El ajuste de columna al pisar una acera desde el canal mueve a Pipo hasta 25 px.                             | Aceptado; es necesario para volver a la grilla y entrar por las puertas.                                                                          |
| La puerta encendida al azar puede repetir lado varias veces seguidas.                                        | Aceptado; siempre es una de las `'pending'` y una ruta tiene 4 puertas distintas.                                                                 |
| Escalar 800×600 por CSS desenfoca el texto del canvas en pantallas pequeñas.                                 | Aceptado, igual que en SPEC 05, 07, 08 y 09.                                                                                                      |
| La portada `.cover-travesia` depende de `/frontend-design` en la implementación.                             | El Scope fija qué elementos y colores dibuja; el criterio de `/biblioteca` los comprueba.                                                         |

## Lo que **no** está en este spec

- Fila en `games`, guardado de puntuaciones y leaderboard (van en el spec 02 de esta jam).
- Sonido.
- Controles táctiles, soporte para móvil o ratón.
- Skins.
- Vidas extra, animación de salto, salto largo lateral o hacia atrás.
- Coleccionables, enemigos en las aceras o carriles que cambian de sentido.
- Cambios en el contrato común, en `GamePlayer` o en el mock `ranaria`.
- Un canvas genérico que unifique los componentes por juego.
- Anti-trampas, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES`.

Cada uno de esos, si se implementa, va en su propio spec futuro.
