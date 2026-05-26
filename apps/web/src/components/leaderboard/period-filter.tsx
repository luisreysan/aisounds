'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { cn } from '@/lib/utils'
import type { LeaderboardPeriod } from '@/lib/leaderboard-types'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
]

export function PeriodFilter() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const period = (params.get('period') ?? 'all') as LeaderboardPeriod
  const tab = params.get('tab') ?? 'packs'

  const setPeriod = (next: LeaderboardPeriod) => {
    const search = new URLSearchParams(params.toString())
    if (next === 'all') search.delete('period')
    else search.set('period', next)
    if (!search.get('tab')) search.set('tab', tab)

    startTransition(() => {
      const qs = search.toString()
      router.replace(`/leaderboard${qs ? `?${qs}` : ''}`)
    })
  }

  return (
    <div
      className={cn(
        'inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1',
        isPending && 'opacity-70',
      )}
      role="group"
      aria-label="Leaderboard period"
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => setPeriod(p.value)}
          disabled={isPending}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            period === p.value
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
