# Troubleshooting

## Canvas styles or sizing

Confirm `tldraw/tldraw.css` is imported and the canvas parent has a definite
height with `min-height: 0`. The board route uses the remaining viewport height,
not a dashboard card.

## Session does not restore

Check both Supabase Vite variables, browser storage permissions, Site URL and
redirect allow-list. Do not manually copy tokens into local storage.

## RLS permission denied

Run migrations in order, confirm the profile trigger created a profile, and
inspect `board_members`. Test `board_role_for(board_id, user_id)` with a
service-side session. Do not disable RLS.

## WebSocket rejected

Confirm `VITE_SYNC_SERVER_URL`, Worker secrets, exact `ALLOWED_ORIGINS`,
`BOARD_ROOMS`, `RATE_LIMITER`, `SOCKET_TICKETS`, `BOARD_DELETIONS`, and the
board membership. A ticket-route 401 indicates access-token verification; a
WebSocket 401 indicates an expired/replayed ticket; 403 indicates origin/board
permission; 429 indicates limits.

## Durable Object binding or persistence

Run `npx wrangler deploy --dry-run` and inspect `wrangler.jsonc`. Both Durable
Object migrations must exist. SQLite storage, not isolate memory, is the
document source of truth.

## R2 upload failure

Confirm `BOARD_ASSETS` points to `collab-canvas-assets`. Supported types are
PNG/JPEG/WebP/GIF up to 20 MiB. A viewer cannot upload. Declared MIME must match
magic bytes.

## Invalid CORS origin

Use only origins such as `https://app.example.com`—no path or trailing slash.
Comma-separate multiple exact origins. Restart local Wrangler after changing
`.dev.vars`.

## Environment error

Copy both example files. Empty required Supabase values activate local fallback;
partially configured or malformed values show an error. Worker secrets are
strictly required.

## Viewer can edit

Reconnect after a role change. Verify the Worker RPC returns `viewer` and that
the connection reaches `handleSocketConnect` with `isReadonly: true`. Treat
frontend controls only as UX, never enforcement.

## Board state not persisting

Confirm the same board UUID maps to the same Durable Object binding and that the
client/Worker tldraw packages are exactly the same version. Review Worker logs
for schema or SQLite errors.

## Wrangler log warning on restricted Windows profiles

Wrangler may fail to create its optional log directory while still completing
a dry-run. Use a writable `XDG_CONFIG_HOME` in your own shell or run outside a
restricted sandbox; judge success by the command exit status and bundle output.
