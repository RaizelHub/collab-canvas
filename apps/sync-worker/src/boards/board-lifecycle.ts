import { z } from "zod";

import type { AuthenticatedUser } from "../types/auth";

const snapshotRowSchema = z.object({
  id: z.uuid(),
  storage_reference: z.string().min(1),
});

async function serviceRequest(
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

async function roomRequest(
  env: Env,
  boardId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const roomId = env.BOARD_ROOMS.idFromName(boardId);
  return env.BOARD_ROOMS.get(roomId).fetch(
    new Request(`https://room.internal${path}`, {
      ...init,
      headers: {
        "X-Collab-Board": boardId,
        ...init?.headers,
      },
    }),
  );
}

async function readRoomSnapshot(
  env: Env,
  boardId: string,
): Promise<ArrayBuffer> {
  const response = await roomRequest(env, boardId, "/snapshot");
  if (!response.ok) throw new Error("Room snapshot read failed.");
  return response.arrayBuffer();
}

export async function createBoardSnapshot(
  env: Env,
  boardId: string,
  user: AuthenticatedUser,
  reason: string,
) {
  const snapshotId = crypto.randomUUID();
  const reference = `boards/${boardId}/snapshots/${snapshotId}.json`;
  const snapshot = await readRoomSnapshot(env, boardId);
  await env.BOARD_ASSETS.put(reference, snapshot, {
    httpMetadata: { contentType: "application/json" },
  });
  const response = await serviceRequest(env, "board_snapshots", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: snapshotId,
      board_id: boardId,
      created_by: user.id,
      storage_reference: reference,
      reason: reason.slice(0, 120),
    }),
  });
  if (!response.ok) {
    await env.BOARD_ASSETS.delete(reference);
    throw new Error("Snapshot metadata insert failed.");
  }
  return { id: snapshotId };
}

export async function restoreBoardSnapshot(
  env: Env,
  boardId: string,
  snapshotId: string,
): Promise<boolean> {
  const response = await serviceRequest(
    env,
    `board_snapshots?id=eq.${encodeURIComponent(snapshotId)}&board_id=eq.${encodeURIComponent(boardId)}&select=id,storage_reference&limit=1`,
  );
  if (!response.ok) return false;
  const rows = z.array(snapshotRowSchema).safeParse(await response.json());
  const row = rows.success ? rows.data[0] : null;
  if (!row) return false;
  const object = await env.BOARD_ASSETS.get(row.storage_reference);
  if (!object) return false;
  const restore = await roomRequest(env, boardId, "/snapshot", {
    method: "PUT",
    body: object.body,
    headers: { "Content-Type": "application/json" },
  });
  return restore.ok;
}

export async function duplicateBoard(
  env: Env,
  boardId: string,
  user: AuthenticatedUser,
  title: string,
): Promise<string> {
  const create = await serviceRequest(env, "boards", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: user.id,
      title: `${title} copy`.slice(0, 120),
    }),
  });
  if (!create.ok) throw new Error("Duplicate board insert failed.");
  const rows = z.array(z.object({ id: z.uuid() })).parse(await create.json());
  const targetId = rows[0]?.id;
  if (!targetId) throw new Error("Duplicate board ID missing.");
  const snapshot = await readRoomSnapshot(env, boardId);
  const restore = await roomRequest(env, targetId, "/snapshot", {
    method: "PUT",
    body: snapshot,
    headers: { "Content-Type": "application/json" },
  });
  if (!restore.ok) {
    await serviceRequest(env, `boards?id=eq.${encodeURIComponent(targetId)}`, {
      method: "DELETE",
    });
    throw new Error("Duplicate board state restore failed.");
  }
  return targetId;
}

export async function deleteBoardState(
  env: Env,
  boardId: string,
): Promise<void> {
  const roomDeletion = await roomRequest(env, boardId, "/room", {
    method: "DELETE",
  });
  if (!roomDeletion.ok) throw new Error("Board room deletion failed.");
  let cursor: string | undefined;
  do {
    const listed = await env.BOARD_ASSETS.list({
      prefix: `boards/${boardId}/`,
      cursor,
    });
    if (listed.objects.length > 0) {
      await env.BOARD_ASSETS.delete(listed.objects.map((object) => object.key));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

export async function deleteBoardMetadata(
  env: Env,
  boardId: string,
): Promise<void> {
  const response = await serviceRequest(
    env,
    `boards?id=eq.${encodeURIComponent(boardId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error("Board metadata deletion failed.");
}
