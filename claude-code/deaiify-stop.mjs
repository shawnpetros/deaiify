#!/usr/bin/env node
// Stop hook: deAIify for Claude Code chat output.
//
// On each Stop event, scan the most recent assistant message for em-dashes,
// en-dashes, and ` -- ` (the autoregressive em-dash substitute). If found,
// block with a Billy Mays-flavored reason that forces Claude to rewrite the
// message without those punctuation marks.
//
// Code fences and inline code are excluded from the scan, so `--verbose`
// flags in code samples are safe.
//
// Loop protection: respects `stop_hook_active` so we never block twice in a row.
//
// Input: JSON on stdin per Claude Code Stop-hook contract:
//   { session_id, transcript_path, hook_event_name, stop_hook_active }
// Output: JSON on stdout: { decision: "block", reason: "..." } when offending,
// otherwise empty + exit 0.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

export const BANNED_REASON =
  "DO IT AGAIN, PAL. The previous message contained {offenders}. " +
  "NO LONG LINES! NO TWO SHORT LINES EITHER! I KNOW YOUR TRICKS!!! " +
  "Rewrite the previous message without those punctuation marks. Restructure " +
  "the sentences so the prose still flows. Use commas, periods, parentheses, " +
  "colons, or sentence breaks instead. Never use ` -- ` as a substitute. " +
  "Then deliver the clean version.";

export function extractAssistantText(payload, { readFile = readFileSync } = {}) {
  const path = payload.transcript_path;
  if (!path) return "";
  let raw;
  try {
    raw = readFile(path, "utf8");
  } catch {
    return "";
  }
  const lines = raw.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const role = entry.role || entry.type;
    if (role !== "assistant") continue;
    const message = entry.message || entry;
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .filter((c) => c && c.type === "text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n");
    }
  }
  return "";
}

export function stripCode(text) {
  // Remove fenced code blocks (```...```) and inline code (`...`).
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
}

export function scan(text) {
  const stripped = stripCode(text);
  const offenders = [];
  if (/—/.test(stripped)) offenders.push("em-dash (—)");
  if (/–/.test(stripped)) offenders.push("en-dash (–)");
  // Prose ` -- ` only — surrounded by whitespace. CLI `--flag` usage stays clean
  // because the second hyphen is followed by a word char, not whitespace.
  if (/\s--\s/.test(stripped)) {
    offenders.push("` -- ` (the autoregressive em-dash substitute)");
  }
  return offenders;
}

export function buildBlockResponse(offenders) {
  const reason = BANNED_REASON.replace("{offenders}", offenders.join(" and "));
  return { decision: "block", reason };
}

export function run(payload) {
  if (payload.stop_hook_active === true) return null;
  const text = extractAssistantText(payload);
  if (!text) return null;
  const offenders = scan(text);
  if (offenders.length === 0) return null;
  return buildBlockResponse(offenders);
}

function main() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) process.exit(0);
    const payload = JSON.parse(raw);
    const response = run(payload);
    if (response) {
      process.stdout.write(JSON.stringify(response));
    }
    process.exit(0);
  } catch {
    // Silent fail. Never break the pipeline on hook error.
    process.exit(0);
  }
}

// Only run as a script when invoked directly, not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
