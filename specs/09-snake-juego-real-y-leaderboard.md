# SPEC 09 — SNAKE: cuarto juego real y su leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 05 (asteroides-juego-real), SPEC 06 (leaderboard-y-catalogo-supabase), SPEC 07 (tetris-juego-real-y-leaderboard), SPEC 08 (arkanoid-juego-real-y-leaderboard)
> **Date:** 2026-10-26
> **Objective:** Crear desde cero el juego original `SNAKE` en un `<canvas>` en
> `/juegos/snake/jugar`, con las frutas de `references/source-assets/snake-assets/`, registrarlo en
> `GAME_REGISTRY` y darlo de alta en la tabla `games` para que guarde puntuaciones y aparezca en
> el leaderboard.

## Por qué existe este spec

SPEC 07 dejó el registro genérico (`GAME_REGISTRY`) y el contrato común
(`GameCallbacks`/`GameEngine`). SPEC 08 estrenó los assets en `public/games/`. SNAKE solo usa esa
infraestructura, pero se diferencia de los anteriores en dos cosas:

- **No hay código de referencia.** No existe carpeta en `references/started-games/`. La mecánica
  es un diseño original del género "serpiente", fijado entero en este spec.
- **Solo hay un asset de imagen.** `references/source-assets/snake-assets/` trae `fruits.png`
  (3790×442, fondo transparente, tres filas de 22 frutas: dibujo, pixel art y realista) y
  `sprites.js`, un atlas `window.SPRITE_ATLAS` con las coordenadas de la fila pixel art
  (`y = 136`, `h = 160`). Los nombres de ese atlas están desfasados respecto a la imagen: el
  rectángulo `x = 34` se llama `banana` pero es la manzana roja, `x = 186` se llama `orange` pero
  es la banana, y así con todos. Las coordenadas son correctas; los nombres se corrigen al
  portarlo.

Además, SNAKE **reemplaza** la entrada mock `serpentina` de `lib/data.ts`. Es el primer juego real
que sustituye a un mock en lugar de convivir con él.

SNAKE es el primer juego real **sin vidas**: una sola vida y la partida acaba al chocar.

## Scope

**In:**

- **Catálogo (`lib/data.ts`):**
  - nueva entrada `snake` en la **cuarta posición** de `GAMES` (justo después de `arkanoid`):
    title `SNAKE`, cat `ARCADE`, color `green`, cover `cover-snake` (se reusa la clase
    existente), `best: 0`, `plays: "0"` y textos `short`/`long` en español que describan el juego
    real (frutas que la hacen crecer, muros mortales, un nivel cada 5 frutas con más velocidad,
    fruta bonus temporal);
  - se **elimina** la entrada mock `serpentina`. `/juegos/serpentina` pasa a responder con la
    página 404 (`notFound()` del detalle, sin código nuevo).
  - `.cover-snake` de `app/globals.css` no cambia.
- **Asset** copiado a `public/games/snake/fruits.png` (el PNG entero, 3790×442). `sprites.js` no
  se copia: se porta a TypeScript.
- **Motor** en `lib/games/snake/`, en TypeScript y sin React ni globals:
  - `sprites.ts`: `FRUIT_SPRITES`, las 22 coordenadas exactas de `sprites.js` con los nombres
    corregidos según lo que muestra la imagen (ver Data model), y `BONUS_SPRITE = "bowl"`;
  - `engine.ts`: `createSnakeEngine(canvas, callbacks)`.
- **Canvas y tablero:**
  - resolución lógica 800×800 (1:1);
  - encaje en el 4:3 de `.crt-screen` con **bandas laterales negras**: el canvas ocupa el 100% del
    alto de la pantalla, con ancho proporcional, centrado en horizontal; los lados quedan con el
    fondo `#000` de `.crt-screen`;
  - banda HUD de 800×50 arriba (`y = 0…50`);
  - tablero de 32×30 celdas de 25 px debajo (`y = 50…800`), con origen en `(0, 50)`.
- **Mecánica:**
  - la serpiente empieza con 3 celdas: cabeza en `(16, 15)` y cuerpo en `(15, 15)` y `(14, 15)`,
    mirando a la derecha;
  - avanza una celda por paso con un acumulador de tiempo de paso fijo;
  - velocidad `min(8 + (nivel − 1), 20)` pasos por segundo: 8 en el nivel 1 y tope de 20 desde
    el nivel 13;
  - siempre hay exactamente una fruta normal en una celda libre aleatoria, con un sprite
    aleatorio de los 21 que no son `bowl`;
  - comer una fruta normal hace crecer 1 celda y suma `10 × nivel` (el nivel antes de comer);
  - cada 5 frutas normales comidas se sube de nivel;
  - al subir de nivel aparece una **fruta bonus** (sprite `bowl`) en otra celda libre durante
    5 s de juego; parpadea en los últimos 1.5 s y desaparece al terminar;
  - comer la bonus suma `50 × nivel` y **no** hace crecer;
  - si ya hay una bonus al subir de nivel, la nueva la reemplaza;
  - el tiempo de la bonus no corre en pausa ni en `'ready'`;
  - **muere** si la cabeza sale del tablero (muros) o entra en una celda de su cuerpo;
  - entrar en la celda que deja libre la cola en ese mismo paso no mata (si no crece en ese paso);
  - si no queda ninguna celda libre para la nueva fruta, la partida termina como `'gameover'`.
- **Inicio de partida:** estado `'ready'` con la serpiente quieta en el centro y el texto
  `PULSA UNA FLECHA PARA EMPEZAR` sobre el tablero. La primera dirección válida (arriba, abajo o
  derecha) pasa a `'playing'`. Izquierda se ignora en `'ready'` porque sería un giro de 180°.
- **Fin de partida:** chocar (o quedarse sin celdas libres) pasa a `'gameover'` y llama a
  `onGameOver(score)`. No hay victoria.
- **Aspecto neón con frutas pixel art:**
  - fondo `#05050f` en todo el canvas;
  - grilla del tablero con líneas `rgba(0, 255, 136, 0.06)` y borde del tablero de 2 px en
    `#00ff88`;
  - cuerpo de la serpiente en `#00ff88` con `shadowBlur` verde; cabeza en `#b3ffd9`, con dos ojos
    `#05050f` orientados hacia la dirección actual;
  - frutas con los sprites de la fila pixel art de `fruits.png`, escaladas a 25 px de alto,
    con el ancho proporcional y centradas en su celda; `imageSmoothingEnabled = false` para
    conservar el pixel art.
- **HUD del canvas** en la banda superior, en todos los estados:
  - `SCORE N` a la izquierda, formateado con `toLocaleString("es-ES")` para coincidir con el HUD
    React;
  - `NIVEL NN` al centro, con dos dígitos como el HUD React;
  - `LONGITUD N` a la derecha (solo existe en el canvas);
  - con una bonus activa, `BONUS N.Ns` en amarillo `#f5ff00` entre `NIVEL` y `LONGITUD`.
- **Overlay de fin** sobre el tablero con fondo `rgba(0, 0, 0, 0.6)`: `GAME OVER` y debajo
  `Puntuación: N`, sin texto de reinicio. Queda visible detrás del modal.
- **Controles del motor:**
  - `←`/`→`/`↑`/`↓` y `W`/`A`/`S`/`D` (por `e.code`) cambian la dirección;
  - cola de hasta 2 giros pendientes; un giro se descarta si es igual o de 180° respecto al
    último giro en cola (o a la dirección actual si la cola está vacía); con la cola llena se
    descarta;
  - cada paso consume como máximo un giro de la cola;
  - sin ratón;
  - en `'ready'` y `'playing'` hace `preventDefault` de las cuatro flechas para que la página no
    haga scroll;
  - ignora el teclado y no hace `preventDefault` en pausa, en `'gameover'`, con el foco en un
    `input`/`textarea` o mientras el PNG no ha cargado.
- **Carga del asset por instancia del motor**, sin globals:
  - el motor crea su `Image` con ruta `/games/snake/fruits.png`;
  - hasta que carga, `update` no avanza y `draw` pinta solo el fondo, la banda y el tablero
    vacío;
  - `destroy()` anula `onload` para que una carga tardía no toque un motor destruido.
- **Notificaciones:** `onScore`, `onLevel` y `onGameOver`, cada una solo cuando el valor cambia.
  SNAKE no llama a `onLives` ni a `onLines`.
- **Componente** `components/games/snake-canvas.tsx` (`"use client"`), con el mismo patrón que
  `arkanoid-canvas.tsx`: callbacks en una ref, `onReady(engine)`, `engine.start()` al montar y
  `destroy()` en el cleanup. Reenvía `onScore`, `onLevel` y `onGameOver`. El `<canvas>` tiene
  `width={800}`, `height={800}` y estilo `display: block`, `height: 100%`, `width: auto` y
  `margin: 0 auto` (en lugar del `width: 100%; height: auto` de los otros juegos).
- **Registro:** entrada `snake` en `GAME_REGISTRY` con
  `hud: { lives: false, level: true, lines: false }`, sin `skins` y sin `pauseOverlay` (overlay
  "EN PAUSA" completo).
- **HUD React** de SNAKE: Jugador, Puntuación y Nivel. Sin Vidas, sin Líneas y sin botón `TEMA`.
- **Supabase:** migración `supabase/migrations/20261026000400_seed_snake.sql` que inserta
  `('snake', 'SNAKE', 'ARCADE')` en `public.games`, aplicada con `apply_migration` (nombre
  `seed_snake`). Sin cambios de esquema ni de `lib/supabase/database.types.ts`: `ARCADE` ya está
  en el `CHECK` de `category`. No se siembra ninguna puntuación.
- **Leaderboard**, sin código nuevo, gracias a la fila en `games`:
  - `/juegos/snake/jugar` recibe `canSave = true`; el modal muestra el input y GUARDAR
    PUNTUACIÓN;
  - `saveScore` inserta en `scores` con `game_id = 'snake'`;
  - `/juegos` lista SNAKE con su mejor puntuación y sus partidas reales (`games_with_stats`);
  - `/salon-de-la-fama` añade la pestaña `SNAKE` y sus puntajes entran en `GLOBAL`;
  - el home muestra sus puntajes en `▸ ÚLTIMAS PUNTUACIONES` y `▸ TOP JUGADORES`;
  - `/juegos/snake` muestra su mini-tabla real y `best`/`plays` de Supabase.
- `/biblioteca` muestra SNAKE sin cambios en `components/library.tsx`: ya filtra por
  `GAME_REGISTRY` (SPEC 07).

**Out of scope (for future specs):**

- Sonido de cualquier tipo (no hay archivos de sonido en los assets).
- Controles táctiles o soporte para móvil, y control con ratón.
- Portada CSS propia para `snake` (se reusa `.cover-snake`).
- Usar las filas de dibujo o realista de `fruits.png`, o skins.
- Varias vidas, modo sin muros (atravesar bordes), obstáculos o laberintos por nivel.
- Valor de puntos distinto por tipo de fruta.
- Pausa o reinicio propios del motor.
- Unificar los componentes canvas por juego en un canvas genérico.
- Portar juegos de `references/started-games/`.
- Anti-trampas, rate limiting, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES` y cargar el catálogo solo desde Supabase.

## Data model

```ts
// lib/games/registry.ts — entrada nueva
snake: {
  Canvas: SnakeCanvas,
  hud: { lives: false, level: true, lines: false },
},
```

```ts
// lib/games/snake/sprites.ts
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export type FruitName =
  | "apple"
  | "banana"
  | "pineapple"
  | "grape"
  | "pumpkin"
  | "turnip"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "orange"
  | "peach"
  | "peanut"
  | "raspberry"
  | "tomato"
  | "bowl";
export const FRUIT_SPRITES: Record<FruitName, SpriteRect>;
export const BONUS_SPRITE: FruitName = "bowl";
```

Correspondencia de nombres. Todas las filas tienen `sy = 136` y `sh = 160`; `sx` y `sw` son los de
`sprites.js` sin tocar:

| `sx` | `sw` | Nombre en `sprites.js` | Nombre en `sprites.ts` |
| ---- | ---- | ---------------------- | ---------------------- |
| 34   | 110  | `banana`               | `apple`                |
| 186  | 150  | `orange`               | `banana`               |
| 378  | 110  | `grape`                | `pineapple`            |
| 540  | 130  | `garlic`               | `grape`                |
| 712  | 130  | `eggplant`             | `pumpkin`              |
| 894  | 110  | `strawberry`           | `turnip`               |
| 1066 | 110  | `cherry`               | `eggplant`             |
| 1228 | 130  | `carrot`               | `strawberry`           |
| 1400 | 130  | `mushroom`             | `cherry`               |
| 1582 | 110  | `broccoli`             | `carrot`               |
| 1734 | 150  | `watermelon`           | `mushroom`             |
| 1906 | 150  | `pepper`               | `broccoli`             |
| 2068 | 170  | `kiwi`                 | `watermelon`           |
| 2250 | 140  | `lemon`                | `pepper`               |
| 2432 | 130  | `peach`                | `kiwi`                 |
| 2604 | 130  | `peanut`               | `lemon`                |
| 2786 | 110  | `apple`                | `orange`               |
| 2948 | 130  | `tomato`               | `peach`                |
| 3110 | 150  | `berries`              | `peanut`               |
| 3302 | 110  | `grapes2`              | `raspberry`            |
| 3454 | 150  | `pineapple`            | `tomato`               |
| 3637 | 130  | `melon`                | `bowl`                 |

```ts
// lib/games/snake/engine.ts
export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

```ts
// lib/data.ts — nueva entrada, cuarta posición de GAMES; se borra "serpentina"
{
  id: "snake",
  title: "SNAKE",
  short: "...", // texto en español del juego real
  long: "...",
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
  best: 0,
  plays: "0",
}
```

```sql
-- supabase/migrations/20261026000400_seed_snake.sql
insert into public.games (id, title, category)
values ('snake', 'SNAKE', 'ARCADE');
```

Estado interno del motor (cerrado dentro de `createSnakeEngine`):

| Variable      | Tipo                                       | Inicial                         |
| ------------- | ------------------------------------------ | ------------------------------- |
| `state`       | `'ready' \| 'playing' \| 'gameover'`       | `'ready'`                       |
| `paused`      | `boolean`, solo lo escribe `setPaused`     | `false`                         |
| `score`       | `number`                                   | `0`                             |
| `level`       | `number` (≥ 1)                             | `1`                             |
| `fruitsEaten` | `number` (frutas normales)                 | `0`                             |
| `snake`       | `{ col, row }[]`, la cabeza en el índice 0 | `(16,15)`, `(15,15)`, `(14,15)` |
| `dir`         | `'up' \| 'down' \| 'left' \| 'right'`      | `'right'`                       |
| `turnQueue`   | `Dir[]`, máximo 2                          | `[]`                            |
| `growPending` | `number`                                   | `0`                             |
| `fruit`       | `{ col, row, sprite: FruitName }`          | celda libre aleatoria           |
| `bonus`       | `{ col, row, remaining: number } \| null`  | `null`                          |
| `stepAcc`     | `number` (segundos acumulados)             | `0`                             |
| `sheetLoaded` | `boolean`                                  | `false` hasta el `onload`       |

Estado de React en `GamePlayer` para `snake`:

| Estado   | Lo escribe                                           | Lo lee                      |
| -------- | ---------------------------------------------------- | --------------------------- |
| `score`  | `onScore`                                            | HUD, modal, `saveScore`     |
| `level`  | `onLevel`                                            | HUD (Nivel)                 |
| `over`   | `onGameOver`; JUGAR DE NUEVO lo vuelve `false`       | modal                       |
| `paused` | botón PAUSA, `P`/`Escape`, `blur`/`visibilitychange` | overlay, `engine.setPaused` |

Convenciones:

- Coordenadas lógicas 800×800 con origen arriba a la izquierda. El escalado lo hace solo el CSS.
- Celda `(col, row)` dibujada en `x = col × 25`, `y = 50 + row × 25`.
- `dt` en segundos, limitado a 0.05 s por frame. El paso dura `1 / velocidad` s y
  `stepAcc` puede ejecutar varios pasos en un frame.
- Al reanudar se reinicia `lastTime` y se descarta el tiempo de la pausa.
- En pausa y en `'gameover'` el loop sigue dibujando pero no llama a `update`.
- `setPaused` y `restart` vacían `turnQueue`.
- `restart()` deja `'ready'`, la serpiente inicial, `dir = 'right'`, score 0, nivel 1,
  `fruitsEaten` 0, sin bonus, `stepAcc` 0 y una fruta nueva, y notifica score y nivel si cambian.
- `end()` en `'ready'` o `'playing'` pasa a `'gameover'` y dispara `onGameOver(score)`. En
  `'gameover'` no hace nada.

## Implementation plan

1. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`.
   Verificación: `/games/snake/fruits.png` responde 200 en `npm run dev`.
2. Crear `lib/games/snake/sprites.ts` con `SpriteRect`, `FruitName`, `FRUIT_SPRITES` (tabla de
   correspondencia de este spec) y `BONUS_SPRITE`. Todavía no se importa; compila.
3. Crear `lib/games/snake/engine.ts` con constantes del tablero, carga de la `Image`, estado
   inicial, cola de giros, `step` (mover, crecer, comer fruta y bonus, subir de nivel, colisión
   con muros y cuerpo, celda libre aleatoria) y `update` con acumulador y temporizador del bonus,
   con notificaciones solo-al-cambiar. Todavía no se importa; compila.
4. Completar `createSnakeEngine`:
   - `draw` con fondo, banda HUD, grilla y borde, frutas, bonus parpadeante, serpiente con ojos,
     texto de `'ready'` y overlay de `'gameover'`;
   - loop rAF con `dt` limitado;
   - input `keydown` en `window` registrado en `start` y quitado en `destroy`;
   - `setPaused`, `end`, `restart` y `destroy`.
5. Crear `components/games/snake-canvas.tsx` y registrar `snake` en `GAME_REGISTRY` con
   `hud: { lives: false, level: true, lines: false }`. Todavía no hay entrada en `GAMES`;
   compila.
6. En `lib/data.ts`, agregar la entrada `snake` en la cuarta posición de `GAMES` y borrar
   `serpentina`. Verificación: `/biblioteca` muestra SNAKE cuarto y ya no muestra SERPENTINA;
   `/juegos/snake/jugar` carga el juego real en `MODO DEMO` (aún no está en `games`).
7. Crear `supabase/migrations/20261026000400_seed_snake.sql` y aplicarla con `apply_migration`
   (nombre `seed_snake`). Verificación: `select * from games_with_stats` devuelve `snake` con
   `best = 0` y `plays = 0`, y el modal de SNAKE ya muestra el input.
8. Correr `npm run lint` y `npm run build` limpios.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `public/games/snake/` contiene solo `fruits.png`.
- [ ] `grep -rn "document.getElementById\|window.SPRITE_ATLAS" lib/games/snake` no devuelve
      resultados.
- [ ] Cada nombre de `FRUIT_SPRITES` dibuja la fruta que indica: `apple` es la manzana roja,
      `banana` la banana y `bowl` el bol de frutas.
- [ ] `/biblioteca` muestra `SNAKE` como cuarto juego, después de `ASTEROIDES`, `TETRIS` y
      `ARKANOID`, con la portada `.cover-snake`.
- [ ] `SERPENTINA` ya no aparece en `/biblioteca` ni en el home, y `/juegos/serpentina` muestra
      la página 404.
- [ ] En `/juegos/snake/jugar` el canvas cuadrado se ve entero (banda HUD arriba y última fila
      del tablero abajo, sin recorte), centrado, con bandas negras a izquierda y derecha.
- [ ] `/juegos/snake/jugar` muestra, dentro del marco CRT y con scanlines encima, la banda HUD,
      el tablero de 32×30 con grilla tenue, la serpiente verde de 3 celdas en el centro, una
      fruta pixel art y el texto `PULSA UNA FLECHA PARA EMPEZAR`.
- [ ] La serpiente no se mueve hasta pulsar `↑`, `↓`, `→`, `W`, `S` o `D`; `←` y `A` en ese
      momento no la ponen en marcha.
- [ ] El HUD React de SNAKE muestra Jugador, Puntuación y Nivel (`01`), y no muestra Vidas,
      Líneas ni el botón `TEMA`.
- [ ] En todo momento, `SCORE` y `NIVEL` del canvas coinciden con Puntuación y Nivel del HUD
      React.
- [ ] Flechas y `WASD` giran la serpiente; un giro de 180° se ignora.
- [ ] Pulsar `↑` y `→` muy seguidos (dentro del mismo paso) ejecuta los dos giros en pasos
      consecutivos.
- [ ] Pulsar las flechas durante la partida no hace scroll en la página.
- [ ] Comer una fruta en el nivel 1 suma exactamente 10 a la Puntuación, alarga la serpiente
      1 celda (`LONGITUD` sube en 1) y aparece otra fruta en una celda libre.
- [ ] Tras la quinta fruta, Nivel pasa de `01` a `02`, la serpiente va más rápido y aparece el
      bol de frutas con `BONUS 5.0s` contando hacia atrás en la banda.
- [ ] En el nivel 2, una fruta normal suma 20 y comer el bol suma 100 sin alargar la serpiente.
- [ ] Si no se come, el bol parpadea en su último 1.5 s y desaparece a los 5 s.
- [ ] Chocar con un muro o con el propio cuerpo abre el modal "FIN DEL JUEGO" con la misma
      puntuación del HUD, y detrás el canvas muestra `GAME OVER` y `Puntuación: N`, sin texto de
      reinicio.
- [ ] El botón PAUSA, `P` y `Escape` congelan la serpiente y la cuenta atrás del bonus, y
      muestran el overlay "EN PAUSA" a pantalla completa.
- [ ] En pausa, flechas y `WASD` no cambian la dirección al reanudar.
- [ ] Al reanudar después de una pausa larga, la serpiente no avanza varias celdas de golpe.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón mostrando "REANUDAR".
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar detrás.
- [ ] Con el modal abierto, escribir un nombre en el input funciona, incluidas las letras `P`,
      `W`, `A`, `S` y `D`, y la serpiente no se mueve.
- [ ] JUGAR DE NUEVO deja la serpiente de 3 celdas quieta en el centro, el texto de inicio y el
      HUD en Puntuación 0 y Nivel `01`.
- [ ] `supabase/migrations/20261026000400_seed_snake.sql` existe y `list_migrations` muestra
      `seed_snake` aplicada.
- [ ] La tabla `games` contiene exactamente cuatro filas: `asteroides`, `tetris`, `arkanoid` y
      `snake`.
- [ ] Guardar con el nombre `Lucía Fernández` inserta en `scores` una fila con
      `game_id = 'snake'`, `player_name = 'Lucía Fernández'`, el puntaje final y `user_id` nulo.
- [ ] Tras guardar, `/juegos` lista SNAKE y `/juegos/snake` muestra `best` = ese puntaje,
      `plays` = 1 y la puntuación en su mini-tabla.
- [ ] Tras guardar, `/salon-de-la-fama` tiene las pestañas `GLOBAL`, `ASTEROIDES`, `TETRIS`,
      `ARKANOID` y `SNAKE`, y la puntuación aparece en `SNAKE` y en `GLOBAL` con la columna
      JUEGO = SNAKE.
- [ ] Tras guardar, el home muestra la puntuación en `▸ ÚLTIMAS PUNTUACIONES` y en
      `▸ TOP JUGADORES`.
- [ ] Tras SALIR y volver a entrar a `/juegos/snake/jugar` tres veces, la serpiente avanza a la
      misma velocidad que la primera vez y cada pulsación gira una sola vez (sin listeners ni
      loops duplicados).
- [ ] ASTEROIDES, TETRIS y ARKANOID se juegan igual que antes.
- [ ] La consola del navegador no muestra errores durante una partida completa de SNAKE.

## Decisions

- **Yes:** juego nuevo `SNAKE` con `id: "snake"`. Razón: decidido por el usuario; usa el nombre
  del género, como `tetris` y `arkanoid`.
- **No:** `serpiente` o `frutiserpiente`. Razón: descartados por el usuario.
- **Yes:** diseño original del género, sin recrear un juego comercial concreto. Razón: no hay
  código de referencia; la mecánica se fija completa en este spec.
- **Yes:** reemplazar el mock `serpentina`. Razón: decidido por el usuario. Es el primer juego
  real que sustituye a su mock en vez de convivir con él.
- **No:** convivir con `serpentina` como `rocas`/`asteroides`. Razón: descartado por el usuario.
- **Yes:** cuarta posición en `GAMES`, cat `ARCADE`, color `green`, portada `.cover-snake`.
  Razón: confirmado por el usuario; los juegos reales van primero y la portada ya dibuja una
  serpiente. Efecto colateral aceptado: el home (`GAMES.slice(0, 6)`) muestra ASTEROIDES,
  TETRIS, ARKANOID, SNAKE, BLOQUE BUSTER y CAÍDA.
- **No:** portada CSS nueva. Razón: `.cover-snake` ya existe y encaja.
- **Yes:** un solo spec para juego, fila en `games` y leaderboard. Razón: el flujo `/add-game`
  define un juego = un spec.
- **Yes:** usar el registro y el contrato de SPEC 07/08 sin cambiar `lib/games/types.ts` ni
  `GamePlayer`. Razón: `onScore`, `onLevel` y `hud.lives = false` ya existen (TETRIS lo usa).
- **Yes:** canvas 800×800 con banda HUD de 50 px y tablero de 32×30 celdas de 25 px. Razón:
  pedido por el usuario; un tablero más alto da más espacio de juego y el HUD del canvas no tapa
  la serpiente.
- **No:** 800×600 con 32×22, 32×32 sin banda ni celdas de 50 px (16×15). Razón: descartados por
  el usuario.
- **Yes:** bandas laterales negras para encajar el 1:1 en el 4:3 de `.crt-screen`. Razón:
  confirmado por el usuario; no cambia `GamePlayer` ni el CSS de la CRT.
- **No:** una pantalla CRT cuadrada solo para SNAKE (campo nuevo en el registro). Razón:
  descartado por el usuario; obligaría a tocar `GamePlayer` y el marco cambiaría de forma.
- **Yes:** muros mortales. Razón: confirmado por el usuario; más exigente y con más rango para
  el leaderboard.
- **No:** atravesar bordes. Razón: descartado por el usuario.
- **Yes:** una sola vida y un nivel cada 5 frutas, con velocidad `min(8 + (nivel − 1), 20)`
  pasos/s. Razón: confirmado por el usuario; el tope evita una velocidad injugable.
- **No:** 3 vidas ni aceleración por fruta sin niveles. Razón: descartados por el usuario.
- **Yes:** fruta normal de `10 × nivel` y bonus temporal de `50 × nivel` durante 5 s al subir de
  nivel, que no hace crecer. Razón: confirmado por el usuario; premia arriesgar sin alargar la
  serpiente.
- **No:** valor por tipo de fruta. Razón: descartado por el usuario; el sprite es decorativo.
- **Yes:** el bol de frutas (`bowl`) reservado para la bonus, parpadeando en su último 1.5 s.
  Razón: confirmado por el usuario; se distingue sin efectos extra.
- **Yes:** la partida espera la primera dirección. Razón: confirmado por el usuario; el jugador
  no pierde la serpiente mientras sitúa las manos.
- **Yes:** aspecto neón con la fila pixel art de `fruits.png`. Razón: confirmado por el usuario;
  encaja con la paleta de la plataforma.
- **No:** frutas realistas ni tablero claro a cuadros. Razón: descartados por el usuario.
- **Yes:** `imageSmoothingEnabled = false` al dibujar frutas. Razón: escalar 160 px a 25 px con
  suavizado emborrona el pixel art.
- **Yes:** HUD del canvas con `SCORE`, `NIVEL`, `LONGITUD` y la cuenta atrás del bonus. Razón:
  confirmado por el usuario; conviven los dos HUD como en los otros juegos.
- **Yes:** `SCORE` del canvas con `toLocaleString("es-ES")` y `NIVEL` con dos dígitos. Razón: así
  coinciden con el HUD React.
- **Yes:** flechas y `WASD` con cola de 2 giros. Razón: confirmado por el usuario; los giros
  rápidos no se pierden y la cola corta evita giros fantasma.
- **No:** ratón. Razón: no aporta en un juego de cuatro direcciones.
- **No:** `P`/`Escape` ni reinicio dentro del motor. Razón: la pausa y el reinicio son de
  `GamePlayer`, como en SPEC 05.
- **Yes:** overlay de pausa completo (sin `pauseOverlay`). Razón: SNAKE no tiene interacción en
  la pausa.
- **Yes:** sonido fuera de alcance. Razón: confirmado por el usuario; no hay archivos de sonido.
- **Yes:** copiar `fruits.png` entero y portar `sprites.js` a `sprites.ts`. Razón: confirmado por
  el usuario; las coordenadas del atlas siguen valiendo tal cual.
- **No:** recortar la fila pixel art en un PNG nuevo. Razón: descartado por el usuario; cambiaría
  las coordenadas.
- **Yes:** corregir los nombres del atlas según la imagen. Razón: confirmado por el usuario; los
  nombres de `sprites.js` están desfasados una posición y `bowl` tiene que ser identificable.
- **Yes:** `dt` limitado a 0.05 s, acumulador de paso fijo y `lastTime` reiniciado al reanudar.
  Razón: la velocidad no depende de los fps y una pausa no provoca un salto de varias celdas.
- **Yes:** tablero lleno termina la partida como `'gameover'`. Razón: no hay estado de victoria y
  sin celda libre no puede aparecer fruta.
- **Yes:** alta en `games` con una migración seed nueva, sin cambios de esquema. Razón: `ARCADE`
  ya está en el `CHECK` de `category`.
- **Yes:** el leaderboard funciona sin código nuevo. Razón: SPEC 06 lo construyó por `game_id`;
  solo falta la fila en `games`.

## Risks

| Riesgo                                                                            | Mitigación                                                                                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| React Strict Mode (dev) crea dos motores y cada uno su `Image`.                   | `destroy()` cancela rAF, quita listeners y anula `onload`; el criterio de las tres navegaciones lo valida. |
| El PNG no carga (ruta mal copiada o red).                                         | El juego no avanza y el tablero queda vacío; la verificación del paso 1 lo detecta antes.                  |
| `WASD` choca con escribir el nombre en el modal.                                  | El motor ignora el teclado en `'gameover'` y con el foco en `input`/`textarea`.                            |
| Algún enlace externo o guardado apunta a `/juegos/serpentina`.                    | Aceptado; responde 404. `serpentina` era un mock sin datos en Supabase.                                    |
| A 20 pasos/s y 60 fps, algunos frames ejecutan dos pasos y el movimiento tiembla. | Aceptado; el acumulador mantiene la velocidad exacta.                                                      |
| La fruta bonus aparece pegada a la cabeza y se come sin querer.                   | Aceptado; vale puntos y no hace crecer, así que no perjudica.                                              |
| Escalar 800×800 por CSS desenfoca el texto del canvas en pantallas pequeñas.      | Aceptado, igual que en SPEC 05, 07 y 08.                                                                   |
| `height: 100%` del canvas no resuelve si `.crt-screen` no tiene alto definido.    | `.crt-screen` lo define con `aspect-ratio: 4 / 3`; el criterio de las bandas lo verifica sin recorte.      |
| Con las bandas, el tablero se ve más pequeño que los juegos 4:3.                  | Aceptado; ocupa el 75% del ancho de la pantalla CRT.                                                       |

## Lo que **no** está en este spec

- Sonido.
- Controles táctiles, soporte para móvil o ratón.
- Portada CSS propia para `snake`.
- Frutas de las filas de dibujo o realista, y skins.
- Varias vidas, atravesar bordes, obstáculos o laberintos.
- Puntos distintos por tipo de fruta.
- Un canvas genérico que unifique los componentes por juego.
- Portar juegos de `references/started-games/`.
- Anti-trampas, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES`.

Cada uno de esos, si se implementa, va en su propio spec futuro.
