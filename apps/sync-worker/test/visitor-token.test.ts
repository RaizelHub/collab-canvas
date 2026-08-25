import { describe, expect, it } from "vitest";

import {
  createGuestClaims,
  issueVisitorToken,
  verifyVisitorToken,
} from "../src/portfolio/visitor-token";

const secret = "a-development-secret-that-is-at-least-32-characters";

describe("portfolio visitor sessions", () => {
  it("round-trips a privacy-safe generated identity", async () => {
    const claims = createGuestClaims();
    const token = await issueVisitorToken(claims, secret);
    const verified = await verifyVisitorToken(token, secret);

    expect(verified).toEqual(claims);
    expect(verified?.id).toMatch(/^visitor_/);
    expect(verified?.name).toMatch(/^[A-Za-z]+\d{2}$/);
    expect(verified?.avatarUrl).toBeNull();
  });

  it("rejects tampered and expired sessions", async () => {
    const valid = await issueVisitorToken(createGuestClaims(), secret);
    await expect(verifyVisitorToken(`${valid}x`, secret)).resolves.toBeNull();

    const expired = await issueVisitorToken(
      { ...createGuestClaims(), expiresAt: Date.now() - 1 },
      secret,
    );
    await expect(verifyVisitorToken(expired, secret)).resolves.toBeNull();
  });
});
