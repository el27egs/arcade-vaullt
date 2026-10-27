# SPEC 07 — TETRIS: segundo juego real, registro de juegos y leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 05 (asteroides-juego-real), SPEC 06 (leaderboard-y-catalogo-supabase)
> **Date:** 2026-10-26
> **Objective:** Portar `references/started-games/03-tetris/` a un `<canvas>` en
> `/juegos/tetris/jugar` como el juego nuevo `TETRIS`, introducir el registro genérico de juegos
> y darlo de alta en la tabla `games` para que guarde puntuaciones y aparezca en el leaderboard.

## Por qué existe este spec

SPEC 05 integró ASTEROIDES con una condición `game.id === "asteroides"` en `GamePlayer` y dejó el
registro genérico de juegos "para el segundo juego". SPEC 06 creó la tabla `games` con un solo
juego real. TETRIS es ese segundo juego, así que este spec hace las tres cosas a la vez:

- **Juego:** porta el Tetris de referencia a un motor TypeScript con la misma frontera que
  ASTEROIDES: el juego vive en el canvas, React controla y el juego notifica.
- **Registro:** sustituye la condición por juego en `GamePlayer` por un registro `id → canvas`,
  con un contrato común para todos los motores.
- **Leaderboard:** inserta `tetris` en `games`. Con eso el guardado, `/juegos`, el salón de la
  fama, la actividad del home y el detalle funcionan sin código nuevo.

El Tetris original depende del DOM: el canvas `#board` (300×600), un segundo canvas
`#next-canvas`, un panel HTML con `SCORE`/`LINES`/`LEVEL`, un overlay HTML de pausa y game over,
un botón `Reiniciar`, un selector de tema claro/oscuro guardado en `localStorage`, la tecla `P`
para pausar y un listener en `document` que nunca se quita. Todo eso se transforma o se elimina.

`TETRIS` es un juego **nuevo**. No es `caida`, la entrada mock parecida de `lib/data.ts`, que se
queda como está.

## Scope

**In:**

- **Contrato común** en `lib/games/types.ts`: `GameCallbacks`, `GameEngine`, `GameHud` y
  `GameCanvasProps` (ver Data model).
- **Registro genérico** en `lib/games/registry.ts`: `GAME_REGISTRY`, que mapea `id` a su
  componente canvas y a los valores que muestra el HUD React. Contiene `asteroides` y `tetris`.
- **ASTEROIDES adaptado al contrato común**, sin cambiar su comportamiento:
  - `createAsteroidesEngine` recibe `GameCallbacks` y devuelve `GameEngine`;
  - `AsteroidesCallbacks` y `AsteroidesEngine` se eliminan en favor de los tipos comunes;
  - `components/games/asteroides-canvas.tsx` se conserva y tipa sus props con `GameCanvasProps`.
- **`GamePlayer`** (`components/game-player.tsx`) usa `GAME_REGISTRY[game.id]` en lugar de
  `isAsteroides`:
  - con entrada en el registro, renderiza su `Canvas` dentro de `.crt-screen`, desactiva el mock
    y activa los listeners de `P`/`Escape` y `blur`/`visibilitychange`;
  - sin entrada, conserva el mock actual sin cambios;
  - el HUD React muestra Vidas, Nivel y Líneas según `hud` de la entrada. Los juegos mock siguen
    mostrando Vidas y Nivel como hoy;
  - nuevo estado `lines`, escrito por `onLines` y puesto a 0 por JUGAR DE NUEVO.
- **Nueva entrada `tetris` en `GAMES`** (`lib/data.ts`), en la **segunda posición** (justo
  después de `asteroides`): title `TETRIS`, cat `PUZZLE`, color `magenta`, cover `cover-tetro`
  (se reusa la clase existente), `best: 0`, `plays: "0"` y textos `short`/`long` en español que
  describan el juego real (8 piezas incluida la tuerca, pieza fantasma, niveles cada 10 líneas).
- La entrada mock `caida` **se mantiene** sin cambios. Es otro juego y sigue en `MODO DEMO`.
- **Ampliación durante la implementación: `/biblioteca` solo lista juegos implementados.**
  `components/library.tsx` filtra `GAMES` por los ids de `GAME_REGISTRY`. Hoy muestra
  `ASTEROIDES` y `TETRIS`; cada juego que se registre aparece solo. La vista previa del home, el
  detalle y el reproductor de los mock no cambian.
- **Ampliación durante la implementación: se elimina la página `/juegos`.** La biblioteca ya
  lista solo los juegos implementados, así que la tabla de juegos de SPEC 06 sobra:
  - se borran `app/juegos/page.tsx`, `components/games-table.tsx` y las reglas `.games-table`
    de `app/globals.css`;
  - se quita el enlace `JUEGOS` del nav, en desktop y en el menú móvil;
  - `Biblioteca` queda activo en `/biblioteca` y en `/juegos/*` (detalle y reproductor);
  - `/juegos/[id]` y `/juegos/[id]/jugar` se mantienen; `/juegos` responde 404.
- **Ampliación durante la implementación: skins de TETRIS.**
  - Tres skins: `dark` (tema oscuro del original, por defecto), `light` (tema claro del
    original, con sus colores exactos de `style.css`) y `neon` (paleta de Arcade Vault, con
    halo en los bloques).
  - El contrato común suma `GameEngine.setSkin?(skin)` y `GameSkins`; la entrada del registro
    declara `skins` opcional. TETRIS los declara; ASTEROIDES no.
  - `GamePlayer` muestra un botón `TEMA: OSCURO | CLARO | NEÓN` en el HUD, solo si el juego
    declara skins. Cada pulsación pasa al siguiente skin y redibuja el canvas al instante.
  - El skin elegido se guarda en `localStorage["tetris-theme"]`, la misma clave del original, y
    se recupera al volver a entrar. Un valor inválido o ausente usa `dark`.
- **Motor** en `lib/games/tetris/engine.ts`, sin dependencias de React. Conserva tal cual del
  original:
  - tablero de 10×20 con celdas de 30 px;
  - las 8 piezas (`I`, `O`, `T`, `S`, `Z`, `J`, `L` y la tuerca `N`), elegidas al azar con
    probabilidad uniforme, con sus colores;
  - rotación horaria con wall kicks `[0, -1, 1, -2, 2]`;
  - pieza fantasma con `globalAlpha = 0.2` y el brillo superior de cada bloque;
  - puntos: `[0, 100, 300, 500, 800]` por 1–4 líneas × nivel, +1 por fila de soft drop y +2 por
    celda de hard drop;
  - nivel `floor(lines / 10) + 1` y caída cada `max(100, 1000 − (nivel − 1) × 90)` ms;
  - fin de partida cuando una pieza nueva colisiona al aparecer.
- **Aspecto:** colores del tema oscuro del original (fondo `#0f0f17`, tablero `#1a1a25`, borde
  `#2a2a3a`, cuadrícula `#22222e`, etiquetas `#555570`, texto `#e0e0e0`). El color de la
  cuadrícula es una constante; ya no se lee con `getComputedStyle`.
- **Canvas de 800×600** escalado por CSS al 100% de `.crt-screen`, con todo dibujado dentro:
  - tablero de 300×600 centrado horizontalmente (x de 250 a 550);
  - panel derecho con `SCORE`, `LINES`, `LEVEL` y `NEXT` (vista previa de 120×120), como el
    panel HTML del original;
  - panel izquierdo con la lista `CONTROLS` del original (`← →` mover, `↑` rotar, `↓` bajar,
    `Space` caída, `P` pausa);
  - el `SCORE` del canvas se formatea con `toLocaleString("es-ES")`, igual que el HUD React.
- **Overlay `GAME OVER`** dibujado en el canvas, con `GAME OVER` y `Puntuación: N`, sin botón ni
  texto de reinicio. Queda visible detrás del modal.
- **Pausa sin overlay propio en el canvas.** La pausa la muestra el overlay "EN PAUSA" de
  `GamePlayer`.
- **Controles del motor:** `←`/`→` mueven, `↑` o `X` rotan, `↓` hace soft drop y `Espacio` hace
  hard drop. Se conserva la autorrepetición del teclado, como en el original. En partida hace
  `preventDefault` de `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space`.
- **Se eliminan del original:** la tecla `P` del motor, el botón `Reiniciar`, el overlay HTML,
  el panel HTML y el segundo canvas. El selector de tema pasa al HUD React (ver la ampliación
  de skins).
- **Notificaciones:** `onScore`, `onLines`, `onLevel` y `onGameOver`, cada una solo cuando el
  valor cambia. TETRIS no llama a `onLives`.
- **Componente** `components/games/tetris-canvas.tsx` (`"use client"`), con el mismo patrón que
  `asteroides-canvas.tsx`: callbacks en una ref, `onReady(engine)`, `engine.start()` al montar y
  `destroy()` en el cleanup.
- **Supabase:** migración `supabase/migrations/20261026000200_seed_tetris.sql` que inserta
  `('tetris', 'TETRIS', 'PUZZLE')` en `public.games`, aplicada con `apply_migration` (nombre
  `seed_tetris`). Sin cambios de esquema ni de `lib/supabase/database.types.ts`. No se siembra
  ninguna puntuación.
- **Leaderboard**, sin código nuevo, gracias a la fila en `games`:
  - `/juegos/tetris/jugar` recibe `canSave = true`; el modal muestra el input y GUARDAR
    PUNTUACIÓN;
  - `saveScore` inserta en `scores` con `game_id = 'tetris'`;
  - `/salon-de-la-fama` añade la pestaña `TETRIS` y sus puntajes entran en `GLOBAL`;
  - el home muestra sus puntajes en `▸ ÚLTIMAS PUNTUACIONES` y `▸ TOP JUGADORES`;
  - `/juegos/tetris` muestra su mini-tabla real y `best`/`plays` de Supabase.

**Out of scope (for future specs):**

- Controles táctiles o soporte para móvil.
- Portada CSS propia para `tetris` (se reusa `.cover-tetro`).
- Eliminar, modificar o hacer jugable la entrada mock `caida`.
- Quitar los mock de la vista previa de juegos del home o borrarlos de `GAMES`.
- Sonido.
- Generador de piezas tipo "bolsa de 7", hold de pieza o más de una pieza en la vista previa.
- Unificar `asteroides-canvas.tsx` y `tetris-canvas.tsx` en un canvas genérico.
- Portar `04-arkanoid` u otros juegos de `references/started-games/`.
- Anti-trampas, rate limiting, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES` y cargar el catálogo solo desde Supabase.

## Data model

```ts
// lib/games/types.ts
// Juego → React: notificaciones. Solo se invocan cuando el valor cambia.
export interface GameCallbacks {
  onScore(score: number): void;
  onLives?(lives: number): void;
  onLevel?(level: number): void;
  onLines?(lines: number): void;
  onGameOver(finalScore: number): void; // por condición de fin o por end()
}

// React → Juego: órdenes. El juego nunca cambia su pausa por iniciativa propia.
export interface GameEngine {
  start(): void; // registra input y arranca el loop rAF
  setPaused(paused: boolean): void; // única vía para pausar o reanudar
  end(): void; // FIN manual: congela y dispara onGameOver(score)
  restart(): void; // estado inicial del juego
  destroy(): void; // cancela rAF y quita todos los listeners
}

// Qué muestra el HUD React además de la Puntuación.
export interface GameHud {
  lives: boolean;
  level: boolean;
  lines: boolean;
}

export interface GameCanvasProps extends GameCallbacks {
  onReady(engine: GameEngine): void;
}
```

```ts
// lib/games/registry.ts
export interface GameRegistryEntry {
  Canvas: ComponentType<GameCanvasProps>;
  hud: GameHud;
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroides: {
    Canvas: AsteroidesCanvas,
    hud: { lives: true, level: true, lines: false },
  },
  tetris: {
    Canvas: TetrisCanvas,
    hud: { lives: false, level: true, lines: true },
  },
};
```

```ts
// lib/games/tetris/engine.ts
export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

```ts
// lib/data.ts — nueva entrada, segunda posición de GAMES
{
  id: "tetris",
  title: "TETRIS",
  short: "...", // texto en español del juego real
  long: "...",
  cat: "PUZZLE",
  cover: "cover-tetro",
  color: "magenta",
  best: 0,
  plays: "0",
}
```

```sql
-- supabase/migrations/20261026000200_seed_tetris.sql
insert into public.games (id, title, category)
values ('tetris', 'TETRIS', 'PUZZLE');
```

Estado de React en `GamePlayer` para `tetris`:

| Estado   | Lo escribe                                           | Lo lee                      |
| -------- | ---------------------------------------------------- | --------------------------- |
| `score`  | `onScore`                                            | HUD, modal, `saveScore`     |
| `lines`  | `onLines`; JUGAR DE NUEVO lo pone a 0                | HUD (si `hud.lines`)        |
| `level`  | `onLevel`                                            | HUD (si `hud.level`)        |
| `over`   | `onGameOver`; JUGAR DE NUEVO lo vuelve `false`       | modal                       |
| `paused` | botón PAUSA, `P`/`Escape`, `blur`/`visibilitychange` | overlay, `engine.setPaused` |

Convenciones:

- Coordenadas lógicas 800×600 con origen arriba a la izquierda. El escalado lo hace solo el CSS.
- Estado del tablero: matriz `ROWS × COLS`; `0` vacío, `1–8` índice de color de la pieza.
- Pieza: `{ type, shape, x, y }`, con `shape` como matriz 2D.
- `dt` en ms, limitado a 50 ms por frame. Al reanudar se reinicia `lastTime` y se descarta el
  tiempo de la pausa.
- Estado interno del juego: `'playing' | 'gameover'`, más el flag `paused` que solo escribe
  `setPaused`.
- `restart()` deja tablero vacío, score 0, líneas 0, nivel 1, caída de 1000 ms y nuevas
  pieza actual y siguiente.

## Implementation plan

1. Crear `lib/games/types.ts` con el contrato común. Adaptar `lib/games/asteroides/engine.ts`
   y `components/games/asteroides-canvas.tsx` a `GameCallbacks`, `GameEngine` y
   `GameCanvasProps`, y borrar `AsteroidesCallbacks`/`AsteroidesEngine`. Verificación:
   `npm run build` compila y ASTEROIDES se juega igual.
2. Crear `lib/games/registry.ts` con la entrada `asteroides`. En `GamePlayer`, sustituir
   `isAsteroides` por `GAME_REGISTRY[game.id]`, renderizar `entry.Canvas` y mostrar el HUD según
   `entry.hud` (Vidas y Nivel siempre para los mock). Verificación: ASTEROIDES se juega, pausa y
   guarda igual; `/juegos/caida/jugar` sigue con el mock.
3. Añadir el estado `lines` y el callback `onLines` en `GamePlayer`, con la stat Líneas en el
   HUD cuando `hud.lines` es `true`. JUGAR DE NUEVO lo pone a 0. Ningún juego la usa todavía;
   compila.
4. Crear `lib/games/tetris/engine.ts` con constantes, piezas, colores, `collide`, `rotateCW`,
   `tryRotate`, `merge`, `clearLines`, `ghostY` y el dibujo de bloques portados del original.
   Todavía no se importa; compila.
5. Completar `createTetrisEngine`:
   - `update` con caída por `dropAccum`, soft drop, hard drop, bloqueo y aparición de piezas;
   - `draw` con el tablero centrado, la pieza fantasma, los paneles laterales y el overlay
     `GAME OVER`;
   - loop rAF;
   - input registrado en `start` y quitado en `destroy`;
   - notificaciones solo-al-cambiar;
   - `setPaused`, `end`, `restart` y `destroy`.
6. Crear `components/games/tetris-canvas.tsx` y registrar `tetris` en `GAME_REGISTRY` con
   `hud: { lives: false, level: true, lines: true }`. Todavía no hay entrada en `GAMES`; compila.
7. Agregar la entrada `tetris` en la segunda posición de `GAMES`. Verificación: `/biblioteca` la
   muestra segunda y `/juegos/tetris/jugar` carga el juego real en `MODO DEMO` (aún no está en
   `games`).
8. Crear `supabase/migrations/20261026000200_seed_tetris.sql` y aplicarla con
   `apply_migration` (nombre `seed_tetris`). Verificación: `select * from games_with_stats`
   devuelve `tetris` con `best = 0` y `plays = 0`, y el modal de TETRIS ya muestra el input.
9. Correr `npm run lint` y `npm run build` limpios.
10. Ampliación: filtrar `/biblioteca` por `GAME_REGISTRY` en `components/library.tsx`.
11. Ampliación: borrar la página `/juegos`, su tabla y su CSS, y quitar `JUEGOS` del nav.
12. Ampliación: skins `dark`/`light`/`neon` en el motor de TETRIS, `setSkin` y `GameSkins` en el
    contrato, y el botón `TEMA` en `GamePlayer` con `localStorage["tetris-theme"]`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/types.ts` y `lib/games/registry.ts` existen, y
      `grep -rnw "isAsteroides\|AsteroidesEngine\|AsteroidesCallbacks" app components lib` no
      devuelve resultados.
- [ ] `/biblioteca` muestra `TETRIS` como segundo juego, después de `ASTEROIDES`, con la portada
      `.cover-tetro`.
- [ ] `/biblioteca` muestra solo `ASTEROIDES` y `TETRIS`; los juegos mock no aparecen.
- [ ] El nav no muestra `JUEGOS` ni en desktop ni en el menú móvil, y `/juegos` responde 404.
- [ ] En `/juegos/tetris` y `/juegos/tetris/jugar` el enlace activo del nav es `Biblioteca`.
- [ ] La entrada `caida` sigue en `GAMES` y su `/juegos/caida/jugar` muestra el mock con
      `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.
- [ ] `/juegos/tetris/jugar` muestra, dentro del marco CRT y con scanlines encima, el tablero
      10×20 centrado, el panel `SCORE`/`LINES`/`LEVEL`/`NEXT` a la derecha y `CONTROLS` a la
      izquierda.
- [ ] El HUD React de TETRIS muestra Jugador, Puntuación, Líneas y Nivel, y no muestra Vidas.
- [ ] En todo momento, `SCORE`, `LINES` y `LEVEL` del canvas coinciden con Puntuación, Líneas y
      Nivel del HUD React.
- [ ] `←`/`→` mueven la pieza, `↑` y `X` la rotan, `↓` la baja una fila y `Espacio` la deja caer
      al fondo.
- [ ] Pulsar flechas o `Espacio` durante la partida no hace scroll en la página.
- [ ] Cada pulsación de `↓` que baja la pieza suma exactamente 1 a la Puntuación.
- [ ] Un hard drop suma exactamente 2 por cada fila que recorre la pieza.
- [ ] En nivel 1, completar una línea suma 100 a la Puntuación además de los puntos de caída, y
      completar cuatro a la vez suma 800.
- [ ] Al llegar a 10 líneas, el Nivel pasa de `01` a `02` y las piezas caen más rápido.
- [ ] La pieza fantasma se ve semitransparente donde aterrizará la pieza actual.
- [ ] La vista `NEXT` muestra la pieza que aparece a continuación.
- [ ] Puede aparecer la pieza tuerca gris de 3×3.
- [ ] Rotar una pieza pegada a la pared la desplaza para que rote, si hay hueco.
- [ ] Cuando una pieza nueva no cabe al aparecer, se abre el modal "FIN DEL JUEGO" con la misma
      puntuación del HUD.
- [ ] Detrás del modal, el canvas muestra `GAME OVER` y `Puntuación: N`, sin botón ni texto de
      reinicio.
- [ ] El botón PAUSA, `P` y `Escape` congelan el juego (la pieza no cae) y muestran el overlay
      "EN PAUSA". Volver a pulsar cualquiera de ellos lo reanuda.
- [ ] Al reanudar después de una pausa larga, la pieza no baja varias filas de golpe.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón mostrando "REANUDAR".
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar detrás.
- [ ] Con el modal abierto, pulsar flechas o `Espacio` no mueve ninguna pieza.
- [ ] Escribir un nombre en el input del modal funciona, incluidas las letras `P` y `X`.
- [ ] JUGAR DE NUEVO deja el tablero vacío y el HUD en Puntuación 0, Líneas 0 y Nivel `01`.
- [ ] Sin nada guardado, TETRIS arranca con el skin `dark` y el botón muestra `TEMA: OSCURO`.
- [ ] Pulsar `TEMA` alterna OSCURO → CLARO → NEÓN → OSCURO, el canvas cambia de colores al
      instante y `localStorage["tetris-theme"]` vale `dark`, `light` o `neon`.
- [ ] Al recargar `/juegos/tetris/jugar`, se mantiene el último skin elegido.
- [ ] Tras pulsar `TEMA`, `Espacio` hace hard drop y no vuelve a cambiar el skin.
- [ ] ASTEROIDES y los juegos mock no muestran el botón `TEMA`.
- [ ] `supabase/migrations/20261026000200_seed_tetris.sql` existe y `list_migrations` muestra
      `seed_tetris` aplicada.
- [ ] La tabla `games` contiene exactamente dos filas: `asteroides` y `tetris`.
- [ ] Guardar con el nombre `Ana López` inserta en `scores` una fila con
      `game_id = 'tetris'`, `player_name = 'Ana López'`, el puntaje final y `user_id` nulo.
- [ ] Tras guardar, `/juegos/tetris` muestra `best` = ese puntaje, `plays` = 1 y la puntuación
      en su mini-tabla.
- [ ] Tras guardar, `/salon-de-la-fama` tiene las pestañas `GLOBAL`, `ASTEROIDES` y `TETRIS`, y
      la puntuación aparece en `TETRIS` y en `GLOBAL` con la columna JUEGO = TETRIS.
- [ ] Tras guardar, el home muestra la puntuación en `▸ ÚLTIMAS PUNTUACIONES` y en
      `▸ TOP JUGADORES`.
- [ ] ASTEROIDES se juega, pausa, termina y guarda igual que antes de este spec, con Vidas y
      Nivel en el HUD React y sin Líneas.
- [ ] Tras SALIR y volver a entrar a `/juegos/tetris/jugar` tres veces, las piezas caen y se
      mueven a la misma velocidad que la primera vez (sin listeners ni loops duplicados).
- [ ] La consola del navegador no muestra errores durante una partida completa de TETRIS.

## Decisions

- **Yes:** juego nuevo `TETRIS` con `id: "tetris"`. Razón: decidido por el usuario.
- **Yes:** mantener la entrada mock `caida`. Razón: confirmado por el usuario; conviven como
  `rocas` y `asteroides`.
- **No:** convertir `caida` en el juego real o borrarla. Razón: descartado por el usuario.
- **Yes:** segunda posición en `GAMES`, cat `PUZZLE`, color `magenta`, portada `.cover-tetro`.
  Razón: confirmado por el usuario; los juegos reales van primero. Efecto colateral aceptado: el
  home muestra `GAMES.slice(0, 6)`, así que el último de esos seis sale del home.
- **Yes:** `/biblioteca` lista solo los juegos con entrada en `GAME_REGISTRY`. Razón: decidido
  por el usuario durante la implementación; la biblioteca muestra lo que se puede jugar.
- **Yes:** eliminar la página `/juegos` y su enlace en el nav. Razón: decidido por el usuario;
  con la biblioteca filtrada, la tabla de juegos duplicaba esa función.
- **No:** redirigir `/juegos` a `/biblioteca`. Razón: el usuario pidió que la ruta desaparezca.
- **No:** quitar los mock del home o de `GAMES` en este spec. Razón: el usuario lo limitó a
  `/biblioteca`; el borrado de `GAMES` va en su propio spec.
- **No:** portada CSS propia. Razón: `.cover-tetro` ya dibuja piezas de tetris.
- **Yes:** un solo spec para juego, registro, fila en `games` y leaderboard. Razón: el flujo
  `/add-game` define un juego = un spec.
- **Yes:** registro genérico `GAME_REGISTRY` con un componente canvas por juego. Razón:
  confirmado por el usuario; SPEC 05 lo dejó para el segundo juego.
- **Yes:** conservar `asteroides-canvas.tsx` y crear `tetris-canvas.tsx`. Razón: decidido por el
  usuario.
- **No:** un `game-canvas.tsx` genérico que sustituya a los canvas por juego. Razón: descartado
  por el usuario; queda para un spec futuro.
- **Yes:** contrato común con `onLives`, `onLevel` y `onLines` opcionales. Razón: no todos los
  juegos tienen vidas o líneas.
- **Yes:** HUD React sin Vidas y con Líneas para TETRIS, según `hud` del registro. Razón:
  confirmado por el usuario; Tetris no tiene vidas.
- **No:** mostrar Vidas con `—`. Razón: descartado por el usuario.
- **Yes:** canvas de 800×600 con tablero centrado y los paneles del original dibujados a los
  lados. Razón: confirmado por el usuario; encaja en el 4:3 de `.crt-screen` y conserva el panel
  del original.
- **No:** canvas con solo tablero y `NEXT`. Razón: descartado por el usuario.
- **Yes:** aspecto original del tema oscuro, con las 8 piezas, la tuerca y la pieza fantasma.
  Razón: confirmado por el usuario.
- **Yes:** skins `dark`, `light` y `neon` para TETRIS, con botón `TEMA` en el HUD React y
  `localStorage["tetris-theme"]`. Razón: pedido por el usuario durante la implementación; el
  selector vive en React, como la pausa, y conserva la clave del original.
- **No:** selector de tema dibujado dentro del canvas. Razón: descartado por el usuario.
- **No:** solo los dos temas del original. Razón: el usuario pidió también el neón.
- **Yes:** conservar `↑`/`X`, soft drop, hard drop y la autorrepetición del teclado. Razón:
  confirmado por el usuario.
- **No:** `P` dentro del motor. Razón: la pausa es de `GamePlayer`, como en SPEC 05.
- **No:** overlay de pausa dibujado en el canvas. Razón: ya existe el overlay "EN PAUSA" de
  `GamePlayer`; dos overlays serían redundantes.
- **Yes:** overlay `GAME OVER` en el canvas sin botón de reinicio. Razón: el reinicio es de
  React (JUGAR DE NUEVO), igual que en ASTEROIDES.
- **Yes:** `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar. Razón: evita que la pieza
  baje varias filas de golpe tras una pausa o una pestaña lenta.
- **Yes:** `SCORE` del canvas formateado con `toLocaleString("es-ES")`. Razón: así coincide con
  el HUD React.
- **Yes:** alta en `games` con una migración seed nueva, sin cambios de esquema. Razón:
  `PUZZLE` ya está en el `CHECK` de `category`.
- **Yes:** el leaderboard funciona sin código nuevo. Razón: SPEC 06 lo construyó por `game_id`;
  solo faltaba la fila en `games`.

## Risks

| Riesgo                                                                                                 | Mitigación                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Adaptar ASTEROIDES al contrato común rompe su comportamiento.                                          | El paso 1 solo cambia tipos; criterio de aceptación de regresión de ASTEROIDES.                                       |
| React Strict Mode (dev) crea dos motores.                                                              | `destroy()` cancela rAF y quita listeners; el criterio de las tres navegaciones lo valida.                            |
| La autorrepetición de `Espacio` encadena hard drops si se mantiene pulsada.                            | Aceptado; es el comportamiento del original.                                                                          |
| Las teclas del juego interfieren con el input del modal.                                               | El motor ignora el teclado y no hace `preventDefault` en `gameover`, en pausa o con el foco en un `input`/`textarea`. |
| La tuerca es simétrica y su rotación no cambia nada visible.                                           | Aceptado; es el comportamiento del original.                                                                          |
| Las fuentes del original (`system-ui`, `Courier New`) no coinciden con la tipografía de la plataforma. | Aceptado; el juego conserva su aspecto dentro del canvas.                                                             |
| Un botón del HUD con foco se reactiva al pulsar `Espacio` durante la partida.                          | El botón `TEMA` pierde el foco tras el clic.                                                                          |
| Escalar 800×600 por CSS desenfoca el texto de los paneles en pantallas pequeñas.                       | Aceptado en este spec, igual que en SPEC 05.                                                                          |

## Lo que **no** está en este spec

- Controles táctiles o soporte para móvil.
- Skins para ASTEROIDES u otros juegos.
- Portada CSS propia para `tetris`.
- Cambios a la entrada mock `caida`.
- Sonido.
- Bolsa de 7 piezas, hold o vista previa múltiple.
- Un canvas genérico que unifique los componentes por juego.
- Portar arkanoid u otros juegos.
- Anti-trampas, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES`.

Cada uno de esos, si se implementa, va en su propio spec futuro.
