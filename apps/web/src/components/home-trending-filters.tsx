'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { TAG_OPTIONS } from '@/lib/catalog'
import { cn } from '@/lib/utils'

const ALL = '__all__'

const FEATURED_TAGS = [
  { slug: ALL, label: 'All packs' },
  { slug: 'ambient', label: 'Ambient & Chimes' },
  { slug: 'retro', label: '8-Bit Retro' },
  { slug: 'lofi', label: 'Lofi Wood' },
  { slug: 'funny', label: 'Humor & Fun' },
  { slug: 'cyberpunk', label: 'Cyberpunk' },
  { slug: 'sci-fi', label: 'Sci-Fi' },
] as const

export function HomeTrendingFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const tag = params.get('tag') ?? ALL
  const q = params.get('q') ?? ''

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (!value || value === ALL) next.delete(key)
    else next.set(key, value)
    startTransition(() => {
      const qs = next.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4',
        isPending && 'pointer-events-none opacity-70',
      )}
    >
      <form
        className="relative w-full max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault()
          const value =
            (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value ?? ''
          apply('q', value.trim())
        }}
      >
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search packs, creators, tags — lofi, ambient..."
          className="h-12 rounded-full border-2 border-border bg-card pl-11 pr-4 shadow-retro dark:shadow-none dark:focus-visible:shadow-neon"
          aria-label="Search packs"
        />
      </form>

      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
        {FEATURED_TAGS.map((t) => {
          const active = tag === t.slug || (t.slug === ALL && !params.get('tag'))
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => apply('tag', t.slug === ALL ? '' : t.slug)}
              className={cn(
                'retro-pill',
                active && 'retro-pill-active',
              )}
            >
              {t.label}
            </button>
          )
        })}
        {TAG_OPTIONS.filter(
          (t) => !FEATURED_TAGS.some((f) => f.slug === t.slug),
        )
          .slice(0, 4)
          .map((t) => {
            const active = tag === t.slug
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => apply('tag', t.slug)}
                className={cn('retro-pill hidden sm:inline-flex', active && 'retro-pill-active')}
              >
                {t.label}
              </button>
            )
          })}
      </div>
    </div>
  )
}
