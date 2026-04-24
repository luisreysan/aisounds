import { ApiError, fetchMeta } from '../lib/api.js'
import { logger } from '../lib/logger.js'
import { listInstalled } from '../lib/state.js'
import { install } from './install.js'

export interface UpdateOptions {
  global?: boolean
  project?: string
}

/**
 * For every installed pack, checks the remote `updated_at` and re-runs the
 * installer when it has changed since the local `updatedAt`. Silently skips
 * packs the server no longer knows about (they were unpublished) rather
 * than removing them — the user can decide with `aisounds remove`.
 */
export async function update(opts: UpdateOptions = {}): Promise<void> {
  const cwd = opts.project ?? process.cwd()
  const installed = (await listInstalled(cwd)).filter((pack) => (opts.global ? pack.scope === 'global' : true))

  if (installed.length === 0) {
    logger.info('Nothing to update — no packs installed.')
    return
  }

  let updated = 0
  for (const pack of installed) {
    try {
      const meta = await fetchMeta(pack.slug)
      const remoteStamp = meta.pack.updated_at ?? meta.pack.published_at ?? ''
      if (!remoteStamp || remoteStamp <= pack.updatedAt) {
        logger.info(`${pack.slug} is up to date`)
        continue
      }
      logger.info(`Updating ${pack.slug}…`)
      const [tool] = pack.tools
      await install(pack.slug, {
        tool,
        global: pack.scope === 'global',
        project: cwd,
      })
      updated += 1
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        logger.warn(`${pack.slug} is no longer available on aisounds.dev`)
        continue
      }
      logger.warn(
        `Could not update ${pack.slug}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  logger.success(`Updated ${updated} pack${updated === 1 ? '' : 's'}`)
}
