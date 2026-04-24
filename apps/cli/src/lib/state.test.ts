import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PackManifest } from '@aisounds/core'

import {
  filterManifest,
  findInstalled,
  type InstalledPack,
  upsertInstalled,
  updateDisabledEvents,
} from './state.js'

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aisounds-state-test-'))
}

function makePack(cwd: string, slug = 'demo'): InstalledPack {
  return {
    slug,
    version: '1.0.0',
    name: 'Demo',
    tools: ['cursor'],
    scope: 'project',
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    packDir: path.join(cwd, '.aisounds', 'packs', slug),
  }
}

function makeManifest(): PackManifest {
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
      task_complete: { file: 'tc.ogg', file_fallback: 'tc.mp3', duration_ms: 1000, loop: false },
      task_failed: { file: 'tf.ogg', file_fallback: 'tf.mp3', duration_ms: 800, loop: false },
      prompt_sent: { file: 'ps.ogg', file_fallback: 'ps.mp3', duration_ms: 500, loop: false },
    },
  }
}

describe('filterManifest', () => {
  it('returns manifest unchanged when disabledEvents is undefined', () => {
    const manifest = makeManifest()
    const result = filterManifest(manifest, undefined)
    expect(result).toBe(manifest)
  })

  it('returns manifest unchanged when disabledEvents is empty', () => {
    const manifest = makeManifest()
    const result = filterManifest(manifest, [])
    expect(result).toBe(manifest)
  })

  it('removes disabled events from sounds', () => {
    const manifest = makeManifest()
    const result = filterManifest(manifest, ['task_failed', 'prompt_sent'])
    expect(Object.keys(result.sounds)).toEqual(['task_complete'])
    expect(result.sounds.task_complete).toBeDefined()
  })

  it('does not mutate the original manifest', () => {
    const manifest = makeManifest()
    filterManifest(manifest, ['task_failed'])
    expect(Object.keys(manifest.sounds)).toHaveLength(3)
  })
})

describe('updateDisabledEvents', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await tmpDir()
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('persists disabledEvents on an installed pack', async () => {
    const pack = makePack(cwd)
    await upsertInstalled(pack, cwd)

    await updateDisabledEvents('demo', 'project', ['task_failed'], cwd)

    const found = await findInstalled('demo', cwd)
    expect(found?.disabledEvents).toEqual(['task_failed'])
  })

  it('clears disabledEvents when passed empty array', async () => {
    const pack = makePack(cwd)
    pack.disabledEvents = ['task_failed']
    await upsertInstalled(pack, cwd)

    await updateDisabledEvents('demo', 'project', [], cwd)

    const found = await findInstalled('demo', cwd)
    expect(found?.disabledEvents).toBeUndefined()
  })

  it('throws when pack is not installed', async () => {
    await expect(
      updateDisabledEvents('nonexistent', 'project', ['task_failed'], cwd),
    ).rejects.toThrow('not installed')
  })
})
