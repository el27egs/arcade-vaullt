---
name: add-game
description: Genera un único spec combinado para agregar un juego a Arcade Vault (portado desde references/started-games/ o diseñado desde cero) — juego en canvas + integración en GamePlayer + fila en la tabla games + leaderboard en Supabase. Usa /spec como referencia. Solo escribe el spec; se implementa con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*)
---

# /add-game — Spec de un juego nuevo con su leaderboard

## Contexto de la sesión

Fecha de hoy (úsala en el header del spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay juegos de referencia"`

Motores ya portados:
!`ls lib/games/ 2>/dev/null || echo "lib/games/ no existe"`

Registro genérico de juegos:
!`ls lib/games/registry.ts 2>/dev/null || echo "NO EXISTE — este spec debe crearlo y migrar ASTEROIDES"`

Migraciones de Supabase:
!`ls supabase/migrations/ 2>/dev/null || echo "Sin migraciones"`

---

Esta skill produce **un único spec** que agrega un juego jugable a la plataforma **y** lo conecta
con su leaderboard. Es la fusión, para un juego concreto, de lo que SPEC 05 (juego en canvas) y
SPEC 06 (tabla `games` + leaderboard en Supabase) hicieron para ASTEROIDES.

**No escribes código.** Solo el archivo `specs/NN-<slug>.md`. La implementación la hace el
usuario después con `/spec-impl`.

## Reglas duras

- **Un juego = un spec.** El spec cubre a la vez el juego, su fila en la tabla `games` y su
  leaderboard. Nunca lo dividas en "spec del juego" y "spec del leaderboard".
- **Nunca escribas código, migraciones ni CSS.** Solo el `.md` del spec (y
  `specs/.spec-config.yml` si falta, como hace `/spec`).
- **Nunca asumas decisiones** que el usuario no confirmó. Pregunta en la Fase 2.
- **Responde en el idioma del prompt inicial.** El spec se escribe en el idioma de los specs
  existentes (hoy, español).
- **Juegos sin referencia:** diseña un juego **original** del género o idea que describa el
  usuario. No recrees un juego comercial concreto con otro nombre.
- Si el juego es demasiado grande (multijugador, editor de niveles, etc.), mueve esa parte a
  "Out of scope" en lugar de partir la integración en varios specs.
- Al terminar, **para**. No propongas implementar.

## Fase 1 — Contexto

1. Lee `CLAUDE.md` (y `AGENTS.md` si lo referencia).
2. Lee completos `specs/05-asteroides-juego-real.md` y `specs/06-leaderboard-y-catalogo-supabase.md`.
   Son el patrón del spec que vas a escribir. Lee también el spec más reciente de `specs/` para
   tomar convenciones nuevas (estados, encabezados, redacción).
3. Lee `integration.md` (en este mismo directorio). Es la lista de puntos que el spec **debe**
   fijar.
4. Lee el código actual de integración: `components/game-player.tsx`, `lib/data.ts` (ids,
   `CATS`, covers y mocks existentes), `lib/games/` (motores y, si existe, `registry.ts`),
   `components/games/`, `app/juegos/[id]/jugar/page.tsx` y la última migración seed de
   `supabase/migrations/`.
5. Identifica el origen del juego a partir de `$ARGUMENTS`:
   - **Con referencia:** `$ARGUMENTS` coincide con una carpeta de `references/started-games/`
     (nombre completo como `03-tetris`, solo el número `03` o solo el slug `tetris`). Lee todo
     su `README.md`, `CLAUDE.md`, `index.html`, `*.js`, `*.css` y lista sus `assets/`. Haz un
     inventario de lo que habrá que transformar al portarlo:
     - globals y accesos al DOM (`getElementById`, HUD o paneles en HTML fuera del canvas);
     - listeners en `window`/`document`/canvas y loop `requestAnimationFrame`;
     - teclas o botones propios de pausa, reinicio o tema (pasan a React o se eliminan);
     - assets (spritesheets, sonidos, niveles) y cómo se cargan;
     - tamaño del canvas y su encaje en el 4:3 de `.crt-screen`;
     - mecánica, puntos, vidas, niveles y condición de fin tal como están en el original.
   - **Sin referencia:** `$ARGUMENTS` es una descripción. Úsala como semilla del diseño
     original. Si viene vacío, pide una descripción de **una sola frase** del juego o pregunta
     qué carpeta de referencia portar.
6. Si `$ARGUMENTS` nombra un juego que ya tiene motor en `lib/games/` o fila en una migración
   seed, avisa y pregunta antes de seguir.

## Fase 2 — Preguntas

Usa `AskUserQuestion` en bloques de 3 a 5 preguntas, con 2–4 opciones y tu recomendación primero
(marcada "(Recomendado)"). Espera cada respuesta antes del siguiente bloque. No preguntes lo que
ya está decidido en SPEC 05/06 ni en `integration.md`, salvo que el juego lo contradiga.

Temas que siempre debes cerrar:

- **Identidad:** `id` (minúsculas, en español, es parte de la URL y del `games.id`), título,
  categoría (`ARCADE | PUZZLE | SHOOTER | VERSUS`; otra obliga a cambiar el `CHECK` de `games`,
  avísalo), color (`cyan | magenta | yellow | green`), textos `short`/`long`.
- **Portada:** clase CSS nueva diseñada con `/frontend-design` o reutilizar una existente.
- **Catálogo híbrido:** posición en `GAMES` y relación con un mock parecido (p. ej. `caida`
  para un tetris, `bloque-buster` para un arkanoid): ¿lo reemplaza o conviven, como `rocas` y
  `asteroides`?
- **HUD:** qué notifica el juego a React (score siempre; vidas y nivel si aplican; otros valores
  como líneas). Qué muestra el HUD React si el juego no tiene vidas o niveles. Si se conserva
  el HUD dentro del canvas.
- **Aspecto:** conservar el original o adaptarlo a la paleta neón.
- **Sonido y assets:** dentro o fuera de alcance; ruta en `public/games/<id>/`.
- **Controles:** mapeo de teclas, qué controles internos del original se eliminan (pausa y
  reinicio pasan a React) y si hay ratón.
- **Registro genérico:** si `lib/games/registry.ts` no existe, confirma que este spec lo crea y
  migra ASTEROIDES sin cambiar su comportamiento.
- **Sin referencia, además:** mecánica principal, puntos por acción, vidas, progresión de
  niveles, condición de fin y resolución lógica del canvas.

Deja de preguntar cuando puedas responder sin suponer nada:

1. ¿Qué archivos aparecen o cambian (código, CSS, migración, assets)?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que el juego y su leaderboard están terminados?

## Fase 3 — Leer la skill `/spec` (obligatorio antes de escribir)

Antes de crear el archivo del spec, lee completos:

- `.claude/skills/spec/SKILL.md`
- `.claude/skills/spec/template.md`

Úsalos como referencia de método y formato. Aplica sus Fases 3 y 4 y sus reglas globales:
header en blockquote con objetivo de una frase, Scope con **In** y **Out of scope**, Data model
con nombres reales, plan con pasos que dejan el sistema funcional, criterios booleanos,
Decisions con **Yes/No** y razón, Risks si aplica y la sección final de lo que no está. Sin
TODOs, nombres concretos, sin código largo.

Si `/spec` no está instalada (no existen esos archivos), avísalo al usuario y usa SPEC 05/06
como única referencia de formato.

## Fase 4 — Escribir el spec combinado

Escribe el spec completo siguiendo `template.md` y cubriendo **todos** los puntos de
`integration.md`. El contenido debe incluir, en un mismo documento:

- el motor del juego, su componente canvas, su entrada en el registro y su integración en
  `GamePlayer` (o la creación del registro, si aún no existe);
- su entrada en `GAMES` y su portada;
- su fila en la tabla `games` mediante una migración seed nueva;
- su leaderboard: guardado desde el modal, `/juegos`, pestaña del salón de la fama, actividad del
  home y mini-tabla del detalle, con sus criterios de aceptación.

Si tienes toda la información, escribe el spec entero de una vez (como `/spec`). Solo si falta
algo, ve sección por sección pidiendo confirmación.

## Fase 5 — Guardar

1. Número: el mayor de `specs/` más uno, con dos dígitos.
2. Slug corto en kebab-case a partir del objetivo (p. ej. `caida-tetris-juego-real`).
3. `**Status:** Draft` (o el equivalente que usen los specs del repo).
4. `**Depends on:** SPEC 05, SPEC 06` y, si el registro ya existe, el spec que lo creó.
   Comprueba que cada spec referenciado exista.
5. `**Date:**` con la fecha del contexto de la sesión.
6. Escribe `specs/NN-<slug>.md` sin pedir permiso. Solo pregunta si el archivo ya existe.
7. Si falta `specs/.spec-config.yml`, créalo con el contenido por defecto que indica `/spec`.
8. Confirma al usuario:
   - ruta del spec creado;
   - que está en `Draft` y debe pasarlo a `Approved` tras revisarlo;
   - siguiente paso: `/spec-impl NN-<slug>`.

Y para.
