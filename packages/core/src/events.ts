/**
 * AISE (AI Sound Events) Standard v1.0
 *
 * Canonical event vocabulary shared by the web app, the CLI and all tool
 * installers. Every sound pack maps its audio files to one or more of these
 * events. Tools translate these events to their own hook names via the maps
 * in `./mappings`.
 */

export type SoundEvent =
  // Core Agent Events
  | 'task_complete'
  | 'task_failed'
  | 'subtask_complete'
  | 'subtask_failed'
  // User Interaction Events
  | 'prompt_sent'
  | 'approval_needed'
  | 'approval_granted'
  | 'approval_denied'
  // Processing State Events
  | 'thinking_start'
  | 'thinking_end'
  | 'tool_called'
  | 'tool_complete'
  // File System Events
  | 'file_created'
  | 'file_modified'
  | 'file_deleted'
  // Session Events
  | 'session_start'
  | 'session_end'
  | 'session_error'
  // Special
  | 'notification'
  | 'warning'
  | 'celebration'

export interface EventSpecEntry {
  required: boolean
  maxMs: number
  loop: boolean | 'optional'
}

export const EVENT_SPEC = {
  task_complete: { required: true, maxMs: 10000, loop: false },
  task_failed: { required: false, maxMs: 10000, loop: false },
  subtask_complete: { required: false, maxMs: 10000, loop: false },
  subtask_failed: { required: false, maxMs: 10000, loop: false },
  prompt_sent: { required: false, maxMs: 10000, loop: false },
  approval_needed: { required: false, maxMs: 10000, loop: false },
  approval_granted: { required: false, maxMs: 10000, loop: false },
  approval_denied: { required: false, maxMs: 10000, loop: false },
  thinking_start: { required: false, maxMs: 10000, loop: 'optional' },
  thinking_end: { required: false, maxMs: 10000, loop: false },
  tool_called: { required: false, maxMs: 10000, loop: false },
  tool_complete: { required: false, maxMs: 10000, loop: false },
  file_created: { required: false, maxMs: 10000, loop: false },
  file_modified: { required: false, maxMs: 10000, loop: false },
  file_deleted: { required: false, maxMs: 10000, loop: false },
  session_start: { required: false, maxMs: 10000, loop: false },
  session_end: { required: false, maxMs: 10000, loop: false },
  session_error: { required: false, maxMs: 10000, loop: false },
  notification: { required: false, maxMs: 10000, loop: false },
  warning: { required: false, maxMs: 10000, loop: false },
  celebration: { required: false, maxMs: 10000, loop: false },
} as const satisfies Record<SoundEvent, EventSpecEntry>

export const ALL_EVENTS = Object.keys(EVENT_SPEC) as SoundEvent[]

export const REQUIRED_EVENTS: SoundEvent[] = ALL_EVENTS.filter(
  (event) => EVENT_SPEC[event].required,
)

export function isSoundEvent(value: string): value is SoundEvent {
  return value in EVENT_SPEC
}
