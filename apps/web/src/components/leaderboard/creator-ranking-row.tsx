import Link from 'next/link'
import { Download, Heart, Package } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TierBadge } from '@/components/leaderboard/tier-badge'
import { formatNumber } from '@/lib/format'
import type { CreatorRow } from '@/lib/leaderboard'

export function CreatorRankingRow({ creator, rank }: { creator: CreatorRow; rank: number }) {
  const displayName = creator.display_name ?? creator.username

  return (
    <Link
      href={`/profile/${creator.username}`}
      className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/30 px-4 py-3 transition-colors hover:border-border hover:bg-card/50"
    >
      <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <Avatar className="h-11 w-11 shrink-0 ring-2 ring-border">
        {creator.avatar_url ? (
          <AvatarImage src={creator.avatar_url} alt={creator.username} />
        ) : null}
        <AvatarFallback>{creator.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{displayName}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">@{creator.username}</p>
        <div className="mt-1">
          <TierBadge score={creator.score} />
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground sm:flex">
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
  )
}
