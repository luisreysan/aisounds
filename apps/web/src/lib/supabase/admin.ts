import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Server-only Supabase client that uses the SERVICE ROLE key. Bypasses Row
 * Level Security — NEVER expose this to the browser. Only use it in trusted
 * server code paths (Route Handlers, Server Actions, background jobs) for
 * operations that cannot be performed by the authenticated user, such as:
 *
 * - Publishing a pack (atomic DB writes across several tables)
 * - Moving files from `temp/` to `packs/[slug]/`
 * - Admin moderation actions
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
