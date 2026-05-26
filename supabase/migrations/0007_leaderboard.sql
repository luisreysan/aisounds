-- =============================================================================
-- AI Sounds — leaderboard RPCs (packs, creators, platform stats)
-- =============================================================================

-- Top published packs ranked by engagement score (votes * 5 + downloads).
CREATE OR REPLACE FUNCTION public.get_top_packs(
  limit_count  INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0,
  period       TEXT    DEFAULT 'all'
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
    AND (
      period IS NULL
      OR period = 'all'
      OR (
        period = 'week'
        AND COALESCE(pc.published_at, pc.created_at) >= NOW() - INTERVAL '7 days'
      )
      OR (
        period = 'month'
        AND COALESCE(pc.published_at, pc.created_at) >= NOW() - INTERVAL '30 days'
      )
    )
  ORDER BY
    (pc.vote_count * 5 + pc.download_count) DESC,
    pc.published_at DESC NULLS LAST,
    pc.vote_count DESC
  LIMIT  limit_count
  OFFSET offset_count;
$$;

COMMENT ON FUNCTION public.get_top_packs(INTEGER, INTEGER, TEXT) IS
  'Leaderboard of published packs by engagement score. period: week | month | all.';

GRANT EXECUTE ON FUNCTION public.get_top_packs(INTEGER, INTEGER, TEXT) TO anon, authenticated;

-- Top creators aggregated from published packs in the selected period.
CREATE OR REPLACE FUNCTION public.get_top_creators(
  limit_count  INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0,
  period       TEXT    DEFAULT 'all'
)
RETURNS TABLE (
  author_id         UUID,
  username          VARCHAR(50),
  display_name      VARCHAR(100),
  avatar_url        TEXT,
  pack_count        BIGINT,
  total_votes       BIGINT,
  total_downloads   BIGINT,
  score             BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    pc.author_id,
    MAX(pc.author_username)::varchar(50)     AS username,
    MAX(pc.author_display_name)::varchar(100) AS display_name,
    MAX(pc.author_avatar_url)               AS avatar_url,
    COUNT(*)::bigint                        AS pack_count,
    COALESCE(SUM(pc.vote_count), 0)::bigint AS total_votes,
    COALESCE(SUM(pc.download_count), 0)::bigint AS total_downloads,
    COALESCE(SUM(pc.vote_count * 5 + pc.download_count), 0)::bigint AS score
  FROM public.pack_cards_v pc
  WHERE pc.status = 'published'
    AND (
      period IS NULL
      OR period = 'all'
      OR (
        period = 'week'
        AND COALESCE(pc.published_at, pc.created_at) >= NOW() - INTERVAL '7 days'
      )
      OR (
        period = 'month'
        AND COALESCE(pc.published_at, pc.created_at) >= NOW() - INTERVAL '30 days'
      )
    )
  GROUP BY pc.author_id
  ORDER BY score DESC, total_votes DESC, pack_count DESC
  LIMIT  limit_count
  OFFSET offset_count;
$$;

COMMENT ON FUNCTION public.get_top_creators(INTEGER, INTEGER, TEXT) IS
  'Leaderboard of creators by aggregated pack engagement. period: week | month | all.';

GRANT EXECUTE ON FUNCTION public.get_top_creators(INTEGER, INTEGER, TEXT) TO anon, authenticated;

-- Global platform stats for the leaderboard hero bar.
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
  total_packs       BIGINT,
  total_downloads   BIGINT,
  total_creators    BIGINT,
  top_pack_slug     TEXT,
  top_pack_name     TEXT,
  top_pack_votes    INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH published AS (
    SELECT *
    FROM public.pack_cards_v
    WHERE status = 'published'
  ),
  top_pack AS (
    SELECT slug, name, vote_count
    FROM published
    ORDER BY vote_count DESC, download_count DESC
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM published) AS total_packs,
    (SELECT COALESCE(SUM(download_count), 0)::bigint FROM published) AS total_downloads,
    (SELECT COUNT(DISTINCT author_id)::bigint FROM published) AS total_creators,
    (SELECT slug FROM top_pack) AS top_pack_slug,
    (SELECT name FROM top_pack) AS top_pack_name,
    (SELECT vote_count FROM top_pack) AS top_pack_votes;
$$;

COMMENT ON FUNCTION public.get_platform_stats() IS
  'Aggregate stats for the leaderboard hero section.';

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
