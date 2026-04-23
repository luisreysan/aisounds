import type { SupportedTool } from '@aisounds/core'

import type { Installer } from './types.js'

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
        `Installer for ${label} is coming soon. Track progress in the aisounds repository.`,
      )
    },
    async remove() {
      // Nothing to remove since install never ran.
      return { configPath: '', removedCount: 0 }
    },
  }
}
