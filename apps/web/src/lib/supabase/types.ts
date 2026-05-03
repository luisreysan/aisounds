/**
 * Manually authored Database type that mirrors what
 * `supabase gen types typescript` would produce. This keeps the Supabase
 * clients strongly typed without forcing us to run the Supabase CLI yet.
 *
 * Keep this file in sync with the SQL migrations under `supabase/migrations/`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type PackStatus = 'draft' | 'published' | 'unlisted' | 'banned'
type License = 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'MIT'

interface UserTable {
  Row: {
    id: string
    github_id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    github_url: string | null
    bio: string | null
    is_admin: boolean
    is_banned: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id: string
    github_id: string
    username: string
    display_name?: string | null
    avatar_url?: string | null
    github_url?: string | null
    bio?: string | null
    is_admin?: boolean
    is_banned?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: Partial<UserTable['Insert']>
  Relationships: []
}

interface PackTable {
  Row: {
    id: string
    slug: string
    name: string
    description: string | null
    author_id: string
    status: PackStatus
    license: License
    aise_version: string
    download_count: number
    vote_count: number
    forked_from_id: string | null
    created_at: string
    updated_at: string
    published_at: string | null
  }
  Insert: {
    id?: string
    slug: string
    name: string
    description?: string | null
    author_id: string
    status?: PackStatus
    license?: License
    aise_version?: string
    download_count?: number
    vote_count?: number
    forked_from_id?: string | null
    created_at?: string
    updated_at?: string
    published_at?: string | null
  }
  Update: Partial<PackTable['Insert']>
  Relationships: []
}

interface SoundTable {
  Row: {
    id: string
    pack_id: string
    event: string
    storage_path_ogg: string
    storage_path_mp3: string | null
    public_url_ogg: string
    public_url_mp3: string | null
    duration_ms: number
    size_bytes: number
    original_format: string | null
    is_loop: boolean
    created_at: string
  }
  Insert: {
    id?: string
    pack_id: string
    event: string
    storage_path_ogg: string
    storage_path_mp3?: string | null
    public_url_ogg: string
    public_url_mp3?: string | null
    duration_ms: number
    size_bytes: number
    original_format?: string | null
    is_loop?: boolean
    created_at?: string
  }
  Update: Partial<SoundTable['Insert']>
  Relationships: []
}

interface TagTable {
  Row: { id: number; name: string; slug: string }
  Insert: { id?: number; name: string; slug: string }
  Update: Partial<TagTable['Insert']>
  Relationships: []
}

interface PackTagTable {
  Row: { pack_id: string; tag_id: number }
  Insert: { pack_id: string; tag_id: number }
  Update: Partial<PackTagTable['Insert']>
  Relationships: []
}

interface PackToolTable {
  Row: { pack_id: string; tool: string }
  Insert: { pack_id: string; tool: string }
  Update: Partial<PackToolTable['Insert']>
  Relationships: []
}

interface VoteTable {
  Row: { user_id: string; pack_id: string; created_at: string }
  Insert: { user_id: string; pack_id: string; created_at?: string }
  Update: Partial<VoteTable['Insert']>
  Relationships: []
}

interface DownloadTable {
  Row: {
    id: string
    pack_id: string
    user_id: string | null
    tool: string | null
    platform: string | null
    version: string | null
    created_at: string
  }
  Insert: {
    id?: string
    pack_id: string
    user_id?: string | null
    tool?: string | null
    platform?: string | null
    version?: string | null
    created_at?: string
  }
  Update: Partial<DownloadTable['Insert']>
  Relationships: []
}

interface RemixSourceTable {
  Row: {
    id: string
    remix_pack_id: string
    source_pack_id: string
    event: string
    sound_id: string
  }
  Insert: {
    id?: string
    remix_pack_id: string
    source_pack_id: string
    event: string
    sound_id: string
  }
  Update: Partial<RemixSourceTable['Insert']>
  Relationships: []
}

interface PackCardsView {
  Row: {
    id: string
    slug: string
    name: string
    description: string | null
    license: License
    aise_version: string
    download_count: number
    vote_count: number
    status: PackStatus
    created_at: string
    published_at: string | null
    updated_at: string
    forked_from_id: string | null
    author_id: string
    author_username: string
    author_display_name: string | null
    author_avatar_url: string | null
    tag_slugs: string[]
    tag_names: string[]
    tool_slugs: string[]
    sound_count: number
  }
  Relationships: []
}

/**
 * We keep the `Database` generic permissive on purpose: authoring a fully
 * typed schema that satisfies the strict generics of `supabase-js` 2.x is
 * noisy and fragile without the CLI. Every call site that needs strong
 * typing imports the standalone row aliases below instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any

export type UserRow = UserTable['Row']
export type UserInsert = UserTable['Insert']
export type PackRow = PackTable['Row']
export type PackInsert = PackTable['Insert']
export type SoundRow = SoundTable['Row']
export type SoundInsert = SoundTable['Insert']
export type TagRow = TagTable['Row']
export type VoteInsert = VoteTable['Insert']
export type DownloadInsert = DownloadTable['Insert']
export type PackCardRow = PackCardsView['Row']

export type GetTrendingPacksArgs = {
  limit_count?: number
  offset_count?: number
  tag_filter?: string | null
  tool_filter?: string | null
  search_query?: string | null
}
