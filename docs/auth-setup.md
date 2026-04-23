# Auth setup — GitHub OAuth via Supabase

AI Sounds uses **Supabase Auth** with a **GitHub** provider. No NextAuth, no
passwords, no email flow — the same button on the site drives both local
development and production.

## Why Supabase Auth (and not NextAuth)

Our database already references `auth.users(id)` and every Row Level Security
policy expects `auth.uid()` to match the current user. Supabase Auth sets that
session natively; adding NextAuth on top would require forging a Supabase-
compatible JWT for every request.

## One-time configuration

You only need to do this once per Supabase project + GitHub OAuth app pair.

### 1. Create a GitHub OAuth App

[https://github.com/settings/developers](https://github.com/settings/developers) -> **OAuth Apps** -> **New OAuth App**


| Field                      | Value                                                 |
| -------------------------- | ----------------------------------------------------- |
| Application name           | `AI Sounds` (or whatever you like)                    |
| Homepage URL               | Your deployed URL, e.g. `https://aisounds.vercel.app` |
| Authorization callback URL | `https://<project-ref>.supabase.co/auth/v1/callback`  |


After creating the app copy the **Client ID** and generate a **Client Secret**.

> The callback URL MUST point at Supabase, not at your app. Supabase handles
> the GitHub dance and only then redirects to your `/auth/callback` route.

### 2. Enable the GitHub provider in Supabase

Supabase dashboard -> **Authentication** -> **OAuth Apps** (older projects call
this section **Providers**) -> **GitHub**:

- Toggle **GitHub enabled** on
- Paste the **Client ID** and **Client Secret** from step 1
- Copy the **Callback URL (for OAuth)** and double-check it matches what you
set in GitHub

### 3. Configure Site URL and Redirect URLs

Supabase dashboard -> **Authentication** -> **URL Configuration**:

- **Site URL:** your canonical public URL, e.g. `https://aisounds.vercel.app`
(use `http://localhost:3000` if you only run locally)
- **Redirect URLs:** add both entries (the `/`** wildcard is important):
  - `http://localhost:3000/**`
  - `https://<your-vercel-url>.vercel.app/**`
  - plus any custom domain you plan to ship on

Without these entries Supabase rejects the OAuth callback with
`requested path is invalid`.

### 4. Apply the auth trigger migration

Run `[supabase/migrations/0004_auth_user_trigger.sql](../supabase/migrations/0004_auth_user_trigger.sql)`
via the Supabase SQL editor or `psql`. This installs the trigger that copies
the GitHub metadata from `auth.users` into `public.users` on first login.

### 5. Set env vars

Locally, copy `[.env.template](../.env.template)` to `apps/web/.env.local` and
fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel add the same variables under **Project Settings -> Environment
Variables** for both Preview and Production. `NEXT_PUBLIC_SITE_URL` can be left
empty on Vercel — the code falls back to `VERCEL_URL` automatically.

## How the runtime flow works

```
User clicks "Continue with GitHub"
    -> form submits to `signInWithGithub` server action
       -> supabase.auth.signInWithOAuth(provider=github, redirectTo=/auth/callback)
          -> browser redirected to GitHub
             -> GitHub redirects back to Supabase's /auth/v1/callback
                -> Supabase redirects to our /auth/callback?code=...
                   -> exchangeCodeForSession(code) -> auth cookies dropped
                   -> AFTER INSERT trigger seeds public.users
                   -> redirect to home (or ?next=...)
```

## Verifying it works

1. Start the dev server: `pnpm dev`
2. Open [http://localhost:3000](http://localhost:3000) and click **Sign in** in the header
3. Continue with GitHub -> authorize -> you should land back on `/`
4. The header should now show your GitHub avatar with a dropdown
5. In the Supabase dashboard verify:
  - A row exists in `auth.users` with your GitHub metadata
  - A matching row exists in `public.users` with `username`, `github_id`,
  `avatar_url` populated
6. Click **Sign out** in the dropdown -> header reverts to **Sign in** button

## Troubleshooting

- **"redirect_uri is not associated with this application"** on GitHub: the
GitHub OAuth app's Authorization callback URL must be the SUPABASE URL, not
your Vercel or localhost URL.
- **"requested path is invalid"** on Supabase: add the missing URL pattern
under **URL Configuration -> Redirect URLs**.
- **User lands signed in but `/login` still shows**: hard refresh — the
middleware needs one full navigation to set the cookies.
- **No row in `public.users` after first login**: confirm the 0004 migration
ran. The function needs `SECURITY DEFINER` to bypass RLS while inserting.

