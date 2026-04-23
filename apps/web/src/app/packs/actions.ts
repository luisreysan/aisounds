'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { recordDownload, toggleVote } from '@/lib/packs'
import type { DownloadMeta } from '@/lib/packs'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type ToggleVoteResult =
  | { ok: true; voted: boolean }
  | { ok: false; reason: 'unauthenticated' | 'error'; message?: string }

export async function toggleVoteAction(
  packId: string,
  packSlug?: string,
): Promise<ToggleVoteResult> {
  try {
    const { voted } = await toggleVote(packId)
    if (packSlug) {
      revalidatePath(`/packs/${packSlug}`)
    }
    revalidatePath('/packs')
    revalidatePath('/')
    return { ok: true, voted }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('not authenticated')) {
      return { ok: false, reason: 'unauthenticated' }
    }
    console.error('[packs] toggleVoteAction failed', error)
    return { ok: false, reason: 'error', message }
  }
}

export async function recordDownloadAction(
  packId: string,
  meta: DownloadMeta = {},
): Promise<{ ok: true }> {
  await recordDownload(packId, meta)
  revalidatePath('/packs')
  return { ok: true }
}

const UpdatePackSchema = z.object({
  packId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable(),
})

export type UpdatePackResult =
  | { ok: true; slug: string }
  | { ok: false; error: string }

export async function updatePackDetailsAction(input: {
  packId: string
  name: string
  description: string | null
}): Promise<UpdatePackResult> {
  const parsed = UpdatePackSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: updated, error } = await supabase
    .from('packs')
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq('id', parsed.data.packId)
    .eq('author_id', user.id)
    .select('slug')
    .maybeSingle()

  if (error || !updated) {
    console.error('[packs] updatePackDetailsAction failed', error)
    return { ok: false, error: 'Could not update this pack' }
  }

  revalidatePath(`/packs/${updated.slug}`)
  revalidatePath('/packs')
  revalidatePath('/')
  return { ok: true, slug: updated.slug }
}

export type DeletePackResult = { ok: true } | { ok: false; error: string }

export async function deletePackAction(packId: string): Promise<DeletePackResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: pack, error: packErr } = await supabase
    .from('packs')
    .select('id, slug, author_id')
    .eq('id', packId)
    .eq('author_id', user.id)
    .maybeSingle()

  if (packErr || !pack) {
    console.error('[packs] deletePackAction pack lookup failed', packErr)
    return { ok: false, error: 'Pack not found or not owned by you' }
  }

  const admin = createAdminClient()
  const { data: files } = await admin.storage
    .from('sounds')
    .list(`packs/${pack.slug}/sounds`, { limit: 1000 })

  if (files && files.length > 0) {
    const paths = files.map((file) => `packs/${pack.slug}/sounds/${file.name}`)
    await admin.storage.from('sounds').remove(paths)
  }

  const { error: deleteErr } = await supabase
    .from('packs')
    .delete()
    .eq('id', packId)
    .eq('author_id', user.id)

  if (deleteErr) {
    console.error('[packs] deletePackAction failed', deleteErr)
    return { ok: false, error: 'Could not delete this pack' }
  }

  revalidatePath(`/packs/${pack.slug}`)
  revalidatePath('/packs')
  revalidatePath('/')
  return { ok: true }
}
