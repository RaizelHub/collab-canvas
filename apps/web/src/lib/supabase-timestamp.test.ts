import { describe, expect, it } from "vitest";

import { supabaseTimestampSchema } from "./supabase-timestamp";

describe("supabaseTimestampSchema", () => {
  it("accepts and normalizes PostgreSQL timezone offsets", () => {
    expect(
      supabaseTimestampSchema.parse("2026-07-31T17:42:10.123456+00:00"),
    ).toBe("2026-07-31T17:42:10.123Z");
  });

  it("rejects timestamps without timezone information", () => {
    expect(
      supabaseTimestampSchema.safeParse("2026-07-31T17:42:10").success,
    ).toBe(false);
  });
});
