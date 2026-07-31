import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyAccessToken } from "../src/authentication/verify-access-token";
import { authorizeBoard } from "../src/authorization/authorize-board";
import type { AuthenticatedUser } from "../src/types/auth";

const env = {
  SUPABASE_ANON_KEY: "anon-key-value-that-is-long-enough",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value-that-is-long-enough",
  SUPABASE_URL: "https://example.supabase.co",
} as Env;

const user: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "member@example.com",
  displayName: "Member",
  avatarUrl: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("access token verification", () => {
  it("derives identity from Supabase instead of browser claims", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: user.id,
        email: user.email,
        user_metadata: { display_name: user.displayName },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyAccessToken("valid-access-token-value", env),
    ).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer valid-access-token-value",
        }),
      }),
    );
  });

  it("rejects malformed and rejected tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyAccessToken("short", env)).resolves.toBeNull();
    await expect(
      verifyAccessToken("rejected-access-token-value", env),
    ).resolves.toBeNull();
  });
});

describe("board authorization", () => {
  it("uses the server-derived membership role", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json("editor"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      authorizeBoard("22222222-2222-4222-8222-222222222222", user, env),
    ).resolves.toEqual({ role: "editor", user });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/board_role_for",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          target_board_id: "22222222-2222-4222-8222-222222222222",
          target_user_id: user.id,
        }),
      }),
    );
  });

  it("does not grant access when role and public visibility checks fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(null))
        .mockResolvedValueOnce(Response.json([{ visibility: "private" }])),
    );

    await expect(
      authorizeBoard("22222222-2222-4222-8222-222222222222", user, env),
    ).resolves.toBeNull();
  });
});
