/**
 * Resolves the canonical public origin of the web app. Used for OAuth
 * `redirectTo` so Supabase sends users back to this host after GitHub.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL when set and not localhost (recommended in prod).
 *   2. Vercel Production — never use localhost here (misconfigured env vars happen).
 *   3. VERCEL_URL — preview/deployment hostname on Vercel.
 *   4. http://localhost:3000 — local dev only.
 *
 * The returned value never has a trailing slash.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const stripSlashes = (value: string) => value.replace(/\/+$/, '')

  if (explicit && !isLocalhostOrigin(explicit)) {
    return stripSlashes(explicit)
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'https://aisounds.dev'
  }

  if (process.env.VERCEL_URL) {
    return stripSlashes(`https://${process.env.VERCEL_URL}`)
  }

  return stripSlashes(explicit || 'http://localhost:3000')
}

function isLocalhostOrigin(raw: string): boolean {
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`)
    const host = url.hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}
