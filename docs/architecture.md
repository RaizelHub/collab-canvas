# Architecture

## Boundaries

The browser owns UI state and tldraw editor state. Supabase Auth owns sessions.
PostgreSQL owns durable application metadata and authorization relationships.
The Worker is the only public entry point for collaborative sockets, private
assets, invitations, and snapshot operations. A board-ID-derived Durable Object
owns that board's tldraw document. R2 owns binary assets and snapshot blobs.

Canvas records are not copied into PostgreSQL. Cursor and selection presence is
ephemeral and travels through tldraw sync; it is not stored as application
history.

The portfolio room is a separate public boundary. Its `CollabSpace` Durable
Object stores only deliberately public text, notes, strokes, and ownership
metadata. Character positions, movement, direction, and active presence remain
ephemeral. This keeps anonymous portfolio interaction isolated from private
board authorization and storage.

## Portfolio visitor flow

1. The browser restores the existing Supabase session when one exists.
2. `/portfolio/session` verifies that account and reuses its display name and
   avatar, or verifies a returning guest token.
3. A new guest receives a random privacy-safe ID/name and a year-long HMAC
   token. No IP, fingerprint, email, or location enters their public identity.
4. The long-lived visitor token is exchanged over HTTPS for a 60-second socket
   ticket, so it never enters a WebSocket URL. Both the Worker and `CollabSpace`
   verify that short-lived ticket. The Durable Object never trusts identity
   headers.
5. Local movement renders immediately. The browser sends at most about twelve
   snapshots per second; the server rate-limits, sequence-checks, bounds, and
   distance-checks each update.
6. The Durable Object persists each public object under its own storage key and
   derives ownership from the verified session. Only the owner or configured
   portfolio admin can remove a contribution.

The browser falls back to a generated local identity and device-local
contributions when no sync URL is configured. That mode is clearly labeled and
does not simulate other visitors.

## Authentication and permission flow

1. Supabase restores the browser session.
2. The browser sends the current access token to the HTTPS socket-ticket route.
3. The Worker sends the token to Supabase Auth's user endpoint.
4. The Worker calls the service-side `board_role_for` function.
5. It stores a single-use, 60-second ticket in a ticket Durable Object.
6. The WebSocket consumes that ticket; the access token never enters its URL.
7. The Worker forwards only derived user/role metadata to the board Durable Object.
8. `TLSocketRoom` receives `isReadonly: true` for viewers.

The browser never supplies a trusted user ID or role. RLS independently
protects direct metadata queries.

## Document and reconnection flow

`useSync` obtains a ticket and connects through WebSocket to `/connect/:boardId`.
The board ID maps
to one Durable Object name. `SQLiteSyncStorage` persists tldraw records and sync
clocks. Cloudflare's hibernation API stores session snapshots on WebSocket
attachments, allowing the isolate to sleep and resume. tldraw sync handles
client retry/backoff and resynchronization.

Document changes debounce a `last_activity_at` update through a Durable Object
alarm. Presence is removed when the WebSocket closes or errors.

Board deletion first removes Supabase metadata, which revokes access and
cascades relational metadata. A deletion-coordinator Durable Object then
removes board-room SQLite state and the board's R2 prefix, retrying failures
with bounded exponential backoff.

## Assets

An editor uploads raw bytes to the Worker. The Worker verifies membership,
rate limit, declared size/type, actual byte length, and image signature. It
writes a generated board-scoped key to R2 and records metadata in Supabase.
The document stores an opaque asset path. On render the browser requests a
15-minute signed read URL. Board deletion removes the board's R2 prefix.

## Invitations

The Worker creates 256-bit random tokens, stores only SHA-256 hashes, limits
creation, binds the invitation to a normalized email, and returns the raw token
once. Acceptance/rejection functions execute in PostgreSQL under row locking,
validate current JWT email, expiry, revocation, and reuse, and never grant the
owner role.

## Snapshots and duplication

The Durable Object exposes snapshot/restore only to the Worker. Snapshots are
tldraw room snapshots stored in R2 with metadata in PostgreSQL. Restore is
owner-only and calls tldraw's schema-aware `loadSnapshot`; it does not mutate
SQLite manually. Duplication creates the destination metadata and restores a
source snapshot, deleting the destination metadata if restore fails.
