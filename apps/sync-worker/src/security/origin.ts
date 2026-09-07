export function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function isAllowedOrigin(request: Request, env: Env): boolean {
  const rawOrigin = request.headers.get("Origin");
  if (!rawOrigin) return false;
  const origin = rawOrigin.trim().replace(/\/+$/, "");

  const allowedOrigins = getAllowedOrigins(env);
  return allowedOrigins.some((allowed) => {
    if (allowed === "*" || allowed === origin) return true;
    if (allowed.includes("*")) {
      const regexPattern =
        "^" +
        allowed
          .split("*")
          .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*") +
        "$";
      return new RegExp(regexPattern).test(origin);
    }
    return false;
  });
}

export function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  const origin = request.headers.get("Origin");
  if (origin && isAllowedOrigin(request, env)) {
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
