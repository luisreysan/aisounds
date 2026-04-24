import { promises as fs } from 'node:fs'
import path from 'node:path'

import { parseManifest, type PackManifest, type SupportedTool } from '@aisounds/core'
import { checkbox } from '@inquirer/prompts'

import { getInstaller } from '../installers/index.js'
import { logger } from '../lib/logger.js'
import type { Scope } from '../lib/paths.js'
import {
  filterManifest,
  findInstalled,
  getActivePack,
  updateDisabledEvents,
} from '../lib/state.js'

export interface SoundsOptions {
  project?: string
}

export async function sounds(slug: string, opts: SoundsOptions = {}): Promise<void> {
  const cwd = opts.project ?? process.cwd()

  const pack = await findInstalled(slug, cwd)
  if (!pack) {
    logger.error(`Pack "${slug}" is not installed. Run 'aisounds install ${slug}' first.`)
    process.exitCode = 1
    return
  }

  const manifest = await loadManifest(pack.packDir)
  if (!manifest) {
    logger.error(`Could not read manifest for "${slug}". Try reinstalling the pack.`)
    process.exitCode = 1
    return
  }

  const allEvents = Object.keys(manifest.sounds) as string[]
  if (allEvents.length === 0) {
    logger.warn('This pack has no sounds.')
    return
  }

  const disabledSet = new Set(pack.disabledEvents ?? [])

  const choices = allEvents.map((event) => {
    const entry = manifest.sounds[event as keyof typeof manifest.sounds]
    const duration = entry ? `${(entry.duration_ms / 1000).toFixed(1)}s` : ''
    return {
      name: `${event}  ${duration ? `(${duration})` : ''}`,
      value: event,
      checked: !disabledSet.has(event),
    }
  })

  const enabled: string[] = await checkbox({
    message: `Sounds for "${pack.name}" (${allEvents.length} events)`,
    choices,
    loop: false,
  })

  const newDisabled = allEvents.filter((e) => !enabled.includes(e))

  await updateDisabledEvents(slug, pack.scope as Scope, newDisabled, cwd)

  const enabledCount = enabled.length
  const disabledCount = newDisabled.length
  logger.success(
    `${enabledCount} enabled, ${disabledCount} disabled.`,
  )

  const active = await getActivePack(pack.scope as Scope, cwd)
  if (active === slug) {
    await regenerateHooks(pack, manifest, newDisabled, cwd)
    logger.success('Hooks updated.')
  } else {
    logger.note('Pack is not active. Run \'aisounds activate ' + slug + '\' to apply hooks.')
  }
}

async function regenerateHooks(
  pack: { slug: string; packDir: string; tools: SupportedTool[]; scope: string },
  manifest: PackManifest,
  disabledEvents: string[],
  cwd: string,
): Promise<void> {
  const scope = pack.scope as Scope
  const filtered = filterManifest(manifest, disabledEvents)

  for (const tool of pack.tools) {
    const installer = getInstaller(tool)
    try {
      await installer.remove({ slug: pack.slug, packDir: pack.packDir, manifest, scope, cwd })
    } catch {
      // best-effort
    }
    try {
      await installer.install({ slug: pack.slug, packDir: pack.packDir, manifest: filtered, scope, cwd })
    } catch (err) {
      logger.error(
        `Installer for ${installer.label} failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}

async function loadManifest(packDir: string): Promise<PackManifest | null> {
  try {
    const raw = await fs.readFile(path.join(packDir, 'aisounds.json'), 'utf8')
    return parseManifest(JSON.parse(raw))
  } catch {
    return null
  }
}
