import { describe, it, expect } from "vitest";
import { countWords, verifyRewrite } from "../utils.js";

// ── countWords unit tests ──────────────────────────────────────────────────

describe("countWords", () => {
  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(countWords("   \t  \n ")).toBe(0);
  });

  it("counts words separated by single spaces", () => {
    expect(countWords("one two three")).toBe(3);
  });

  it("counts words across mixed whitespace (tabs, newlines, multi-space)", () => {
    expect(countWords("one  two\tthree\nfour")).toBe(4);
  });

  it("ignores leading and trailing whitespace", () => {
    expect(countWords("   word   ")).toBe(1);
  });
});

// ── verifyRewrite unit tests ───────────────────────────────────────────────

describe("verifyRewrite", () => {
  it("accepts a rewrite with identical word count", () => {
    const original = "Today was an interesting and productive day overall."; // 8 words
    const rewritten = "Today proved to be interesting and quite productive."; // 8 words
    expect(verifyRewrite(original, rewritten)).toBe(true);
  });

  it("accepts a rewrite with slight word count change (within 10%)", () => {
    const original = "One two three four five six seven eight nine ten."; // 10 words
    const rewritten = "One two three four five six seven eight nine."; // 9 words, 10% drift
    expect(verifyRewrite(original, rewritten)).toBe(true);
  });

  it("rejects a rewrite that adds too many words (>10% drift)", () => {
    const original = "Short sentence here.";
    const rewritten = "This is a much longer rewritten sentence that adds a lot of extra content here.";
    expect(verifyRewrite(original, rewritten)).toBe(false);
  });

  it("rejects a rewrite that loses too many words (>10% drift)", () => {
    const original = "One two three four five six seven eight nine ten eleven twelve.";
    const rewritten = "One two.";
    expect(verifyRewrite(original, rewritten)).toBe(false);
  });

  it("rejects a rewrite that expands length by more than 50%", () => {
    const original = "Short text.";
    const rewritten = "Short text that goes on for a very long time with lots of extra padding added.";
    expect(verifyRewrite(original, rewritten)).toBe(false);
  });

  it("accepts a rewrite that is the same length", () => {
    const original = "The cat sat on the mat.";
    const rewritten = "The cat sat on the mat.";
    expect(verifyRewrite(original, rewritten)).toBe(true);
  });

  it("accepts a same-word-count rewrite that is shorter overall", () => {
    const original = "The result was completely unexpected to all observers here."; // 9 words
    const rewritten = "The result was wholly unexpected to every observer here."; // 9 words, shorter
    expect(verifyRewrite(original, rewritten)).toBe(true);
  });

  it("rejects an empty rewrite", () => {
    expect(verifyRewrite("Some text here.", "")).toBe(false);
  });

  it("rejects a whitespace-only rewrite", () => {
    expect(verifyRewrite("Some text here.", "   ")).toBe(false);
  });

  // Boundary cases

  it("accepts any non-empty rewrite when original is an empty string", () => {
    // origWords = 0 so drift check is skipped; original.length = 0 so
    // expansion check is skipped. Document the current behavior so any
    // future tightening is intentional.
    expect(verifyRewrite("", "anything goes here")).toBe(true);
  });

  it("rejects a rewrite at exactly the 50% expansion boundary boundary check is >, not >=", () => {
    // Original length 10 -> 50% expansion is +5, so 15 chars is allowed
    // (expansion=0.5 is NOT > 0.5).
    const original = "0123456789"; // 10 chars, 1 word
    const rewritten = "012345678901234"; // 15 chars, 1 word, expansion = 0.5
    expect(verifyRewrite(original, rewritten)).toBe(true);
  });

  it("rejects a rewrite just past the 50% expansion boundary", () => {
    const original = "0123456789"; // 10 chars, 1 word
    const rewritten = "0123456789012345"; // 16 chars, 1 word, expansion = 0.6
    expect(verifyRewrite(original, rewritten)).toBe(false);
  });

  it("accepts exactly-10% drift (drift check is >, not >=)", () => {
    const original = "a b c d e f g h i j"; // 10 words
    const rewritten = "a b c d e f g h i"; // 9 words, drift = 0.1
    expect(verifyRewrite(original, rewritten)).toBe(true);
  });

  it("rejects drift just past 10%", () => {
    const original = "a b c d e f g h i"; // 9 words
    const rewritten = "a b c d e f g"; // 7 words, drift ~ 0.222
    expect(verifyRewrite(original, rewritten)).toBe(false);
  });
});
