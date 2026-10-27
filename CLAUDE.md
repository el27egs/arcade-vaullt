# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a retro-styled platform (UI in Spanish) for playing games online and
competing for the highest score (see README.md). Implemented so far (specs 01–09 in
`specs/`): home, game library, game detail + per-game leaderboard, game player, hall of
fame, about/contact form, mock login, and four playable canvas games — ASTEROIDES,
TETRIS, ARKANOID and SNAKE — whose scores are stored in Supabase.

This project follows Spec Driven Design using the `/spec` and `/spec-impl`
skills from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

If those skills are installed (check `.claude/skills/`), prefer the
`/spec` → `/spec-impl` workflow over ad-hoc implementation when building new
features. Specs are numbered `specs/NN-slug.md`; `specs/.spec-config.yml` has
`AutoCreateBranch: true`, so `/spec-impl` creates and switches to a
`spec-NN-slug` branch automatically.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint via eslint.config.mjs
```

There is no test setup in this repository yet.

## Next.js version note

This repo pins `next@16.2.12`, which is newer than the Next.js most training
data covers and includes breaking changes to APIs/conventions/file structure.
Full docs are vendored locally at `node_modules/next/dist/docs/` — check the
relevant page there (e.g. `01-app/`, `03-architecture/`) before relying on
remembered Next.js behavior, especially for anything touching routing, data
fetching, config, or the compiler.

## Skills

Usa siempre /frontend-desing para diseñar la interfaz del usuario.

Para agregar un juego nuevo (desde `references/started-games/` o diseñado desde cero) usa
`/add-game`: genera un único spec con el juego, su fila en `games` y su leaderboard, que luego
se implementa con `/spec-impl`.

- `spec` / `spec-impl` live in `.agents/skills/` (symlinked from `.claude/skills/`),
  pinned in `skills-lock.json`.
- `add-game` lives in `.claude/skills/add-game/` (`SKILL.md` + `integration.md` with the
  integration checklist). It only writes the spec; it never implements.

## Routes (`app/`)

- `/` — home; recent scores + global top 5 (degrades to "SIN SEÑAL" if Supabase fails).
- `/biblioteca` — game library. (see `references/implemented-games.md`) when you need to check
   which games are implemented and how to implement new ones.
- `/juegos/[id]` — game detail + per-game leaderboard.
- `/juegos/[id]/jugar` — `GamePlayer`; saves scores via the `saveScore` server action
  (`app/juegos/[id]/jugar/actions.ts`).
- `/salon-de-la-fama` — hall of fame: global tab + one tab per game in `games`.
- `/acerca-de` — about + contact form; `sendContactMessage` server action sends email via Resend.
- `/ingresar` — mock login (no real auth yet).
- `error.tsx`, `not-found.tsx` — error and 404 screens.

## Games architecture

- `lib/games/types.ts` — shared contract: `GameEngine` (React → game: `start`, `setPaused`,
  `end`, `restart`, `destroy`, optional `setSkin`), `GameCallbacks` (game → React:
  `onScore`, `onLives`, `onLevel`, `onLines`, `onGameOver`), `GameHud`, `GameSkins`.
- `lib/games/<id>/engine.ts` — framework-free engine (`create<Name>Engine(canvas, callbacks)`),
  plus `sprites.ts` / `levels.ts` where needed. Assets go in `public/games/<id>/`.
- `components/games/<id>-canvas.tsx` — client wrapper: keeps callbacks in a ref, creates the
  engine once, calls `onReady(engine)`, destroys it on unmount.
- `lib/games/registry.ts` — `GAME_REGISTRY`: id → `Canvas`, `hud`, optional `skins`
  (persisted in `localStorage[storageKey]`) and `pauseOverlay` (`"full"` | `"compact"`).
  A game without an entry falls back to the mock player in `components/game-player.tsx`.
- `lib/data.ts` — `GAMES` catalog texts (title, descriptions, cover, color). Hybrid stage:
  pages read the card from `GAMES` and stats/leaderboards from Supabase.
- `references/started-games/` — standalone games to port; `references/source-assets/` —
  raw assets; `references/templates/` — original JSX/CSS design templates.

## Data (Supabase)

- Clients: `lib/supabase/server.ts` (cookies, Server Components/Actions) and
  `lib/supabase/client.ts` (browser), both typed with `lib/supabase/database.types.ts`.
- Reads are server-only in `lib/queries.ts` (`getDbGames`, `getDbGame`, `getLeaderboard`,
  `getRecentScores`); they map snake_case → camelCase and throw on error.
- Schema in `supabase/migrations/`: `games` (catalog, read-only), `scores` (player_name
  1–20 chars, score 0–10,000,000, optional `user_id`), view `games_with_stats` (computed
  `best`/`plays`). RLS: public read, bounded insert, no update/delete. Each new game adds a
  `<timestamp>_seed_<id>.sql` migration inserting its `games` row.
- Supabase MCP is configured in `.mcp.json`. Env vars (see `.env.template`):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PASS`,
  `RESEND_API_KEY`.
- User session is a mock in `lib/user-context.tsx` (`localStorage.av_user`); the last
  player name is remembered in `localStorage.av_player_name`.

## Tooling

- `.claude/settings.json` registers a PostToolUse hook (`.claude/hooks/format-on-write.mjs`)
  that runs Prettier (`.prettierrc.json`) and `eslint --fix` on every file written/edited.
- Visual QA is done with the Playwright MCP; its output lands in `.playwright-mcp/`.

## Architecture

- App Router (`app/`) only — no `pages/` directory.
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Styling is Tailwind CSS v4 via `@tailwindcss/postcss` (`postcss.config.mjs`),
  with the retro design system in `app/globals.css` (`av-*` classes, CSS variables
  like `--line`, `--ink-faint`, `--mono`).
- Fonts: `next/font/google` (Press Start 2P → `--font-pixel`, JetBrains Mono,
  Courier Prime), wired up as CSS variables in `app/layout.tsx` (`<html lang="es">`).
- ESLint uses the flat-config format (`eslint.config.mjs`), extending
  `eslint-config-next`'s `core-web-vitals` and `typescript` rule sets.
