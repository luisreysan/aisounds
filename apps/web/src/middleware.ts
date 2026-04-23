import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on every route except for static assets, images and the Next.js
     * internals. The auth callback route is included on purpose so that the
     * exchanged cookies are propagated before we redirect to `/`.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|ogg|wav)$).*)',
  ],
}
