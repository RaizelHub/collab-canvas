# Deployment

## 1. Supabase

Create a project, record its URL, anonymous key, and service-role key, then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Inspect policies in the SQL editor and test owner/editor/viewer accounts before
production. Configure Site URL, allowed redirects, email verification, reset
redirect, and SMTP. Keep the service-role key only in Worker secrets.

## 2. Cloudflare

Create the R2 bucket:

```bash
npx wrangler r2 bucket create collab-canvas-assets
```

From `apps/sync-worker`, set all five `.dev.vars.example` values with
`wrangler secret put`, then deploy:

```bash
npx wrangler deploy
```

Wrangler applies Durable Object migrations `v1` (board rooms), `v2` (rate
limiters), `v3` (single-use socket tickets), `v4` (retrying board cleanup), and
`v5` (the public portfolio room).
Optionally set `PORTFOLIO_ADMIN_USER_ID` to the portfolio owner's Supabase user
ID before deployment to enable private remove/hide controls.
Verify `/health`, an unauthorized ticket rejection, ticket replay rejection,
an invalid origin rejection, and an authenticated owner/editor/viewer
connection.

## 3. Frontend

Set build variables on Cloudflare Pages:

- `VITE_APP_NAME`
- `VITE_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SYNC_SERVER_URL`

Build command: `npm ci && npm run build --workspace=@collab-canvas/web`.
Output directory: `apps/web/dist`. Configure all SPA routes to serve
`index.html`. Set Worker `ALLOWED_ORIGINS` to the exact Pages/custom-domain
origin, without wildcards.

## Verification

Run the 25-step two-browser checklist in `docs/testing.md`. Verify R2 objects,
Durable Object state after restart, RLS rejection with a third user, email
flows, PNG/PDF file signatures, snapshot restore, and board cleanup.

## Rollback

- Frontend: redeploy the previous static artifact.
- Worker: deploy the previous Worker version. Do not remove or rename Durable
  Object classes/bindings during rollback.
- Database: prefer forward corrective migrations. Before destructive schema
  changes, use Supabase backups/PITR appropriate to the plan.
- R2: snapshot/retain important data before cleanup changes. Metadata rollback
  does not recreate deleted R2 objects.

Cloudflare and Supabase free plans have request, storage, egress, compute, and
email limits. Review current plan limits before launch.
