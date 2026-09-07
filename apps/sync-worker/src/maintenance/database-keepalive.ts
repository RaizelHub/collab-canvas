export interface SupabasePingResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}

export async function pingSupabaseDatabase(
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  },
  timeoutMs = 8000,
): Promise<SupabasePingResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/boards?select=id&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: controller.signal,
      },
    );

    const latencyMs = Date.now() - startedAt;
    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        latencyMs,
      };
    }

    return {
      ok: false,
      status: response.status,
      latencyMs,
      error: `Supabase returned HTTP ${response.status}`,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    return {
      ok: false,
      status: 503,
      latencyMs,
      error:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Request timed out"
            : error.message
          : "Database keepalive network error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function executeScheduledKeepAlive(
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  },
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<SupabasePingResult> {
  const runPing = async () => {
    const result = await pingSupabaseDatabase(env);
    if (result.ok) {
      console.info(
        `Scheduled keep-alive: Supabase ping successful (${result.latencyMs}ms). Database is active.`,
      );
    } else {
      console.warn(
        `Scheduled keep-alive: Supabase ping warning: ${result.error} (${result.latencyMs}ms).`,
      );
    }
    return result;
  };

  if (waitUntil) {
    waitUntil(runPing());
    return { ok: true, status: 200, latencyMs: 0 };
  }

  return runPing();
}
