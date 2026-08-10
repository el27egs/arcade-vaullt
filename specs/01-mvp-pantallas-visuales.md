# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Status:** Approved
> **Depends on:** (ninguno — primer spec del proyecto)
> **Date:** 2026-08-03
> **Objective:** Portar las 5 pantallas del prototipo estático de `references/templates/`
> (Biblioteca, Detalle, Reproductor, Ingreso, Salón de la Fama) a rutas reales de Next.js
> App Router con TypeScript, sin implementar ningún juego jugable de verdad.

## Por qué existe este spec

El codebase actual es el scaffold de `create-next-app`, pero ya tiene el tema visual y las
fuentes portados en `app/layout.tsx` y `app/globals.css` (trabajo de un commit anterior). Falta
construir las pantallas reales que consuman ese sistema visual ya existente — este spec cubre
esa brecha, no el diseño.

## Scope

**In:**

- 5 pantallas convertidas a rutas reales del App Router:
  - Biblioteca → `/`
  - Detalle de juego → `/juegos/[id]`
  - Reproductor → `/juegos/[id]/jugar`
  - Ingreso → `/ingresar`
  - Salón de la Fama → `/salon-de-la-fama`
- Nav compartido (logo, enlaces, contador de créditos estático, botón de sesión, menú móvil)
  integrado en `app/layout.tsx`.
- Footer estático integrado en `app/layout.tsx`.
- Capa de datos mock tipada (`lib/data.ts`) portando `GAMES`, `CATS`, `PLAYERS`, `seededScores`.
- Estado de sesión mock (`lib/user-context.tsx`), persistido en `localStorage` bajo la clave
  `av_user`, sin backend ni validación real.
- Guardado de puntuaciones simuladas (`lib/scores.ts`), persistido en `localStorage` bajo la
  clave `av_scores`.
- Pantalla Reproductor con la simulación visual del template (puntuación que sube sola, subida
  de nivel, pausa, modal de fin de partida) — es UI animada, no un juego jugable.
- Manejo de `id` de juego inválido con `notFound()` de Next.js.
- Reutilización íntegra del sistema visual ya portado (`app/globals.css`, fuentes en
  `app/layout.tsx`) — no se toca CSS ni fuentes.

**Out of scope (for future specs):**

- Implementación real de cualquiera de los 8 minijuegos (Bloque Buster, Caída, Serpentina,
  Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Autenticación real (backend, validación de contraseña, OAuth Google/GitHub — botones sociales
  quedan decorativos, igual que el template).
- Persistencia en servidor / base de datos.
- Sistema de créditos funcional (el contador "CRÉDITOS · 03" queda estático).
- Multijugador o partidas en vivo.
- Tests automatizados (el repo no tiene setup de test todavía).

## Data model

```ts
// lib/data.ts
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export type Category = Exclude<(typeof CATS)[number], "TODOS">;

export interface Game {
  id: string; title: string; short: string; long: string;
  cat: Category; cover: string; color: "cyan" | "magenta" | "yellow" | "green";
  best: number; plays: string;
}
export const GAMES: Game[] = [ /* 8 juegos, portados literalmente de data.jsx */ ];
export const PLAYERS: string[] = [ /* pool de nombres, portado literalmente */ ];

export interface ScoreRow { rank: number; name: string; score: number; date: string }
export function seededScores(seed: number, count?: number): ScoreRow[] { /* PRNG determinista */ }
```

```ts
// lib/user-context.tsx
export type User = { name: string } | null;
// UserProvider ("use client"): hidrata desde localStorage["av_user"] en useEffect
// (no en el estado inicial, para evitar mismatch de SSR). Expone login(u)/logout().
// useUser(): hook que lee el context.
```

```ts
// lib/scores.ts
export interface SavedScore { game: string; score: number; name: string; at: number }
// getSavedScores(): SavedScore[]  — lee localStorage["av_scores"], try/catch → []
// saveScore(entry): void          — hace push y persiste, try/catch → no-op
```

## Implementation plan

1. Crear `lib/data.ts` portando `GAMES`, `CATS`, `PLAYERS`, `seededScores` desde
   `references/templates/data.jsx`, con los tipos `Game`, `Category`, `ScoreRow`.
2. Crear `lib/user-context.tsx` con `UserProvider`, `useUser`, hidratando desde
   `localStorage["av_user"]` en `useEffect`.
3. Crear `lib/scores.ts` con `getSavedScores`/`saveScore` sobre `localStorage["av_scores"]`.
4. Crear `components/nav.tsx` portando `nav.jsx`, usando `usePathname`, `next/link` y `useUser`.
5. Integrar `UserProvider`, `Nav` y un footer estático en `app/layout.tsx`, sin tocar las
   fuentes ni los divs `.av-bg`/`.av-noise`/`#root` ya existentes.
6. Reemplazar `app/page.tsx` (hoy boilerplate) por `components/library.tsx`
   (`Library` + `GameCard`), portando búsqueda, filtro por categoría y efecto tilt.
7. Crear `app/juegos/[id]/page.tsx` (Server Component) con `GameDetail`
   (`components/game-detail.tsx`), usando `notFound()` si el `id` no existe en `GAMES`.
8. Crear `app/juegos/[id]/jugar/page.tsx` con `components/game-player.tsx` (`GamePlayer`),
   portando HUD, visual CRT, simulación de puntuación/nivel y modal de fin de partida que
   guarda vía `lib/scores.ts`.
9. Crear `app/ingresar/page.tsx` con `components/auth.tsx` (`Auth`), portando tabs de
   inicio/registro, modo invitado y botones sociales decorativos.
10. Crear `app/salon-de-la-fama/page.tsx` con `components/hall-of-fame.tsx` (`HallOfFame`),
    portando tabs por juego, podio y tabla de posiciones.
11. Crear `app/not-found.tsx` (estilos `.crt`/`.pixel` ya existentes) para IDs de juego
    inválidos y rutas inexistentes.

Cada paso deja el proyecto compilando y navegable — nada de "mitad implementado".

## Acceptance criteria

- [ ] `/` muestra la biblioteca con búsqueda y filtro por categoría funcionando sobre los 8
      juegos de `lib/data.ts`.
- [ ] Click en una tarjeta o en "JUGAR" navega a `/juegos/[id]` con los datos del juego correcto.
- [ ] `/juegos/id-invalido` muestra la pantalla de no encontrado en vez de un error sin manejar.
- [ ] `/juegos/[id]` muestra el leaderboard generado por `seededScores` y "JUGAR AHORA" navega
      a `/juegos/[id]/jugar`.
- [ ] `/juegos/[id]/jugar` incrementa la puntuación automáticamente y sube de nivel cada 2500
      puntos, igual que el template.
- [ ] "PAUSA" detiene el incremento de puntuación; "FIN" abre el modal de fin de partida.
- [ ] Guardar la puntuación en el modal la persiste en `localStorage["av_scores"]` y muestra el
      mensaje de confirmación.
- [ ] `/ingresar` permite "iniciar sesión" con cualquier usuario no vacío, guarda el usuario en
      `localStorage["av_user"]` y redirige a `/`.
- [ ] Tras iniciar sesión, el Nav muestra el nombre de usuario en vez de "Iniciar Sesión".
- [ ] "JUGAR COMO INVITADO" navega a `/` sin crear sesión.
- [ ] Cerrar sesión desde el Nav borra `localStorage["av_user"]` y vuelve a mostrar
      "Iniciar Sesión".
- [ ] `/salon-de-la-fama` muestra podio y tabla del juego seleccionado mediante tabs.
- [ ] La fila "tu mejor marca" del Salón de la Fama solo aparece si hay un usuario logueado.
- [ ] El menú móvil (hamburguesa) del Nav abre y cierra el panel lateral en viewports angostos.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisions

- **Yes:** rutas reales del App Router en vez de router SPA por hash. Razón: más idiomático en
  Next.js 16; confirmado por el usuario.
- **No:** router por hash como el template. Descartado por menos idiomático en App Router.
- **Yes:** segmentos de URL en español (`/juegos/[id]`, `/ingresar`, `/salon-de-la-fama`),
  alineados con el copy visible y los nombres del template.
- **Yes:** mantener la simulación de puntuación del Reproductor (`setInterval`). Razón: es
  animación de UI, no un juego real; confirmado por el usuario como dentro de "solo visual".
- **Yes:** persistencia en `localStorage` para sesión y puntuaciones, sin backend. Razón: ya es
  el comportamiento del template y no requiere infraestructura nueva; confirmado por el usuario.
- **Yes:** estado de sesión compartido vía React Context (`lib/user-context.tsx`) en vez de
  prop-drilling desde un único componente raíz. Razón: con rutas reales ya no hay un único
  componente `App` que pase `user`/`onLogin` como props; el Context es el mecanismo idiomático
  del App Router para compartir estado entre `layout.tsx`, páginas y el Nav.
- **No:** NextAuth.js o cualquier solución de autenticación real. Fuera de alcance — el login
  sigue siendo mock, igual que el template.
- **Yes:** `app/juegos/[id]/page.tsx` como Server Component (sin `"use client"`). Razón:
  `detalle.jsx` no tiene interactividad propia; los botones se resuelven con `<Link>` y
  `seededScores` es cómputo puro.
- **Yes:** `notFound()` de Next.js con un único `app/not-found.tsx` raíz para IDs de juego
  inválidos. Razón: evita manejar el caso "no encontrado" manualmente en cada pantalla y es la
  convención de Next.js App Router (confirmado contra `node_modules/next/dist/docs/`, `params`
  es `Promise<{id}>` en esta versión).
- **No:** reconstruir el CSS con utilidades de Tailwind. Descartado — el sistema visual ya está
  portado íntegro en `app/globals.css`/`app/layout.tsx`; se reutiliza tal cual.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` no disponible (modo privado / durante SSR) | Todo acceso se envuelve en `try/catch`; el estado de usuario/puntuaciones cae a memoria/vacío sin romper la UI, igual que el template. |
| Los 8 selectores CSS `.cover-*` dependen de nombres exactos en `lib/data.ts` (`game.cover`) | Los valores de `cover` se copian literalmente de `data.jsx`; no se inventan nombres nuevos. |

## Lo que **no** está en este spec

- Implementación jugable de los 8 minijuegos.
- Autenticación real / backend / base de datos.
- Sistema de créditos funcional.
- Tests automatizados.

Cada uno de esos, si se implementa, va en su propio spec futuro.
