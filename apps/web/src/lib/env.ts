import { z } from "zod";

export const clientEnvironmentSchema = z.object({
  VITE_APP_NAME: z.string().trim().min(1).optional(),
  VITE_APP_URL: z.url("VITE_APP_URL must be a valid URL.").optional(),
  VITE_SUPABASE_URL: z.url("VITE_SUPABASE_URL must be a valid URL."),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "VITE_SUPABASE_ANON_KEY appears to be incomplete."),
  VITE_SYNC_SERVER_URL: z
    .url("VITE_SYNC_SERVER_URL must be a valid URL.")
    .optional(),
});

export type ConfiguredClientEnvironment = z.infer<
  typeof clientEnvironmentSchema
>;

export type ClientEnvironment =
  | {
      status: "configured";
      values: ConfiguredClientEnvironment;
    }
  | {
      status: "missing";
      missing: Array<keyof ConfiguredClientEnvironment>;
    }
  | {
      status: "invalid";
      issues: string[];
    };

export function parseClientEnvironment(
  source: Record<string, unknown>,
): ClientEnvironment {
  const missing = (
    ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const
  ).filter((key) => {
    const value = source[key];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missing.length > 0) {
    return { status: "missing", missing: [...missing] };
  }

  const parsed = clientEnvironmentSchema.safeParse(source);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }

  return { status: "configured", values: parsed.data };
}

export const clientEnvironment = parseClientEnvironment(import.meta.env);

export const syncServerUrl =
  clientEnvironment.status === "configured"
    ? (clientEnvironment.values.VITE_SYNC_SERVER_URL ?? null)
    : null;
