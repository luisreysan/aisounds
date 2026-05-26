import Link from 'next/link'
import { Download, Heart } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatNumber } from '@/lib/format'
import { generateGradient } from '@/lib/gradient'
import { packEngagementScore } from '@/lib/leaderboard'
import type { PackCardRow } from '@/lib/supabase/types'

export function PackRankingRow({ pack, rank }: { pack: PackCardRow; rank: number }) {
  const gradient = generateGradient(pack.slug)
  const score = packEngagementScore(pack)

  return (
    <Link
      href={`/packs/${pack.slug}`}
      className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/30 px-4 py-3 transition-colors hover:border-border hover:bg-card/50"
    >
      <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <div
        className="h-12 w-12 shrink-0 rounded-lg"
        style={{ background: gradient }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{pack.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            {pack.author_avatar_url ? (
              <AvatarImage src={pack.author_avatar_url} alt={pack.author_username} />
            ) : null}
            <AvatarFallback className="text-[9px]">
              {pack.author_username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>@{pack.author_username}</span>
          <span>·</span>
          <span>score {formatNumber(score)}</span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-4 text-sm text-muted-foreground sm:flex">
        <span className="inline-flex items-center gap-1">
          <Heart className="h-4 w-4" />
          {formatNumber(pack.vote_count)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Download className="h-4 w-4" />
          {formatNumber(pack.download_count)}
        </span>
      </div>
    </Link>
  )
}
