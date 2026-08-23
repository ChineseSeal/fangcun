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

The Vercel Git integration builds the Preview for the current pull-request
commit. The [`vercel-preview.yml`](../.github/workflows/vercel-preview.yml)
workflow waits for that commit's `Vercel` status, reads the Preview URL posted
by the Vercel GitHub app, and runs `pnpm test:e2e:preview` against the protected
deployment. It does not create a duplicate CLI deployment.

The workflow requires only `VERCEL_AUTOMATION_BYPASS_SECRET`, the Vercel
automation-protection bypass secret. Its name has been verified as configured;
the value must not be read, printed, committed, or placed in `.env.example`.
Manual workflow runs must also provide the protected Preview URL explicitly.

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

The current verified Preview alias is
`https://fangcun-git-codex-r0-preview-fruitsai.vercel.app` (READY, verified by
PR #2 on 2026-08-21). It is an ephemeral, SSO-protected deployment and should
not be treated as a production URL. Production promotion remains a separate,
manual action.
