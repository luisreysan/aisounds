import Link from 'next/link'
import { Download, Heart, Medal, Music } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import { generateGradient } from '@/lib/gradient'
import { packEngagementScore } from '@/lib/leaderboard'
import type { PackCardRow } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const MEDAL_STYLES = [
  { rank: 1, label: 'Gold', medalClass: 'text-amber-500', ringClass: 'ring-amber-500/40', scale: 'md:scale-105 md:-translate-y-2' },
  { rank: 2, label: 'Silver', medalClass: 'text-zinc-400', ringClass: 'ring-zinc-400/40', scale: '' },
  { rank: 3, label: 'Bronze', medalClass: 'text-orange-600', ringClass: 'ring-orange-600/40', scale: '' },
] as const

/** Visual order: silver (#2), gold (#1), bronze (#3). */
function podiumOrder(packs: PackCardRow[]): Array<{ pack: PackCardRow; rank: number }> {
  const ordered: Array<{ pack: PackCardRow; rank: number }> = []
  if (packs[1]) ordered.push({ pack: packs[1], rank: 2 })
  if (packs[0]) ordered.push({ pack: packs[0], rank: 1 })
  if (packs[2]) ordered.push({ pack: packs[2], rank: 3 })
  return ordered
}

export function PackPodium({ packs }: { packs: PackCardRow[] }) {
  const top = packs.slice(0, 3)
  if (top.length === 0) return null

  return (
    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
      {podiumOrder(top).map(({ pack, rank }) => {
        const style = MEDAL_STYLES.find((s) => s.rank === rank)!
        const gradient = generateGradient(pack.slug)
        const score = packEngagementScore(pack)

        return (
          <Card
            key={pack.id}
            className={cn(
              'relative overflow-hidden border-border/60 ring-2 transition-transform',
              style.ringClass,
              style.scale,
            )}
          >
            <Link href={`/packs/${pack.slug}`} className="flex flex-col">
              <div className="relative flex h-28 items-end p-4 text-white md:h-32">
                <div
                  className="absolute inset-0 scale-110"
                  style={{ background: gradient, filter: 'blur(0.3rem)' }}
                  aria-hidden
                />
                <div className="relative flex w-full items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-xs font-bold backdrop-blur">
                    <Medal className={cn('h-3.5 w-3.5', style.medalClass)} />
                    #{rank}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] backdrop-blur">
                    <Music className="h-3 w-3" />
                    {pack.sound_count}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-lg font-semibold leading-tight">{pack.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Score {formatNumber(score)} · @{pack.author_username}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {formatNumber(pack.vote_count)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    {formatNumber(pack.download_count)}
                  </span>
                </div>
                {(pack.tag_slugs?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(pack.tag_slugs ?? []).slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] uppercase">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          </Card>
        )
      })}
    </div>
  )
}
