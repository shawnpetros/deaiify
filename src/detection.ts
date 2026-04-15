/**
 * U+2014 (em-dash) and U+2013 (en-dash) only. U+002D never touched.
 */

const BANNED_DASH_RE = /[\u2014\u2013]/;
const BANNED_DASH_RE_G = /[\u2014\u2013]/g;
const WHITESPACE_ISSUE_RE = /\s{2,}--\s{2,}/;

export function containsBannedDashes(text: string): boolean {
  return BANNED_DASH_RE.test(text);
}

export function countBannedDashes(text: string): number {
  const matches = text.match(BANNED_DASH_RE_G);
  return matches ? matches.length : 0;
}

export function isEmDash(char: string): boolean {
  return char === '\u2014';
}

export function isEnDash(char: string): boolean {
  return char === '\u2013';
}

export function regexReplaceDashes(text: string): string {
  return text.replace(/\s*[\u2014\u2013]\s*/g, ' -- ');
}

export function hasWhitespaceIssues(text: string): boolean {
  return WHITESPACE_ISSUE_RE.test(text);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function verifyRewrite(original: string, rewritten: string): boolean {
  if (containsBannedDashes(rewritten)) return false;
  const origWords = wordCount(original);
  const rewriteWords = wordCount(rewritten);
  const drift = Math.abs(origWords - rewriteWords) / Math.max(origWords, 1);
  if (drift > 0.1) return false;
  if (rewritten.length > original.length * 1.5) return false;
  return true;
}
