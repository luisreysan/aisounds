# AI Sounds documentation

> Open-source platform for adding sound notifications to AI coding tools like Cursor, Claude Code, and VS Code.

AI Sounds (AISE) lets developers install **sound packs** that play audio feedback when AI agents complete tasks, fail, send prompts, or trigger other lifecycle events. Packs are installed and managed through a small CLI, which configures the right hooks in each supported tool automatically.

## What you get

- A growing catalogue of community-uploaded sound packs.
- A single CLI (`aisounds`) that installs packs into Cursor, Claude Code, and more.
- A canonical event vocabulary (**AISE**) so the same pack works across tools.
- Per-pack control: activate one pack at a time, enable or disable individual events.

## Where to start

- **New here?** Read Getting started to install your first pack.
- **Confused by tools vs scopes?** Jump to Concepts: tools and scopes.
- **Looking for a command?** See the CLI reference.
- **Building a pack or integrating a tool?** Check the AISE events reference.
- **AI agent / LLM?** See For AI agents and /llms.txt.

## Supported tools

| Tool | Status | Hook config |
|------|--------|-------------|
| Cursor | Stable | `.cursor/hooks.json` |
| Claude Code | Stable | `.claude/settings.json` |
| VS Code | Planned | `settings.json` |
| Windsurf | Planned | TBD |
| Aider | Planned | TBD |

## License

The platform code is open source. Each pack carries its own license (CC0, CC-BY, CC-BY-SA, or MIT) declared in its manifest.
