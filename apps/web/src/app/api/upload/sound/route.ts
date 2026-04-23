import { NextResponse } from 'next/server'

import { FILE_RULES, isSoundEvent } from '@aisounds/core'

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

  const mime = (file.type || '').toLowerCase()
  if (mime && !(FILE_RULES.accepted_mime_types as readonly string[]).includes(mime)) {
    return NextResponse.json({ error: `Unsupported mime type: ${mime}` }, { status: 415 })
  }

  const { data: pack, error: packErr } = await supabase
    .from('packs')
    .select('id, slug, author_id, status')
    .eq('id', packId)
    .maybeSingle()

  if (packErr) {
    console.error('[upload] pack lookup failed', packErr)
    return NextResponse.json({ error: 'Pack lookup failed' }, { status: 500 })
  }
  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (pack.author_id !== user.id) {
    return NextResponse.json({ error: 'You do not own this pack' }, { status: 403 })
  }
  if (pack.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft packs accept uploads. Create a new draft to change sounds.' },
      { status: 409 },
    )
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())
  const originalExt = extractExtension(file.name)

  let transcoded
  try {
    transcoded = await transcodeAudio(inputBuffer, file.name)
  } catch (err) {
    console.error('[upload] ffmpeg failed', err)
    if (err instanceof AudioTranscodeError) {
      const detailText = err.ffmpegDetails
        ? ` ffmpeg details: ${err.ffmpegDetails.replace(/\s+/g, ' ').trim()}`
        : ''
      return NextResponse.json(
        {
          error: `Could not process audio. Make sure the file is a valid audio format.${detailText}`,
        },
        { status: 422 },
      )
    }
    return NextResponse.json(
      { error: 'Could not process audio. Make sure the file is a valid audio format.' },
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
  const oggPath = `packs/${pack.slug}/sounds/${eventValue}.ogg`
  const mp3Path = `packs/${pack.slug}/sounds/${eventValue}.mp3`

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

function extractExtension(name: string | undefined | null): string | null {
  if (!name) return null
  const idx = name.lastIndexOf('.')
  if (idx < 0) return null
  const ext = name.slice(idx + 1).toLowerCase()
  return ext || null
}
