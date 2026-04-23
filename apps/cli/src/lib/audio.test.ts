import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHookCommand, generateSimpleScript, generateStopScript } from './audio.js'

const originalPlatform = process.platform

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

describe('buildHookCommand', () => {
  beforeEach(() => {
    setPlatform(originalPlatform)
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('uses afplay on macOS', () => {
    setPlatform('darwin')
    const cmd = buildHookCommand({ ogg: '/tmp/x.ogg', durationMs: 1000 })
    expect(cmd).toContain('afplay')
    expect(cmd).toContain(path.resolve('/tmp/x.ogg'))
  })

  it('uses the paplay/ffplay/aplay chain on Linux', () => {
    setPlatform('linux')
    const cmd = buildHookCommand({ ogg: '/tmp/x.ogg', durationMs: 1000 })
    expect(cmd).toContain('paplay')
    expect(cmd).toContain('ffplay')
    expect(cmd).toContain('aplay')
  })

  it('uses WPF MediaPlayer with the MP3 file on Windows when mp3 is provided', () => {
    setPlatform('win32')
    const cmd = buildHookCommand({
      ogg: 'C:\\packs\\demo\\sounds\\task_complete.ogg',
      mp3: 'C:\\packs\\demo\\sounds\\task_complete.mp3',
      durationMs: 1200,
    })
    expect(cmd).toContain('PresentationCore')
    expect(cmd).toContain('MediaPlayer')
    expect(cmd).toContain('task_complete.mp3')
    expect(cmd).not.toMatch(/SoundPlayer/)
    expect(cmd).toContain('Start-Process')
    expect(cmd).toMatch(/Start-Sleep -Milliseconds \d+/)
  })

  it('falls back to SoundPlayer with the OGG on Windows when mp3 is missing', () => {
    setPlatform('win32')
    const cmd = buildHookCommand({
      ogg: 'C:\\packs\\demo\\sounds\\task_complete.ogg',
      durationMs: 1200,
    })
    expect(cmd).toContain('SoundPlayer')
    expect(cmd).toContain('task_complete.ogg')
    expect(cmd).not.toContain('PresentationCore')
  })
})

describe('generateStopScript', () => {
  it('generates a Windows script with PresentationCore that checks status', () => {
    const script = generateStopScript(
      [
        { status: 'completed', filePath: 'C:\\packs\\demo\\sounds\\task_complete.mp3', durationMs: 1000 },
        { status: 'error', filePath: 'C:\\packs\\demo\\sounds\\task_failed.mp3', durationMs: 800 },
      ],
      'win32',
    )
    expect(script).toContain('PresentationCore')
    expect(script).toContain('MediaPlayer')
    expect(script).toContain("'completed'")
    expect(script).toContain("'error'")
    expect(script).toContain("'aborted'")
    expect(script).toContain('task_complete.mp3')
    expect(script).toContain('task_failed.mp3')
    expect(script).toContain('Write-Output "{}"')
    expect(script).toContain('ConvertFrom-Json')
    expect(script).toContain('@($input)')
    expect(script).toContain('TrimStart')
    expect(script).toContain('0xFEFF')
    expect(script).toContain("IndexOf('{')")
    expect(script).toContain('Start-Sleep -Milliseconds 300')
    expect(script).toContain('$player.Close()')
  })

  it('generates a macOS script with afplay that checks status', () => {
    const script = generateStopScript(
      [
        { status: 'completed', filePath: '/packs/demo/sounds/task_complete.ogg', durationMs: 1000 },
        { status: 'error', filePath: '/packs/demo/sounds/task_failed.ogg', durationMs: 800 },
      ],
      'darwin',
    )
    expect(script).toContain('#!/bin/bash')
    expect(script).toContain('afplay')
    expect(script).toContain('"completed"')
    expect(script).toContain('"error"')
    expect(script).toContain('"aborted"')
    expect(script).toContain('task_complete.ogg')
    expect(script).toContain('task_failed.ogg')
    expect(script).toContain("echo '{}'")
  })

  it('generates a Linux script with paplay/ffplay/aplay chain', () => {
    const script = generateStopScript(
      [
        { status: 'completed', filePath: '/packs/demo/sounds/task_complete.ogg', durationMs: 1000 },
      ],
      'linux',
    )
    expect(script).toContain('#!/bin/bash')
    expect(script).toContain('paplay')
    expect(script).toContain('ffplay')
    expect(script).toContain('aplay')
    expect(script).toContain("echo '{}'")
  })
})

describe('generateSimpleScript', () => {
  it('generates a Windows script that drains stdin and plays sound', () => {
    const script = generateSimpleScript(
      { ogg: 'C:\\packs\\demo\\sounds\\prompt_sent.ogg', mp3: 'C:\\packs\\demo\\sounds\\prompt_sent.mp3', durationMs: 500 },
      'win32',
    )
    expect(script).toContain('PresentationCore')
    expect(script).toContain('@($input)')
    expect(script).toContain('Out-Null')
    expect(script).toContain('prompt_sent.mp3')
    expect(script).toContain('Write-Output "{}"')
    expect(script).toContain('Start-Sleep -Milliseconds 300')
    expect(script).toContain('$player.Close()')
  })

  it('generates a macOS script that drains stdin and plays sound', () => {
    const script = generateSimpleScript(
      { ogg: '/packs/demo/sounds/prompt_sent.ogg', durationMs: 500 },
      'darwin',
    )
    expect(script).toContain('#!/bin/bash')
    expect(script).toContain('cat > /dev/null')
    expect(script).toContain('afplay')
    expect(script).toContain("echo '{}'")
  })
})
