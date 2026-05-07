import { spawn } from 'node:child_process'
import path from 'node:path'

export interface AudioTargets {
  /** Absolute path to the MP3 file. */
  mp3: string
  /** Duration of the sound in milliseconds, used to keep Windows players alive. */
  durationMs: number
}

/**
 * Returns the shell snippet a tool hook should execute to play the given
 * sound. Picks the format the host OS can reliably play without extra
 * codecs:
 *
 *   - macOS  →  `afplay <mp3>`
 *   - Linux  →  chain of paplay / ffplay / mpv (best-effort)
 *   - Windows → WPF `System.Windows.Media.MediaPlayer` with the MP3 file.
 *     The player is launched through `Start-Process` so the caller (Cursor
 *     hook, Claude Code hook, etc.) does not block for the duration of the
 *     clip.
 */
export function buildHookCommand(targets: AudioTargets): string {
  const mp3 = path.resolve(targets.mp3)
  if (process.platform === 'darwin') {
    return `afplay "${mp3}" >/dev/null 2>&1 &`
  }

  if (process.platform === 'win32') {
    return buildWindowsMp3Hook(targets.mp3, targets.durationMs)
  }

  const quotedPath = bashSingleQuotedPath(mp3)
  return `${buildLinuxPlayCommand(quotedPath)} >/dev/null 2>&1 &`
}

/**
 * Plays a sound in-process. Used by `aisounds preview`; never by hooks.
 * Resolves once the player process exits (or immediately on Windows, since
 * the detached Start-Process returns right away).
 */
export function playFile(targets: AudioTargets): Promise<void> {
  const { command, args } = buildPlayCommand(targets)
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: false,
      windowsHide: true,
    })
    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (!code || code === 0) {
        resolve()
        return
      }
      const message = stderr.trim() || `Audio player failed with exit code ${code}`
      reject(new Error(message))
    })
  })
}

function buildWindowsMp3Hook(mp3AbsPath: string, durationMs: number): string {
  const safePath = path.resolve(mp3AbsPath).replace(/'/g, "''")
  const waitMs = Math.max(500, durationMs + 1500)
  const inner =
    `Add-Type -AssemblyName PresentationCore; ` +
    `$p = New-Object System.Windows.Media.MediaPlayer; ` +
    `$p.Open([uri]'${safePath}'); Start-Sleep -Milliseconds 300; $p.Play(); ` +
    `Start-Sleep -Milliseconds ${waitMs}; $p.Close()`

  const escapedInner = inner.replace(/"/g, '\\"')
  return (
    `powershell -NoProfile -WindowStyle Hidden -Command ` +
    `"Start-Process powershell -WindowStyle Hidden -ArgumentList ` +
    `'-NoProfile','-WindowStyle','Hidden','-Command',` +
    `\\"${escapedInner}\\""`
  )
}

/**
 * Windows MP3 playback for hosts that invoke hooks with `async: true` (e.g. Claude Code).
 * Nested `Start-Process` in {@link buildWindowsMp3Hook} can exit before the child process
 * plays audio. This runs playback in a single PowerShell process using `-EncodedCommand`
 * so quoting survives JSON and cmd.exe.
 */
export function buildWindowsMp3HookForAsyncHost(mp3AbsPath: string, durationMs: number): string {
  const safePath = path.resolve(mp3AbsPath).replace(/'/g, "''")
  const waitMs = Math.max(500, durationMs + 1500)
  const script =
    `Add-Type -AssemblyName PresentationCore *>&1 | Out-Null; ` +
    `$p = New-Object System.Windows.Media.MediaPlayer; ` +
    `$p.Open([uri]'${safePath}'); Start-Sleep -Milliseconds 300; $p.Play(); ` +
    `Start-Sleep -Milliseconds ${waitMs}; $p.Close()`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  return `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`
}

/** Shell-safe single-quote for `bash -c` (escaped internal `'` → `'\''`). */
export function bashSingleQuotedPath(absPath: string): string {
  return `'${absPath.replace(/'/g, `'\\''`)}'`
}

/**
 * Spawn args used by {@link playFile}. On Linux/other Unix hooks use paplay/ffplay/mpv;
 * preview prints a warning when no supported backend is available.
 */
export function buildPlayCommand(targets: AudioTargets): { command: string; args: string[] } {
  const mp3 = path.resolve(targets.mp3)
  if (process.platform === 'darwin') {
    return { command: 'afplay', args: [mp3] }
  }
  if (process.platform === 'win32') {
    const safePath = mp3.replace(/'/g, "''")
    const waitMs = Math.max(500, targets.durationMs + 1500)
    return {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-WindowStyle',
        'Hidden',
        '-Command',
        `Add-Type -AssemblyName PresentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([uri]'${safePath}'); Start-Sleep -Milliseconds 300; $p.Play(); Start-Sleep -Milliseconds ${waitMs}; $p.Close()`,
      ],
    }
  }
  const quotedPath = bashSingleQuotedPath(mp3)
  const compound = buildLinuxPlayCommand(quotedPath, true)
  return {
    command: 'bash',
    args: ['-c', compound],
  }
}

function buildLinuxPlayCommand(quotedPath: string, warnOnFailure = false): string {
  const chain =
    `(command -v paplay >/dev/null && paplay ${quotedPath} ` +
    `|| command -v ffplay >/dev/null && ffplay -nodisp -autoexit -loglevel quiet ${quotedPath} ` +
    `|| command -v mpv >/dev/null && mpv --no-video --no-terminal --really-quiet ${quotedPath})`
  if (!warnOnFailure) return chain
  return (
    `${chain} || { ` +
    `printf '%s\\n' 'aisounds: no compatible Linux audio backend found. Install paplay (pulseaudio-utils), ffplay (ffmpeg), or mpv.' >&2; ` +
    'exit 1; }'
  )
}

// ---------------------------------------------------------------------------
// Cursor hook script generators
//
// Cursor hooks receive JSON via stdin and must respond with JSON on stdout.
// We generate platform-specific scripts that the installer writes to disk.
// ---------------------------------------------------------------------------

export interface StopSoundEntry {
  status: 'completed' | 'error'
  filePath: string
  durationMs: number
}

/**
 * Generates the content of a `stop` hook script. The script reads stdin JSON,
 * checks the `status` field, and plays the matching sound file.
 *
 * - `completed` maps to `task_complete`
 * - `error` and `aborted` map to `task_failed`
 */
export function generateStopScript(
  sounds: StopSoundEntry[],
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === 'win32') {
    return generateStopScriptWindows(sounds)
  }
  return generateStopScriptUnix(sounds, platform)
}

/**
 * Generates a simple hook script that drains stdin, plays one sound, and
 * writes `{}` to stdout. Used for events that don't carry discriminating
 * payload (e.g. `sessionStart`, `beforeSubmitPrompt`).
 */
export function generateSimpleScript(
  targets: AudioTargets,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === 'win32') {
    return generateSimpleScriptWindows(targets)
  }
  return generateSimpleScriptUnix(targets, platform)
}

function generateStopScriptWindows(sounds: StopSoundEntry[]): string {
  const completed = sounds.find((s) => s.status === 'completed')
  const errored = sounds.find((s) => s.status === 'error')
  const maxWait = Math.max(
    ...sounds.map((s) => s.durationMs + 1500),
    500,
  )

  const lines: string[] = [
    '$rawInput = @($input) -join "`n"',
    'if (-not $rawInput -or $rawInput.Trim() -eq \'\') { Write-Output "{}"; exit 0 }',
    '$clean = $rawInput.TrimStart([char]0xFEFF, [char]0xFFFE, [char]0xEF, [char]0xBB, [char]0xBF).Trim()',
    '$jsonStart = $clean.IndexOf(\'{\')',
    '$jsonEnd = $clean.LastIndexOf(\'}\')',
    'if ($jsonStart -ge 0 -and $jsonEnd -gt $jsonStart) { $clean = $clean.Substring($jsonStart, $jsonEnd - $jsonStart + 1) }',
    'try { $hookData = $clean | ConvertFrom-Json -ErrorAction Stop } catch { Write-Output "{}"; exit 0 }',
    '$mp3 = $null',
  ]

  if (completed) {
    const p = path.resolve(completed.filePath).replace(/'/g, "''")
    lines.push(`if ($hookData.status -eq 'completed') { $mp3 = '${p}' }`)
  }
  if (errored) {
    const p = path.resolve(errored.filePath).replace(/'/g, "''")
    const clause = completed ? 'elseif' : 'if'
    lines.push(`${clause} ($hookData.status -eq 'error' -or $hookData.status -eq 'aborted') { $mp3 = '${p}' }`)
  }

  lines.push(
    'if (-not $mp3) { Write-Output "{}"; exit 0 }',
    'try {',
    '  Add-Type -AssemblyName PresentationCore *>&1 | Out-Null',
    '  $player = New-Object System.Windows.Media.MediaPlayer',
    '  $player.Open([uri]$mp3)',
    '  Start-Sleep -Milliseconds 300',
    '  $player.Play()',
    `  Start-Sleep -Milliseconds ${maxWait}`,
    '  $player.Close()',
    '} catch {}',
    'Write-Output "{}"',
  )

  return lines.join('\r\n') + '\r\n'
}

function generateStopScriptUnix(sounds: StopSoundEntry[], platform: NodeJS.Platform): string {
  const completed = sounds.find((s) => s.status === 'completed')
  const errored = sounds.find((s) => s.status === 'error')

  const playCmd = (filePath: string) => {
    const resolved = path.resolve(filePath)
    if (platform === 'darwin') {
      return `afplay "${resolved}" >/dev/null 2>&1 &`
    }
    const quotedPath = bashSingleQuotedPath(resolved)
    return `${buildLinuxPlayCommand(quotedPath)} >/dev/null 2>&1 &`
  }

  const lines: string[] = [
    '#!/bin/bash',
    'INPUT=$(cat)',
    'STATUS=$(echo "$INPUT" | grep -o \'"status":"[^"]*"\' | head -1 | cut -d\'"\' -f4)',
  ]

  if (completed) {
    lines.push(`if [ "$STATUS" = "completed" ]; then`)
    lines.push(`  ${playCmd(completed.filePath)}`)
  }
  if (errored) {
    const clause = completed ? 'elif' : 'if'
    lines.push(`${clause} [ "$STATUS" = "error" ] || [ "$STATUS" = "aborted" ]; then`)
    lines.push(`  ${playCmd(errored.filePath)}`)
  }
  if (completed || errored) {
    lines.push('fi')
  }

  lines.push("echo '{}'")

  return lines.join('\n') + '\n'
}

function generateSimpleScriptWindows(targets: AudioTargets): string {
  const safePath = path.resolve(targets.mp3).replace(/'/g, "''")
  const waitMs = Math.max(500, targets.durationMs + 1500)

  return [
    '@($input) | Out-Null',
    'try {',
    '  Add-Type -AssemblyName PresentationCore *>&1 | Out-Null',
    '  $player = New-Object System.Windows.Media.MediaPlayer',
    `  $player.Open([uri]'${safePath}')`,
    '  Start-Sleep -Milliseconds 300',
    '  $player.Play()',
    `  Start-Sleep -Milliseconds ${waitMs}`,
    '  $player.Close()',
    '} catch {}',
    'Write-Output "{}"',
  ].join('\r\n') + '\r\n'
}

function generateSimpleScriptUnix(targets: AudioTargets, platform: NodeJS.Platform): string {
  const resolved = path.resolve(targets.mp3)
  let playLine: string
  if (platform === 'darwin') {
    playLine = `afplay "${resolved}" >/dev/null 2>&1 &`
  } else {
    const quotedPath = bashSingleQuotedPath(resolved)
    playLine = `${buildLinuxPlayCommand(quotedPath)} >/dev/null 2>&1 &`
  }

  return [
    '#!/bin/bash',
    'cat > /dev/null',
    playLine,
    "echo '{}'",
  ].join('\n') + '\n'
}
