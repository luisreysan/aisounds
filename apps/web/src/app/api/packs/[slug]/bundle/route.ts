import { NextResponse } from 'next/server'
import AdmZip from 'adm-zip'

import {
  ALL_EVENTS,
  EVENT_SPEC,
  isSoundEvent,
  type PackManifest,
  type SoundEvent,
} from '@aisounds/core'

import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type PackRow = {
  id: string
  slug: string
  name: string
  description: string | null
  license: string
  cover_color: string | null
  aise_version: string
  status: string
  created_at: string
  published_at: string | null
  author_id: string
}

type SoundRow = {
  event: string
  storage_path_ogg: string
  storage_path_mp3: string | null
  public_url_ogg: string
  public_url_mp3: string | null
  duration_ms: number
  size_bytes: number
  is_loop: boolean
}

/**
 * GET /api/packs/[slug]/bundle
 *
 * Streams a zip archive containing the pack manifest (`aisounds.json`) and
 * every sound as both OGG and MP3 under `sounds/<event>.<ext>`. Used by the
 * `aisounds` CLI to install a pack and by the web `Download` button.
 *
 * Query params:
 *   - tool:      tool slug recorded in the downloads table (optional)
 *   - platform:  mac | windows | linux (optional)
 *   - version:   CLI version (optional)
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const url = new URL(req.url)
  const tool = url.searchParams.get('tool')
  const platform = url.searchParams.get('platform')
  const version = url.searchParams.get('version')

  const admin = createAdminClient()

  const { data: pack, error: packErr } = await admin
    .from('packs')
    .select(
      'id, slug, name, description, license, cover_color, aise_version, status, created_at, published_at, author_id',
    )
    .eq('slug', slug)
    .maybeSingle<PackRow>()

  if (packErr) {
    console.error('[bundle] pack lookup failed', packErr)
    return NextResponse.json({ error: 'Pack lookup failed' }, { status: 500 })
  }
  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (pack.status !== 'published') {
    return NextResponse.json(
      { error: 'Only published packs can be downloaded' },
      { status: 404 },
    )
  }

  const { data: soundRows, error: soundsErr } = await admin
    .from('sounds')
    .select(
      'event, storage_path_ogg, storage_path_mp3, public_url_ogg, public_url_mp3, duration_ms, size_bytes, is_loop',
    )
    .eq('pack_id', pack.id)

  if (soundsErr) {
    console.error('[bundle] sounds lookup failed', soundsErr)
    return NextResponse.json({ error: 'Sounds lookup failed' }, { status: 500 })
  }

  const sounds = ((soundRows ?? []) as SoundRow[]).filter((s) => isSoundEvent(s.event))
  if (sounds.length === 0) {
    return NextResponse.json({ error: 'Pack has no sounds' }, { status: 404 })
  }

  const { data: author } = await admin
    .from('users')
    .select('username, github_url')
    .eq('id', pack.author_id)
    .maybeSingle<{ username: string; github_url: string | null }>()

  const { data: tagRows } = await admin
    .from('pack_tags')
    .select('tags(slug)')
    .eq('pack_id', pack.id)

  const tagSlugs = ((tagRows ?? []) as { tags: { slug: string } | { slug: string }[] | null }[])
    .flatMap((row) => (Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : []))
    .map((t) => t.slug)
    .filter(Boolean)
    .slice(0, 5)

  const { data: toolRows } = await admin
    .from('pack_tools')
    .select('tool')
    .eq('pack_id', pack.id)

  const toolSlugs = ((toolRows ?? []) as { tool: string }[]).map((t) => t.tool)

  const zip = new AdmZip()

  const soundsMap: PackManifest['sounds'] = {}
  await Promise.all(
    sounds.map(async (sound) => {
      const event = sound.event as SoundEvent
      const oggBuf = await fetchStorageFile(sound.public_url_ogg)
      if (oggBuf) {
        zip.addFile(`sounds/${event}.ogg`, oggBuf)
      }
      if (sound.public_url_mp3) {
        const mp3Buf = await fetchStorageFile(sound.public_url_mp3)
        if (mp3Buf) {
          zip.addFile(`sounds/${event}.mp3`, mp3Buf)
        }
      }
      const spec = EVENT_SPEC[event]
      soundsMap[event] = {
        file: `sounds/${event}.ogg`,
        ...(sound.public_url_mp3 ? { file_fallback: `sounds/${event}.mp3` } : {}),
        duration_ms: Math.min(sound.duration_ms, spec?.maxMs ?? 10_000),
        loop: sound.is_loop,
        size_bytes: sound.size_bytes,
      }
    }),
  )

  const missingRequired = ALL_EVENTS.filter((e) => EVENT_SPEC[e].required && !(e in soundsMap))
  if (missingRequired.length > 0) {
    return NextResponse.json(
      { error: `Pack is missing required events: ${missingRequired.join(', ')}` },
      { status: 409 },
    )
  }

  const manifest: PackManifest = {
    version: '1.0',
    pack: {
      id: pack.id,
      slug: pack.slug,
      name: pack.name,
      description: pack.description ?? undefined,
      author: author?.username ?? 'unknown',
      author_url: author?.github_url ?? undefined,
      license: pack.license as PackManifest['pack']['license'],
      tags: tagSlugs,
      cover_color: pack.cover_color ?? undefined,
      created_at: normalizeDateTime(pack.created_at),
      aise_version: pack.aise_version || '1.0',
    },
    sounds: soundsMap,
    tool_configs: toolSlugs.reduce<NonNullable<PackManifest['tool_configs']>>(
      (acc, toolSlug) => {
        acc[toolSlug] = {
          config_path: defaultConfigPath(toolSlug),
          hook_format: 'aisounds-v1',
        }
        return acc
      },
      {},
    ),
  }

  zip.addFile('aisounds.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'))

  const zipBuffer = zip.toBuffer()

  try {
    await admin.from('downloads').insert({
      pack_id: pack.id,
      user_id: null,
      tool: tool ?? null,
      platform: platform ?? null,
      version: version ?? null,
    })
  } catch (err) {
    console.warn('[bundle] recordDownload failed', err)
  }

  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pack.slug}.zip"`,
      'Content-Length': String(zipBuffer.length),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}

async function fetchStorageFile(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[bundle] storage fetch ${res.status} for ${url}`)
      return null
    }
    const arrBuf = await res.arrayBuffer()
    return Buffer.from(arrBuf)
  } catch (err) {
    console.warn('[bundle] storage fetch failed', err)
    return null
  }
}

function defaultConfigPath(tool: string): string {
  switch (tool) {
    case 'cursor':
      return '~/.cursor/hooks.json'
    case 'claude-code':
      return '~/.claude/settings.json'
    case 'vscode':
      return '~/.vscode/settings.json'
    case 'windsurf':
      return '~/.windsurf/config.json'
    case 'aider':
      return '~/.aider.conf.yml'
    default:
      return `~/.${tool}/config.json`
  }
}

/**
 * Supabase can return timestamp strings that are valid for Postgres but do
 * not match strict RFC3339 datetime parsing in Zod. We normalize to ISO and
 * omit the field if parsing fails.
 */
function normalizeDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}
