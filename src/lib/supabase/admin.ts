import { createClient } from "@supabase/supabase-js"

/**
 * Admin Supabase client with service role key.
 * Bypasses Row Level Security -- use only in webhook handlers
 * and server-side admin operations.
 */
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
