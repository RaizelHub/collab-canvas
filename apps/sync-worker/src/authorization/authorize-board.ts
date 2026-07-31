import { boardRoleSchema, boardVisibilitySchema } from "@collab-canvas/shared";
import { z } from "zod";

import type {
  AuthenticatedUser,
  BoardAuthorization,
  BoardRole,
} from "../types/auth";

const boardSchema = z.object({
  share_token_hash: z.string().nullable(),
  visibility: boardVisibilitySchema,
});

async function supabaseServiceRequest(
  env: Env,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function authorizeBoard(
  boardId: string,
  user: AuthenticatedUser,
  env: Env,
  shareToken?: string | null,
): Promise<BoardAuthorization | null> {
  const roleResponse = await supabaseServiceRequest(env, "rpc/board_role_for", {
    method: "POST",
    body: JSON.stringify({
      target_board_id: boardId,
      target_user_id: user.id,
    }),
  });

  if (!roleResponse.ok) {
    console.error("Board role lookup failed.", {
      boardId,
      status: roleResponse.status,
    });
    return null;
  }

  const roleResult: unknown = await roleResponse.json();
  const role = boardRoleSchema.safeParse(roleResult);
  if (role.success) {
    return { role: role.data, user };
  }

  const boardResponse = await supabaseServiceRequest(
    env,
    `boards?id=eq.${encodeURIComponent(boardId)}&select=visibility,share_token_hash&limit=1`,
  );
  if (!boardResponse.ok) return null;
  const boards = z.array(boardSchema).safeParse(await boardResponse.json());
  const board = boards.success ? boards.data[0] : null;
  if (!board) {
    return null;
  }
  if (board.visibility === "public_viewer") {
    return { role: "viewer" satisfies BoardRole, user };
  }
  if (
    !shareToken ||
    shareToken.length < 32 ||
    !board.share_token_hash ||
    !["link_viewer", "link_editor"].includes(board.visibility)
  ) {
    return null;
  }
  const hash = [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(shareToken),
      ),
    ),
  ]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== board.share_token_hash) return null;

  return {
    role:
      board.visibility === "link_editor"
        ? ("editor" satisfies BoardRole)
        : ("viewer" satisfies BoardRole),
    user,
  };
}
