import { describe, expect, it } from "vitest";

import { parseClientEnvironment } from "./env";

describe("parseClientEnvironment", () => {
  it("reports missing configuration without breaking the local canvas", () => {
    expect(parseClientEnvironment({})).toEqual({
      status: "missing",
      missing: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    });
  });

  it("reports a partial Supabase configuration", () => {
    expect(
      parseClientEnvironment({
        VITE_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toEqual({
      status: "missing",
      missing: ["VITE_SUPABASE_ANON_KEY"],
    });
  });

  it("reports invalid configured values", () => {
    const result = parseClientEnvironment({
      VITE_SUPABASE_URL: "not-a-url",
      VITE_SUPABASE_ANON_KEY: "too-short",
    });

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues).toHaveLength(2);
    }
  });

  it("accepts a complete Supabase configuration", () => {
    expect(
      parseClientEnvironment({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "a-valid-anonymous-key-value",
      }),
    ).toEqual({
      status: "configured",
      values: {
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "a-valid-anonymous-key-value",
      },
    });
  });
});
