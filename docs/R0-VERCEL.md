# R0 Vercel Preview

## Project Contract

The Fangcun web app is configured as the `fruitsai/fangcun` Vercel project.

| Setting | Value |
|---|---|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Install command | `corepack pnpm install --frozen-lockfile` |
| Build command | `corepack pnpm run build` |
| Node.js | `22.x` |
| Package manager | pnpm `10.30.3` |

The checked-in [`apps/web/vercel.json`](../apps/web/vercel.json) keeps the
framework, install, and build commands close to the Next.js project. The
Vercel root-directory setting remains a project-level setting because the
current CLI rejects `rootDirectory` inside `vercel.json`.

## Environment Boundaries

Preview has only the non-secret settings `NEXT_PUBLIC_APP_ENV=staging` and
`OPENAI_AI_DESIGNER_PROVIDER=rules`. No Supabase service-role key or OpenAI
API key is required for the deterministic Preview path. Production variables
must be added separately and only through Vercel's encrypted environment
store.

The `/api/system/health` route returns app, engine, glyph asset, and mapped
environment versions. It never returns environment variable values. The
Preview deployment also has Vercel SSO protection enabled; automation uses a
Vercel protection-bypass secret supplied only through CI environment variables.

## CI Contract

The [`vercel-preview.yml`](../.github/workflows/vercel-preview.yml) workflow
links the project, pulls the Preview environment, builds with the pinned
Vercel CLI `58.9.0`, deploys the prebuilt output, and runs
`pnpm test:e2e:preview` against the resulting URL.

The repository workflow requires these GitHub Actions secrets. Their names
have been verified as configured; values must never be read, printed, or
committed:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_AUTOMATION_BYPASS_SECRET`

The last value is the Vercel automation-protection bypass secret. It must not
be committed, printed, or placed in `.env.example`.

## Local Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e:preview

# Against a protected Preview, provide the bypass secret in the shell only.
PLAYWRIGHT_BASE_URL=<preview-url> \
  VERCEL_AUTOMATION_BYPASS_SECRET=<secret> \
  pnpm test:e2e:preview
```

The current verified Preview deployment is
`https://fangcun-7d4cw07ta-fruitsai.vercel.app` (READY, generated on
2026-08-16). It is an ephemeral deployment and should not be treated as a
production URL. Production promotion remains a separate, manual action.
