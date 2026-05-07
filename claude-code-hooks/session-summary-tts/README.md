# session-summary-tts

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) `Stop` hook that
speaks an AI-generated voice summary of every session. Walk away from a long
task; come back to a 25-word readout of what got done.

```
You          ──►  Claude Code session  ──►  Stop event
                                              │
                              hook reads transcript
                                              │
                              `claude -p` (Haiku) summarizes
                                              │
                              ElevenLabs / Gemini TTS
                                              │
                              audio plays through speakers
```

No separate Anthropic API key required — the summary call uses your existing
`claude` CLI OAuth login.

## Install

From the repo root (or anywhere in a clone of `aisounds`):

```bash
pnpm install
node claude-code-hooks/session-summary-tts/install.mjs
```

The installer prompts for a provider (ElevenLabs or Gemini), takes the API key
with hidden input, writes `~/.claude/hooks/session-summary-tts.env` (chmod 600),
patches `~/.claude/settings.json` with a timestamped backup, and offers to run a
smoke test against your latest transcript.

To uninstall:

```bash
node claude-code-hooks/session-summary-tts/uninstall.mjs
```

## Providers

| Provider   | Cost (rough)       | Voices                                      | Notes                          |
| ---------- | ------------------ | ------------------------------------------- | ------------------------------ |
| ElevenLabs | ~$0.0001 / summary | Anything from the [voice library][elv-vox] | Default: **Daniel**, low-key   |
| Gemini     | Free tier covers most personal use   | Pre-built voices (default **Kore**)        | Returns PCM, wrapped to WAV    |

Set `TTS_PROVIDER=elevenlabs` or `gemini` in the env file (or via shell env) to
switch.

[elv-vox]: https://elevenlabs.io/app/voice-library

## Configuration

Real config lives at `~/.claude/hooks/session-summary-tts.env`. See
[`.env.example`](./.env.example) for every key. Highlights:

| Key                     | Default                | Purpose                                                                  |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `ENABLED`               | `1`                    | Master switch — set to `0` to mute without uninstalling                  |
| `TTS_PROVIDER`          | `elevenlabs`           | `elevenlabs` or `gemini`                                                 |
| `MIN_ASSISTANT_CHARS`   | `200`                  | Skip the readout for trivial sessions                                    |
| `CWD_BLOCKLIST`         | _(unset)_              | Comma-separated path substrings that suppress the hook                   |
| `SUMMARY_PROMPT`        | _(built-in)_           | Override the system prompt sent to Claude                                |
| `SESSION_SUMMARY_MODEL` | `claude-haiku-4-5`     | Model used for summarization                                             |
| `DRY_RUN`               | _(unset)_              | Print the summary to stdout, skip TTS                                    |

Shell env vars always win over the env file, so a one-shot
`ENABLED=0 claude` disables it for a single launch.

## What gets said

The built-in prompt forces:

- Hard cap at **25 words** — no rambling, low TTS cost.
- First-person past tense (_"I refactored the auth middleware."_) — leads with
  the outcome.
- Code described in natural English, not file paths.
- Question-style sessions answered in one line instead of summarized.
- **Never repeats secrets** from the transcript.
- No markdown, no emoji, no preamble.

You can replace the entire prompt by setting `SUMMARY_PROMPT` in the env file.

## Privacy

- The compacted transcript is sent to Claude (via your existing OAuth login)
  for summarization.
- The 25-word **summary** is sent to your chosen TTS provider (ElevenLabs or
  Google Gemini).
- No third party ever sees the raw transcript.
- Generated audio is cached at
  `~/.claude/cache/session-summaries/<session-id>.mp3` (or `.wav` for Gemini).
  Delete that directory at any time.

## Disabling

| Scope            | How                                               |
| ---------------- | ------------------------------------------------- |
| One launch       | `ENABLED=0 claude`                                |
| Until re-enabled | Set `ENABLED=0` in the env file                   |
| One project      | Add a path substring to `CWD_BLOCKLIST`           |
| Permanently      | `node uninstall.mjs`                              |

## Troubleshooting

- **Nothing plays.** Run with `SESSION_SUMMARY_TTS_DEBUG=1` and pipe a fake
  payload (see `install.mjs` smoke test) to see what failed.
- **`claude: command not found`** in hook logs. Set `CLAUDE_CLI` in the env
  file to the absolute path of your `claude` binary.
- **Linux: no audio.** Install one of `paplay` (`pulseaudio-utils`), `ffplay`
  (`ffmpeg`), or `mpv`.
- **Hook runs forever / fires repeatedly.** Check that the script's
  `SUMMARY_HOOK_RUNNING=1` re-entry guard is being honored — the env var must
  propagate to subprocesses.

## How it works

The hook is a single Node 20+ ESM script. On Stop:

1. Reads JSON payload from stdin (`session_id`, `transcript_path`, …).
2. Bails early if disabled, blocked, looping, or the session is too short.
3. Streams the JSONL transcript, keeps the last 30 user/assistant turns.
4. Spawns `claude -p --model claude-haiku-4-5 --output-format text` with the
   compacted transcript on stdin and the system prompt as
   `--append-system-prompt`. Sets `SUMMARY_HOOK_RUNNING=1` so the new session's
   own Stop hook short-circuits.
5. Sends the summary to the configured TTS provider.
6. Writes the audio file under `~/.claude/cache/session-summaries/`.
7. Spawns the platform-appropriate player **detached** and `unref()`s it so
   Claude Code's shutdown isn't blocked.

Errors at any step are swallowed — a failing voice summary should never block
your Stop event.
