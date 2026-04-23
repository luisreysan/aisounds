import os from 'node:os'
import path from 'node:path'

export type Scope = 'global' | 'project'

export interface ScopePaths {
  /** Root directory aisounds owns for this scope. */
  root: string
  /** Directory where the extracted pack files live. */
  packDir: (slug: string) => string
  /** Path to the installed.json state file. */
  statePath: string
}

/**
 * Returns where we store extracted pack files and the `installed.json` state
 * for a given scope. `global` lives under the user's home directory so it is
 * shared by every terminal session; `project` lives under the current working
 * directory so it travels with the repo.
 */
export function resolveScope(scope: Scope, cwd: string = process.cwd()): ScopePaths {
  const root = scope === 'global'
    ? path.join(os.homedir(), '.aisounds')
    : path.join(cwd, '.aisounds')

  return {
    root,
    packDir: (slug: string) => path.join(root, 'packs', slug),
    statePath: path.join(root, 'installed.json'),
  }
}

/**
 * Returns every scope path for commands that must look in both places
 * (e.g. `list`, `update`).
 */
export function allScopePaths(cwd: string = process.cwd()): Array<{ scope: Scope; paths: ScopePaths }> {
  return [
    { scope: 'project', paths: resolveScope('project', cwd) },
    { scope: 'global', paths: resolveScope('global', cwd) },
  ]
}
