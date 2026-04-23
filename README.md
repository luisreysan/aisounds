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
- A **Supabase** cloud project (free tier is fine)
- A **GitHub OAuth App** for NextAuth

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

**Option B — `psql`.** Set `SUPABASE_DB_URL` in your environment, then:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init_schema.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_triggers.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_storage_buckets.sql
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

### 5. Create a GitHub OAuth App

https://github.com/settings/developers → **New OAuth App**

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

### 6. Fill in env vars

```bash
cp .env.template apps/web/.env.local
# then edit apps/web/.env.local and paste the values from steps 2 and 5
```

You can generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
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

This is an in-progress scaffolding. The current phase delivers the monorepo
structure, shared event vocabulary, web/CLI skeletons and the Supabase schema.
Upcoming phases will layer on NextAuth, the browse/upload flows, voting and
the real CLI installer commands.

## License

MIT for the code in this repository. Individual sound packs carry their own
license declared in the upload flow (CC0, CC-BY, CC-BY-SA or MIT).
