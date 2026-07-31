import { DurableObject } from "cloudflare:workers";

interface RateWindow {
  count: number;
  resetAt: number;
}

export class RateLimiter extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit"));
    const windowSeconds = Number(url.searchParams.get("window"));
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(windowSeconds) ||
      limit < 1 ||
      windowSeconds < 1
    ) {
      return new Response("Invalid limit.", { status: 400 });
    }

    const now = Date.now();
    const result = await this.ctx.storage.transaction(async (storage) => {
      const current = await storage.get<RateWindow>("window");
      const window =
        !current || current.resetAt <= now
          ? { count: 0, resetAt: now + windowSeconds * 1000 }
          : current;
      if (window.count >= limit) {
        return { allowed: false, window };
      }
      const updated = { ...window, count: window.count + 1 };
      await storage.put("window", updated);
      return { allowed: true, window: updated };
    });

    return Response.json(
      {
        allowed: result.allowed,
        remaining: Math.max(0, limit - result.window.count),
        resetAt: result.window.resetAt,
      },
      {
        status: result.allowed ? 200 : 429,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function consumeRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const id = env.RATE_LIMITER.idFromName(key);
  const response = await env.RATE_LIMITER.get(id).fetch(
    `https://rate-limit.internal/?limit=${limit}&window=${windowSeconds}`,
  );
  return response.ok;
}
