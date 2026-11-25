# GAME JAM TRAVESIA · SPEC 02 — TRAVESÍA: catálogo en Supabase y leaderboard

> **Status:** Draft
> **Depends on:** SPEC 07 (tetris-juego-real-y-leaderboard), SPEC 08 (arkanoid-juego-real-y-leaderboard), SPEC 09 (snake-juego-real-y-leaderboard), game-jam/travesia/01-travesia-juego
> **Date:** 2026-11-16
> **Game jam:** tema "Cruza la carretera y el río sin convertirte en papilla."
> **Objective:** Dar de alta `travesia` en la tabla `games` con una migración seed para que
> TRAVESÍA guarde puntuaciones y aparezca en el detalle, el salón de la fama y el home.

## Por qué existe este spec

`game-jam/travesia/01-travesia-juego` deja TRAVESÍA jugable en `/juegos/travesia/jugar`, pero en
`MODO DEMO`: `app/juegos/[id]/jugar/page.tsx` calcula `canSave = dbGame !== null` con `getDbGame`,
y `travesia` todavía no existe en `public.games`.

SPEC 06 construyó el leaderboard por `game_id`, así que basta con insertar la fila del juego para
que todo lo demás funcione sin código nuevo:

- el modal de fin muestra el input y GUARDAR PUNTUACIÓN;
- `saveScore` (`app/juegos/[id]/jugar/actions.ts`) inserta en `scores`;
- `/juegos/travesia` lee `best`/`plays` y la mini-tabla de Supabase;
- `/salon-de-la-fama` añade la pestaña del juego (lee `getDbGames`);
- el home muestra sus puntajes en la actividad en vivo.

Este spec también registra TRAVESÍA en `references/implemented-games.md`, la lista de juegos con
juego real y leaderboard.

## Scope

**In:**

- **Supabase:** migración `supabase/migrations/20261026000500_seed_travesia.sql` que inserta
  `('travesia', 'TRAVESÍA', 'ARCADE')` en `public.games`:
  - timestamp = último existente (`20261026000400_seed_snake.sql`) + `100`;
  - aplicada con `apply_migration` del MCP de Supabase (nombre `seed_travesia`);
  - título y categoría copiados de la entrada `travesia` de `GAMES`;
  - sin cambios de esquema ni de `lib/supabase/database.types.ts`: `ARCADE` ya está en el
    `CHECK` de `games.category`;
  - no se siembra ninguna puntuación.
- **Leaderboard**, sin código nuevo, gracias a la fila en `games`:
  - `/juegos/travesia/jugar` recibe `canSave = true`; el modal muestra el input y GUARDAR
    PUNTUACIÓN en lugar de `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`;
  - `saveScore` inserta en `scores` con `game_id = 'travesia'`;
  - `/juegos/travesia` muestra `best`/`plays` de `games_with_stats` y su mini-tabla real;
  - `/salon-de-la-fama` añade la pestaña `TRAVESÍA` y sus puntajes entran en `GLOBAL`;
  - el home muestra sus puntajes en `▸ ÚLTIMAS PUNTUACIONES` y `▸ TOP JUGADORES`;
  - `/biblioteca` sigue mostrando TRAVESÍA quinta (no depende de Supabase).
- **Escritura del nombre en el modal:** con el input visible, las teclas del juego (`WASD`,
  flechas, `Espacio`) no mueven a Pipo y se escriben en el input. Lo garantiza el motor del spec
  01, que ignora el teclado en `'gameover'` y con el foco en un `input`; este spec lo verifica.
- **Documentación:** nueva fila en la tabla de `references/implemented-games.md`, después de
  `snake`:

  | ID         | Título   | Categoría | Color  | Descripción                                             |
  | ---------- | -------- | --------- | ------ | ------------------------------------------------------- |
  | `travesia` | TRAVESÍA | ARCADE    | yellow | Cruza el tráfico y el canal para entregar cada paquete. |

**Out of scope (for future specs):**

- Cualquier cambio en el motor, el canvas, el registro, `GAMES` o la portada (son del spec 01).
- Cambios de esquema, nuevas categorías o regenerar `lib/supabase/database.types.ts`.
- Sembrar puntuaciones de ejemplo.
- Anti-trampas, rate limiting, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES` y cargar el catálogo solo desde Supabase.
- Recuperar la página `/juegos` (eliminada en SPEC 07).

## Data model

Este spec no introduce estructuras nuevas en el código. Solo añade una fila a `public.games`.

```sql
-- supabase/migrations/20261026000500_seed_travesia.sql
-- GAME JAM TRAVESIA · SPEC 02 — TRAVESÍA: quinto juego real del catálogo.
insert into public.games (id, title, category)
values ('travesia', 'TRAVESÍA', 'ARCADE');
```

Filas esperadas en `public.games` tras aplicar la migración:

| `id`         | `title`    | `category` |
| ------------ | ---------- | ---------- |
| `asteroides` | ASTEROIDES | SHOOTER    |
| `tetris`     | TETRIS     | PUZZLE     |
| `arkanoid`   | ARKANOID   | ARCADE     |
| `snake`      | SNAKE      | ARCADE     |
| `travesia`   | TRAVESÍA   | ARCADE     |

Fila que inserta `saveScore` al guardar la partida de prueba:

| Columna       | Valor                       |
| ------------- | --------------------------- |
| `game_id`     | `'travesia'`                |
| `player_name` | `'Diego Navarro'`           |
| `score`       | la Puntuación final del HUD |
| `user_id`     | `null`                      |

Estado de React en `GamePlayer` para `travesia` tras este spec (sin cambios de código):

| Estado      | Lo escribe                            | Lo lee                           |
| ----------- | ------------------------------------- | -------------------------------- |
| `canSave`   | prop de la página (`dbGame !== null`) | modal: input o `MODO DEMO`       |
| `draftName` | input del modal                       | `name`, botón GUARDAR PUNTUACIÓN |
| `saved`     | `saveScore` con éxito; JUGAR DE NUEVO | modal (`▸ PUNTUACIÓN GUARDADA_`) |
| `saveError` | `saveScore` con error; JUGAR DE NUEVO | modal (`▸ ERROR AL GUARDAR: …`)  |

Convenciones:

- `games.id` = `GAMES[].id` = `travesia`; `games.title` = `TRAVESÍA` con tilde, igual que en
  `GAMES`.
- El último nombre guardado con éxito se recuerda en `localStorage.av_player_name`, como en los
  demás juegos.

## Implementation plan

1. Crear `supabase/migrations/20261026000500_seed_travesia.sql` con el `insert` de Data model.
   Verificación: el archivo existe y el nombre sigue el patrón `<timestamp>_seed_<id>.sql`.
2. Aplicarla con `apply_migration` del MCP de Supabase (nombre `seed_travesia`). Verificación:
   `list_migrations` muestra `seed_travesia` y `select * from games_with_stats where id =
'travesia'` devuelve `best = 0` y `plays = 0`.
3. Comprobar en `/juegos/travesia/jugar` que, al terminar una partida, el modal muestra el input y
   GUARDAR PUNTUACIÓN. Sin cambios de código.
4. Añadir la fila de `travesia` a la tabla de `references/implemented-games.md`, después de
   `snake`.
5. Correr `npm run lint` y `npm run build` limpios.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/20261026000500_seed_travesia.sql` existe y `list_migrations` muestra
      `seed_travesia` aplicada.
- [ ] La tabla `games` contiene exactamente cinco filas: `asteroides`, `tetris`, `arkanoid`,
      `snake` y `travesia`.
- [ ] La fila `travesia` tiene `title = 'TRAVESÍA'` y `category = 'ARCADE'`.
- [ ] `lib/supabase/database.types.ts` no cambia.
- [ ] Antes de guardar nada, `/juegos/travesia` muestra Partidas `0` y Mejor global `0`.
- [ ] Al terminar una partida (por FIN o al perder la tercera vida), el modal "FIN DEL JUEGO"
      muestra el input `TU NOMBRE` y el botón GUARDAR PUNTUACIÓN, y no muestra
      `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.
- [ ] Con el modal abierto, escribir `Diego Navarro` en el input funciona, incluidas las letras
      `D`, `A`, `S` y `W`, el espacio y la `P`, y Pipo no se mueve.
- [ ] Guardar con el nombre `Diego Navarro` muestra `▸ PUNTUACIÓN GUARDADA_` e inserta en
      `scores` una fila con `game_id = 'travesia'`, `player_name = 'Diego Navarro'`, el puntaje
      final del HUD y `user_id` nulo.
- [ ] Tras guardar, `/juegos/travesia` muestra Mejor global = ese puntaje, Partidas = 1 y la
      puntuación de `Diego Navarro` en su mini-tabla.
- [ ] Tras guardar, `/salon-de-la-fama` tiene las pestañas `GLOBAL`, `ASTEROIDES`, `TETRIS`,
      `ARKANOID`, `SNAKE` y `TRAVESÍA`, y la puntuación aparece en `TRAVESÍA` y en `GLOBAL` con la
      columna JUEGO = TRAVESÍA.
- [ ] Tras guardar, el home muestra la puntuación de `Diego Navarro` en `▸ ÚLTIMAS PUNTUACIONES`
      (`▸ TRAVESÍA`) y en `▸ TOP JUGADORES`.
- [ ] Al volver a `/juegos/travesia/jugar` y terminar otra partida, el input aparece prellenado
      con `Diego Navarro`.
- [ ] JUGAR DE NUEVO tras guardar oculta `▸ PUNTUACIÓN GUARDADA_` y deja el HUD en Puntuación 0,
      Vidas `♥ ♥ ♥` y Nivel `01`.
- [ ] `/biblioteca` sigue mostrando `TRAVESÍA` como quinto juego.
- [ ] `references/implemented-games.md` tiene la fila `travesia` con `TRAVESÍA`, `ARCADE`, `yellow`
      y `Cruza el tráfico y el canal para entregar cada paquete.`
- [ ] ASTEROIDES, TETRIS, ARKANOID y SNAKE siguen guardando puntuaciones y sus pestañas del salón
      de la fama no cambian.
- [ ] La consola del navegador no muestra errores al jugar, terminar y guardar una partida de
      TRAVESÍA.

## Decisions

- **Yes:** migración `20261026000500_seed_travesia.sql`. Razón: decidido por el agente game-jam
  (tema "Cruza la carretera y el río sin convertirte en papilla."); la última es
  `20261026000400_seed_snake.sql` y cada seed suma `100`. La jam tiene un solo juego, así que no
  hay colisiones.
- **Yes:** `apply_migration` con nombre `seed_travesia`. Razón: mismo patrón que `seed_tetris`,
  `seed_arkanoid` y `seed_snake`.
- **Yes:** título `TRAVESÍA` con tilde en `games.title`. Razón: decidido por el agente game-jam
  (tema "Cruza la carretera y el río sin convertirte en papilla."); se copia de `GAMES` para que
  la pestaña del salón y la columna JUEGO coincidan con la biblioteca; `text` admite UTF-8.
- **Yes:** sin cambios de esquema. Razón: `ARCADE` ya está en el `CHECK` de `games.category`.
- **No:** sembrar puntuaciones. Razón: la plataforma no inventa cifras; `best`/`plays` salen de
  partidas reales.
- **Yes:** el leaderboard funciona sin código nuevo. Razón: SPEC 06 lo construyó por `game_id`;
  solo falta la fila en `games`.
- **Yes:** un spec separado del juego. Razón: decidido por el agente game-jam (tema "Cruza la
  carretera y el río sin convertirte en papilla."); el formato de la jam separa el juego jugable
  (01) del alta en Supabase (02), y cada uno deja el sistema funcional.
- **Yes:** nombre de prueba `Diego Navarro`. Razón: decidido por el agente game-jam (tema "Cruza
  la carretera y el río sin convertirte en papilla."); realista, en español y distinto de los de
  SPEC 07–09 (`Ana López`, `Lucía Fernández`).
- **No:** criterio "la página `/juegos` lista TRAVESÍA" del checklist de integración. Razón:
  `/juegos` responde 404 desde SPEC 07 (no existe `app/juegos/page.tsx`); `best`/`plays` se
  verifican en `/juegos/travesia`.
- **Yes:** criterio de escritura en el input del modal en este spec y no en el 01. Razón: en el 01
  el modal está en `MODO DEMO` y no tiene input.
- **Yes:** registrar TRAVESÍA en `references/implemented-games.md`. Razón: esa lista recoge los
  juegos con fila en `games` y leaderboard; desde este spec TRAVESÍA lo es.
- **No:** tocar `references/game-suggestions-todo.md`. Razón: es la memoria de `game-planner`; la
  game jam no la usa.

## Risks

| Riesgo                                                                    | Mitigación                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| La migración se crea en el repo pero no se aplica en Supabase.            | El paso 2 la aplica con `apply_migration` y el criterio de `list_migrations` lo verifica.                  |
| Otro spec usa el mismo timestamp `20261026000500` antes que este.         | Antes de crear el archivo se lista `supabase/migrations/`; si ya existe, se usa el siguiente libre `+100`. |
| La tilde de `TRAVESÍA` se guarda mal por la codificación del archivo SQL. | El archivo se guarda en UTF-8, como los demás; el criterio comprueba `title = 'TRAVESÍA'`.                 |
| `WASD` o `Espacio` chocan con escribir el nombre en el modal.             | El motor del spec 01 ignora el teclado en `'gameover'` y con el foco en `input`; el criterio lo verifica.  |
| Las puntuaciones de prueba quedan en `scores` (sin `delete` por RLS).     | Aceptado; se guardan con el nombre realista del spec y no se borran.                                       |
| Supabase no responde y el home o el salón muestran `SIN SEÑAL`.           | Aceptado; es el comportamiento degradado de SPEC 06. El juego sigue jugable.                               |

## Lo que **no** está en este spec

- Cambios en el juego, el canvas, el registro, `GAMES` o la portada.
- Cambios de esquema o de tipos de Supabase.
- Puntuaciones sembradas.
- Anti-trampas, rankings por periodo o por jugador y Realtime.
- Borrar `GAMES`.
- La página `/juegos`.

Cada uno de esos, si se implementa, va en su propio spec futuro.
