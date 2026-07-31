import { z } from "zod";

import type { AuthenticatedUser } from "../types/auth";

const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  user_metadata: z
    .object({
      display_name: z.string().optional(),
      avatar_url: z.url().optional(),
    })
    .passthrough(),
});

export async function verifyAccessToken(
  token: string,
  env: Env,
): Promise<AuthenticatedUser | null> {
  if (token.length < 20 || token.length > 8192) return null;

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;

  const parsed = authUserSchema.safeParse(await response.json());
  if (!parsed.success) return null;

  return {
    id: parsed.data.id,
    email: parsed.data.email,
    displayName:
      parsed.data.user_metadata.display_name ??
      parsed.data.email.split("@")[0] ??
      "User",
    avatarUrl: parsed.data.user_metadata.avatar_url ?? null,
  };
}
