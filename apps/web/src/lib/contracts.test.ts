import {
  boardRoleSchema,
  boardVisibilitySchema,
  socketTicketResponseSchema,
} from "@collab-canvas/shared";
import { describe, expect, it } from "vitest";

describe("shared application contracts", () => {
  it("keeps supported roles and visibility values explicit", () => {
    expect(boardRoleSchema.safeParse("editor").success).toBe(true);
    expect(boardRoleSchema.safeParse("admin").success).toBe(false);
    expect(boardVisibilitySchema.safeParse("link_viewer").success).toBe(true);
    expect(boardVisibilitySchema.safeParse("public_readonly").success).toBe(
      false,
    );
  });

  it("validates short-lived socket ticket responses", () => {
    expect(
      socketTicketResponseSchema.safeParse({
        expiresAt: "2026-07-31T10:00:00.000Z",
        ticket: "a".repeat(43),
      }).success,
    ).toBe(true);
    expect(
      socketTicketResponseSchema.safeParse({
        expiresAt: "2026-07-31T10:00:00.000Z",
        ticket: "short",
      }).success,
    ).toBe(false);
  });
});
