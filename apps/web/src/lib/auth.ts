import 'server-only'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  github_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  github_url: string | null
  bio: string | null
  is_admin: boolean
  is_banned: boolean
}

/**
 * Returns the currently authenticated Supabase auth user, or null.
 *
 * Always prefer this over `supabase.auth.getSession()` in server code —
 * `getUser()` revalidates the JWT against Supabase on every call and cannot
 * be trusted by a malicious client.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

/**
 * Returns the `public.users` profile row that matches the current session, or
 * null if anonymous. The DB trigger `on_auth_user_created` guarantees this row
 * exists after the first login.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, github_id, username, display_name, avatar_url, github_url, bio, is_admin, is_banned',
    )
    .eq('id', user.id)
    .maybeSingle<Profile>()

  if (error) {
    console.error('[auth] failed to load current profile', error)
    return null
  }
  return data
}

/**
 * Guards server components and server actions that require auth. Redirects
 * unauthenticated users to `/login?next=<current>`. Returns the Supabase user.
 */
export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getSessionUser()
  if (!user) {
    const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/login${qs}`)
  }
  return user
}
