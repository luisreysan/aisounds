import { promises as fs } from 'node:fs'
import path from 'node:path'

import { ApiError, fetchMeta } from '../lib/api.js'
import { playFile } from '../lib/audio.js'
import { logger } from '../lib/logger.js'

/**
 * Plays each sound of a published pack back-to-back. Streams the audio URL
 * into a temp file so the system player works regardless of how the pack
 * was published.
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

  try {
    for (const sound of meta.sounds) {
      logger.info(`▶ ${sound.event}`)

      if (!sound.url_mp3) {
        logger.warn(`Skipping ${sound.event}: pack metadata has no MP3 URL`)
        continue
      }
      const mp3Path = path.join(tmpRoot, `${sound.event}.mp3`)
      if (!(await downloadTo(sound.url_mp3, mp3Path))) continue

      try {
        await playFile({ mp3: mp3Path, durationMs: sound.duration_ms })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('no compatible Linux audio backend found')) {
          logger.warn(
            'No Linux audio backend found. Install one of: paplay (pulseaudio-utils), ffplay (ffmpeg), or mpv. Distorted/noisy sound usually means your system fell back to an unsupported player.',
          )
          continue
        }
        logger.warn(
          `Audio player failed: ${message}`,
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
