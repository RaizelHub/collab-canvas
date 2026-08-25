import {
  collabObjectSchema,
  collabPointSchema,
  presencePlayerSchema,
  type CollabObject,
  type PresencePlayer,
} from "@collab-canvas/shared";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

import { verifyVisitorToken } from "../portfolio/visitor-token";

interface SpaceAttachment {
  sessionId: string;
  visitorId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  isAdmin: boolean;
  player: PresencePlayer | null;
}

const moveSchema = z.object({
  type: z.literal("player.move"),
  x: z.number().finite(),
  y: z.number().finite(),
  direction: z.enum(["up", "down", "left", "right"]),
  moving: z.boolean(),
  sequence: z.number().int().nonnegative(),
});

const createSchema = z.object({
  type: z.literal("object.create"),
  tempId: z.string().min(1).max(80),
  object: z.object({
    type: z.enum(["text", "note", "stroke"]),
    content: z.string().max(160).default(""),
    x: z.number().finite().min(0).max(2000),
    y: z.number().finite().min(0).max(1200),
    width: z.number().finite().min(24).max(360),
    height: z.number().finite().min(24).max(240),
    points: z.array(collabPointSchema).max(160).default([]),
    color: z.enum(["clay", "moss", "sand", "slate"]),
  }),
});

const updateSchema = z.object({
  type: z.literal("object.update"),
  id: z.string().min(1).max(80),
  patch: z.object({
    content: z.string().max(160).optional(),
    x: z.number().finite().min(0).max(2000).optional(),
    y: z.number().finite().min(0).max(1200).optional(),
    width: z.number().finite().min(24).max(360).optional(),
    height: z.number().finite().min(24).max(240).optional(),
  }),
});

const objectActionSchema = z.object({
  type: z.enum(["object.delete", "object.hide"]),
  id: z.string().min(1).max(80),
});

const clientMessageSchema = z.discriminatedUnion("type", [
  moveSchema,
  createSchema,
  updateSchema,
  objectActionSchema,
]);

const blockedWords = /\b(?:fuck|shit|bitch|cunt|nigger|faggot)\b/i;
const urlPattern = /(?:https?:\/\/|www\.|\.[a-z]{2,}\b)/i;

function safeText(value: string): boolean {
  return !blockedWords.test(value) && !urlPattern.test(value);
}

export class CollabSpace extends DurableObject<Env> {
  private objects: Map<string, CollabObject> | null = null;
  private readonly players = new Map<string, PresencePlayer>();
  private readonly lastMoveAt = new Map<string, number>();
  private readonly lastCreateAt = new Map<string, number>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    for (const socket of this.ctx.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SpaceAttachment | null;
      if (attachment?.player)
        this.players.set(attachment.sessionId, attachment.player);
    }
  }

  private async getObjects(): Promise<Map<string, CollabObject>> {
    if (this.objects) return this.objects;
    const saved = await this.ctx.storage.list<CollabObject>({
      prefix: "portfolio:object:",
    });
    this.objects = new Map(
      [...saved.values()].flatMap((value) => {
        const parsed = collabObjectSchema.safeParse(value);
        return parsed.success ? [[parsed.data.id, parsed.data] as const] : [];
      }),
    );
    return this.objects;
  }

  private async persist(object: CollabObject): Promise<void> {
    await this.ctx.storage.put(`portfolio:object:${object.id}`, object);
  }

  private broadcast(message: unknown, except?: WebSocket): void {
    const payload = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== except) socket.send(payload);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/state" && request.method === "GET") {
      const objects = [...(await this.getObjects()).values()].filter(
        (object) => !object.hidden,
      );
      return Response.json(
        {
          objects,
          activeVisitors: this.ctx.getWebSockets().length,
          totalContributors: new Set(objects.map((object) => object.visitorId))
            .size,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }
    if (this.ctx.getWebSockets().length >= 40) {
      return new Response("Space is at capacity.", { status: 429 });
    }
    const claims = await verifyVisitorToken(
      url.searchParams.get("token") ?? "",
      this.env.ASSET_SIGNING_SECRET,
    );
    if (!claims || claims.expiresAt > Date.now() + 65_000)
      return new Response("Invalid visitor session.", { status: 401 });

    const attachment: SpaceAttachment = {
      sessionId: crypto.randomUUID(),
      visitorId: claims.id,
      name: claims.name,
      avatarUrl: claims.avatarUrl,
      color: claims.color,
      isAdmin: claims.isAdmin,
      player: null,
    };
    for (const existing of this.ctx.getWebSockets()) {
      const previous =
        existing.deserializeAttachment() as SpaceAttachment | null;
      if (previous?.visitorId === claims.id)
        existing.close(4001, "Superseded by a newer session");
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    const player = presencePlayerSchema.parse({
      visitorId: claims.id,
      name: claims.name,
      avatarUrl: claims.avatarUrl,
      color: claims.color,
      x: 1000 + Math.round((Math.random() - 0.5) * 120),
      y: 1050 + Math.round((Math.random() - 0.5) * 40),
      direction: "up",
      moving: false,
      sequence: 0,
    });
    this.players.set(attachment.sessionId, player);
    server.serializeAttachment({ ...attachment, player });
    server.send(
      JSON.stringify({
        type: "space.init",
        objects: [...(await this.getObjects()).values()].filter(
          (object) => !object.hidden || claims.isAdmin,
        ),
        players: [...this.players.values()],
      }),
    );
    this.broadcast({ type: "player.join", player }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(
    socket: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof raw !== "string" || raw.length > 18_000) return;
    const attachment = socket.deserializeAttachment() as SpaceAttachment | null;
    if (!attachment) return;
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = clientMessageSchema.safeParse(decoded);
    if (!parsed.success) return;
    const message = parsed.data;

    if (message.type === "player.move") {
      const now = Date.now();
      const lastAt = this.lastMoveAt.get(attachment.sessionId) ?? 0;
      if (now - lastAt < 45) return;
      const current = this.players.get(attachment.sessionId);
      if (!current || message.sequence <= current.sequence) return;
      const elapsed = Math.max((now - lastAt) / 1000, 0.08);
      const maxDistance = 380 * elapsed + 80;
      const dx = message.x - current.x;
      const dy = message.y - current.y;
      const distance = Math.hypot(dx, dy);
      const ratio = distance > maxDistance ? maxDistance / distance : 1;
      const player = presencePlayerSchema.parse({
        ...current,
        x: Math.min(1940, Math.max(60, current.x + dx * ratio)),
        y: Math.min(1140, Math.max(60, current.y + dy * ratio)),
        direction: message.direction,
        moving: message.moving,
        sequence: message.sequence,
      });
      this.players.set(attachment.sessionId, player);
      socket.serializeAttachment({ ...attachment, player });
      this.lastMoveAt.set(attachment.sessionId, now);
      this.broadcast({ type: "player.update", player }, socket);
      return;
    }

    const objects = await this.getObjects();
    if (message.type === "object.create") {
      const now = Date.now();
      if (now - (this.lastCreateAt.get(attachment.visitorId) ?? 0) < 2500) {
        socket.send(
          JSON.stringify({
            type: "operation.rejected",
            tempId: message.tempId,
            reason: "Please wait a moment before adding another mark.",
          }),
        );
        return;
      }
      const ownObjects = [...objects.values()].filter(
        (object) => object.visitorId === attachment.visitorId && !object.hidden,
      );
      if (ownObjects.length >= 24) {
        socket.send(
          JSON.stringify({
            type: "operation.rejected",
            tempId: message.tempId,
            reason: "You have reached the public contribution limit.",
          }),
        );
        return;
      }
      if (
        !safeText(message.object.content) ||
        (message.object.type === "stroke" && message.object.points.length < 2)
      ) {
        socket.send(
          JSON.stringify({
            type: "operation.rejected",
            tempId: message.tempId,
            reason: "That contribution cannot be published.",
          }),
        );
        return;
      }
      const timestamp = new Date().toISOString();
      const object = collabObjectSchema.parse({
        ...message.object,
        id: crypto.randomUUID(),
        visitorId: attachment.visitorId,
        visitorName: attachment.name,
        avatarUrl: attachment.avatarUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
        hidden: false,
      });
      objects.set(object.id, object);
      this.lastCreateAt.set(attachment.visitorId, now);
      await this.persist(object);
      this.broadcast({
        type: "object.created",
        object,
        tempId: message.tempId,
      });
      return;
    }

    const existing = objects.get(message.id);
    if (!existing) return;
    const owns = existing.visitorId === attachment.visitorId;
    if (message.type === "object.update") {
      if (
        !owns ||
        (message.patch.content !== undefined &&
          !safeText(message.patch.content))
      )
        return;
      const object = collabObjectSchema.parse({
        ...existing,
        ...message.patch,
        updatedAt: new Date().toISOString(),
      });
      objects.set(object.id, object);
      await this.persist(object);
      this.broadcast({ type: "object.updated", object });
      return;
    }
    if (message.type === "object.delete") {
      if (!owns && !attachment.isAdmin) return;
      objects.delete(existing.id);
      await this.ctx.storage.delete(`portfolio:object:${existing.id}`);
      this.broadcast({ type: "object.deleted", id: existing.id });
      return;
    }
    if (message.type === "object.hide" && attachment.isAdmin) {
      const object = collabObjectSchema.parse({
        ...existing,
        hidden: !existing.hidden,
        updatedAt: new Date().toISOString(),
      });
      objects.set(object.id, object);
      await this.persist(object);
      this.broadcast({ type: "object.updated", object });
    }
  }

  override webSocketClose(socket: WebSocket): void {
    this.leave(socket);
  }

  override webSocketError(socket: WebSocket): void {
    this.leave(socket);
  }

  private leave(socket: WebSocket): void {
    const attachment = socket.deserializeAttachment() as SpaceAttachment | null;
    if (!attachment) return;
    this.players.delete(attachment.sessionId);
    this.lastMoveAt.delete(attachment.sessionId);
    this.broadcast(
      { type: "player.leave", visitorId: attachment.visitorId },
      socket,
    );
  }
}
