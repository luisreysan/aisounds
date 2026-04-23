import { ALL_EVENTS, type SoundEvent } from './events.js'

/**
 * Maps AISE events to the hook / callback names each AI coding tool uses in
 * its own configuration. Installers read these maps to inject non-destructive
 * config entries tagged with `_aisounds: true`.
 */

export type SupportedTool = 'cursor' | 'vscode' | 'claude-code' | 'windsurf' | 'aider'

export const CURSOR_EVENT_MAP: Partial<Record<SoundEvent, string>> = {
  task_complete: 'stop',
  task_failed: 'stop',
  session_start: 'sessionStart',
  prompt_sent: 'beforeSubmitPrompt',
  tool_called: 'preToolUse',
}

export const CLAUDE_EVENT_MAP: Partial<Record<SoundEvent, string>> = {
  task_complete: 'PostToolUse',
  prompt_sent: 'PreToolUse',
  approval_needed: 'Stop',
  notification: 'Notification',
}

export const VSCODE_EVENT_MAP: Partial<Record<SoundEvent, string>> = {
  task_complete: 'onChatResponseComplete',
  prompt_sent: 'onChatRequestSent',
  tool_called: 'onToolInvocation',
}

export const TOOL_EVENT_MAPS: Record<SupportedTool, Partial<Record<SoundEvent, string>>> = {
  cursor: CURSOR_EVENT_MAP,
  vscode: VSCODE_EVENT_MAP,
  'claude-code': CLAUDE_EVENT_MAP,
  // Windsurf and Aider installers will fill these in when implemented.
  windsurf: {},
  aider: {},
}

/**
 * Returns the AISE events that have at least one hook mapping in any of the
 * given tools. When the list is empty, returns ALL_EVENTS as a fallback.
 */
export function supportedEventsForTools(tools: SupportedTool[]): SoundEvent[] {
  if (tools.length === 0) return [...ALL_EVENTS]
  const supported = new Set<SoundEvent>()
  for (const tool of tools) {
    const map = TOOL_EVENT_MAPS[tool]
    if (!map) continue
    for (const event of Object.keys(map) as SoundEvent[]) {
      supported.add(event)
    }
  }
  return ALL_EVENTS.filter((e) => supported.has(e))
}

export interface ToolHookMapping {
  tool: SupportedTool
  hook: string
}

/**
 * Returns concrete hook mappings for a given AISE event across selected tools.
 * Some tools multiplex several AISE events into one hook (e.g. Cursor `stop`).
 */
export function hookMappingsForEvent(
  tools: SupportedTool[],
  event: SoundEvent,
): ToolHookMapping[] {
  const mappings: ToolHookMapping[] = []
  for (const tool of tools) {
    const hook = TOOL_EVENT_MAPS[tool][event]
    if (!hook) continue
    if (tool === 'cursor' && hook === 'stop') {
      if (event === 'task_complete') {
        mappings.push({ tool, hook: 'stop (status=completed)' })
        continue
      }
      if (event === 'task_failed') {
        mappings.push({ tool, hook: 'stop (status=error|aborted)' })
        continue
      }
    }
    mappings.push({ tool, hook })
  }
  return mappings
}

export interface ToolConfigLocation {
  mac: string[]
  windows: string[]
  linux: string[]
}

export const TOOL_PATHS: Record<SupportedTool, ToolConfigLocation> = {
  cursor: {
    mac: ['~/.cursor'],
    windows: ['%APPDATA%/Cursor'],
    linux: ['~/.config/cursor'],
  },
  vscode: {
    mac: ['~/.vscode'],
    windows: ['%APPDATA%/Code'],
    linux: ['~/.config/Code'],
  },
  'claude-code': {
    mac: ['~/.claude'],
    windows: ['%APPDATA%/claude'],
    linux: ['~/.claude'],
  },
  windsurf: {
    mac: ['~/.windsurf'],
    windows: ['%APPDATA%/Windsurf'],
    linux: ['~/.config/windsurf'],
  },
  aider: {
    mac: ['~/.aider'],
    windows: ['%APPDATA%/aider'],
    linux: ['~/.config/aider'],
  },
}
