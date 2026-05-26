import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { VSCODE_EVENT_MAP, type SoundEvent } from '@aisounds/core'

import { generateSimpleScript } from '../lib/audio.js'
import { isAisoundsEntry, readJsonConfig, writeJsonConfig } from './config-io.js'
import type { Installer, InstallerContext } from './types.js'

const AISOUNDS_DIR = 'aisounds'
const CONFIG_FILE = 'aisounds.json'

type VscodeHookEntry = {
  aiseEvent: SoundEvent
  command: string
  _aisounds: { pack: string; event: string; version: string }
}

type VscodeAisoundsConfig = {
  version: number
  pack: string
  hooks: Record<string, VscodeHookEntry>
  _aisounds?: { pack: string; version: string }
  [key: string]: unknown
}

/**
 * VS Code + Copilot installer.
 *
 * VS Code does not expose stable public lifecycle hooks for Copilot chat events
 * (the keys in VSCODE_EVENT_MAP are reserved for a future extension). This
 * installer writes:
 *
 *   - `.vscode/aisounds.json` — manifest of event → script mappings
 *   - `.vscode/aisounds/*.sh` or `*.ps1` — play commands for each mapped event
 *
 * Scripts are ready for manual task binding or a future AI Sounds VS Code
 * extension. `remove` only deletes entries tagged with `_aisounds`.
 */
export const vscodeInstaller: Installer = {
  tool: 'vscode',
  label: 'VS Code + Copilot',

  async install(ctx) {
    const vscodeDir = resolveVscodeDir(ctx)
    const configPath = path.join(vscodeDir, CONFIG_FILE)
    const scriptsDir = path.join(vscodeDir, AISOUNDS_DIR)
    await fs.mkdir(scriptsDir, { recursive: true })

    const config = await readJsonConfig<VscodeAisoundsConfig>(configPath)
    config.version = 1
    config.pack = ctx.slug
    config._aisounds = { pack: ctx.slug, version: '1' }
    if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
      config.hooks = {}
    }

    let entryCount = 0
    for (const [eventKey, vscodeHook] of Object.entries(VSCODE_EVENT_MAP) as [
      SoundEvent,
      string,
    ][]) {
      const sound = ctx.manifest.sounds[eventKey]
      if (!sound) continue

      const mp3 = path.join(ctx.packDir, sound.file)
      const scriptContent = generateSimpleScript({
        mp3,
        durationMs: sound.duration_ms,
      })
      const scriptName = scriptFileName(vscodeHook, ctx.slug)
      await fs.writeFile(path.join(scriptsDir, scriptName), scriptContent, 'utf8')
      if (process.platform !== 'win32') {
        await fs.chmod(path.join(scriptsDir, scriptName), 0o755)
      }

      const command = buildScriptCommand(ctx, scriptsDir, scriptName)
      config.hooks[vscodeHook] = {
        aiseEvent: eventKey,
        command,
        _aisounds: { pack: ctx.slug, event: eventKey, version: '1' },
      }
      entryCount += 1
    }

    await writeJsonConfig(configPath, config)
    return { configPath, entryCount }
  },

  async remove(ctx) {
    const vscodeDir = resolveVscodeDir(ctx)
    const configPath = path.join(vscodeDir, CONFIG_FILE)
    const scriptsDir = path.join(vscodeDir, AISOUNDS_DIR)

    let removedCount = 0
    try {
      const config = await readJsonConfig<VscodeAisoundsConfig>(configPath)
      if (isAisoundsEntry(config, ctx.slug)) {
        const hooks = config.hooks ?? {}
        for (const [hookName, entry] of Object.entries(hooks)) {
          if (isAisoundsEntry(entry, ctx.slug)) {
            delete hooks[hookName]
            removedCount += 1
          }
        }
        if (removedCount > 0 || config._aisounds?.pack === ctx.slug) {
          await fs.unlink(configPath)
          removedCount = Math.max(removedCount, 1)
        }
      }
    } catch {
      /* config may not exist */
    }

    try {
      const files = await fs.readdir(scriptsDir)
      for (const file of files) {
        if (file.includes(`-${ctx.slug}.`)) {
          await fs.unlink(path.join(scriptsDir, file))
        }
      }
      const remaining = await fs.readdir(scriptsDir)
      if (remaining.length === 0) {
        await fs.rmdir(scriptsDir)
      }
    } catch {
      /* scripts dir may not exist */
    }

    return { configPath, removedCount }
  },
}

function resolveVscodeDir(ctx: InstallerContext): string {
  if (ctx.scope === 'global') {
    return path.join(os.homedir(), '.vscode')
  }
  return path.join(ctx.cwd, '.vscode')
}

function scriptFileName(vscodeHook: string, slug: string): string {
  const ext = process.platform === 'win32' ? '.ps1' : '.sh'
  return `${vscodeHook}-${slug}${ext}`
}

function buildScriptCommand(ctx: InstallerContext, scriptsDir: string, scriptName: string): string {
  if (ctx.scope === 'global') {
    const fullPath = path.join(scriptsDir, scriptName)
    if (process.platform === 'win32') {
      return `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${fullPath}"`
    }
    return fullPath
  }

  const relFromProject = path.relative(ctx.cwd, path.join(scriptsDir, scriptName)).replace(/\\/g, '/')
  if (process.platform === 'win32') {
    return `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${relFromProject}"`
  }
  return relFromProject
}
