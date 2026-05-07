import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { CURSOR_EVENT_MAP, type SoundEvent } from '@aisounds/core'

import { generateSimpleScript, generateStopScript, type AudioTargets, type StopSoundEntry } from '../lib/audio.js'
import { isAisoundsEntry, readJsonConfig, writeJsonConfig } from './config-io.js'
import type { Installer, InstallerContext } from './types.js'

const HOOKS_SUBDIR = 'hooks'
const AISOUNDS_DIR = 'aisounds'

type CursorHookEntry = {
  command: string
  _aisounds?: { pack: string; event: string; version: string }
}

type CursorHooksMap = Record<string, CursorHookEntry[]>

type CursorConfig = {
  version?: number
  hooks?: CursorHooksMap
  [key: string]: unknown
}

/**
 * Cursor installer.
 *
 * Cursor hooks use a different format from what most tools expect:
 *
 *   { "version": 1, "hooks": { "<eventName>": [{ "command": "..." }] } }
 *
 * Each hook receives JSON via stdin and must respond with JSON on stdout.
 * We generate platform-specific scripts in `.cursor/hooks/aisounds/` and
 * point the `command` field at them. The `_aisounds` marker on each entry
 * lets `remove` filter our hooks without touching user-authored ones.
 *
 * The `stop` event is special: it fires with `{ status: "completed" | "error" | "aborted" }`
 * so a single script handles both `task_complete` and `task_failed`.
 */
export const cursorInstaller: Installer = {
  tool: 'cursor',
  label: 'Cursor',

  async install(ctx) {
    const cursorDir = resolveCursorDir(ctx)
    const configPath = path.join(cursorDir, 'hooks.json')
    const scriptsDir = path.join(cursorDir, HOOKS_SUBDIR, AISOUNDS_DIR)
    await fs.mkdir(scriptsDir, { recursive: true })

    const config = await readJsonConfig<CursorConfig>(configPath)
    config.version = 1
    if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
      config.hooks = {}
    }

    const stopSounds: StopSoundEntry[] = []
    const simpleEvents: Array<{ cursorEvent: string; aisEvent: SoundEvent; targets: AudioTargets }> = []

    for (const [eventKey, cursorEvent] of Object.entries(CURSOR_EVENT_MAP) as [SoundEvent, string][]) {
      const sound = ctx.manifest.sounds[eventKey]
      if (!sound) continue

      const mp3 = path.join(ctx.packDir, sound.file)

      if (cursorEvent === 'stop') {
        const status: 'completed' | 'error' = eventKey === 'task_complete' ? 'completed' : 'error'
        stopSounds.push({
          status,
          filePath: mp3,
          durationMs: sound.duration_ms,
        })
      } else {
        simpleEvents.push({
          cursorEvent,
          aisEvent: eventKey,
          targets: { mp3, durationMs: sound.duration_ms },
        })
      }
    }

    let entryCount = 0

    if (stopSounds.length > 0) {
      const scriptContent = generateStopScript(stopSounds)
      const scriptName = scriptFileName('stop', ctx.slug)
      await fs.writeFile(path.join(scriptsDir, scriptName), scriptContent, 'utf8')
      if (process.platform !== 'win32') {
        await fs.chmod(path.join(scriptsDir, scriptName), 0o755)
      }

      const scriptCmd = buildScriptCommand(ctx, scriptsDir, scriptName)
      const existing = config.hooks['stop'] ?? []
      const preserved = existing.filter((h) => !isAisoundsEntry(h))
      const entry: CursorHookEntry = {
        command: scriptCmd,
        _aisounds: { pack: ctx.slug, event: 'stop', version: '1' },
      }
      config.hooks['stop'] = [...preserved, entry]
      entryCount += 1
    }

    for (const { cursorEvent, aisEvent, targets } of simpleEvents) {
      const scriptContent = generateSimpleScript(targets)
      const scriptName = scriptFileName(cursorEvent, ctx.slug)
      await fs.writeFile(path.join(scriptsDir, scriptName), scriptContent, 'utf8')
      if (process.platform !== 'win32') {
        await fs.chmod(path.join(scriptsDir, scriptName), 0o755)
      }

      const scriptCmd = buildScriptCommand(ctx, scriptsDir, scriptName)
      const existing = config.hooks[cursorEvent] ?? []
      const preserved = existing.filter((h) => !isAisoundsEntry(h))
      const entry: CursorHookEntry = {
        command: scriptCmd,
        _aisounds: { pack: ctx.slug, event: aisEvent, version: '1' },
      }
      config.hooks[cursorEvent] = [...preserved, entry]
      entryCount += 1
    }

    await writeJsonConfig(configPath, config)
    return { configPath, entryCount }
  },

  async remove(ctx) {
    const cursorDir = resolveCursorDir(ctx)
    const configPath = path.join(cursorDir, 'hooks.json')
    const scriptsDir = path.join(cursorDir, HOOKS_SUBDIR, AISOUNDS_DIR)

    const config = await readJsonConfig<CursorConfig>(configPath)
    const hooks = config.hooks && typeof config.hooks === 'object' && !Array.isArray(config.hooks)
      ? config.hooks
      : {}

    let removedCount = 0
    for (const [eventName, entries] of Object.entries(hooks)) {
      if (!Array.isArray(entries)) continue
      const kept = entries.filter((e) => !isAisoundsEntry(e, ctx.slug))
      removedCount += entries.length - kept.length
      if (kept.length === 0) {
        delete hooks[eventName]
      } else {
        hooks[eventName] = kept
      }
    }

    if (Object.keys(hooks).length === 0) {
      delete config.hooks
      delete config.version
    } else {
      config.hooks = hooks
    }

    await writeJsonConfig(configPath, config)

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

function resolveCursorDir(ctx: InstallerContext): string {
  if (ctx.scope === 'global') {
    return path.join(os.homedir(), '.cursor')
  }
  return path.join(ctx.cwd, '.cursor')
}

function scriptFileName(cursorEvent: string, slug: string): string {
  const ext = process.platform === 'win32' ? '.ps1' : '.sh'
  return `${cursorEvent}-${slug}${ext}`
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
