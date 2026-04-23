import chalk from 'chalk'

import { ApiError, fetchMeta } from '../lib/api.js'
import { logger } from '../lib/logger.js'

export async function info(slug: string): Promise<void> {
  let meta
  try {
    meta = await fetchMeta(slug)
  } catch (err) {
    if (err instanceof ApiError) {
      logger.error(`Server responded ${err.status}: ${err.message}`)
    } else {
      logger.error(err instanceof Error ? err.message : String(err))
    }
    process.exitCode = 1
    return
  }

  const { pack, sounds } = meta

  console.log(chalk.bold(pack.name), chalk.dim(`(${pack.slug})`))
  console.log(chalk.dim('by'), `@${pack.author.username}`)
  if (pack.description) console.log(pack.description)

  console.log()
  console.log(chalk.dim('License:     '), pack.license)
  console.log(chalk.dim('AISE:        '), pack.aise_version)
  console.log(chalk.dim('Tags:        '), pack.tags.length > 0 ? pack.tags.join(', ') : '-')
  console.log(chalk.dim('Tools:       '), pack.tools.length > 0 ? pack.tools.join(', ') : '-')
  console.log(chalk.dim('Downloads:   '), pack.download_count)
  console.log(chalk.dim('Votes:       '), pack.vote_count)
  if (pack.published_at) {
    console.log(chalk.dim('Published:   '), pack.published_at.slice(0, 10))
  }

  console.log()
  console.log(chalk.bold(`Sounds (${sounds.length})`))
  for (const sound of sounds) {
    const seconds = (sound.duration_ms / 1000).toFixed(1)
    const kb = (sound.size_bytes / 1024).toFixed(1)
    console.log(` · ${chalk.cyan(sound.event)} · ${seconds}s · ${kb} KB`)
  }
}
