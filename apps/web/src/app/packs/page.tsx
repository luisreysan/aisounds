import Link from 'next/link'
import { Suspense } from 'react'
import { Music2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PackFilters } from '@/components/pack-filters'
import { PackGrid } from '@/components/pack-grid'
import { listPacks, type ListPacksSort } from '@/lib/packs'

export const metadata = {
  title: 'Browse packs',
}

export const dynamic = 'force-dynamic'

type Sort = ListPacksSort

const SORTS: Sort[] = ['trending', 'new', 'top']

function normalizeSort(value: string | undefined): Sort {
  return (SORTS as string[]).includes(value ?? '') ? (value as Sort) : 'trending'
}

export default async function PacksPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string
    tool?: string
    sort?: string
    q?: string
  }>
}) {
  const { tag, tool, sort, q } = await searchParams
  const resolvedSort = normalizeSort(sort)

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Sound packs</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Browse the community catalog and pick a pack that fits your flow. Install with
              one command through the <code className="font-mono text-xs">aisounds</code> CLI
              once Phase 4 ships.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/upload">
              <Upload />
              Upload pack
            </Link>
          </Button>
        </div>
        <PackFilters />
      </header>

      <Suspense key={`${resolvedSort}-${tag ?? ''}-${tool ?? ''}-${q ?? ''}`} fallback={<GridSkeleton />}>
        <PackResults tag={tag} tool={tool} sort={resolvedSort} q={q} />
      </Suspense>
    </main>
  )
}

async function PackResults({
  tag,
  tool,
  sort,
  q,
}: {
  tag?: string
  tool?: string
  sort: Sort
  q?: string
}) {
  const packs = await listPacks({ tag, tool, sort, search: q, limit: 48 })

  if (packs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
        <Music2 className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-medium">No packs match these filters yet.</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Be the first to upload one, or loosen your filters to see what the community has
          published.
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link href="/upload">
            <Upload />
            Upload a pack
          </Link>
        </Button>
      </div>
    )
  }

  return <PackGrid packs={packs} />
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  )
}
