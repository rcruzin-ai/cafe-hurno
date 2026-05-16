# Vercel Lifecycle Operations (from this terminal)

Raymond wants the full Vercel deployment lifecycle — build, deploy, env vars, logs, rollbacks — handled from this terminal without bouncing to the Vercel dashboard. The CLI is already authenticated and the project is linked (`.vercel/project.json` exists).

## Deploy to production
```
npx vercel --prod
```
Use `--force` to skip build cache when you need a clean rebuild (e.g. picking up newly-changed env vars on an otherwise unchanged commit).

## Environment variables

### Listing
```
npx vercel env ls production
```
Shows names + environments. Values display as "Encrypted" or "Sensitive".

### Pulling values
```
npx vercel pull --environment=production --yes
```
Writes to `.vercel/.env.production.local`. **Caveat:** variables marked `Sensitive` in the dashboard come back as empty strings (`""`) — this is Vercel masking them, not a missing value. Don't be misled. `vercel env ls` is the source of truth for "is it set."

### Adding / updating values

The CLI's `vercel env add` is fiddly with non-interactive stdin — it often reports success but persists an empty value when piped via `echo` or `printf`. **Don't trust `vercel env add` from a script.** Two reliable paths:

1. **Dashboard** (most reliable for sensitive values): https://vercel.com/raymondcruzinai-6874s-projects/cafe-hurno/settings/environment-variables
2. **Interactive CLI**: run `npx vercel env add <NAME> production` from a real TTY and paste the value when prompted.

After updating any env var, redeploy with `--force` so the new value is baked into the client bundle (Next.js `NEXT_PUBLIC_*` vars are inlined at build time, not read at runtime).

### Removing
```
npx vercel env rm <NAME> production --yes
```

## Inspecting deployments
```
npx vercel ls                          # recent deployments
npx vercel inspect <deployment-url>    # details
npx vercel logs <deployment-url>       # runtime logs (last hour by default)
```

## Rollback
```
npx vercel rollback <previous-deployment-url>
```
Promotes a previous deployment to production without rebuilding. Useful for fast incident recovery.

## Project info
- Org: `raymondcruzinai-6874s-projects`
- Project: `cafe-hurno`
- Production alias: `cafe-hurno.vercel.app`
- Settings URL: https://vercel.com/raymondcruzinai-6874s-projects/cafe-hurno/settings

## Common workflows

**Standard ship:** edit code → `npm run build` (locally verify) → `npx vercel --prod`

**Env var change:** update in dashboard → `npx vercel --prod --force` (the `--force` is critical for `NEXT_PUBLIC_*` vars to actually re-bake)

**Broken deploy:** `npx vercel ls` → grab previous good URL → `npx vercel rollback <url>`
