import { promises as fs } from 'node:fs'

import { parseManifest, type SupportedTool } from '@aisounds/core'
import path from 'node:path'

import { getInstaller, isSupportedTool } from '../installers/index.js'
import { logger } from '../lib/logger.js'
import { findInstalled, getActivePack, listInstalled, removeInstalled } from '../lib/state.js'
import type { Scope } from '../lib/paths.js'

export interface RemoveOptions {
  tool?: string
  global?: boolean
  project?: string
}

export async function remove(slug: string, opts: RemoveOptions): Promise<void> {
  const cwd = opts.project ?? process.cwd()
  const installed = opts.global
    ? (await listInstalled(cwd)).find((pack) => pack.slug === slug && pack.scope === 'global') ?? null
    : await findInstalled(slug, cwd)
  if (!installed) {
    logger.error(`Pack "${slug}" is not installed in this project or globally.`)
    process.exitCode = 1
    return
  }

  const tools = resolveTools(opts.tool, installed.tools)
  if (!tools) {
    process.exitCode = 1
    return
  }

  const manifest = await loadManifestFromDisk(installed.packDir)
  if (!manifest) {
    logger.warn(`Pack manifest not found under ${installed.packDir}, continuing with cleanup.`)
  }

  for (const tool of tools) {
    const installer = getInstaller(tool)
    try {
      const result = await installer.remove({
        slug,
        packDir: installed.packDir,
        manifest: manifest ?? fallbackManifest(slug),
        scope: installed.scope as Scope,
        cwd,
      })
      logger.success(
        `Removed ${result.removedCount} hook${result.removedCount === 1 ? '' : 's'} from ${installer.label}`,
      )
      if (result.configPath) logger.note(result.configPath)
    } catch (err) {
      logger.error(
        `Could not clean ${installer.label}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  try {
    await fs.rm(installed.packDir, { recursive: true, force: true })
    logger.note(`Deleted ${installed.packDir}`)
  } catch (err) {
    logger.warn(
      `Could not delete ${installed.packDir}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const scope = installed.scope as Scope
  await removeInstalled(slug, scope, cwd)

  const wasActive = await getActivePack(scope, cwd)
  if (wasActive === null) {
    logger.note('No active pack remaining. Install a new one or run aisounds activate <slug>.')
  }

  logger.success(`Uninstalled ${slug}`)
}

function resolveTools(flag: string | undefined, fallback: SupportedTool[]): SupportedTool[] | null {
  if (!flag) return fallback.length > 0 ? fallback : ['cursor', 'claude-code']
  if (!isSupportedTool(flag)) {
    logger.error(`Unknown tool "${flag}".`)
    return null
  }
  return [flag]
}

async function loadManifestFromDisk(packDir: string) {
  try {
    const raw = await fs.readFile(path.join(packDir, 'aisounds.json'), 'utf8')
    return parseManifest(JSON.parse(raw))
  } catch {
    return null
  }
}

function fallbackManifest(slug: string) {
  return {
    version: '1.0' as const,
    pack: {
      slug,
      name: slug,
      author: 'unknown',
      license: 'CC0' as const,
      tags: [],
      aise_version: '1.0',
    },
    sounds: {
      task_complete: { file: 'sounds/task_complete.ogg', duration_ms: 1, loop: false },
    },
  }
}
