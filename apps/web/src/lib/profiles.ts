import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PackCardRow, UserRow } from '@/lib/supabase/types'

export async function getProfileByUsername(username: string): Promise<UserRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle<UserRow>()
  if (error) {
    console.error('[profiles] getProfileByUsername failed', error)
    return null
  }
  return data
}

/**
 * Returns the packs authored by the given user. If `includeDrafts` is true the
 * caller is expected to be the author and we return every row regardless of
 * status. Otherwise only `published` packs are returned.
 */
export async function listPacksByAuthor(
  userId: string,
  includeDrafts = false,
): Promise<PackCardRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('pack_cards_v')
    .select('*')
    .eq('author_id', userId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (!includeDrafts) {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query
  if (error) {
    console.error('[profiles] listPacksByAuthor failed', error)
    return []
  }
  return (data ?? []) as PackCardRow[]
}
