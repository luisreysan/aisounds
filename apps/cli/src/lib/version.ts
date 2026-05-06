import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Reads the CLI version from its own `package.json`. Cached after the first
 * call. Falls back to '0.0.0' if the file is missing (e.g. when running
 * inside a test harness with a mocked cwd).
 */
let cached: string | null = null

export function getCliVersion(): string {
  if (cached) return cached
  try {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const candidates = [
      path.join(here, '..', 'package.json'),
      path.join(here, '..', '..', 'package.json'),
    ]
    for (const candidate of candidates) {
      try {
        const raw = readFileSync(candidate, 'utf8')
        const parsed = JSON.parse(raw) as { version?: string; name?: string }
        if (parsed.name === '@aisounds/cli' && typeof parsed.version === 'string') {
          cached = parsed.version
          return cached
        }
      } catch {
        continue
      }
    }
  } catch {
    // fall through
  }
  cached = '0.0.0'
  return cached
}
