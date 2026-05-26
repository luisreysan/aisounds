import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { LeaderboardPeriod } from '@/lib/leaderboard-types'
import type { PackCardRow } from '@/lib/supabase/types'

export type { LeaderboardPeriod, LeaderboardTab } from '@/lib/leaderboard-types'
export { normalizeLeaderboardPeriod, normalizeLeaderboardTab } from '@/lib/leaderboard-types'

export interface CreatorRow {
  author_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  pack_count: number
  total_votes: number
  total_downloads: number
  score: number
}

export interface PlatformStats {
  total_packs: number
  total_downloads: number
  total_creators: number
  top_pack_slug: string | null
  top_pack_name: string | null
  top_pack_votes: number
}

/** Engagement score for a single pack (matches SQL ranking). */
export function packEngagementScore(pack: Pick<PackCardRow, 'vote_count' | 'download_count'>): number {
  return (pack.vote_count ?? 0) * 5 + (pack.download_count ?? 0)
}

export async function getTopPacks(
  period: LeaderboardPeriod = 'all',
  limit = 50,
  offset = 0,
): Promise<PackCardRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_top_packs', {
    limit_count: limit,
    offset_count: offset,
    period,
  })

  if (error) {
    console.error('[leaderboard] get_top_packs failed', error)
    return []
  }

  return (data ?? []) as PackCardRow[]
}

export async function getTopCreators(
  period: LeaderboardPeriod = 'all',
  limit = 50,
  offset = 0,
): Promise<CreatorRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_top_creators', {
    limit_count: limit,
    offset_count: offset,
    period,
  })

  if (error) {
    console.error('[leaderboard] get_top_creators failed', error)
    return []
  }

  return ((data ?? []) as CreatorRow[]).map((row) => ({
    ...row,
    pack_count: Number(row.pack_count),
    total_votes: Number(row.total_votes),
    total_downloads: Number(row.total_downloads),
    score: Number(row.score),
  }))
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_platform_stats')

  if (error) {
    console.error('[leaderboard] get_platform_stats failed', error)
    return {
      total_packs: 0,
      total_downloads: 0,
      total_creators: 0,
      top_pack_slug: null,
      top_pack_name: null,
      top_pack_votes: 0,
    }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return {
      total_packs: 0,
      total_downloads: 0,
      total_creators: 0,
      top_pack_slug: null,
      top_pack_name: null,
      top_pack_votes: 0,
    }
  }

  const stats = row as PlatformStats
  return {
    total_packs: Number(stats.total_packs),
    total_downloads: Number(stats.total_downloads),
    total_creators: Number(stats.total_creators),
    top_pack_slug: stats.top_pack_slug,
    top_pack_name: stats.top_pack_name,
    top_pack_votes: Number(stats.top_pack_votes),
  }
}
