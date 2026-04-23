# AI Sounds

Open source community platform where developers upload, share, vote, remix and
install sound packs for AI coding tools (Cursor, VS Code + Copilot, Claude Code,
Windsurf, Aider, etc.).

> When doing agentic programming your AI tool runs in the background. Different
> sounds for different events (task complete, error, thinking, etc.) let you
> know what's happening without watching the screen.

## Monorepo layout

```
aisounds/
├── apps/
│   ├── web/          → Next.js 15 website (deployed to Vercel)
│   └── cli/          → npm package `aisounds` (the `npx aisounds ...` CLI)
├── packages/
│   └── core/         → Shared AISE event vocabulary, manifest schema, rules
├── supabase/
│   ├── migrations/   → Versioned SQL migrations (apply in order)
│   └── seed.sql      → Seed data (Welcome Pack)
└── seed-pack/        → Audio assets shipped as the seed pack
```

## Prerequisites

- **Node.js** 20 or newer (tested with 22)
- **pnpm** 10 (installed via `npm install -g pnpm` or Corepack)
- A **Supabase** cloud project (free tier is fine) with the GitHub provider
  enabled — see [docs/auth-setup.md](docs/auth-setup.md)
- A **GitHub OAuth App** whose callback points at Supabase, not at the app

## Bootstrap

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create your Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. From the project dashboard collect:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key
   - `service_role` secret key
   - Database connection string (`Project Settings → Database → Connection string`)

### 3. Apply the schema

Pick one:

**Option A — SQL editor (simplest).** Open Supabase dashboard → SQL Editor and
paste each file in order:

1. `supabase/migrations/0001_init_schema.sql`
2. `supabase/migrations/0002_triggers.sql`
3. `supabase/migrations/0003_storage_buckets.sql`
4. `supabase/migrations/0004_auth_user_trigger.sql`
5. `supabase/migrations/0005_pack_helpers.sql`

**Option B — `psql`.** Set `SUPABASE_DB_URL` in your environment, then:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init_schema.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_triggers.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_storage_buckets.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0004_auth_user_trigger.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0005_pack_helpers.sql
```

### 4. (Optional) Seed the database

Once you've uploaded the audio files from [`seed-pack/`](./seed-pack/) to
Supabase Storage under `sounds/packs/welcome-pack/sounds/` (see the
`seed-pack/README.md`), run:

```bash
psql "$SUPABASE_DB_URL" \
     -v SUPABASE_URL="https://<project-ref>.supabase.co" \
     -f supabase/seed.sql
```

### 5. Configure GitHub OAuth

Follow [docs/auth-setup.md](docs/auth-setup.md). Summary:

1. Create a GitHub OAuth App with the callback URL pointing at
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Paste its Client ID + Client Secret into
   **Supabase dashboard → Authentication → OAuth Apps → GitHub**.
3. Add `http://localhost:3000/**` and your deployed URL to
   **Authentication → URL Configuration → Redirect URLs**.

No `GITHUB_CLIENT_ID` or `NEXTAUTH_SECRET` is needed in the app env — Supabase
handles the OAuth flow end-to-end.

### 6. Fill in env vars

```bash
cp .env.template apps/web/.env.local
# then edit apps/web/.env.local with the values from step 2
```

### 7. Run the dev server

```bash
pnpm dev
```

Open http://localhost:3000.

## Common scripts (Turborepo)

```bash
pnpm dev           # run apps/web in dev mode (with Turbopack)
pnpm build         # build every workspace package
pnpm lint          # lint every workspace package
pnpm type-check    # type-check every workspace package
pnpm format        # prettier --write across the monorepo
```

## Project status

This is an in-progress scaffolding.

- **Phase 1** ✅ monorepo structure, shared event vocabulary, web/CLI skeletons,
  Supabase schema.
- **Phase 2** ✅ Supabase Auth with GitHub OAuth, session refresh middleware,
  avatar dropdown, auto-provisioned `public.users` row on first login.
- **Phase 3** ✅ `/packs` browse with filters, `/packs/[slug]` detail with
  waveform player, optimistic voting, `/profile/[username]`, and the full
  `/upload` wizard that transcodes to OGG + MP3 server-side. See
  [docs/upload-flow.md](docs/upload-flow.md) for the architecture.
- **Phase 4** 🚧 downloadable `.zip` bundles via
  `/api/packs/[slug]/bundle`, lightweight metadata at
  `/api/packs/[slug]/meta`, and a real `aisounds` CLI with working
  `install` / `remove` / `list` / `info` / `update` / `preview` commands
  for Cursor and Claude Code (VS Code, Windsurf and Aider are advertised
  as "coming soon" stubs).
- **Phase 5** ⏳ Remix UI, remaining tool installers, cached bundles in
  Storage.

## License

MIT for the code in this repository. Individual sound packs carry their own
license declared in the upload flow (CC0, CC-BY, CC-BY-SA or MIT).
