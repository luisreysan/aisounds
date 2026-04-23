import { promises as fs } from 'node:fs'
import path from 'node:path'

import AdmZip from 'adm-zip'

import { parseManifest, type PackManifest } from '@aisounds/core'

export interface ExtractedPack {
  manifest: PackManifest
  /** Absolute path of the folder the zip was extracted to. */
  dir: string
}

/**
 * Extracts a zip buffer into `targetDir`, validates the embedded
 * `aisounds.json` against `PackManifestSchema`, and rejects anything with
 * path-traversal segments.
 */
export async function extractBundle(
  zipBuffer: Buffer,
  targetDir: string,
): Promise<ExtractedPack> {
  const zip = new AdmZip(zipBuffer)

  await fs.rm(targetDir, { recursive: true, force: true })
  await fs.mkdir(targetDir, { recursive: true })

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const safePath = sanitizeEntryPath(entry.entryName)
    if (!safePath) continue
    const outPath = path.join(targetDir, safePath)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, entry.getData())
  }

  const manifestPath = path.join(targetDir, 'aisounds.json')
  let manifestRaw: string
  try {
    manifestRaw = await fs.readFile(manifestPath, 'utf8')
  } catch {
    throw new Error('Bundle is missing aisounds.json manifest')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(manifestRaw)
  } catch {
    throw new Error('aisounds.json is not valid JSON')
  }

  const manifest = parseManifest(parsed)
  return { manifest, dir: targetDir }
}

function sanitizeEntryPath(name: string): string | null {
  const normalized = name.replace(/\\/g, '/').replace(/^\.?\/+/, '')
  if (!normalized || normalized.startsWith('/')) return null
  const segments = normalized.split('/')
  if (segments.some((s) => s === '..' || s === '')) return null
  return segments.join('/')
}
