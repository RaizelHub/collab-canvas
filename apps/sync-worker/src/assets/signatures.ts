const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret: string, value: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(value));
}

export async function signAssetRead(
  boardId: string,
  assetId: string,
  expires: number,
  secret: string,
): Promise<string> {
  return toHex(await hmac(secret, `${boardId}:${assetId}:${expires}`));
}

export async function verifyAssetRead(
  boardId: string,
  assetId: string,
  expires: number,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (expires <= Math.floor(Date.now() / 1000) || signature.length !== 64) {
    return false;
  }
  const expected = await signAssetRead(boardId, assetId, expires, secret);
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}
