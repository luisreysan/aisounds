import Link from 'next/link'
import { Download, Heart, Music } from 'lucide-react'

import { formatNumber } from '@/lib/format'
import { generateGradient } from '@/lib/gradient'
import type { PackCardRow } from '@/lib/supabase/types'

export function PixelPackCard({ pack }: { pack: PackCardRow }) {
  const gradient = generateGradient(pack.slug)
  return (
    <Link
      href={`/packs/${pack.slug}`}
      className="tl-box group flex h-full flex-col transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
    >
      <div
        className="relative h-28 overflow-hidden border-b-2"
        style={{ borderColor: 'hsl(var(--tl-ink))' }}
      >
        <div
          className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
          style={{ background: gradient, imageRendering: 'pixelated' }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 tl-scanlines" aria-hidden />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 border-2 border-black/70 bg-black/55 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
          <Music className="h-3 w-3" />
          {pack.sound_count}
        </span>
        {pack.status === 'draft' ? (
          <span className="absolute left-2 top-2 border-2 border-black/70 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
            Draft
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-tight">{pack.name}</h3>
        <p
          className="line-clamp-2 text-[12px] leading-snug"
          style={{ color: 'hsl(var(--tl-muted))' }}
        >
          {pack.description || 'No description yet.'}
        </p>

        {(pack.tag_slugs?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(pack.tag_slugs ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="border-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ borderColor: 'hsl(var(--tl-ink))' }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className="mt-auto flex items-center justify-between border-t-2 pt-2 font-mono text-[11px] font-bold"
          style={{ borderColor: 'hsl(var(--tl-line) / 0.3)' }}
        >
          <span className="truncate">@{pack.author_username}</span>
          <span className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {formatNumber(pack.vote_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> {formatNumber(pack.download_count)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
