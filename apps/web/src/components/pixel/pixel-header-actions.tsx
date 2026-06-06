'use client'

import Link from 'next/link'
import { Github, MoonStar, Sun } from 'lucide-react'

import { useInvert } from '@/components/pixel/invert-provider'
import { UserMenu, type UserMenuProfile } from '@/components/user-menu'

export function PixelHeaderActions({ profile }: { profile: UserMenuProfile | null }) {
  const { night, toggle, transitioning } = useInvert()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={transitioning}
        aria-pressed={night}
        aria-label={night ? 'Switch to day mode' : 'Switch to night mode'}
        className="tl-btn px-3 py-2 text-[11px]"
        suppressHydrationWarning
      >
        {night ? <MoonStar className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        <span className="tabular-nums">{night ? 'NIGHT' : 'DAY'}</span>
      </button>

      {profile ? (
        <UserMenu profile={profile} />
      ) : (
        <Link href="/login" className="tl-btn tl-btn-primary px-3 py-2 text-[11px]">
          <Github className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      )}
    </div>
  )
}
