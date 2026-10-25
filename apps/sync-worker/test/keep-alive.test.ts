import { afterEach, describe, expect, it, vi } from "vitest";

import {
  executeScheduledKeepAlive,
  pingSupabaseDatabase,
} from "../src/maintenance/database-keepalive";

const validEnv = {
  SUPABASE_ANON_KEY: "anon-key-value-that-is-long-enough",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value-that-is-long-enough",
  SUPABASE_URL: "https://example.supabase.co",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("database keep-alive ping", () => {
  it("successfully pings Supabase boards endpoint with service role credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "test-board" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await pingSupabaseDatabase(validEnv);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/boards?select=id&limit=1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          apikey: validEnv.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${validEnv.SUPABASE_SERVICE_ROLE_KEY}`,
        }),
      }),
    );
  });

  it("handles HTTP error status from Supabase gracefully", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Service Unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await pingSupabaseDatabase(validEnv);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toContain("HTTP 503");
  });

  it("handles network failure / connection exceptions gracefully", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error("Connection refused"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await pingSupabaseDatabase(validEnv);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toBe("Connection refused");
  });
});

describe("scheduled keep-alive execution", () => {
  it("reports failed database checks to the scheduler and caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
    );
    let completion: Promise<unknown> | undefined;
    const result = await executeScheduledKeepAlive(validEnv, (promise) => {
      completion = promise.catch((error: unknown) => error);
    });
    expect(result.ok).toBe(false);
    expect(await completion).toEqual(
      new Error("Scheduled database check failed (HTTP 503)."),
    );
  });

  it("executes database ping via waitUntil callback", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    let waitedPromise: Promise<unknown> | null = null;
    const waitUntil = vi
      .fn()
      .mockImplementation((promise: Promise<unknown>) => {
        waitedPromise = promise;
      });

    await executeScheduledKeepAlive(validEnv, waitUntil);
    expect(waitUntil).toHaveBeenCalled();
    if (waitedPromise) {
      await waitedPromise;
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/boards?select=id&limit=1",
      expect.any(Object),
    );
  });

  it("executes ping directly when no waitUntil callback is provided", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeScheduledKeepAlive(validEnv);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });
});
