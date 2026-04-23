import { promises as fs } from 'node:fs'
import path from 'node:path'

import { ApiError, fetchMeta } from '../lib/api.js'
import { playFile } from '../lib/audio.js'
import { logger } from '../lib/logger.js'

/**
 * Plays each sound of a published pack back-to-back. Streams the audio URL
 * into a temp file so the system player works regardless of how the pack
 * was published.
 *
 * On Windows we prefer the MP3 version when available because the default
 * WPF MediaPlayer we use there cannot decode OGG/Vorbis without extra
 * codecs. macOS and Linux keep using the OGG file.
 */
export async function preview(slug: string): Promise<void> {
  let meta
  try {
    meta = await fetchMeta(slug)
  } catch (err) {
    if (err instanceof ApiError) {
      logger.error(`Server responded ${err.status}: ${err.message}`)
    } else {
      logger.error(err instanceof Error ? err.message : String(err))
    }
    process.exitCode = 1
    return
  }

  const tmpRoot = path.join(
    process.env.TEMP || process.env.TMPDIR || '/tmp',
    `aisounds-preview-${slug}-${Date.now()}`,
  )
  await fs.mkdir(tmpRoot, { recursive: true })

  const preferMp3 = process.platform === 'win32'

  try {
    for (const sound of meta.sounds) {
      logger.info(`▶ ${sound.event}`)

      const oggPath = path.join(tmpRoot, `${sound.event}.ogg`)
      if (!(await downloadTo(sound.url_ogg, oggPath))) continue

      let mp3Path: string | undefined
      if (preferMp3 && sound.url_mp3) {
        const target = path.join(tmpRoot, `${sound.event}.mp3`)
        if (await downloadTo(sound.url_mp3, target)) {
          mp3Path = target
        }
      }

      try {
        await playFile({ ogg: oggPath, mp3: mp3Path, durationMs: sound.duration_ms })
      } catch (err) {
        logger.warn(
          `Audio player failed: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true })
  }

  logger.success(`Previewed ${meta.sounds.length} sound${meta.sounds.length === 1 ? '' : 's'}`)
}

async function downloadTo(url: string, dest: string): Promise<boolean> {
  const res = await fetch(url)
  if (!res.ok) {
    logger.warn(`Could not fetch ${url}: HTTP ${res.status}`)
    return false
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(dest, buf)
  return true
}
