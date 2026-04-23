import chalk from 'chalk'

import { logger } from '../lib/logger.js'
import { listInstalled } from '../lib/state.js'

export interface ListOptions {
  project?: string
}

export async function list(opts: ListOptions = {}): Promise<void> {
  const cwd = opts.project ?? process.cwd()
  const installed = await listInstalled(cwd)

  if (installed.length === 0) {
    logger.info('No packs installed.')
    logger.note("Try 'aisounds install welcome-pack' to get started.")
    return
  }

  const rows = installed.map((p) => ({
    slug: p.slug,
    name: p.name,
    scope: p.scope,
    tools: p.tools.join(', ') || '-',
    installedAt: p.installedAt.slice(0, 10),
  }))

  const widths = {
    slug: Math.max(4, ...rows.map((r) => r.slug.length)),
    name: Math.max(4, ...rows.map((r) => r.name.length)),
    scope: 7,
    tools: Math.max(5, ...rows.map((r) => r.tools.length)),
    installedAt: 10,
  }

  const header = [
    chalk.bold('SLUG'.padEnd(widths.slug)),
    chalk.bold('NAME'.padEnd(widths.name)),
    chalk.bold('SCOPE'.padEnd(widths.scope)),
    chalk.bold('TOOLS'.padEnd(widths.tools)),
    chalk.bold('INSTALLED'),
  ].join('  ')
  console.log(header)

  for (const row of rows) {
    console.log(
      [
        row.slug.padEnd(widths.slug),
        row.name.padEnd(widths.name),
        row.scope.padEnd(widths.scope),
        row.tools.padEnd(widths.tools),
        row.installedAt,
      ].join('  '),
    )
  }
}
