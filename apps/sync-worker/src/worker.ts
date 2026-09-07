import { authorizeBoard } from "./authorization/authorize-board";
import { verifyAccessToken } from "./authentication/verify-access-token";
import {
  consumeSocketTicket,
  issueSocketTicket,
  SocketTicketBroker,
} from "./authentication/socket-ticket-broker";
import {
  createSignedAssetUrl,
  deleteAsset,
  readAsset,
  uploadAsset,
} from "./assets/asset-handler";
import {
  readAvatar,
  removeAvatar,
  uploadAvatar,
} from "./assets/avatar-handler";
import {
  createBoardSnapshot,
  deleteBoardMetadata,
  duplicateBoard,
  restoreBoardSnapshot,
} from "./boards/board-lifecycle";
import {
  BoardDeletionCoordinator,
  scheduleBoardCleanup,
} from "./boards/board-deletion-coordinator";
import { BoardRoom } from "./durable-objects/board-room";
import { CollabSpace } from "./durable-objects/collab-space";
import { consumeRateLimit, RateLimiter } from "./durable-objects/rate-limiter";
import {
  claimsForUser,
  createGuestClaims,
  issueVisitorToken,
  verifyVisitorToken,
} from "./portfolio/visitor-token";
import { createInvitation } from "./sharing/invitation-handler";
import {
  regenerateShareLink,
  resolveShareLink,
  revokeShareLink,
} from "./sharing/share-link-handler";
import { corsHeaders, isAllowedOrigin } from "./security/origin";
import {
  executeScheduledKeepAlive,
  pingSupabaseDatabase,
} from "./maintenance/database-keepalive";
import { validateWorkerEnvironment } from "./validation/environment";
import { boardIdSchema } from "./validation/request";
import { z } from "zod";

export {
  BoardDeletionCoordinator,
  BoardRoom,
  CollabSpace,
  RateLimiter,
  SocketTicketBroker,
};

function json(
  request: Request,
  env: Env,
  body: unknown,
  status = 200,
): Response {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  return null;
}

function collabSpace(env: Env) {
  return env.COLLAB_SPACE.get(env.COLLAB_SPACE.idFromName("portfolio"));
}

async function handlePortfolioRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/portfolio/")) return null;
  if (!isAllowedOrigin(request, env)) {
    return json(request, env, { error: "origin_not_allowed" }, 403);
  }

  if (url.pathname === "/portfolio/session" && request.method === "POST") {
    const clientAddress =
      request.headers.get("CF-Connecting-IP") ?? "unknown-client";
    if (
      !(await consumeRateLimit(
        env,
        `portfolio-session:${clientAddress}`,
        30,
        3600,
      ))
    ) {
      return json(request, env, { error: "session_rate_limited" }, 429);
    }
    const accessToken = readBearerToken(request);
    const account = accessToken
      ? await verifyAccessToken(accessToken, env)
      : null;
    let publicProfile = account;
    if (account) {
      try {
        const profileResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(account.id)}&select=display_name,avatar_url&limit=1`,
          {
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          },
        );
        const profiles = z
          .array(
            z.object({
              display_name: z.string().trim().min(1).max(80),
              avatar_url: z.string().url().nullable(),
            }),
          )
          .safeParse(await profileResponse.json().catch(() => null));
        if (profiles.success && profiles.data[0]) {
          publicProfile = {
            ...account,
            displayName: profiles.data[0].display_name,
            avatarUrl: profiles.data[0].avatar_url,
          };
        }
      } catch {
        publicProfile = account;
      }
    }
    const returning = !account
      ? await verifyVisitorToken(
          request.headers.get("X-Visitor-Token") ?? "",
          env.ASSET_SIGNING_SECRET,
        )
      : null;
    const claims = publicProfile
      ? claimsForUser(publicProfile, env.PORTFOLIO_ADMIN_USER_ID)
      : (returning ?? createGuestClaims());
    const token = await issueVisitorToken(claims, env.ASSET_SIGNING_SECRET);
    return json(request, env, {
      token,
      visitor: {
        id: claims.id,
        name: claims.name,
        avatarUrl: claims.avatarUrl,
        color: claims.color,
        isAdmin: claims.isAdmin,
      },
    });
  }

  if (url.pathname === "/portfolio/state" && request.method === "GET") {
    const response = await collabSpace(env).fetch(
      "https://collab.internal/state",
    );
    const headers = corsHeaders(request, env);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  }

  if (
    url.pathname === "/portfolio/socket-ticket" &&
    request.method === "POST"
  ) {
    const claims = await verifyVisitorToken(
      request.headers.get("X-Visitor-Token") ?? "",
      env.ASSET_SIGNING_SECRET,
    );
    if (!claims) {
      return json(request, env, { error: "invalid_visitor_session" }, 401);
    }
    if (
      !(await consumeRateLimit(env, `portfolio-ticket:${claims.id}`, 40, 60))
    ) {
      return json(request, env, { error: "connection_rate_limited" }, 429);
    }
    const expiresAt = Date.now() + 60_000;
    const ticket = await issueVisitorToken(
      { ...claims, expiresAt },
      env.ASSET_SIGNING_SECRET,
    );
    return json(request, env, {
      ticket,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  if (
    url.pathname === "/portfolio/connect" &&
    request.headers.get("Upgrade")?.toLowerCase() === "websocket"
  ) {
    const clientAddress =
      request.headers.get("CF-Connecting-IP") ?? "unknown-client";
    if (
      !(await consumeRateLimit(
        env,
        `portfolio-socket:${clientAddress}`,
        40,
        60,
      ))
    ) {
      return json(request, env, { error: "connection_rate_limited" }, 429);
    }
    const token = url.searchParams.get("token") ?? "";
    const ticketClaims = await verifyVisitorToken(
      token,
      env.ASSET_SIGNING_SECRET,
    );
    if (!ticketClaims || ticketClaims.expiresAt > Date.now() + 65_000) {
      return json(request, env, { error: "invalid_visitor_session" }, 401);
    }
    const internalUrl = new URL("https://collab.internal/connect");
    internalUrl.searchParams.set("token", token);
    return collabSpace(env).fetch(
      new Request(internalUrl, {
        headers: request.headers,
        method: request.method,
      }),
    );
  }
  return json(request, env, { error: "not_found" }, 404);
}

async function handleSocketTicketRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = /^\/socket-ticket\/([^/]+)$/.exec(url.pathname);
  if (!match) return null;
  const boardId = boardIdSchema.safeParse(match[1]);
  if (
    request.method !== "POST" ||
    !boardId.success ||
    !isAllowedOrigin(request, env)
  ) {
    return json(request, env, { error: "invalid_request" }, 400);
  }
  const token = readBearerToken(request);
  const user = token ? await verifyAccessToken(token, env) : null;
  if (!user) {
    return json(request, env, { error: "authentication_required" }, 401);
  }
  if (
    !(await consumeRateLimit(
      env,
      `socket-ticket:${user.id}:${boardId.data}`,
      30,
      60,
    ))
  ) {
    return json(request, env, { error: "connection_rate_limited" }, 429);
  }
  const authorization = await authorizeBoard(
    boardId.data,
    user,
    env,
    request.headers.get("X-Share-Token"),
  );
  if (!authorization) {
    return json(request, env, { error: "permission_denied" }, 403);
  }
  const expiresAt = Date.now() + 60_000;
  const ticket = await issueSocketTicket(env, {
    boardId: boardId.data,
    expiresAt,
    role: authorization.role,
    user,
  });
  return json(request, env, {
    expiresAt: new Date(expiresAt).toISOString(),
    ticket,
  });
}

async function handleConnect(request: Request, env: Env): Promise<Response> {
  if (!isAllowedOrigin(request, env)) {
    return json(request, env, { error: "origin_not_allowed" }, 403);
  }
  const url = new URL(request.url);
  const boardId = boardIdSchema.safeParse(url.pathname.split("/").at(-1));
  if (!boardId.success) {
    return json(request, env, { error: "invalid_board_id" }, 400);
  }
  const clientAddress =
    request.headers.get("CF-Connecting-IP") ?? "unknown-client";
  if (
    !(await consumeRateLimit(env, `socket-ip:v2:${clientAddress}`, 120, 60))
  ) {
    return json(request, env, { error: "connection_rate_limited" }, 429);
  }
  const claims = await consumeSocketTicket(
    env,
    url.searchParams.get("ticket") ?? "",
  );
  if (!claims || claims.boardId !== boardId.data) {
    return json(request, env, { error: "invalid_socket_ticket" }, 401);
  }

  const roomId = env.BOARD_ROOMS.idFromName(boardId.data);
  const room = env.BOARD_ROOMS.get(roomId);
  const internalUrl = new URL(request.url);
  internalUrl.searchParams.delete("ticket");
  const headers = new Headers(request.headers);
  headers.set("X-Collab-User", claims.user.id);
  headers.set("X-Collab-Board", boardId.data);
  headers.set("X-Collab-Role", claims.role);
  headers.set("X-Collab-Name", claims.user.displayName);
  if (claims.user.avatarUrl) {
    headers.set("X-Collab-Avatar", claims.user.avatarUrl);
  }
  return room.fetch(
    new Request(internalUrl, {
      headers,
      method: request.method,
    }),
  );
}

const assetRouteSchema = z.object({
  assetId: z.uuid(),
  boardId: boardIdSchema,
});

function parseAssetRoute(url: URL) {
  const [, routeName, boardId, assetId, action] = url.pathname.split("/");
  if (routeName !== "assets") return null;
  const parsed = assetRouteSchema.safeParse({ assetId, boardId });
  return parsed.success ? { ...parsed.data, action } : null;
}

async function authenticateAssetRequest(
  request: Request,
  env: Env,
  boardId: string,
) {
  const token = readBearerToken(request);
  if (!token) return null;
  const user = await verifyAccessToken(token, env);
  if (!user) return null;
  const authorization = await authorizeBoard(
    boardId,
    user,
    env,
    request.headers.get("X-Share-Token"),
  );
  return authorization ? { authorization, user } : null;
}

async function handleAssetRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const route = parseAssetRoute(new URL(request.url));
  if (!route) return null;

  if (request.method === "GET" && !route.action) {
    return readAsset(route, request, env);
  }
  if (!isAllowedOrigin(request, env)) {
    return json(request, env, { error: "origin_not_allowed" }, 403);
  }

  const access = await authenticateAssetRequest(request, env, route.boardId);
  if (!access) {
    return json(request, env, { error: "permission_denied" }, 403);
  }
  if (request.method === "POST" && route.action === "sign") {
    return json(request, env, {
      url: await createSignedAssetUrl(route, request, env),
    });
  }
  if (request.method === "PUT" && !route.action) {
    if (access.authorization.role === "viewer") {
      return json(request, env, { error: "read_only_board" }, 403);
    }
    if (!(await consumeRateLimit(env, `asset:${access.user.id}`, 60, 3600))) {
      return json(request, env, { error: "upload_rate_limited" }, 429);
    }
    const result = await uploadAsset(route, access.user, request, env);
    return json(request, env, result, result.status);
  }
  if (request.method === "DELETE" && !route.action) {
    if (access.authorization.role === "viewer") {
      return json(request, env, { error: "read_only_board" }, 403);
    }
    const removed = await deleteAsset(route, env);
    return removed
      ? new Response(null, {
          status: 204,
          headers: corsHeaders(request, env),
        })
      : json(request, env, { error: "asset_deletion_failed" }, 502);
  }
  return json(request, env, { error: "method_not_allowed" }, 405);
}

async function handleAvatarRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const readMatch = /^\/avatars\/([^/]+)\/([^/]+)$/.exec(url.pathname);
  if (readMatch && request.method === "GET") {
    const userId = z.uuid().safeParse(readMatch[1]);
    const assetId = z.uuid().safeParse(readMatch[2]);
    return userId.success && assetId.success
      ? readAvatar(userId.data, assetId.data, env)
      : new Response("Avatar not found.", { status: 404 });
  }
  if (url.pathname !== "/profile/avatar") return null;
  if (!isAllowedOrigin(request, env)) {
    return json(request, env, { error: "origin_not_allowed" }, 403);
  }
  const token = readBearerToken(request);
  const user = token ? await verifyAccessToken(token, env) : null;
  if (!user) {
    return json(request, env, { error: "authentication_required" }, 401);
  }
  if (request.method === "PUT") {
    const result = await uploadAvatar(request, user, env);
    return json(request, env, result.body, result.status);
  }
  if (request.method === "DELETE") {
    return (await removeAvatar(user, env))
      ? new Response(null, {
          status: 204,
          headers: corsHeaders(request, env),
        })
      : json(request, env, { error: "avatar_remove_failed" }, 502);
  }
  return json(request, env, { error: "method_not_allowed" }, 405);
}

async function handleInvitationRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = /^\/boards\/([^/]+)\/invitations$/.exec(url.pathname);
  if (!match) return null;
  const boardId = boardIdSchema.safeParse(match[1]);
  if (!boardId.success || request.method !== "POST") {
    return json(request, env, { error: "invalid_request" }, 400);
  }
  if (!isAllowedOrigin(request, env)) {
    return json(request, env, { error: "origin_not_allowed" }, 403);
  }
  const access = await authenticateAssetRequest(request, env, boardId.data);
  if (!access || access.authorization.role !== "owner") {
    return json(request, env, { error: "owner_permission_required" }, 403);
  }
  if (
    !(await consumeRateLimit(env, `invitation:${access.user.id}`, 10, 3600))
  ) {
    return json(request, env, { error: "invitation_rate_limited" }, 429);
  }
  const result = await createInvitation(
    boardId.data,
    access.user,
    request,
    env,
  );
  return json(request, env, result.body, result.status);
}

async function handleShareLinkRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const boardMatch = /^\/boards\/([^/]+)\/share-link$/.exec(url.pathname);
  if (boardMatch) {
    const boardId = boardIdSchema.safeParse(boardMatch[1]);
    if (!boardId.success || !isAllowedOrigin(request, env)) {
      return json(request, env, { error: "invalid_request" }, 400);
    }
    const access = await authenticateAssetRequest(request, env, boardId.data);
    if (!access || access.authorization.role !== "owner") {
      return json(request, env, { error: "owner_permission_required" }, 403);
    }
    if (request.method === "POST") {
      return json(request, env, {
        token: await regenerateShareLink(env, boardId.data),
      });
    }
    if (request.method === "DELETE") {
      return (await revokeShareLink(env, boardId.data))
        ? new Response(null, {
            status: 204,
            headers: corsHeaders(request, env),
          })
        : json(request, env, { error: "share_link_revoke_failed" }, 502);
    }
    return json(request, env, { error: "method_not_allowed" }, 405);
  }

  const shareMatch = /^\/share\/([^/]+)$/.exec(url.pathname);
  if (!shareMatch || request.method !== "GET") return null;
  if (!isAllowedOrigin(request, env)) {
    return json(request, env, { error: "origin_not_allowed" }, 403);
  }
  const token = readBearerToken(request);
  if (!token || !(await verifyAccessToken(token, env))) {
    return json(request, env, { error: "authentication_required" }, 401);
  }
  const board = await resolveShareLink(env, shareMatch[1] ?? "");
  return board
    ? json(request, env, board)
    : json(request, env, { error: "share_link_invalid" }, 404);
}

const boardActionSchema = z.object({
  reason: z.string().trim().min(1).max(120).optional(),
});

async function handleBoardLifecycleRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match =
    /^\/boards\/([^/]+)\/(snapshots|duplicate|state)(?:\/([^/]+)\/restore)?$/.exec(
      url.pathname,
    );
  if (!match) return null;
  const boardId = boardIdSchema.safeParse(match[1]);
  if (!boardId.success || !isAllowedOrigin(request, env)) {
    return json(request, env, { error: "invalid_request" }, 400);
  }
  const access = await authenticateAssetRequest(request, env, boardId.data);
  if (!access) {
    return json(request, env, { error: "permission_denied" }, 403);
  }
  const action = match[2];
  const snapshotId = match[3];

  try {
    if (action === "snapshots" && request.method === "POST" && !snapshotId) {
      if (access.authorization.role === "viewer") {
        return json(request, env, { error: "read_only_board" }, 403);
      }
      const raw = await request.json().catch(() => ({}));
      const input = boardActionSchema.safeParse(raw);
      if (!input.success) {
        return json(request, env, { error: "invalid_snapshot" }, 400);
      }
      return json(
        request,
        env,
        await createBoardSnapshot(
          env,
          boardId.data,
          access.user,
          input.data.reason ?? "Manual snapshot",
        ),
        201,
      );
    }
    if (action === "snapshots" && snapshotId && request.method === "POST") {
      if (access.authorization.role !== "owner") {
        return json(request, env, { error: "owner_permission_required" }, 403);
      }
      const validSnapshotId = z.uuid().safeParse(snapshotId);
      if (
        !validSnapshotId.success ||
        !(await restoreBoardSnapshot(env, boardId.data, validSnapshotId.data))
      ) {
        return json(request, env, { error: "snapshot_not_found" }, 404);
      }
      return json(request, env, { restored: true });
    }
    if (action === "duplicate" && request.method === "POST") {
      if (access.authorization.role !== "owner") {
        return json(request, env, { error: "owner_permission_required" }, 403);
      }
      const titleResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/boards?id=eq.${boardId.data}&select=title&limit=1`,
        {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );
      const rows = z
        .array(z.object({ title: z.string() }))
        .safeParse(await titleResponse.json());
      if (!rows.success || !rows.data[0]) {
        return json(request, env, { error: "board_not_found" }, 404);
      }
      return json(request, env, {
        boardId: await duplicateBoard(
          env,
          boardId.data,
          access.user,
          rows.data[0].title,
        ),
      });
    }
    if (action === "state" && request.method === "DELETE") {
      if (access.authorization.role !== "owner") {
        return json(request, env, { error: "owner_permission_required" }, 403);
      }
      await deleteBoardMetadata(env, boardId.data);
      try {
        await scheduleBoardCleanup(env, boardId.data);
      } catch (cleanupError) {
        console.error("Board metadata deleted before cleanup scheduling.", {
          boardId: boardId.data,
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : "unknown_error",
        });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }
  } catch (error) {
    console.error("Board lifecycle operation failed.", {
      action,
      boardId: boardId.data,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return json(request, env, { error: "board_operation_failed" }, 502);
  }
  return json(request, env, { error: "method_not_allowed" }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      validateWorkerEnvironment(env);
    } catch (error) {
      console.error("Worker environment validation failed.", error);
      return new Response("Worker configuration is invalid.", { status: 500 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const origin = request.headers.get("Origin");
      const healthHeaders = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        Vary: "Origin",
      });
      healthHeaders.set("Access-Control-Allow-Origin", origin || "*");
      healthHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      healthHeaders.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: healthHeaders,
        });
      }

      const checkDb =
        url.searchParams.get("check") === "db" ||
        url.searchParams.get("ping_db") === "1";

      if (!checkDb) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: healthHeaders,
        });
      }

      const dbResult = await pingSupabaseDatabase(env);
      return new Response(
        JSON.stringify({
          status: dbResult.ok ? "ok" : "degraded",
          database: dbResult.ok ? "connected" : "error",
          latencyMs: dbResult.latencyMs,
          ...(dbResult.error ? { error: dbResult.error } : {}),
        }),
        {
          status: dbResult.ok ? 200 : 503,
          headers: healthHeaders,
        },
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }
    if (url.pathname.startsWith("/portfolio/")) {
      return (
        (await handlePortfolioRequest(request, env)) ??
        json(request, env, { error: "not_found" }, 404)
      );
    }
    if (url.pathname.startsWith("/socket-ticket/")) {
      return (
        (await handleSocketTicketRequest(request, env)) ??
        json(request, env, { error: "not_found" }, 404)
      );
    }
    if (url.pathname.startsWith("/assets/")) {
      return (
        (await handleAssetRequest(request, env)) ??
        json(request, env, { error: "not_found" }, 404)
      );
    }
    if (
      url.pathname === "/profile/avatar" ||
      url.pathname.startsWith("/avatars/")
    ) {
      return (
        (await handleAvatarRequest(request, env)) ??
        json(request, env, { error: "not_found" }, 404)
      );
    }
    if (url.pathname.startsWith("/boards/")) {
      return (
        (await handleShareLinkRequest(request, env)) ??
        (await handleBoardLifecycleRequest(request, env)) ??
        (await handleInvitationRequest(request, env)) ??
        json(request, env, { error: "not_found" }, 404)
      );
    }
    if (url.pathname.startsWith("/share/")) {
      return (
        (await handleShareLinkRequest(request, env)) ??
        json(request, env, { error: "not_found" }, 404)
      );
    }
    if (
      url.pathname.startsWith("/connect/") &&
      request.headers.get("Upgrade")?.toLowerCase() === "websocket"
    ) {
      return handleConnect(request, env);
    }
    return json(request, env, { error: "not_found" }, 404);
  },
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    try {
      validateWorkerEnvironment(env);
    } catch (error) {
      console.error(
        "Scheduled keep-alive skipped: Worker environment is invalid.",
        error,
      );
      return;
    }

    executeScheduledKeepAlive(env, (promise) => ctx.waitUntil(promise));
  },
} satisfies ExportedHandler<Env>;
