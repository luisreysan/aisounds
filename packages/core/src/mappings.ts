import type { SoundEvent } from './events.js'

/**
 * Maps AISE events to the hook / callback names each AI coding tool uses in
 * its own configuration. Installers read these maps to inject non-destructive
 * config entries tagged with `_aisounds: true`.
 */

export type SupportedTool = 'cursor' | 'vscode' | 'claude-code' | 'windsurf' | 'aider'

export const CURSOR_EVENT_MAP: Partial<Record<SoundEvent, string>> = {
  task_complete: 'onAgentTaskComplete',
  prompt_sent: 'onPromptSubmit',
  tool_called: 'onToolCall',
  approval_needed: 'onApprovalRequired',
  session_start: 'onSessionStart',
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
