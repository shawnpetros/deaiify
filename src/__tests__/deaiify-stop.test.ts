import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
// @ts-expect-error - .mjs sibling without types
import {
  BANNED_REASON,
  buildBlockResponse,
  extractAssistantText,
  run,
  scan,
  stripCode,
} from "../../claude-code/deaiify-stop.mjs";

// ── stripCode ──────────────────────────────────────────────────────────────

describe("stripCode (deaiify-stop)", () => {
  it("removes fenced code blocks", () => {
    const out = stripCode("before\n```\ndash—inside\n```\nafter");
    expect(out).not.toContain("—");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("removes fenced code blocks with language tag", () => {
    const out = stripCode("prose\n```typescript\nconst x = a—b;\n```\ntail");
    expect(out).not.toContain("—");
  });

  it("removes inline code", () => {
    expect(stripCode("Use `value—key` in config.")).not.toContain("—");
  });

  it("removes empty inline code (one or more backticks variant)", () => {
    // The stop hook uses `[^`\n]*` (zero-or-more), so empty `` is matched.
    // This is documented as a divergence from src/utils.ts stripCodeBlocks.
    expect(stripCode("a`` b")).toBe("a b");
  });

  it("leaves dashes outside code blocks alone", () => {
    expect(stripCode("alpha—beta")).toContain("—");
  });
});

// ── scan ───────────────────────────────────────────────────────────────────

describe("scan (deaiify-stop)", () => {
  it("returns no offenders for clean prose", () => {
    expect(scan("plain prose with no offenders at all")).toEqual([]);
  });

  it("flags an em-dash", () => {
    expect(scan("alpha—beta")).toEqual(["em-dash (—)"]);
  });

  it("flags an en-dash", () => {
    expect(scan("pages 12–15")).toEqual(["en-dash (–)"]);
  });

  it("flags the ` -- ` autoregressive substitute", () => {
    expect(scan("alpha -- beta")).toEqual([
      "` -- ` (the autoregressive em-dash substitute)",
    ]);
  });

  it("does NOT flag CLI flags like --verbose", () => {
    expect(scan("run with --verbose for more output")).toEqual([]);
  });

  it("does NOT flag a single hyphen-minus", () => {
    expect(scan("well-formed hyphenated text")).toEqual([]);
  });

  it("does NOT flag dashes inside fenced code blocks", () => {
    expect(scan("prose\n```\nlet x = a—b;\n```\nmore prose")).toEqual([]);
  });

  it("does NOT flag dashes inside inline code", () => {
    expect(scan("docs say `a—b` is allowed")).toEqual([]);
  });

  it("flags multiple offenders in the same message", () => {
    const offenders = scan("alpha—beta and pages 12–15 -- last bit");
    expect(offenders).toContain("em-dash (—)");
    expect(offenders).toContain("en-dash (–)");
    expect(offenders).toContain("` -- ` (the autoregressive em-dash substitute)");
  });
});

// ── buildBlockResponse ────────────────────────────────────────────────────

describe("buildBlockResponse", () => {
  it("returns a Claude Code Stop-hook block response", () => {
    const res = buildBlockResponse(["em-dash (—)"]);
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("em-dash (—)");
    expect(res.reason.startsWith("DO IT AGAIN")).toBe(true);
  });

  it("joins multiple offenders with ' and '", () => {
    const res = buildBlockResponse(["em-dash (—)", "en-dash (–)"]);
    expect(res.reason).toContain("em-dash (—) and en-dash (–)");
  });

  it("BANNED_REASON template contains the placeholder", () => {
    expect(BANNED_REASON).toContain("{offenders}");
  });
});

// ── extractAssistantText ──────────────────────────────────────────────────

async function writeJsonl(lines: unknown[]): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "deaiify-stop-test-"));
  const file = path.join(dir, "transcript.jsonl");
  await fs.writeFile(file, lines.map((l) => JSON.stringify(l)).join("\n"), "utf8");
  return file;
}

describe("extractAssistantText", () => {
  it("returns empty string when transcript_path is missing", () => {
    expect(extractAssistantText({})).toBe("");
  });

  it("returns empty string when the file cannot be read", () => {
    expect(extractAssistantText({ transcript_path: "/nope/does/not/exist.jsonl" })).toBe("");
  });

  it("returns the most recent assistant string content", async () => {
    const file = await writeJsonl([
      { role: "user", content: "hi" },
      { role: "assistant", content: "first reply" },
      { role: "user", content: "follow up" },
      { role: "assistant", content: "second reply" },
    ]);
    expect(extractAssistantText({ transcript_path: file })).toBe("second reply");
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });

  it("joins array-shaped content of text blocks with newlines", async () => {
    const file = await writeJsonl([
      {
        role: "assistant",
        content: [
          { type: "text", text: "alpha" },
          { type: "tool_use", id: "x" },
          { type: "text", text: "beta" },
        ],
      },
    ]);
    expect(extractAssistantText({ transcript_path: file })).toBe("alpha\nbeta");
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });

  it("supports the {type: 'assistant', message: {...}} envelope shape", async () => {
    const file = await writeJsonl([
      { type: "assistant", message: { content: "wrapped reply" } },
    ]);
    expect(extractAssistantText({ transcript_path: file })).toBe("wrapped reply");
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });

  it("skips malformed JSON lines and finds the previous valid assistant entry", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "deaiify-stop-test-"));
    const file = path.join(dir, "transcript.jsonl");
    const lines = [
      JSON.stringify({ role: "assistant", content: "earlier reply" }),
      "not valid json {{{",
    ];
    await fs.writeFile(file, lines.join("\n"), "utf8");
    expect(extractAssistantText({ transcript_path: file })).toBe("earlier reply");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns empty string when there is no assistant entry", async () => {
    const file = await writeJsonl([
      { role: "user", content: "only user" },
      { role: "system", content: "nothing here" },
    ]);
    expect(extractAssistantText({ transcript_path: file })).toBe("");
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });
});

// ── run (end-to-end through the hook decision logic) ─────────────────────

describe("run", () => {
  it("returns null when stop_hook_active is true (loop protection)", async () => {
    const file = await writeJsonl([{ role: "assistant", content: "alpha—beta" }]);
    expect(run({ stop_hook_active: true, transcript_path: file })).toBeNull();
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });

  it("returns null when transcript text is empty", () => {
    expect(run({})).toBeNull();
  });

  it("returns null when there are no offenders", async () => {
    const file = await writeJsonl([{ role: "assistant", content: "all clean here" }]);
    expect(run({ transcript_path: file })).toBeNull();
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });

  it("returns a block response when an em-dash is present", async () => {
    const file = await writeJsonl([{ role: "assistant", content: "this — fails" }]);
    const out = run({ transcript_path: file });
    expect(out?.decision).toBe("block");
    expect(out?.reason).toContain("em-dash");
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });

  it("returns a block response that mentions both offenders when both present", async () => {
    const file = await writeJsonl([
      { role: "assistant", content: "em—dash and pages 1–2" },
    ]);
    const out = run({ transcript_path: file });
    expect(out?.reason).toContain("em-dash (—)");
    expect(out?.reason).toContain("en-dash (–)");
    await fs.rm(path.dirname(file), { recursive: true, force: true });
  });
});
