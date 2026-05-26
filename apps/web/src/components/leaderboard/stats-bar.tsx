import Link from 'next/link'
import { Download, Heart, Music2, Users } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import type { PlatformStats } from '@/lib/leaderboard'

export function StatsBar({ stats }: { stats: PlatformStats }) {
  const items = [
    {
      label: 'Published packs',
      value: formatNumber(stats.total_packs),
      icon: Music2,
    },
    {
      label: 'Total downloads',
      value: formatNumber(stats.total_downloads),
      icon: Download,
    },
    {
      label: 'Active creators',
      value: formatNumber(stats.total_creators),
      icon: Users,
    },
    {
      label: 'Top pack (votes)',
      value: stats.top_pack_name ?? '—',
      sub: stats.top_pack_votes > 0 ? `${formatNumber(stats.top_pack_votes)} votes` : undefined,
      icon: Heart,
      href: stats.top_pack_slug ? `/packs/${stats.top_pack_slug}` : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        const content = (
          <Card className="flex flex-col gap-2 border-border/60 bg-card/40 p-4 transition-colors hover:border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
            </div>
            <p className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {item.value}
            </p>
            {item.sub ? <p className="text-xs text-muted-foreground">{item.sub}</p> : null}
          </Card>
        )

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {content}
            </Link>
          )
        }

        return <div key={item.label}>{content}</div>
      })}
    </div>
  )
}
