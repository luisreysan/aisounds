import { Command } from 'commander'

import { activate } from './commands/activate.js'
import { info } from './commands/info.js'
import { install } from './commands/install.js'
import { list } from './commands/list.js'
import { preview } from './commands/preview.js'
import { remove } from './commands/remove.js'
import { update } from './commands/update.js'
import { logger } from './lib/logger.js'
import { getCliVersion } from './lib/version.js'

const program = new Command()

program
  .name('aisounds')
  .description('Install, manage and preview AI Sounds packs for AI coding tools')
  .version(getCliVersion())

program
  .command('install <slug>')
  .description('install a pack from aisounds.dev into a supported AI coding tool')
  .option('--tool <tool>', 'target tool (cursor, claude-code; vscode, windsurf, aider coming soon)')
  .option('--global', 'install globally instead of per-project', false)
  .option('--project <path>', 'project path for scoped install')
  .action((slug: string, opts: Parameters<typeof install>[1]) => install(slug, opts))

program
  .command('remove <slug>')
  .description('remove an installed pack and revert tool config')
  .option('--tool <tool>', 'target tool (defaults to every tool it was installed for)')
  .option('--project <path>', 'project path for scoped install')
  .action((slug: string, opts: Parameters<typeof remove>[1]) => remove(slug, opts))

program
  .command('list')
  .description('list installed packs (project + global)')
  .option('--project <path>', 'project path for scoped install')
  .action((opts: Parameters<typeof list>[0]) => list(opts))

program
  .command('info <slug>')
  .description('show pack details from aisounds.dev')
  .action((slug: string) => info(slug))

program
  .command('update')
  .description('re-install packs whose upstream version changed')
  .option('--project <path>', 'project path for scoped install')
  .action((opts: Parameters<typeof update>[0]) => update(opts))

program
  .command('activate <slug>')
  .description('set the active pack whose sounds will play in hooks')
  .option('--project <path>', 'project path for scoped install')
  .action((slug: string, opts: Parameters<typeof activate>[1]) => activate(slug, opts))

program
  .command('preview <slug>')
  .description('play pack sounds in the terminal')
  .action((slug: string) => preview(slug))

program
  .command('create')
  .description('interactive pack creator (coming soon)')
  .action(() => {
    logger.info('Interactive creator is coming soon. Use the website for now: https://aisounds.dev/upload')
  })

program.parseAsync().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
