import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { PackManifest, SupportedTool } from '@aisounds/core'

import { allScopePaths, resolveScope, type Scope } from './paths.js'

export interface InstalledPack {
  slug: string
  version: string
  name: string
  tools: SupportedTool[]
  scope: Scope
  installedAt: string
  updatedAt: string
  packDir: string
  disabledEvents?: string[]
}

interface StateFile {
  version: 1
  activePack: string | null
  packs: InstalledPack[]
}

const EMPTY_STATE: StateFile = { version: 1, activePack: null, packs: [] }

async function readStateFile(statePath: string): Promise<StateFile> {
  try {
    const raw = await fs.readFile(statePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StateFile>
    return {
      version: 1,
      activePack: typeof parsed.activePack === 'string' ? parsed.activePack : null,
      packs: Array.isArray(parsed.packs) ? (parsed.packs as InstalledPack[]) : [],
    }
  } catch (err) {
    if (isNotFound(err)) return { ...EMPTY_STATE }
    throw err
  }
}

async function writeStateFile(statePath: string, state: StateFile): Promise<void> {
  await fs.mkdir(path.dirname(statePath), { recursive: true })
  await fs.writeFile(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8')
}

/** Returns every installed pack across both scopes, project first. */
export async function listInstalled(cwd: string = process.cwd()): Promise<InstalledPack[]> {
  const out: InstalledPack[] = []
  for (const { paths } of allScopePaths(cwd)) {
    const state = await readStateFile(paths.statePath)
    out.push(...state.packs)
  }
  return out
}

export async function findInstalled(
  slug: string,
  cwd: string = process.cwd(),
): Promise<InstalledPack | null> {
  for (const { paths } of allScopePaths(cwd)) {
    const state = await readStateFile(paths.statePath)
    const found = state.packs.find((p) => p.slug === slug)
    if (found) return found
  }
  return null
}

export async function upsertInstalled(
  entry: InstalledPack,
  cwd: string = process.cwd(),
): Promise<void> {
  const { statePath } = resolveScope(entry.scope, cwd)
  const state = await readStateFile(statePath)
  const filtered = state.packs.filter((p) => p.slug !== entry.slug)
  filtered.push(entry)
  await writeStateFile(statePath, { version: 1, activePack: state.activePack, packs: filtered })
}

export async function removeInstalled(
  slug: string,
  scope: Scope,
  cwd: string = process.cwd(),
): Promise<void> {
  const { statePath } = resolveScope(scope, cwd)
  const state = await readStateFile(statePath)
  const filtered = state.packs.filter((p) => p.slug !== slug)
  const activePack = state.activePack === slug ? null : state.activePack
  await writeStateFile(statePath, { version: 1, activePack, packs: filtered })
}

export async function getActivePack(
  scope: Scope,
  cwd: string = process.cwd(),
): Promise<string | null> {
  const { statePath } = resolveScope(scope, cwd)
  const state = await readStateFile(statePath)
  return state.activePack
}

export async function setActivePack(
  slug: string,
  scope: Scope,
  cwd: string = process.cwd(),
): Promise<void> {
  const { statePath } = resolveScope(scope, cwd)
  const state = await readStateFile(statePath)
  if (!state.packs.some((p) => p.slug === slug)) {
    throw new Error(`Pack "${slug}" is not installed.`)
  }
  await writeStateFile(statePath, { version: 1, activePack: slug, packs: state.packs })
}

export async function clearActivePack(
  scope: Scope,
  cwd: string = process.cwd(),
): Promise<void> {
  const { statePath } = resolveScope(scope, cwd)
  const state = await readStateFile(statePath)
  await writeStateFile(statePath, { version: 1, activePack: null, packs: state.packs })
}

export async function updateDisabledEvents(
  slug: string,
  scope: Scope,
  disabledEvents: string[],
  cwd: string = process.cwd(),
): Promise<void> {
  const { statePath } = resolveScope(scope, cwd)
  const state = await readStateFile(statePath)
  const pack = state.packs.find((p) => p.slug === slug)
  if (!pack) throw new Error(`Pack "${slug}" is not installed.`)
  pack.disabledEvents = disabledEvents.length > 0 ? disabledEvents : undefined
  await writeStateFile(statePath, state)
}

/**
 * Returns a shallow copy of the manifest with disabled events removed from
 * the `sounds` record so installers only write hooks for enabled events.
 */
export function filterManifest(
  manifest: PackManifest,
  disabledEvents: string[] | undefined,
): PackManifest {
  if (!disabledEvents || disabledEvents.length === 0) return manifest
  const disabled = new Set(disabledEvents)
  const filtered = Object.fromEntries(
    Object.entries(manifest.sounds).filter(([event]) => !disabled.has(event)),
  )
  return { ...manifest, sounds: filtered as PackManifest['sounds'] }
}

function isNotFound(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ENOENT'
}
