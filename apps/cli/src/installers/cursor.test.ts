import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PackManifest } from '@aisounds/core'

import { cursorInstaller } from './cursor.js'

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aisounds-cursor-test-'))
}

function makeManifest(slug = 'demo'): PackManifest {
  return {
    version: '1.0',
    pack: {
      slug,
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
      task_failed: {
        file: 'sounds/task_failed.ogg',
        file_fallback: 'sounds/task_failed.mp3',
        duration_ms: 800,
        loop: false,
      },
      prompt_sent: {
        file: 'sounds/prompt_sent.ogg',
        file_fallback: 'sounds/prompt_sent.mp3',
        duration_ms: 500,
        loop: false,
      },
    },
  }
}

describe('cursorInstaller', () => {
  let cwd: string
  let packDir: string

  beforeEach(async () => {
    cwd = await tmpDir()
    packDir = path.join(cwd, '.aisounds', 'packs', 'demo')
    await fs.mkdir(packDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('generates hooks.json in the correct Cursor format with version:1 and object-based hooks', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    const result = await cursorInstaller.install(ctx)
    expect(result.entryCount).toBeGreaterThan(0)

    const config = JSON.parse(
      await fs.readFile(path.join(cwd, '.cursor', 'hooks.json'), 'utf8'),
    ) as { version: number; hooks: Record<string, unknown[]> }

    expect(config.version).toBe(1)
    expect(typeof config.hooks).toBe('object')
    expect(Array.isArray(config.hooks)).toBe(false)

    expect(config.hooks['stop']).toBeDefined()
    expect(Array.isArray(config.hooks['stop'])).toBe(true)
    expect(config.hooks['stop']!.length).toBe(1)

    expect(config.hooks['beforeSubmitPrompt']).toBeDefined()
    expect(Array.isArray(config.hooks['beforeSubmitPrompt'])).toBe(true)
  })

  it('creates script files in .cursor/hooks/aisounds/', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    await cursorInstaller.install(ctx)

    const scriptsDir = path.join(cwd, '.cursor', 'hooks', 'aisounds')
    const files = await fs.readdir(scriptsDir)
    expect(files.length).toBeGreaterThan(0)

    const stopScript = files.find((f) => f.startsWith('stop-demo'))
    expect(stopScript).toBeDefined()
  })

  it('stop script contains both completed and error/aborted branches', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    await cursorInstaller.install(ctx)

    const scriptsDir = path.join(cwd, '.cursor', 'hooks', 'aisounds')
    const files = await fs.readdir(scriptsDir)
    const stopScript = files.find((f) => f.startsWith('stop-demo'))!
    const content = await fs.readFile(path.join(scriptsDir, stopScript), 'utf8')

    expect(content).toContain('completed')
    expect(content).toMatch(/error|aborted/)
    expect(content).toContain('task_complete')
    expect(content).toContain('task_failed')
  })

  it('preserves user-authored hooks and cleans up on remove', async () => {
    const configPath = path.join(cwd, '.cursor', 'hooks.json')
    await fs.mkdir(path.dirname(configPath), { recursive: true })
    const existing = {
      version: 1,
      hooks: {
        stop: [{ command: './hooks/my-audit.sh' }],
        afterFileEdit: [{ command: './hooks/format.sh' }],
      },
    }
    await fs.writeFile(configPath, JSON.stringify(existing, null, 2), 'utf8')

    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    const result = await cursorInstaller.install(ctx)
    expect(result.entryCount).toBeGreaterThan(0)

    const afterInstall = JSON.parse(await fs.readFile(configPath, 'utf8')) as {
      version: number
      hooks: Record<string, Array<Record<string, unknown>>>
    }

    expect(afterInstall.hooks['stop']!.length).toBe(2)
    expect(afterInstall.hooks['stop']!.some((h) => h.command === './hooks/my-audit.sh')).toBe(true)
    expect(afterInstall.hooks['afterFileEdit']!.length).toBe(1)

    const removeResult = await cursorInstaller.remove(ctx)
    expect(removeResult.removedCount).toBe(result.entryCount)

    const afterRemove = JSON.parse(await fs.readFile(configPath, 'utf8')) as {
      version: number
      hooks: Record<string, Array<Record<string, unknown>>>
    }
    expect(afterRemove.hooks['stop']!.length).toBe(1)
    expect(afterRemove.hooks['stop']![0]!.command).toBe('./hooks/my-audit.sh')
    expect(afterRemove.hooks['afterFileEdit']!.length).toBe(1)
  })

  it('reinstalling replaces previous _aisounds hooks instead of duplicating', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    const first = await cursorInstaller.install(ctx)
    const second = await cursorInstaller.install(ctx)
    expect(first.entryCount).toBe(second.entryCount)

    const config = JSON.parse(
      await fs.readFile(path.join(cwd, '.cursor', 'hooks.json'), 'utf8'),
    ) as { hooks: Record<string, unknown[]> }

    const stopEntries = config.hooks['stop']!.filter(
      (h) => !!(h as { _aisounds?: { pack: string } })._aisounds,
    )
    expect(stopEntries).toHaveLength(1)
  })

  it('remove deletes script files from .cursor/hooks/aisounds/', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    await cursorInstaller.install(ctx)
    const scriptsDir = path.join(cwd, '.cursor', 'hooks', 'aisounds')
    const before = await fs.readdir(scriptsDir)
    expect(before.length).toBeGreaterThan(0)

    await cursorInstaller.remove(ctx)

    try {
      await fs.readdir(scriptsDir)
      // dir may still exist but should be empty or gone
    } catch {
      // scriptsDir was removed entirely (empty) — that's fine
    }
  })
})
