interface Env {
  ALLOWED_ORIGINS: string;
  ASSET_SIGNING_SECRET: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  BOARD_ASSETS: R2Bucket;
  BOARD_DELETIONS: DurableObjectNamespace;
  BOARD_ROOMS: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  SOCKET_TICKETS: DurableObjectNamespace;
}
