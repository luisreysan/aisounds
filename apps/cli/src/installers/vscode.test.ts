import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PackManifest } from '@aisounds/core'

import { vscodeInstaller } from './vscode.js'

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aisounds-vscode-test-'))
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
        file: 'sounds/task_complete.mp3',
        duration_ms: 1000,
        loop: false,
      },
      prompt_sent: {
        file: 'sounds/prompt_sent.mp3',
        duration_ms: 500,
        loop: false,
      },
      tool_called: {
        file: 'sounds/tool_called.mp3',
        duration_ms: 600,
        loop: false,
      },
    },
  }
}

describe('vscodeInstaller', () => {
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

  it('writes aisounds.json and scripts under .vscode/aisounds', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    const result = await vscodeInstaller.install(ctx)
    expect(result.entryCount).toBe(3)

    const config = JSON.parse(
      await fs.readFile(path.join(cwd, '.vscode', 'aisounds.json'), 'utf8'),
    ) as {
      version: number
      pack: string
      hooks: Record<string, { _aisounds: { pack: string } }>
    }

    expect(config.version).toBe(1)
    expect(config.pack).toBe('demo')
    expect(config.hooks.onChatResponseComplete?._aisounds.pack).toBe('demo')

    const scripts = await fs.readdir(path.join(cwd, '.vscode', 'aisounds'))
    expect(scripts.some((f) => f.includes('onChatResponseComplete-demo'))).toBe(true)
  })

  it('remove deletes aisounds.json and pack scripts without touching unrelated files', async () => {
    const ctx = {
      slug: 'demo',
      packDir,
      manifest: makeManifest(),
      scope: 'project' as const,
      cwd,
    }

    await vscodeInstaller.install(ctx)
    await fs.writeFile(
      path.join(cwd, '.vscode', 'settings.json'),
      JSON.stringify({ 'editor.fontSize': 14 }, null, 2),
      'utf8',
    )

    const result = await vscodeInstaller.remove(ctx)
    expect(result.removedCount).toBeGreaterThan(0)

    await expect(fs.access(path.join(cwd, '.vscode', 'aisounds.json'))).rejects.toThrow()
    const settings = JSON.parse(
      await fs.readFile(path.join(cwd, '.vscode', 'settings.json'), 'utf8'),
    ) as { 'editor.fontSize': number }
    expect(settings['editor.fontSize']).toBe(14)
  })
})
