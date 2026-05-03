import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * /llms-full.txt — self-contained dump of every docs page in markdown.
 *
 * Reads the .md mirrors stored under public/docs-md/ at request time
 * (cached for an hour) and concatenates them with section headers so AI
 * agents can grab the whole documentation in a single fetch.
 */
export const dynamic = 'force-static'
export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://aisounds.dev'

const PAGES: Array<{ file: string; url: string; title: string }> = [
  { file: 'index.md', url: '/docs', title: 'Overview' },
  { file: 'getting-started.md', url: '/docs/getting-started', title: 'Getting started' },
  { file: 'concepts.md', url: '/docs/concepts', title: 'Concepts: tools and scopes' },
  { file: 'cli.md', url: '/docs/cli', title: 'CLI reference' },
  { file: 'events.md', url: '/docs/events', title: 'AISE events reference' },
  { file: 'for-llms.md', url: '/docs/for-llms', title: 'For AI agents' },
]

async function buildBody(): Promise<string> {
  const baseDir = path.join(process.cwd(), 'public', 'docs-md')
  const sections: string[] = []
  sections.push(`# AI Sounds — full docs (${SITE_URL})\n`)
  sections.push(
    '> Self-contained dump of every documentation page. For a lighter index, use /llms.txt.\n',
  )
  for (const page of PAGES) {
    try {
      const md = await fs.readFile(path.join(baseDir, page.file), 'utf8')
      sections.push(`\n---\n\n# Source: ${SITE_URL}${page.url}\n\n${md.trim()}\n`)
    } catch {
      sections.push(`\n---\n\n# Source: ${SITE_URL}${page.url}\n\n_Page contents unavailable._\n`)
    }
  }
  return sections.join('\n')
}

export async function GET() {
  const body = await buildBody()
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
