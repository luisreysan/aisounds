# aisounds

CLI to install and manage [AI Sounds](https://aisounds.dev) packs for AI coding
tools (Cursor, Claude Code; VS Code + Copilot, Windsurf and Aider are coming
soon).

## Commands

```bash
npx aisounds install <slug>                   # install a pack (auto-detect tool)
npx aisounds install <slug> --tool cursor     # target a specific tool
npx aisounds install <slug> --tool claude-code
npx aisounds install <slug> --global          # install into $HOME (default: project)
npx aisounds remove  <slug>                   # revert the installer, keep user hooks
npx aisounds list                             # installed packs (project + global)
npx aisounds info    <slug>                   # metadata from aisounds.dev
npx aisounds update                           # re-install packs whose upstream changed
npx aisounds preview <slug>                   # play every sound of a pack
```

## How install works

Every command pulls a zipped bundle from
`${AISOUNDS_API_URL}/api/packs/<slug>/bundle`
(default base URL `https://aisounds.dev`). The bundle contains an
`aisounds.json` manifest validated against `@aisounds/core`
`PackManifestSchema` plus every sound as `sounds/<event>.ogg`
(and `.mp3` as fallback).

Files are extracted to:

- `<cwd>/.aisounds/packs/<slug>` by default (per-project install)
- `~/.aisounds/packs/<slug>` when `--global` is passed

After extraction the installer for the chosen tool merges hook entries
into the tool's config file, tagging every entry it writes with an
`_aisounds` marker so `aisounds remove` can revert cleanly without
touching hand-authored hooks:

| Tool          | Config file                                             | Event mapping                                                                   |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `cursor`      | `.cursor/hooks.json` (global: `~/.cursor/hooks.json`)   | Uses `CURSOR_EVENT_MAP` from `@aisounds/core`                                   |
| `claude-code` | `.claude/settings.json` (global: `~/.claude/settings.json`) | Uses `CLAUDE_EVENT_MAP` — `task_complete` → `PostToolUse`, `notification` → `Notification`, etc. |

The locally installed state lives at `<scope>/.aisounds/installed.json`.
That's what powers `aisounds list` and `aisounds update`.

## Environment

| Variable           | Default               | Description                                   |
| ------------------ | --------------------- | --------------------------------------------- |
| `AISOUNDS_API_URL` | `https://aisounds.dev` | Base URL used to fetch bundles and metadata. |

## Development

```bash
pnpm --filter aisounds build       # tsup → dist/index.js
pnpm --filter aisounds test        # vitest run (installers + unzip)
pnpm --filter aisounds type-check
```

Run the local build directly against a dev server:

```bash
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js install welcome-pack
```
