import { Command } from 'commander'
import chalk from 'chalk'

const program = new Command()

program
  .name('aisounds')
  .description('Install, manage and preview AI Sounds packs for AI coding tools')
  .version('0.0.0')

program
  .command('install <slug>')
  .description('install a pack from aisounds.dev into a supported AI coding tool')
  .option('--tool <tool>', 'target tool (cursor, vscode, claude-code, windsurf, aider)')
  .option('--global', 'install globally instead of per-project', false)
  .option('--project <path>', 'project path for scoped install')
  .action((slug: string) => {
    console.log(chalk.yellow(`[todo] install ${slug} — not implemented yet`))
  })

program
  .command('remove <slug>')
  .description('remove an installed pack')
  .option('--tool <tool>', 'target tool')
  .action((slug: string) => {
    console.log(chalk.yellow(`[todo] remove ${slug} — not implemented yet`))
  })

program
  .command('list')
  .description('list installed packs')
  .action(() => {
    console.log(chalk.yellow('[todo] list — not implemented yet'))
  })

program
  .command('preview <slug>')
  .description('play pack sounds in the terminal')
  .action((slug: string) => {
    console.log(chalk.yellow(`[todo] preview ${slug} — not implemented yet`))
  })

program
  .command('create')
  .description('interactive pack creator')
  .action(() => {
    console.log(chalk.yellow('[todo] create — not implemented yet'))
  })

program
  .command('update')
  .description('update all installed packs')
  .action(() => {
    console.log(chalk.yellow('[todo] update — not implemented yet'))
  })

program
  .command('info <slug>')
  .description('show pack details')
  .action((slug: string) => {
    console.log(chalk.yellow(`[todo] info ${slug} — not implemented yet`))
  })

program.parseAsync().catch((error: unknown) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)))
  process.exit(1)
})
