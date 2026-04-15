/**
 * Detects em-dashes and en-dashes in text.
 * U+2014 (em-dash: —) and U+2013 (en-dash: –) only.
 * U+002D (hyphen-minus: -) is NEVER touched.
 */
export function containsBannedDashes(text: string): boolean {
  return /[\u2014\u2013]/.test(text);
}

export function countBannedDashes(text: string): number {
  const matches = text.match(/[\u2014\u2013]/g);
  return matches ? matches.length : 0;
}

export function isEmDash(char: string): boolean {
  return char === '\u2014';
}

export function isEnDash(char: string): boolean {
  return char === '\u2013';
}
