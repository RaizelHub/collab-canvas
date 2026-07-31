import { z } from "zod";

import type { AuthenticatedUser } from "../types/auth";
import { hasSupportedImageSignature } from "../validation/request";

const avatarTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function avatarKey(userId: string, assetId: string): string {
  return `profiles/${userId}/avatars/${assetId}`;
}

async function updateProfileAvatar(
  env: Env,
  userId: string,
  avatarUrl: string | null,
): Promise<boolean> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    },
  );
  return response.ok;
}

export async function uploadAvatar(
  request: Request,
  user: AuthenticatedUser,
  env: Env,
): Promise<{ body: unknown; status: number }> {
  const length = Number(request.headers.get("Content-Length"));
  const type = avatarTypeSchema.safeParse(
    request.headers.get("Content-Type") ?? "",
  );
  if (
    !type.success ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > 5_242_880
  ) {
    return { body: { error: "invalid_avatar" }, status: 400 };
  }
  const body = await request.arrayBuffer();
  if (
    body.byteLength !== length ||
    !hasSupportedImageSignature(type.data, new Uint8Array(body).slice(0, 16))
  ) {
    return { body: { error: "invalid_avatar_content" }, status: 415 };
  }
  const assetId = crypto.randomUUID();
  const key = avatarKey(user.id, assetId);
  await env.BOARD_ASSETS.put(key, body, {
    httpMetadata: { contentType: type.data },
  });
  const url = new URL(`/avatars/${user.id}/${assetId}`, request.url).toString();
  if (!(await updateProfileAvatar(env, user.id, url))) {
    await env.BOARD_ASSETS.delete(key);
    return { body: { error: "avatar_profile_update_failed" }, status: 502 };
  }
  return { body: { url }, status: 201 };
}

export async function removeAvatar(
  user: AuthenticatedUser,
  env: Env,
): Promise<boolean> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=avatar_url&limit=1`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  const rows = z
    .array(z.object({ avatar_url: z.string().nullable() }))
    .safeParse(await response.json());
  const current = rows.success ? rows.data[0]?.avatar_url : null;
  if (current) {
    const match = /^\/avatars\/([^/]+)\/([^/]+)$/.exec(
      new URL(current).pathname,
    );
    if (match?.[1] === user.id && match[2]) {
      await env.BOARD_ASSETS.delete(avatarKey(user.id, match[2]));
    }
  }
  return updateProfileAvatar(env, user.id, null);
}

export async function readAvatar(
  userId: string,
  assetId: string,
  env: Env,
): Promise<Response> {
  const object = await env.BOARD_ASSETS.get(avatarKey(userId, assetId));
  if (!object) return new Response("Avatar not found.", { status: 404 });
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Security-Policy": "default-src 'none'",
    "X-Content-Type-Options": "nosniff",
  });
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
