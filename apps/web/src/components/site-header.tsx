import Link from 'next/link'
import { Github } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu, type UserMenuProfile } from '@/components/user-menu'
import { getCurrentProfile } from '@/lib/auth'

export async function SiteHeader() {
  const profile = await getCurrentProfile()

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background/90 backdrop-blur-md dark:border-border/80 dark:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="AI Sounds home">
          <img
            src="/logo.png"
            alt=""
            width={40}
            height={32}
            className="h-8 w-auto transition-transform group-hover:scale-105"
          />
          <span className="font-mono text-sm font-bold tracking-tight">AI Sounds</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm" className="font-mono">
            <Link href="/packs">Browse</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden font-mono sm:inline-flex">
            <Link href="/leaderboard">Leaderboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden font-mono sm:inline-flex">
            <Link href="/docs">Docs</Link>
          </Button>

          <div className="ml-1 flex items-center gap-1 sm:ml-2">
            <ThemeToggle />
            {profile ? (
              <UserMenu profile={toMenuProfile(profile)} />
            ) : (
              <Button asChild size="sm" className="font-mono">
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
