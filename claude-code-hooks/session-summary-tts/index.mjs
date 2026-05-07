#!/usr/bin/env node
// Claude Code Stop hook — summarize the session via `claude -p`,
// synthesize the summary with ElevenLabs or Gemini, play it locally.
// Runs as a subprocess of Claude Code; never throws, always exits 0.

import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir, platform as osPlatform } from "node:os";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const HOME = homedir();
const CACHE_DIR = path.join(HOME, ".claude", "cache", "session-summaries");
const CONFIG_PATH = path.join(HOME, ".claude", "hooks", "session-summary-tts.env");

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 500;
const MAX_TRANSCRIPT_CHARS = 12_000;
const SUMMARY_WORD_CAP = 25;

const DEFAULT_ELEVENLABS_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel
const DEFAULT_ELEVENLABS_MODEL = "eleven_turbo_v2_5";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_GEMINI_VOICE = "Kore";
const DEFAULT_SUMMARY_MODEL = "claude-haiku-4-5";

const DEFAULT_SUMMARY_PROMPT = [
  `You write voice readouts of Claude Code sessions for a TTS service. Rules:`,
  `- Reply in under ${SUMMARY_WORD_CAP} words. Hard cap.`,
  `- First person past tense ("I refactored the auth middleware"). Lead with the outcome.`,
  `- Describe code naturally — say "the auth middleware", not "middleware/auth/index.ts". Don't spell out file extensions or symbols.`,
  `- If the session was a question rather than work, answer it in one line instead.`,
  `- Never repeat API keys, tokens, passwords, or any secret-shaped string from the transcript.`,
  `- No markdown, no preamble, no sign-off, no emoji, no quotes.`,
].join("\n");

function debug(message) {
  if (process.env.SESSION_SUMMARY_TTS_DEBUG === "1") {
    console.error(`[session-summary-tts] ${message}`);
  }
}

async function loadDotenv(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

function safeSessionId(sessionId, transcriptPath) {
  const fallback = transcriptPath
    ? path.basename(transcriptPath, path.extname(transcriptPath))
    : "session";
  return String(sessionId || fallback)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

function compactWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value, maxChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1).trimEnd()}…`;
}

function textFromContent(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";
        if (part.type === "text" && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof content === "object") {
    if (content.type === "text" && typeof content.text === "string") return content.text;
    if (typeof content.text === "string") return content.text;
  }
  return "";
}

function extractTranscriptMessage(entry) {
  const role =
    entry?.type === "user" || entry?.type === "assistant"
      ? entry.type
      : entry?.message?.role;
  if (role !== "user" && role !== "assistant") return null;

  const rawText = textFromContent(entry?.message?.content ?? entry?.content ?? entry?.text);
  const text = compactWhitespace(rawText);
  if (!text) return null;

  return {
    role: role === "assistant" ? "Assistant" : "User",
    text: truncate(text, MAX_MESSAGE_CHARS),
  };
}

async function compactTranscript(transcriptPath) {
  const messages = [];
  let assistantChars = 0;
  const stream = createReadStream(transcriptPath, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const message = extractTranscriptMessage(JSON.parse(trimmed));
      if (!message) continue;
      if (message.role === "Assistant") assistantChars += message.text.length;
      messages.push(message);
      if (messages.length > MAX_MESSAGES) messages.shift();
    } catch {
      // ignore malformed lines
    }
  }

  const transcript = messages.map(({ role, text }) => `${role}: ${text}`).join("\n\n");
  if (!transcript) return { transcript: "", assistantChars: 0 };
  const trimmed =
    transcript.length <= MAX_TRANSCRIPT_CHARS
      ? transcript
      : transcript.slice(transcript.length - MAX_TRANSCRIPT_CHARS);
  return { transcript: trimmed, assistantChars };
}

function spawnCollect(command, args, options, stdinText, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ ok: false, stdout, stderr, error: new Error("process timed out") });
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => finish({ ok: false, stdout, stderr, error }));
    child.on("close", (code) => finish({ ok: code === 0, stdout, stderr, code }));
    child.stdin?.on("error", () => {});
    child.stdin?.end(stdinText);
  });
}

async function summarizeTranscript(transcript, cwd) {
  const env = { ...process.env, SUMMARY_HOOK_RUNNING: "1" };
  const command = process.env.CLAUDE_CLI || "claude";
  const rules = process.env.SUMMARY_PROMPT || DEFAULT_SUMMARY_PROMPT;
  const args = [
    "-p",
    "--model",
    process.env.SESSION_SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL,
    "--output-format",
    "text",
  ];

  // Put the instructions in the user message so Claude treats them as the
  // actual ask. Putting them in --append-system-prompt gets steamrolled by
  // Claude Code's default system prompt and the model echoes the transcript.
  const userMessage = [
    `Below is a transcript from a Claude Code session that just ended.`,
    `Produce a short voice readout summarizing it. Output ONLY the readout text — nothing else.`,
    ``,
    `Rules for the readout:`,
    rules,
    ``,
    `<transcript>`,
    transcript,
    `</transcript>`,
  ].join("\n");

  const result = await spawnCollect(
    command,
    args,
    { cwd: cwd || HOME, env, stdio: ["pipe", "pipe", "pipe"] },
    userMessage,
    Number(process.env.SESSION_SUMMARY_CLAUDE_TIMEOUT_MS || 60_000),
  );

  if (!result.ok) {
    debug(`claude summary failed: ${result.error?.message || result.stderr || result.code}`);
    return "";
  }
  return compactWhitespace(result.stdout).slice(0, 1_000);
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}

async function textToSpeechElevenLabs(summary, sessionId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return "";

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL;
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream` +
    `?output_format=${encodeURIComponent(outputFormat)}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: summary,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
          speed: 1,
        },
        apply_text_normalization: "auto",
      }),
    },
    Number(process.env.SESSION_SUMMARY_TTS_TIMEOUT_MS || 20_000),
  );

  if (!response.ok) {
    debug(`elevenlabs failed: HTTP ${response.status}`);
    return "";
  }

  const audioPath = path.join(CACHE_DIR, `${sessionId}.mp3`);
  if (!response.body) return "";
  const tempPath = `${audioPath}.${process.pid}.tmp`;
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath));
    await rename(tempPath, audioPath);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
  return audioPath;
}

function wavFromPcm(pcm, sampleRate = 24_000, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

async function textToSpeechGemini(summary, sessionId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const model = process.env.GEMINI_TTS_MODEL || DEFAULT_GEMINI_MODEL;
  const voiceName = process.env.GEMINI_TTS_VOICE || DEFAULT_GEMINI_VOICE;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: summary }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
    },
    Number(process.env.SESSION_SUMMARY_TTS_TIMEOUT_MS || 20_000),
  );

  if (!response.ok) {
    debug(`gemini failed: HTTP ${response.status}`);
    return "";
  }

  const json = await response.json();
  const data = json?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)
    ?.inlineData?.data;
  if (!data) return "";

  const audio = Buffer.from(data, "base64");
  const wav = audio.subarray(0, 4).toString("ascii") === "RIFF" ? audio : wavFromPcm(audio);
  const audioPath = path.join(CACHE_DIR, `${sessionId}.wav`);
  await writeFile(audioPath, wav);
  return audioPath;
}

async function textToSpeech(summary, sessionId) {
  const provider = (process.env.TTS_PROVIDER || "elevenlabs").toLowerCase();
  if (provider === "gemini") return textToSpeechGemini(summary, sessionId);
  if (provider === "elevenlabs") return textToSpeechElevenLabs(summary, sessionId);
  debug(`unsupported TTS_PROVIDER: ${provider}`);
  return "";
}

function providerIsConfigured() {
  const provider = (process.env.TTS_PROVIDER || "elevenlabs").toLowerCase();
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  if (provider === "elevenlabs") return Boolean(process.env.ELEVENLABS_API_KEY);
  return false;
}

function playAudio(audioPath) {
  const plat = osPlatform();

  if (plat === "darwin") {
    const child = spawn("afplay", [audioPath], { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return;
  }

  if (plat === "win32") {
    const safe = audioPath.replace(/'/g, "''");
    const script =
      `Add-Type -AssemblyName PresentationCore *>&1 | Out-Null; ` +
      `$p = New-Object System.Windows.Media.MediaPlayer; ` +
      `$p.Open([uri]'${safe}'); Start-Sleep -Milliseconds 300; $p.Play(); ` +
      `Start-Sleep -Milliseconds 60000; $p.Close()`;
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.on("error", () => {});
    child.unref();
    return;
  }

  // Linux / other Unix: try paplay → ffplay → mpv.
  const quoted = `'${audioPath.replace(/'/g, `'\\''`)}'`;
  const chain =
    `(command -v paplay >/dev/null && paplay ${quoted} ` +
    `|| command -v ffplay >/dev/null && ffplay -nodisp -autoexit -loglevel quiet ${quoted} ` +
    `|| command -v mpv >/dev/null && mpv --no-video --no-terminal --really-quiet ${quoted})`;
  const child = spawn("bash", ["-c", `${chain} >/dev/null 2>&1`], {
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => {});
  child.unref();
}

function isCwdBlocked(cwd) {
  const list = process.env.CWD_BLOCKLIST;
  if (!list || !cwd) return false;
  const cwdLower = cwd.toLowerCase();
  return list
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => cwdLower.includes(entry));
}

async function main() {
  if (process.env.SUMMARY_HOOK_RUNNING === "1") return;

  await loadDotenv(CONFIG_PATH);

  if (process.env.ENABLED && /^(0|false|no|off)$/i.test(process.env.ENABLED)) {
    debug("disabled via ENABLED");
    return;
  }

  const input = await readStdin();
  let payload = {};
  try {
    payload = JSON.parse(input || "{}");
  } catch {
    return;
  }
  if (payload?.stop_hook_active === true) return;
  if (payload?.hook_event_name && payload.hook_event_name !== "Stop") return;
  if (!payload?.transcript_path) return;
  if (isCwdBlocked(payload?.cwd)) {
    debug(`cwd blocked: ${payload.cwd}`);
    return;
  }
  if (!providerIsConfigured()) {
    debug("TTS provider not configured");
    return;
  }

  await access(payload.transcript_path);
  await mkdir(CACHE_DIR, { recursive: true });

  const { transcript, assistantChars } = await compactTranscript(payload.transcript_path);
  if (!transcript) return;

  const minChars = Number(process.env.MIN_ASSISTANT_CHARS ?? 200);
  if (assistantChars < minChars) {
    debug(`session too short (${assistantChars} < ${minChars})`);
    return;
  }

  const summary = await summarizeTranscript(transcript, payload.cwd);
  if (!summary) return;

  if (process.env.DRY_RUN === "1") {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const sessionId = safeSessionId(payload.session_id, payload.transcript_path);
  const audioPath = await textToSpeech(summary, sessionId);
  if (audioPath) playAudio(audioPath);
}

main()
  .catch((error) => debug(error?.stack || error?.message || String(error)))
  .finally(() => process.exit(0));
