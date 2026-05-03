import { NextResponse } from 'next/server'

import { getPackBySlug } from '@/lib/packs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/packs/[slug]/meta
 *
 * Lightweight metadata endpoint consumed by the `aisounds` CLI (`info`,
 * `preview`, `update`) to avoid downloading the full zip just to inspect a
 * pack. Returns 404 for drafts/unknown packs.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  const detail = await getPackBySlug(slug)
  if (!detail || detail.pack.status !== 'published') {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  const { pack, sounds } = detail

  return NextResponse.json(
    {
      version: '1.0',
      pack: {
        id: pack.id,
        slug: pack.slug,
        name: pack.name,
        description: pack.description,
        license: pack.license,
        aise_version: pack.aise_version,
        author: {
          username: pack.author_username,
          display_name: pack.author_display_name,
          avatar_url: pack.author_avatar_url,
        },
        tags: pack.tag_slugs ?? [],
        tools: pack.tool_slugs ?? [],
        published_at: pack.published_at,
        updated_at: pack.updated_at,
        download_count: pack.download_count,
        vote_count: pack.vote_count,
      },
      sounds: sounds.map((s) => ({
        event: s.event,
        duration_ms: s.duration_ms,
        size_bytes: s.size_bytes,
        is_loop: s.is_loop,
        url_ogg: s.public_url_ogg,
        url_mp3: s.public_url_mp3,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    },
  )
}
