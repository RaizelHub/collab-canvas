import { z } from "zod";

/** Accept PostgREST timestamptz values and normalize them for client storage. */
export const supabaseTimestampSchema = z.iso
  .datetime({ offset: true })
  .transform((timestamp) => new Date(timestamp).toISOString());
