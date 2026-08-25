import { z } from "zod";

const claimsSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  avatarUrl: z.string().max(2048).nullable(),
  color: z.string().max(24),
  isAdmin: z.boolean(),
  expiresAt: z.number().int().positive(),
});

export type VisitorClaims = z.infer<typeof claimsSchema>;

const palette = ["#b86b4b", "#54786b", "#77704d", "#6f6a8f", "#8a5f67"];
const adjectives = [
  "Quiet",
  "Small",
  "Warm",
  "Kind",
  "Clear",
  "Brisk",
  "Soft",
  "Calm",
];
const animals = [
  "Fox",
  "Otter",
  "Finch",
  "Moth",
  "Lynx",
  "Wren",
  "Hare",
  "Panda",
];

function encode(value: Uint8Array | string): string {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decode(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function issueVisitorToken(
  claims: VisitorClaims,
  secret: string,
): Promise<string> {
  const body = encode(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(body),
  );
  return `${body}.${encode(new Uint8Array(signature))}`;
}

export async function verifyVisitorToken(
  token: string,
  secret: string,
): Promise<VisitorClaims | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(secret),
    decode(signature),
    new TextEncoder().encode(body),
  );
  if (!valid) return null;
  try {
    const parsed = claimsSchema.safeParse(
      JSON.parse(new TextDecoder().decode(decode(body))),
    );
    return parsed.success && parsed.data.expiresAt > Date.now()
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}

export function createGuestClaims(): VisitorClaims {
  const id = crypto.randomUUID();
  const hash = [...id].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
  return {
    id: `visitor_${id}`,
    name: `${adjectives[hash % adjectives.length]}${animals[Math.floor(hash / 7) % animals.length]}${10 + (hash % 90)}`,
    avatarUrl: null,
    color: palette[hash % palette.length] ?? "#54786b",
    isAdmin: false,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365,
  };
}

export function claimsForUser(
  user: { id: string; displayName: string; avatarUrl: string | null },
  adminUserId?: string,
): VisitorClaims {
  const hash = [...user.id].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
  return {
    id: user.id,
    name: user.displayName,
    avatarUrl: user.avatarUrl,
    color: palette[hash % palette.length] ?? "#54786b",
    isAdmin: user.id === adminUserId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
}
