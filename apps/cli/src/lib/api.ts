import type { SupportedTool } from '@aisounds/core'

/**
 * Base URL of the aisounds web app. Overridable via `AISOUNDS_API_URL` so we
 * can point the CLI at localhost during development.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.AISOUNDS_API_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return 'https://aisounds.dev'
}

export interface PackMeta {
  version: '1.0'
  pack: {
    id: string
    slug: string
    name: string
    description: string | null
    license: string
    cover_color: string | null
    aise_version: string
    author: {
      username: string
      display_name: string | null
      avatar_url: string | null
    }
    tags: string[]
    tools: string[]
    published_at: string | null
    updated_at: string | null
    download_count: number
    vote_count: number
  }
  sounds: Array<{
    event: string
    duration_ms: number
    size_bytes: number
    is_loop: boolean
    url_mp3: string | null
  }>
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Downloads the zipped bundle for a pack. Throws ApiError with the server
 * message on non-2xx responses so callers can show useful feedback.
 */
export async function fetchBundle(
  slug: string,
  opts: { tool?: SupportedTool | null; platform?: string | null; version?: string | null } = {},
): Promise<Buffer> {
  const url = new URL(`/api/packs/${encodeURIComponent(slug)}/bundle`, getApiBaseUrl())
  if (opts.tool) url.searchParams.set('tool', opts.tool)
  if (opts.platform) url.searchParams.set('platform', opts.platform)
  if (opts.version) url.searchParams.set('version', opts.version)

  const res = await fetch(url)
  if (!res.ok) {
    const message = await readErrorMessage(res)
    throw new ApiError(message, res.status)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function fetchMeta(slug: string): Promise<PackMeta> {
  const url = new URL(`/api/packs/${encodeURIComponent(slug)}/meta`, getApiBaseUrl())
  const res = await fetch(url)
  if (!res.ok) {
    const message = await readErrorMessage(res)
    throw new ApiError(message, res.status)
  }
  return (await res.json()) as PackMeta
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string }
    return body.error ?? body.message ?? `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
  }
}
