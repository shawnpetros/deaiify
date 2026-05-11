import { describe, it, expect } from "vitest";
import { DASH_PATTERN } from "../constants.js";
import { containsDashes, stripCodeBlocks } from "../utils.js";

// ── DASH_PATTERN unit tests ────────────────────────────────────────────────
// Tests 1-11: verify what the pattern matches and what it leaves alone.

describe("DASH_PATTERN", () => {
  // 1. Detects em-dash (U+2014) in isolation
  it("detects a bare em-dash", () => {
    expect(DASH_PATTERN.test("\u2014")).toBe(true);
  });

  // 2. Detects en-dash (U+2013) in isolation
  it("detects a bare en-dash", () => {
    expect(DASH_PATTERN.test("\u2013")).toBe(true);
  });

  // 3. Detects em-dash embedded in a sentence
  it("detects em-dash inside a sentence", () => {
    expect(DASH_PATTERN.test("The result\u2014a surprise\u2014was unexpected.")).toBe(true);
  });

  // 4. Detects en-dash embedded in a sentence
  it("detects en-dash inside a sentence", () => {
    expect(DASH_PATTERN.test("Pages 12\u201315 cover the topic.")).toBe(true);
  });

  // 5. Detects multiple dashes of both kinds
  it("detects text with both em-dash and en-dash", () => {
    expect(DASH_PATTERN.test("First\u2014then\u2013after.")).toBe(true);
  });

  // 6. Does NOT detect hyphen-minus (U+002D)
  it("does not detect hyphen-minus", () => {
    expect(DASH_PATTERN.test("well-formed hyphenated-word")).toBe(false);
  });

  // 7. Does NOT detect double-hyphen (--)
  it("does not detect double-hyphen", () => {
    expect(DASH_PATTERN.test("use -- as a separator")).toBe(false);
  });

  // 8. Does NOT detect plain text with no dashes
  it("does not detect plain text", () => {
    expect(DASH_PATTERN.test("This is normal text with no dashes at all.")).toBe(false);
  });

  // 9. Detects em-dash at the very start of the string
  it("detects em-dash at start of string", () => {
    expect(DASH_PATTERN.test("\u2014Leading dash")).toBe(true);
  });

  // 10. Detects em-dash at the very end of the string
  it("detects em-dash at end of string", () => {
    expect(DASH_PATTERN.test("Trailing dash\u2014")).toBe(true);
  });

  // 11. Does NOT detect empty string
  it("does not detect empty string", () => {
    expect(DASH_PATTERN.test("")).toBe(false);
  });
});

// ── stripCodeBlocks tests ──────────────────────────────────────────────────

describe("stripCodeBlocks", () => {
  it("removes fenced code blocks", () => {
    const text = "Before.\n```\nsome\u2014code\n```\nAfter.";
    const stripped = stripCodeBlocks(text);
    expect(stripped).not.toContain("\u2014");
    expect(stripped).toContain("Before.");
    expect(stripped).toContain("After.");
  });

  it("removes fenced code blocks with a language tag", () => {
    const text = "Prose.\n```ts\nconst x = a\u2014b;\n```\nTail.";
    const stripped = stripCodeBlocks(text);
    expect(stripped).not.toContain("\u2014");
    expect(stripped).toContain("Prose.");
    expect(stripped).toContain("Tail.");
  });

  it("removes inline code", () => {
    const text = "Use `value\u2013key` in your config.";
    const stripped = stripCodeBlocks(text);
    expect(stripped).not.toContain("\u2013");
  });

  it("leaves text outside code blocks intact", () => {
    const text = "Normal text here.\n```\ncode block\n```\nMore normal text.";
    const stripped = stripCodeBlocks(text);
    expect(stripped).toContain("Normal text here.");
    expect(stripped).toContain("More normal text.");
  });

  it("removes only the matched span when two fenced blocks are present", () => {
    const text = "alpha\n```\na\u2014b\n```\nbeta\n```\nc\u2013d\n```\ngamma";
    const stripped = stripCodeBlocks(text);
    expect(stripped).not.toContain("\u2014");
    expect(stripped).not.toContain("\u2013");
    expect(stripped).toContain("alpha");
    expect(stripped).toContain("beta");
    expect(stripped).toContain("gamma");
  });

  it("does NOT match empty inline code (regex requires one or more inner chars)", () => {
    // src/utils.ts uses `[^`\n]+` (one-or-more). Pin this so future changes
    // are deliberate. The stop-hook variant uses `[^`\n]*` (zero-or-more).
    const text = "before`` after";
    const stripped = stripCodeBlocks(text);
    expect(stripped).toBe("before`` after");
  });

  it("leaves an unclosed fence and its dashes in place", () => {
    // Without a matching closing fence, the regex doesn't match. Document
    // this so it's clear that malformed fences fall through to detection.
    const text = "prose.\n```\nstill open\u2014here";
    const stripped = stripCodeBlocks(text);
    expect(stripped).toContain("\u2014");
  });

  it("does NOT strip backtick spans that contain a newline", () => {
    // Inline code regex disallows newlines, so multi-line backtick spans
    // are left alone (including any dashes inside them).
    const text = "before `start\nend\u2014here` after";
    const stripped = stripCodeBlocks(text);
    expect(stripped).toContain("\u2014");
  });
});

// ── containsDashes tests ───────────────────────────────────────────────────

describe("containsDashes", () => {
  it("returns false for empty string", () => {
    expect(containsDashes("")).toBe(false);
  });

  it("returns true when em-dash is present outside code blocks", () => {
    expect(containsDashes("Here\u2014there.")).toBe(true);
  });

  it("returns false when em-dash is only inside a code block", () => {
    const text = "```\nconst x = a\u2014b;\n```";
    expect(containsDashes(text)).toBe(false);
  });

  it("returns true when dash is outside a code block even if a code block also has dashes", () => {
    const text = "Sentence\u2014outside.\n```\nalso\u2014inside\n```";
    expect(containsDashes(text)).toBe(true);
  });

  it("returns false when dash is only in inline code", () => {
    const text = "Use `opt\u2014val` as the flag.";
    expect(containsDashes(text)).toBe(false);
  });

  it("returns false for whitespace-only input", () => {
    expect(containsDashes("   \n\t  ")).toBe(false);
  });

  it("returns true when a single string contains both em-dash and en-dash", () => {
    expect(containsDashes("em\u2014and en\u2013together")).toBe(true);
  });

  it("returns true when a dash sits right next to a fence boundary", () => {
    // The dash is OUTSIDE the fence (immediately before the opening
    // backticks), so it must still trip detection.
    expect(containsDashes("alpha\u2014```\ncode\n```")).toBe(true);
  });
});
