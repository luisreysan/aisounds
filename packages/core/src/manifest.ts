import { z } from 'zod'
import { EVENT_SPEC, type SoundEvent } from './events.js'

/**
 * Zod schema for the canonical `aisounds.json` pack manifest. Used by the
 * web server on publish and by the CLI on install to validate the downloaded
 * bundle.
 */

const LICENSE = z.enum(['CC0', 'CC-BY', 'CC-BY-SA', 'MIT'])

const HEX_COLOR = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/u, 'cover_color must be a 6-digit hex color (e.g. #6366f1)')

const SLUG = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'slug must be lowercase kebab-case')

const EVENT_KEYS = Object.keys(EVENT_SPEC) as [SoundEvent, ...SoundEvent[]]
const SoundEventSchema = z.enum(EVENT_KEYS)

const SoundEntrySchema = z.object({
  file: z.string().min(1),
  file_fallback: z.string().min(1).optional(),
  duration_ms: z.number().int().positive().max(10_000),
  loop: z.boolean().default(false),
  size_bytes: z.number().int().positive().optional(),
})

const ToolConfigSchema = z.object({
  config_path: z.string().min(1),
  hook_format: z.string().min(1),
})

export const PackManifestSchema = z.object({
  $schema: z.string().url().optional(),
  version: z.literal('1.0'),
  pack: z.object({
    id: z.string().uuid().optional(),
    slug: SLUG,
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    author: z.string().min(1).max(50),
    author_url: z.string().url().optional(),
    license: LICENSE,
    tags: z.array(z.string()).max(5).default([]),
    cover_color: HEX_COLOR.optional(),
    created_at: z.string().datetime().optional(),
    aise_version: z.string().default('1.0'),
  }),
  sounds: z.record(SoundEventSchema, SoundEntrySchema).refine(
    (sounds) => 'task_complete' in sounds,
    { message: "Every pack MUST define a 'task_complete' sound (AISE v1.0 required event)" },
  ),
  tool_configs: z.record(z.string(), ToolConfigSchema).optional(),
})

export type PackManifest = z.infer<typeof PackManifestSchema>
export type PackSoundEntry = z.infer<typeof SoundEntrySchema>

export function parseManifest(input: unknown): PackManifest {
  return PackManifestSchema.parse(input)
}

export function safeParseManifest(input: unknown) {
  return PackManifestSchema.safeParse(input)
}
