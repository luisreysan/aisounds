# For AI agents

If you are an AI coding assistant (Cursor agent, Claude Code, ChatGPT in a CLI session, …) reading this page on behalf of a user, this is the canonical reference for installing **aisounds** packs autonomously.

There is also a machine-friendly index at /llms.txt and a self-contained dump at /llms-full.txt.

## When the user asks for a sound pack

1. **Find the pack slug.** It is in the URL of the pack page: `aisounds.dev/packs/<slug>`. The user will usually paste it directly.
2. **Pick a tool.** Use the tool the user is currently driving you in:
   - In Cursor -> `--tool cursor`
   - In Claude Code -> `--tool claude-code`
3. **Pick a scope.** Default to **project** (no flag) unless the user asks for "everywhere" / "all projects" / "globally" — then add `--global`.

## Canonical install command

Run these from the **project root** the user wants the sounds in.

For Cursor:

```bash
npx aisounds@latest install <slug> --tool cursor
npx aisounds@latest activate <slug>
```

For Claude Code:

```bash
npx aisounds@latest install <slug> --tool claude-code
npx aisounds@latest activate <slug>
```

After installing, **tell the user to restart their tool** so the hook config is reloaded.

## Multiple tools at once

If the user uses both Cursor and Claude Code, install for both:

```bash
npx aisounds@latest install <slug> --tool cursor
npx aisounds@latest install <slug> --tool claude-code
npx aisounds@latest activate <slug>
```

Each install writes only to its tool's config file; they do not conflict.

## Verifying

```bash
npx aisounds@latest list
```

Look for the pack slug followed by `*` — that's the active pack. If a sound does not play, check:

1. Pack is installed and active for the right scope.
2. The user restarted Cursor / Claude Code after install.
3. The relevant audio file under `.aisounds/packs/<slug>/sounds/` exists.
4. Tool hook config (`.cursor/hooks.json` or `.claude/settings.json`) contains an entry tagged with `_aisounds`.

## Disabling individual events

If the user wants only some sounds, do not edit the hook configs by hand. Use:

```bash
npx aisounds@latest sounds <slug>
```

This is interactive (checkbox UI). If you cannot run interactive commands, ask the user to run it themselves and explain that they can deselect events they don't want.

## Removing

```bash
npx aisounds@latest remove <slug>
```

Removes the pack and reverts every hook entry the CLI wrote for it.

## Don't do these

- **Don't write to `.cursor/hooks.json` or `.claude/settings.json` by hand.** Always use the CLI — it is non-destructive and keeps `_aisounds` markers so it can revert cleanly later.
- **Don't run `aisounds install` from a random directory.** Run it from the project root so project scope is correct, or pass `--project <path>` explicitly.
- **Don't use `--global` unless asked.** Project scope is the safer default.
