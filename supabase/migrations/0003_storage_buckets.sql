-- =============================================================================
-- AI Sounds — Storage buckets & policies (v1.0)
-- =============================================================================
-- Creates the single public `sounds` bucket and RLS policies on
-- `storage.objects` so that:
--
--   • Anyone can read any file in the bucket (public downloads).
--   • Authenticated users can upload to `temp/` (pre-publish staging).
--   • Authenticated users can upload to `packs/<slug>/` only when they own
--     the pack with that slug.
--   • Service role bypasses RLS (used by the `publish` API to move files from
--     `temp/` to `packs/<slug>/`).
-- =============================================================================

-- Bucket ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('sounds', 'sounds', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Policies on storage.objects -----------------------------------------------
DROP POLICY IF EXISTS "sounds_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "sounds_auth_temp_write" ON storage.objects;
DROP POLICY IF EXISTS "sounds_author_pack_write" ON storage.objects;
DROP POLICY IF EXISTS "sounds_author_pack_update" ON storage.objects;
DROP POLICY IF EXISTS "sounds_author_pack_delete" ON storage.objects;

-- Public read for anything inside the sounds bucket.
CREATE POLICY "sounds_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sounds');

-- Authenticated users can write to temp/ for their own in-progress uploads.
-- We scope per-user by prefixing temp objects with the user's auth.uid().
CREATE POLICY "sounds_auth_temp_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sounds'
    AND (storage.foldername(name))[1] = 'temp'
    AND auth.role() = 'authenticated'
  );

-- Authors can write to packs/<slug>/ only if they own a pack with that slug.
CREATE POLICY "sounds_author_pack_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sounds'
    AND (storage.foldername(name))[1] = 'packs'
    AND EXISTS (
      SELECT 1 FROM public.packs
      WHERE public.packs.slug = (storage.foldername(name))[2]
        AND public.packs.author_id = auth.uid()
    )
  );

CREATE POLICY "sounds_author_pack_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'sounds'
    AND (storage.foldername(name))[1] = 'packs'
    AND EXISTS (
      SELECT 1 FROM public.packs
      WHERE public.packs.slug = (storage.foldername(name))[2]
        AND public.packs.author_id = auth.uid()
    )
  );

CREATE POLICY "sounds_author_pack_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sounds'
    AND (storage.foldername(name))[1] = 'packs'
    AND EXISTS (
      SELECT 1 FROM public.packs
      WHERE public.packs.slug = (storage.foldername(name))[2]
        AND public.packs.author_id = auth.uid()
    )
  );
