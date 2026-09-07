import { describe, expect, it } from "vitest";

import { corsHeaders, isAllowedOrigin } from "../src/security/origin";

describe("origin and CORS handling", () => {
  const env = {
    ALLOWED_ORIGINS:
      "http://localhost:5173, https://collab-canvas-web-beta.vercel.app, https://*.preview.app",
  } as Env;

  it("accepts exact allowed origins", () => {
    const req1 = new Request("https://worker.dev", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(isAllowedOrigin(req1, env)).toBe(true);

    const req2 = new Request("https://worker.dev", {
      headers: { Origin: "https://collab-canvas-web-beta.vercel.app" },
    });
    expect(isAllowedOrigin(req2, env)).toBe(true);
  });

  it("normalizes trailing slashes on origin and allowed origins", () => {
    const req = new Request("https://worker.dev", {
      headers: { Origin: "https://collab-canvas-web-beta.vercel.app/" },
    });
    expect(isAllowedOrigin(req, env)).toBe(true);
  });

  it("supports wildcard subdomain patterns", () => {
    const req = new Request("https://worker.dev", {
      headers: { Origin: "https://branch-123.preview.app" },
    });
    expect(isAllowedOrigin(req, env)).toBe(true);
  });

  it("rejects unauthorized origins", () => {
    const req = new Request("https://worker.dev", {
      headers: { Origin: "https://malicious-site.com" },
    });
    expect(isAllowedOrigin(req, env)).toBe(false);
  });

  it("sets Access-Control-Allow-Origin header only for allowed origins", () => {
    const allowedReq = new Request("https://worker.dev", {
      headers: { Origin: "https://collab-canvas-web-beta.vercel.app" },
    });
    const headers = corsHeaders(allowedReq, env);
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://collab-canvas-web-beta.vercel.app",
    );

    const blockedReq = new Request("https://worker.dev", {
      headers: { Origin: "https://untrusted.com" },
    });
    const blockedHeaders = corsHeaders(blockedReq, env);
    expect(blockedHeaders.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
