'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 shrink-0', className)}
        aria-label="Toggle theme"
        disabled
      />
    )
  }

  const isDark = (resolvedTheme ?? theme) === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-9 w-9 shrink-0 transition-all hover:shadow-neon dark:hover:shadow-neon',
        className,
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
