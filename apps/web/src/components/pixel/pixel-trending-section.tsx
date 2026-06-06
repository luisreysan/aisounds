import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'

import { PixelDivider } from '@/components/pixel/pixel-divider'
import { PixelPackCard } from '@/components/pixel/pixel-pack-card'
import { PixelTrendingFilters } from '@/components/pixel/pixel-trending-filters'
import type { PackCardRow } from '@/lib/supabase/types'

export function PixelTrendingSection({ packs }: { packs: PackCardRow[] }) {
  return (
    <section className="flex flex-col gap-6">
      <PixelDivider label="Trending" />

      <div className="text-center">
        <p className="tl-label">{'>'} Trending this month</p>
        <h2 className="font-mono text-xl font-black tracking-tight sm:text-2xl">
          Fresh from the community
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm" style={{ color: 'hsl(var(--tl-muted))' }}>
          Install community packs for Cursor or VS Code in one command. Filter by vibe or search
          by name.
        </p>
      </div>

      <Suspense fallback={null}>
        <PixelTrendingFilters />
      </Suspense>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="tl-label">
          {packs.length} pack{packs.length === 1 ? '' : 's'}
        </span>
        <Link
          href="/packs"
          className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-widest opacity-75 transition-opacity hover:opacity-100"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {packs.length === 0 ? (
        <div
          className="tl-box flex flex-col items-center gap-3 px-6 py-12 text-center"
          style={{ color: 'hsl(var(--tl-muted))' }}
        >
          <span aria-hidden className="text-2xl">
            ╳_╳
          </span>
          <p className="text-sm uppercase tracking-widest">No packs match these filters</p>
          <Link href="/upload" className="tl-btn tl-btn-primary mt-1">
            Upload a pack
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <li key={pack.id}>
              <PixelPackCard pack={pack} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
