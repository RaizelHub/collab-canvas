# CollabCanvas

CollabCanvas is a React and tldraw collaborative whiteboard with Supabase
identity/metadata, a Cloudflare Durable Object per board, SQLite-backed
document sync, and private R2 assets.

## Implemented

- Email/password registration, login, logout, recovery, session restoration,
  protected routes, safe redirects, and automatic profiles.
- Local fallback boards when Supabase is absent; authenticated CRUD, recent
  access, search, sort, role filters, shared boards, duplication, and deletion
  when configured.
- tldraw editing, live document sync, cursors/presence, hibernating WebSockets,
  reconnection, and server-enforced owner/editor/viewer roles.
- Email-bound, hashed, expiring invitation tokens; acceptance, decline, member
  removal, and role changes.
- R2 image uploads with size, type, and magic-byte validation; signed reads and
  cleanup.
- PNG and valid PDF export, manual snapshots, safe restore, and state-preserving
  duplication.
- Strict TypeScript, ESLint, Prettier, Vitest, Playwright scenarios, Worker
  dry-run builds, migrations/RLS, and GitHub Actions.

## Architecture

```text
React/Vite ── Supabase Auth + Postgres/RLS
     │
     ├── HTTPS assets/invitations/snapshots ── Cloudflare Worker ── R2
     └── HTTPS socket ticket ── authenticated WebSocket ── Durable Object per board ── SQLite
```

Supabase stores identity, profiles, board metadata, access, invitations,
activity, recent access, snapshot metadata, and asset metadata. Durable Objects
store the tldraw document and temporary presence. R2 stores image bytes and
snapshot JSON. See [docs/architecture.md](docs/architecture.md).

## Prerequisites

- Node.js 24 LTS or newer and npm 11+
- Docker Desktop for local Supabase
- Supabase CLI
- Wrangler/Cloudflare account for remote Worker deployment
- A Cloudflare R2 bucket named `collab-canvas-assets`

## Install and configure

```bash
npm install
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and
`apps/sync-worker/.dev.vars.example` to `apps/sync-worker/.dev.vars`.

Generate the signing secret with a cryptographically secure password generator
(32+ characters). Never put the service-role key or signing secret in a
`VITE_` variable.

## Supabase

Local:

```bash
supabase start
supabase db reset
supabase status
```

Hosted project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

In Supabase Authentication URL settings, add the web origin and the
`/reset-password` redirect. Configure an SMTP provider before relying on
production verification/reset email delivery.

## Cloudflare

Create the R2 bucket once:

```bash
npx wrangler r2 bucket create collab-canvas-assets
```

Set Worker secrets:

```bash
cd apps/sync-worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler secret put ASSET_SIGNING_SECRET
npx wrangler deploy
```

`wrangler.jsonc` declares the R2 binding, board Durable Object, rate-limiter
Durable Object, and SQLite migrations. Do not rename deployed Durable Object
classes without a migration plan.

## Development

Run the web app and Worker together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:web
npm run dev:worker
```

Local URLs default to `http://127.0.0.1:5173` and
`http://127.0.0.1:8787`. Both values must match the web environment and
`ALLOWED_ORIGINS`.

## Validation

```bash
npm run typecheck
npm run lint
npm run test
npm run format:check
npm run build
```

Live Playwright collaboration scenarios require a deployed/local integrated
stack and two dedicated test accounts:

```bash
E2E_BASE_URL=https://app.example.com \
E2E_USER_A_EMAIL=owner@example.com \
E2E_USER_A_PASSWORD=... \
E2E_USER_B_EMAIL=member@example.com \
E2E_USER_B_PASSWORD=... \
npm run test:e2e
```

## Deployment

Deploy the database first, then R2/Worker, then the static `apps/web/dist`
output to Cloudflare Pages (or another SPA host). Configure SPA fallback to
`index.html`, set the four `VITE_` variables at build time, and update
`ALLOWED_ORIGINS` to the exact production origin. Detailed rollout and rollback
steps are in [docs/deployment.md](docs/deployment.md).

## Security

The Worker validates Supabase access tokens, derives identity and role
server-side, exchanges access tokens for single-use 60-second socket tickets,
rejects unknown origins, makes viewers read-only inside tldraw sync, validates
image signatures, caps uploads at 20 MiB, signs short-lived R2 reads, hashes
invitation tokens, and rate-limits connections/uploads/invites. Board metadata
deletion is server-owned; a retrying Durable Object cleans Durable Object and
R2 state after access has been revoked.
RLS is enabled on every application table. Review
[docs/security.md](docs/security.md) before production.

## Known limitations

- Sending invitation emails is not bundled; the owner receives a secure link
  to copy. Integrate a transactional email provider server-side if automatic
  delivery is required.
- Public/link access currently requires an authenticated account. Anonymous
  public viewing is intentionally not enabled.
- Thumbnail generation is not implemented; the dashboard uses a neutral
  fallback.
- Asset cleanup on individual shape deletion is best-effort for assets uploaded
  in the current session. Board deletion performs prefix cleanup.
- Automatic scheduled snapshots are not enabled; snapshots are manual.
- The gated Playwright suite needs external accounts and was not designed to
  run against an unconfigured checkout.
- Cloudflare/Supabase deployment and two-browser manual verification require
  user-owned accounts and secrets.

See [docs/troubleshooting.md](docs/troubleshooting.md) for common failures and
[docs/testing.md](docs/testing.md) for the verification matrix.
