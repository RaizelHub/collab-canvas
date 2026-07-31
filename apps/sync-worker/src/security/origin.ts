export function getAllowedOrigins(env: Env): Set<string> {
  return new Set(
    env.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && getAllowedOrigins(env).has(origin);
}

export function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  const origin = request.headers.get("Origin");
  if (origin && getAllowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Asset-Filename, X-Share-Token",
    );
    headers.set(
      "Access-Control-Allow-Methods",
      "DELETE, GET, PUT, POST, OPTIONS",
    );
  }
  return headers;
}
