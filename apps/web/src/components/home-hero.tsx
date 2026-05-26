'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

const words = ['Sound', 'packs', 'for', 'AI', 'coding', 'tools']

export function HomeHero() {
  return (
    <section className="relative flex flex-col items-center gap-8 overflow-hidden py-12 text-center sm:py-16">
      <div
        className="retro-grid-bg pointer-events-none absolute inset-0 animate-grid-pulse opacity-60"
        aria-hidden
      />
      <div className="bg-neon-glow pointer-events-none absolute inset-x-0 top-0 h-64" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative inline-flex items-center gap-2 rounded-full border-2 border-border bg-secondary/80 px-4 py-1.5 retro-label text-foreground/80 dark:border-primary/40 dark:bg-primary/10"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Community & official packs
      </motion.div>

      <h1 className="relative max-w-4xl font-mono text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
        {words.map((word, i) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.45, ease: 'easeOut' }}
            className="inline-block mr-[0.25em] last:mr-0"
          >
            <span
              className={
                i >= 3
                  ? 'bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent dark:from-primary dark:via-accent dark:to-primary'
                  : ''
              }
            >
              {word}
            </span>
          </motion.span>
        ))}
      </h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="relative max-w-2xl text-balance text-lg text-muted-foreground"
      >
        Upload, share, vote and remix short sound effects that play on every AISE event in
        Cursor, VS Code, Claude Code, Windsurf and more.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="relative flex flex-wrap items-center justify-center gap-3 pt-2"
      >
        <Button asChild size="lg" className="rounded-full px-8 shadow-retro dark:shadow-neon">
          <Link href="/packs">
            Browse packs
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full border-2 px-8">
          <Link href="/upload">
            <Upload />
            Upload your pack
          </Link>
        </Button>
      </motion.div>
    </section>
  )
}
