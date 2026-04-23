'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type WaveSurferType from 'wavesurfer.js'

import { Button } from '@/components/ui/button'
import { formatDurationMs } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface WaveformPlayerProps {
  src: string
  durationMs?: number
  color?: string
  className?: string
  compact?: boolean
}

/**
 * Small wavesurfer-powered play/pause preview tuned for short sound-effects.
 *
 * WaveSurfer ships with a Web Audio backend; we lazy-load the library in the
 * effect to keep it out of the server bundle and avoid SSR issues.
 */
export function WaveformPlayer({
  src,
  durationMs,
  color,
  className,
  compact = false,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurferType | null>(null)
  const [isPlaying, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [actualDurationMs, setActualDurationMs] = useState<number | null>(
    durationMs && durationMs > 0 ? durationMs : null,
  )

  useEffect(() => {
    let disposed = false
    let instance: WaveSurferType | null = null

    ;(async () => {
      if (!containerRef.current) return
      const { default: WaveSurfer } = await import('wavesurfer.js')
      if (disposed || !containerRef.current) return

      instance = WaveSurfer.create({
        container: containerRef.current,
        height: compact ? 28 : 48,
        waveColor: shade(color ?? '#6366f1', 0.4),
        progressColor: color ?? '#6366f1',
        cursorColor: 'transparent',
        barWidth: 2,
        barRadius: 2,
        barGap: 2,
        normalize: true,
        interact: true,
        url: src,
      })

      wsRef.current = instance

      instance.on('ready', () => {
        if (disposed) return
        setReady(true)
        const duration = instance!.getDuration()
        if (Number.isFinite(duration) && duration > 0) {
          setActualDurationMs(Math.round(duration * 1000))
        }
      })
      instance.on('audioprocess', () => {
        if (!instance) return
        setProgressMs(Math.round(instance.getCurrentTime() * 1000))
      })
      instance.on('finish', () => {
        setPlaying(false)
        setProgressMs(0)
      })
      instance.on('play', () => setPlaying(true))
      instance.on('pause', () => setPlaying(false))
    })().catch((err) => console.error('[waveform] init failed', err))

    return () => {
      disposed = true
      try {
        instance?.destroy()
      } catch {
        /* noop */
      }
      wsRef.current = null
    }
  }, [src, color, compact])

  const toggle = () => {
    const ws = wsRef.current
    if (!ws || !ready) return
    if (isPlaying) ws.pause()
    else ws.play()
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-8 w-8 rounded-full"
        onClick={toggle}
        disabled={!ready}
        aria-label={isPlaying ? 'Pause sound' : 'Play sound'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-hidden rounded-md bg-muted/30',
          compact ? 'h-7' : 'h-12',
        )}
      />
      <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {ready
          ? `${formatDurationMs(progressMs || 0)} / ${formatDurationMs(actualDurationMs ?? 0)}`
          : formatDurationMs(actualDurationMs ?? 0)}
      </span>
    </div>
  )
}

function shade(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const num = parseInt(normalized, 16)
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * (1 + amount))))
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * (1 + amount))))
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * (1 + amount))))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
