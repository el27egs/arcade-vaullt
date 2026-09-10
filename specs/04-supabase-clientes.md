# SPEC 04 — Integración con Supabase: clientes browser y server

> **Status:** Approved
> **Depends on:** SPEC 01 (mvp-pantallas-visuales)
> **Date:** 2026-09-10
> **Objective:** Instalar y configurar los clientes de Supabase para Next.js App Router (browser
> y server, vía `@supabase/ssr`) en `lib/supabase/`, sentando la infraestructura base sin
> reemplazar el mock de auth actual ni tocar el esquema de base de datos.

## Por qué existe este spec

Spec 01 dejó explícitamente fuera de alcance "autenticación real" y "persistencia en
servidor / base de datos". Hoy `lib/user-context.tsx` simula sesión con `localStorage` y no existe
ningún cliente de Supabase en el proyecto, aunque el proyecto ya está conectado a un proyecto de
Supabase (esquema `public` vacío, sin tablas todavía). Este spec cierra la primera parte de esa
brecha: monta la infraestructura de cliente (browser + server), sin todavía conectar nada de la
UI ni crear esquema. Reemplazar el mock de auth y definir tablas quedan para specs futuros.

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr` agregadas a `package.json`.
- `lib/supabase/client.ts`: `createClient()` que instancia un cliente de Supabase para **Client
  Components**, vía `createBrowserClient` de `@supabase/ssr`.
- `lib/supabase/server.ts`: `createClient()` async que instancia un cliente de Supabase para
  **Server Components, Server Actions y Route Handlers**, vía `createServerClient` de
  `@supabase/ssr`, leyendo/escribiendo cookies con `cookies()` de `next/headers`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
  placeholder vacío en `.env.template` (commiteado, mismo patrón que `RESEND_API_KEY` de spec 03)
  y valores reales del proyecto en `.env.local` (gitignored).
- Uso de la **publishable key** (`sb_publishable_...`) del proyecto, no la anon key legacy (JWT).

**Out of scope (for future specs):**

- `proxy.ts` (renombre de `middleware.ts` en Next 16) para refrescar la sesión automáticamente en
  cada request — solo tiene sentido una vez exista auth real; se agrega en el spec de auth.
- Reemplazo del mock de auth (`lib/user-context.tsx`, `components/auth.tsx`) por Supabase Auth.
- Cualquier tabla, esquema o política RLS en la base de datos (hoy vacía en el esquema `public`).
- Código del proyecto que efectivamente use estos clientes para leer o escribir datos — ninguna
  pantalla existente los importa todavía, este spec solo deja la infraestructura lista.
- Tipos TypeScript generados desde el esquema de Supabase — no aplica, no hay tablas.
- `SUPABASE_PASS` (contraseña de conexión directa a Postgres, ya presente en `.env.template` y
  `.env.local`) no se usa ni se modifica en este spec — es para conexiones directas (migraciones),
  no para el cliente JS.

## Data model

Este spec no introduce datos persistidos. Solo agrega dos funciones factory de cliente, sin
estado propio:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient {
  /* createBrowserClient(url, publishableKey) */
}

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient> {
  /* createServerClient(url, publishableKey, { cookies: { getAll, setAll } })
     usando cookies() de next/headers */
}
```

Ningún archivo del proyecto invoca estas funciones todavía — quedan disponibles para specs
futuros (auth, datos).

## Implementation plan

1. `npm install @supabase/supabase-js @supabase/ssr`.
2. Agregar a `.env.template` (commiteado) `NEXT_PUBLIC_SUPABASE_URL=` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` vacíos, y a `.env.local` (gitignored) los valores
   reales del proyecto (URL y publishable key), sin tocar la línea existente de `SUPABASE_PASS`.
3. Crear `lib/supabase/client.ts` con `createClient()` usando `createBrowserClient` de
   `@supabase/ssr` y las dos variables `NEXT_PUBLIC_SUPABASE_*`.
4. Crear `lib/supabase/server.ts` con `createClient()` async usando `createServerClient` de
   `@supabase/ssr`, leyendo cookies con `await cookies()` de `next/headers`; el `setAll` va
   envuelto en `try/catch` (puede fallar si se llama desde un Server Component puro — se ignora a
   propósito porque, sin `proxy.ts`, todavía no hay nada que dependa de ese refresco).
5. Correr `npm run build` y confirmar que compila sin errores de TypeScript ni de ESLint.

Cada paso deja el proyecto compilando; los pasos 3-4 no son importados por ninguna pantalla, así
que no cambian el comportamiento visible de la app.

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` están en `package.json` como dependencias.
- [ ] `lib/supabase/client.ts` exporta `createClient()` que instancia un cliente de Supabase de
      browser.
- [ ] `lib/supabase/server.ts` exporta un `createClient()` async que instancia un cliente de
      Supabase de server, leyendo cookies de `next/headers`.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están documentadas
      (placeholder vacío) en `.env.template`, commiteado, y con valores reales en `.env.local`,
      gitignored.
- [ ] `SUPABASE_PASS` sigue presente en `.env.template`/`.env.local` sin cambios.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint (incluyendo los dos
      archivos nuevos de `lib/supabase/`, aunque nada los importe todavía —
      `tsconfig.json` incluye `**/*.ts` y el proyecto no tiene `ignoreBuildErrors`).
- [ ] Ningún archivo de `app/`, `components/` o `lib/` fuera de `lib/supabase/` cambia de
      comportamiento (no se toca auth, no se toca UI).

## Decisions

- **Yes:** alcance limitado a configurar los clientes, sin tocar auth ni esquema de base de
  datos. Razón: confirmado por el usuario — evita un spec que toque 3+ áreas del sistema a la vez
  (config de cliente, auth, esquema).
- **Yes:** `@supabase/ssr` (`createBrowserClient`/`createServerClient`) en vez de una única
  instancia con solo `@supabase/supabase-js`. Razón: patrón oficial recomendado por Supabase para
  Next.js App Router; sienta la base correcta sin rehacer trabajo cuando se implemente auth real
  con cookies de sesión.
- **No:** `proxy.ts` (refresco automático de sesión en cada request). Razón: confirmado por el
  usuario — solo tiene sentido una vez haya auth real; se agrega en el spec de auth.
- **Yes:** publishable key (`sb_publishable_...`) en vez de la anon key legacy (JWT). Razón:
  confirmado por el usuario; es el formato recomendado por Supabase para apps nuevas (mejor
  seguridad, rotación independiente).
- **Yes:** criterio de verificación = solo compilación (`npm run build`), sin llamada de red real
  a Supabase ni pantalla de diagnóstico nueva. Razón: confirmado por el usuario — no hay tablas ni
  auth todavía, así que una llamada real no aporta más certeza que la compilación estricta.
- **No:** tocar `lib/user-context.tsx`, `components/auth.tsx`, `lib/data.ts` o `lib/scores.ts`.
  Razón: fuera de alcance, quedan para specs futuros de auth y datos.
- **No:** generar tipos TypeScript desde el esquema (`supabase gen types` /
  `generate_typescript_types`). Razón: no hay tablas en la base de datos todavía (confirmado
  consultando el proyecto — el esquema `public` está vacío).

## Risks

| Riesgo                                                                                                                               | Mitigación                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin `proxy.ts`, una vez se implemente auth real la sesión no se refrescará automáticamente en cada request.                          | Aceptado explícitamente por el usuario para este alcance; se agrega en el spec de auth futuro.                                                                                           |
| La publishable key es un formato relativamente nuevo; ejemplos y librerías de terceros todavía asumen mayormente la anon key legacy. | Ambas claves conviven en el proyecto (Supabase las expone juntas); si surge un problema de compatibilidad, se puede migrar a `NEXT_PUBLIC_SUPABASE_ANON_KEY` sin rehacer la integración. |

## Lo que **no** está en este spec

- `proxy.ts` y refresco automático de sesión.
- Reemplazo del mock de auth (`lib/user-context.tsx`, `components/auth.tsx`).
- Cualquier tabla, esquema o política RLS en la base de datos.
- Código que efectivamente use estos clientes para leer o escribir datos.
- Tipos TypeScript generados desde el esquema de Supabase.

Cada uno de esos, si se implementa, va en su propio spec futuro.
