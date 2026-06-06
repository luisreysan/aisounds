'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  generateVhsBandStarts,
  ThemeTransitionOverlay,
  type ThemeTransitionPhase,
} from '@/components/pixel/theme-transition-overlay'

const STORAGE_KEY = 'aisounds-invert'

/** Default theme — night mode. Must match SSR + first client paint. */
const DEFAULT_NIGHT = true

const FLASH_MS = 50
const STATIC_MS = 180
const REVEAL_MS = 120

type InvertContextValue = {
  night: boolean
  toggle: () => void
  transitioning: boolean
}

const InvertContext = createContext<InvertContextValue | null>(null)

function readNightPreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return DEFAULT_NIGHT
    return stored === 'night'
  } catch {
    return DEFAULT_NIGHT
  }
}

function persistNightPreference(night: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, night ? 'night' : 'day')
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Tailwind `sm` breakpoint — skip CRT/noise transition on mobile viewports. */
function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 639px)').matches
}

function shouldSkipThemeTransition(): boolean {
  return prefersReducedMotion() || isMobileViewport()
}

export function InvertProvider({ children }: { children: React.ReactNode }) {
  const [night, setNight] = useState(DEFAULT_NIGHT)
  const [phase, setPhase] = useState<ThemeTransitionPhase>('idle')
  const [targetLabel, setTargetLabel] = useState<'NIGHT' | 'DAY' | undefined>()
  const [vhsBandStarts, setVhsBandStarts] = useState<[number, number, number] | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  useEffect(() => {
    setNight(readNightPreference())
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day'
  }, [night])

  useEffect(() => () => clearTimers(), [clearTimers])

  const applyTheme = useCallback((next: boolean) => {
    setNight(next)
    persistNightPreference(next)
  }, [])

  const toggle = useCallback(() => {
    if (phase !== 'idle') return

    const next = !night

    if (shouldSkipThemeTransition()) {
      applyTheme(next)
      return
    }

    clearTimers()
    setTargetLabel(next ? 'NIGHT' : 'DAY')
    setVhsBandStarts(generateVhsBandStarts())
    setPhase('flash')

    const tStatic = setTimeout(() => {
      setPhase('static')
      applyTheme(next)
    }, FLASH_MS)

    const tReveal = setTimeout(() => {
      setPhase('reveal')
    }, FLASH_MS + STATIC_MS)

    const tIdle = setTimeout(() => {
      setPhase('idle')
      setTargetLabel(undefined)
      setVhsBandStarts(null)
    }, FLASH_MS + STATIC_MS + REVEAL_MS)

    timersRef.current = [tStatic, tReveal, tIdle]
  }, [phase, night, applyTheme, clearTimers])

  const transitioning = phase !== 'idle'

  return (
    <InvertContext.Provider value={{ night, toggle, transitioning }}>
      <div
        className="tl-scanlines min-h-screen bg-background text-foreground"
        style={{ filter: night ? 'invert(1)' : 'none' }}
        suppressHydrationWarning
      >
        {children}
      </div>
      <ThemeTransitionOverlay
        phase={phase}
        targetLabel={targetLabel}
        vhsBandStarts={vhsBandStarts}
      />
    </InvertContext.Provider>
  )
}

export function useInvert() {
  const ctx = useContext(InvertContext)
  if (!ctx) throw new Error('useInvert must be used within InvertProvider')
  return ctx
}
