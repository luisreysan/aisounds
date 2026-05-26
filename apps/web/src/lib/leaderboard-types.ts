export type LeaderboardPeriod = 'week' | 'month' | 'all'
export type LeaderboardTab = 'packs' | 'creators'

export function normalizeLeaderboardPeriod(value: string | undefined): LeaderboardPeriod {
  if (value === 'week' || value === 'month') return value
  return 'all'
}

export function normalizeLeaderboardTab(value: string | undefined): LeaderboardTab {
  return value === 'creators' ? 'creators' : 'packs'
}
