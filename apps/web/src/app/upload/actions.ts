'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/format'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/u

const DraftSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional().nullable(),
  license: z.enum(['CC0', 'CC-BY', 'CC-BY-SA', 'MIT']).default('CC0'),
  tags: z.array(z.string().min(1).max(40)).max(5).default([]),
  tools: z.array(z.string().min(1).max(40)).max(10).default([]),
})

export type DraftInput = z.infer<typeof DraftSchema>
type DraftInputWithPreferredSlug = DraftInput & { preferredSlug?: string }

export type CreatePackResult =
  | { ok: true; packId: string; slug: string }
  | { ok: false; error: string }

/**
 * Creates a new draft pack owned by the current user. Ensures the slug is
 * unique by appending a short suffix when needed. Also associates tags
 * (inserting any missing rows) and selected tools.
 */
export async function createPackDraftAction(input: DraftInputWithPreferredSlug): Promise<CreatePackResult> {
  const parsed = DraftSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const baseSlug = slugify(parsed.data.name) || 'pack'
  if (!SLUG_RE.test(baseSlug)) {
    return { ok: false, error: 'Name must contain at least one letter or digit' }
  }
  const preferredSlug = pickPreferredSlug(input, baseSlug)
  const slug = preferredSlug
    ? await ensureSlugAvailableOrGenerate(admin, preferredSlug, baseSlug)
    : await ensureUniqueSlug(admin, baseSlug)

  const { data: pack, error } = await admin
    .from('packs')
    .insert({
      slug,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      author_id: user.id,
      status: 'draft',
      license: parsed.data.license,
    })
    .select('id, slug')
    .single()

  if (error || !pack) {
    console.error('[upload] insert pack failed', error)
    return { ok: false, error: 'Could not create the pack' }
  }

  if (parsed.data.tags.length > 0) {
    const tagIds = await upsertTagIds(admin, parsed.data.tags)
    if (tagIds.length > 0) {
      await admin
        .from('pack_tags')
        .insert(tagIds.map((tag_id) => ({ pack_id: pack.id, tag_id })))
    }
  }

  if (parsed.data.tools.length > 0) {
    await admin
      .from('pack_tools')
      .insert(parsed.data.tools.map((tool) => ({ pack_id: pack.id, tool })))
  }

  revalidatePath('/upload')
  revalidatePath(`/profile/${user.id}`)

  return { ok: true, packId: pack.id, slug: pack.slug }
}

export async function previewPackSlugAction(name: string): Promise<{ slug: string | null }> {
  const normalized = name.trim()
  if (normalized.length < 2 || normalized.length > 80) {
    return { slug: null }
  }

  const baseSlug = slugify(normalized) || 'pack'
  if (!SLUG_RE.test(baseSlug)) {
    return { slug: null }
  }

  const admin = createAdminClient()
  const slug = await ensureUniqueSlug(admin, baseSlug)
  return { slug }
}

export type PublishResult =
  | { ok: true; slug: string }
  | { ok: false; error: string }

/**
 * Marks the draft pack as published. Requires at least the `task_complete`
 * sound (the AISE required set) to exist.
 */
export async function publishPackAction(packId: string): Promise<PublishResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: pack, error: packErr } = await admin
    .from('packs')
    .select('id, slug, author_id, status')
    .eq('id', packId)
    .maybeSingle()

  if (packErr || !pack) return { ok: false, error: 'Pack not found' }
  if (pack.author_id !== user.id) return { ok: false, error: 'Forbidden' }
  if (pack.status !== 'draft') return { ok: false, error: 'Pack is already published' }

  const { data: sounds, error: soundsErr } = await admin
    .from('sounds')
    .select('event')
    .eq('pack_id', packId)

  if (soundsErr) return { ok: false, error: 'Could not read sounds' }

  const events = new Set((sounds ?? []).map((s) => s.event))
  const missing = ['task_complete'].filter((e) => !events.has(e))
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required sound${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
    }
  }

  const { error: updateErr } = await admin
    .from('packs')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', packId)

  if (updateErr) {
    console.error('[upload] publish failed', updateErr)
    return { ok: false, error: 'Could not publish the pack' }
  }

  revalidatePath('/')
  revalidatePath('/packs')
  revalidatePath(`/packs/${pack.slug}`)
  return { ok: true, slug: pack.slug }
}

/**
 * Permanently deletes a draft pack (and its sounds + storage files). Only
 * draft packs can be deleted this way; published packs require a separate
 * moderation flow.
 */
export async function deleteDraftAction(packId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: pack } = await admin
    .from('packs')
    .select('id, slug, author_id, status')
    .eq('id', packId)
    .maybeSingle()

  if (!pack) return { ok: false, error: 'Pack not found' }
  if (pack.author_id !== user.id) return { ok: false, error: 'Forbidden' }
  if (pack.status !== 'draft') return { ok: false, error: 'Cannot delete a published pack' }

  const { data: files } = await admin.storage
    .from('sounds')
    .list(`packs/${pack.slug}/sounds`, { limit: 1000 })

  if (files && files.length > 0) {
    const paths = files.map((f) => `packs/${pack.slug}/sounds/${f.name}`)
    await admin.storage.from('sounds').remove(paths)
  }

  await admin.from('sounds').delete().eq('pack_id', packId)
  await admin.from('pack_tags').delete().eq('pack_id', packId)
  await admin.from('pack_tools').delete().eq('pack_id', packId)
  await admin.from('packs').delete().eq('id', packId)

  revalidatePath('/upload')
  return { ok: true }
}

export async function redirectAfterPublish(slug: string) {
  redirect(`/packs/${slug}`)
}

async function ensureUniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug
  for (let i = 0; i < 10; i += 1) {
    const { data } = await admin.from('packs').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
  }
  return `${baseSlug}-${Date.now().toString(36)}`
}

async function ensureSlugAvailableOrGenerate(
  admin: ReturnType<typeof createAdminClient>,
  preferredSlug: string,
  baseSlug: string,
): Promise<string> {
  const { data } = await admin.from('packs').select('id').eq('slug', preferredSlug).maybeSingle()
  if (!data) return preferredSlug
  return ensureUniqueSlug(admin, baseSlug)
}

function pickPreferredSlug(input: DraftInputWithPreferredSlug, baseSlug: string): string | null {
  const preferred = input.preferredSlug?.trim().toLowerCase()
  if (!preferred || !SLUG_RE.test(preferred)) return null
  if (preferred === baseSlug || preferred.startsWith(`${baseSlug}-`)) return preferred
  return null
}

async function upsertTagIds(
  admin: ReturnType<typeof createAdminClient>,
  slugs: string[],
): Promise<number[]> {
  const cleaned = Array.from(
    new Set(slugs.map((s) => slugify(s)).filter((s): s is string => !!s)),
  )
  if (cleaned.length === 0) return []

  await admin
    .from('tags')
    .upsert(
      cleaned.map((s) => ({ slug: s, name: s })),
      { onConflict: 'slug', ignoreDuplicates: true },
    )

  const { data, error } = await admin.from('tags').select('id').in('slug', cleaned)
  if (error) {
    console.error('[upload] upsertTagIds failed', error)
    return []
  }
  return (data ?? []).map((row) => row.id)
}
