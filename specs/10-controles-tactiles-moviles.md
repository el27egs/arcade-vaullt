# SPEC 10 — Controles táctiles: jugar los juegos reales en un móvil

> **Status:** Implemented
> **Depends on:** SPEC 05 (asteroides-juego-real), SPEC 07 (tetris-juego-real-y-leaderboard), SPEC 08 (arkanoid-juego-real-y-leaderboard), SPEC 09 (snake-juego-real-y-leaderboard)
> **Date:** 2026-11-25
> **Objective:** Añadir a `/juegos/[id]/jugar` un modo táctil (pantalla vertical, mando virtual y
> fila de botones), configurado por juego en `GAME_REGISTRY` y activo solo en dispositivos
> táctiles, para que ASTEROIDES, TETRIS, ARKANOID y SNAKE se puedan jugar en un móvil en vertical.

## Por qué existe este spec

Los cuatro juegos reales solo se controlan con teclado:

- ASTEROIDES: `ArrowLeft`/`ArrowRight` giran, `ArrowUp` empuja y `Space` dispara (estado de
  teclas pulsadas más un `justPressed` para el disparo).
- TETRIS: `ArrowLeft`/`ArrowRight` mueven, `ArrowDown` baja, `ArrowUp`/`KeyX` rotan y `Space`
  hace caída directa (cada `keydown` es una acción, la repetición la pone el sistema operativo).
- ARKANOID: `ArrowLeft`/`ArrowRight` (teclas pulsadas), `mousemove` en el canvas mueve la paleta
  y `click` elige nivel en la pausa.
- SNAKE: flechas o `WASD`; la primera flecha arranca la partida desde `'ready'`.

En un móvil no hay teclado. El `mousemove` de ARKANOID tampoco llega de forma continua al
arrastrar el dedo. Además, el reproductor está pensado para escritorio. Su canvas 4:3, la barra
de navegación y el HUD no caben juntos en el alto de un teléfono en vertical.

Todos los motores escuchan `keydown`/`keyup` en `window` y leen `e.code`. Por eso un mando que
despacha `KeyboardEvent` sintéticos con el mismo `e.code` hace jugables los cuatro juegos sin
tocar su lógica. Los motores solo cambian en dos cosas: el arrastre de la paleta de ARKANOID y un
layout vertical opcional (`setLayout`) que reorganiza el dibujo sin cambiar la jugabilidad.

Este spec se amplió durante la implementación tras probarlo en un teléfono real. La sección
"Ajustes durante la implementación" registra qué cambió respecto al borrador aprobado. El resto
del documento describe el estado final.

## Scope

**In:**

- **Contrato (`lib/games/types.ts`):** tipos nuevos `TouchButton`, `TouchControls` y
  `GameLayout`; método opcional `setLayout?(layout)` en `GameEngine` (ver Data model).
- **Registro (`lib/games/registry.ts`):** campo opcional `touch?: TouchControls` en
  `GameRegistryEntry`, rellenado para los cuatro juegos con este mapa:

  | Juego        | Cruceta                                                                              | A (roja)            | B (azul)          | `portrait`  | Canvas táctil |
  | ------------ | ------------------------------------------------------------------------------------ | ------------------- | ----------------- | ----------- | ------------- |
  | `asteroides` | ↑ `ArrowUp`, ← `ArrowLeft`, → `ArrowRight`                                           | `DISPARO` → `Space` | —                 | `600 / 800` | 600×800       |
  | `tetris`     | ↑ `ArrowUp`, ↓ `ArrowDown` (repite), ← `ArrowLeft` (repite), → `ArrowRight` (repite) | `ROTAR` → `ArrowUp` | `CAÍDA` → `Space` | `420 / 600` | 420×600       |
  | `arkanoid`   | ← `ArrowLeft`, → `ArrowRight`                                                        | —                   | —                 | `680 / 880` | 680×880       |
  | `snake`      | ↑ `ArrowUp`, ↓ `ArrowDown`, ← `ArrowLeft`, → `ArrowRight`                            | —                   | —                 | `1`         | 800×800       |

  Las etiquetas de la cruceta son flechas (`↑ ↓ ← →`). Una dirección sin tecla asignada no se
  dibuja (hueco en la cruceta).

- **Componente `components/touch-controls.tsx`** (`"use client"`), `TouchControls({ controls })`:
  - cruceta en cruz de 3×3 a la izquierda y botones de acción redondos a la derecha;
  - las acciones se muestran como **A** (`actions[0]`, roja, a la derecha) y **B**
    (`actions[1]`, azul, a su izquierda); `label` no se pinta, va en `aria-label` y `title`
    (p. ej. "A: Rotar");
  - `pointerdown` en un botón → `setPointerCapture` y `window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }))`;
  - `pointerup`, `pointercancel` y `lostpointercapture` → `keyup` con el mismo `code`;
  - un botón ya pulsado no despacha un segundo `keydown` por otro `pointerdown`;
  - **multitáctil:** cada botón sigue su propio `pointerId`, así que ASTEROIDES puede girar,
    empujar y disparar a la vez;
  - **repetición** solo en los botones con `repeat: true`: tras el `keydown` inicial, otro
    `keydown` con `repeat: true` a los 170 ms y luego cada 50 ms, hasta soltar;
  - al desmontar el componente, todo botón pulsado despacha su `keyup` y se limpian los timers;
  - los botones son `<button type="button" tabIndex={-1}>` con `aria-label` en español
    (p. ej. "Izquierda", "A: Disparo"); `pointerdown` hace `preventDefault()` para no robar el
    foco ni seleccionar texto; `contextmenu` se cancela.
- **`components/game-player.tsx`:**
  - detecta el puntero táctil con `useSyncExternalStore` sobre `matchMedia("(pointer: coarse)")`
    (`false` en el servidor); `touchMode = coarse && entry?.touch !== undefined`;
  - `.av-player` lleva la clase `has-touch` si el juego tiene `touch`, y el estilo en línea
    `--portrait-ratio: <touch.portrait>` si lo declara;
  - `.crt-screen` lleva la clase `can-portrait` si el juego declara `touch.portrait`;
  - llama a `engine.setLayout?.("portrait")` en modo táctil con `touch.portrait`, y
    `"landscape"` en otro caso; lo hace en `onReady` y cada vez que cambia el modo;
  - renderiza, debajo de `.crt`, `<TouchControls controls={entry.touch} />` y la fila
    `.touch-bar` con **PAUSA/REANUDAR**, el selector **TEMA** (el mismo JSX `skinSelect` que usa
    el HUD) y **SALIR**; no hay FIN en táctil;
  - en modo táctil, la pausa usa siempre un aviso a pantalla completa con la clase
    `touch-resume`. Es un `<button>` con "EN PAUSA / TOCA PARA CONTINUAR" que reanuda al
    tocarlo. Sustituye a los overlays `"full"` y `"compact"`.
- **Motores con layout vertical** (`setLayout`): reorganizan el dibujo sin cambiar la jugabilidad.
  Redimensionan `canvas.width/height` y redibujan al instante, también en pausa:
  - **TETRIS** (`lib/games/tetris/engine.ts`): `LAYOUTS.portrait = 420×600`; tablero de 10×20 a
    `x = 10`; columna derecha con SCORE, LINES, LEVEL y NEXT (valores a 16 px, bloques de NEXT a
    20 px); sin panel CONTROLS (no hay teclado);
  - **ASTEROIDES** (`lib/games/asteroides/engine.ts`): el mundo pasa a 600×800 (`W`/`H` de
    módulo, devueltos a 800×600 al crear el motor); nave, balas, asteroides y partículas se
    reescalan al mundo nuevo y siguen dando la vuelta por los bordes;
  - **ARKANOID** (`lib/games/arkanoid/engine.ts`): 680×880; el muro de bloques (640 px) queda
    centrado y la paleta a 40 px del fondo; al cambiar de layout a mitad de partida se desplazan
    bloques, explosiones, paleta y pelota; el selector de nivel de la pausa se centra con `H / 2`;
  - **SNAKE:** sin cambios en el motor. Su tablero fijo de 32×30 ya es un canvas cuadrado de
    800×800, así que `portrait: 1` solo hace la CRT cuadrada y quita las bandas laterales.
- **ARKANOID, arrastre táctil:** listeners `pointerdown` y `pointermove` en el canvas que solo
  actúan si `e.pointerType !== "mouse"`. Mueven la paleta con la misma regla que `onMouseMove`
  (centrada en `x`, acotada a `[0, W − paddle.w]`), solo en `'playing'` y sin pausa. Se quitan en
  `destroy()`.
- **CSS (`app/globals.css`), modo táctil** dentro de `@media (pointer: coarse)`:
  - `.touch-pad` y `.touch-bar` existen siempre en el DOM y solo se ven aquí;
  - **pantalla limpia:** con `body:has(.av-player.has-touch)` se ocultan `.av-nav`,
    `.av-mobile-backdrop`, `.av-mobile-panel` y `#root > footer`; se oculta también
    `.player-hud`. El resto de páginas no cambia;
  - **todo cabe en el alto visible:** `.av-player.has-touch .crt` limita su ancho a
    `calc((100svh − var(--touch-chrome)) × var(--screen-ratio) + 20px)`, con
    `--touch-chrome: 380px`, `--screen-ratio: 4 / 3` y `var(--portrait-ratio)` si hay
    `.can-portrait`; `.crt-screen.can-portrait` usa `aspect-ratio: var(--portrait-ratio)`;
  - **espacios:** `.av-player.has-touch` con `margin-top: 28px` y `padding-bottom: 20px`;
    `margin-top: 24px` entre la CRT y el mando, y entre el mando y la fila de botones;
  - `.crt-bottom` a 7 px y sin saltos de línea (`white-space: nowrap`).
- **CSS, mando** (fuera de la media query; se ve solo por la regla anterior):
  - cruceta: cuadrados de 54×54 px con `border-radius: 10px`, fondo y borde blancos tenues,
    flechas en fuente de sistema a 24 px;
  - acciones: círculos de 62 px en `var(--pixel)`; A en magenta (`rgba(255,0,110,…)`) y B en azul
    (`rgba(40,120,255,…)`); `.touch-actions` usa `flex-direction: row-reverse`;
  - pulsado visible con la clase `is-down` (brillo, fondo más intenso y `scale(0.94)`);
  - `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y
    `-webkit-tap-highlight-color: transparent` en `.touch-pad`; `touch-action: none` en
    `.crt-screen canvas`.
- **CSS, pantallas estrechas** en `@media (max-width: 600px)`: `.crt` con `padding: 10px`; HUD
  compacto (valores a 12 px, `.hud-actions` a ancho completo con `flex-wrap`); `.crt-bottom` sin
  su texto central. Esto aplica también a una ventana de escritorio estrecha.
- **Modal de fin de partida** en `@media (pointer: coarse), (max-width: 600px)`:
  `.modal .input-row` pasa a columna, de modo que **GUARDAR PUNTUACIÓN** va debajo de la caja del
  nombre, a todo el ancho.
- **Documentación:** `CLAUDE.md` (Games architecture) describe `touch`, `touch.portrait`,
  `setLayout` y `components/touch-controls.tsx`.

**Out of scope (for future specs):**

- Gestos (deslizar en SNAKE/TETRIS, zonas táctiles en ASTEROIDES).
- Layout optimizado para horizontal, pantalla completa (Fullscreen API) y bloqueo de orientación.
- Vibración (`navigator.vibrate`).
- Cambiar los textos del canvas que nombran teclas ("PULSA UNA FLECHA PARA EMPEZAR" de SNAKE).
- Botón FIN en táctil.
- Selector de nivel de la pausa de ARKANOID en táctil (lo tapa el aviso "TOCA PARA CONTINUAR").
- Hacer que el reproductor de **escritorio** quepa en el alto de la ventana (hoy la CRT de 1100 px
  de ancho obliga a desplazar en monitores de 1080p). Queda pendiente para su propio spec.
- Mando para TRAVESÍA (game jam): lo añadirá su propio spec al implementarse, siguiendo la receta
  de este documento.
- Mando para los juegos mock.
- Actualizar `/add-game`, `game-jam` o `skin-designer` para exigir el campo `touch`.
- Commitear `next.config.ts` (`allowedDevOrigins` con la IP de la LAN y `devIndicators: false`
  son ajustes locales de desarrollo).
- Un toggle para mostrar u ocultar el mando.

## Data model

```ts
// lib/games/types.ts
export type GameLayout = "landscape" | "portrait";

export interface GameEngine {
  // …métodos existentes…
  // Solo juegos con touch.portrait: "portrait" en táctil, "landscape" si no.
  // Cambia el tamaño lógico del canvas y redibuja al instante.
  setLayout?(layout: GameLayout): void;
}

// Un botón del mando táctil: emite keydown/keyup sintéticos en window con este e.code.
export interface TouchButton {
  code: string; // "ArrowLeft", "Space", …
  label: string; // cruceta: la flecha visible ("←"); acciones: el nombre ("ROTAR"), solo en aria-label
  repeat?: boolean; // true: repite keydown a 170 ms y luego cada 50 ms
}

export interface TouchControls {
  dpad: Partial<Record<"up" | "down" | "left" | "right", TouchButton>>;
  actions: TouchButton[]; // [0] = A (principal), [1] = B
  // Proporción ancho/alto de la pantalla en táctil (p. ej. 0.7 = 420×600). Con
  // ella la CRT cambia de forma y el motor recibe setLayout("portrait").
  portrait?: number;
}
```

```ts
// lib/games/registry.ts (fragmento)
export interface GameRegistryEntry {
  // …campos existentes…
  touch?: TouchControls; // sin valor = sin modo táctil
}
```

Convenciones:

- `key` del evento sintético: `" "` para `Space` y el propio `code` para las flechas.
- La repetición usa `setTimeout` (170 ms) y luego `setInterval` (50 ms), por botón.
- `touch.portrait` es el cociente exacto del canvas vertical del motor (`420 / 600`, no `0.7`
  redondeado), para que la CRT y el canvas coincidan sin bandas.
- Cada motor con `setLayout` declara un objeto `LAYOUTS = { landscape: {…}, portrait: {…} }` con
  el tamaño lógico de cada modo. El horizontal es el original del juego.
- No hay persistencia nueva: el modo táctil no guarda nada en `localStorage`.

## Implementation plan

1. Añadir `TouchButton` y `TouchControls` a `lib/games/types.ts` y el campo opcional `touch` a
   `GameRegistryEntry`. Sin datos todavía: compila y nada cambia.
2. Rellenar `touch` en las cuatro entradas de `GAME_REGISTRY` según la tabla del Scope (sin
   `portrait` todavía).
3. Crear `components/touch-controls.tsx` con la cruceta, los botones de acción, el despacho de
   `keydown`/`keyup`, la captura de puntero por botón y la limpieza al desmontar. Sin repetición
   todavía.
4. Añadir la repetición (170 ms / 50 ms) a los botones con `repeat: true`.
5. Renderizar `<TouchControls>` en `components/game-player.tsx` debajo de `.crt` cuando
   `entry?.touch` exista.
6. Añadir a `app/globals.css` los estilos del mando (cruceta, A/B, `is-down`), la regla
   `@media (pointer: coarse)` y `touch-action: none` en `.crt-screen canvas`.
7. Añadir a `app/globals.css` el bloque `@media (max-width: 600px)` que compacta `.crt`,
   `.player-hud`, `.hud-actions` y `.crt-bottom`.
8. Añadir a `lib/games/arkanoid/engine.ts` los listeners `pointerdown`/`pointermove` táctiles
   y quitarlos en `destroy()`.
9. Añadir `GameLayout`, `setLayout?` y `touch.portrait`. En `GamePlayer`: detección de
   `(pointer: coarse)`, clases `has-touch`/`can-portrait`, variable `--portrait-ratio`, llamada a
   `setLayout` y aviso de pausa táctil `touch-resume`. En CSS: HUD oculto y proporción vertical
   de la CRT.
10. Implementar `setLayout` en TETRIS (420×600) y declarar `portrait: 420 / 600`. Verificarlo en
    un teléfono antes de seguir.
11. Ocultar en modo táctil la barra de navegación, su menú lateral y el pie
    (`body:has(.av-player.has-touch)`).
12. Añadir la fila `.touch-bar` (PAUSA, TEMA, SALIR) bajo el mando, extrayendo el selector de
    TEMA a `skinSelect`. Limitar la CRT al alto visible (`100svh − 380px`) y fijar los espacios
    (28/24/24/20 px).
13. Implementar `setLayout` en ASTEROIDES (600×800) y ARKANOID (680×880) y declarar `portrait` en
    los cuatro juegos (`snake: 1`).
14. Poner el botón GUARDAR PUNTUACIÓN del modal debajo de la caja del nombre en móvil.
15. Actualizar `CLAUDE.md` (Games architecture) con `touch`, `touch.portrait`, `setLayout` y el
    componente.
16. `npm run lint` y `npm run build` sin errores.

**Cómo verificar:**

- **Escritorio:** Playwright MCP a 1280×800. No se ven ni el mando ni la fila táctil. Se ven la
  barra de navegación, el HUD y la CRT 4:3 con el canvas original. Los juegos responden igual que
  antes al teclado y al ratón.
- **Táctil emulado:** Playwright MCP con `browser_run_code_unsafe` y un contexto nuevo
  `browser().newContext({ viewport: { width: 360, height: 673 }, isMobile: true, hasTouch: true })`.
  360×673 es el área útil de un Android con la barra de Chrome visible. No uses
  `Emulation.setTouchEmulationEnabled` por CDP sin `isMobile`. Activa `(pointer: coarse)`, pero
  infla el viewport de diseño (p. ej. 585 px de ancho) y oculta problemas de alto. Los botones se
  pulsan despachando `PointerEvent` con `pointerType: "touch"`.
- **Móvil real:** `npm run dev` y abrir `http://<IP-LAN>:3000/juegos/<id>/jugar` desde el
  teléfono, con `allowedDevOrigins` y `devIndicators: false` en el `next.config.ts` local sin
  commitear.

## Acceptance criteria

- [ ] En escritorio con ratón (1280×800) no se ven el mando ni la fila táctil en
      `/juegos/{asteroides,tetris,arkanoid,snake}/jugar`. Se ven la barra de navegación, el HUD y
      la CRT 4:3 con el canvas original (800×600; SNAKE 800×800), y el teclado y el ratón
      funcionan como antes.
- [ ] Con táctil emulado a 360×673, en los cuatro juegos no se ven la barra de navegación, el menú
      lateral, el pie del sitio ni el HUD de React.
- [ ] Con táctil emulado a 360×673, 384×700 y 390×844, la CRT, el mando y la fila
      PAUSA/TEMA/SALIR caben enteros en el alto visible (`scrollHeight === innerHeight`), sin
      scroll horizontal.
- [ ] En táctil, el canvas mide 600×800 en ASTEROIDES, 420×600 en TETRIS, 680×880 en ARKANOID y
      800×800 en SNAKE, y la CRT tiene esa misma proporción (sin bandas negras).
- [ ] En `/biblioteca` (táctil) la barra de navegación y el pie siguen visibles.
- [ ] En un juego mock (p. ej. `/juegos/bloque-buster/jugar`) no se renderizan `.touch-pad` ni
      `.touch-bar`, y su HUD sigue visible.
- [ ] Las acciones se ven como círculos A (roja, a la derecha) y B (azul, a su izquierda); la
      cruceta muestra flechas en cuadrados redondeados.
- [ ] ASTEROIDES: mantener ← o → gira la nave mientras el dedo está encima; mantener ↑ empuja;
      cada toque de A dispara un proyectil; girar y disparar a la vez con dos dedos funciona.
- [ ] TETRIS: tocar ← mueve la pieza una columna; mantener ← la mueve de forma continua hasta
      soltar; ↓ baja; ↑ y A rotan; B la deja caer del todo.
- [ ] ARKANOID: mantener ← o → mueve la paleta; arrastrar el dedo sobre el canvas la mueve
      siguiendo el dedo.
- [ ] SNAKE: tocar una flecha en `'ready'` arranca la partida; las cuatro flechas giran la
      serpiente.
- [ ] Al soltar un botón o al sacar el dedo fuera de él (`pointercancel`/pérdida de captura), el
      juego recibe el `keyup` y la acción se detiene (la nave deja de girar, la paleta se para).
- [ ] Arrastrar el dedo sobre el canvas o sobre el mando no hace scroll ni zoom de la página, y
      mantenerlo pulsado no abre menú contextual ni selecciona texto.
- [ ] Tocar un botón del mando no le quita el foco a la página ni abre el teclado del sistema.
- [ ] PAUSA en la fila táctil pausa (y pasa a decir REANUDAR); con la pausa activa el mando no mueve
      el juego; tocar el aviso "TOCA PARA CONTINUAR" reanuda.
- [ ] Cambiar de app o de pestaña pausa el juego, y al volver el aviso "TOCA PARA CONTINUAR"
      permite reanudar.
- [ ] El selector TEMA de la fila táctil cambia el skin y SALIR vuelve a `/juegos/<id>`.
- [ ] En el modal de fin de partida en táctil, GUARDAR PUNTUACIÓN aparece debajo de la caja del
      nombre, a todo su ancho, sin desbordar el modal.
- [ ] Salir del reproductor con un botón pulsado no deja teclas "pegadas" al volver a entrar.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** mando virtual común configurado por juego en `GAME_REGISTRY`. Un solo componente sirve
  para los cuatro juegos y para los futuros.
- **No:** gestos por juego. Habría que tocar los cuatro motores y cada juego quedaría distinto.
  Quedan para otro spec.
- **Sí:** `KeyboardEvent` sintéticos en `window`. Los motores ya escuchan ahí y leen `e.code`,
  así que no cambian. Ninguno filtra por `isTrusted`.
- **No:** método `press(code, down)` nuevo en `GameEngine`. Obligaría a implementarlo en los
  cuatro motores sin ganar nada funcional.
- **Sí:** la visibilidad del mando, la fila táctil, el HUD y la barra de navegación se decide con
  CSS `(pointer: coarse)`. No hay desajuste de hidratación ni parpadeo, y en escritorio nada
  cambia. JS (`useSyncExternalStore` + `matchMedia`) solo decide lo que CSS no puede: llamar a
  `setLayout` y el aviso de pausa táctil.
- **No:** decidir por ancho de pantalla (`< 768 px`). Una ventana de escritorio estrecha mostraría
  un mando inútil.
- **No:** mostrar siempre el mando, ni un interruptor persistido. Añaden ruido en escritorio y
  estado en `localStorage` sin necesidad.
- **Sí:** pantalla vertical por motor (`setLayout` + `touch.portrait`). Ocupa el alto del teléfono
  y se parece a una consola portátil. La jugabilidad no cambia: solo se reorganiza el dibujo o el
  tamaño del mundo.
- **No:** escalar el canvas 4:3 sin más. En vertical deja la pantalla de juego diminuta.
- **Sí:** SNAKE no implementa `setLayout`. Su tablero de 32×30 es fijo y rehacerlo cambiaría la
  jugabilidad. `portrait: 1` aprovecha que su canvas ya es cuadrado.
- **Sí:** ocultar la barra de navegación, el menú lateral, el pie y el HUD en el reproductor
  táctil. Sin ellos, la pantalla, el mando y los botones caben en el alto del teléfono. La
  puntuación ya se ve dentro del canvas.
- **Sí:** fila PAUSA/TEMA/SALIR bajo el mando. Son las acciones de plataforma que se usan jugando.
  El selector de TEMA reutiliza el mismo JSX que el HUD.
- **No:** FIN en táctil. Se descartó para no saturar la fila. La partida acaba por la condición
  de fin de cada juego, y SALIR vuelve al detalle.
- **Sí:** aviso de pausa táctil que reanuda al tocarlo. `GamePlayer` pausa solo en `blur` y
  `visibilitychange`, y sin HUD no había otro sitio donde reanudar.
- **Sí:** limitar la CRT con `100svh − 380px`. `svh` es el alto con la barra de direcciones
  visible, así que todo cabe en el peor caso. Con `dvh` la página saltaba al mostrarse la barra.
  Los 380 px cubren el mando, la fila, los márgenes y un respiro.
- **Sí:** botones de acción redondos A/B, en lugar de rótulos (DISPARO, ROTAR…). Es el lenguaje
  de un mando de consola y caben en cualquier ancho. El nombre real queda en `aria-label`.
- **Sí:** soporte solo vertical. En horizontal funciona igual, sin optimizarlo.
- **No:** pantalla completa ni bloqueo de orientación. iOS Safari no soporta bloquear la
  orientación.
- **Sí:** repetición por botón (170 ms / 50 ms) solo en ← → ↓ de TETRIS. Imita la
  autorrepetición del teclado de la que depende TETRIS. ASTEROIDES y ARKANOID ya leen la tecla
  como "pulsada mientras esté abajo".
- **Sí:** el arrastre de ARKANOID con `pointerType !== "mouse"`. `mousemove` no llega de forma
  continua con el dedo, y el ratón sigue usando su listener sin duplicar el movimiento.
- **No:** vibración. No existe en iOS Safari y es una preferencia más que configurar.
- **No:** actualizar `/add-game` ni `game-jam` en este spec. `touch` es opcional y un juego sin
  él simplemente no tiene modo táctil. La receta de abajo basta para añadirlo.
- **No:** commitear `next.config.ts`. `allowedDevOrigins` lleva la IP de la LAN del desarrollador
  y `devIndicators: false` solo afecta a `next dev`.

## Ajustes durante la implementación

El borrador aprobado colocaba el mando bajo una CRT 4:3 y mantenía la barra de navegación y el HUD
compactado. Tras probarlo en un teléfono real (Android, Chrome, área útil ≈ 360×673) se hicieron
estos cambios, en este orden:

1. **Pantalla vertical en TETRIS:** método `setLayout` y canvas 420×600. Antes, el canvas 4:3
   dejaba el tablero diminuto.
2. **Sin HUD en táctil y aviso de pausa tocable.** El HUD restaba alto a la pantalla. Al quitarlo
   desapareció REANUDAR, y el aviso pasó a ser tocable.
3. **Cruceta con flechas y acciones A/B redondas**, en vez de rótulos con marco recortado.
4. **Sin barra de navegación, menú lateral ni pie** en el reproductor táctil. En el teléfono se
   seguían viendo y empujaban el juego hacia abajo.
5. **Fila PAUSA/TEMA/SALIR bajo el mando y CRT limitada al alto visible.** La parte superior del
   juego quedaba fuera de pantalla.
6. **Más espacio** arriba y entre CRT, mando y fila; **canvas más pequeño** (`100svh − 380px`);
   indicador "N" de `next dev` desactivado en local. En el teléfono, la fila y el indicador se
   amontonaban.
7. **Pantalla vertical en ASTEROIDES y ARKANOID** y CRT cuadrada en SNAKE, con `touch.portrait`
   convertido de booleano a proporción.
8. **GUARDAR PUNTUACIÓN debajo del nombre** en el modal. En móvil el botón se desbordaba.

Pedido y aplazado: que el reproductor de escritorio quepa en el alto de la ventana (ver Out of
scope).

## Receta: modo táctil para un juego nuevo

Para que un juego futuro (p. ej. TRAVESÍA) se juegue en móvil igual que los cuatro de este spec:

1. **Motor:** escucha `keydown`/`keyup` en `window`, lee `e.code` y no filtra por `isTrusted`.
   Ignora el input en pausa.
2. **Layout vertical** (si su canvas horizontal no se ve bien en un teléfono):
   - declara `LAYOUTS = { landscape: { w, h }, portrait: { w, h } }` (vertical entre 0.65 y 0.8 de
     proporción ancho/alto);
   - implementa `setLayout(next)`: ignora valores repetidos, ajusta `canvas.width/height`,
     reubica o reescala lo que dependa del tamaño y llama a `draw()`;
   - en vertical, quita del canvas lo que solo sirve con teclado (listas de controles);
   - si su canvas ya es cuadrado o vertical y el tablero es fijo, no implementes `setLayout`;
     basta con `portrait` igual a su proporción.
3. **Registro:** añade `touch` a su entrada de `GAME_REGISTRY`:
   - `dpad` con las flechas que use, etiquetas `↑ ↓ ← →` y `repeat: true` solo donde cada
     pulsación sea un paso discreto que el jugador quiera mantener;
   - `actions` con 0–2 botones: `[0]` es A (la acción principal) y `[1]` es B; el `label` es el
     nombre de la acción en español;
   - `portrait: <ancho> / <alto>` del canvas vertical (o de su canvas cuadrado).
4. **Arrastre o toque sobre el canvas** (solo si el juego usa ratón): añade `pointerdown`/
   `pointermove` con `pointerType !== "mouse"`, y quítalos en `destroy()`.
5. **No toques** `GamePlayer`, `TouchControls` ni la CSS. El modo táctil (pantalla limpia, mando,
   fila de botones, ajuste al alto y pausa tocable) sale solo de `touch`.
6. **Verifica** con la emulación móvil de Playwright a 360×673 y 390×844 los criterios de
   aceptación de este spec, aplicados al juego nuevo.

## Risks

| Risk                                                                                                  | Mitigation                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tecla "pegada" si el `pointerup` se pierde (el dedo sale del botón, llamada entrante)                 | `setPointerCapture` más `keyup` en `pointercancel` y `lostpointercapture`. El desmontaje suelta todo. `GamePlayer` ya pausa en `blur`/`visibilitychange`. |
| Un motor futuro filtra `e.isTrusted` o escucha en `document` en vez de `window`                       | El evento se despacha con `bubbles: true` en `window`. Lo documentan `CLAUDE.md` y la receta de este spec.                                                |
| Portátiles táctiles con `(pointer: coarse)` como puntero principal entran en modo táctil              | Aceptado: el mando no estorba al teclado y se puede jugar con ambos.                                                                                      |
| Navegadores sin `:has()` (Safari < 15.4, Chrome < 105) no ocultan la barra ni ajustan la CRT vertical | Degradación aceptable: el juego sigue jugable con el mando, solo con más scroll.                                                                          |
| La barra de direcciones del móvil cambia el alto visible                                              | La CRT se limita con `svh` (alto con la barra visible), así que el peor caso también cabe.                                                                |
| Un `setLayout` a mitad de partida deja objetos fuera del mundo                                        | ASTEROIDES reescala posiciones y ARKANOID desplaza bloques, paleta y pelota. En la práctica el layout se fija en `onReady`, antes de jugar.               |
| `W`/`H` de módulo en ASTEROIDES compartidos entre instancias                                          | Solo hay un motor vivo a la vez. `createAsteroidesEngine` los devuelve a 800×600 al crearse.                                                              |
| Doble toque rápido hace zoom en iOS                                                                   | `touch-action: none` en `.touch-pad` y en el canvas.                                                                                                      |

## What is **not** in this spec

- Gestos de deslizar o zonas táctiles.
- Layout horizontal optimizado, pantalla completa o bloqueo de orientación.
- Vibración.
- Textos del canvas adaptados a táctil.
- FIN y el selector de nivel de ARKANOID en táctil.
- Reproductor de escritorio que quepa en el alto de la ventana.
- Mando para TRAVESÍA o para los juegos mock.
- Cambios en `/add-game`, `game-jam` o `skin-designer`.
- `next.config.ts` (`allowedDevOrigins`, `devIndicators`).

Cada uno de esos, si llega, va en su propio spec.
