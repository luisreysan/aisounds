import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PackManifest } from '@aisounds/core'

import { claudeCodeInstaller } from './claude-code.js'

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aisounds-claude-test-'))
}

function manifest(): PackManifest {
  return {
    version: '1.0',
    pack: {
      slug: 'demo',
      name: 'Demo',
      author: 'tester',
      license: 'CC0',
      tags: [],
      aise_version: '1.0',
    },
    sounds: {
      task_complete: {
        file: 'sounds/task_complete.ogg',
        file_fallback: 'sounds/task_complete.mp3',
        duration_ms: 1000,
        loop: false,
      },
      notification: {
        file: 'sounds/notification.ogg',
        file_fallback: 'sounds/notification.mp3',
        duration_ms: 500,
        loop: false,
      },
      approval_needed: {
        file: 'sounds/approval_needed.ogg',
        file_fallback: 'sounds/approval_needed.mp3',
        duration_ms: 700,
        loop: false,
      },
    },
  }
}

describe('claudeCodeInstaller', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await tmpDir()
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('adds matcher blocks for every mapped event and removes them cleanly', async () => {
    const configPath = path.join(cwd, '.claude', 'settings.json')
    const ctx = {
      slug: 'demo',
      packDir: path.join(cwd, '.aisounds', 'packs', 'demo'),
      manifest: manifest(),
      scope: 'project' as const,
      cwd,
    }

    const result = await claudeCodeInstaller.install(ctx)
    expect(result.entryCount).toBeGreaterThan(0)
    expect(result.configPath).toBe(configPath)

    const afterInstall = JSON.parse(await fs.readFile(configPath, 'utf8')) as {
      hooks: Record<string, unknown[]>
    }
    expect(Object.keys(afterInstall.hooks).length).toBeGreaterThan(0)
    expect(afterInstall.hooks.PermissionRequest).toBeDefined()
    const stopMatchers = afterInstall.hooks.Stop as Array<{ hooks?: Array<{ async?: boolean }> }>
    expect(stopMatchers[0]?.hooks?.[0]?.async).toBe(true)

    const removeResult = await claudeCodeInstaller.remove(ctx)
    expect(removeResult.removedCount).toBeGreaterThan(0)

    const afterRemove = JSON.parse(await fs.readFile(configPath, 'utf8')) as Record<string, unknown>
    expect(afterRemove.hooks).toBeUndefined()
  })

  it('keeps unrelated user hooks intact', async () => {
    const configPath = path.join(cwd, '.claude', 'settings.json')
    await fs.mkdir(path.dirname(configPath), { recursive: true })
    const existing = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo user-hook' }],
          },
        ],
      },
      permissions: { default: 'ask' },
    }
    await fs.writeFile(configPath, JSON.stringify(existing, null, 2), 'utf8')

    const ctx = {
      slug: 'demo',
      packDir: path.join(cwd, '.aisounds', 'packs', 'demo'),
      manifest: manifest(),
      scope: 'project' as const,
      cwd,
    }

    await claudeCodeInstaller.install(ctx)
    await claudeCodeInstaller.remove(ctx)

    const afterRemove = JSON.parse(await fs.readFile(configPath, 'utf8')) as {
      hooks: { PostToolUse: Array<{ matcher: string }> }
      permissions: { default: string }
    }
    expect(afterRemove.permissions.default).toBe('ask')
    expect(afterRemove.hooks.PostToolUse).toHaveLength(1)
    expect(afterRemove.hooks.PostToolUse[0]?.matcher).toBe('Bash')
  })
})
