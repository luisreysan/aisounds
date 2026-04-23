export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0'
  if (Math.abs(value) < 1000) return value.toString()
  if (Math.abs(value) < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms <= 0) return '0.0s'
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatRelativeTime(input: string | Date | null | undefined): string {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  const diffMs = date.getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), 'day')
  if (abs < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), 'month')
  return rtf.format(Math.round(diffSec / 31_536_000), 'year')
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
