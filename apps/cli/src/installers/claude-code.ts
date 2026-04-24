import os from 'node:os'
import path from 'node:path'

import { CLAUDE_EVENT_MAP, type SoundEvent } from '@aisounds/core'

import { buildHookCommand } from '../lib/audio.js'
import { isAisoundsEntry, readJsonConfig, writeJsonConfig } from './config-io.js'
import type { Installer, InstallerContext } from './types.js'

type ClaudeHookEntry = {
  type: 'command'
  command: string
  _aisounds: { pack: string; event: string; version?: string }
}

type ClaudeMatcher = {
  matcher?: string
  hooks: unknown[]
  _aisounds?: { pack: string; event: string; version?: string }
}

type ClaudeHooksBlock = Record<string, unknown>

/**
 * Claude Code installer.
 *
 * Claude Code's settings live in `~/.claude/settings.json` (global) or
 * `<project>/.claude/settings.json` (project scope). Hooks are stored as:
 *
 * {
 *   "hooks": {
 *     "<EventName>": [
 *       { "matcher": "*", "hooks": [{ "type": "command", "command": "..." }] }
 *     ]
 *   }
 * }
 *
 * We write one matcher block per event with an `_aisounds` marker so remove
 * can filter it back out without touching user-authored blocks.
 */
export const claudeCodeInstaller: Installer = {
  tool: 'claude-code',
  label: 'Claude Code',

  async install(ctx) {
    const configPath = resolveConfigPath(ctx)
    const config = await readJsonConfig<Record<string, unknown>>(configPath)
    const hooks: ClaudeHooksBlock =
      (config.hooks as ClaudeHooksBlock | undefined) ?? {}

    let entryCount = 0
    for (const [eventKey, claudeEvent] of Object.entries(CLAUDE_EVENT_MAP) as [
      SoundEvent,
      string,
    ][]) {
      const sound = ctx.manifest.sounds[eventKey]
      if (!sound) continue

      const existing = Array.isArray(hooks[claudeEvent])
        ? (hooks[claudeEvent] as unknown[])
        : []
      const preserved = existing.filter((entry) => !isAisoundsEntry(entry))

      const ogg = path.join(ctx.packDir, sound.file)
      const mp3 = sound.file_fallback
        ? path.join(ctx.packDir, sound.file_fallback)
        : undefined
      const hookEntry: ClaudeHookEntry = {
        type: 'command',
        command: buildHookCommand({ ogg, mp3, durationMs: sound.duration_ms }),
        _aisounds: { pack: ctx.slug, event: eventKey, version: '1' },
      }

      const matcherBlock: ClaudeMatcher = {
        matcher: '*',
        hooks: [hookEntry],
        _aisounds: { pack: ctx.slug, event: eventKey, version: '1' },
      }

      hooks[claudeEvent] = [...preserved, matcherBlock]
      entryCount += 1
    }

    config.hooks = hooks
    await writeJsonConfig(configPath, config)
    return { configPath, entryCount }
  },

  async remove(ctx) {
    const configPath = resolveConfigPath(ctx)
    const config = await readJsonConfig<Record<string, unknown>>(configPath)
    const hooks = (config.hooks as ClaudeHooksBlock | undefined) ?? {}

    let removedCount = 0
    for (const [claudeEvent, value] of Object.entries(hooks)) {
      if (!Array.isArray(value)) continue
      const kept = (value as unknown[]).filter((entry) => !isAisoundsEntry(entry, ctx.slug))
      removedCount += (value as unknown[]).length - kept.length
      if (kept.length === 0) {
        delete hooks[claudeEvent]
      } else {
        hooks[claudeEvent] = kept
      }
    }

    if (Object.keys(hooks).length === 0) {
      delete config.hooks
    } else {
      config.hooks = hooks
    }

    await writeJsonConfig(configPath, config)
    return { configPath, removedCount }
  },
}

function resolveConfigPath(ctx: InstallerContext): string {
  if (ctx.scope === 'global') {
    return path.join(os.homedir(), '.claude', 'settings.json')
  }
  return path.join(ctx.cwd, '.claude', 'settings.json')
}
