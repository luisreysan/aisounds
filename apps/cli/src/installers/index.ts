import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { SupportedTool } from '@aisounds/core'

import { claudeCodeInstaller } from './claude-code.js'
import { cursorInstaller } from './cursor.js'
import { createStubInstaller } from './stub.js'
import type { Installer } from './types.js'

const INSTALLERS: Record<SupportedTool, Installer> = {
  cursor: cursorInstaller,
  'claude-code': claudeCodeInstaller,
  vscode: createStubInstaller('vscode', 'VS Code + Copilot'),
  windsurf: createStubInstaller('windsurf', 'Windsurf'),
  aider: createStubInstaller('aider', 'Aider'),
}

export const SUPPORTED_TOOLS: SupportedTool[] = Object.keys(INSTALLERS) as SupportedTool[]

export function isSupportedTool(value: string): value is SupportedTool {
  return (SUPPORTED_TOOLS as string[]).includes(value)
}

export function getInstaller(tool: SupportedTool): Installer {
  return INSTALLERS[tool]
}

/**
 * Heuristic tool detection. Looks for well-known config directories first in
 * the current project, then in `$HOME`. Returns `null` when nothing obvious
 * is found so the caller can error out with a useful message.
 */
export async function detectTool(
  cwd: string = process.cwd(),
): Promise<SupportedTool | null> {
  const projectProbes: Array<[SupportedTool, string]> = [
    ['cursor', path.join(cwd, '.cursor')],
    ['claude-code', path.join(cwd, '.claude')],
    ['vscode', path.join(cwd, '.vscode')],
  ]
  for (const [tool, probe] of projectProbes) {
    if (await exists(probe)) return tool
  }

  const home = os.homedir()
  const globalProbes: Array<[SupportedTool, string]> = [
    ['cursor', path.join(home, '.cursor')],
    ['claude-code', path.join(home, '.claude')],
  ]
  for (const [tool, probe] of globalProbes) {
    if (await exists(probe)) return tool
  }

  return null
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export type { Installer } from './types.js'
