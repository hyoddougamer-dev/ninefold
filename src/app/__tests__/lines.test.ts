import { describe, expect, it } from 'vitest';
import { AFFIXES, AFFIX_INFO } from '../../data/gear.ts';
import { ART_BEND, FIND_TOP, FUSE_BEND, FUSE_TOP, LUCK_BEND, SUNDER_BEND, UNCAPPED_RATE_CEILING } from '../../sim/balance.ts';
import { GLOSS } from '../glossary.ts';
import { lineMath, lineNote } from '../lines.ts';

/**
 * 註 Every gear line's note explains itself (rekaris, on the Discord, 2026-10-04): what it
 * does, its cap where it has one, how it bends, and the formula, printed from balance.ts so
 * that a retuned constant changes the note with it.
 */
describe('註 the gear line notes', () => {
  it('every line has a note and a formula, on the character the gear screen taps', () => {
    for (const a of AFFIXES) {
      const row = GLOSS[`axis:${AFFIX_INFO[a].han}`];
      expect(row?.note, a).toBe(lineNote(a));
      expect(row?.math, a).toBe(lineMath(a));
      expect(lineNote(a).length, a).toBeGreaterThan(30);
      expect(`${lineNote(a)}${lineMath(a)}`, a).not.toContain('\u2014');
    }
  });

  it('says the hard caps, and the formulas carry the constants the sim plays by', () => {
    expect(lineNote('find')).toContain(`${Math.round(FIND_TOP * 100)} points`);
    expect(lineNote('refine')).toContain(`×${FUSE_TOP}`);
    expect(lineNote('rate')).toContain(`×${UNCAPPED_RATE_CEILING}`);
    expect(lineNote('power')).toMatch(/no cap/i);
    expect(lineMath('luck')).toContain(String(LUCK_BEND));
    expect(lineMath('sunder')).toContain(String(SUNDER_BEND));
    expect(lineMath('art')).toContain(String(ART_BEND));
    expect(lineMath('refine')).toContain(String(FUSE_BEND));
    expect(lineMath('find')).toContain(String(FIND_TOP * 100));
  });

  it('says what drop chance points do to a beast, as a chance before and after', () => {
    expect(lineNote('find')).toMatch(/\d+(\.\d)?% becomes \d+(\.\d)?%/);
  });
});
