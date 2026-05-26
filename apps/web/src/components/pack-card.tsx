'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Heart, Music, Play } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import { generateGradient } from '@/lib/gradient'
import type { PackCardRow } from '@/lib/supabase/types'

export function PackCard({ pack }: { pack: PackCardRow }) {
  const gradient = generateGradient(pack.slug)
  const hasSounds = (pack.sound_count ?? 0) > 0

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className="group relative overflow-hidden border-2 hover:border-primary/50 dark:hover:border-primary/60 dark:hover:shadow-neon">
        <Link href={`/packs/${pack.slug}`} className="flex h-full flex-col">
          <div className="relative flex h-36 items-end overflow-hidden p-4 text-white">
            <div
              className="absolute inset-0 scale-110 transition-transform duration-500 group-hover:scale-[1.12]"
              style={{ background: gradient, filter: 'blur(0.25rem)' }}
              aria-hidden="true"
            />
            <h3 className="relative font-mono text-lg font-bold leading-tight drop-shadow-md">
              {pack.name}
            </h3>
            {pack.status === 'draft' ? (
              <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full border border-black/20 bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-black">
                Draft
              </span>
            ) : hasSounds ? (
              <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide backdrop-blur">
                Demo
              </span>
            ) : null}
            <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 font-mono text-[11px] font-semibold backdrop-blur">
              <Music className="h-3 w-3" />
              {pack.sound_count} sounds
            </span>
            <span
              className="absolute right-3 bottom-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/40 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
              aria-hidden
            >
              <Play className="h-3.5 w-3.5 fill-white text-white" />
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
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-border">
                  {pack.author_avatar_url ? (
                    <AvatarImage src={pack.author_avatar_url} alt={pack.author_username} />
                  ) : null}
                  <AvatarFallback className="font-mono text-[10px]">
                    {pack.author_username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono font-medium text-foreground/90">
                  @{pack.author_username}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
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
    </motion.div>
  )
}
