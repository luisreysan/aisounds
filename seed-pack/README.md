# Welcome Pack — seed audio assets

These six audio files are shipped with the repo so that a brand-new deployment
of AI Sounds has at least one published pack to browse, play and preview.

| File                       | Mapped event    | Notes                                    |
|----------------------------|-----------------|------------------------------------------|
| `xylophone.mp3`            | `task_complete` | Cheerful success chime (required event). |
| `cash_register.mp3`        | `celebration`   | Short "ka-ching" for big wins.           |
| `book_page.mp3`            | `file_modified` | Paper flip for edits.                    |
| `mMurlocAggroOld.ogg`      | `task_failed`   | Ambient "uh oh" cue.                     |
| `book_page.wav`            | (source)        | Higher quality source for `book_page`.   |
| `mMurlocAggroOld.wav`      | (source)        | Higher quality source for the murloc.    |

The companion seed record in [`../supabase/seed.sql`](../supabase/seed.sql)
references these files once they are uploaded to Supabase Storage under
`packs/welcome-pack/sounds/`.

## How to upload them

Run the helper script from the repo root once your Supabase project is ready
and your env vars are set:

```bash
pnpm --filter @aisounds/web run seed:upload  # will be implemented in a later phase
```

Until that script exists, you can upload the 4 mapped files manually via the
Supabase dashboard Storage UI, placing them under:

```
sounds/packs/welcome-pack/sounds/task_complete.mp3
sounds/packs/welcome-pack/sounds/celebration.mp3
sounds/packs/welcome-pack/sounds/file_modified.mp3
sounds/packs/welcome-pack/sounds/task_failed.ogg
```

Then run `supabase/seed.sql` in the SQL editor to create the matching DB rows.
