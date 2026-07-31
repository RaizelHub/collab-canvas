import type { AuthenticatedUser } from "../types/auth";
import {
  assetMetadataSchema,
  hasSupportedImageSignature,
} from "../validation/request";
import { signAssetRead, verifyAssetRead } from "./signatures";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

interface AssetRoute {
  assetId: string;
  boardId: string;
}

function storageKey(route: AssetRoute): string {
  return `boards/${route.boardId}/assets/${route.assetId}`;
}

async function recordAsset(
  route: AssetRoute,
  user: AuthenticatedUser,
  file: File,
  env: Env,
): Promise<boolean> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/asset_records`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: route.assetId,
      board_id: route.boardId,
      uploaded_by: user.id,
      storage_key: storageKey(route),
      original_filename: file.name.slice(0, 255) || "upload",
      mime_type: file.type,
      byte_size: file.size,
    }),
  });
  if (!response.ok) {
    console.error("Asset metadata insert failed.", {
      assetId: route.assetId,
      boardId: route.boardId,
      status: response.status,
    });
  }
  return response.ok;
}

export async function uploadAsset(
  route: AssetRoute,
  user: AuthenticatedUser,
  request: Request,
  env: Env,
): Promise<{ error?: string; src?: string; status: number }> {
  const contentLength = Number(request.headers.get("Content-Length"));
  const contentType = request.headers.get("Content-Type") ?? "";
  const metadata = assetMetadataSchema.safeParse({
    ...route,
    contentLength,
    contentType,
  });
  if (!metadata.success) {
    return { error: "invalid_asset_metadata", status: 400 };
  }

  const body = await request.arrayBuffer();
  if (body.byteLength !== metadata.data.contentLength) {
    return { error: "content_length_mismatch", status: 400 };
  }
  if (
    !hasSupportedImageSignature(
      metadata.data.contentType,
      new Uint8Array(body).slice(0, 16),
    )
  ) {
    return { error: "unsupported_asset_content", status: 415 };
  }

  const filename =
    request.headers.get("X-Asset-Filename")?.slice(0, 255) ?? "upload";
  const file = new File([body], filename, {
    type: metadata.data.contentType,
  });
  const key = storageKey(route);
  await env.BOARD_ASSETS.put(key, body, {
    httpMetadata: { contentType: metadata.data.contentType },
    customMetadata: { uploadedBy: user.id },
  });
  if (!(await recordAsset(route, user, file, env))) {
    await env.BOARD_ASSETS.delete(key);
    return { error: "asset_metadata_failed", status: 502 };
  }

  return {
    src: `/assets/${route.boardId}/${route.assetId}`,
    status: 201,
  };
}

export async function createSignedAssetUrl(
  route: AssetRoute,
  request: Request,
  env: Env,
): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  const signature = await signAssetRead(
    route.boardId,
    route.assetId,
    expires,
    env.ASSET_SIGNING_SECRET,
  );
  const url = new URL(`/assets/${route.boardId}/${route.assetId}`, request.url);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("signature", signature);
  return url.toString();
}

export async function readAsset(
  route: AssetRoute,
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  const valid = await verifyAssetRead(
    route.boardId,
    route.assetId,
    expires,
    signature,
    env.ASSET_SIGNING_SECRET,
  );
  if (!valid) {
    return new Response("Asset link expired.", { status: 403 });
  }
  const object = await env.BOARD_ASSETS.get(storageKey(route));
  if (!object) {
    return new Response("Asset not found.", { status: 404 });
  }
  const headers = new Headers({
    "Cache-Control": "private, max-age=900",
    "Content-Security-Policy": "default-src 'none'",
    "X-Content-Type-Options": "nosniff",
  });
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function deleteAsset(
  route: AssetRoute,
  env: Env,
): Promise<boolean> {
  await env.BOARD_ASSETS.delete(storageKey(route));
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/asset_records?id=eq.${encodeURIComponent(route.assetId)}&board_id=eq.${encodeURIComponent(route.boardId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) {
    console.error("Asset metadata deletion failed.", {
      assetId: route.assetId,
      boardId: route.boardId,
      status: response.status,
    });
  }
  return response.ok;
}
