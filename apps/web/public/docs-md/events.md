# AISE events reference

**AISE** (AI Sound Events) is the canonical vocabulary every pack maps its sounds against. Pack authors target AISE; tool installers translate AISE into the native hook names of each tool.

Only `task_complete` is **required** in a pack — every other event is optional.

## All AISE events

| Event | Required | Group | Description |
|-------|:--------:|-------|-------------|
| `task_complete` | yes | Agent | Agent finished the current task successfully |
| `task_failed` |  | Agent | Agent stopped with an error or was aborted |
| `subtask_complete` |  | Agent | A subtask within a larger task finished |
| `subtask_failed` |  | Agent | A subtask within a larger task failed |
| `prompt_sent` |  | User | The user submitted a prompt |
| `approval_needed` |  | User | The agent is requesting user permission |
| `approval_granted` |  | User | The user approved a request |
| `approval_denied` |  | User | The user denied a request |
| `thinking_start` |  | Processing | The agent began reasoning |
| `thinking_end` |  | Processing | The agent finished reasoning |
| `tool_called` |  | Processing | The agent invoked a tool |
| `tool_complete` |  | Processing | A tool invocation finished |
| `file_created` |  | Files | A file was created |
| `file_modified` |  | Files | A file was modified |
| `file_deleted` |  | Files | A file was deleted |
| `session_start` |  | Session | A new agent session started |
| `session_end` |  | Session | An agent session ended |
| `session_error` |  | Session | An agent session crashed |
| `notification` |  | Special | A generic notification |
| `warning` |  | Special | A non-fatal warning |
| `celebration` |  | Special | A milestone or celebration |

All sounds must be **<= 10 seconds** long. The `loop` flag is forbidden except optionally on `thinking_start`.

## Tool mappings

Not every tool exposes every AISE event. The CLI only writes hooks for the events a tool actually supports.

### Cursor

Hooks live in `.cursor/hooks.json` (project) or `~/.cursor/hooks.json` (global). Cursor multiplexes both task results into the single `stop` hook with a `status` field.

| AISE event | Cursor hook |
|------------|-------------|
| `task_complete` | `stop` (when `status=completed`) |
| `task_failed` | `stop` (when `status=error` or `status=aborted`) |
| `prompt_sent` | `beforeSubmitPrompt` |
| `tool_called` | `preToolUse` |
| `session_start` | `sessionStart` |

### Claude Code

Hooks live under `hooks` in `.claude/settings.json` (project) or `~/.claude/settings.json` (global). Claude Code distinguishes success and failure into two separate hooks.

| AISE event | Claude Code hook |
|------------|------------------|
| `task_complete` | `Stop` |
| `task_failed` | `StopFailure` |
| `session_start` | `SessionStart` |
| `session_end` | `SessionEnd` |
| `prompt_sent` | `UserPromptSubmit` |
| `approval_needed` | `PermissionRequest` |
| `notification` | `Notification` |

### VS Code (planned)

| AISE event | VS Code hook |
|------------|--------------|
| `task_complete` | `onChatResponseComplete` |
| `prompt_sent` | `onChatRequestSent` |
| `tool_called` | `onToolInvocation` |

### Windsurf, Aider (planned)

These installers are stubs today and will be filled in as the integrations mature.

## How a pack maps events

Pack manifests use AISE keys directly. Example fragment of a `aisounds.json`:

```json
{
  "sounds": {
    "task_complete": {
      "file": "sounds/task_complete.ogg",
      "file_fallback": "sounds/task_complete.mp3",
      "duration_ms": 1200,
      "loop": false
    },
    "task_failed": {
      "file": "sounds/task_failed.ogg",
      "file_fallback": "sounds/task_failed.mp3",
      "duration_ms": 1800,
      "loop": false
    }
  }
}
```

The CLI never asks you which tool hook to wire each sound to — the AISE -> tool mappings above are applied automatically based on the `--tool` flag.
