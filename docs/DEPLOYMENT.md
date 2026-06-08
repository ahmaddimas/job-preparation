# CI/CD & Deployment

## Workflows

**`ci.yml`** — runs on every push and PR to `main`/`develop`
- Lint (`npm run lint`)
- Type check (`npm run type-check`)
- Tests (`npm run test:run`)
- Build (`npm run build`) — after lint + tests pass

**`deploy.yml`** — runs only when a PR is merged into `main`
- Re-runs tests as a final gate
- Deploys to Vercel production via `npx vercel@latest --prod`
- A direct push to `main` does **not** trigger deployment

## Vercel setup

### 1. Get a token

Go to [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create Token → copy it (shown once).

### 2. Get org ID and project ID

```bash
npm i -g vercel
vercel login
vercel link
```

This creates `.vercel/project.json` (already gitignored):

```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

### 3. Add GitHub secrets

Repo → **Settings → Secrets and variables → Actions**

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | token from step 1 |
| `VERCEL_ORG_ID` | `orgId` from `project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `project.json` |

Secrets are encrypted — never visible in logs or to repo visitors.

The deploy workflow passes these as environment variables:

```yaml
- name: Deploy to Vercel
  run: npx vercel@latest --prod --token=${{ secrets.VERCEL_TOKEN }}
  env:
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 4. Update badge URLs

Replace `<your-org>/<your-repo>` in `README.md` with your actual GitHub path.
