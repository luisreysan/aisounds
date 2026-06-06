'use client'

import { Pause, Play } from 'lucide-react'

import { PIXEL_DESIGNS } from '@/components/pixel/pixel-canvas'

export function DesignSwitcher({
  active,
  onSelect,
  auto,
  onToggleAuto,
}: {
  active: string
  onSelect: (id: string) => void
  auto: boolean
  onToggleAuto: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={onToggleAuto}
        aria-pressed={auto}
        aria-label={auto ? 'Auto rotate designs' : 'Hold current design'}
        className="tl-box-flat inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest"
      >
        {auto ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span className="hidden sm:inline">{auto ? 'Auto' : 'Hold'}</span>
      </button>

      {PIXEL_DESIGNS.map((d, i) => {
        const isActive = d.id === active
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            aria-pressed={isActive}
            className={[
              'tl-box-flat px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-transform',
              isActive
                ? 'translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0_0_hsl(var(--tl-ink))]'
                : 'opacity-70 hover:opacity-100',
            ].join(' ')}
          >
            <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="ml-1.5 hidden sm:inline">{d.label}</span>
          </button>
        )
      })}
    </div>
  )
}
