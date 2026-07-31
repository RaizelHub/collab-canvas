import { createClient } from "@supabase/supabase-js";

import { clientEnvironment } from "./env";

export const supabase =
  clientEnvironment.status === "configured"
    ? createClient(
        clientEnvironment.values.VITE_SUPABASE_URL,
        clientEnvironment.values.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
          },
        },
      )
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
