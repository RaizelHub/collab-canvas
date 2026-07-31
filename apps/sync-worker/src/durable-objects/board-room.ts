import {
  DurableObjectSqliteSyncWrapper,
  type RoomSnapshot,
  type SessionStateSnapshot,
  SQLiteSyncStorage,
  TLSocketRoom,
} from "@tldraw/sync-core";
import {
  createTLSchema,
  defaultShapeSchemas,
  type TLRecord,
} from "@tldraw/tlschema";
import { DurableObject } from "cloudflare:workers";

import type { BoardRole } from "../types/auth";
import { sessionIdSchema } from "../validation/request";

const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas },
});

interface SessionMeta {
  avatarUrl: string | null;
  displayName: string;
  role: BoardRole;
  userId: string;
}

interface SocketAttachment extends SessionMeta {
  sessionId: string;
  snapshot: SessionStateSnapshot | null;
}

export class BoardRoom extends DurableObject<Env> {
  private room: TLSocketRoom<TLRecord, SessionMeta> | null = null;
  private readonly sessionSockets = new Map<string, WebSocket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
    );
  }

  private getOrCreateRoom(): TLSocketRoom<TLRecord, SessionMeta> {
    if (this.room) return this.room;

    const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage);
    const storage = new SQLiteSyncStorage<TLRecord>({
      sql,
      onChange: () => {
        void this.ctx.storage.setAlarm(Date.now() + 30_000);
      },
    });
    this.room = new TLSocketRoom<TLRecord, SessionMeta>({
      schema,
      storage,
      clientTimeout: Infinity,
      onSessionSnapshot: (sessionId, snapshot) => {
        const socket = this.sessionSockets.get(sessionId);
        const attachment = socket?.deserializeAttachment() as
          | SocketAttachment
          | undefined;
        if (socket && attachment) {
          socket.serializeAttachment({ ...attachment, snapshot });
        }
      },
    });

    for (const socket of this.ctx.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null;
      if (!attachment?.sessionId || !attachment.snapshot) continue;
      this.sessionSockets.set(attachment.sessionId, socket);
      this.room.handleSocketResume({
        sessionId: attachment.sessionId,
        socket,
        snapshot: attachment.snapshot,
        meta: attachment,
      });
    }

    return this.room;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const boardId = request.headers.get("X-Collab-Board");
    if (boardId) {
      await this.ctx.storage.put("collab:board-id", boardId);
    }
    if (url.pathname === "/snapshot") {
      if (request.method === "GET") {
        return Response.json(this.getOrCreateRoom().getCurrentSnapshot(), {
          headers: { "Cache-Control": "no-store" },
        });
      }
      if (request.method === "PUT") {
        try {
          const snapshot = (await request.json()) as RoomSnapshot;
          this.getOrCreateRoom().loadSnapshot(snapshot);
          return new Response(null, { status: 204 });
        } catch (error) {
          console.error("Board snapshot restore failed.", error);
          return new Response("Invalid snapshot.", { status: 400 });
        }
      }
    }
    if (url.pathname === "/room" && request.method === "DELETE") {
      for (const socket of this.ctx.getWebSockets()) {
        socket.close(1012, "Board deleted");
      }
      this.sessionSockets.clear();
      this.room = null;
      await this.ctx.storage.deleteAll();
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }
    if (this.ctx.getWebSockets().length >= 50) {
      return new Response("Board connection limit reached.", { status: 429 });
    }

    const sessionId = sessionIdSchema.safeParse(
      url.searchParams.get("sessionId"),
    );
    const role = request.headers.get("X-Collab-Role") as BoardRole | null;
    const userId = request.headers.get("X-Collab-User");
    const displayName = request.headers.get("X-Collab-Name");
    if (
      !sessionId.success ||
      !role ||
      !["owner", "editor", "viewer"].includes(role) ||
      !userId ||
      !displayName
    ) {
      return new Response("Invalid connection metadata.", { status: 400 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    const attachment: SocketAttachment = {
      sessionId: sessionId.data,
      snapshot: null,
      role,
      userId,
      displayName,
      avatarUrl: request.headers.get("X-Collab-Avatar"),
    };
    server.serializeAttachment(attachment);
    this.sessionSockets.set(sessionId.data, server);
    this.getOrCreateRoom().handleSocketConnect({
      sessionId: sessionId.data,
      socket: server,
      isReadonly: role === "viewer",
      meta: attachment,
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  override async alarm(): Promise<void> {
    const boardId = await this.ctx.storage.get<string>("collab:board-id");
    if (!boardId) return;
    const response = await fetch(
      `${this.env.SUPABASE_URL}/rest/v1/boards?id=eq.${encodeURIComponent(boardId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_activity_at: new Date().toISOString(),
        }),
      },
    );
    if (!response.ok) {
      console.error("Board activity timestamp update failed.", {
        boardId,
        status: response.status,
      });
    }
  }

  override webSocketMessage(
    socket: WebSocket,
    message: string | ArrayBuffer,
  ): void {
    const attachment =
      socket.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) return;
    this.sessionSockets.set(attachment.sessionId, socket);
    this.getOrCreateRoom().handleSocketMessage(attachment.sessionId, message);
  }

  override webSocketClose(socket: WebSocket): void {
    this.endSession(socket, "handleSocketClose");
  }

  override webSocketError(socket: WebSocket): void {
    this.endSession(socket, "handleSocketError");
  }

  private endSession(
    socket: WebSocket,
    method: "handleSocketClose" | "handleSocketError",
  ): void {
    const attachment =
      socket.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) return;
    this.sessionSockets.delete(attachment.sessionId);
    const room = this.getOrCreateRoom();
    if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
      room.handleSocketResume({
        sessionId: attachment.sessionId,
        socket,
        snapshot: attachment.snapshot,
        meta: attachment,
      });
    }
    room[method](attachment.sessionId);
  }
}
