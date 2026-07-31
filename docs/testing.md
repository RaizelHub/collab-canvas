# Testing

## Automated

```bash
npm run typecheck
npm run lint
npm run test
npm run format:check
npm run build
```

Vitest covers local board persistence/validation, environment parsing, safe
redirects, dashboard creation/navigation, asset magic bytes/signatures, token
verification, and server-derived authorization. Worker build uses Wrangler
dry-run, which validates bindings and bundled runtime compatibility.

Playwright scenarios are gated behind `E2E_BASE_URL` and two test-account
credential pairs. They exercise real login, board creation, invitation
creation, shared-board visibility, and viewer UI restrictions. Extend the live
environment suite with pointer-based drawing assertions after selecting stable
tldraw test IDs for the deployed tldraw version.

## Database and integration

For a disposable local Supabase instance:

```bash
supabase start
supabase db reset
supabase db lint
```

Test policies with separate owner/editor/viewer JWTs. Required regressions:
cross-user board reads, owner insertion, self-role escalation, viewer metadata
writes, forged activity inserts, expired/revoked/reused invitations, and
cross-board asset/snapshot access.

Run both a clean migration sequence and a legacy-schema upgrade sequence.
Assert that visibility values and snapshot/asset columns match the shared
frontend/Worker contracts. Socket tests must also prove that tickets expire,
cannot be replayed, and cannot be used for a different board.

## Manual two-browser checklist

1. Register Users A and B and verify email/session recovery.
2. A creates a board and invites B as editor.
3. B accepts from a private browser session.
4. Both open the board; verify cursors/names and connected state.
5. A draws, moves, resizes, rotates, edits text, uploads an image, deletes,
   undoes, and redoes; B must see each result.
6. B edits; A must see it.
7. Disconnect B; presence must disappear. Reconnect and confirm convergence.
8. Change B to viewer and reconnect; server must reject writes/uploads.
9. Refresh/restart Worker and confirm document/image persistence.
10. Export PNG and PDF and open both; test selected-object and empty-board
    behavior.
11. Create a snapshot, change the board, restore, and verify both sessions
    converge without corruption.
12. Duplicate the board and verify independent persisted state.
13. Remove B and confirm subsequent access/socket connection is rejected.
14. Delete the board and confirm metadata, room access, and R2 prefix removal.

Manual keyboard review: auth, dashboard create/search/sort, board title, share
dialog, invitation acceptance, export, snapshot confirmation, and deletion.
