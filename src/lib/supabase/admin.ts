import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Admin Supabase client with service role key.
 * Bypasses Row Level Security -- use only in webhook handlers
 * and server-side admin operations.
 *
 * Lazy-initialized via Proxy to prevent build-time crash when
 * env vars are not yet available (e.g. Vercel build step).
 */
let _adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    }
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _adminClient
}

export const adminClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getAdminClient(), prop)
  },
})
