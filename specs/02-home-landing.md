# SPEC 02 — Home landing y reubicación de la Biblioteca

> **Status:** Approved
> **Depends on:** SPEC 01 (mvp-pantallas-visuales)
> **Date:** 2026-08-14
> **Objective:** Portar la pantalla Home de `references/templates/home-about/home.jsx` a la
> ruta `/`, reubicando la Biblioteca actual (spec 01) a `/biblioteca`.

## Por qué existe este spec

Spec 01 dejó la Biblioteca sirviendo directamente en `/`. El template de referencia separa una
landing page ("Inicio") de la Biblioteca como dos pantallas distintas en el Nav. Este spec cierra
esa brecha: agrega el Home real y reordena las rutas para que `/` sea la puerta de entrada.

## Scope

**In:**

- Nueva pantalla Home portada de `home.jsx` a `/` con todas sus secciones: hero (con
  silueta decorativa flotante y CTAs), "¿Por qué Arcade Vault?" (feature grid), vista previa de
  juegos (`GAMES.slice(0, 6)`), stats, "Actividad en Vivo" (ticker + top jugadores), precios/FAQ
  y CTA final.
- Reubicación de la Biblioteca actual (componente `Library`, hoy montado en `app/page.tsx`) a
  `app/biblioteca/page.tsx` (`/biblioteca`), sin cambios de comportamiento.
- Actualización de `components/nav.tsx`: nuevo enlace "Inicio" (`/`), enlace "Biblioteca"
  apuntando a `/biblioteca`, y lógica de estado activo ajustada — en desktop y en el panel móvil.
- Estilos de Home (`.home*`, `.hero-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.home-final*`,
  `.reveal`/`.reveal.in`, `@keyframes float`/`bounce`) portados literalmente al final de
  `app/globals.css`.
- Animación reveal-on-scroll (`IntersectionObserver` sobre `.reveal`) igual que `useReveal` en
  el template.

**Out of scope (for future specs):**

- Pantalla "Acerca de" (`about.jsx`) y su formulario de contacto — spec futuro.
- Cualquier cambio a `/juegos/[id]`, `/juegos/[id]/jugar`, `/ingresar`, `/salon-de-la-fama`,
  `lib/data.ts`, `lib/user-context.tsx` o `lib/scores.ts`.
- Datos reales/dinámicos para "Actividad en Vivo" y "Top Jugadores" — quedan como los arrays
  fijos hardcodeados en el template (no derivados de `lib/data.ts`).
- Sistema de créditos funcional (sigue estático, ya fuera de alcance desde spec 01).

## Data model

Sin datos nuevos. Se reutiliza `GAMES` de `lib/data.ts` para la vista previa de juegos
(`GAMES.slice(0, 6)`). Los arrays de "Actividad en Vivo" y "Top Jugadores" se copian literales
desde `home.jsx` como constantes locales dentro de `components/home.tsx`, sin exportarlos ni
tipar una estructura compartida.

## Implementation plan

1. Crear `app/biblioteca/page.tsx` con `export default function BibliotecaPage() { return <Library />; }`,
   portando literalmente el contenido actual de `app/page.tsx`.
2. Portar al final de `app/globals.css` el bloque "HOME PAGE" de
   `references/templates/home-about/styles.css` (selectores `.home`, `.home-hero*`, `.hero-*`,
   `.home-title*`, `.home-sub`, `.home-ctas`, `.home-silos*`, `@keyframes float`,
   `@keyframes bounce`, `.home-section`, `.section-*`, `.feature-grid`, `.feature-card*`,
   `.mini-rail`, `.mini-card*`, `.mini-cover`, `.mini-meta`, `.mini-title`, `.mini-cat`,
   `.home-stats*`, `.stats-inner`, `.stat-block`, `.stat-n`, `.stat-u`, `.stat-s`,
   `.home-final*`, `.final-*`, `.reveal`/`.reveal.in`), sin tocar nada existente.
3. Crear `components/home.tsx` (`"use client"`) portando `Home`, `FloatingSilhouettes`,
   `MiniCard` y `FeatureIcon` desde `home.jsx`:
   - Reemplazar `navigate({ name: "biblioteca" })` por navegación a `/biblioteca`.
   - Reemplazar `navigate({ name: "auth" })` por navegación a `/ingresar`.
   - Reemplazar `navigate({ name: "detalle", id })` (click en `MiniCard`) por
     `router.push(\`/juegos/${game.id}\`)`, mismo patrón que `GameCard` en
     `components/library.tsx`.
   - Reemplazar `navigate({ name: "salon" })` por navegación a `/salon-de-la-fama`.
   - CTAs de destino fijo (`EXPLORAR JUEGOS`, `CREAR CUENTA`, `VER TODOS LOS JUEGOS →`,
     `EMPEZAR GRATIS →`, `INSERTAR MONEDA →`) como `next/link`, igual patrón que
     `components/game-detail.tsx`.
   - Copiar literalmente los arrays de "Actividad en Vivo" y "Top Jugadores".
4. Reemplazar `app/page.tsx` para que renderice `<Home />` en vez de `<Library />`.
5. Actualizar `components/nav.tsx`: agregar enlace "Inicio" (activo en `pathname === "/"`),
   cambiar el enlace "Biblioteca" para apuntar a `/biblioteca` (activo en
   `pathname === "/biblioteca" || pathname.startsWith("/juegos")`), replicando ambos cambios en el
   panel móvil.

Cada paso deja el proyecto compilando y navegable.

## Acceptance criteria

- [ ] `/` muestra la nueva pantalla Home (hero, "¿Por qué Arcade Vault?", vista previa de
      juegos, stats, actividad en vivo, precios, CTA final) en vez de la Biblioteca.
- [ ] `/biblioteca` muestra la Biblioteca (búsqueda + filtro por categoría) que antes vivía en `/`,
      con el mismo comportamiento.
- [ ] "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" navegan a `/biblioteca`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/ingresar`.
- [ ] Las tarjetas de "Juegos disponibles ahora" (primeros 6 juegos de `lib/data.ts`) navegan a
      `/juegos/[id]` con el juego correcto.
- [ ] "VER SALÓN →" navega a `/salon-de-la-fama`.
- [ ] El CTA final "INSERTAR MONEDA →" navega a `/biblioteca`.
- [ ] Las secciones con clase `.reveal` se animan al hacer scroll (`IntersectionObserver`).
- [ ] El Nav muestra "Inicio" activo en `/` y "Biblioteca" activo en `/biblioteca` y en `/juegos/*`,
      tanto en desktop como en el panel móvil.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisions

- **Yes:** Home pasa a vivir en `/`, Biblioteca se mueve a `/biblioteca`. Razón: decisión
  original (ruta en inglés `/games`) revertida durante la implementación a pedido explícito del
  usuario — vuelve a `/biblioteca`, como estaba antes de este spec.
- **No:** incluir la pantalla "Acerca de" (`about.jsx`) en este spec. Razón: confirmado por el
  usuario — queda para un spec futuro.
- **Yes:** portar literalmente los arrays de "Actividad en Vivo" y "Top Jugadores" tal cual
  están hardcodeados en el template. Razón: confirmado por el usuario, consistente con la
  decisión de spec 01 de no inventar/derivar datos nuevos.
- **Yes:** `components/home.tsx` como Client Component (`"use client"`). Razón: usa
  `useEffect`/`IntersectionObserver` para el efecto reveal-on-scroll, igual que `useReveal` en
  el template.
- **Yes:** `next/link` para los CTAs de destino fijo y `router.push` para `MiniCard`, mismo
  patrón que `components/library.tsx` y `components/game-detail.tsx` de spec 01.
- **No:** tocar `app/juegos/*`, `app/ingresar`, `app/salon-de-la-fama`, `lib/*` — fuera de
  alcance, este spec solo reestructura `/` y agrega `/biblioteca`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Spec 01 (Approved) documenta "`/` muestra la biblioteca" como criterio de aceptación. | Ese criterio queda obsoleto por esta reestructuración; no se edita retroactivamente el archivo de spec 01 (es histórico), el comportamiento vigente pasa a ser el de este spec. |
| Enlaces externos o marcadores que apunten a `/` esperando la Biblioteca. | No aplica todavía — el proyecto no está desplegado; sin usuarios externos que dependan de la ruta actual. |

## Lo que **no** está en este spec

- Pantalla "Acerca de" y su formulario de contacto.
- Cambios a las pantallas de detalle, reproductor, ingreso o salón de la fama.
- Datos dinámicos para actividad/top jugadores.
- Sistema de créditos funcional.

Cada uno de esos, si se implementa, va en su propio spec futuro.
