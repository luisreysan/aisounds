import { Suspense } from 'react'

import { PixelFaq } from '@/components/pixel/pixel-faq'
import { PixelHero } from '@/components/pixel/pixel-hero'
import { PixelTrendingSection } from '@/components/pixel/pixel-trending-section'
import { listPacks } from '@/lib/packs'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>
}) {
  const { tag, q } = await searchParams
  const packs = await listPacks({
    limit: 12,
    sort: 'trending',
    tag,
    search: q,
  })

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-16 pt-8 sm:px-6">
      <PixelHero />

      <Suspense fallback={null}>
        <PixelTrendingSection packs={packs} />
      </Suspense>

      <PixelFaq />
    </main>
  )
}
