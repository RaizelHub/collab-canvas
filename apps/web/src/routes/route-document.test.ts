import { describe, expect, it } from "vitest";

import { getRouteTitle } from "./route-title";

describe("getRouteTitle", () => {
  it.each([
    ["/", "Boards — CollabCanvas"],
    ["/login", "Sign in — CollabCanvas"],
    ["/dashboard", "Boards — CollabCanvas"],
    ["/profile", "Profile — CollabCanvas"],
    ["/board/123", "Board — CollabCanvas"],
    ["/invite/token", "Board invitation — CollabCanvas"],
    ["/missing", "Page not found — CollabCanvas"],
  ])("describes %s", (path, expected) => {
    expect(getRouteTitle(path)).toBe(expected);
  });
});
