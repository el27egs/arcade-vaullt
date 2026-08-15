# SPEC 03 — Acerca de y formulario de contacto con Resend

> **Status:** Approved
> **Depends on:** SPEC 01 (mvp-pantallas-visuales), SPEC 02 (home-landing)
> **Date:** 2026-08-14
> **Objective:** Portar la pantalla "Acerca de" de `references/templates/home-about/about.jsx`
> a `/acerca-de`, con el formulario de contacto enviando correos reales a través de Resend
> mediante una Server Action.

## Por qué existe este spec

Spec 02 dejó explícitamente fuera de alcance "Acerca de" (`about.jsx`) y su formulario de
contacto. En el template ese formulario solo simula el envío (`setSent` inmediato, sin red).
Este spec cierra esa brecha: porta la pantalla tal cual, y reemplaza la simulación por un envío
real de correo con Resend.

## Scope

**In:**

- Nueva pantalla "Acerca de" en `/acerca-de`, con las dos secciones de `about.jsx`: hero
  (kicker, título, misión, `highlight-row` de 3 tarjetas) y contacto (intro + tips + formulario).
- Divider decorativo (`about-divider`) entre ambas secciones, animación reveal-on-scroll
  (`.reveal`/`.reveal.in`, ya portada en spec 02, reutilizada tal cual).
- Formulario de contacto (nombre, correo, mensaje) con validación de campos vacíos en cliente
  (shake, igual que el template) **y** en el servidor (defense in depth).
- Envío real del mensaje por correo usando el SDK `resend`, vía Server Action
  (`app/acerca-de/actions.ts`), a `emmanuel.garcia.ds@gmail.com`, desde `onboarding@resend.dev`
  (dominio de pruebas de Resend, sin verificación de dominio propio).
- Estado de carga en el botón de envío ("ENVIANDO...", deshabilitado) mientras la Server Action
  está pendiente.
- Estado de error inline si Resend falla (red o API), conservando los datos ya escritos en el
  formulario y permitiendo reintentar.
- Pantalla de éxito ("terminal-success") idéntica al template cuando el correo se envía bien.
- Enlace "Acerca de" agregado al Nav (`components/nav.tsx`), apuntando a `/acerca-de`, en
  desktop y en el panel móvil, con estado activo.
- Estilos `.about*`, `.contact*`, `.highlight*`, `.terminal-success*`, `@keyframes shake`
  portados literalmente al final de `app/globals.css` (excluyendo `.reveal`/`.reveal.in` y
  `.divider`, que ya existen desde spec 02 / el sistema visual base).
- `RESEND_API_KEY` como variable de entorno: placeholder vacío en `.env.template` (commiteado,
  ya permitido por `.gitignore`) y en `.env.local` (gitignored) — el usuario coloca la key real
  manualmente después de este spec.
- Dependencia `resend` agregada a `package.json`.

**Out of scope (for future specs):**

- Persistencia de los mensajes de contacto (base de datos, localStorage, panel de administración
  para leerlos). Solo se envía el correo, no se guarda nada.
- Protección anti-spam (honeypot, rate limiting, CAPTCHA).
- Dominio propio verificado en Resend — mientras no se verifique uno, `onboarding@resend.dev`
  solo entrega al correo con el que el usuario se registró en Resend.
- Cualquier cambio a `/`, `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/ingresar`,
  `/salon-de-la-fama`, `lib/data.ts`, `lib/user-context.tsx` o `lib/scores.ts`.
- Sistema de créditos funcional (sigue estático, ya fuera de alcance desde spec 01).

## Data model

Sin datos nuevos persistidos. El único "modelo" es la forma del mensaje que viaja del formulario
a la Server Action, no una estructura almacenada:

```ts
// app/acerca-de/actions.ts
"use server";

type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  _prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  // lee name/email/msg de formData, valida no-vacíos server-side,
  // llama a Resend con from="onboarding@resend.dev", to="emmanuel.garcia.ds@gmail.com"
  // devuelve { ok: true } o { ok: false, error } sin lanzar hacia el cliente
}
```

`RESEND_API_KEY` vive solo en variables de entorno (`.env.local`, gitignored); `from`/`to` son
constantes en el mismo archivo, no variables de entorno, porque no son secretas.

## Implementation plan

1. `npm install resend`. Crear `.env.template` (commiteado) y `.env.local` (gitignored) con
   `RESEND_API_KEY=` vacío en ambos.
2. Portar al final de `app/globals.css` el bloque "ABOUT PAGE" de
   `references/templates/home-about/styles.css` (`.about`, `.about-hero*`, `.about-title`,
   `.about-mission`, `.highlight-row`, `.highlight*`, `.about-divider*`, `.div-bar`,
   `.div-pixels`, `.about-contact*`, `.contact-grid`, `.contact-intro*`, `.contact-title`,
   `.contact-sub`, `.contact-tips*`, `.contact-form*`, `@keyframes shake`,
   `.terminal-success*`, `.term-bar`, `.term-body`, `.line*`, `.prompt`, `.caret`), sin tocar
   `.reveal`/`.reveal.in` ni `.divider` (ya existen).
3. Crear `app/acerca-de/actions.ts` (`"use server"`) con `sendContactMessage(prevState, formData)`:
   valida `name`/`email`/`msg` no vacíos, instancia `new Resend(process.env.RESEND_API_KEY)`,
   envía el correo (`from: "onboarding@resend.dev"`, `to: "emmanuel.garcia.ds@gmail.com"`,
   `subject` con el nombre del remitente, cuerpo con nombre/correo/mensaje), captura errores del
   SDK y devuelve `{ ok: false, error }` en vez de lanzar.
4. Crear `components/about.tsx` (`"use client"`) portando `About` y `HighlightIcon` desde
   `about.jsx`:
   - Mantener el `useEffect`/`IntersectionObserver` sobre `.reveal`, igual patrón que
     `components/home.tsx`.
   - Mantener el estado controlado `form`/`shake` y la validación de campos vacíos antes de
     invocar la acción (mismo comportamiento de shake que el template).
   - Reemplazar el `setSent` inmediato por `useActionState(sendContactMessage, null)`: al
     invocar, si la validación de cliente pasa, se llama a la acción con un `FormData`
     construido desde `form`.
   - Mientras la acción está pendiente (`isPending` de `useActionState`/`useTransition`), el
     botón muestra "ENVIANDO..." y queda deshabilitado.
   - Si el resultado es `{ ok: true }`, se muestra la pantalla `terminal-success` (igual que el
     template, con el nombre capturado en `sent`).
   - Si el resultado es `{ ok: false, error }`, se muestra un mensaje de error en rojo debajo del
     botón, el formulario permanece visible con los datos intactos, y el usuario puede reintentar
     el envío.
5. Crear `app/acerca-de/page.tsx` con `export default function AboutPage() { return <About />; }`.
6. Actualizar `components/nav.tsx`: agregar enlace "Acerca de" → `/acerca-de` (activo en
   `pathname === "/acerca-de"`) en el bloque `.links` de desktop y en el panel móvil, mismo
   patrón que los enlaces existentes ("Inicio", "Biblioteca", "Salón de la Fama").

Cada paso deja el proyecto compilando y navegable.

## Acceptance criteria

- [ ] `/acerca-de` muestra el hero (kicker, título, misión, `highlight-row` de 3 tarjetas) y la
      sección de contacto (intro, tips, formulario), con el divider animado entre ambas.
- [ ] El Nav muestra "Acerca de" y queda activo en `/acerca-de`, tanto en desktop como en el
      panel móvil.
- [ ] Enviar el formulario con algún campo vacío dispara la animación de shake y no invoca la
      Server Action.
- [ ] Enviar el formulario completo con `RESEND_API_KEY` válida envía un correo real vía Resend
      a `emmanuel.garcia.ds@gmail.com` desde `onboarding@resend.dev`, y la UI muestra la pantalla
      `terminal-success` con el nombre ingresado.
- [ ] Mientras la Server Action está en curso, el botón de envío muestra "ENVIANDO..." y está
      deshabilitado.
- [ ] Si Resend falla (key inválida, error de red, etc.), el formulario muestra un mensaje de
      error inline, conserva los datos ya escritos, y permite reintentar el envío.
- [ ] `RESEND_API_KEY` está en `.env.local` (gitignored) con un `.env.template` commiteado que
      documenta la variable vacía.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisions

- **Yes:** Server Action (`app/acerca-de/actions.ts`) en vez de Route Handler. Razón: confirmado por
  el usuario — convención idiomática de Next 16 App Router para un formulario que solo alimenta
  esta pantalla, sin necesidad de un endpoint HTTP separado.
- **Yes:** ruta `/acerca-de` (no `/about`). Razón: consistente con las rutas en español ya
  establecidas en spec 01 (`/ingresar`, `/salon-de-la-fama`) y con el label del Nav "Acerca de".
- **Yes:** `RESEND_API_KEY` como variable de entorno, placeholder vacío tanto en `.env.local`
  (gitignored) como en `.env.template` (commiteado, ya permitido por `.gitignore`). El usuario
  coloca la key real manualmente después de guardado este spec. Razón: confirmado por el
  usuario — evita commitear secretos.
- **Yes:** `from` fijo `onboarding@resend.dev` (dominio de pruebas de Resend) y `to` fijo
  `emmanuel.garcia.ds@gmail.com`, ambos como constantes en `app/acerca-de/actions.ts`, no como
  variables de entorno. Razón: confirmado por el usuario; no son datos secretos.
- **Yes:** validar campos vacíos en cliente (shake, igual que el template) **y** en el server
  action. Razón: buena práctica documentada en `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
  ("Validate inputs... treat FormData... as untrusted").
- **Yes:** estado de error inline + reintentar cuando Resend falla, conservando los datos del
  formulario. Razón: confirmado por el usuario.
- **Yes:** agregar estado "ENVIANDO..." (pending) en el botón mientras la Server Action corre.
  Razón: el template original simula el envío de forma instantánea (sin red real); con Resend
  real hay latencia que debe reflejarse en la UI. Es la única desviación visual del template,
  necesaria al pasar de mock a integración real.
- **No:** guardar los mensajes de contacto en base de datos o `localStorage`. Razón: no
  solicitado — solo se envía el correo vía Resend, sin persistencia.
- **No:** protección anti-spam (honeypot, rate limiting, CAPTCHA). Razón: no solicitado, fuera de
  alcance de este spec; queda documentado como riesgo conocido.
- **No:** tocar `app/page.tsx`, `app/biblioteca`, `app/juegos/*`, `app/ingresar`,
  `app/salon-de-la-fama`, `lib/*` — fuera de alcance, este spec solo agrega `/acerca-de` y
  actualiza el Nav.
- **Nota de implementación:** el plan original tenía un error de redacción — nombraba la carpeta
  `app/about/` (que en Next.js serviría en `/about`) mientras la decisión de ruta pedía
  `/acerca-de`. Corregido durante `/spec-impl` (confirmado por el usuario): la carpeta real es
  `app/acerca-de/`, y así quedó actualizado en todo este documento.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin dominio propio verificado, `onboarding@resend.dev` solo entrega al correo con el que el usuario se registró en Resend (`emmanuel.garcia.ds@gmail.com`). | Aceptado explícitamente por el usuario para este alcance; verificar un dominio propio queda para un spec futuro si se necesita entregar a otros destinatarios. |
| Sin protección anti-spam, el formulario público puede recibir envíos automatizados o abusivos. | Fuera de alcance de este spec; documentado como riesgo conocido para atender más adelante. |
| Cuota gratuita de Resend (100 correos/día, 3000/mes en el plan free) podría agotarse. | No aplica todavía — volumen esperado bajo en fase de desarrollo/demo. |

## Lo que **no** está en este spec

- Persistencia de mensajes de contacto o panel para leerlos.
- Protección anti-spam.
- Dominio propio verificado en Resend.
- Cambios a las demás pantallas (`/`, `/biblioteca`, detalle, reproductor, ingreso, salón de la
  fama).
- Sistema de créditos funcional.

Cada uno de esos, si se implementa, va en su propio spec futuro.
