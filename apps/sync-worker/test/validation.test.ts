import { describe, expect, it } from "vitest";

import { hasSupportedImageSignature } from "../src/validation/request";
import { signAssetRead, verifyAssetRead } from "../src/assets/signatures";

describe("asset signature validation", () => {
  it("accepts a valid PNG signature", () => {
    expect(
      hasSupportedImageSignature(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      ),
    ).toBe(true);
  });

  it("rejects content that does not match its declared type", () => {
    expect(
      hasSupportedImageSignature(
        "image/jpeg",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      ),
    ).toBe(false);
  });
});

describe("signed asset reads", () => {
  it("accepts an intact unexpired signature and rejects tampering", async () => {
    const expires = Math.floor(Date.now() / 1000) + 60;
    const signature = await signAssetRead(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      expires,
      "a-development-secret-that-is-at-least-32-characters",
    );
    await expect(
      verifyAssetRead(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        expires,
        signature,
        "a-development-secret-that-is-at-least-32-characters",
      ),
    ).resolves.toBe(true);
    await expect(
      verifyAssetRead(
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
        expires,
        signature,
        "a-development-secret-that-is-at-least-32-characters",
      ),
    ).resolves.toBe(false);
  });
});
