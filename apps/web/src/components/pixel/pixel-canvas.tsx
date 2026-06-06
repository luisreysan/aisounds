'use client'

import { useEffect, useRef } from 'react'

/**
 * Animated retro canvas for the /testLanding playground. Reinterprets six
 * billboard-style scenes (rainbow ASCII, Game Boy, synthwave, matrix, disco
 * particles, vaporwave) as a procedural background. Single requestAnimationFrame
 * loop driven by a frame counter `t`; pauses on prefers-reduced-motion.
 */

export const PIXEL_DESIGNS = [
  { id: 'rainbow', label: 'Rainbow ASCII' },
  { id: 'gameboy', label: 'Game Boy' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'disco', label: 'Disco' },
  { id: 'vaporwave', label: 'Vaporwave' },
] as const

type Ctx = CanvasRenderingContext2D

interface SceneState {
  drops?: number[]
  particles?: { x: number; y: number; vx: number; vy: number }[]
}

function hsl(t: number, i: number, s: number, l: number, a = 1) {
  return `hsla(${(i + t * 2) % 360},${s}%,${l}%,${a})`
}

function brand(g: Ctx, w: number, y: number, scale: number) {
  g.textAlign = 'center'
  g.font = `bold ${Math.round(24 * scale)}px ui-monospace, monospace`
  const link = 'aisounds.dev'
  let x = -g.measureText(link).width / 2
  ;[...link].forEach((ch, i) => {
    g.fillStyle = hsl(0, i * 36, 95, 62)
    g.fillText(ch, w / 2 + x, y)
    x += g.measureText(ch).width
  })
}

const RENDERERS: Record<
  string,
  (g: Ctx, w: number, h: number, t: number, state: SceneState) => void
> = {
  rainbow(g, w, h, t) {
    g.fillStyle = '#070710'
    g.fillRect(0, 0, w, h)
    const lines = ['AI', 'SOUNDS', '.dev']
    const fs = Math.max(28, Math.min(72, w / 12))
    g.textAlign = 'center'
    g.font = `bold ${fs}px ui-monospace, monospace`
    lines.forEach((ln, li) => {
      const total = g.measureText(ln).width
      let cx = w / 2 - total / 2
      ;[...ln].forEach((ch, i) => {
        g.fillStyle = hsl(t, li * 80 + i * 30, 100, 60)
        g.shadowColor = g.fillStyle
        g.shadowBlur = 16
        const cw = g.measureText(ch).width
        g.fillText(ch, cx + cw / 2, h * 0.34 + li * fs * 1.05)
        cx += cw
      })
    })
    g.shadowBlur = 0
    const bars = Math.min(48, Math.floor(w / 16))
    for (let i = 0; i < bars; i++) {
      const bh = 16 + Math.abs(Math.sin(t * 0.2 + i)) * (h * 0.18)
      g.fillStyle = hsl(t, i * 9, 90, 52, 0.85)
      g.fillRect(i * (w / bars), h - bh, w / bars - 2, bh)
    }
  },

  gameboy(g, w, h, t) {
    const pal = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] as const
    const bg = pal[0]
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    const px = Math.max(6, Math.floor(w / 56))
    const cols = Math.ceil(w / px)
    const rows = Math.ceil(h / px)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = Math.sin(x * 0.4 + t * 0.08) * Math.cos(y * 0.35 + t * 0.06)
        const idx = 1 + (((((n + 1) * 1.5) | 0) % 3) + 3) % 3
        let color: string = pal[idx] ?? bg
        if ((x - cols / 2) ** 2 + (y - rows / 2.4) ** 2 < 120 + Math.sin(t * 0.1) * 14)
          color = pal[3]
        g.fillStyle = color
        g.fillRect(x * px, y * px, px - 1, px - 1)
      }
    }
    g.fillStyle = bg
    g.textAlign = 'center'
    g.font = `bold ${px * 4}px ui-monospace, monospace`
    g.fillText('AI SOUNDS', w / 2, h * 0.46)
    g.font = `${px * 2.4}px ui-monospace, monospace`
    g.fillText('8-BIT PACKS', w / 2, h * 0.58)
  },

  synthwave(g, w, h, t) {
    const gr = g.createLinearGradient(0, 0, 0, h)
    gr.addColorStop(0, '#1a0033')
    gr.addColorStop(0.5, '#3b0058')
    gr.addColorStop(1, '#0a0010')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
    const sy = h * 0.46
    const sun = g.createLinearGradient(0, sy - 110, 0, sy + 20)
    sun.addColorStop(0, '#ffd166')
    sun.addColorStop(1, '#ff5dae')
    g.fillStyle = sun
    g.beginPath()
    g.arc(w / 2, sy - 30, Math.min(90, w / 7) + Math.sin(t * 0.05) * 6, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(255,110,199,.45)'
    g.lineWidth = 2
    for (let i = 0; i < 20; i++) {
      const z = i / 20
      const yy = sy + z * z * (h - sy)
      g.beginPath()
      g.moveTo(0, yy)
      g.lineTo(w, yy)
      g.stroke()
    }
    for (let i = -10; i <= 10; i++) {
      g.beginPath()
      g.moveTo(w / 2, sy)
      g.lineTo(w / 2 + i * (w / 12), h)
      g.stroke()
    }
    brand(g, w, h * 0.14, 1.15)
  },

  matrix(g, w, h, t, state) {
    g.fillStyle = 'rgba(0,10,0,.14)'
    g.fillRect(0, 0, w, h)
    const step = 16
    const cols = Math.floor(w / step)
    if (!state.drops || state.drops.length !== cols) {
      state.drops = Array.from({ length: cols }, () => Math.random() * h)
    }
    const drops = state.drops
    g.font = '16px ui-monospace, monospace'
    for (let i = 0; i < cols; i++) {
      const ch = String.fromCharCode(0x30a0 + ((i + t) % 96))
      g.fillStyle = i % 6 === 0 ? '#d7ffd7' : '#15ff5a'
      const y = drops[i] ?? 0
      g.fillText(ch, i * step, y)
      const next = y + 14 + (i % 3) * 2
      drops[i] = next > h ? Math.random() * -80 : next
    }
    g.fillStyle = 'rgba(0,0,0,.6)'
    g.fillRect(0, h * 0.36, w, h * 0.3)
    brand(g, w, h * 0.5, 1.2)
  },

  disco(g, w, h, t, state) {
    g.fillStyle = '#050509'
    g.fillRect(0, 0, w, h)
    if (!state.particles) {
      state.particles = Array.from({ length: 90 }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.01,
        vy: (Math.random() - 0.5) * 0.01,
      }))
    }
    state.particles.forEach((p, i) => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > 1) p.vx *= -1
      if (p.y < 0 || p.y > 1) p.vy *= -1
      g.fillStyle = hsl(t, i * 20, 100, 58)
      g.beginPath()
      g.arc(p.x * w, p.y * h, 3 + Math.abs(Math.sin(t * 0.2 + i)) * 4, 0, Math.PI * 2)
      g.fill()
    })
    brand(g, w, h * 0.5, 1.3)
  },

  vaporwave(g, w, h, t) {
    const gr = g.createLinearGradient(0, 0, 0, h)
    gr.addColorStop(0, '#2d1b69')
    gr.addColorStop(1, '#190a3a')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 10; i++) {
      g.fillStyle = `hsla(${280 + i * 8},70%,${45 + i * 4}%,.35)`
      g.fillRect(0, h * 0.58 + i * 12 + Math.sin(t * 0.08 + i) * 7, w, 8)
    }
    g.textAlign = 'center'
    g.font = `italic bold ${Math.max(40, Math.min(72, w / 10))}px Georgia, serif`
    g.fillStyle = '#ff71ce'
    g.fillText('AI Sounds', w / 2, h * 0.36)
    g.font = `${Math.max(18, w / 28)}px ui-monospace, monospace`
    g.fillStyle = '#01cdfe'
    g.fillText('aisounds.dev', w / 2, h * 0.48)
    g.fillStyle = '#05ffa1'
    g.font = `${Math.max(12, w / 48)}px ui-monospace, monospace`
    g.fillText('Sound packs for AI coding tools', w / 2, h * 0.56)
  },
}

export function PixelCanvas({ design, className }: { design: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const designRef = useRef(design)
  designRef.current = design

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const g = canvas.getContext('2d')
    if (!g) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let t = 0
    let raf = 0
    let state: SceneState = {}
    let lastDesign = designRef.current

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = Math.max(1, Math.floor(rect.width))
      h = Math.max(1, Math.floor(rect.height))
      canvas.width = w * dpr
      canvas.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const current = designRef.current
      if (current !== lastDesign) {
        state = {}
        lastDesign = current
      }
      const render = RENDERERS[current] ?? RENDERERS.rainbow
      g.save()
      render?.(g, w, h, t, state)
      g.restore()
    }

    const loop = () => {
      t += 1
      draw()
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduceMotion) draw()
    })
    ro.observe(canvas)
    resize()

    if (reduceMotion) {
      draw()
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
