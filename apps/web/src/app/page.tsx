import Link from 'next/link'
import { ArrowRight, Sparkles, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PackGrid } from '@/components/pack-grid'
import { listPacks } from '@/lib/packs'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const packs = await listPacks({ limit: 6, sort: 'trending' })

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-16 pt-12">
      <section className="flex flex-col items-center gap-6 py-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Phase 3 · packs, votes and uploads
        </div>

        <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          Sound packs for AI
          <br />
          coding tools
        </h1>

        <p className="max-w-2xl text-balance text-lg text-muted-foreground">
          Upload, share, vote and remix short sound effects that play on every AISE event in
          Cursor, VS Code, Claude Code, Windsurf and more.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm">
          <Button asChild size="lg">
            <Link href="/packs">
              Browse packs
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/upload">
              <Upload />
              Upload your pack
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Trending this month</h2>
          <Link
            href="/packs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all &rarr;
          </Link>
        </div>

        {packs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            No packs yet. Be the first to{' '}
            <Link href="/upload" className="font-medium text-foreground underline underline-offset-4">
              upload one
            </Link>
            .
          </div>
        ) : (
          <PackGrid packs={packs} />
        )}
      </section>
    </main>
  )
}
