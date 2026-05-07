#!/usr/bin/env node
// Interactive installer for the session-summary-tts Claude Code hook.
// - Prompts for provider + API key (hidden).
// - Writes ~/.claude/hooks/session-summary-tts.env (chmod 600).
// - Patches ~/.claude/settings.json with a timestamped backup.
// - Optionally runs a smoke test against the latest transcript.

import { spawn } from "node:child_process";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, platform as osPlatform } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { confirm, input, password, select } from "@inquirer/prompts";

const HOME = homedir();
const HOOKS_DIR = path.join(HOME, ".claude", "hooks");
const ENV_PATH = path.join(HOOKS_DIR, "session-summary-tts.env");
const SETTINGS_PATH = path.join(HOME, ".claude", "settings.json");
const SCRIPT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "index.mjs");
const HOOK_COMMAND = `node ${quoteForJson(SCRIPT_PATH)}`;

function quoteForJson(absPath) {
  return absPath.includes(" ") ? `"${absPath}"` : absPath;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function backup(filePath) {
  if (!existsSync(filePath)) return null;
  const dest = `${filePath}.bak-session-summary-tts-${timestamp()}`;
  await copyFile(filePath, dest);
  return dest;
}

async function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  const raw = await readFile(SETTINGS_PATH, "utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function ensureStopHookEntry(settings) {
  settings.hooks = settings.hooks || {};
  settings.hooks.Stop = settings.hooks.Stop || [];

  for (const entry of settings.hooks.Stop) {
    const list = Array.isArray(entry?.hooks) ? entry.hooks : [];
    if (list.some((h) => typeof h?.command === "string" && h.command.includes(SCRIPT_PATH))) {
      return false; // already installed
    }
  }

  settings.hooks.Stop.push({
    matcher: "",
    hooks: [{ type: "command", command: HOOK_COMMAND }],
  });
  return true;
}

function writeEnvFile(values) {
  const lines = [
    "# session-summary-tts config — managed by install.mjs",
    "# Re-run install to update; remove this file to reset to defaults.",
    "",
  ];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    lines.push(`${key}=${value}`);
  }
  return lines.join("\n") + "\n";
}

async function smokeTest() {
  const projectsDir = path.join(HOME, ".claude", "projects");
  if (!existsSync(projectsDir)) {
    console.log("\nNo Claude Code projects found yet — skipping smoke test.");
    return;
  }

  const { readdir, stat } = await import("node:fs/promises");
  const projects = await readdir(projectsDir);
  let latestTranscript = null;
  let latestMtime = 0;
  for (const proj of projects) {
    const projDir = path.join(projectsDir, proj);
    const projStat = await stat(projDir).catch(() => null);
    if (!projStat?.isDirectory()) continue;
    const files = await readdir(projDir).catch(() => []);
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      const full = path.join(projDir, f);
      const fileStat = await stat(full).catch(() => null);
      if (fileStat && fileStat.mtimeMs > latestMtime) {
        latestMtime = fileStat.mtimeMs;
        latestTranscript = full;
      }
    }
  }

  if (!latestTranscript) {
    console.log("\nNo transcripts found yet — skipping smoke test.");
    return;
  }

  console.log(`\nSmoke testing against: ${latestTranscript}`);
  const payload = {
    session_id: "install-smoketest",
    transcript_path: latestTranscript,
    stop_hook_active: false,
    hook_event_name: "Stop",
    cwd: process.cwd(),
  };

  await new Promise((resolve) => {
    const child = spawn("node", [SCRIPT_PATH], {
      stdio: ["pipe", "inherit", "inherit"],
      env: { ...process.env, SESSION_SUMMARY_TTS_DEBUG: "1" },
    });
    child.on("close", resolve);
    child.on("error", resolve);
    child.stdin.end(JSON.stringify(payload));
  });
}

async function main() {
  console.log("Claude Code session-summary-tts — installer\n");

  const provider = await select({
    message: "Pick a TTS provider:",
    choices: [
      { name: "ElevenLabs (recommended)", value: "elevenlabs" },
      { name: "Gemini TTS (cheap, more voices)", value: "gemini" },
    ],
  });

  const env = { TTS_PROVIDER: provider };

  if (provider === "elevenlabs") {
    env.ELEVENLABS_API_KEY = await password({
      message: "ElevenLabs API key (input hidden):",
      mask: "*",
      validate: (v) => (v && v.startsWith("sk_") ? true : "Expected a key starting with 'sk_'"),
    });
    const customizeVoice = await confirm({
      message: "Customize voice ID? (default: Daniel)",
      default: false,
    });
    if (customizeVoice) {
      env.ELEVENLABS_VOICE_ID = await input({ message: "ElevenLabs voice ID:" });
    }
  } else {
    env.GEMINI_API_KEY = await password({
      message: "Google AI Studio (Gemini) API key (input hidden):",
      mask: "*",
    });
  }

  const setMinChars = await confirm({
    message: "Skip the voice readout for very short sessions?",
    default: true,
  });
  if (setMinChars) env.MIN_ASSISTANT_CHARS = "200";

  const blocklist = await input({
    message:
      "Block any project paths from triggering the readout? (comma-separated substrings, blank to skip)",
    default: "",
  });
  if (blocklist.trim()) env.CWD_BLOCKLIST = blocklist.trim();

  await mkdir(HOOKS_DIR, { recursive: true });
  const envBackup = await backup(ENV_PATH);
  await writeFile(ENV_PATH, writeEnvFile(env));
  await chmod(ENV_PATH, 0o600);
  console.log(`\nWrote: ${ENV_PATH} (chmod 600)`);
  if (envBackup) console.log(`Backup of previous env: ${envBackup}`);

  const settingsBackup = await backup(SETTINGS_PATH);
  const settings = await loadSettings();
  const added = ensureStopHookEntry(settings);
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
  if (settingsBackup) console.log(`Backup of settings.json: ${settingsBackup}`);
  console.log(
    added
      ? `Added Stop hook to: ${SETTINGS_PATH}`
      : `Stop hook already present in: ${SETTINGS_PATH}`,
  );

  const plat = osPlatform();
  if (plat !== "darwin" && plat !== "win32") {
    console.log(
      "\nNote: Linux playback uses paplay/ffplay/mpv — install at least one if you don't have it.",
    );
  }

  const runSmoke = await confirm({ message: "Run a smoke test now?", default: true });
  if (runSmoke) await smokeTest();

  console.log("\nDone. Start a fresh Claude Code session to hear summaries on Stop.");
}

main().catch((error) => {
  if (error?.name === "ExitPromptError") return; // user pressed Ctrl-C
  console.error(error);
  process.exit(1);
});
