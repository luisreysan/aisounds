/**
 * Server-enforced audio file rules for every upload. The web app MUST validate
 * against these constants regardless of client-side checks.
 */

export const FILE_RULES = {
  accepted_mime_types: [
    'audio/mpeg',
    'audio/mp3',
    'audio/x-mp3',
    'audio/mpeg3',
    'audio/x-mpeg-3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/flac',
    'audio/x-flac',
    'audio/aac',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
  ] as const,
  accepted_extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] as const,
  max_size_bytes: 1_048_576, // 1MB per file
  max_duration_seconds: 10,
  max_pack_total_bytes: 5_242_880, // 5MB total per pack
  output_formats: ['ogg', 'mp3'] as const,
  primary_format: 'ogg' as const,
} as const

export type AcceptedMimeType = (typeof FILE_RULES.accepted_mime_types)[number]
export type AcceptedExtension = (typeof FILE_RULES.accepted_extensions)[number]
export type OutputFormat = (typeof FILE_RULES.output_formats)[number]

export function isAcceptedMimeType(mime: string): mime is AcceptedMimeType {
  const normalized = normalizeMimeType(mime)
  if (!normalized) return false
  return (FILE_RULES.accepted_mime_types as readonly string[]).includes(normalized)
}

export function isAcceptedExtension(ext: string): ext is AcceptedExtension {
  const lowered = ext.toLowerCase().replace(/^\./, '')
  return (FILE_RULES.accepted_extensions as readonly string[]).includes(lowered)
}

function normalizeMimeType(mime: string): string {
  return mime.toLowerCase().trim().split(';', 1)[0] ?? ''
}
