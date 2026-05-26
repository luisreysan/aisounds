'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { HomeTrendingFilters } from '@/components/home-trending-filters'
import { PackGrid } from '@/components/pack-grid'
import { FadeIn } from '@/components/motion/fade-in'
import type { PackCardRow } from '@/lib/supabase/types'

export function HomeTrendingSection({ packs }: { packs: PackCardRow[] }) {
  return (
    <section className="space-y-8">
      <FadeIn className="space-y-4 text-center">
        <p className="retro-label">Trending sound packs</p>
        <h2 className="retro-heading">Trending this month</h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Install community packs for Cursor or VS Code in one command. Filter by vibe or search
          by name.
        </p>
      </FadeIn>

      <Suspense fallback={null}>
        <HomeTrendingFilters />
      </Suspense>

      <div className="flex items-baseline justify-between px-1">
        <span className="retro-label text-muted-foreground">
          {packs.length} pack{packs.length === 1 ? '' : 's'}
        </span>
        <Link
          href="/packs"
          className="font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          View all →
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="retro-card p-10 text-center text-sm text-muted-foreground">
          No packs match these filters.{' '}
          <Link href="/upload" className="font-medium text-foreground underline underline-offset-4">
            Upload one
          </Link>{' '}
          or try another tag.
        </div>
      ) : (
        <PackGrid packs={packs} />
      )}
    </section>
  )
}
