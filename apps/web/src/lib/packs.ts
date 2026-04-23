import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PackCardRow, SoundRow } from '@/lib/supabase/types'

export type ListPacksSort = 'trending' | 'new' | 'top'

export interface ListPacksOptions {
  limit?: number
  offset?: number
  tag?: string | null
  tool?: string | null
  search?: string | null
  sort?: ListPacksSort
}

/**
 * Returns published packs for the browse page, trending RPC + fallbacks for
 * `new` (published_at) and `top` (vote_count) sorts.
 */
export async function listPacks(opts: ListPacksOptions = {}): Promise<PackCardRow[]> {
  const supabase = await createClient()
  const limit = opts.limit ?? 24
  const offset = opts.offset ?? 0
  const tag = opts.tag || null
  const tool = opts.tool || null
  const search = opts.search?.trim() || null
  const sort: ListPacksSort = opts.sort ?? 'trending'

  if (sort === 'trending') {
    const { data, error } = await supabase.rpc('get_trending_packs', {
      limit_count: limit,
      offset_count: offset,
      tag_filter: tag ?? undefined,
      tool_filter: tool ?? undefined,
      search_query: search ?? undefined,
    })
    if (error) {
      console.error('[packs] get_trending_packs failed', error)
      return []
    }
    return (data ?? []) as PackCardRow[]
  }

  let query = supabase
    .from('pack_cards_v')
    .select('*')
    .eq('status', 'published')
    .range(offset, offset + limit - 1)

  if (tag) query = query.contains('tag_slugs', [tag])
  if (tool) query = query.contains('tool_slugs', [tool])
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)

  query =
    sort === 'new'
      ? query.order('published_at', { ascending: false, nullsFirst: false })
      : query.order('vote_count', { ascending: false })

  const { data, error } = await query
  if (error) {
    console.error('[packs] listPacks failed', error)
    return []
  }
  return (data ?? []) as PackCardRow[]
}

export interface PackDetail {
  pack: PackCardRow
  sounds: SoundRow[]
}

/**
 * Returns a pack + its sound rows, or null if not found or not visible.
 * Published packs are visible to anyone; drafts/unlisted only to the author.
 */
export async function getPackBySlug(slug: string): Promise<PackDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: pack, error: packErr } = await supabase
    .from('pack_cards_v')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<PackCardRow>()

  if (packErr) {
    console.error('[packs] getPackBySlug pack error', packErr)
    return null
  }
  if (!pack) return null

  const isOwner = user?.id === pack.author_id
  if (pack.status !== 'published' && !isOwner) return null

  const { data: sounds, error: soundsErr } = await supabase
    .from('sounds')
    .select('*')
    .eq('pack_id', pack.id)
    .order('event', { ascending: true })

  if (soundsErr) {
    console.error('[packs] getPackBySlug sounds error', soundsErr)
    return { pack, sounds: [] }
  }

  return { pack, sounds: (sounds ?? []) as SoundRow[] }
}

/**
 * Whether the current authenticated user has voted for the given pack.
 * Returns false for anonymous visitors.
 */
export async function hasUserVoted(packId: string): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('votes')
    .select('pack_id')
    .eq('pack_id', packId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[packs] hasUserVoted failed', error)
    return false
  }
  return !!data
}

/**
 * Inserts or deletes the current user's vote for a pack, returning the new
 * state. The vote_count column is maintained by the DB trigger from 0002.
 */
export async function toggleVote(packId: string): Promise<{ voted: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const existing = await hasUserVoted(packId)
  if (existing) {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('pack_id', packId)
      .eq('user_id', user.id)
    if (error) throw error
    return { voted: false }
  }

  const { error } = await supabase.from('votes').insert({ pack_id: packId, user_id: user.id })
  if (error) throw error
  return { voted: true }
}

export interface DownloadMeta {
  tool?: string | null
  platform?: string | null
  version?: string | null
}

export async function recordDownload(packId: string, meta: DownloadMeta = {}): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('downloads').insert({
    pack_id: packId,
    user_id: user?.id ?? null,
    tool: meta.tool ?? null,
    platform: meta.platform ?? null,
    version: meta.version ?? null,
  })
  if (error) {
    console.error('[packs] recordDownload failed', error)
  }
}
