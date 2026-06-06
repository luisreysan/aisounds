'use client'

export type ThemeTransitionPhase = 'idle' | 'flash' | 'static' | 'reveal'

/** Viewport % for `top` — centers a 12%-tall band at vertical midpoint. */
const VHS_CENTER_START = 44
const VHS_MIN_GAP = 10

function randomBandStart(occupied: number[]): number {
  for (let attempt = 0; attempt < 24; attempt++) {
    const value = -22 + Math.random() * 98
    if (occupied.every((pos) => Math.abs(pos - value) >= VHS_MIN_GAP)) {
      return value
    }
  }
  return -22 + Math.random() * 98
}

/** Three VHS tracking bands: one centered, two at random offsets each run. */
export function generateVhsBandStarts(): [number, number, number] {
  const middle = VHS_CENTER_START
  const first = randomBandStart([middle])
  const second = randomBandStart([middle, first])
  return [middle, first, second]
}

type ThemeTransitionOverlayProps = {
  phase: ThemeTransitionPhase
  targetLabel?: 'NIGHT' | 'DAY'
  vhsBandStarts?: [number, number, number] | null
}

export function ThemeTransitionOverlay({
  phase,
  targetLabel,
  vhsBandStarts,
}: ThemeTransitionOverlayProps) {
  if (phase === 'idle') return null

  const showStatic = phase === 'static' || phase === 'reveal'

  return (
    <div
      className="tl-theme-overlay"
      data-phase={phase}
      aria-busy="true"
      aria-label="Switching display mode"
    >
      {phase === 'flash' ? <div className="tl-theme-flash" aria-hidden /> : null}

      {showStatic && vhsBandStarts ? (
        <>
          <div className="tl-theme-noise" data-phase={phase} aria-hidden />
          <div className="tl-theme-vignette" data-phase={phase} aria-hidden />
          {vhsBandStarts.map((start, index) => (
            <div
              key={index}
              className="tl-vhs-band"
              style={{ '--vhs-start': `${start}%` } as React.CSSProperties}
              aria-hidden
            />
          ))}
          <div className="tl-theme-scanlines" aria-hidden />
        </>
      ) : null}

      {phase === 'reveal' && targetLabel ? (
        <div className="tl-theme-osd" aria-hidden>
          {`>> ${targetLabel}`}
        </div>
      ) : null}
    </div>
  )
}
