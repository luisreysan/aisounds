/**
 * Resolves the canonical public origin of the web app, in priority order:
 *
 *   1. NEXT_PUBLIC_SITE_URL  — explicit override (recommended in production).
 *   2. VERCEL_URL            — automatically injected on Vercel deployments.
 *   3. http://localhost:3000 — local dev fallback.
 *
 * The returned value never has a trailing slash.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'

  return raw.replace(/\/+$/, '')
}
