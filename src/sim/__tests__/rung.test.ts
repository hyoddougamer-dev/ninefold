import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RUNG_AT } from '../balance.ts';
import { RUNGS, SUMMIT, TOP_RUNG, gateOfRung, nextRung, rungFrom, rungOf, scoreOf } from '../rung.ts';
import { RANK_NAMES, cleanName } from '../../net/names.ts';
import { REALMS } from '../../data/realms.ts';
import { RANKS } from '../../app/copy.ts';

/**
 * 位 The sect rank (docs/SEASON-RANKS.md, section 3 and section 8). A rank is a promise that it
 * never falls, so what is held here is that promise: the thresholds only rise, no release ever
 * raises one, the game and the server read the same rule, and the ranks sit on the places on the
 * climb the Cliff of Names carves.
 */

/** 釘 The thresholds as first released. A later release may lower one, never raise it. */
const PINNED = [0, 9, 27, 45, 63, 81, 85, 90, 100];

const MIGRATION = readFileSync('supabase/migrations/20261016100000_sect_rank.sql', 'utf8');

describe('位 the sect rank', () => {
  it('has nine ranks whose thresholds start at nothing and rise strictly', () => {
    expect(RUNGS).toHaveLength(9);
    expect(RUNG_AT).toHaveLength(RUNGS.length);
    expect(TOP_RUNG).toBe(8);
    expect(RUNG_AT[0]).toBe(0);
    for (let i = 1; i < RUNG_AT.length; i++) expect(RUNG_AT[i], `rank ${i}`).toBeGreaterThan(RUNG_AT[i - 1]);
  });

  it('never raises a threshold a release has already shown', () => {
    expect(RUNG_AT).toHaveLength(PINNED.length);
    RUNG_AT.forEach((t, i) => expect(t, `rank ${i}`).toBeLessThanOrEqual(PINNED[i]));
  });

  it('reads the same rule as rung_of() on the server', () => {
    // The SQL array is RUNG_AT less its leading 0; the schema test runs the function itself.
    const sql = MIGRATION.match(/unnest\(array\[([\d,\s]+)\]\)/)?.[1].split(',').map(Number);
    expect(sql).toEqual(RUNG_AT.slice(1));
    const want = (s: number) => RUNG_AT.slice(1).filter((t) => s >= t).length;
    for (let s = 0; s <= 120; s++) expect(rungOf(s), `score ${s}`).toBe(want(s));
  });

  it('lands the realm ranks on the Cliff gates and Elder on the first mark', () => {
    // Gate g (1 to 8) is carved at climb 9g, gate 9 at the first thunder mark (standings_carve).
    for (let r = 1; r <= 4; r++) {
      const g = gateOfRung(r)!;
      expect(RUNG_AT[r], `rank ${r}`).toBe(9 * g);
      expect(RUNGS[r].realm, `rank ${r}`).toBe(g + 1);
    }
    expect(gateOfRung(5)).toBe(9);
    expect(RUNG_AT[5]).toBe(SUMMIT + 1);
    expect([0, 6, 7, 8].map(gateOfRung)).toEqual([null, null, null, null]);
    // And the mark ranks are 5, 10 and 20 marks past the summit.
    expect(RUNG_AT.slice(6).map((t) => t - SUMMIT)).toEqual([5, 10, 20]);
  });

  it('says what the next rank needs, in layers and in marks', () => {
    expect(nextRung(0, 0)).toEqual({ rung: 1, layers: 9, marks: 0 });
    expect(nextRung(27, 0)).toEqual({ rung: 3, layers: 18, marks: 0 });
    expect(nextRung(72, 0)).toEqual({ rung: 5, layers: 8, marks: 1 });
    expect(nextRung(80, 0)).toEqual({ rung: 5, layers: 0, marks: 1 });
    expect(nextRung(80, 2)).toEqual({ rung: 6, layers: 0, marks: 3 });
    expect(nextRung(80, 19)).toEqual({ rung: 8, layers: 0, marks: 1 });
    expect(nextRung(80, 20)).toBeNull();
    expect(nextRung(80, 23)).toBeNull();
    expect(scoreOf(80, 3)).toBe(83);
    expect(scoreOf(-4, NaN)).toBe(0);
  });

  it('takes from the server only a whole rank from 0 to 8', () => {
    expect([0, 3, 8, '5'].map(rungFrom)).toEqual([0, 3, 8, 5]);
    expect([null, undefined, -1, 9, 2.5, 'x', {}].map(rungFrom)).toEqual([null, null, null, null, null, null, null]);
  });

  it('carves each seal from its own name, one character each, all different', () => {
    for (const r of RUNGS) expect(r.han, r.seal).toContain(r.seal);
    expect(new Set(RUNGS.map((r) => r.seal)).size).toBe(RUNGS.length);
    for (const r of RUNGS) expect(REALMS.some((x) => x.n === r.realm), r.han).toBe(true);
  });

  it('names every rank in English beside its characters (譯)', () => {
    expect(RANKS.sect.names).toHaveLength(RUNGS.length);
    expect(new Set(RANKS.sect.names).size).toBe(RUNGS.length);
    for (const n of RANKS.sect.names) expect(n).toMatch(/^[A-Z][a-z]+( [A-Z][a-z]+)?$/);
    expect(RANKS.sect.names[4]).toBe('Guardian');
    expect(RANKS.sect.names[6]).toBe('Peak Lord');
    // What reaches each realm rank names the realm it lands on, by the realm's own name.
    expect(RANKS.sect.reach).toHaveLength(RUNGS.length);
    expect(RANKS.sect.checked).toHaveLength(RUNGS.length);
    for (let r = 1; r <= 4; r++) {
      const realm = REALMS.find((x) => x.n === RUNGS[r].realm)!.name;
      expect(RANKS.sect.reach[r], `rank ${r}`).toContain(realm);
      expect(RANKS.sect.checked[r], `rank ${r}`).toContain(realm);
    }
  });

  it('keeps the nine ranks out of the names, whole, on the phone and on the server alike', () => {
    expect(RANK_NAMES).toEqual(RUNGS.map((r) => r.han));
    const sqlList = MIGRATION.match(/in\s*\n?\s*\(('[^)]+')\)/)?.[1].match(/'([^']+)'/g)?.map((s) => s.slice(1, -1));
    expect(sqlList).toEqual(RANK_NAMES);
    for (const n of ['長老', '老祖', '太上長老', '外門弟子', '內門弟子', '内门弟子', '長 老', '护法', '峰主', '真传弟子', ' 核心 弟子 ']) {
      expect(cleanName(n), n).toBeNull();
    }
    for (const n of ['長老鶴', '老祖宗', '峰主人', 'Elder Wu', 'Guardian', '雲中君']) expect(cleanName(n), n).not.toBeNull();
  });
});
