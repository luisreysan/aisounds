# Getting started

This guide walks you through installing the `aisounds` CLI and adding your first sound pack to **Cursor** or **Claude Code**.

## Prerequisites

- Node.js **>= 20**
- One of: Cursor, Claude Code (more tools coming soon)
- A terminal (PowerShell on Windows, bash/zsh on macOS / Linux)

## 1. Pick a pack

Browse aisounds.dev/packs and copy the slug of any pack you like. Every pack page has an **Install** snippet you can copy directly.

## 2. Install for a project

Run the CLI from the root of the project where you want sounds to play. The pack is downloaded and the corresponding tool's hook config is updated automatically.

```bash
npx aisounds@latest install <slug> --tool cursor
npx aisounds@latest activate <slug>
```

For Claude Code, just change the tool flag:

```bash
npx aisounds@latest install <slug> --tool claude-code
npx aisounds@latest activate <slug>
```

## 3. Install globally (optional)

If you want the same pack to apply across all your projects, use `--global`:

```bash
npx aisounds@latest install <slug> --tool claude-code --global
npx aisounds@latest activate <slug> --global
```

Global installs write to `~/.claude/settings.json` (Claude Code) or your tool's user-level config. See Concepts: tools and scopes for the full breakdown.

## 4. Restart your tool

Most tools only re-read their hook configuration on startup. **Close and reopen** Cursor or Claude Code after installing a new pack so the hooks load.

## 5. Trigger a sound

- In **Cursor**: ask the agent to do something and wait for it to finish — the `task_complete` sound plays on `Stop`.
- In **Claude Code**: send a prompt; on submit you should hear `prompt_sent`, and on response you should hear `task_complete`.

If nothing plays:

- Verify the pack was installed: `npx aisounds@latest list`
- Verify the pack is active: the active pack appears with a `*` next to it
- Inspect the tool's hook config (`.cursor/hooks.json` or `.claude/settings.json`)
- Try the audio command from the hook directly in your terminal
- Restart the tool

## Next steps

- Read Concepts: tools and scopes to understand how installs are isolated by project.
- Open the CLI reference for every command and flag.
- Want to mute some events? See `aisounds sounds <slug>` in the CLI reference.
