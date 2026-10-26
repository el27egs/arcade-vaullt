# SPEC 06 — Leaderboard y tabla de juegos en Supabase

> **Status:** Implemented
> **Depends on:** SPEC 04 (supabase-clientes), SPEC 05 (asteroides-juego-real)
> **Date:** 2026-10-26
> **Objective:** Crear en Supabase las tablas `games` (solo los juegos reales) y `scores`, guardar
> cada puntuación desde el modal de fin de partida y mostrar datos reales en una nueva tabla de
> juegos (`/juegos`), en el salón de la fama (global y por juego) y en la actividad del home.

## Por qué existe este spec

Hoy todo lo que la plataforma muestra sobre puntuaciones es inventado:

- El salón de la fama y la mini-tabla del detalle usan `seededScores()`, un generador
  pseudoaleatorio de nombres y puntajes.
- La sección "ACTIVIDAD EN VIVO" del home usa listas fijas (`TICKER`, `TOP_PLAYERS`).
- Al terminar una partida, `saveScore` (`lib/scores.ts`) guarda en `localStorage["av_scores"]`,
  pero nada lee esos datos.

SPEC 04 dejó los clientes de Supabase listos sin usarlos, y SPEC 05 dejó el primer juego real
(`ASTEROIDES`). Este spec los conecta.

**Etapa híbrida.** El destino es que el catálogo se cargue solo desde Supabase y que
`GAMES` de `lib/data.ts` desaparezca. En este spec conviven las dos fuentes:

- **Supabase** es la fuente de la tabla de juegos (`/juegos`), del salón de la fama, de la
  actividad del home y de todas las puntuaciones. Solo contiene juegos reales: hoy, `asteroides`.
- **`GAMES` mock** sigue alimentando biblioteca, la vista previa de juegos del home, el detalle y
  el reproductor, para no vaciar el sitio mientras solo hay un juego real. Borrarlo va en un spec
  siguiente.

La auth sigue siendo el mock de `lib/user-context.tsx`. Por eso `scores.user_id` existe pero es
opcional y hoy siempre queda en `null`: no se quiere obligar a nadie a autenticarse para jugar.

## Scope

**In:**

- **Esquema en Supabase**, versionado en el repo y aplicado con `apply_migration` del MCP:
  - `supabase/migrations/20261026000000_games_scores.sql`: tablas `games` y `scores`, índice,
    vista `games_with_stats` y políticas RLS.
  - `supabase/migrations/20261026000100_seed_games.sql`: inserta un único juego,
    `asteroides` / `ASTEROIDES` / `SHOOTER`.
  - No se siembra ninguna puntuación.
- **`games` es de solo lectura** desde la app: sin `insert`, `update` ni `delete` por RLS.
  Nadie edita juegos todavía.
- **`best` y `plays` calculados**, nunca guardados: `best = max(score)` y
  `plays = count(scores)` del juego, vía la vista `games_with_stats`.
- **`scores`** guarda `id`, `game_id`, `player_name`, `score`, `user_id` (nullable) y
  `created_at`.
- **RLS:**
  - `games` y `scores`: `select` para `anon` y `authenticated`.
  - `scores`: `insert` para `anon` y `authenticated` solo si:
    - `player_name` recortado tiene entre 1 y 20 caracteres;
    - `score` está entre 0 y 10 000 000;
    - `user_id` es `null` o igual a `auth.uid()`.
  - Que el juego exista lo garantiza la FK.
  - Sin `update`/`delete` en `scores`.
  - La vista se crea con `security_invoker = true`.
- **Tipos generados** con `generate_typescript_types` en `lib/supabase/database.types.ts`. Los
  dos `createClient()` de `lib/supabase/` pasan a ser tipados con `<Database>`.
- **Capa de lectura server-only** en `lib/queries.ts` (`import "server-only"`):
  - `getDbGames(): Promise<DbGame[]>` — juegos de Supabase con `best` y `plays`, ordenados por
    `title`;
  - `getDbGame(id): Promise<DbGame | null>`;
  - `getLeaderboard(gameId?: string, limit = 10): Promise<LeaderboardRow[]>` — top por `score`
    desc y, a igualdad, `created_at` asc. Sin `gameId` es el ranking **global** (todos los
    juegos mezclados);
  - `getRecentScores(limit = 5): Promise<LeaderboardRow[]>` — últimas por `created_at` desc.
  - Si Supabase devuelve error, la función lanza.
- **Nueva página `/juegos`** (`app/juegos/page.tsx` + `components/games-table.tsx`):
  - tabla de solo lectura con columnas JUEGO, CATEGORÍA, MEJOR PUNTUACIÓN y PARTIDAS;
  - solo lista los juegos de `getDbGames()`;
  - cada fila enlaza a `/juegos/[id]`;
  - sin juegos, muestra `NO HAY JUEGOS DISPONIBLES`.
- **Enlace `JUEGOS` en el nav** (`components/nav.tsx`), en desktop y en el menú móvil, entre
  BIBLIOTECA y SALÓN DE LA FAMA. Activo en `/juegos` y sus subrutas.
- **Salón de la fama** (`app/salon-de-la-fama/page.tsx` pasa a Server Component;
  `components/hall-of-fame.tsx` recibe props):
  - pestañas: `GLOBAL` (primera y por defecto) y una por cada juego de `getDbGames()`. Los
    juegos mock no aparecen;
  - `GLOBAL` muestra el top 10 de todos los juegos con una columna extra JUEGO;
  - cada pestaña de juego muestra su top 10;
  - podio con los 3 primeros; los puestos sin dato muestran `---`;
  - se cargan todos los rankings en el servidor (global + uno por juego) y las pestañas filtran
    en cliente, sin nueva consulta;
  - sin puntuaciones, el podio y la tabla se reemplazan por
    `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`;
  - se quita la fila inventada `▸ TU MEJOR MARCA EN …`.
- **Home, sección "ACTIVIDAD EN VIVO"** (`app/page.tsx` consulta y pasa props a
  `components/home.tsx`):
  - `▸ ÚLTIMAS PUNTUACIONES`: las 5 más recientes de `getRecentScores(5)`, con jugador, juego,
    puntaje y tiempo relativo (`HACE 3 MIN`, `HACE 2 H`, `HACE 4 D`);
  - `▸ TOP JUGADORES · HOY` pasa a `▸ TOP JUGADORES` y muestra el top 5 global de
    `getLeaderboard(undefined, 5)`;
  - sin puntuaciones, cada tarjeta muestra `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`;
  - si la consulta falla, el home no se cae: cada tarjeta muestra `SIN SEÑAL`;
  - se borran las constantes `TICKER` y `TOP_PLAYERS`.
- **Detalle `/juegos/[id]`** (`components/game-detail.tsx`), en modo híbrido:
  - la ficha (textos, portada) sigue saliendo de `GAMES`;
  - la mini-tabla de mejores puntuaciones usa `getLeaderboard(id)` para cualquier juego. Para
    los mock queda vacía y muestra `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`;
  - `best` y `plays` salen de `getDbGame(id)` si el juego existe en Supabase. Si no, se
    conservan los valores mock de `GAMES`.
- **Server Action `saveScore`** en `app/juegos/[id]/jugar/actions.ts` (`"use server"`):
  - recibe `{ gameId, playerName, score }`;
  - valida en servidor: `playerName.trim()` de 1 a 20 caracteres, score entero entre 0 y
    10 000 000, y que el juego exista en `games`;
  - inserta con el cliente de `lib/supabase/server.ts`, con `user_id: null`;
  - devuelve `{ ok: true } | { ok: false; error: string }`, mismo patrón que
    `app/acerca-de/actions.ts`.
- **Modal "FIN DEL JUEGO"** de `GamePlayer`:
  - el input acepta texto libre, tal cual lo escribe la persona (sin forzar mayúsculas), con
    máximo 20 caracteres. Se guarda recortado (`trim`);
  - se prellena con `localStorage["av_player_name"]`; si no hay, con `user.name` del login mock;
    si tampoco hay, vacío;
  - tras guardar con éxito, el nombre recortado se escribe en `localStorage["av_player_name"]`.
    En la siguiente partida basta con pulsar GUARDAR PUNTUACIÓN;
  - GUARDAR PUNTUACIÓN se deshabilita con el input vacío (tras `trim`) o mientras guarda
    (texto `GUARDANDO…`);
  - si la acción falla, el modal muestra el error y el botón queda disponible para reintentar,
    sin perder la puntuación;
  - `app/juegos/[id]/jugar/page.tsx` consulta `getDbGame(id)` y pasa `canSave` a `GamePlayer`.
    Si el juego no está en Supabase (los mock), no aparecen ni el input ni el botón. En su lugar
    se muestra `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`.
- **`app/error.tsx`** (cliente): pantalla `SIN SEÑAL` con REINTENTAR → `unstable_retry()` (API
  de Next 16). Cubre los fallos de lectura de `/juegos`, `/salon-de-la-fama`, el detalle y el
  reproductor.
- **Datos frescos en cada request**, sin caché: las páginas son dinámicas porque el cliente
  server lee cookies. Recargar después de guardar muestra la nueva puntuación.
- **Limpieza:**
  - se borra `lib/scores.ts`;
  - se borran `seededScores` y `PLAYERS` de `lib/data.ts`;
  - `GAMES` se queda (etapa híbrida);
  - los scores viejos de `localStorage["av_scores"]` no se migran.

**Out of scope (for future specs):**

- Borrar `GAMES` y cargar biblioteca, la vista previa del home, el detalle y el reproductor solo
  desde Supabase.
- Hacer jugables los juegos mock o agregarlos a la tabla `games`.
- Editar juegos (panel de administración) o borrar puntuaciones.
- Auth real, llenar `user_id` y la fila "tu mejor marca".
- Anti-trampas y rate limiting de inserts.
- Ranking con una fila por jugador, por periodo (hoy, semana) o paginado.
- Migrar los scores de `localStorage["av_scores"]`.
- Caché o revalidación del catálogo.
- Actualización en vivo (Realtime) del salón o del home.

## Data model

```sql
-- supabase/migrations/20261026000000_games_scores.sql (forma, no SQL final)
create table public.games (
  id          text primary key,            -- 'asteroides', igual que el id de la URL y de GAMES
  title       text not null,               -- 'ASTEROIDES'
  category    text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  created_at  timestamptz not null default now()
);

create table public.scores (
  id           bigint generated always as identity primary key,
  game_id      text not null references public.games(id),
  player_name  text not null check (char_length(btrim(player_name)) between 1 and 20),
  score        int  not null check (score between 0 and 10000000),
  user_id      uuid null references auth.users(id) on delete set null, -- opcional, hoy siempre null
  created_at   timestamptz not null default now()
);
create index scores_game_ranking_idx on public.scores (game_id, score desc, created_at asc);
create index scores_global_ranking_idx on public.scores (score desc, created_at asc);
create index scores_recent_idx on public.scores (created_at desc);

-- games + best/plays calculados
create view public.games_with_stats with (security_invoker = true) as
  select g.id, g.title, g.category,
         coalesce(max(s.score), 0) as best,
         count(s.id)               as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;
```

```ts
// lib/queries.ts — tipos de la capa de lectura
export interface DbGame {
  id: string;
  title: string;
  category: Category; // de lib/data.ts
  best: number;
  plays: number;
}

export interface LeaderboardRow {
  rank: number; // 1..N dentro de la consulta (en getRecentScores, orden de llegada)
  gameId: string;
  gameTitle: string; // para la columna JUEGO del ranking global y del home
  playerName: string;
  score: number;
  createdAt: string; // ISO; la UI lo formatea dd/mm/aaaa o como tiempo relativo
}
```

```ts
// app/juegos/[id]/jugar/actions.ts
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
export async function saveScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SaveScoreResult>;
```

```ts
// localStorage
"av_player_name"; // string: último nombre guardado con éxito, ya recortado
```

Convenciones:

- Columnas en `snake_case` en la base y `camelCase` en TS. El mapeo vive solo en
  `lib/queries.ts`.
- `best`, `plays` y puntajes se muestran con `toLocaleString("es-ES")`. Las fechas de las tablas
  se muestran en formato `dd/mm/aaaa`.
- El tiempo relativo del home lo calcula `timeAgo(iso)` en `lib/format.ts`.
- La regla del nombre (1–20 caracteres tras `trim`) existe en tres sitios a propósito: input,
  Server Action y `CHECK` de la base.
- El `id` de `games` coincide con el `id` de `GAMES`. Así el detalle y el reproductor híbridos
  pueden cruzar ambas fuentes.

## Implementation plan

1. Crear `supabase/migrations/20261026000000_games_scores.sql` con:
   - tablas, índices y vista (`security_invoker`);
   - `enable row level security` y políticas.

   Aplicarla con `apply_migration` (nombre `games_scores`). Verificación: `list_tables` muestra
   `games` y `scores` con RLS activo, y `get_advisors` (security) no reporta errores sobre ellas.
   La app no cambia.

2. Crear `supabase/migrations/20261026000100_seed_games.sql` con `asteroides` y aplicarla con
   `apply_migration` (nombre `seed_games`). Verificación:
   `select * from games_with_stats` devuelve 1 fila con `best = 0` y `plays = 0`.
3. Generar `lib/supabase/database.types.ts` con `generate_typescript_types` y tipar los dos
   `createClient()` de `lib/supabase/` con `<Database>`. `npm run build` compila.
4. Crear `lib/queries.ts` (`server-only`) con `getDbGames`, `getDbGame`, `getLeaderboard` y
   `getRecentScores`, y `lib/format.ts` con `timeAgo`. Nada los importa todavía; compila.
5. Crear `app/juegos/page.tsx` y `components/games-table.tsx` (diseño con `/frontend-design`,
   reutilizando clases y paleta existentes), con su estado vacío. Agregar `JUEGOS` al nav, en
   desktop y en móvil. Verificación: `/juegos` lista ASTEROIDES con 0 / 0, y la fila lleva a
   `/juegos/asteroides`.
6. Crear `app/error.tsx` (`"use client"`) con `SIN SEÑAL` y REINTENTAR → `unstable_retry()`.
   Verificación: con `NEXT_PUBLIC_SUPABASE_URL` inválida en `.env.local`, `/juegos` muestra
   `SIN SEÑAL`. Restaurar la variable después.
7. Crear `app/juegos/[id]/jugar/actions.ts` con `saveScore`. En
   `app/juegos/[id]/jugar/page.tsx`, pasar `canSave` a `GamePlayer`. En el modal:
   - input libre de 20 caracteres y prellenado desde `av_player_name` / `user.name`;
   - estados `GUARDANDO…`, guardado y error con reintento (`useTransition`);
   - escritura de `av_player_name` tras guardar;
   - variante `MODO DEMO`.

   Borrar `lib/scores.ts`. Verificación: una partida de ASTEROIDES guardada aparece en la tabla
   `scores` (`execute_sql`) y en `/juegos` (`plays` = 1).

8. Pasar el salón de la fama a datos reales:
   - `app/salon-de-la-fama/page.tsx` consulta `getDbGames()`, `getLeaderboard()` y un
     `getLeaderboard(id)` por juego;
   - `HallOfFame` con pestañas `GLOBAL` + juegos de Supabase, columna JUEGO en global, podio con
     huecos y estado vacío `SÉ EL PRIMERO…` (diseño con `/frontend-design`);
   - quitar la fila `TU MEJOR MARCA`.
9. Pasar la "ACTIVIDAD EN VIVO" del home a datos reales:
   - `app/page.tsx` consulta `getRecentScores(5)` y `getLeaderboard(undefined, 5)` dentro de
     un `try/catch` y pasa los datos, o un flag de error, a `Home`;
   - `Home` muestra filas, `SÉ EL PRIMERO…` o `SIN SEÑAL`;
   - borrar `TICKER` y `TOP_PLAYERS`.
10. Pasar el detalle a modo híbrido: `app/juegos/[id]/page.tsx` consulta `getLeaderboard(id)` y
    `getDbGame(id)`. `GameDetail` usa la mini-tabla real y su estado vacío, con `best`/`plays`
    de Supabase cuando existen. Borrar `seededScores` y `PLAYERS` de `lib/data.ts`. Correr
    `npm run lint` y `npm run build` limpios.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/` contiene los dos archivos `.sql` y ambos están aplicados en el
      proyecto remoto (`list_migrations` los muestra).
- [ ] La tabla `games` contiene exactamente una fila: `asteroides`.
- [ ] `get_advisors` (security) no reporta errores sobre `games`, `scores` ni `games_with_stats`.
- [ ] `scores` tiene las columnas `id`, `game_id`, `player_name`, `score`, `user_id` (nullable) y
      `created_at`.
- [ ] `lib/scores.ts` no existe y `grep -rn "seededScores\|av_scores\|TICKER\|TOP_PLAYERS" app
    components lib` no devuelve resultados.
- [ ] El nav muestra `JUEGOS` en desktop y en el menú móvil, y lleva a `/juegos`.
- [ ] `/juegos` muestra una tabla con una sola fila: ASTEROIDES, SHOOTER, mejor puntuación y
      partidas reales.
- [ ] `/biblioteca` sigue mostrando los 8 juegos de `GAMES`, como antes de este spec.
- [ ] Con `scores` vacía, `/salon-de-la-fama` muestra `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA
    FAMA` en `GLOBAL` y en `ASTEROIDES`, sin puntajes inventados.
- [ ] Con `scores` vacía, las dos tarjetas de "ACTIVIDAD EN VIVO" del home muestran
      `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`.
- [ ] Con `scores` vacía, `/juegos/asteroides` muestra mejor puntuación 0, partidas 0 y el mismo
      mensaje en su mini-tabla.
- [ ] El salón de la fama solo tiene las pestañas `GLOBAL` y `ASTEROIDES`; no aparecen los juegos
      mock.
- [ ] El salón de la fama no muestra la fila `TU MEJOR MARCA`, haya o no sesión mock.
- [ ] La primera vez que se abre el modal de ASTEROIDES sin sesión mock, el input está vacío y
      GUARDAR PUNTUACIÓN está deshabilitado.
- [ ] Escribir `Ana López` y guardar inserta una fila con `player_name = 'Ana López'` (sin pasar
      a mayúsculas), `game_id = 'asteroides'`, el puntaje final y `user_id` nulo.
- [ ] Tras ese guardado, `localStorage["av_player_name"]` vale `Ana López`. En la siguiente
      partida el modal aparece prellenado y basta con pulsar GUARDAR PUNTUACIÓN.
- [ ] El input no admite más de 20 caracteres, y un nombre de solo espacios deja el botón
      deshabilitado.
- [ ] Tras guardar, recargar `/salon-de-la-fama` muestra la puntuación en `GLOBAL` (con la
      columna JUEGO = ASTEROIDES) y en `ASTEROIDES`.
- [ ] Tras guardar, el home muestra esa puntuación en `▸ ÚLTIMAS PUNTUACIONES` con
      `HACE N MIN` y en `▸ TOP JUGADORES`.
- [ ] Tras guardar, `/juegos` y `/juegos/asteroides` muestran `best` = ese puntaje y
      `plays` = 1.
- [ ] Con 1 puntuación, el podio muestra el puesto 01 y `---` en 02 y 03.
- [ ] Con 12 puntuaciones, el salón muestra solo las 10 mayores, y el home solo 5 en cada
      tarjeta.
- [ ] Dos puntuaciones con el mismo score aparecen ordenadas de la más antigua a la más nueva.
- [ ] Al terminar una partida de un juego mock (p. ej. `/juegos/caida/jugar` → FIN), el modal
      muestra `MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA`, sin input ni botón de guardar.
- [ ] Llamar a `saveScore` con `gameId: "caida"`, con `playerName: "   "` o con `score: -1`
      devuelve `{ ok: false }` y no inserta filas.
- [ ] Con la publishable key (rol `anon`):
  - [ ] un `insert` con `user_id` distinto de `null` es rechazado por RLS;
  - [ ] `update` y `delete` sobre `scores` no modifican filas;
  - [ ] `insert`, `update` y `delete` sobre `games` no modifican filas.
- [ ] Si el guardado falla (p. ej. sin red), el modal muestra un error, conserva la puntuación y
      permite reintentar.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` inválida:
  - [ ] `/juegos` y `/salon-de-la-fama` muestran `SIN SEÑAL` con REINTENTAR;
  - [ ] el home carga y muestra `SIN SEÑAL` dentro de las dos tarjetas de actividad.
- [ ] La consola del navegador no muestra errores al recorrer `/`, `/juegos`,
      `/juegos/asteroides`, `/juegos/asteroides/jugar` y `/salon-de-la-fama`.

## Decisions

- **Yes:** un solo spec para leaderboard y tabla de juegos. Razón: decidido por el usuario.
- **Yes:** la tabla `games` solo contiene los juegos reales; hoy, `asteroides`. Razón:
  decidido por el usuario.
- **No:** sembrar los juegos mock en `games`. Razón: no son jugables y no deben poder tener
  puntuaciones.
- **Yes:** etapa híbrida. `/juegos`, el salón, la actividad del home y las puntuaciones salen
  de Supabase; biblioteca, la vista previa del home, el detalle y el reproductor siguen con
  `GAMES`. Razón: confirmado por el usuario; el destino es solo Supabase, pero vaciar el sitio a
  un juego va en el spec siguiente.
- **No:** borrar `GAMES` en este spec. Razón: descartado por el usuario para esta etapa.
- **Yes:** `games` de solo lectura (título y categoría), con `best`/`plays` calculados en la
  vista `games_with_stats`. Razón: decidido por el usuario; no se editan juegos todavía y así
  no hay columnas que se desincronicen.
- **No:** guardar en `games` portada, color o textos largos. Razón: esos datos siguen en
  `GAMES` durante la etapa híbrida; se migran cuando se borre `GAMES`.
- **Yes:** `plays` = número de puntuaciones guardadas. Razón: es el único dato real que existe;
  contar partidas iniciadas necesitaría otra tabla.
- **Yes:** `scores.user_id` nullable, con FK a `auth.users`, y hoy siempre `null`. Razón:
  decidido por el usuario; no se quiere obligar a autenticarse para jugar, pero la columna
  queda lista para el spec de auth.
- **Yes:** guardar con una Server Action que valida, más RLS que permite `insert` al rol `anon`
  con `CHECK`s. Razón: confirmado por el usuario; con auth mock no hay otro rol posible.
- **Yes:** aceptar que hoy se pueda falsear un score. Razón: anti-trampas necesita auth y
  validación de partida; va en otro spec.
- **Yes:** nombre de texto libre, guardado tal cual (sin forzar mayúsculas), de 1 a 20
  caracteres tras `trim`. Razón: confirmado por el usuario.
- **No:** filtro de caracteres o forzar mayúsculas. Razón: descartado por el usuario.
- **Yes:** recordar el nombre en `localStorage["av_player_name"]`, escrito solo tras un guardado
  exitoso. La prioridad de prellenado es `av_player_name` > `user.name` > vacío. Razón: decidido
  por el usuario, para que la siguiente vez baste con pulsar GUARDAR.
- **No:** prellenar con `INVITADO` como hoy. Razón: guardaría puntuaciones con un nombre que
  nadie escribió.
- **Yes:** los juegos que no están en `games` muestran `MODO DEMO` y no guardan. Razón:
  el reproductor mock inventa puntajes con un `setInterval`, y la FK los rechazaría de todos
  modos.
- **Yes:** nueva página `/juegos` con tabla de solo lectura y enlace `JUEGOS` en el nav. Razón:
  confirmado por el usuario.
- **Yes:** salón de la fama con pestaña `GLOBAL` (por defecto) más una por juego de Supabase;
  sin los juegos mock. Razón: decidido por el usuario ("global y por juegos", "solo los juegos
  jugables").
- **Yes:** top 10 con todas las entradas; a igualdad de score gana la más antigua. Razón:
  confirmado por el usuario en la primera ronda.
- **No:** una fila por nombre. Razón: los nombres son texto libre sin dueño; fusionaría
  jugadores distintos.
- **Yes:** sin puntuaciones, mostrar `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA` y nunca
  scores falsos. Razón: decidido por el usuario.
- **Yes:** conectar la "ACTIVIDAD EN VIVO" del home a Supabase. Razón: confirmado por el
  usuario.
- **Yes:** `TOP JUGADORES · HOY` pasa a `TOP JUGADORES` (histórico). Razón: con pocos datos, un
  filtro por día dejaría la tarjeta casi siempre vacía; los rankings por periodo van en otro
  spec.
- **Yes:** si falla la consulta, el home degrada dentro de las tarjetas (`SIN SEÑAL`) en vez de
  caer en `app/error.tsx`. Razón: la actividad es una sección secundaria del home y no debe
  tumbar la portada.
- **Yes:** el detalle usa la mini-tabla real para todos los juegos, y `best`/`plays` de Supabase
  solo cuando el juego existe ahí. Razón: cumple "sin scores falsos" sin adelantar el borrado de
  `GAMES`.
- **Yes:** quitar la fila `TU MEJOR MARCA`. Razón: confirmado por el usuario en la primera
  ronda; sin auth real no hay dueño de un score.
- **Yes:** SQL versionado en `supabase/migrations/` y aplicado con `apply_migration`; tipos
  generados en `lib/supabase/database.types.ts`. Razón: confirmado por el usuario.
- **Yes:** páginas dinámicas sin caché y `app/error.tsx` con `SIN SEÑAL`. Razón: confirmado por
  el usuario.
- **No:** vista SQL `leaderboard` con `row_number()`. Razón: con `order by` + `limit` por
  consulta basta, y el ranking global no necesita particionar.

## Risks

| Riesgo                                                                                             | Mitigación                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera con la publishable key puede insertar scores falsos o en masa.                          | Aceptado en este spec. Los `CHECK`s, la RLS y la FK limitan la forma, el rango y los juegos. Anti-trampas y rate limiting van en specs futuros.                                       |
| Con texto libre, un nombre puede ser ofensivo o contener HTML.                                     | React escapa el texto al renderizar. La moderación queda fuera de alcance; borrar filas se hace a mano por SQL hasta que exista un panel.                                             |
| Dos fuentes en la etapa híbrida (`GAMES` y `games`) pueden divergir: título o categoría distintos. | Los ids coinciden por convención y el seed copia título y categoría de `GAMES`. El spec siguiente elimina `GAMES`.                                                                    |
| La biblioteca muestra el `best` mock (0) de ASTEROIDES mientras `/juegos` muestra el real.         | Aceptado en la etapa híbrida; se resuelve al borrar `GAMES`.                                                                                                                          |
| La vista sin `security_invoker` se ejecutaría con permisos del creador y saltaría la RLS.          | Se crea con `security_invoker = true`; `get_advisors` lo verifica.                                                                                                                    |
| Si Supabase no responde, `/juegos`, el salón, el detalle y el reproductor no cargan.               | `app/error.tsx` muestra `SIN SEÑAL` con reintento; el home degrada dentro de sus tarjetas. Al escribir este spec el MCP reportó la base "no accesible": confirmarla antes del paso 1. |
| `localStorage` no disponible (modo privado).                                                       | Lectura y escritura de `av_player_name` en `try/catch`; sin él, el modal prellena con `user.name` o vacío y se puede guardar igual.                                                   |

## Lo que **no** está en este spec

- Borrar `GAMES` y cargar todo el catálogo solo desde Supabase.
- Agregar los juegos mock a `games` o hacerlos jugables.
- Editar juegos o borrar puntuaciones desde la app.
- Auth real y llenar `user_id`.
- Anti-trampas, rate limiting y moderación de nombres.
- Rankings por jugador, por periodo o paginados.
- Migración de los scores de `localStorage`.
- Caché, revalidación o Realtime.

Cada uno de esos, si se implementa, va en su propio spec futuro.
