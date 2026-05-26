import Link from 'next/link'
import { Suspense } from 'react'
import { Music2, Trophy, Upload, Users } from 'lucide-react'

import { CreatorPodium } from '@/components/leaderboard/creator-podium'
import { CreatorRankingRow } from '@/components/leaderboard/creator-ranking-row'
import { PackPodium } from '@/components/leaderboard/pack-podium'
import { PackRankingRow } from '@/components/leaderboard/pack-ranking-row'
import { PeriodFilter } from '@/components/leaderboard/period-filter'
import { StatsBar } from '@/components/leaderboard/stats-bar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getPlatformStats,
  getTopCreators,
  getTopPacks,
} from '@/lib/leaderboard'
import {
  normalizeLeaderboardPeriod,
  normalizeLeaderboardTab,
  type LeaderboardPeriod,
} from '@/lib/leaderboard-types'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Leaderboard — AI Sounds',
  description: 'Top sound packs and creators in the AI Sounds community.',
}

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>
}) {
  const { tab, period } = await searchParams
  const resolvedTab = normalizeLeaderboardTab(tab)
  const resolvedPeriod = normalizeLeaderboardPeriod(period)
  const stats = await getPlatformStats()

  const tabHref = (nextTab: 'packs' | 'creators') => {
    const params = new URLSearchParams()
    params.set('tab', nextTab)
    if (resolvedPeriod !== 'all') params.set('period', resolvedPeriod)
    return `/leaderboard?${params.toString()}`
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              Community rankings
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              See which packs and creators are climbing the charts. Rankings use an engagement
              score: votes × 5 + downloads.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/upload">
              <Upload />
              Upload pack
            </Link>
          </Button>
        </div>
      </header>

      <StatsBar stats={stats} />

      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground"
            aria-label="Leaderboard category"
          >
            <Link
              href={tabHref('packs')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all',
                resolvedTab === 'packs'
                  ? 'bg-background text-foreground shadow'
                  : 'hover:text-foreground',
              )}
            >
              <Music2 className="h-4 w-4" />
              Top packs
            </Link>
            <Link
              href={tabHref('creators')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all',
                resolvedTab === 'creators'
                  ? 'bg-background text-foreground shadow'
                  : 'hover:text-foreground',
              )}
            >
              <Users className="h-4 w-4" />
              Top creators
            </Link>
          </nav>
          <PeriodFilter />
        </div>

        <Suspense
          key={`${resolvedTab}-${resolvedPeriod}`}
          fallback={<LeaderboardSkeleton tab={resolvedTab} />}
        >
          {resolvedTab === 'creators' ? (
            <CreatorsResults period={resolvedPeriod} />
          ) : (
            <PacksResults period={resolvedPeriod} />
          )}
        </Suspense>
      </section>
    </main>
  )
}

async function PacksResults({ period }: { period: LeaderboardPeriod }) {
  const packs = await getTopPacks(period, 50)

  if (packs.length === 0) {
    return <LeaderboardEmpty kind="packs" period={period} />
  }

  const podium = packs.slice(0, 3)
  const rest = packs.slice(3)

  return (
    <div className="space-y-8">
      {podium.length > 0 ? <PackPodium packs={podium} /> : null}
      {rest.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Rest of the board</h2>
          {rest.map((pack, index) => (
            <PackRankingRow key={pack.id} pack={pack} rank={index + 4} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

async function CreatorsResults({ period }: { period: LeaderboardPeriod }) {
  const creators = await getTopCreators(period, 50)

  if (creators.length === 0) {
    return <LeaderboardEmpty kind="creators" period={period} />
  }

  const podium = creators.slice(0, 3)
  const rest = creators.slice(3)

  return (
    <div className="space-y-8">
      {podium.length > 0 ? <CreatorPodium creators={podium} /> : null}
      {rest.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Rest of the board</h2>
          {rest.map((creator, index) => (
            <CreatorRankingRow key={creator.author_id} creator={creator} rank={index + 4} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LeaderboardEmpty({
  kind,
  period,
}: {
  kind: 'packs' | 'creators'
  period: LeaderboardPeriod
}) {
  const periodLabel =
    period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'yet'

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
      <Trophy className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-medium">No rankings {periodLabel}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {kind === 'packs'
          ? 'Publish a pack and gather votes to appear on the board.'
          : 'Creators with published packs in this period will show up here.'}
      </p>
      <Button asChild size="sm" className="mt-2">
        <Link href="/upload">
          <Upload />
          Upload a pack
        </Link>
      </Button>
    </div>
  )
}

function LeaderboardSkeleton({ tab }: { tab: 'packs' | 'creators' }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: tab === 'creators' ? 5 : 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
