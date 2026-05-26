import Link from 'next/link'
import { Download, Heart, Medal, Package } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { TierBadge } from '@/components/leaderboard/tier-badge'
import { formatNumber } from '@/lib/format'
import type { CreatorRow } from '@/lib/leaderboard'
import { cn } from '@/lib/utils'

const MEDAL_STYLES = [
  { rank: 1, medalClass: 'text-amber-500', ringClass: 'ring-amber-500/40', scale: 'md:scale-105 md:-translate-y-2' },
  { rank: 2, medalClass: 'text-zinc-400', ringClass: 'ring-zinc-400/40', scale: '' },
  { rank: 3, medalClass: 'text-orange-600', ringClass: 'ring-orange-600/40', scale: '' },
] as const

function podiumOrder(creators: CreatorRow[]): Array<{ creator: CreatorRow; rank: number }> {
  const ordered: Array<{ creator: CreatorRow; rank: number }> = []
  if (creators[1]) ordered.push({ creator: creators[1], rank: 2 })
  if (creators[0]) ordered.push({ creator: creators[0], rank: 1 })
  if (creators[2]) ordered.push({ creator: creators[2], rank: 3 })
  return ordered
}

export function CreatorPodium({ creators }: { creators: CreatorRow[] }) {
  const top = creators.slice(0, 3)
  if (top.length === 0) return null

  return (
    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
      {podiumOrder(top).map(({ creator, rank }) => {
        const style = MEDAL_STYLES.find((s) => s.rank === rank)!
        const displayName = creator.display_name ?? creator.username

        return (
          <Card
            key={creator.author_id}
            className={cn(
              'border-border/60 ring-2 transition-transform',
              style.ringClass,
              style.scale,
            )}
          >
            <Link
              href={`/profile/${creator.username}`}
              className="flex flex-col items-center gap-3 p-6 text-center"
            >
              <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
                <Medal className={cn('h-4 w-4', style.medalClass)} />
                #{rank}
              </span>
              <Avatar className="h-20 w-20 ring-2 ring-border">
                {creator.avatar_url ? (
                  <AvatarImage src={creator.avatar_url} alt={creator.username} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {creator.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold">{displayName}</p>
                <p className="font-mono text-xs text-muted-foreground">@{creator.username}</p>
              </div>
              <TierBadge score={creator.score} />
              <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {creator.pack_count} packs
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {formatNumber(creator.total_votes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  {formatNumber(creator.total_downloads)}
                </span>
              </div>
            </Link>
          </Card>
        )
      })}
    </div>
  )
}
