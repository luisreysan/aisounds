'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { PixelHeaderActions } from '@/components/pixel/pixel-header-actions'
import type { UserMenuProfile } from '@/components/user-menu'
import { cn } from '@/lib/utils'

const DESKTOP_NAV = [
  { href: '/packs', label: 'Browse' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/docs', label: 'Docs' },
] as const

const MOBILE_NAV = [
  { href: '/', label: 'Home' },
  ...DESKTOP_NAV,
] as const

export function PixelHeaderInner({
  profile,
}: {
  profile: UserMenuProfile | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="tl-box-flat sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="inline-flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="group hidden items-center gap-2 sm:inline-flex"
            >
              <span className="tl-box-flat grid h-7 w-7 place-items-center text-xs font-black">
                ▚
              </span>
              <span className="tl-rgb text-sm font-black uppercase tracking-[0.2em]">
                AI&nbsp;Sounds
              </span>
            </Link>

            <div className="inline-flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="pixel-mobile-nav"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="inline-flex shrink-0"
              >
                <span
                  className={cn(
                    'tl-box-flat grid h-7 w-7 place-items-center text-xs font-black transition-transform duration-200 ease-out',
                    menuOpen && 'rotate-90',
                  )}
                >
                  ▚
                </span>
              </button>
              <Link
                href="/"
                className="tl-rgb truncate text-sm font-black uppercase tracking-[0.2em]"
              >
                AI&nbsp;Sounds
              </Link>
            </div>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-[12px] font-bold uppercase tracking-widest opacity-75 transition-opacity hover:opacity-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <PixelHeaderActions profile={profile} />
        </div>

        <nav
          id="pixel-mobile-nav"
          aria-hidden={!menuOpen}
          className={cn(
            'overflow-hidden border-[hsl(var(--tl-ink))] transition-[max-height,opacity,border-width] duration-200 ease-out sm:hidden',
            menuOpen
              ? 'max-h-80 border-t-2 opacity-100'
              : 'max-h-0 border-t-0 opacity-0',
          )}
        >
          <ul className="flex flex-col py-1">
            {MOBILE_NAV.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'block px-1 py-2.5 text-[12px] font-bold uppercase tracking-widest transition-opacity',
                      active ? 'opacity-100' : 'opacity-70 hover:opacity-100',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
