'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

/**
 * Starts the GitHub OAuth flow.
 *
 * Supabase generates a provider URL and we redirect the browser to it. GitHub
 * then bounces the user back to `<SUPABASE_URL>/auth/v1/callback`, which
 * finally redirects to our own `<SITE_URL>/auth/callback` route (see
 * `options.redirectTo`). The `next` form field preserves the return path.
 */
export async function signInWithGithub(formData: FormData): Promise<void> {
  const next = sanitizeNextPath(formData.get('next')?.toString() ?? null)

  const supabase = await createClient()
  const callbackUrl = new URL('/auth/callback', getSiteUrl())
  if (next !== '/') callbackUrl.searchParams.set('next', next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })

  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'OAuth init failed')}`)
  }

  redirect(data.url)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}
