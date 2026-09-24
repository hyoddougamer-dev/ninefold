import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * 墨 The palette is one place, and nothing may keep a colour from the old one.
 *
 * 誤 This test exists because the repaint half worked for a whole day. `:root` was
 * changed from indigo, cyan and magenta to ink, jade and cinnabar, and every rule that
 * said `var(--cyan)` went with it. What did not go were the literals: sixteen
 * `rgba(95,220,255, …)` glows, a magenta button shadow, four old panel and line colours
 * written out by hand, and eight `var(--cyan)` and `var(--magenta)` left in the
 * components.
 *
 * 靜 The var() ones are the dangerous half, because they fail **silently**: a custom
 * property that is not defined makes the whole declaration invalid at computed-value
 * time, so `color: var(--cyan)` does not fall back to anything sensible, it inherits.
 * 勝 the win character in the arena was supposed to be the alive colour and was coming
 * out the colour of body text, and nothing anywhere said so.
 *
 * So: no file under src/ may name a colour the palette does not have, and every custom
 * property a file uses must be one `:root` declares.
 */

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(`${dir}/${e.name}`)
      : /\.(tsx?|css)$/.test(e.name) ? [`${dir}/${e.name}`] : []);

// 己 This file names every colour that is gone, which is the one place allowed to.
const SRC = files('src').filter((f) => !f.endsWith('palette.test.ts'));

/** The literals of the palette that was replaced, by the name each one had. */
const GONE: Readonly<Record<string, string>> = {
  '95,220,255': 'cyan',
  '255,95,200': 'magenta',
  '255,206,107': 'the old gold',
  '24,28,54': 'the indigo panel',
  '37,42,92': 'the indigo line',
  '5FDCFF': 'cyan',
  'FF5FC8': 'magenta',
  'CC79FF': 'the violet the arena wore',
};

describe('墨 the palette', () => {
  it('declares every custom property a file asks for', () => {
    // 根 What :root offers. A property defined on anything else is scoped to it and is
    // not what this is about: these are the eight the whole game is painted in.
    // 設 Everything the game sets anywhere: the palette in :root, the properties a rule
    // sets on a block, and the ones a component hands down from TSX as an inline style,
    // which is how --hue, --c and --fig reach the stylesheet.
    const declared = new Set<string>();
    for (const f of SRC) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/--([a-z0-9-]+)\s*:/g)) declared.add(m[1]);
      for (const m of text.matchAll(/['"]--([a-z0-9-]+)['"]/g)) declared.add(m[1]);
    }
    const missing: string[] = [];
    for (const f of SRC) {
      // 註 A comment is allowed to name a property that is gone, and this file's own
      // comments do: that is how the next person finds out why the rule below changed.
      const code = readFileSync(f, 'utf8').split('\n')
        .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
      // 備 var(--x, something) carries its own answer for when --x is missing, which
      // is the one form that is safe. Only the bare one is a silent inherit.
      for (const m of code.matchAll(/var\(\s*--([a-z0-9-]+)\s*\)/g)) {
        if (!declared.has(m[1])) missing.push(`${f}: --${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps no colour from the palette that was replaced', () => {
    const found: string[] = [];
    for (const f of SRC) {
      const text = readFileSync(f, 'utf8');
      for (const [needle, was] of Object.entries(GONE)) {
        // 註 A comment may name the old colour: half of why this repository is readable
        // is that it says what it used to be and why it stopped.
        const lines = text.split('\n').filter((l) => l.includes(needle)
          && !/^\s*(\*|\/\/|\/\*)/.test(l));
        if (lines.length) found.push(`${f}: ${was} (${needle})`);
      }
    }
    expect(found).toEqual([]);
  });
});
