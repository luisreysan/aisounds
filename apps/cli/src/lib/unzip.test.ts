import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import AdmZip from 'adm-zip'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PackManifest } from '@aisounds/core'

import { extractBundle } from './unzip.js'

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aisounds-unzip-test-'))
}

function validManifest(): PackManifest {
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
      task_complete: { file: 'sounds/task_complete.ogg', duration_ms: 1000, loop: false },
    },
  }
}

function makeZip(manifest: unknown): Buffer {
  const zip = new AdmZip()
  zip.addFile('aisounds.json', Buffer.from(JSON.stringify(manifest), 'utf8'))
  zip.addFile('sounds/task_complete.ogg', Buffer.from('fake-ogg'))
  return zip.toBuffer()
}

describe('extractBundle', () => {
  let root: string

  beforeEach(async () => {
    root = await tmpDir()
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('extracts and validates a well-formed bundle', async () => {
    const target = path.join(root, 'demo')
    const { manifest, dir } = await extractBundle(makeZip(validManifest()), target)

    expect(dir).toBe(target)
    expect(manifest.pack.slug).toBe('demo')
    await expect(fs.access(path.join(target, 'sounds', 'task_complete.ogg'))).resolves.toBeUndefined()
  })

  it('rejects a manifest missing the task_complete event', async () => {
    const bad = {
      ...validManifest(),
      sounds: { prompt_sent: { file: 'sounds/prompt_sent.ogg', duration_ms: 500, loop: false } },
    }
    await expect(
      extractBundle(makeZip(bad), path.join(root, 'demo')),
    ).rejects.toThrow(/task_complete/)
  })

  it('ignores zip entries that try to escape the target directory', async () => {
    const zip = new AdmZip()
    zip.addFile('../escape.txt', Buffer.from('nope'))
    zip.addFile('aisounds.json', Buffer.from(JSON.stringify(validManifest()), 'utf8'))
    zip.addFile('sounds/task_complete.ogg', Buffer.from('ogg'))

    const target = path.join(root, 'demo')
    await extractBundle(zip.toBuffer(), target)

    await expect(fs.access(path.join(root, 'escape.txt'))).rejects.toThrow()
    await expect(fs.access(path.join(target, 'aisounds.json'))).resolves.toBeUndefined()
  })

  it('rejects missing manifest', async () => {
    const zip = new AdmZip()
    zip.addFile('sounds/task_complete.ogg', Buffer.from('ogg'))
    await expect(extractBundle(zip.toBuffer(), path.join(root, 'demo'))).rejects.toThrow(
      /missing aisounds.json/,
    )
  })
})
