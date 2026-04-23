import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Reads a JSON config file, returning an empty object if it does not exist.
 * Throws if the file exists but contains invalid JSON — we refuse to blow
 * away hand-written config.
 */
export async function readJsonConfig<T extends Record<string, unknown>>(
  filePath: string,
): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    if (!raw.trim()) return {} as T
    return JSON.parse(raw) as T
  } catch (err) {
    if (isNotFound(err)) return {} as T
    if (err instanceof SyntaxError) {
      throw new Error(
        `Refusing to overwrite ${filePath}: file exists but is not valid JSON. Fix or delete it first.`,
      )
    }
    throw err
  }
}

export async function writeJsonConfig(
  filePath: string,
  value: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function isNotFound(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ENOENT'
}

/** Marker attached to every entry the CLI writes, so remove/update is safe. */
export interface AisoundsMarker {
  pack: string
  event: string
  version?: string
}

export function isAisoundsEntry(
  entry: unknown,
  slug?: string,
): entry is Record<string, unknown> & { _aisounds: AisoundsMarker } {
  if (!entry || typeof entry !== 'object') return false
  const marker = (entry as { _aisounds?: unknown })._aisounds
  if (!marker || typeof marker !== 'object') return false
  const pack = (marker as { pack?: unknown }).pack
  if (typeof pack !== 'string') return false
  if (slug && pack !== slug) return false
  return true
}
