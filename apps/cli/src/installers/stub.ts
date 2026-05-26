import type { SupportedTool } from '@aisounds/core'

import type { Installer } from './types.js'

const TRACKING_ISSUE_URL =
  'https://github.com/luisreysan/aisounds/issues/new?labels=installer&title=Installer%20request'

/**
 * Placeholder installer used for tools that the CLI advertises but has not
 * implemented yet. Keeps the install contract honest: calling `install`
 * throws a friendly "coming soon" error rather than silently pretending it
 * worked.
 */
export function createStubInstaller(tool: SupportedTool, label: string): Installer {
  return {
    tool,
    label,
    async install() {
      throw new Error(
        [
          `Installer for ${label} is not implemented yet.`,
          `Track progress: ${TRACKING_ISSUE_URL}`,
          'Use --tool cursor or --tool claude-code (or --tool vscode) for automatic hooks today.',
        ].join('\n'),
      )
    },
    async remove() {
      // Nothing to remove since install never ran.
      return { configPath: '', removedCount: 0 }
    },
  }
}
