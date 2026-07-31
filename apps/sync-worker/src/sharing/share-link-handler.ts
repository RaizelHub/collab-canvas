import { boardVisibilitySchema } from "@collab-canvas/shared";
import { z } from "zod";

function tokenFromBytes(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function hashShareToken(token: string): Promise<string> {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  ]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function regenerateShareLink(
  env: Env,
  boardId: string,
): Promise<string> {
  const token = tokenFromBytes();
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/boards?id=eq.${encodeURIComponent(boardId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ share_token_hash: await hashShareToken(token) }),
    },
  );
  if (!response.ok) throw new Error("Share link update failed.");
  return token;
}

export async function revokeShareLink(
  env: Env,
  boardId: string,
): Promise<boolean> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/boards?id=eq.${encodeURIComponent(boardId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        share_token_hash: null,
        visibility: "private",
      }),
    },
  );
  return response.ok;
}

const sharedBoardRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    title: z.string(),
    visibility: boardVisibilitySchema.refine(
      (visibility) =>
        visibility === "link_viewer" || visibility === "link_editor",
    ),
  }),
);

export async function resolveShareLink(env: Env, token: string) {
  if (token.length < 32 || token.length > 128) return null;
  const hash = await hashShareToken(token);
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/boards?share_token_hash=eq.${hash}&visibility=in.(link_viewer,link_editor)&select=id,title,visibility&limit=1`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!response.ok) return null;
  const rows = sharedBoardRowsSchema.safeParse(await response.json());
  const board = rows.success ? rows.data[0] : null;
  return board
    ? {
        id: board.id,
        title: board.title,
        role: board.visibility === "link_editor" ? "editor" : "viewer",
      }
    : null;
}
