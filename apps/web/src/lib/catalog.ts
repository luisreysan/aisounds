import type { SupportedTool } from '@aisounds/core'

/**
 * Display catalog for the known AI coding tools. The slug here matches what
 * is stored in `public.pack_tools.tool` and what the CLI reads.
 */
export const TOOL_OPTIONS: Array<{ slug: SupportedTool; label: string }> = [
  { slug: 'cursor', label: 'Cursor' },
  { slug: 'claude-code', label: 'Claude Code' },
  { slug: 'vscode', label: 'VS Code' },
  { slug: 'windsurf', label: 'Windsurf' },
  { slug: 'aider', label: 'Aider' },
]

/**
 * Keep in sync with the seed rows in `supabase/migrations/0001_init_schema.sql`.
 * The SQL table is the source of truth but we duplicate the labels here for
 * client components that need them without an extra fetch.
 */
export const TAG_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'lofi', label: 'Lofi' },
  { slug: 'ambient', label: 'Ambient' },
  { slug: 'retro', label: 'Retro' },
  { slug: 'synthwave', label: 'Synthwave' },
  { slug: 'nature', label: 'Nature' },
  { slug: 'minimal', label: 'Minimal' },
  { slug: 'sci-fi', label: 'Sci-Fi' },
  { slug: 'chiptune', label: 'Chiptune' },
  { slug: 'cyberpunk', label: 'Cyberpunk' },
  { slug: 'acoustic', label: 'Acoustic' },
  { slug: 'electronic', label: 'Electronic' },
  { slug: 'funny', label: 'Funny' },
  { slug: 'dark', label: 'Dark' },
  { slug: 'bright', label: 'Bright' },
  { slug: 'calm', label: 'Calm' },
]

export const LICENSE_OPTIONS = [
  { value: 'CC0', label: 'CC0 (public domain)' },
  { value: 'CC-BY', label: 'CC-BY (attribution)' },
  { value: 'CC-BY-SA', label: 'CC-BY-SA (share-alike)' },
  { value: 'MIT', label: 'MIT' },
] as const

export type LicenseValue = (typeof LICENSE_OPTIONS)[number]['value']
