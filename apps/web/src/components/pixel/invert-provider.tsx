'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'aisounds-invert'

type InvertContextValue = {
  night: boolean
  toggle: () => void
}

const InvertContext = createContext<InvertContextValue | null>(null)

export function InvertProvider({ children }: { children: React.ReactNode }) {
  const [night, setNight] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setNight(localStorage.getItem(STORAGE_KEY) === 'night')
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setNight((v) => {
      const next = !v
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'night' : 'day')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return (
    <InvertContext.Provider value={{ night: mounted ? night : false, toggle }}>
      <div
        className="tl-scanlines min-h-screen"
        style={{ filter: mounted && night ? 'invert(1)' : 'none' }}
      >
        {children}
      </div>
    </InvertContext.Provider>
  )
}

export function useInvert() {
  const ctx = useContext(InvertContext)
  if (!ctx) throw new Error('useInvert must be used within InvertProvider')
  return ctx
}
