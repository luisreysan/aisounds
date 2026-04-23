export type DownloadPlatform = 'mac' | 'windows' | 'linux' | null

/** Returns the platform value expected by the web `/api/packs/:slug/bundle`. */
export function currentPlatform(): DownloadPlatform {
  switch (process.platform) {
    case 'darwin':
      return 'mac'
    case 'win32':
      return 'windows'
    case 'linux':
      return 'linux'
    default:
      return null
  }
}
