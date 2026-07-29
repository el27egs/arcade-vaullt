# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for the
highest score (see README.md). The codebase is currently just the
`create-next-app` scaffold; no game features have been implemented yet.

This project follows Spec Driven Design using the `/spec` and `/spec-impl`
skills from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

If those skills are installed (check `.claude/skills/`), prefer the
`/spec` → `/spec-impl` workflow over ad-hoc implementation when building new
features.

## Next.js version note

This repo pins `next@16.2.12`, which is newer than the Next.js most training
data covers and includes breaking changes to APIs/conventions/file structure.
Full docs are vendored locally at `node_modules/next/dist/docs/` — check the
relevant page there (e.g. `01-app/`, `03-architecture/`) before relying on
remembered Next.js behavior, especially for anything touching routing, data
fetching, config, or the compiler.

## Skills

Usa siempre /frontend-desing para diseñar la interfaz del usuario.

There is no test setup in this repository yet.

## Architecture

- App Router (`app/`) only — no `pages/` directory.
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Styling is Tailwind CSS v4 via `@tailwindcss/postcss` (`postcss.config.mjs`),
  with global styles in `app/globals.css`.
- Fonts: `next/font/google` (Geist / Geist Mono), wired up as CSS variables in
  `app/layout.tsx`.
- ESLint uses the flat-config format (`eslint.config.mjs`), extending
  `eslint-config-next`'s `core-web-vitals` and `typescript` rule sets.
