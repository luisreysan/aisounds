import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  bashSingleQuotedPath,
  buildHookCommand,
  buildPlayCommand,
  buildWindowsMp3HookForAsyncHost,
  generateSimpleScript,
  generateStopScript,
} from './audio.js'

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
    const cmd = buildHookCommand({ mp3: '/tmp/x.mp3', durationMs: 1000 })
    expect(cmd).toContain('afplay')
    expect(cmd).toContain(path.resolve('/tmp/x.mp3'))
  })

  it('uses the paplay/ffplay/mpv chain on Linux', () => {
    setPlatform('linux')
    const cmd = buildHookCommand({ mp3: '/tmp/x.mp3', durationMs: 1000 })
    expect(cmd).toContain('paplay')
    expect(cmd).toContain('ffplay')
    expect(cmd).toContain('mpv')
  })

  it('uses WPF MediaPlayer with the MP3 file on Windows', () => {
    setPlatform('win32')
    const cmd = buildHookCommand({
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
})

describe('bashSingleQuotedPath', () => {
  it('wraps paths and escapes single quotes for bash', () => {
    expect(bashSingleQuotedPath('/tmp/x.mp3')).toBe(`'/tmp/x.mp3'`)
    expect(bashSingleQuotedPath("/tmp/x's.mp3")).toBe(`'/tmp/x'\\''s.mp3'`)
  })
})

describe('buildPlayCommand', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  it('uses bash with paplay/ffplay/mpv chain on Linux like hooks', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    const { command, args } = buildPlayCommand({
      mp3: '/pack/sounds/ping.mp3',
      durationMs: 400,
    })
    expect(command).toBe('bash')
    expect(args[0]).toBe('-c')
    expect(args[1]).toContain('paplay')
    expect(args[1]).toContain('ffplay')
    expect(args[1]).toContain('mpv')
    expect(args[1]).toContain('no compatible Linux audio backend found')
    expect(args[1]).toMatch(/ping\.mp3/)
  })
})

describe('buildWindowsMp3HookForAsyncHost', () => {
  it('uses -EncodedCommand without Start-Process for Claude-style async hooks', () => {
    const cmd = buildWindowsMp3HookForAsyncHost('C:\\packs\\demo\\sounds\\x.mp3', 1200)
    expect(cmd).toContain('powershell.exe')
    expect(cmd).toContain('-EncodedCommand')
    expect(cmd).not.toContain('Start-Process')
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
        { status: 'completed', filePath: '/packs/demo/sounds/task_complete.mp3', durationMs: 1000 },
        { status: 'error', filePath: '/packs/demo/sounds/task_failed.mp3', durationMs: 800 },
      ],
      'darwin',
    )
    expect(script).toContain('#!/bin/bash')
    expect(script).toContain('afplay')
    expect(script).toContain('"completed"')
    expect(script).toContain('"error"')
    expect(script).toContain('"aborted"')
    expect(script).toContain('task_complete.mp3')
    expect(script).toContain('task_failed.mp3')
    expect(script).toContain("echo '{}'")
  })

  it('generates a Linux script with paplay/ffplay/mpv chain', () => {
    const script = generateStopScript(
      [
        { status: 'completed', filePath: '/packs/demo/sounds/task_complete.mp3', durationMs: 1000 },
      ],
      'linux',
    )
    expect(script).toContain('#!/bin/bash')
    expect(script).toContain('paplay')
    expect(script).toContain('ffplay')
    expect(script).toContain('mpv')
    expect(script).toContain("echo '{}'")
  })
})

describe('generateSimpleScript', () => {
  it('generates a Windows script that drains stdin and plays sound', () => {
    const script = generateSimpleScript(
      { mp3: 'C:\\packs\\demo\\sounds\\prompt_sent.mp3', durationMs: 500 },
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
      { mp3: '/packs/demo/sounds/prompt_sent.mp3', durationMs: 500 },
      'darwin',
    )
    expect(script).toContain('#!/bin/bash')
    expect(script).toContain('cat > /dev/null')
    expect(script).toContain('afplay')
    expect(script).toContain("echo '{}'")
  })
})
