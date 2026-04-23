-- =============================================================================
-- AI Sounds — triggers (v1.0)
-- =============================================================================
-- Keeps `packs.vote_count` and `packs.download_count` in sync with insert /
-- delete events on their child tables. Running count is eventually consistent
-- under Row Level Security because these triggers run with the privileges of
-- the table owner, not the caller.
-- =============================================================================

-- VOTE COUNT -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.packs SET vote_count = vote_count + 1 WHERE id = NEW.pack_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.packs SET vote_count = vote_count - 1 WHERE id = OLD.pack_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_count ON public.votes;
CREATE TRIGGER trigger_vote_count
AFTER INSERT OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.update_vote_count();

-- DOWNLOAD COUNT -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.packs SET download_count = download_count + 1 WHERE id = NEW.pack_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_download_count ON public.downloads;
CREATE TRIGGER trigger_download_count
AFTER INSERT ON public.downloads
FOR EACH ROW EXECUTE FUNCTION public.update_download_count();

-- updated_at helper ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_packs_updated_at ON public.packs;
CREATE TRIGGER trigger_packs_updated_at
BEFORE UPDATE ON public.packs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
