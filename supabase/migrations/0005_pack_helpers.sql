-- =============================================================================
-- AI Sounds — pack helpers (v1.0)
-- =============================================================================
-- Read-side helpers that denormalize the data we keep showing on listing cards
-- and detail pages. Everything here is idempotent so you can re-run the file.
--
-- Changes:
--   1. View `pack_cards_v`  — published packs + author + tags + tools aggregates
--   2. Function `get_trending_packs()`  — last-month ranked feed
--   3. Function `has_user_voted()`      — convenience for RLS-safe vote lookup
-- =============================================================================

-- 1. Listing view -------------------------------------------------------------
DROP VIEW IF EXISTS public.pack_cards_v;
CREATE VIEW public.pack_cards_v AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.description,
  p.license,
  p.cover_color,
  p.aise_version,
  p.download_count,
  p.vote_count,
  p.status,
  p.created_at,
  p.published_at,
  p.updated_at,
  p.forked_from_id,
  p.author_id,
  u.username        AS author_username,
  u.display_name    AS author_display_name,
  u.avatar_url      AS author_avatar_url,
  COALESCE(
    (SELECT array_agg(t.slug ORDER BY t.slug)
     FROM public.pack_tags pt
     JOIN public.tags t ON t.id = pt.tag_id
     WHERE pt.pack_id = p.id),
    ARRAY[]::text[]
  )                 AS tag_slugs,
  COALESCE(
    (SELECT array_agg(t.name ORDER BY t.name)
     FROM public.pack_tags pt
     JOIN public.tags t ON t.id = pt.tag_id
     WHERE pt.pack_id = p.id),
    ARRAY[]::text[]
  )                 AS tag_names,
  COALESCE(
    (SELECT array_agg(pto.tool ORDER BY pto.tool)
     FROM public.pack_tools pto
     WHERE pto.pack_id = p.id),
    ARRAY[]::text[]
  )                 AS tool_slugs,
  (SELECT count(*)::int FROM public.sounds s WHERE s.pack_id = p.id)
                    AS sound_count
FROM public.packs p
JOIN public.users u ON u.id = p.author_id;

COMMENT ON VIEW public.pack_cards_v IS
  'Denormalized pack data for listing/detail cards. Includes tag/tool aggregates and sound count.';

GRANT SELECT ON public.pack_cards_v TO anon, authenticated;

-- 2. Trending feed ------------------------------------------------------------
-- Ranks published packs by a simple score:
--   score = vote_count * 5 + download_count + freshness_boost
-- where freshness_boost tapers over ~30 days using greatest(0, 30 - age_days).
CREATE OR REPLACE FUNCTION public.get_trending_packs(
  limit_count  INTEGER DEFAULT 12,
  offset_count INTEGER DEFAULT 0,
  tag_filter   TEXT    DEFAULT NULL,
  tool_filter  TEXT    DEFAULT NULL,
  search_query TEXT    DEFAULT NULL
)
RETURNS SETOF public.pack_cards_v
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT pc.*
  FROM public.pack_cards_v pc
  WHERE pc.status = 'published'
    AND (tag_filter  IS NULL OR tag_filter  = ANY (pc.tag_slugs))
    AND (tool_filter IS NULL OR tool_filter = ANY (pc.tool_slugs))
    AND (
      search_query IS NULL
      OR pc.name        ILIKE '%' || search_query || '%'
      OR pc.description ILIKE '%' || search_query || '%'
    )
  ORDER BY
    (pc.vote_count * 5 + pc.download_count
      + GREATEST(0, 30 - EXTRACT(DAY FROM (NOW() - COALESCE(pc.published_at, pc.created_at)))::INTEGER)
    ) DESC,
    pc.published_at DESC NULLS LAST
  LIMIT  limit_count
  OFFSET offset_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_packs(INTEGER, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3. has_user_voted -----------------------------------------------------------
-- Returns true if the currently authenticated user has voted for the given pack.
-- RLS on public.votes already allows `SELECT USING (true)`, so a client-side
-- query works too; this wrapper just keeps call sites compact.
CREATE OR REPLACE FUNCTION public.has_user_voted(pack UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.votes v
    WHERE v.pack_id = pack
      AND v.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_user_voted(UUID) TO authenticated;
