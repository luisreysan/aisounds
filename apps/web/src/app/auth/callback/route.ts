import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * OAuth callback endpoint.
 *
 * Supabase redirects the browser here after GitHub finishes the OAuth dance.
 * We exchange the single-use `code` query param for a session, which drops
 * the auth cookies, then bounce to whatever `next` path the caller asked for
 * (defaults to the home page).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (error) {
    const target = new URL('/login', origin)
    target.searchParams.set('error', errorDescription ?? error)
    return NextResponse.redirect(target)
  }

  if (!code) {
    const target = new URL('/login', origin)
    target.searchParams.set('error', 'Missing OAuth code')
    return NextResponse.redirect(target)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const target = new URL('/login', origin)
    target.searchParams.set('error', exchangeError.message)
    return NextResponse.redirect(target)
  }

  return NextResponse.redirect(new URL(next, origin))
}

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return '/'
  // Only allow server-side relative paths to prevent open-redirect abuse.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}
