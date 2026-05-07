-- =============================================================================
-- AI Sounds — development seed data
-- =============================================================================
-- Creates one published "Welcome Pack" authored by a seed admin user so that
-- a freshly provisioned Supabase project has real data to render on the
-- browse/pack/detail pages.
--
-- IMPORTANT: the audio files referenced by this seed MUST be uploaded to
-- Supabase Storage under `sounds/packs/welcome-pack/sounds/` (see
-- `seed-pack/README.md`). The placeholder `<SUPABASE_URL>` below is replaced
-- via `psql --set` or manual find-and-replace before running.
--
-- Run with:
--   psql "$SUPABASE_DB_URL" \
--        -v SUPABASE_URL="https://<project-ref>.supabase.co" \
--        -f supabase/seed.sql
-- =============================================================================

\set SUPABASE_URL :'SUPABASE_URL'

-- Seed auth user (only possible with service role credentials / psql).
-- NOTE: In a production environment the bot user should be created manually
-- through the Supabase Auth dashboard and its UUID pasted here instead.
DO $$
DECLARE
  bot_uuid UUID := '00000000-0000-0000-0000-00000000b0b0';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  )
  VALUES (
    bot_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bot@aisounds.dev',
    crypt('seed-only-not-a-real-password', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"seed","providers":["seed"]}',
    '{"name":"AI Sounds Bot"}'
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

INSERT INTO public.users (
  id, github_id, username, display_name, avatar_url, github_url, bio, is_admin
)
VALUES (
  '00000000-0000-0000-0000-00000000b0b0',
  'bot',
  'ai-sounds-bot',
  'AI Sounds Bot',
  'https://avatars.githubusercontent.com/u/9919?s=200',
  'https://github.com/aisounds',
  'Official seed account. Ships the Welcome Pack with every deployment.',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Welcome pack ---------------------------------------------------------------
INSERT INTO public.packs (
  id, slug, name, description, author_id, status, license,
  aise_version, published_at
)
VALUES (
  '00000000-0000-0000-0000-00000000dec1',
  'welcome-pack',
  'Welcome Pack',
  'A minimal pack shipped with every fresh AI Sounds deployment. Maps xylophone, cash register, paper flip and a murloc cry to core AISE events so you have something to play with on day one.',
  '00000000-0000-0000-0000-00000000b0b0',
  'published',
  'CC0',
  '1.0',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Tag the pack: Retro + Funny + Bright
INSERT INTO public.pack_tags (pack_id, tag_id)
SELECT '00000000-0000-0000-0000-00000000dec1', id
FROM public.tags
WHERE slug IN ('retro', 'funny', 'bright')
ON CONFLICT DO NOTHING;

-- Supported tools
INSERT INTO public.pack_tools (pack_id, tool) VALUES
  ('00000000-0000-0000-0000-00000000dec1', 'cursor'),
  ('00000000-0000-0000-0000-00000000dec1', 'vscode'),
  ('00000000-0000-0000-0000-00000000dec1', 'claude-code')
ON CONFLICT DO NOTHING;

-- Sounds ---------------------------------------------------------------------
-- Storage paths follow the layout documented in `seed-pack/README.md`.
INSERT INTO public.sounds (
  pack_id, event, storage_path_ogg, storage_path_mp3,
  public_url_ogg, public_url_mp3, duration_ms, size_bytes, original_format, is_loop
)
VALUES
  (
    '00000000-0000-0000-0000-00000000dec1',
    'task_complete',
    'packs/welcome-pack/sounds/task_complete.ogg',
    'packs/welcome-pack/sounds/task_complete.mp3',
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/task_complete.ogg',
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/task_complete.mp3',
    1500, 10333, 'mp3', FALSE
  ),
  (
    '00000000-0000-0000-0000-00000000dec1',
    'celebration',
    'packs/welcome-pack/sounds/celebration.ogg',
    'packs/welcome-pack/sounds/celebration.mp3',
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/celebration.ogg',
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/celebration.mp3',
    1200, 11544, 'mp3', FALSE
  ),
  (
    '00000000-0000-0000-0000-00000000dec1',
    'file_modified',
    'packs/welcome-pack/sounds/file_modified.ogg',
    'packs/welcome-pack/sounds/file_modified.mp3',
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/file_modified.ogg',
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/file_modified.mp3',
    300, 20136, 'mp3', FALSE
  ),
  (
    '00000000-0000-0000-0000-00000000dec1',
    'task_failed',
    'packs/welcome-pack/sounds/task_failed.ogg',
    NULL,
    :'SUPABASE_URL' || '/storage/v1/object/public/sounds/packs/welcome-pack/sounds/task_failed.ogg',
    NULL,
    1800, 14122, 'ogg', FALSE
  )
ON CONFLICT (pack_id, event) DO NOTHING;
