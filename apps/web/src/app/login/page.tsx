import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Github } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signInWithGithub } from '@/app/auth/actions'
import { getSessionUser } from '@/lib/auth'

export const metadata = {
  title: 'Sign in',
}

type SearchParams = Promise<{
  next?: string
  error?: string
}>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams

  // Already signed in? bounce them straight through.
  const user = await getSessionUser()
  if (user) {
    redirect(sanitizeNextPath(next))
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="w-full rounded-xl border border-border bg-card/40 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to AI Sounds</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          GitHub is the only way in — we never ask for email or passwords.
        </p>

        <form action={signInWithGithub} className="mt-6">
          <input type="hidden" name="next" value={sanitizeNextPath(next)} />
          <Button type="submit" size="lg" className="w-full">
            <Github />
            Continue with GitHub
          </Button>
        </form>

        {error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-xs text-muted-foreground">
          By continuing you agree to abide by the community content guidelines outlined in the{' '}
          <Link href="/docs" className="underline underline-offset-4 hover:text-foreground">
            docs
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

function sanitizeNextPath(raw: string | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}
