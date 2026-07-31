import { z } from "zod";

import type { AuthenticatedUser } from "../types/auth";

const invitationRequestSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  role: z.enum(["editor", "viewer"]),
});

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hashToken(token: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
}

export async function createInvitation(
  boardId: string,
  user: AuthenticatedUser,
  request: Request,
  env: Env,
): Promise<{ body: unknown; status: number }> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { body: { error: "invalid_json" }, status: 400 };
  }
  const input = invitationRequestSchema.safeParse(rawBody);
  if (!input.success) {
    return {
      body: { error: "invalid_invitation", issues: input.error.issues },
      status: 400,
    };
  }

  const token = createToken();
  const expiresAt = new Date(
    Date.now() + input.data.expiresInDays * 86_400_000,
  ).toISOString();
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/board_invitations`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        board_id: boardId,
        email: input.data.email,
        role: input.data.role,
        token_hash: await hashToken(token),
        expires_at: expiresAt,
        invited_by: user.id,
      }),
    },
  );
  if (!response.ok) {
    console.error("Invitation insert failed.", {
      boardId,
      status: response.status,
      userId: user.id,
    });
    return { body: { error: "invitation_creation_failed" }, status: 502 };
  }

  const invitationRows = z
    .array(z.object({ id: z.uuid() }))
    .safeParse(await response.json());
  if (!invitationRows.success || !invitationRows.data[0]) {
    return { body: { error: "invalid_service_response" }, status: 502 };
  }
  return {
    body: {
      id: invitationRows.data[0].id,
      token,
      expiresAt,
      role: input.data.role,
      email: input.data.email,
    },
    status: 201,
  };
}
