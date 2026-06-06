'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Upload } from 'lucide-react'

import { AsciiLogo } from '@/components/pixel/ascii-logo'
import { DesignSwitcher } from '@/components/pixel/design-switcher'
import { PIXEL_DESIGNS, PixelCanvas } from '@/components/pixel/pixel-canvas'

const ROTATE_MS = 7000

export function PixelHero() {
  const [active, setActive] = useState<string>(PIXEL_DESIGNS[0].id)
  const [auto, setAuto] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!auto) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timer.current = setInterval(() => {
      setActive((current) => {
        const idx = PIXEL_DESIGNS.findIndex((d) => d.id === current)
        const next = PIXEL_DESIGNS[(idx + 1) % PIXEL_DESIGNS.length] ?? PIXEL_DESIGNS[0]
        return next.id
      })
    }, ROTATE_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [auto])

  const handleSelect = useCallback((id: string) => {
    setActive(id)
    setAuto(false)
  }, [])

  return (
    <section className="flex flex-col gap-6">
      <div className="tl-box relative overflow-hidden">
        <div className="relative aspect-[16/10] w-full sm:aspect-[16/7]">
          <div className="tl-canvas-invert absolute inset-0">
            <PixelCanvas design={active} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 tl-scanlines" aria-hidden />
          </div>
          <div
            className="pointer-events-none absolute left-3 top-3 z-10 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'hsl(var(--tl-panel))' }}
          >
            <span className="animate-blink">●</span> REC{' '}
            <span className="opacity-70">
              CH {String(PIXEL_DESIGNS.findIndex((d) => d.id === active) + 1).padStart(2, '0')}
            </span>
          </div>
          <div
            className="pointer-events-none absolute right-3 top-3 z-10 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'hsl(var(--tl-panel))' }}
          >
            8-BIT / RGB
          </div>
        </div>
        <div
          className="border-t-2 px-3 py-3"
          style={{ borderColor: 'hsl(var(--tl-ink))' }}
        >
          <DesignSwitcher
            active={active}
            onSelect={handleSelect}
            auto={auto}
            onToggleAuto={() => setAuto((v) => !v)}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 px-2 text-center">
        <AsciiLogo className="max-w-full" />

        <p className="tl-label">{'>'} Community &amp; official sound packs</p>

        <h1 className="max-w-3xl font-mono text-2xl font-black leading-tight tracking-tight sm:text-4xl">
          Sound packs for <span className="tl-rgb">AI coding tools</span>
        </h1>

        <p
          className="tl-caret max-w-2xl text-sm sm:text-base"
          style={{ color: 'hsl(var(--tl-muted))' }}
        >
          Upload, share, vote and remix short sound effects that play on every AISE event in
          Cursor, VS Code, Claude Code, Windsurf and more
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link href="/packs" className="tl-btn tl-btn-primary">
            Browse packs
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/upload" className="tl-btn">
            <Upload className="h-4 w-4" />
            Upload your pack
          </Link>
        </div>
      </div>
    </section>
  )
}
