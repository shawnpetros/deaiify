import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { containsBannedDashes, countBannedDashes, isEmDash, isEnDash } from '../src/detection.js';

describe('containsBannedDashes', () => {
  it('detects em-dash (U+2014)', () => {
    assert.strictEqual(containsBannedDashes('Hello \u2014 World'), true);
  });

  it('detects en-dash (U+2013)', () => {
    assert.strictEqual(containsBannedDashes('Hello \u2013 World'), true);
  });

  it('ignores hyphen-minus (U+002D)', () => {
    assert.strictEqual(containsBannedDashes('Hello - World'), false);
    assert.strictEqual(containsBannedDashes('Hello -- World'), false);
    assert.strictEqual(containsBannedDashes('Hello---World'), false);
  });

  it('detects mixed dashes', () => {
    assert.strictEqual(containsBannedDashes('Hello \u2014 and \u2013 World'), true);
  });

  it('returns false for clean text', () => {
    assert.strictEqual(containsBannedDashes('No dashes here at all'), false);
    assert.strictEqual(containsBannedDashes(''), false);
  });
});

describe('countBannedDashes', () => {
  it('counts em-dashes', () => {
    assert.strictEqual(countBannedDashes('a \u2014 b \u2014 c'), 2);
  });

  it('counts en-dashes', () => {
    assert.strictEqual(countBannedDashes('a \u2013 b \u2013 c \u2013 d'), 3);
  });

  it('counts mixed', () => {
    assert.strictEqual(countBannedDashes('a \u2014 b \u2013 c'), 2);
  });

  it('returns 0 for clean text', () => {
    assert.strictEqual(countBannedDashes('Hello - World'), 0);
    assert.strictEqual(countBannedDashes(''), 0);
  });
});

describe('isEmDash', () => {
  it('identifies em-dash', () => {
    assert.strictEqual(isEmDash('\u2014'), true);
  });

  it('rejects en-dash', () => {
    assert.strictEqual(isEmDash('\u2013'), false);
  });

  it('rejects hyphen-minus', () => {
    assert.strictEqual(isEmDash('-'), false);
  });
});

describe('isEnDash', () => {
  it('identifies en-dash', () => {
    assert.strictEqual(isEnDash('\u2013'), true);
  });

  it('rejects em-dash', () => {
    assert.strictEqual(isEnDash('\u2014'), false);
  });

  it('rejects hyphen-minus', () => {
    assert.strictEqual(isEnDash('-'), false);
  });
});
