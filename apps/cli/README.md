# aisounds

CLI to install and manage [AI Sounds](https://aisounds.dev) packs for AI coding
tools (Cursor, Claude Code, VS Code; Windsurf and Aider installers are coming
soon).

## Commands

```bash
npx @aisounds/cli install <slug>                   # install a pack (auto-detect tool)
npx @aisounds/cli install <slug> --tool cursor     # target a specific tool
npx @aisounds/cli install <slug> --tool claude-code
npx @aisounds/cli install <slug> --tool vscode
npx @aisounds/cli install <slug> --global          # install into $HOME (default: project)
npx @aisounds/cli activate <slug>                  # set the active pack (hooks play from this pack)
npx @aisounds/cli remove  <slug>                   # revert the installer, keep user hooks
npx @aisounds/cli list                             # installed packs (project + global); * = active
npx @aisounds/cli info    <slug>                   # metadata from aisounds.dev
npx @aisounds/cli sounds  <slug>                   # enable/disable individual events (interactive)
npx @aisounds/cli update                           # re-install packs whose upstream changed
npx @aisounds/cli preview <slug>                   # play every sound of a pack
```

## How install works

Every command pulls a zipped bundle from
`${AISOUNDS_API_URL}/api/packs/<slug>/bundle`
(default base URL `https://aisounds.dev`). The bundle contains an
`aisounds.json` manifest validated against `@aisounds/core`
`PackManifestSchema` plus every sound as `sounds/<event>.mp3`.

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
| `claude-code` | `.claude/settings.json` (global: `~/.claude/settings.json`) | Uses `CLAUDE_EVENT_MAP`                                                       |
| `vscode`      | `.vscode/aisounds.json` + `.vscode/aisounds/*.sh`       | Uses `VSCODE_EVENT_MAP`; scripts ready for tasks/extension (see note below)    |
| `windsurf`    | —                                                       | Coming soon                                                                     |
| `aider`       | —                                                       | Coming soon                                                                     |

**VS Code note:** GitHub Copilot does not expose stable public lifecycle hooks
equivalent to Cursor's `hooks.json`. The VS Code installer writes
`.vscode/aisounds.json` and play scripts you can bind to tasks or a future
AI Sounds extension. Use `aisounds preview` to hear the pack immediately.

The locally installed state lives at `<scope>/.aisounds/installed.json`.
That's what powers `aisounds list`, `aisounds update`, and `aisounds activate`.

## Environment

| Variable           | Default               | Description                                   |
| ------------------ | --------------------- | --------------------------------------------- |
| `AISOUNDS_API_URL` | `https://aisounds.dev` | Base URL used to fetch bundles and metadata. |

## Linux, macOS, and WSL

The CLI detects the OS (`mac`, `windows`, or `linux` for bundles on Linux—including **WSL**). Downloads and installs are the same Unix flow as on a bare-metal Linux laptop.

For **audio playback on Linux**, hooks try (in order) **PulseAudio** `paplay`, **FFmpeg** `ffplay`, then **mpv** `mpv`.
This is best-effort (no hard dependency), but you need at least one of these binaries installed.
On Debian/Ubuntu you usually want:

```bash
sudo apt update && sudo apt install -y pulseaudio-utils ffmpeg mpv
```

On **macOS**, hooks use **`afplay`**.

If Linux audio sounds distorted/noisy, your system is likely missing `paplay`, `ffplay`, and `mpv` and is falling back to an incompatible player path. Install at least one of them, then re-run `aisounds preview <slug>`.

Under **WSL2**, audio is usually forwarded to Windows speakers (or you run a PulseAudio server in WSL). If you hear nothing, run `aisounds preview <slug>` and separately test one backend (for example `paplay /usr/share/sounds/alsa/Front_Center.wav`) — if that fails too, fix WSL/Linux audio before debugging the CLI.

## Development

```bash
pnpm --filter @aisounds/cli build       # tsup → dist/index.js
pnpm --filter @aisounds/cli test        # vitest run (installers + unzip)
pnpm --filter @aisounds/cli type-check
```

Run the local build directly against a dev server:

```bash
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js install universfield
```

Publish to npm (from `apps/cli` after tests pass):

```bash
pnpm test && npm publish
```
