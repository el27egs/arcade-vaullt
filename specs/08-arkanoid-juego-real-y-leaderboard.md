# SPEC 08 — ARKANOID: tercer juego real y su leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 05 (asteroides-juego-real), SPEC 06 (leaderboard-y-catalogo-supabase), SPEC 07 (tetris-juego-real-y-leaderboard)
> **Date:** 2026-10-26
> **Objective:** Portar `references/started-games/04-arkanoid/` a un `<canvas>` en
> `/juegos/arkanoid/jugar` como el juego nuevo `ARKANOID`, registrarlo en `GAME_REGISTRY` y darlo
> de alta en la tabla `games` para que guarde puntuaciones y aparezca en el leaderboard.

## Por qué existe este spec

SPEC 07 dejó listo el registro genérico (`GAME_REGISTRY`) y el contrato común
(`GameCallbacks`/`GameEngine`). ARKANOID es el primer juego que solo usa esa infraestructura. Aun
así trae dos cosas nuevas:

- **Es el primer juego con assets.** Usa un spritesheet PNG y dos efectos de sonido. Hasta hoy
  `public/games/` no existe.
- **Su pausa es interactiva.** El original muestra en la pausa un selector de nivel 1–5 que se
  pulsa con el ratón. El overlay "EN PAUSA" de `GamePlayer` tapa todo el canvas y bloquearía esos
  clics. Por eso el registro suma un modo de overlay de pausa compacto.

El original es JavaScript puro con globals y accesos al DOM:

- `document.getElementById('game')` y un `ctx` global;
- `LEVELS`, `SPRITES`, `EXPLOSION_FRAMES` y `drawSprite`/`drawFrame` como globals de otros
  scripts;
- `new Audio('assets/sounds/…')` y `rawImg.src = 'assets/…'` con rutas relativas;
- listeners `click` y `mousemove` en el canvas y `keydown`/`keyup` en `document` que nunca se
  quitan;
- un loop `requestAnimationFrame` sin fin y sin límite de `dt`;
- su propia pausa con `P`/`Escape` (`isPaused`), que reanuda sola al elegir un nivel;
- el estado `'win'` sin aviso a nadie.

Todo eso se transforma o se elimina.

`ARKANOID` es un juego **nuevo**. No es `bloque-buster`, la entrada mock parecida de
`lib/data.ts`, que se queda como está.

## Scope

**In:**

- **Nueva entrada `arkanoid` en `GAMES`** (`lib/data.ts`), en la **tercera posición** (justo
  después de `tetris`): title `ARKANOID`, cat `ARCADE`, color `cyan`, cover `cover-bricks` (se
  reusa la clase existente), `best: 0`, `plays: "0"` y textos `short`/`long` en español que
  describan el juego real (5 niveles, 3 vidas, 10 puntos por bloque, pelota más rápida en cada
  nivel, paleta con ratón o flechas).
- La entrada mock `bloque-buster` **se mantiene** sin cambios. Es otro juego y sigue en
  `MODO DEMO`.
- **Assets** copiados del original a `public/games/arkanoid/`:
  - `public/games/arkanoid/spritesheet-breakout.png` (559×337);
  - `public/games/arkanoid/sounds/ball-bounce.mp3`;
  - `public/games/arkanoid/sounds/break-sound.mp3`.
  - No se copia `.DS_Store`.
- **Motor** en `lib/games/arkanoid/`, en TypeScript y sin React ni globals:
  - `levels.ts`: `LEVELS` tipado, con los 5 niveles exactos de `levels.js`;
  - `sprites.ts`: `SPRITES`, `EXPLOSION_FRAMES` y `EXPLOSION_DURATION` (150 ms) exactos de
    `spritesheet.js`;
  - `engine.ts`: `createArkanoidEngine(canvas, callbacks)`.
- **Mecánica conservada tal cual del original:**
  - canvas lógico de 800×600, sin paneles ni bandas: ya es 4:3 como `.crt-screen`;
  - paleta de 81×14 en `y = 560` (sprite de 162×14 escalado), velocidad 400 px/s con teclado;
  - pelota de 16×16, velocidad base `(200, −300)` px/s × `speed` del nivel;
  - la pelota sale al instante desde encima de la paleta, al empezar y tras perder una vida;
  - rebote en paredes izquierda, derecha y superior; rebote en la paleta con `vy = −|vy|`;
  - bloques de 64×24 en una grilla de 10×6 con origen `(80, 80)`;
  - colisión AABB con un solo bloque por frame, que invierte `vy`;
  - 10 puntos por bloque y explosión de 4 frames en 150 ms;
  - 3 vidas; la pelota se pierde cuando `y > 600`;
  - velocidades por nivel `1.00`, `1.10`, `1.21`, `1.33` y `1.46`;
  - al vaciar un nivel se carga el siguiente con la pelota sobre la paleta, que no se recentra;
  - el score se acumula entre niveles.
- **Fin de partida** por dos vías, ambas con `onGameOver(score)`:
  - **derrota:** se pierde la tercera vida → estado `'gameover'`;
  - **victoria:** se vacía el nivel 5 → estado `'win'`.
- **Aspecto original:** sprites del spritesheet sobre fondo negro `#000`.
- **HUD del canvas conservado** mientras el estado es `'playing'`:
  - `Score: N` arriba a la izquierda, formateado con `toLocaleString("es-ES")` para coincidir con
    el HUD React;
  - `Nivel: N` arriba al centro;
  - una pelota de 16×16 por vida arriba a la derecha.
- **Overlays de fin** dibujados en el canvas con fondo `rgba(0, 0, 0, 0.6)`:
  - `GAME OVER` y debajo `Puntuación: N`;
  - `¡Completaste el juego!` y debajo `Puntuación: N`;
  - sin texto ni botón de reinicio. Quedan visibles detrás del modal.
- **Selector de nivel conservado en la pausa:**
  - con `paused = true` y estado `'playing'`, el canvas dibuja un velo `rgba(0, 0, 0, 0.65)`,
    el texto `Saltar al nivel:` y los botones `1`–`5` con la geometría del original
    (60×40, separación 12, `y = 340`, el nivel actual en `#f0c040`);
  - el título `PAUSA` del original no se dibuja: lo muestra el overlay de `GamePlayer`;
  - un clic en un botón carga ese nivel como una partida nueva: score 0, 3 vidas, bloques del
    nivel, pelota sobre la paleta con la velocidad de ese nivel y explosiones vacías;
  - tras el clic el juego **sigue en pausa** y se ve el nivel nuevo congelado. El jugador reanuda
    con REANUDAR, `P` o `Escape`.
- **Controles del motor:**
  - `←`/`→` mueven la paleta;
  - el ratón sobre el canvas centra la paleta en el cursor, con la escala de
    `getBoundingClientRect`;
  - un clic sobre el canvas solo actúa en el selector de la pausa.
  - En partida hace `preventDefault` de `ArrowLeft` y `ArrowRight`.
  - Ignora teclado y ratón en pausa (salvo el clic del selector), en `'gameover'`, en `'win'` y
    con el foco en un `input`/`textarea`.
- **Se eliminan del original:** la pausa propia con `P`/`Escape`, el flag `isPaused` y la
  reanudación automática al elegir nivel.
- **Sonido dentro de alcance**, como el original y sin control de volumen:
  - `ball-bounce.mp3` al rebotar en paredes y paleta;
  - `break-sound.mp3` al romper un bloque;
  - cada efecto se reproduce con `cloneNode().play()` y su promesa rechazada se ignora (política
    de autoplay), para no ensuciar la consola.
- **Carga de assets por instancia del motor**, sin globals:
  - el motor crea su `Image` y sus dos `Audio` con rutas `/games/arkanoid/…`;
  - hasta que la imagen carga, `update` no avanza y `draw` solo pinta el fondo negro;
  - `destroy()` anula `onload` de la imagen para que una carga tardía no toque un motor destruido.
- **Notificaciones:** `onScore`, `onLives`, `onLevel` y `onGameOver`, cada una solo cuando el
  valor cambia. ARKANOID no llama a `onLines`.
- **Componente** `components/games/arkanoid-canvas.tsx` (`"use client"`), con el mismo patrón que
  `tetris-canvas.tsx`: callbacks en una ref, `onReady(engine)`, `engine.start()` al montar y
  `destroy()` en el cleanup. Reenvía `onLives`.
- **Registro:** entrada `arkanoid` en `GAME_REGISTRY` con
  `hud: { lives: true, level: true, lines: false }` y `pauseOverlay: "compact"`.
- **Overlay de pausa compacto en `GamePlayer`:**
  - `GameRegistryEntry` suma `pauseOverlay?: "full" | "compact"`; sin valor equivale a `"full"`;
  - `"full"` es el overlay actual, sin cambios (ASTEROIDES, TETRIS y los mock);
  - `"compact"` muestra `EN PAUSA` y `PULSA REANUDAR PARA CONTINUAR` en una franja arriba de
    `.crt-screen`, sin velo a pantalla completa y con `pointer-events: none`, para que los clics
    lleguen al canvas.
- **Supabase:** migración `supabase/migrations/20261026000300_seed_arkanoid.sql` que inserta
  `('arkanoid', 'ARKANOID', 'ARCADE')` en `public.games`, aplicada con `apply_migration` (nombre
  `seed_arkanoid`). Sin cambios de esquema ni de `lib/supabase/database.types.ts`: `ARCADE` ya
  está en el `CHECK` de `category`. No se siembra ninguna puntuación.
- **Leaderboard**, sin código nuevo, gracias a la fila en `games`:
  - `/juegos/arkanoid/jugar` recibe `canSave = true`; el modal muestra el input y GUARDAR
    PUNTUACIÓN;
  - `saveScore` inserta en `scores` con `game_id = 'arkanoid'`;
  - `/salon-de-la-fama` añade la pestaña `ARKANOID` y sus puntajes entran en `GLOBAL`;
  - el home muestra sus puntajes en `▸ ÚLTIMAS PUNTUACIONES` y `▸ TOP JUGADORES`;
  - `/juegos/arkanoid` muestra su mini-tabla real y `best`/`plays` de Supabase.
- `/biblioteca` muestra ARKANOID sin cambios en `components/library.tsx`: ya filtra por
  `GAME_REGISTRY` (SPEC 07).

**Out of scope (for future specs):**

- Controles táctiles o soporte para móvil.
- Portada CSS propia para `arkanoid` (se reusa `.cover-bricks`).
- Eliminar, modificar o hacer jugable la entrada mock `bloque-buster`.
- Control de volumen o botón de silencio.
- Aspecto neón o skins para ARKANOID.
- Cambios de mecánica: saque manual, ángulo de rebote según el punto de impacto en la paleta,
  power-ups, bloques con varios golpes, más niveles o modo infinito.
- Bonus por vidas restantes al ganar.
- Unificar los componentes canvas por juego en un canvas genérico.
- Portar otros juegos de `references/started-games/`.
- Anti-trampas, rate limiting, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES` y cargar el catálogo solo desde Supabase.

## Data model

```ts
// lib/games/registry.ts — campo nuevo y entrada nueva
export interface GameRegistryEntry {
  Canvas: ComponentType<GameCanvasProps>;
  hud: GameHud;
  skins?: GameSkins;
  pauseOverlay?: "full" | "compact"; // sin valor = "full"
}

// en GAME_REGISTRY
arkanoid: {
  Canvas: ArkanoidCanvas,
  hud: { lives: true, level: true, lines: false },
  pauseOverlay: "compact",
},
```

```ts
// lib/games/arkanoid/levels.ts
export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export interface LevelDef {
  speed: number; // multiplicador de la velocidad base de la pelota
  blocks: { col: number; row: number; color: BlockColor }[];
}
export const LEVELS: LevelDef[]; // 5 niveles, idénticos a levels.js
```

```ts
// lib/games/arkanoid/sprites.ts
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export const SPRITES: {
  paddle: SpriteRect;
  ball: SpriteRect;
  blocks: Record<BlockColor, SpriteRect>;
};
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]>; // 4 frames por color
export const EXPLOSION_DURATION = 150; // ms
```

```ts
// lib/games/arkanoid/engine.ts
export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

```ts
// lib/data.ts — nueva entrada, tercera posición de GAMES
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "...", // texto en español del juego real
  long: "...",
  cat: "ARCADE",
  cover: "cover-bricks",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

```sql
-- supabase/migrations/20261026000300_seed_arkanoid.sql
insert into public.games (id, title, category)
values ('arkanoid', 'ARKANOID', 'ARCADE');
```

Estado interno del motor (cerrado dentro de `createArkanoidEngine`):

| Variable      | Tipo                                   | Inicial                   |
| ------------- | -------------------------------------- | ------------------------- |
| `state`       | `'playing' \| 'gameover' \| 'win'`     | `'playing'`               |
| `paused`      | `boolean`, solo lo escribe `setPaused` | `false`                   |
| `score`       | `number`                               | `0`                       |
| `lives`       | `number`                               | `3`                       |
| `level`       | `number` (1–5)                         | `1`                       |
| `paddle`      | `{ x, y: 560, w: 81, h: 14 }`          | centrada (`x = 359.5`)    |
| `ball`        | `{ x, y, w: 16, h: 16, vx, vy }`       | sobre la paleta           |
| `blocks`      | `{ x, y, w, h, color, alive }[]`       | los del nivel 1           |
| `explosions`  | `{ x, y, w, h, color, elapsed }[]`     | `[]`                      |
| `keys`        | `{ ArrowLeft, ArrowRight }`            | ambos `false`             |
| `sheetLoaded` | `boolean`                              | `false` hasta el `onload` |

Estado de React en `GamePlayer` para `arkanoid`:

| Estado   | Lo escribe                                           | Lo lee                      |
| -------- | ---------------------------------------------------- | --------------------------- |
| `score`  | `onScore`                                            | HUD, modal, `saveScore`     |
| `lives`  | `onLives`                                            | HUD (Vidas)                 |
| `level`  | `onLevel`                                            | HUD (Nivel)                 |
| `over`   | `onGameOver`; JUGAR DE NUEVO lo vuelve `false`       | modal                       |
| `paused` | botón PAUSA, `P`/`Escape`, `blur`/`visibilitychange` | overlay, `engine.setPaused` |

Convenciones:

- Coordenadas lógicas 800×600 con origen arriba a la izquierda. El escalado lo hace solo el CSS.
- Velocidades en px/s. `dt` en segundos, limitado a 0.05 s por frame.
- Al reanudar se reinicia `lastTime` y se descarta el tiempo de la pausa.
- En pausa el loop sigue dibujando (para el selector) pero no llama a `update`.
- `setPaused` y `restart` ponen `keys` a `false`, para que la paleta no siga moviéndose sola.
- Saltar de nivel desde la pausa: `loadLevel(n)` + score 0 + 3 vidas, con sus notificaciones.
- `restart()` deja nivel 1, score 0, 3 vidas, paleta centrada, explosiones vacías y estado
  `'playing'`.
- `end()` en `'playing'` pasa a `'gameover'` y dispara `onGameOver(score)`. En `'gameover'` o
  `'win'` no hace nada.

## Implementation plan

1. Copiar el spritesheet y los dos mp3 a `public/games/arkanoid/` (sin `.DS_Store`).
   Verificación: `/games/arkanoid/spritesheet-breakout.png` y los dos
   `/games/arkanoid/sounds/*.mp3` responden 200 en `npm run dev`.
2. Crear `lib/games/arkanoid/levels.ts` y `lib/games/arkanoid/sprites.ts` con los datos tipados
   del original. Todavía no se importan; compila.
3. Crear `lib/games/arkanoid/engine.ts` con constantes, carga de `Image` y `Audio`,
   `loadLevel`, `initBall`, `collideAABB` y `update` (paleta, pelota, paredes, paleta, bloques,
   explosiones, pérdida de vida, cambio de nivel, victoria) con notificaciones solo-al-cambiar.
   Todavía no se importa; compila.
4. Completar `createArkanoidEngine`:
   - `draw` con bloques, explosiones, paleta, pelota, HUD del canvas, overlays de fin y selector
     de pausa;
   - loop rAF con `dt` limitado;
   - input (`keydown`/`keyup` en `window`, `mousemove`/`click` en el canvas) registrado en
     `start` y quitado en `destroy`;
   - `setPaused`, `end`, `restart` y `destroy`.
5. Crear `components/games/arkanoid-canvas.tsx` y registrar `arkanoid` en `GAME_REGISTRY` con
   `hud: { lives: true, level: true, lines: false }`, todavía sin `pauseOverlay`. Todavía no hay
   entrada en `GAMES`; compila.
6. Agregar la entrada `arkanoid` en la tercera posición de `GAMES`. Verificación: `/biblioteca`
   la muestra tercera y `/juegos/arkanoid/jugar` carga el juego real en `MODO DEMO` (aún no está
   en `games`).
7. Añadir `pauseOverlay` a `GameRegistryEntry`, el modo `"compact"` en `GamePlayer` y
   `pauseOverlay: "compact"` en la entrada `arkanoid`. Verificación: en pausa el selector de
   nivel se ve y responde a clics; ASTEROIDES y TETRIS siguen con el overlay completo.
8. Crear `supabase/migrations/20261026000300_seed_arkanoid.sql` y aplicarla con
   `apply_migration` (nombre `seed_arkanoid`). Verificación: `select * from games_with_stats`
   devuelve `arkanoid` con `best = 0` y `plays = 0`, y el modal de ARKANOID ya muestra el input.
9. Correr `npm run lint` y `npm run build` limpios.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `public/games/arkanoid/` contiene `spritesheet-breakout.png`, `sounds/ball-bounce.mp3` y
      `sounds/break-sound.mp3`, y nada más.
- [ ] `grep -rn "document.getElementById" lib/games/arkanoid` no devuelve resultados.
- [ ] `/biblioteca` muestra `ARKANOID` como tercer juego, después de `ASTEROIDES` y `TETRIS`, con
      la portada `.cover-bricks`.
- [ ] La entrada `bloque-buster` sigue en `GAMES` y `/juegos/bloque-buster/jugar` muestra el mock
      con `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.
- [ ] `/juegos/arkanoid/jugar` muestra, dentro del marco CRT y con scanlines encima, la grilla de
      60 bloques del nivel 1 con los sprites del spritesheet, la paleta y la pelota.
- [ ] El HUD React de ARKANOID muestra Jugador, Puntuación, Vidas (`♥ ♥ ♥`) y Nivel (`01`), y no
      muestra Líneas ni el botón `TEMA`.
- [ ] En todo momento, `Score`, `Nivel` y las pelotas de vida del canvas coinciden con
      Puntuación, Nivel y Vidas del HUD React.
- [ ] `←`/`→` mueven la paleta y mover el ratón sobre el canvas la centra en el cursor, sin
      salirse de los bordes.
- [ ] Pulsar `←`/`→` durante la partida no hace scroll en la página.
- [ ] La pelota sale sola al empezar, sin pulsar ninguna tecla.
- [ ] Romper un bloque suma exactamente 10 a la Puntuación y muestra su explosión.
- [ ] Se oye `ball-bounce` al rebotar en paredes o paleta y `break-sound` al romper un bloque.
- [ ] Al perder la pelota por abajo, Vidas baja en 1 y la pelota vuelve a salir desde la paleta.
- [ ] Al vaciar el nivel 1 (600 puntos), el Nivel pasa de `01` a `02`, aparece la pirámide y la
      pelota va más rápido.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la misma puntuación del HUD, y
      detrás el canvas muestra `GAME OVER` y `Puntuación: N`, sin texto de reinicio.
- [ ] Vaciar el nivel 5 abre el modal con la puntuación del HUD, y detrás el canvas muestra
      `¡Completaste el juego!` y `Puntuación: N`, completo dentro del canvas.
- [ ] El botón PAUSA, `P` y `Escape` congelan el juego (la pelota no se mueve) y muestran la
      franja `EN PAUSA` arriba, con el selector `Saltar al nivel:` y los botones `1`–`5` en el
      canvas, el nivel actual resaltado.
- [ ] En pausa, `←`/`→` y el ratón no mueven la paleta.
- [ ] En pausa, un clic en el botón `3` deja Puntuación 0, Vidas `♥ ♥ ♥` y Nivel `03`, muestra
      el tablero de ajedrez y el juego sigue en pausa.
- [ ] Tras saltar de nivel, REANUDAR, `P` o `Escape` reanudan con la velocidad del nivel 3.
- [ ] Al reanudar después de una pausa larga, la pelota no salta ni atraviesa bloques de golpe.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón mostrando "REANUDAR".
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar detrás.
- [ ] Con el modal abierto, `←`/`→` y el ratón no mueven la paleta.
- [ ] Escribir un nombre en el input del modal funciona, incluida la letra `P`.
- [ ] JUGAR DE NUEVO deja los 60 bloques del nivel 1 y el HUD en Puntuación 0, Vidas `♥ ♥ ♥` y
      Nivel `01`.
- [ ] ASTEROIDES y TETRIS siguen mostrando el overlay "EN PAUSA" a pantalla completa.
- [ ] `supabase/migrations/20261026000300_seed_arkanoid.sql` existe y `list_migrations` muestra
      `seed_arkanoid` aplicada.
- [ ] La tabla `games` contiene exactamente tres filas: `asteroides`, `tetris` y `arkanoid`.
- [ ] Guardar con el nombre `Ana López` inserta en `scores` una fila con
      `game_id = 'arkanoid'`, `player_name = 'Ana López'`, el puntaje final y `user_id` nulo.
- [ ] Tras guardar, `/juegos/arkanoid` muestra `best` = ese puntaje, `plays` = 1 y la puntuación
      en su mini-tabla.
- [ ] Tras guardar, `/salon-de-la-fama` tiene las pestañas `GLOBAL`, `ASTEROIDES`, `TETRIS` y
      `ARKANOID`, y la puntuación aparece en `ARKANOID` y en `GLOBAL` con la columna
      JUEGO = ARKANOID.
- [ ] Tras guardar, el home muestra la puntuación en `▸ ÚLTIMAS PUNTUACIONES` y en
      `▸ TOP JUGADORES`.
- [ ] Tras SALIR y volver a entrar a `/juegos/arkanoid/jugar` tres veces, la pelota y la paleta
      van a la misma velocidad que la primera vez y cada rebote suena una sola vez (sin
      listeners ni loops duplicados).
- [ ] La consola del navegador no muestra errores durante una partida completa de ARKANOID.

## Decisions

- **Yes:** juego nuevo `ARKANOID` con `id: "arkanoid"`. Razón: decidido por el usuario; coincide
  con la carpeta de referencia.
- **No:** un nombre genérico (`rompebloques`, `ladrillos`). Razón: descartado por el usuario.
- **Yes:** mantener la entrada mock `bloque-buster`. Razón: confirmado por el usuario; conviven
  como `rocas`/`asteroides` y `caida`/`tetris`.
- **Yes:** tercera posición en `GAMES`, cat `ARCADE`, color `cyan`, portada `.cover-bricks`.
  Razón: confirmado por el usuario; los juegos reales van primero. Efecto colateral aceptado: el
  home muestra `GAMES.slice(0, 6)`, así que `gloton` sale de la vista previa del home.
- **No:** portada CSS propia. Razón: `.cover-bricks` ya dibuja un muro de bloques.
- **Yes:** un solo spec para juego, fila en `games` y leaderboard. Razón: el flujo `/add-game`
  define un juego = un spec.
- **Yes:** usar el registro y el contrato de SPEC 07 sin cambiar `lib/games/types.ts`. Razón:
  `onLives` y `onLevel` ya existen; ARKANOID no necesita callbacks nuevos.
- **Yes:** motor repartido en `engine.ts`, `levels.ts` y `sprites.ts`. Razón: sigue la división
  del original (`game.js`, `levels.js`, `spritesheet.js`) y saca los datos largos del motor.
- **Yes:** canvas de 800×600 sin paneles ni bandas. Razón: el original ya es 4:3.
- **Yes:** aspecto original con el spritesheet. Razón: confirmado por el usuario.
- **No:** paleta neón dibujada sin sprites. Razón: descartado por el usuario.
- **Yes:** victoria tras el nivel 5 como fin de partida con `onGameOver(score)`. Razón: confirmado
  por el usuario; fiel al original y permite guardar la puntuación.
- **No:** ciclo infinito de niveles ni bonus por vidas. Razón: descartados por el usuario.
- **Yes:** conservar el selector de nivel en la pausa, dibujado en el canvas. Razón: decidido por
  el usuario.
- **Yes:** saltar de nivel reinicia score y vidas. Razón: confirmado por el usuario; sin eso se
  podría repetir el nivel 1 para inflar el leaderboard.
- **No:** conservar el score al saltar ni pasar la partida a `MODO DEMO`. Razón: descartados por
  el usuario.
- **Yes:** tras saltar de nivel el juego sigue en pausa. Razón: confirmado por el usuario; la
  pausa es de React y el juego nunca se reanuda solo.
- **No:** callback `onResumeRequest`. Razón: descartado por el usuario; no hace falta ampliar el
  contrato.
- **Yes:** `pauseOverlay: "compact"` en el registro, con la franja `EN PAUSA` arriba y
  `pointer-events: none`. Razón: confirmado por el usuario; el overlay completo bloquearía los
  clics del selector.
- **No:** que el canvas dibuje toda la pausa y `GamePlayer` oculte su overlay. Razón: descartado
  por el usuario; la pausa se sigue viendo igual en toda la plataforma.
- **No:** dibujar el título `PAUSA` del original en el canvas. Razón: ya lo muestra la franja de
  `GamePlayer`; dos títulos serían redundantes.
- **Yes:** ratón y `←`/`→` para la paleta. Razón: confirmado por el usuario; como el original.
- **Yes:** la pelota sale al instante, sin saque manual. Razón: confirmado por el usuario.
- **No:** `P`/`Escape` dentro del motor. Razón: la pausa es de `GamePlayer`, como en SPEC 05.
- **Yes:** conservar el HUD del canvas junto al HUD React. Razón: confirmado por el usuario;
  igual que ASTEROIDES y TETRIS.
- **Yes:** `Score` del canvas formateado con `toLocaleString("es-ES")`. Razón: así coincide con
  el HUD React.
- **Yes:** overlays de fin con título y `Puntuación: N`, sin texto de reinicio. Razón: confirmado
  por el usuario; el reinicio es de React (JUGAR DE NUEVO).
- **Yes:** `¡Completaste el juego!` con un tamaño de fuente que quepa en 800 px. Razón: a 64 px
  monospace, como en el original, el texto se sale del canvas.
- **Yes:** sonido dentro de alcance, sin control de volumen. Razón: confirmado por el usuario;
  como el original.
- **Yes:** ignorar la promesa rechazada de `play()`. Razón: el navegador puede bloquear el audio
  antes de la primera interacción y eso no debe ensuciar la consola.
- **Yes:** `dt` limitado a 0.05 s y `lastTime` reiniciado al reanudar. Razón: el original no
  limita `dt`; sin límite, la pelota atravesaría bloques o la paleta tras una pausa o una pestaña
  lenta.
- **Yes:** alta en `games` con una migración seed nueva, sin cambios de esquema. Razón: `ARCADE`
  ya está en el `CHECK` de `category`.
- **Yes:** el leaderboard funciona sin código nuevo. Razón: SPEC 06 lo construyó por `game_id`;
  solo faltaba la fila en `games`.

## Risks

| Riesgo                                                                              | Mitigación                                                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode (dev) crea dos motores y cada uno su `Image` y sus `Audio`.       | `destroy()` cancela rAF, quita listeners y anula `onload`; el criterio de las tres navegaciones lo valida.                   |
| El spritesheet no carga (ruta mal copiada o red).                                   | El juego no avanza y el canvas queda negro; el criterio de assets del paso 1 lo detecta antes.                               |
| El navegador bloquea el audio antes de la primera interacción.                      | La promesa de `play()` se ignora; el juego sigue sin sonido hasta el primer gesto.                                           |
| La franja `EN PAUSA` tapa el HUD del canvas.                                        | Aceptado; en pausa el canvas está bajo su velo y los valores siguen en el HUD React.                                         |
| El clic del selector y el `mousemove` dependen de la escala CSS del canvas.         | Las coordenadas se convierten con `getBoundingClientRect`, como en el original.                                              |
| La pelota siempre sale hacia la derecha y la paleta no cambia el ángulo del rebote. | Aceptado; es el comportamiento del original.                                                                                 |
| Las teclas del juego interfieren con el input del modal.                            | El motor ignora el teclado y no hace `preventDefault` en pausa, en `'gameover'`/`'win'` o con el foco en `input`/`textarea`. |
| Escalar 800×600 por CSS desenfoca el texto del canvas en pantallas pequeñas.        | Aceptado, igual que en SPEC 05 y SPEC 07.                                                                                    |

## Lo que **no** está en este spec

- Controles táctiles o soporte para móvil.
- Portada CSS propia para `arkanoid`.
- Cambios a la entrada mock `bloque-buster`.
- Control de volumen o silencio.
- Aspecto neón o skins.
- Saque manual, ángulo de rebote, power-ups, bloques resistentes, más niveles o modo infinito.
- Bonus por vidas al ganar.
- Un canvas genérico que unifique los componentes por juego.
- Portar otros juegos.
- Anti-trampas, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES`.

Cada uno de esos, si se implementa, va en su propio spec futuro.
