import { boardRoleSchema } from "@collab-canvas/shared";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

const ticketClaimsSchema = z.object({
  boardId: z.uuid(),
  expiresAt: z.number().int().positive(),
  role: boardRoleSchema,
  user: z.object({
    avatarUrl: z.string().nullable(),
    displayName: z.string().min(1).max(120),
    email: z.email(),
    id: z.uuid(),
  }),
});

export type SocketTicketClaims = z.infer<typeof ticketClaimsSchema>;

const TICKET_KEY = "claims";

export class SocketTicketBroker extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/issue" && request.method === "POST") {
      const claims = ticketClaimsSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!claims.success || claims.data.expiresAt <= Date.now()) {
        return new Response("Invalid ticket claims.", { status: 400 });
      }
      await this.ctx.storage.put(TICKET_KEY, claims.data);
      await this.ctx.storage.setAlarm(claims.data.expiresAt);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/consume" && request.method === "DELETE") {
      const claims = await this.ctx.storage.transaction(async (storage) => {
        const stored = await storage.get<SocketTicketClaims>(TICKET_KEY);
        if (stored) await storage.delete(TICKET_KEY);
        return stored;
      });
      const parsed = ticketClaimsSchema.safeParse(claims);
      if (!parsed.success || parsed.data.expiresAt <= Date.now()) {
        return new Response("Ticket expired or already used.", { status: 410 });
      }
      return Response.json(parsed.data, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new Response("Not found.", { status: 404 });
  }

  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

function randomTicket(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function issueSocketTicket(
  env: Env,
  claims: SocketTicketClaims,
): Promise<string> {
  const ticket = randomTicket();
  const broker = env.SOCKET_TICKETS.get(env.SOCKET_TICKETS.idFromName(ticket));
  const response = await broker.fetch("https://ticket.internal/issue", {
    method: "POST",
    body: JSON.stringify(claims),
  });
  if (!response.ok) throw new Error("Socket ticket issue failed.");
  return ticket;
}

export async function consumeSocketTicket(
  env: Env,
  ticket: string,
): Promise<SocketTicketClaims | null> {
  if (ticket.length < 32 || ticket.length > 128) return null;
  const broker = env.SOCKET_TICKETS.get(env.SOCKET_TICKETS.idFromName(ticket));
  const response = await broker.fetch("https://ticket.internal/consume", {
    method: "DELETE",
  });
  if (!response.ok) return null;
  const parsed = ticketClaimsSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}
