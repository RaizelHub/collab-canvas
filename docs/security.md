# Security

## Threat model

Primary risks are stolen/forged tokens, cross-board access, self-escalation,
viewer writes, invitation replay, malicious uploads, cross-origin abuse,
resource exhaustion, secret leakage, and destructive board operations.

## Controls

- Supabase access tokens are handled by the supported client and refreshed
  before API use. The Worker verifies them with Supabase Auth, then issues a
  single-use 60-second socket ticket. Access tokens never appear in WebSocket
  URLs or Worker request logs.
- Role, owner, and user identity are derived server-side. Viewer sockets are
  read-only inside `TLSocketRoom`.
- RLS is enabled for profiles, boards, members, invitations, recent access,
  activity, snapshots, and assets. Owners cannot be inserted/changed through
  member-management policies; clients cannot forge activity.
- Invitation tokens contain 256 bits of randomness, are hashed at rest,
  email-bound, expiring, single-use, revocable, and limited to editor/viewer.
- Uploads are board-authorized, limited to 20 MiB, limited by rate, restricted
  to PNG/JPEG/WebP/GIF, checked by content signature, and stored under generated
  keys. SVG is rejected.
- Asset reads use expiring HMAC signatures. Security headers disable sniffing
  and embedding; CORS reflects only exact configured origins.
- Board deletion requires an owner-authorized Worker cleanup before metadata
  deletion. Snapshot restore is owner-only.
- Logs contain board/user IDs and status codes, not access tokens or secrets.
- Public portfolio identities are HMAC-signed and verified again inside the
  Durable Object. Existing public profile name/avatar data may be reused, but
  email, IP, location, fingerprint, and analytics fields are never exposed.
- Public contributions reject URLs and a basic profanity set, cap text at 160
  characters, cap drawing geometry, enforce per-visitor object limits, and
  derive ownership and admin status only from verified claims.

## Rate limits

The SQLite `RateLimiter` Durable Object applies fixed-window limits:

- 120 WebSocket handshakes per client address per minute
- 30 socket-ticket issues per user and board per minute
- 60 asset uploads per user per hour
- 10 invitation creations per user per hour
- 50 simultaneous sockets per board
- 40 simultaneous visitors in the portfolio room
- 30 portfolio session issues per client address per hour
- 40 portfolio socket attempts per client address per minute
- 40 portfolio socket-ticket issues per visitor per minute
- about 22 accepted movement snapshots per second per active session
- one new public object per visitor every 2.5 seconds, up to 24 active objects

Board deletion removes metadata first to revoke access, then delegates room/R2
cleanup to a Durable Object that retries transient failures.

Supabase/Auth and Cloudflare account-level protections should additionally
limit login/password reset, requests, bandwidth, and bot traffic. Fixed-window
keys may grow; define a retention/cleanup policy at scale or replace this with
Cloudflare Rate Limiting.

## Remaining considerations

- Rotate service/signing secrets and restrict staff access.
- Configure CSP at the frontend host; tldraw's asset needs must be included in
  `img-src`, `connect-src`, and Worker URLs.
- Use separate Supabase/Cloudflare projects per environment.
- Add automated dependency scanning and review current npm audit findings
  before release.
- The anonymous portfolio grant is scoped only to the public room. Do not reuse
  it for boards, assets, invitations, profile writes, or PostgreSQL access.
- Automated email delivery needs a server-side provider and must never expose
  its API key to Vite.
