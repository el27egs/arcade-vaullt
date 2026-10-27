# Checklist de integración de un juego en Arcade Vault

Destilado de SPEC 05 (ASTEROIDES en canvas) y SPEC 06 (tabla `games` + leaderboard). El spec que
genera `/add-game` debe fijar **cada** punto de esta lista, adaptado al juego. Si un punto no
aplica, el spec lo dice en Decisions con su razón.

Antes de copiar nombres de archivos o funciones de aquí, compruébalos contra el código actual:
esta lista refleja el repo al crearse la skill.

## 1. Frontera juego ↔ React

- **El juego vive en el canvas.** Simulación, dibujo y (si se decide) su propio HUD ocurren ahí.
- **React controla.** `GamePlayer` es dueño de pausa, fin manual y reinicio. El juego nunca se
  pausa ni se reinicia por iniciativa propia.
- **El juego notifica.** Cada cambio de puntaje, vidas, nivel y el fin de partida se avisan por
  callbacks, **solo cuando el valor cambia**.
- Los controles internos del original de pausa, reinicio o tema se eliminan. El overlay
  `GAME OVER` del canvas pierde el texto "pulsa X para reiniciar".

## 2. Motor

- Archivo `lib/games/<id>/engine.ts`, en TypeScript, sin React ni globals.
- Contexto 2D, input y assets llegan por cierre o parámetro, nunca por `document.getElementById`.
- Resolución lógica fija (800×600 por defecto, 4:3 como `.crt-screen`), escalada solo por CSS.
  Si el original no es 4:3 (p. ej. un tablero vertical), el spec fija cómo se encaja: paneles
  laterales dibujados en el canvas o bandas.
- `dt` en segundos, limitado a 0.05 s. Al reanudar se reinicia `lastTime`.
- Estado interno explícito (p. ej. `'playing' | 'dead' | 'gameover'`) más el flag `paused`, que
  solo escribe `setPaused`.
- Input registrado en `start()` y quitado en `destroy()`. Ignora teclas y no hace
  `preventDefault` en pausa, en `gameover` o con el foco en `input`/`textarea`. En juego hace
  `preventDefault` de sus teclas (flechas, `Space`, etc.) para que la página no haga scroll.
- Los HUD o paneles que el original pinta en HTML se dibujan en el canvas o se pasan al HUD React.
- Assets en `public/games/<id>/`, cargados por el motor y liberados (o ignorados) en `destroy()`.
  Sonido solo si el spec lo mete en alcance.

## 3. Contrato común y registro genérico

Lo crea el primer spec que lo necesite (el segundo juego real). Los siguientes solo lo usan.

```ts
// lib/games/types.ts
export interface GameCallbacks {
  onScore(score: number): void;
  onLives?(lives: number): void;
  onLevel?(level: number): void;
  onGameOver(finalScore: number): void; // última vida perdida o end()
}
export interface GameEngine {
  start(): void;
  setPaused(paused: boolean): void;
  end(): void;
  restart(): void;
  destroy(): void;
}
export type CreateEngine = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
```

```ts
// lib/games/registry.ts
export interface GameRegistryEntry {
  createEngine: CreateEngine;
  width: number; // resolución lógica del canvas
  height: number;
  hud: { lives: boolean; level: boolean }; // qué muestra el HUD React
}
export const GAME_REGISTRY: Record<string, GameRegistryEntry>;
```

Si el spec **crea** el registro, también incluye:

- `components/games/game-canvas.tsx` genérico, generalizando `asteroides-canvas.tsx`: callbacks
  guardados en una ref (un re-render no recrea el motor), `onReady(engine)`, `engine.start()` al
  montar y `destroy()` en el cleanup.
- ASTEROIDES adaptado al contrato y registrado, sin cambiar su comportamiento. Se decide si
  `asteroides-canvas.tsx` se borra.
- `GamePlayer` sustituye las condiciones `game.id === "asteroides"` por
  `GAME_REGISTRY[game.id]`: motor real si hay entrada, mock actual si no.
- Criterio de aceptación de regresión: ASTEROIDES se juega igual que antes.

Si el registro **ya existe**, el spec solo añade la entrada del juego.

## 4. GamePlayer

- Pausa siempre vía su estado `paused`, sincronizado con `engine.setPaused`:
  botón PAUSA/REANUDAR, `P` y `Escape` (ignorados con el modal abierto o el foco en un `input`),
  y `blur`/`visibilitychange` ponen `paused = true` sin reanudar solos.
- FIN → `engine.end()` → `onGameOver(score)` abre el modal.
- JUGAR DE NUEVO → `engine.restart()`, cierra el modal, `paused = false`.
- SALIR → navega; el desmontaje llama a `destroy()`.
- HUD React: Puntuación siempre; Vidas y Nivel según `hud` del registro.

## 5. Catálogo híbrido (`lib/data.ts`)

- Entrada en `GAMES` con `id` igual a `games.id`, `title`, `cat`, `cover`, `color`, `short`,
  `long` en español, `best: 0` y `plays: "0"` (no se inventan cifras).
- Posición en la lista y relación con un mock parecido (reemplazo o convivencia), decididas por
  el usuario.
- Portada: clase `.cover-<id>` en `app/globals.css` diseñada con `/frontend-design`, o reuso de
  una existente.

## 6. Supabase: tabla `games`

- Nueva migración `supabase/migrations/<YYYYMMDDHHMMSS>_seed_<id>.sql` con
  `insert into public.games (id, title, category) values (...)`, título y categoría copiados de
  `GAMES`.
- Se aplica con `apply_migration` del MCP (nombre `seed_<id>`); `list_migrations` la muestra.
- Sin cambios de esquema ni de `lib/supabase/database.types.ts`, salvo que haga falta una
  categoría nueva (cambiar el `CHECK` de `games.category` y `CATS`, regenerar tipos).
- No se siembra ninguna puntuación.

## 7. Leaderboard

Con la fila en `games`, lo siguiente funciona sin código nuevo. El spec lo declara en Scope y lo
verifica en los criterios:

- `app/juegos/[id]/jugar/page.tsx` pasa `canSave = true` → el modal muestra input y GUARDAR
  PUNTUACIÓN (no `MODO DEMO`).
- `saveScore` (`app/juegos/[id]/jugar/actions.ts`) inserta en `scores` con `game_id = '<id>'`.
- `/juegos` lista el juego con mejor puntuación y partidas reales (`games_with_stats`).
- `/salon-de-la-fama` añade la pestaña del juego y sus puntajes entran en `GLOBAL`.
- El home muestra sus puntajes en ÚLTIMAS PUNTUACIONES y TOP JUGADORES.
- `/juegos/<id>` muestra su mini-tabla real y `best`/`plays` de Supabase.

## 8. Fuera de alcance por defecto

Salvo que el usuario lo meta en alcance: controles táctiles/móvil, anti-trampas y rate limiting,
rankings por periodo o por jugador, Realtime, borrar `GAMES`, hacer jugables otros mocks,
portar otros juegos de referencia.

## 9. Criterios de aceptación base

Adáptalos al juego con números y textos exactos:

- `npm run build` y `npm run lint` terminan sin errores.
- `/biblioteca` muestra el juego en la posición acordada con su portada.
- `/juegos/<id>/jugar` carga el juego real dentro del marco CRT, con scanlines encima.
- Los controles acordados hacen lo esperado; pulsarlos no hace scroll.
- Cada acción puntuable suma exactamente los puntos del spec al HUD React.
- HUD del canvas (si existe) y HUD React muestran siempre los mismos valores.
- Perder vidas / subir de nivel se refleja en el HUD React (si aplica).
- PAUSA, `P` y `Escape` congelan el juego y muestran "EN PAUSA"; reanudar tras una pausa larga no
  produce saltos; cambiar de pestaña deja el juego en pausa.
- FIN y la condición de fin del juego abren el modal "FIN DEL JUEGO" con la puntuación del HUD.
- Con el modal abierto, las teclas del juego no lo afectan y se pueden escribir nombres
  (incluida la `P`).
- JUGAR DE NUEVO deja puntuación 0 y el estado inicial.
- `games` contiene la fila `<id>` y `list_migrations` muestra la migración seed.
- Guardar inserta en `scores` una fila con `game_id = '<id>'`, el nombre y el puntaje final.
- Tras guardar: `/juegos` y `/juegos/<id>` muestran `best` = ese puntaje y `plays` = 1; el salón
  lo muestra en `GLOBAL` (columna JUEGO = título) y en la pestaña del juego; el home lo muestra
  en las dos tarjetas de actividad.
- Tras SALIR y volver a entrar tres veces, el juego va a la misma velocidad (sin loops ni
  listeners duplicados).
- Si este spec crea el registro: ASTEROIDES se juega y guarda igual que antes.
- La consola no muestra errores durante una partida completa.
