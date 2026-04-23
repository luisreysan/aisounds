-- =============================================================================
-- AI Sounds — initial schema (v1.0)
-- =============================================================================
-- Tables, indexes, tag seed inserts and Row Level Security policies.
-- Triggers live in 0002_triggers.sql and Storage buckets in 0003_storage_buckets.sql.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS (extended from Supabase Auth) ----------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id     VARCHAR(50) UNIQUE NOT NULL,
  username      VARCHAR(50) UNIQUE NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  github_url    TEXT,
  bio           VARCHAR(300),
  is_admin      BOOLEAN DEFAULT FALSE,
  is_banned     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PACKS ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(80) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  description     VARCHAR(500),
  author_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'unlisted', 'banned')),
  license         VARCHAR(20) DEFAULT 'CC0'
                  CHECK (license IN ('CC0', 'CC-BY', 'CC-BY-SA', 'MIT')),
  cover_color     VARCHAR(7) DEFAULT '#6366f1',
  aise_version    VARCHAR(10) DEFAULT '1.0',
  download_count  INTEGER DEFAULT 0,
  vote_count      INTEGER DEFAULT 0,
  forked_from_id  UUID REFERENCES public.packs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_packs_slug         ON public.packs(slug);
CREATE INDEX IF NOT EXISTS idx_packs_author_id    ON public.packs(author_id);
CREATE INDEX IF NOT EXISTS idx_packs_status       ON public.packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_vote_count   ON public.packs(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_packs_published_at ON public.packs(published_at DESC);

-- SOUNDS (files within a pack) -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.sounds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id           UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  event             VARCHAR(50) NOT NULL,
  storage_path_ogg  TEXT NOT NULL,
  storage_path_mp3  TEXT,
  public_url_ogg    TEXT NOT NULL,
  public_url_mp3    TEXT,
  duration_ms       INTEGER NOT NULL,
  size_bytes        INTEGER NOT NULL,
  original_format   VARCHAR(10),
  is_loop           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pack_id, event)
);

CREATE INDEX IF NOT EXISTS idx_sounds_pack_id ON public.sounds(pack_id);
CREATE INDEX IF NOT EXISTS idx_sounds_event   ON public.sounds(event);

-- TAGS -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(30) UNIQUE NOT NULL,
  slug  VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO public.tags (name, slug) VALUES
  ('Lofi',       'lofi'),
  ('Ambient',    'ambient'),
  ('Retro',      'retro'),
  ('Synthwave',  'synthwave'),
  ('Nature',     'nature'),
  ('Minimal',    'minimal'),
  ('Sci-Fi',     'sci-fi'),
  ('Chiptune',   'chiptune'),
  ('Cyberpunk',  'cyberpunk'),
  ('Acoustic',   'acoustic'),
  ('Electronic', 'electronic'),
  ('Funny',      'funny'),
  ('Dark',       'dark'),
  ('Bright',     'bright'),
  ('Calm',       'calm')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pack_tags (
  pack_id  UUID REFERENCES public.packs(id) ON DELETE CASCADE,
  tag_id   INTEGER REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, tag_id)
);

-- SUPPORTED TOOLS (per pack) --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pack_tools (
  pack_id  UUID REFERENCES public.packs(id) ON DELETE CASCADE,
  tool     VARCHAR(30) NOT NULL,
  PRIMARY KEY (pack_id, tool)
);

-- VOTES ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.votes (
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id    UUID REFERENCES public.packs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

-- DOWNLOADS ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.downloads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id     UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tool        VARCHAR(30),
  platform    VARCHAR(10),
  version     VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloads_pack_id    ON public.downloads(pack_id);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON public.downloads(created_at DESC);

-- REMIX SOURCES (Frankenstein packs) -----------------------------------------
CREATE TABLE IF NOT EXISTS public.remix_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remix_pack_id   UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  source_pack_id  UUID NOT NULL REFERENCES public.packs(id) ON DELETE RESTRICT,
  event           VARCHAR(50) NOT NULL,
  sound_id        UUID NOT NULL REFERENCES public.sounds(id) ON DELETE RESTRICT
);

-- ROW LEVEL SECURITY ---------------------------------------------------------
ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sounds    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read public profile; user can update their own row.
DROP POLICY IF EXISTS "users_public_read" ON public.users;
CREATE POLICY "users_public_read"  ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update"  ON public.users FOR UPDATE USING (auth.uid() = id);

-- Packs: anyone can read published packs; authors have full control over their own.
DROP POLICY IF EXISTS "packs_public_read" ON public.packs;
CREATE POLICY "packs_public_read"  ON public.packs FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "packs_author_all" ON public.packs;
CREATE POLICY "packs_author_all"   ON public.packs FOR ALL   USING (auth.uid() = author_id);

-- Sounds: readable only when the parent pack is published.
DROP POLICY IF EXISTS "sounds_public_read" ON public.sounds;
CREATE POLICY "sounds_public_read" ON public.sounds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packs
    WHERE public.packs.id = public.sounds.pack_id
      AND public.packs.status = 'published'
  ));

-- Votes: public read, authenticated insert/delete for own votes.
DROP POLICY IF EXISTS "votes_public_read" ON public.votes;
CREATE POLICY "votes_public_read"  ON public.votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "votes_auth_insert" ON public.votes;
CREATE POLICY "votes_auth_insert"  ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "votes_auth_delete" ON public.votes;
CREATE POLICY "votes_auth_delete"  ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- Downloads: anyone (including anonymous) can record a download.
DROP POLICY IF EXISTS "downloads_insert" ON public.downloads;
CREATE POLICY "downloads_insert"   ON public.downloads FOR INSERT WITH CHECK (true);
