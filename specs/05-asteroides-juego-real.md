# SPEC 05 — ASTEROIDES: primer juego real en la plataforma

> **Status:** Implemented
> **Depends on:** SPEC 01 (mvp-pantallas-visuales)
> **Date:** 2026-10-26
> **Objective:** Portar el juego de `references/started-games/02-asteroids/` a un `<canvas>` en
> `/juegos/asteroides/jugar`, como el juego nuevo `ASTEROIDES`, controlado por el contenedor
> React y notificándole cada cambio de estado (puntaje, vidas, nivel y fin de partida).

## Por qué existe este spec

Hasta hoy ningún juego es jugable. `components/game-player.tsx` simula el puntaje con un
`setInterval` y dibuja una arena decorativa en CSS. El juego de asteroides ya existe como canvas
HTML5 puro (`game.js`, unas 510 líneas), pero depende de variables globales,
`document.getElementById('canvas')`, listeners en `window` que nunca se quitan y un loop de
`requestAnimationFrame` que no se puede detener.

Este spec define una frontera clara entre el juego y la aplicación:

- **El juego vive físicamente dentro del canvas.** Toda su simulación y su dibujo siguen siendo
  los del original y ocurren ahí.
- **React controla.** El contenedor (`GamePlayer`) es el dueño de la pausa, del reinicio y del
  fin manual. El juego solo obedece órdenes y nunca decide pausarse por su cuenta.
- **El juego notifica.** Cada cambio de puntaje, vidas o nivel, y el fin de la partida, se
  avisa al componente React por callbacks. React los muestra en su HUD y en su modal.
- **Conviven los dos HUD.** El juego conserva su propio HUD dentro del canvas, como en el
  original, y además el HUD React de la plataforma muestra los mismos valores.

`ASTEROIDES` es un juego **nuevo**. No es `ROCAS`, la entrada mock parecida de `lib/data.ts`,
que se queda como está.

## Scope

**In:**

- Nueva entrada en `GAMES` (`lib/data.ts`), insertada en la **primera posición**, con
  `id: "asteroides"`, title `ASTEROIDES`, cat `SHOOTER`, color `yellow` y cover `cover-rocas`
  (se reusa la clase CSS existente). Lleva `best: 0`, `plays: "0"` y textos `short`/`long` en
  español que describan el juego real (asteroides que se parten, power-up de triple disparo,
  3 vidas).
- La entrada mock `rocas` **se mantiene** sin cambios. Es otro juego.
- Motor del juego portado a TypeScript en `lib/games/asteroides/engine.ts`, sin dependencias de
  React. Conserva tal cual del original:
  - la mecánica: física, tamaños y puntos (20/50/100), partición de asteroides, partículas,
    power-up `3x`, 3 vidas con invencibilidad al reaparecer, niveles y wrapping toroidal;
  - el aspecto: trazos vectoriales blancos sobre fondo negro, la llama naranja del propulsor y el
    power-up cian.
- **El HUD del canvas se mantiene completo**, tal cual el original: `SCORE` arriba a la
  izquierda, `NIVEL` al centro, iconos de vida a la derecha y el indicador del power-up activo
  (`3x  N.Ns`). Convive con el HUD React, que muestra los mismos valores recibidos por callbacks.
- El overlay `GAME OVER` del canvas se mantiene, con su título y `PUNTAJE: N`. Solo se quita el
  texto `ESPACIO PARA REINICIAR`, porque el reinicio ahora lo controla React (botón JUGAR DE
  NUEVO del modal). El overlay queda visible detrás del modal.
- **Notificaciones del juego hacia React**, por callbacks: `onScore`, `onLives`, `onLevel` y
  `onGameOver`. El juego llama a cada una solo cuando el valor cambia.
- **Control de React sobre el juego**, por métodos: `setPaused`, `end`, `restart` y `destroy`.
  El juego no tiene un estado de pausa propio que pueda cambiar por iniciativa propia.
- Componente cliente `components/games/asteroides-canvas.tsx`. Monta el `<canvas>`, crea el
  motor en `useEffect`, se lo entrega al padre y llama a `destroy()` al desmontar.
- `components/game-player.tsx`: si `game.id === "asteroides"`, renderiza `AsteroidesCanvas`
  dentro de `.crt-screen` en lugar de `.game-arena`. El resto de juegos conserva el mock actual
  sin cambios.
- Pausa controlada por `GamePlayer`, siempre a través de su estado `paused`, que se sincroniza
  con `engine.setPaused(paused)`:
  - **PAUSA / REANUDAR** del HUD alterna `paused`.
  - Las teclas `P` y `Escape` alternan `paused`. El listener vive en `GamePlayer`, no en el
    juego.
  - Si la pestaña pierde visibilidad (`visibilitychange`) o la ventana pierde el foco (`blur`),
    `GamePlayer` pone `paused = true`. No se reanuda sola.
  - Con `paused = true` se muestra el overlay "EN PAUSA" existente.
- Resto de botones del HUD conectados al motor:
  - **FIN** llama a `engine.end()`. El juego deja de avanzar y notifica `onGameOver(score)`, que
    abre el modal.
  - **JUGAR DE NUEVO** llama a `engine.restart()` (score 0, 3 vidas, nivel 1), cierra el modal y
    pone `paused = false`.
  - **SALIR** navega fuera; el desmontaje llama a `destroy()`, que detiene el loop y quita los
    listeners.
- Al perder la última vida, el juego notifica `onGameOver(score)` y `GamePlayer` abre el modal
  "FIN DEL JUEGO" con el puntaje real.
- Input de juego (flechas y `Espacio`): sus listeners los registra el motor en `start()` y los
  quita en `destroy()`. Mientras el juego está montado y en curso, hace `preventDefault` de
  `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space` para que la página no haga scroll.
- El canvas tiene una resolución lógica fija de 800×600, escalada por CSS al 100% del ancho de
  `.crt-screen` (que ya es 4:3). Las capas `::before`/`::after` del CRT (scanlines, viñeta)
  siguen encima del canvas.
- La puntuación se guarda con el `saveScore` actual de `lib/scores.ts` (localStorage
  `av_scores`) con `game: "asteroides"`, sin cambios en ese módulo.
- **Ampliación durante la implementación: dejar `npm run lint` limpio en todo el repo.**
  `npm run lint` ya fallaba en `main` (389 problemas) por causas ajenas a este spec, y el
  criterio de aceptación de lint no se podía cumplir sin arreglarlas:
  - `eslint.config.mjs` ignora `references/**` (juegos originales y plantillas) y `.claude/**`
    (configuración y hooks de Claude Code), porque no son código de la app;
  - formateo con Prettier + `eslint --fix` de `app/`, `components/`, `lib/`, `next.config.ts`
    y `postcss.config.mjs` (sobre todo `no-multiple-empty-lines`), sin cambios de lógica;
  - los tres errores `react-hooks/set-state-in-effect` que había en `main`:
    - `components/game-player.tsx` (mock): la subida de nivel se calcula dentro del
      `setInterval` con una ref del puntaje (`mockScoreRef`), con la misma condición
      `score % 2500 < 100`;
    - `components/about.tsx`: `success` deja de ser un estado y se deriva de `result`;
      `resetForm` marca el resultado como descartado (`dismissed`);
    - `lib/user-context.tsx`: la sesión se lee de localStorage con `useSyncExternalStore`
      en lugar de `useEffect` + `setState`; `login`/`logout` escriben y notifican, con el
      mismo respaldo en memoria si localStorage no está disponible.

**Out of scope (for future specs):**

- Controles táctiles o soporte para móvil.
- Persistencia de puntajes en Supabase, ranking real y actualización de `best`/`plays` del
  catálogo con datos reales.
- Portada CSS propia para `asteroides` (se reusa `.cover-rocas`).
- Recolorear el juego a la paleta neón de la plataforma.
- Eliminar o modificar la entrada mock `rocas`.
- Portar `03-tetris` y `04-arkanoid` u otros juegos de `references/started-games/`.
- Sonido.
- Cambios en `/salon-de-la-fama`, `/juegos/[id]` (detalle), `lib/scores.ts`,
  `lib/user-context.tsx` o el sistema de auth. Excepción: el formateo y la corrección de lint
  descritos en "Ampliación durante la implementación", que no cambian el comportamiento.
- Un registro genérico de juegos (`id → componente`).

## Data model

Ningún dato nuevo se persiste. Solo se agrega una entrada a `GAMES` y el contrato entre juego y
React:

```ts
// lib/data.ts — nueva entrada, primera posición de GAMES
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "...",            // texto en español del juego real
  long: "...",
  cat: "SHOOTER",
  cover: "cover-rocas",
  color: "yellow",
  best: 0,
  plays: "0",
}
```

```ts
// lib/games/asteroides/engine.ts

// Juego → React: notificaciones. Solo se invocan cuando el valor cambia.
export interface AsteroidesCallbacks {
  onScore(score: number): void;
  onLives(lives: number): void;
  onLevel(level: number): void;
  onGameOver(finalScore: number): void; // por última vida perdida o por end()
}

// React → Juego: órdenes. El juego nunca cambia su pausa por iniciativa propia.
export interface AsteroidesEngine {
  start(): void; // registra input y arranca el loop rAF
  setPaused(paused: boolean): void; // única vía para pausar o reanudar
  end(): void; // FIN manual: congela y dispara onGameOver(score)
  restart(): void; // score 0, 3 vidas, nivel 1, nueva oleada
  destroy(): void; // cancela rAF y quita todos los listeners
}

export function createAsteroidesEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidesCallbacks,
): AsteroidesEngine;
```

Estado de React en `GamePlayer` (ya existe; para `asteroides` se alimenta del juego):

| Estado   | Lo escribe                                           | Lo lee                      |
| -------- | ---------------------------------------------------- | --------------------------- |
| `score`  | `onScore`                                            | HUD, modal, `saveScore`     |
| `lives`  | `onLives`                                            | HUD                         |
| `level`  | `onLevel`                                            | HUD                         |
| `over`   | `onGameOver`; JUGAR DE NUEVO lo vuelve `false`       | modal                       |
| `paused` | botón PAUSA, `P`/`Escape`, `blur`/`visibilitychange` | overlay, `engine.setPaused` |

Convenciones (heredadas del original):

- Coordenadas lógicas: 800×600 con origen arriba a la izquierda. El escalado lo hace solo el CSS.
- Velocidades en px/s y `dt` en segundos, limitado a 0.05 s.
- Estado interno del juego: `'playing' | 'dead' | 'gameover'`, más el flag `paused` que solo
  escribe `setPaused`.
- Al reanudar se descarta el `dt` acumulado durante la pausa (`lastTime` se reinicia).
- Las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` viven dentro del módulo y
  reciben el `CanvasRenderingContext2D` y el input por cierre o parámetro, nunca por globals.
- En `gameover` el juego ya no reinicia con `Espacio`; el reinicio solo llega desde React con
  `restart()`.

## Implementation plan

1. Agregar la entrada `asteroides` al inicio de `GAMES` en `lib/data.ts`. Verificación:
   `/biblioteca` la muestra primero, `/juegos/asteroides` abre el detalle y
   `/juegos/asteroides/jugar` todavía muestra el mock.
2. Crear `lib/games/asteroides/engine.ts` con utilidades (`wrap`, `dist`, `rand`, `randInt`),
   constantes y las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` portadas a TS
   con el aspecto original. Todavía no se importa desde ningún componente; `npm run build`
   compila.
3. Completar `createAsteroidesEngine` en el mismo archivo:
   - estado, `update` y `draw` (con el HUD del canvas completo y el overlay `GAME OVER` sin el
     texto `ESPACIO PARA REINICIAR`);
   - loop rAF;
   - input de flechas y `Espacio`, registrado en `start` y quitado en `destroy`, con
     `preventDefault`;
   - notificaciones solo-al-cambiar;
   - los métodos `setPaused`, `end`, `restart` y `destroy`.
4. Crear `components/games/asteroides-canvas.tsx` (`"use client"`), que renderiza
   `<canvas width={800} height={600}>` al 100% de ancho y altura automática. Crea el motor en
   `useEffect`, se lo entrega al padre (prop `onReady(engine)`), y llama `destroy()` en el
   cleanup. Recibe los callbacks como props, guardados en una ref para que un re-render no
   recree el motor.
5. Conectar en `components/game-player.tsx` cuando `game.id === "asteroides"`:
   - renderizar `AsteroidesCanvas` en `.crt-screen`;
   - desactivar para ese juego el `setInterval` del mock y el efecto que sube de nivel por
     puntaje;
   - pasar los callbacks que escriben `score`, `lives`, `level` y `over`;
   - sincronizar `paused` con `engine.setPaused` en un `useEffect`;
   - cablear FIN, JUGAR DE NUEVO y SALIR.

   Los demás juegos siguen con el mock. Verificación manual: jugar una partida completa.

6. Agregar en `GamePlayer`, solo para `asteroides`, los listeners de `P`/`Escape` (alternan
   `paused`) y de `blur`/`visibilitychange` (ponen `paused = true`), con limpieza al desmontar.
7. Verificar que `npm run lint` y `npm run build` terminan limpios. Navegar ida y vuelta entre
   `/juegos/asteroides/jugar` y otra ruta, y comprobar que no quedan loops ni listeners
   duplicados (el juego no se acelera y la nave responde igual).

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/biblioteca` muestra `ASTEROIDES` como primer juego, con la portada `.cover-rocas`.
- [ ] `/juegos/asteroides/jugar` carga el juego real.
- [ ] La entrada `rocas` sigue en el catálogo y su `/juegos/rocas/jugar` muestra el mock actual.
- [ ] En `/juegos/asteroides/jugar` aparece, dentro del marco CRT y con scanlines encima, un
      canvas con la nave blanca en el centro y 4 asteroides blancos moviéndose, igual que en el
      original.
- [ ] El canvas dibuja su HUD original: `SCORE` arriba a la izquierda, `NIVEL` al centro y los
      iconos de vida a la derecha.
- [ ] En todo momento, el `SCORE` del canvas y la Puntuación del HUD React muestran el mismo
      número; lo mismo con `NIVEL` y Nivel, y con los iconos de vida y Vidas.
- [ ] `←`/`→` rotan la nave, `↑` la propulsa con llama visible y `Espacio` dispara.
- [ ] Pulsar flechas o `Espacio` durante la partida no hace scroll en la página.
- [ ] Destruir un asteroide grande suma exactamente 20 al HUD React de Puntuación; uno mediano
      suma 50 y uno pequeño 100.
- [ ] Al chocar con un asteroide, el HUD React de Vidas baja de 3 a 2 y la nave reaparece
      parpadeando.
- [ ] Al limpiar todos los asteroides, el HUD React de Nivel pasa de `01` a `02` y aparecen 5
      asteroides grandes.
- [ ] Recoger el power-up muestra `3x  N.Ns` en el canvas y cada disparo sale triple.
- [ ] Perder la tercera vida abre el modal React "FIN DEL JUEGO" con la misma puntuación del HUD.
- [ ] Detrás del modal, el canvas muestra `GAME OVER` y `PUNTAJE: N`, sin el texto
      `ESPACIO PARA REINICIAR`.
- [ ] El botón PAUSA, `P` y `Escape` congelan el juego (nada se mueve en el canvas) y muestran el
      overlay "EN PAUSA". Volver a pulsar cualquiera de ellos lo reanuda.
- [ ] Al reanudar después de una pausa larga, los asteroides no saltan de posición.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón mostrando "REANUDAR".
- [ ] FIN abre el modal con la puntuación actual y la partida deja de avanzar detrás.
- [ ] Con el modal abierto, pulsar `Espacio` no reinicia el juego.
- [ ] Escribir iniciales en el input del modal funciona, incluida la letra `P`.
- [ ] GUARDAR PUNTUACIÓN agrega a `localStorage["av_scores"]` un objeto con
      `game: "asteroides"` y el puntaje final.
- [ ] JUGAR DE NUEVO deja el HUD en puntuación 0, 3 vidas y nivel `01`, con una nueva oleada.
- [ ] Tras SALIR y volver a entrar a `/juegos/asteroides/jugar` tres veces, la nave rota y
      dispara a la misma velocidad que la primera vez (sin listeners ni loops duplicados).
- [ ] La consola del navegador no muestra errores durante una partida completa.

## Decisions

- **Yes:** juego nuevo `ASTEROIDES` con `id: "asteroides"`, distinto de `rocas`. Razón:
  confirmado por el usuario. El id va en minúsculas, igual que los demás ids de `GAMES`, porque
  forma parte de la URL.
- **Yes:** mantener la entrada mock `rocas`. Razón: confirmado por el usuario; es otro juego.
- **Yes:** `asteroides` en la primera posición de `GAMES`. Razón: es el único juego jugable.
  Efectos colaterales aceptados: es la pestaña por defecto en `/salon-de-la-fama` (que sigue
  mostrando datos sembrados por mock) y, como el home muestra `GAMES.slice(0, 6)`, `rocas` sale
  del home.
- **Yes:** frontera "React controla, el juego notifica". Razón: confirmado por el usuario. La
  pausa, el fin manual y el reinicio son decisiones de la app; el juego solo avisa cambios de
  estado.
- **Yes:** `P`/`Escape` y la auto-pausa por `blur`/`visibilitychange` viven en `GamePlayer`, no
  en el juego. Razón: confirmado por el usuario; una sola fuente de verdad para `paused`.
- **No:** callback `onPauseChange` desde el juego. Razón: el juego nunca cambia su pausa por
  iniciativa propia, así que no hay nada que notificar.
- **Yes:** conservar el aspecto original (vectores blancos sobre negro). Razón: confirmado por el
  usuario; el juego queda "físicamente como está" dentro del canvas.
- **No:** paleta neón. Razón: descartado por el usuario a favor del aspecto original.
- **Yes:** mantener el HUD del canvas completo y usar también el HUD React. Razón: confirmado
  por el usuario; el juego conserva su canvas, sus controles y su HUD, y además notifica a React.
- **No:** quitar el HUD del canvas para mostrar los valores solo en React. Razón: descartado por
  el usuario.
- **Yes:** mantener el overlay `GAME OVER` del canvas, pero sin `ESPACIO PARA REINICIAR`.
  Razón: confirmado por el usuario. El reinicio es una decisión de React, y `Espacio` reiniciando
  el juego chocaría con escribir iniciales en el modal.
- **No:** reiniciar con `Espacio` y avisar a React con un callback `onRestart`. Razón: daría dos
  vías de reinicio, en contra de la frontera "React controla".
- **Yes:** portar a un motor TypeScript con ciclo de vida explícito. Razón: el original usa
  globals y un loop/listeners imposibles de limpiar, lo que en una SPA duplica el juego en cada
  navegación.
- **No:** iframe con los archivos estáticos en `public/`. Razón: aísla el juego del HUD y del
  modal y obliga a un protocolo `postMessage`.
- **No:** cargar `game.js` tal cual con `next/script`. Razón: mismos problemas de globals y
  limpieza.
- **Yes:** motor en `lib/games/asteroides/engine.ts` + canvas en
  `components/games/asteroides-canvas.tsx`, integrados en `GamePlayer` por `game.id`. Razón:
  reutiliza HUD y modal sin duplicarlos.
- **No:** un componente `AsteroidesPlayer` independiente. Razón: duplicaría el HUD y el modal.
- **No:** un registro genérico de juegos. Razón: con un solo juego real basta la condición por
  `game.id`; el registro llega con el segundo juego.
- **Yes:** resolución lógica 800×600 escalada por CSS. Razón: no hay que tocar la física del
  original.
- **No:** controles táctiles. Razón: van en una spec de soporte móvil.
- **Yes:** guardar con el `saveScore` actual en localStorage. Razón: confirmado por el usuario;
  la persistencia en Supabase necesita esquema, RLS y auth, que van en su propia spec.
- **Yes:** `best: 0` y `plays: "0"`. Razón: no hay datos reales todavía; no se inventan cifras.
- **Yes:** arreglar el lint de todo el repo en esta misma rama. Razón: decidido por el usuario
  durante el Paso 7, porque `npm run lint` ya fallaba en `main` y el criterio de aceptación
  "`npm run build` y `npm run lint` terminan sin errores" no se podía cumplir de otra forma.
- **No:** dejar la limpieza de lint para un spec aparte y dar el criterio por cumplido solo en
  los archivos de este spec. Razón: descartado por el usuario.
- **Yes:** ignorar `references/**` y `.claude/**` en ESLint en lugar de corregirlos. Razón: es
  código de referencia y configuración de herramientas, no código de la app.

## Risks

| Riesgo                                                                                                      | Mitigación                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Strict Mode (dev) monta, desmonta y vuelve a montar efectos, creando dos motores.                     | `destroy()` cancela rAF y quita todos los listeners; el criterio de las tres navegaciones lo valida.                                                                                                   |
| Callbacks inline en `GamePlayer` cambian en cada render y recrean el motor, reiniciando la partida.         | `AsteroidesCanvas` guarda los callbacks en una ref y crea el motor una sola vez por montaje.                                                                                                           |
| Los listeners de teclado interceptan teclas fuera del juego, por ejemplo al escribir iniciales en el modal. | El motor ignora el input y no hace `preventDefault` en `gameover`, en pausa o con el foco en un `input`/`textarea`. `GamePlayer` ignora `P`/`Escape` con el modal abierto o con el foco en un `input`. |
| Tras una pausa larga, el primer `dt` es enorme y los objetos saltan.                                        | `setPaused(false)` reinicia `lastTime`; además `dt` ya está limitado a 0.05 s.                                                                                                                         |
| El escalado por CSS desenfoca los trazos de 1.5 px en pantallas pequeñas.                                   | Aceptado en esta spec; el soporte de `devicePixelRatio` o móvil puede ir en una spec futura.                                                                                                           |
| En móvil o tablet sin teclado el juego no es jugable.                                                       | Fuera de alcance, explícitamente; queda para la spec de controles táctiles.                                                                                                                            |

## Lo que **no** está en este spec

- Controles táctiles o soporte para móvil.
- Persistencia de puntajes en Supabase, ranking real y `best`/`plays` reales.
- Portada CSS propia para `asteroides`.
- Paleta neón para el juego.
- Cambios a la entrada mock `rocas`.
- Portar tetris, arkanoid u otros juegos.
- Sonido.
- Un registro genérico de juegos.

Cada uno de esos, si se implementa, va en su propio spec futuro.
