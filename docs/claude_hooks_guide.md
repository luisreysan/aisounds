# Claude Code Hooks Guide

## Overview

Hooks are custom commands that execute at specific events in Claude Code's lifecycle. You can attach a sound-playing command to any hook to get audio notifications for different events.

**Total Hooks Available: 28**

---

## All Available Hooks

### 1. Tool & Interaction Hooks (6 hooks)

| Hook | When It Fires | Use Case |
|------|---|---|
| **PreToolUse** | Before a tool runs (can block execution) | Validate/verify before action, play warning sound |
| **PostToolUse** | After a tool succeeds | Confirm successful action, play success sound |
| **PostToolUseFailure** | After a tool fails | Alert to failures, play error sound |
| **PostToolBatch** | After a batch of tools completes | Notify when bulk operations finish |
| **PermissionRequest** | Before a permission prompt appears | Warn before requesting permission |
| **PermissionDenied** | When permission is denied | Alert when action is blocked |

---

### 2. User Input Hooks (3 hooks)

| Hook | When It Fires | Use Case |
|------|---|---|
| **UserPromptSubmit** | When you submit a prompt | Confirm submission, play notification sound |
| **UserPromptExpansion** | When a prompt is expanded | Track prompt modifications |
| **Notification** | When a notification appears | React to system notifications |

---

### 3. Session Lifecycle Hooks (5 hooks)

| Hook | When It Fires | Use Case |
|------|---|---|
| **SessionStart** | When a new session begins | Play welcome/startup sound |
| **SessionEnd** | When session ends | Play goodbye sound |
| **Setup** | Initial setup phase | Configure startup behavior |
| **Stop** | When Claude stops responding | Play completion sound ⭐ Most common for task finish |
| **StopFailure** | When stopping fails | Alert to failure in stopping process |

---

### 4. Agent & Task Hooks (4 hooks)

| Hook | When It Fires | Use Case |
|------|---|---|
| **SubagentStart** | Before a subagent starts | Notify when delegating work |
| **SubagentStop** | When a subagent stops | Alert when delegated work completes |
| **TaskCreated** | When a task is created | Play notification sound |
| **TaskCompleted** | When a task is marked complete | Play success sound ⭐ Good for task finish |

---

### 5. System & File Hooks (6 hooks)

| Hook | When It Fires | Use Case |
|------|---|---|
| **PreCompact** | Before conversation compacting starts | Warn before context compression |
| **PostCompact** | After conversation compacting completes | Notify after cleanup |
| **ConfigChange** | When settings are modified | Alert to config changes |
| **WorktreeCreate** | When a git worktree is created | Notify worktree setup |
| **WorktreeRemove** | When a worktree is removed | Notify worktree removal |
| **InstructionsLoaded** | When CLAUDE.md is loaded | Track instruction updates |
| **CwdChanged** | When working directory changes | Track directory switches |
| **FileChanged** | When a file is modified | Alert to file changes |

---

### 6. Special Hooks (4 hooks)

| Hook | When It Fires | Use Case |
|------|---|---|
| **Elicitation** | When Claude needs more info | Request user input sound |
| **ElicitationResult** | After user provides requested info | Acknowledge received info |
| **TeammateIdle** | When a teammate becomes idle | Alert to teammate status |
| N/A | N/A | N/A |

---

## How to Use Hooks with Sounds

### Basic Hook Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "YOUR_SOUND_COMMAND_HERE",
            "statusMessage": "Playing sound...",
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## Sound Command Examples for Windows

### 1. System Beep (Simplest)
```json
"command": "powershell -Command \"[console]::beep()\""
```

### 2. Windows Notification Sound
```json
"command": "powershell -Command \"[System.Media.SystemSounds]::Beep.Play()\""
```

### 3. Asterisk Sound
```json
"command": "powershell -Command \"[System.Media.SystemSounds]::Asterisk.Play()\""
```

### 4. Exclamation Sound
```json
"command": "powershell -Command \"[System.Media.SystemSounds]::Exclamation.Play()\""
```

### 5. Question Sound
```json
"command": "powershell -Command \"[System.Media.SystemSounds]::Question.Play()\""
```

### 6. Play Custom Audio File
```json
"command": "powershell -Command \"(New-Object Media.SoundPlayer 'C:\\path\\to\\sound.wav').PlaySync()\""
```

### 7. Using ffplay (if installed)
```json
"command": "ffplay -nodisp -autoexit C:\\path\\to\\sound.wav 2>/dev/null"
```

---

## Quick Reference: Recommended Sound Hooks

For task completion notifications, use these hook combinations:

### Option 1: Simple Setup
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -Command \"[System.Media.SystemSounds]::Beep.Play()\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Option 2: Multi-Event Setup
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -Command \"[console]::beep(1000, 500)\"",
            "async": true
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -Command \"[console]::beep(400, 300)\"",
            "async": true
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -Command \"[System.Media.SystemSounds]::Asterisk.Play()\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## Hook Configuration Tips

### Key Properties

- **`async: true`** — Hook runs in background without blocking
- **`statusMessage`** — Custom message shown while hook runs
- **`timeout`** — Max seconds hook can run (default: 60)
- **`matcher`** — Filter which tools trigger this hook (leave empty for all)

### PowerShell Beep Syntax
```powershell
[console]::beep(frequency, duration)
# frequency: 1-20000 Hz (default: 800)
# duration: milliseconds (default: 500)
```

Examples:
- `[console]::beep()` — Standard beep (800 Hz, 500ms)
- `[console]::beep(1000, 500)` — Higher pitch, 500ms
- `[console]::beep(400, 200)` — Lower pitch, 200ms

---

## Common Use Cases

### ✅ Task Completion Sound
Use `Stop` or `TaskCompleted` hooks

### ✅ Error Alert Sound
Use `PostToolUseFailure` hook

### ✅ Session Start Sound
Use `SessionStart` hook

### ✅ Permission Warning Sound
Use `PermissionRequest` hook

### ✅ Subagent Completion Sound
Use `SubagentStop` hook

---

## Next Steps

1. Choose which hooks you want to use
2. Pick your sound command from the examples above
3. Add the hook configuration to `.claude/settings.json`
4. Test the sound command manually in PowerShell first
5. Restart Claude Code or open `/hooks` to reload config

---

**Total Hooks Summary: 28 available hooks × unlimited sound options = unlimited notification possibilities!**
