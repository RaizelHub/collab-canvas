import { z } from "zod";

export const workerEnvironmentSchema = z.object({
  ALLOWED_ORIGINS: z.string().min(1),
  ASSET_SIGNING_SECRET: z.string().min(32),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_URL: z.url(),
});

export function validateWorkerEnvironment(env: Env) {
  return workerEnvironmentSchema.parse(env);
}
