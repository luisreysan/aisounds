import { promises as fs } from 'node:fs'
import path from 'node:path'

import { parseManifest, type SupportedTool } from '@aisounds/core'

import { getInstaller } from '../installers/index.js'
import { isAisoundsEntry, readJsonConfig, writeJsonConfig } from '../installers/config-io.js'
import { logger } from '../lib/logger.js'
import { resolveScope, type Scope } from '../lib/paths.js'
import { findInstalled, getActivePack, listInstalled, setActivePack } from '../lib/state.js'

export interface ActivateOptions {
  project?: string
}

export async function activate(slug: string, opts: ActivateOptions = {}): Promise<void> {
  const cwd = opts.project ?? process.cwd()
  const target = await findInstalled(slug, cwd)
  if (!target) {
    logger.error(`Pack "${slug}" is not installed. Run 'aisounds install ${slug}' first.`)
    process.exitCode = 1
    return
  }

  const scope = target.scope as Scope
  const currentActive = await getActivePack(scope, cwd)
  if (currentActive === slug) {
    logger.info(`"${target.name}" is already the active pack.`)
    return
  }

  const allPacks = await listInstalled(cwd)
  const sameScopePacks = allPacks.filter((p) => p.scope === scope)

  for (const pack of sameScopePacks) {
    for (const tool of pack.tools) {
      const installer = getInstaller(tool)
      const manifest = await loadManifestFromDisk(pack.packDir)
      if (!manifest) continue
      try {
        await installer.remove({
          slug: pack.slug,
          packDir: pack.packDir,
          manifest,
          scope,
          cwd,
        })
      } catch {
        // Best-effort removal
      }
    }
  }

  const targetManifest = await loadManifestFromDisk(target.packDir)
  if (!targetManifest) {
    logger.error(`Could not read manifest for "${slug}". Try reinstalling the pack.`)
    process.exitCode = 1
    return
  }

  for (const tool of target.tools) {
    const installer = getInstaller(tool)
    try {
      const result = await installer.install({
        slug,
        packDir: target.packDir,
        manifest: targetManifest,
        scope,
        cwd,
      })
      logger.success(
        `Configured ${result.entryCount} hook${result.entryCount === 1 ? '' : 's'} for ${installer.label}`,
      )
    } catch (err) {
      logger.error(
        `Installer for ${installer.label} failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  await setActivePack(slug, scope, cwd)
  logger.success(`Activated "${target.name}"`)
}

async function loadManifestFromDisk(packDir: string) {
  try {
    const raw = await fs.readFile(path.join(packDir, 'aisounds.json'), 'utf8')
    return parseManifest(JSON.parse(raw))
  } catch {
    return null
  }
}
