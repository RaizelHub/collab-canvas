import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "./safe-redirect";

describe("getSafeRedirect", () => {
  it("accepts local application paths", () => {
    expect(getSafeRedirect("/board/123?mode=view")).toBe(
      "/board/123?mode=view",
    );
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(getSafeRedirect("https://attacker.example")).toBe("/dashboard");
    expect(getSafeRedirect("//attacker.example")).toBe("/dashboard");
  });
});
