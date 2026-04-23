import { isSupportedTool, detectTool, getInstaller } from '../installers/index.js'
import { fetchBundle, ApiError } from '../lib/api.js'
import { logger } from '../lib/logger.js'
import { resolveScope, type Scope } from '../lib/paths.js'
import { currentPlatform } from '../lib/platform.js'
import { getActivePack, setActivePack, upsertInstalled } from '../lib/state.js'
import { extractBundle } from '../lib/unzip.js'
import { getCliVersion } from '../lib/version.js'
import type { SupportedTool } from '@aisounds/core'

export interface InstallOptions {
  tool?: string
  global?: boolean
  project?: string
}

export async function install(slug: string, opts: InstallOptions): Promise<void> {
  const scope: Scope = opts.global ? 'global' : 'project'
  const cwd = opts.project ?? process.cwd()

  const tool = await resolveTool(opts.tool, cwd)
  if (!tool) {
    logger.error(
      'Could not auto-detect a supported tool. Pass --tool cursor or --tool claude-code.',
    )
    process.exitCode = 1
    return
  }

  const installer = getInstaller(tool)

  const spinner = logger.spinner(`Downloading ${slug} from aisounds.dev`)
  let zipBuffer: Buffer
  try {
    zipBuffer = await fetchBundle(slug, {
      tool,
      platform: currentPlatform(),
      version: getCliVersion(),
    })
  } catch (err) {
    spinner.fail(`Could not download ${slug}`)
    if (err instanceof ApiError) {
      logger.error(`Server responded ${err.status}: ${err.message}`)
    } else {
      logger.error(err instanceof Error ? err.message : String(err))
    }
    process.exitCode = 1
    return
  }
  spinner.succeed(`Downloaded ${(zipBuffer.length / 1024).toFixed(1)} KB`)

  const paths = resolveScope(scope, cwd)
  const packDir = paths.packDir(slug)

  let extracted
  try {
    extracted = await extractBundle(zipBuffer, packDir)
  } catch (err) {
    logger.error(`Invalid bundle: ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
    return
  }

  logger.info(`Extracted to ${packDir}`)

  let result
  try {
    result = await installer.install({
      slug,
      packDir,
      manifest: extracted.manifest,
      scope,
      cwd,
    })
  } catch (err) {
    logger.error(
      `Installer for ${installer.label} failed: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exitCode = 1
    return
  }

  await upsertInstalled(
    {
      slug,
      version: extracted.manifest.pack.aise_version || '1.0',
      name: extracted.manifest.pack.name,
      tools: [tool],
      scope,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      packDir,
    },
    cwd,
  )

  const currentActive = await getActivePack(scope, cwd)
  if (!currentActive) {
    await setActivePack(slug, scope, cwd)
    logger.success(
      `Installed and activated ${extracted.manifest.pack.name} for ${installer.label} (${result.entryCount} hook${result.entryCount === 1 ? '' : 's'})`,
    )
  } else if (currentActive === slug) {
    logger.success(
      `Installed ${extracted.manifest.pack.name} for ${installer.label} (${result.entryCount} hook${result.entryCount === 1 ? '' : 's'})`,
    )
  } else {
    logger.success(
      `Installed ${extracted.manifest.pack.name} for ${installer.label} (${result.entryCount} hook${result.entryCount === 1 ? '' : 's'})`,
    )
    logger.note(`Run 'aisounds activate ${slug}' to switch to this pack.`)
  }
  logger.note(`Config: ${result.configPath}`)
}

async function resolveTool(
  flagValue: string | undefined,
  cwd: string,
): Promise<SupportedTool | null> {
  if (flagValue) {
    if (!isSupportedTool(flagValue)) {
      logger.error(`Unknown tool "${flagValue}". Supported: cursor, claude-code, vscode, windsurf, aider.`)
      return null
    }
    return flagValue
  }
  return detectTool(cwd)
}
