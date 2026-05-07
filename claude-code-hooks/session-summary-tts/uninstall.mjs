#!/usr/bin/env node
// Reverses install.mjs: removes the hook entry from ~/.claude/settings.json
// (with a backup) and offers to delete the env file.

import { copyFile, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { confirm } from "@inquirer/prompts";

const HOME = homedir();
const ENV_PATH = path.join(HOME, ".claude", "hooks", "session-summary-tts.env");
const SETTINGS_PATH = path.join(HOME, ".claude", "settings.json");
const SCRIPT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "index.mjs");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function backup(filePath) {
  if (!existsSync(filePath)) return null;
  const dest = `${filePath}.bak-session-summary-tts-${timestamp()}`;
  await copyFile(filePath, dest);
  return dest;
}

async function main() {
  console.log("Claude Code session-summary-tts — uninstaller\n");

  if (!existsSync(SETTINGS_PATH)) {
    console.log("No settings.json found — nothing to remove.");
  } else {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    const settings = raw.trim() ? JSON.parse(raw) : {};
    const stopArr = Array.isArray(settings?.hooks?.Stop) ? settings.hooks.Stop : [];

    const filteredStop = stopArr
      .map((entry) => {
        if (!entry || !Array.isArray(entry.hooks)) return entry;
        const remaining = entry.hooks.filter(
          (h) => !(typeof h?.command === "string" && h.command.includes(SCRIPT_PATH)),
        );
        return remaining.length === 0 ? null : { ...entry, hooks: remaining };
      })
      .filter(Boolean);

    if (filteredStop.length === stopArr.length) {
      console.log("No matching Stop hook entry found in settings.json.");
    } else {
      const settingsBackup = await backup(SETTINGS_PATH);
      if (filteredStop.length === 0) {
        if (settings.hooks) delete settings.hooks.Stop;
        if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
      } else {
        settings.hooks.Stop = filteredStop;
      }
      await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
      console.log(`Removed Stop hook from: ${SETTINGS_PATH}`);
      if (settingsBackup) console.log(`Backup: ${settingsBackup}`);
    }
  }

  if (existsSync(ENV_PATH)) {
    const drop = await confirm({
      message: `Delete the env file at ${ENV_PATH}?`,
      default: false,
    });
    if (drop) {
      const envBackup = await backup(ENV_PATH);
      await unlink(ENV_PATH);
      console.log(`Deleted: ${ENV_PATH}`);
      if (envBackup) console.log(`Backup: ${envBackup}`);
    }
  }

  console.log("\nDone.");
}

main().catch((error) => {
  if (error?.name === "ExitPromptError") return;
  console.error(error);
  process.exit(1);
});
