import 'server-only'
import { accessSync, constants as fsConstants, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'

/**
 * Point fluent-ffmpeg at the static binary shipped by the `ffmpeg-static`
 * package so the app works on serverless hosts (Vercel) without requiring
 * a system ffmpeg install.
 */
const ffmpegBinary = resolveFfmpegBinary()

if (ffmpegBinary.path) {
  ffmpeg.setFfmpegPath(ffmpegBinary.path)
}

export class AudioTranscodeError extends Error {
  constructor(
    message: string,
    public readonly ffmpegDetails?: string,
  ) {
    super(message)
    this.name = 'AudioTranscodeError'
  }
}

export interface TranscodeResult {
  oggBuffer: Buffer
  mp3Buffer: Buffer
  durationMs: number
}

/**
 * Transcodes the given raw audio buffer to both OGG (libvorbis) and MP3
 * (libmp3lame), returning both buffers plus the detected duration.
 *
 * We run conversions sequentially to avoid sporadic ffmpeg failures that can
 * happen when processing some source files in parallel on constrained hosts.
 */
export async function transcodeAudio(
  input: Buffer,
  inputFilename: string,
): Promise<TranscodeResult> {
  ensureFfmpegAvailable()

  const workdir = await mkdtemp(join(tmpdir(), 'aisounds-'))
  const inputPath = join(workdir, safeFilename(inputFilename) || 'input.bin')
  const oggPath = join(workdir, 'out.ogg')
  const mp3Path = join(workdir, 'out.mp3')

  try {
    await writeFile(inputPath, input)
    const sourceExt = extractExtension(inputFilename)
    const fallbackInputFormat = sourceExt === 'mp3' ? 'mp3' : null

    const oggDuration = await runFfmpegWithFallback(
      inputPath,
      oggPath,
      (cmd) =>
        cmd
          .inputOptions(['-vn'])
          .outputOptions(['-map_metadata', '-1', '-ac', '2', '-ar', '44100'])
          .audioCodec('libvorbis')
          .audioBitrate('96k')
          .format('ogg'),
      fallbackInputFormat,
    )

    let mp3Duration: number
    try {
      mp3Duration = await runFfmpegWithFallback(
        inputPath,
        mp3Path,
        (cmd) =>
          cmd
            .inputOptions(['-vn'])
            .outputOptions(['-map_metadata', '-1', '-ac', '2', '-ar', '44100'])
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .format('mp3'),
        fallbackInputFormat,
      )
    } catch (error) {
      if (!(error instanceof AudioTranscodeError) || !hasMissingLameEncoder(error)) {
        throw error
      }
      mp3Duration = await runFfmpegWithFallback(
        inputPath,
        mp3Path,
        (cmd) =>
          cmd
            .inputOptions(['-vn'])
            .outputOptions(['-map_metadata', '-1', '-ac', '2', '-ar', '44100'])
            .audioCodec('mp3')
            .audioBitrate('128k')
            .format('mp3'),
        fallbackInputFormat,
      )
    }

    const durationMs = oggDuration || mp3Duration
    if (!durationMs || durationMs <= 0) {
      const probedDuration = await probeDurationMs(oggPath).catch(() => 0)
      if (!probedDuration || probedDuration <= 0) {
        throw new AudioTranscodeError('Could not detect audio duration')
      }
      const [oggBuffer, mp3Buffer] = await Promise.all([readFile(oggPath), readFile(mp3Path)])
      return { oggBuffer, mp3Buffer, durationMs: probedDuration }
    }

    const [oggBuffer, mp3Buffer] = await Promise.all([readFile(oggPath), readFile(mp3Path)])

    return { oggBuffer, mp3Buffer, durationMs }
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * Runs a single ffmpeg invocation, returning the detected input duration in
 * milliseconds. The caller configures the output format/codec via `configure`.
 */
function runFfmpeg(
  inputPath: string,
  outputPath: string,
  configure: (cmd: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand,
  forcedInputFormat?: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let durationMs = 0
    let ffmpegStderr = ''
    const cmd = ffmpeg(inputPath).on('codecData', (data) => {
      durationMs = parseDurationString(data?.duration) ?? durationMs
    })
    cmd.on('progress', (progress) => {
      durationMs = parseDurationString(progress?.timemark) ?? durationMs
    })
    if (forcedInputFormat) {
      cmd.inputFormat(forcedInputFormat)
    }

    configure(cmd)
      .on('stderr', (line) => {
        ffmpegStderr += `${line}\n`
      })
      .on('error', (err) => {
        const details = ffmpegStderr.trim().split('\n').slice(-8).join('\n')
        reject(new AudioTranscodeError(err.message, details))
      })
      .on('end', () => resolve(durationMs))
      .save(outputPath)
  })
}

async function runFfmpegWithFallback(
  inputPath: string,
  outputPath: string,
  configure: (cmd: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand,
  fallbackInputFormat: string | null,
): Promise<number> {
  try {
    return await runFfmpeg(inputPath, outputPath, configure)
  } catch (error) {
    if (!(error instanceof AudioTranscodeError) || !fallbackInputFormat) {
      throw error
    }
    return runFfmpeg(inputPath, outputPath, configure, fallbackInputFormat)
  }
}

/**
 * Parses an ffmpeg `00:00:03.45`-style duration string into milliseconds.
 * Returns null for an unrecognized shape.
 */
function parseDurationString(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/u.exec(value.trim())
  if (!match) return null
  const hours = parseInt(match[1] ?? '0', 10)
  const minutes = parseInt(match[2] ?? '0', 10)
  const seconds = parseInt(match[3] ?? '0', 10)
  const ms = match[4]
  const millis = ms ? parseInt(ms.padEnd(3, '0').slice(0, 3), 10) : 0
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

function extractExtension(name: string): string | null {
  const idx = name.lastIndexOf('.')
  if (idx < 0) return null
  const ext = name.slice(idx + 1).toLowerCase()
  return ext || null
}

function hasMissingLameEncoder(error: AudioTranscodeError): boolean {
  const text = `${error.message}\n${error.ffmpegDetails ?? ''}`.toLowerCase()
  return text.includes("unknown encoder 'libmp3lame'") || text.includes('unknown encoder "libmp3lame"')
}

function probeDurationMs(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (error, metadata) => {
      if (error) return reject(error)
      const seconds = metadata?.format?.duration
      if (!seconds || Number.isNaN(seconds)) return resolve(0)
      resolve(Math.max(0, Math.round(seconds * 1000)))
    })
  })
}

function resolveFfmpegBinary(): { path: string | null; reason: string | null } {
  const executableName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const reasons: string[] = []
  const candidates = new Set<string>()
  const directPath = typeof ffmpegPath === 'string' ? ffmpegPath : null
  if (directPath) {
    candidates.add(directPath)
  } else {
    reasons.push('ffmpeg-static did not return a binary path in this environment')
  }

  try {
    const require = createRequire(import.meta.url)
    const pkgPath = require.resolve('ffmpeg-static/package.json')
    candidates.add(join(dirname(pkgPath), executableName))
  } catch {
    reasons.push('could not resolve ffmpeg-static/package.json in runtime bundle')
  }

  candidates.add(join(process.cwd(), 'node_modules', 'ffmpeg-static', executableName))
  candidates.add(join('/var/task/node_modules/ffmpeg-static', executableName))

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      reasons.push(`missing: ${candidate}`)
      continue
    }
    try {
      accessSync(candidate, fsConstants.X_OK)
      return { path: candidate, reason: null }
    } catch {
      try {
        accessSync(candidate, fsConstants.R_OK)
        return { path: candidate, reason: null }
      } catch {
        reasons.push(`not accessible: ${candidate}`)
      }
    }
  }

  return {
    path: null,
    reason: reasons.join(' | '),
  }
}

function ensureFfmpegAvailable(): void {
  if (ffmpegBinary.path) return
  throw new AudioTranscodeError(
    `ffmpeg binary is unavailable. ${ffmpegBinary.reason ?? 'Missing binary path'}`,
  )
}
