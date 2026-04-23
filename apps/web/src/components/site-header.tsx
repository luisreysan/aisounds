import Link from 'next/link'
import { Github } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { UserMenu, type UserMenuProfile } from '@/components/user-menu'
import { getCurrentProfile } from '@/lib/auth'

export async function SiteHeader() {
  const profile = await getCurrentProfile()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[11px] font-bold text-white shadow-sm"
          >
            AI
          </span>
          <span className="text-sm font-semibold tracking-tight">AI Sounds</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/packs">Browse</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/leaderboard">Leaderboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/docs">Docs</Link>
          </Button>

          <div className="ml-2 flex items-center gap-2">
            {profile ? (
              <UserMenu profile={toMenuProfile(profile)} />
            ) : (
              <Button asChild size="sm">
                <Link href="/login">
                  <Github />
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

function toMenuProfile(profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>): UserMenuProfile {
  return {
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
  }
}
