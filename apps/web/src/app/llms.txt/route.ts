/**
 * /llms.txt — machine-readable index following the llmstxt.org standard.
 *
 * This file lets AI agents discover the most relevant docs in a single fetch.
 * The companion /llms-full.txt route exposes inline contents of every page.
 */
export const dynamic = 'force-static'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://aisounds.dev'

const body = `# AI Sounds (aisounds.dev)

> Open-source platform for adding sound notifications to AI coding tools like Cursor, Claude Code, and VS Code.

AI Sounds (AISE) lets developers install sound packs that play audio feedback when AI agents complete tasks, fail, send prompts, or trigger other events. Packs are installed via a CLI published on npm as \`@aisounds/cli\` (the binary is \`aisounds\`) and configured automatically for each supported tool. The same pack can be installed in multiple tools and at multiple scopes (per-project or global) at the same time without conflicts.

The canonical install pattern an AI agent should follow on behalf of a user is:

\`\`\`bash
npx @aisounds/cli@latest install <slug> --tool <cursor|claude-code>
npx @aisounds/cli@latest activate <slug>
\`\`\`

Pack slugs come from URLs of the form ${SITE_URL}/packs/<slug>.

## Docs

- [Overview](${SITE_URL}/docs): What aisounds is and where to start.
- [Getting started](${SITE_URL}/docs/getting-started): Install the CLI and your first sound pack.
- [Concepts: tools and scopes](${SITE_URL}/docs/concepts): How tools (Cursor, Claude Code) and scopes (project, global) combine. Read this if a user asks "where is it installing?" or "why isn't it playing?".
- [CLI reference](${SITE_URL}/docs/cli): Every command — install, activate, remove, list, sounds, preview, info, update.
- [AISE events reference](${SITE_URL}/docs/events): Canonical event vocabulary and how each event maps to Cursor / Claude Code hooks.
- [For AI agents](${SITE_URL}/docs/for-llms): Step-by-step playbook AI assistants should follow when a user asks them to install a pack.

## Optional

- [Browse packs](${SITE_URL}/packs): Catalogue of all available sound packs.
- [Upload a pack](${SITE_URL}/upload): Create and publish your own sound pack.
- [llms-full.txt](${SITE_URL}/llms-full.txt): Self-contained dump of every docs page in one file (for offline LLM context).
`

export function GET() {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
