import Link from 'next/link'
import { Download, Heart, Music } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import type { PackCardRow } from '@/lib/supabase/types'

export function PackCard({ pack }: { pack: PackCardRow }) {
  const coverColor = pack.cover_color || '#6366f1'
  const gradient = `radial-gradient(circle at 25% 15%, ${coverColor}, ${shade(coverColor, -0.35)})`

  return (
    <Card className="group relative overflow-hidden border-border/60 transition-colors hover:border-border">
      <Link href={`/packs/${pack.slug}`} className="flex h-full flex-col">
        <div
          className="relative flex h-32 items-end p-4 text-white"
          style={{ background: gradient }}
          aria-hidden="false"
        >
          <h3 className="text-lg font-semibold leading-tight drop-shadow">{pack.name}</h3>
          {pack.status === 'draft' ? (
            <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-black">
              Draft
            </span>
          ) : null}
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
            <Music className="h-3 w-3" />
            {pack.sound_count}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          {pack.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{pack.description}</p>
          ) : (
            <p className="line-clamp-2 text-sm italic text-muted-foreground/70">
              No description yet.
            </p>
          )}

          {(pack.tag_slugs?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(pack.tag_slugs ?? []).slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {pack.author_avatar_url ? (
                  <AvatarImage src={pack.author_avatar_url} alt={pack.author_username} />
                ) : null}
                <AvatarFallback>{pack.author_username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground/90">@{pack.author_username}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" /> {formatNumber(pack.vote_count)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> {formatNumber(pack.download_count)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  )
}

/**
 * Small helper to derive a darker/lighter variant of the pack's cover color so
 * the gradient has some depth. Not color-science perfect but fine for the UI.
 */
function shade(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const num = parseInt(normalized, 16)
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * (1 + amount))))
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * (1 + amount))))
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * (1 + amount))))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
