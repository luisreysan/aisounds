import { Suspense } from 'react'

import { FaqSection } from '@/components/faq-section'
import { HomeHero } from '@/components/home-hero'
import { HomeTrendingSection } from '@/components/home-trending-section'
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-20 pt-8">
      <HomeHero />

      <Suspense fallback={null}>
        <HomeTrendingSection packs={packs} />
      </Suspense>

      <FaqSection />
    </main>
  )
}
