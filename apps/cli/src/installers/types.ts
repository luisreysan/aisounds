import type { PackManifest, SupportedTool } from '@aisounds/core'

import type { Scope } from '../lib/paths.js'

export interface InstallerContext {
  /** Unique pack slug (also the name of the folder in `packs/`). */
  slug: string
  /** Absolute path of the extracted pack (contains `aisounds.json`). */
  packDir: string
  manifest: PackManifest
  scope: Scope
  /** Project cwd, used by the `project` scope to locate tool configs. */
  cwd: string
}

export interface Installer {
  tool: SupportedTool
  /** Human-friendly label for log output. */
  label: string
  /** Returns true when the installer actually mutates tool config. */
  install(ctx: InstallerContext): Promise<{ configPath: string; entryCount: number }>
  remove(ctx: InstallerContext): Promise<{ configPath: string; removedCount: number }>
}
