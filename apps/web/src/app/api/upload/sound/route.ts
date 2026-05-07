import { NextResponse } from 'next/server'

import { FILE_RULES, isAcceptedExtension, isAcceptedMimeType, isSoundEvent } from '@aisounds/core'

import { AudioTranscodeError, transcodeAudio } from '@/lib/audio'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/upload/sound
 *
 * Multipart form fields:
 *   - packId: string (UUID)     — pack the sound belongs to (must be draft, owned by caller)
 *   - event:  SoundEvent         — AISE event slug (see @aisounds/core)
 *   - file:   File               — raw audio file from the user
 *
 * Workflow:
 *   1. Auth + ownership check
 *   2. File validation (mime + size)
 *   3. Transcode to OGG + MP3, capture duration
 *   4. Enforce global duration + per-pack total size
 *   5. Upload both outputs to Storage under `packs/<slug>/sounds/<event>.<ext>`
 *   6. Upsert row in public.sounds (unique on pack_id + event)
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const packId = form.get('packId')
  const eventValue = form.get('event')
  const file = form.get('file')

  if (typeof packId !== 'string' || typeof eventValue !== 'string') {
    return NextResponse.json({ error: 'packId and event are required' }, { status: 400 })
  }
  if (!isSoundEvent(eventValue)) {
    return NextResponse.json({ error: `Unknown event "${eventValue}"` }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 })
  }
  if (file.size > FILE_RULES.max_size_bytes) {
    return NextResponse.json(
      { error: `File exceeds ${Math.round(FILE_RULES.max_size_bytes / 1024)} KB limit` },
      { status: 413 },
    )
  }

  const mime = normalizeMimeType(file.type)
  const originalExt = extractExtension(file.name)
  const hasAcceptedMime = !!mime && isAcceptedMimeType(mime)
  const hasAcceptedExtension = !!originalExt && isAcceptedExtension(originalExt)

  if (mime && !hasAcceptedMime && !hasAcceptedExtension) {
    return NextResponse.json(
      {
        error: `Unsupported audio format (${mime}). Accepted inputs: ${FILE_RULES.accepted_extensions.join(', ')}`,
      },
      { status: 415 },
    )
  }
  if (!mime && !hasAcceptedExtension) {
    return NextResponse.json(
      {
        error: `Unsupported audio format. Accepted inputs: ${FILE_RULES.accepted_extensions.join(', ')}`,
      },
      { status: 415 },
    )
  }

  const pack = await validateDraftPack(supabase, packId, user.id, 'accept uploads')
  if (!pack.ok) {
    return NextResponse.json({ error: pack.error }, { status: pack.status })
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())

  let transcoded
  try {
    transcoded = await transcodeAudio(inputBuffer, file.name)
  } catch (err) {
    console.error('[upload] ffmpeg failed', err)
    if (err instanceof AudioTranscodeError) {
      const infrastructureIssue =
        err.message.toLowerCase().includes('ffmpeg binary is unavailable') ||
        err.message.toLowerCase().includes('spawn') ||
        err.message.toLowerCase().includes('enoent')

      if (infrastructureIssue) {
        console.error('[upload] ffmpeg runtime unavailable in deployment artifact', {
          reason: err.message,
          details: err.ffmpegDetails ?? null,
        })
      }

      const detailText = err.ffmpegDetails
        ? ` ffmpeg details: ${err.ffmpegDetails.replace(/\s+/g, ' ').trim()}`
        : ''
      const reasonText = err.message ? ` reason: ${err.message}` : ''
      return NextResponse.json(
        {
          error: `Could not process audio. Upload one of: ${FILE_RULES.accepted_extensions.join(', ')}. The file will be transcoded to ogg/mp3.${reasonText}${detailText}`,
        },
        { status: 422 },
      )
    }
    return NextResponse.json(
      {
        error: `Could not process audio. Upload one of: ${FILE_RULES.accepted_extensions.join(', ')}. The file will be transcoded to ogg/mp3.`,
      },
      { status: 422 },
    )
  }

  const { oggBuffer, mp3Buffer, durationMs } = transcoded

  const maxMs = FILE_RULES.max_duration_seconds * 1000

  if (!durationMs || durationMs <= 0) {
    return NextResponse.json(
      { error: 'Could not detect audio duration' },
      { status: 422 },
    )
  }
  if (durationMs > maxMs) {
    return NextResponse.json(
      {
        error: `Sound is ${Math.round(durationMs)}ms, max allowed is ${maxMs}ms`,
      },
      { status: 413 },
    )
  }

  const { data: existingSounds } = await supabase
    .from('sounds')
    .select('event, size_bytes')
    .eq('pack_id', packId)

  const currentTotal = (existingSounds ?? [])
    .filter((s) => s.event !== eventValue)
    .reduce((sum, s) => sum + (s.size_bytes ?? 0), 0)
  const newTotal = currentTotal + oggBuffer.length + mp3Buffer.length
  if (newTotal > FILE_RULES.max_pack_total_bytes) {
    return NextResponse.json(
      { error: `Pack total size would exceed ${FILE_RULES.max_pack_total_bytes} bytes` },
      { status: 413 },
    )
  }

  const admin = createAdminClient()
  const oggPath = `packs/${pack.data.slug}/sounds/${eventValue}.ogg`
  const mp3Path = `packs/${pack.data.slug}/sounds/${eventValue}.mp3`

  const uploads = await Promise.all([
    admin.storage
      .from('sounds')
      .upload(oggPath, oggBuffer, { contentType: 'audio/ogg', upsert: true }),
    admin.storage
      .from('sounds')
      .upload(mp3Path, mp3Buffer, { contentType: 'audio/mpeg', upsert: true }),
  ])

  const uploadErr = uploads.find((u) => u.error)?.error
  if (uploadErr) {
    console.error('[upload] storage upload failed', uploadErr)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  const { data: oggPublic } = admin.storage.from('sounds').getPublicUrl(oggPath)
  const { data: mp3Public } = admin.storage.from('sounds').getPublicUrl(mp3Path)

  const totalSize = oggBuffer.length + mp3Buffer.length

  const { data: inserted, error: dbErr } = await admin
    .from('sounds')
    .upsert(
      {
        pack_id: packId,
        event: eventValue,
        storage_path_ogg: oggPath,
        storage_path_mp3: mp3Path,
        public_url_ogg: oggPublic.publicUrl,
        public_url_mp3: mp3Public.publicUrl,
        duration_ms: durationMs,
        size_bytes: totalSize,
        original_format: originalExt,
        is_loop: false,
      },
      { onConflict: 'pack_id,event' },
    )
    .select()
    .single()

  if (dbErr) {
    console.error('[upload] db upsert failed', dbErr)
    return NextResponse.json({ error: 'Database write failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    soundId: inserted.id,
    event: inserted.event,
    durationMs: inserted.duration_ms,
    sizeBytes: inserted.size_bytes,
    publicUrlOgg: inserted.public_url_ogg,
    publicUrlMp3: inserted.public_url_mp3,
  })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const packId = typeof (body as { packId?: unknown })?.packId === 'string'
    ? (body as { packId: string }).packId
    : null
  const eventValue = typeof (body as { event?: unknown })?.event === 'string'
    ? (body as { event: string }).event
    : null

  if (!packId || !eventValue) {
    return NextResponse.json({ error: 'packId and event are required' }, { status: 400 })
  }
  if (!isSoundEvent(eventValue)) {
    return NextResponse.json({ error: `Unknown event "${eventValue}"` }, { status: 400 })
  }

  const pack = await validateDraftPack(supabase, packId, user.id, 'remove sounds')
  if (!pack.ok) {
    return NextResponse.json({ error: pack.error }, { status: pack.status })
  }

  const admin = createAdminClient()
  const oggPath = `packs/${pack.data.slug}/sounds/${eventValue}.ogg`
  const mp3Path = `packs/${pack.data.slug}/sounds/${eventValue}.mp3`

  const { error: storageErr } = await admin.storage.from('sounds').remove([oggPath, mp3Path])
  if (storageErr) {
    console.error('[upload] storage remove failed', storageErr)
    return NextResponse.json({ error: 'Storage delete failed' }, { status: 500 })
  }

  const { error: dbErr } = await admin
    .from('sounds')
    .delete()
    .eq('pack_id', packId)
    .eq('event', eventValue)

  if (dbErr) {
    console.error('[upload] db delete failed', dbErr)
    return NextResponse.json({ error: 'Database delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, event: eventValue })
}

function extractExtension(name: string | undefined | null): string | null {
  if (!name) return null
  const idx = name.lastIndexOf('.')
  if (idx < 0) return null
  const ext = name.slice(idx + 1).toLowerCase()
  return ext || null
}

function normalizeMimeType(value: string | undefined): string {
  return (value ?? '').toLowerCase().trim().split(';', 1)[0] ?? ''
}

type DraftPackValidation =
  | { ok: true; data: { slug: string } }
  | { ok: false; status: number; error: string }

async function validateDraftPack(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packId: string,
  userId: string,
  actionLabel: string,
): Promise<DraftPackValidation> {
  const { data: pack, error: packErr } = await supabase
    .from('packs')
    .select('id, slug, author_id, status')
    .eq('id', packId)
    .maybeSingle()

  if (packErr) {
    console.error('[upload] pack lookup failed', packErr)
    return { ok: false, status: 500, error: 'Pack lookup failed' }
  }
  if (!pack) {
    return { ok: false, status: 404, error: 'Pack not found' }
  }
  if (pack.author_id !== userId) {
    return { ok: false, status: 403, error: 'You do not own this pack' }
  }
  if (pack.status !== 'draft') {
    return {
      ok: false,
      status: 409,
      error: `Only draft packs can ${actionLabel}. Create a new draft to change sounds.`,
    }
  }

  return { ok: true, data: { slug: pack.slug } }
}
