# Republish `welcome-pack` in production (TODO)

The seed pack slug `welcome-pack` is referenced in docs and examples but may
return **404** from `/api/packs/welcome-pack/meta` if it was never published
in the production Supabase project.

## Steps

1. Upload audio from [seed-pack/](../seed-pack/) to Supabase Storage under
   `sounds/packs/welcome-pack/sounds/` (see [seed-pack/README.md](../seed-pack/README.md)).

2. Run [supabase/seed.sql](../supabase/seed.sql) against the **production** database
   (with `SUPABASE_URL` set to your project URL):

   ```bash
   psql "$SUPABASE_DB_URL" \
        -v SUPABASE_URL="https://<project-ref>.supabase.co" \
        -f supabase/seed.sql
   ```

3. Confirm the pack is **published** in the dashboard (status `published`).

4. Smoke-test:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://aisounds.dev/api/packs/welcome-pack/meta
   npx @aisounds/cli@latest info welcome-pack
   npx @aisounds/cli@latest install welcome-pack --tool cursor
   ```

5. Update examples in README / docs to prefer `welcome-pack` once live.
