import chalk from 'chalk'
import ora, { type Ora } from 'ora'

/**
 * Thin wrapper so commands don't each re-implement log formatting. Kept
 * minimal on purpose — chalk and ora are powerful enough on their own.
 */
export const logger = {
  info(message: string): void {
    console.log(chalk.cyan('ℹ'), message)
  },
  success(message: string): void {
    console.log(chalk.green('✔'), message)
  },
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message)
  },
  error(message: string): void {
    console.error(chalk.red('✖'), message)
  },
  note(message: string): void {
    console.log(chalk.dim(' '), chalk.dim(message))
  },
  spinner(message: string): Ora {
    return ora(message).start()
  },
}
