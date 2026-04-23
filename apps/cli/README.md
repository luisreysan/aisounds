# aisounds

CLI to install and manage [AI Sounds](https://aisounds.dev) packs for AI coding
tools (Cursor, VS Code + Copilot, Claude Code, Windsurf, Aider).

```bash
npx aisounds install <slug>                 # install a pack (auto-detect tool)
npx aisounds install <slug> --tool cursor   # target a specific tool
npx aisounds install <slug> --global        # install globally (default: project)
npx aisounds remove <slug>
npx aisounds list
npx aisounds preview <slug>
npx aisounds create
npx aisounds update
```

> Status: scaffolding phase — commands print placeholders. Real implementation
> arrives in a later phase of the project.
