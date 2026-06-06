import Link from 'next/link'

import { PixelHeaderActions } from '@/components/pixel/pixel-header-actions'
import { getCurrentProfile } from '@/lib/auth'

const NAV = [
  { href: '/packs', label: 'Browse' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/docs', label: 'Docs' },
] as const

export async function PixelHeader() {
  const profile = await getCurrentProfile()

  return (
    <header className="tl-box-flat sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span className="tl-box-flat grid h-7 w-7 place-items-center text-xs font-black">
            ▚
          </span>
          <span className="tl-rgb text-sm font-black uppercase tracking-[0.2em]">
            AI&nbsp;Sounds
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-[12px] font-bold uppercase tracking-widest opacity-75 transition-opacity hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <PixelHeaderActions
          profile={
            profile
              ? {
                  username: profile.username,
                  displayName: profile.display_name,
                  avatarUrl: profile.avatar_url,
                }
              : null
          }
        />
      </div>
    </header>
  )
}
