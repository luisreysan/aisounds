import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from './types'

/**
 * Refreshes the Supabase auth session on every matched request.
 *
 * The Next.js middleware runs on the Edge, so the pattern here follows the
 * official @supabase/ssr guidance: create a fresh supabase client that reads
 * from the incoming cookies and writes through to both the request (so that
 * downstream Server Components see the latest cookies) and the outgoing
 * response (so that the browser persists them).
 *
 * IMPORTANT: do NOT return early between `createServerClient` and
 * `supabase.auth.getUser()`. Any code path that skips `getUser()` will leave
 * stale cookies and can silently log the user out.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  await supabase.auth.getUser()

  return response
}
