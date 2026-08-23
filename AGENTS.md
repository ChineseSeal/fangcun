# Repository Guidelines

## Project Structure & Module Organization

The repository combines product documentation with a pnpm/Turborepo workspace. `README.md` is the entry point, `ROADMAP.md` tracks delivery, `docs/` holds specifications, `apps/web` contains the Next.js app, and `packages/` owns the DSL, engine, glyph, knowledge, compliance, carving aid, 3D adapter, and design tokens. Keep requirements in PRD, interface rules in DESIGN, and architecture in TECH.

## Build, Test, and Development Commands

The R0 workspace is runnable. Use:

```bash
git diff --check
rg -n -F '](' README.md ROADMAP.md docs/
```

`pnpm dev --filter @fangcun/web` starts the app; `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` run workspace checks. `pnpm test:e2e` runs desktop/mobile Playwright flows. `pnpm benchmark:3d` checks production 3D budgets. `pnpm supabase:start`, `pnpm db:reset`, and `pnpm db:lint` verify local account-sync migrations and RLS.

## Coding Style & Naming Conventions

Use UTF-8 Markdown, concise headings, and direct prose. Preserve `FR-xxx`, `D-xxx`, and TECH §7/§20 numbering. Future TypeScript uses two spaces, `PascalCase` components/types, and `camelCase` functions. Keep `seal-engine` deterministic and IO-free; never use `Math.random()`. Scope GSAP with `useGSAP` and derive 3D data only from the Seal DSL.

## Testing Guidelines

Use Vitest for unit and golden tests (`*.test.ts`), and Playwright for E2E, visual, motion, carving export, and 3D tests (`*.spec.ts`). Add deterministic Golden Cases for engine changes. Target `seal-engine` ≥90%, DSL migrations and compliance rules 100%, and overall ≥80%. Test reduced-motion, real-size metadata, mirror symmetry, and WebGL fallback paths.

## Commit & Pull Request Guidelines

History contains only `Initial commit`, so no convention is established. Use imperative prefixes such as `docs:`, `feat:`, `fix:`, and `test:`. PRs must explain the change, link requirements, include test evidence, and attach screenshots or GIFs for UI, animation, or 3D work. Note performance, accessibility, and fallback impacts.

## Conversation Work Log

Read WORKLOG.md at the start of every conversation. Before finishing, append a dated one- or two-bullet summary of work, changed files, and validation—even when no files changed. Append chronologically; never rewrite earlier entries.

## Security & Configuration Tips

Never commit secrets. Use only the Supabase publishable key in `NEXT_PUBLIC_*`; never expose secret or service-role keys. Every exposed user-data table requires RLS and ownership policies. Assets require source, license, access date, and usage limits. Server compliance is authoritative. Telemetry must use rule codes or hashes, never original seal text.
