'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TAG_OPTIONS, TOOL_OPTIONS } from '@/lib/catalog'

const ALL = '__all__'

export function PackFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const sort = params.get('sort') ?? 'trending'
  const tag = params.get('tag') ?? ALL
  const tool = params.get('tool') ?? ALL
  const q = params.get('q') ?? ''

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (!value || value === ALL) next.delete(key)
    else next.set(key, value)
    startTransition(() => {
      router.replace(`/packs${next.toString() ? `?${next.toString()}` : ''}`)
    })
  }

  const clearAll = () => {
    startTransition(() => {
      router.replace('/packs')
    })
  }

  const hasFilters = sort !== 'trending' || tag !== ALL || tool !== ALL || q !== ''

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        className="relative flex-1 min-w-[200px]"
        onSubmit={(e) => {
          e.preventDefault()
          const value = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value ?? ''
          apply('q', value.trim())
        }}
      >
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search packs..."
          className="pl-8"
          aria-label="Search packs"
        />
      </form>

      <Select value={sort} onValueChange={(value) => apply('sort', value === 'trending' ? '' : value)}>
        <SelectTrigger className="w-[140px]" aria-label="Sort order">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="trending">Trending</SelectItem>
          <SelectItem value="new">Newest</SelectItem>
          <SelectItem value="top">All-time top</SelectItem>
        </SelectContent>
      </Select>

      <Select value={tag} onValueChange={(value) => apply('tag', value)}>
        <SelectTrigger className="w-[140px]" aria-label="Filter by tag">
          <SelectValue placeholder="Tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tags</SelectItem>
          {TAG_OPTIONS.map((t) => (
            <SelectItem key={t.slug} value={t.slug}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tool} onValueChange={(value) => apply('tool', value)}>
        <SelectTrigger className="w-[160px]" aria-label="Filter by tool">
          <SelectValue placeholder="Tool" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tools</SelectItem>
          {TOOL_OPTIONS.map((t) => (
            <SelectItem key={t.slug} value={t.slug}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={isPending}
          className="text-muted-foreground"
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
