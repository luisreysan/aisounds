-- =============================================================================
-- AI Sounds — auth.users -> public.users trigger (v1.0)
-- =============================================================================
-- When a new row is inserted into auth.users (i.e. the first time a visitor
-- signs in through GitHub OAuth) automatically seed the matching row in
-- public.users using the GitHub metadata Supabase stores in raw_user_meta_data.
--
-- Rationale:
--   - Our RLS policies reference public.users via auth.uid() = id, so every
--     authenticated user MUST have a matching public.users row.
--   - GitHub usernames are globally unique, so we use user_name / provider_id
--     directly as github_id / username.
--   - SECURITY DEFINER + an explicit search_path lets the function bypass RLS
--     only while executing its own INSERT, which is what we want.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_github_id TEXT;
  v_username  TEXT;
BEGIN
  v_github_id := NEW.raw_user_meta_data->>'provider_id';
  v_username  := COALESCE(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'preferred_username',
    'user_' || substr(NEW.id::text, 1, 8)
  );

  INSERT INTO public.users (
    id, github_id, username, display_name, avatar_url, github_url
  )
  VALUES (
    NEW.id,
    COALESCE(v_github_id, 'unknown_' || substr(NEW.id::text, 1, 8)),
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', v_username),
    NEW.raw_user_meta_data->>'avatar_url',
    'https://github.com/' || v_username
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
