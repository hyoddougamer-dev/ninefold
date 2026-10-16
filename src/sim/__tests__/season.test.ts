import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLOSED_TEST_REFUSED, exportSave, importSave, keepSpare, load, pendingFarewell,
  rearm, save, seasonCardDue, seasonCardRead, walked, wasEdited, wipe,
} from '../save.ts';
import { LAST_WEEK, SEASON, SEASON_DATE, SEASON_DAY, SEASON_START, SEASON_UTC, inSeason, retires, seasonAt, seasonOf, spellDate } from '../season.ts';
import { validFarewell } from '../load.ts';
import { SEASON_START as FROM_VERIFY, GAME_EPOCH } from '../verify.ts';
import { newState, type State } from '../state.ts';
import { validate } from '../load.ts';
import { seal } from '../seal.ts';

/**
 * 季 Season 0, The Founding 開山: the marker, the switch, and the closed-test cultivator that
 * does not stay. docs/SEASON0-THEME.md (2d to 2f) is what these hold the client to: the save is
 * read once for four numbers and removed, with no copy, no file and no way back.
 */

/** 舊 Where an earlier build of the branch kept the whole save. Nothing may ever write it. */
const KEEPSAKE = 'ninefold.save.closedtest';

const DAY = 86_400;
const BEFORE = SEASON_START - 3 * DAY;     // the closed test's last week
const AFTER = SEASON_START + 3600;         // the first hour of the season

function memoryStorage(full = false) {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (full) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

let store = memoryStorage();
beforeEach(() => {
  store = memoryStorage();
  (globalThis as { localStorage?: unknown }).localStorage = store;
  rearm();
});

/** A closed-test cultivator, written by the closed-test build: no season field at all. */
function veteran(realm = 9, layer = 3, marks = 12): Record<string, unknown> {
  const s = { ...newState(BEFORE - 60 * DAY), at: BEFORE, realm, layer, tribulation: realm === 9 ? marks : 0,
    lives: [{ marks: 4, at: BEFORE - 70 * DAY }], qi: 1e9, materials: 1e9 } as Record<string, unknown>;
  delete s.season;
  return s;
}

/** Stored the way the closed-test build stored it: sealed JSON. */
const sealed = (o: unknown) => seal(JSON.stringify(o));

describe('季 the marker', () => {
  it('is a string, never a number, and the instant is in seconds', () => {
    expect(typeof SEASON).toBe('string');
    expect(SEASON).toBe('s0');
    // Monday 26 October 2026, 00:00 UTC. Not the plan's old 19 October.
    expect(new Date(SEASON_START * 1000).toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(new Date(SEASON_START * 1000).getUTCDay()).toBe(1);
  });

  it('日 is the one date every line of copy reads, so moving SEASON_START moves them all', () => {
    expect(SEASON_DAY).toBe('Monday 26 October');
    expect(SEASON_DATE).toBe('26 October');
    expect(SEASON_UTC).toBe('Monday 26 October, 00:00 UTC');
    expect(spellDate(LAST_WEEK)).toBe('Monday 19 October');
    // No line of player copy spells a day of the year by hand: comments may, copy may not.
    const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
    const byHand = new RegExp(`\\b\\d{1,2} (${months})\\b|\\b(${months}) \\d{1,2}\\b`);
    for (const file of ['src/app/copy.ts', 'src/sim/save.ts', 'src/app/notices.ts']) {
      const code = readFileSync(join(process.cwd(), file), 'utf8').split('\n')
        .filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l));
      expect(code.filter((l) => byHand.test(l)), file).toEqual([]);
    }
  });

  it('is re-exported beside GAME_EPOCH, the same number', () => {
    expect(FROM_VERIFY).toBe(SEASON_START);
    expect(GAME_EPOCH).toBeLessThan(SEASON_START);
  });

  it('is stamped by newState only from the switch on', () => {
    expect(newState(BEFORE).season).toBeNull();
    expect(newState(SEASON_START - 1).season).toBeNull();
    expect(newState(SEASON_START).season).toBe(SEASON);
    expect(seasonAt(AFTER)).toBe(SEASON);
  });

  it('is carried through validate only when it is a season the game knows', () => {
    // Begun before the switch, so only the marker can make it a season save.
    const base = { ...newState(AFTER), startedAt: BEFORE } as Record<string, unknown>;
    expect(validate({ ...base, season: 's0' }, AFTER).season).toBe('s0');
    // A number with a fallback of 0 would have read every closed-test save as season 0.
    for (const junk of [0, 1, 's1', '', 'S0', null, undefined, {}, ['s0'], true]) {
      expect(validate({ ...base, season: junk }, AFTER).season).toBeNull();
    }
    const old = veteran();
    expect(validate(old, AFTER).season).toBeNull();
    expect(validate(old, AFTER).realm).toBe(9);   // validate still reads every season's save
  });

  it('reads the marker off a raw save, an export and a State alike', () => {
    expect(seasonOf({ v: 1, season: 's0' })).toBe('s0');
    expect(seasonOf({ game: 'ninefold', state: { v: 1, season: 's0' } })).toBe('s0');
    expect(seasonOf(veteran())).toBeNull();
    expect(seasonOf(null)).toBeNull();
    expect(seasonOf('s0')).toBeNull();
  });

  it('inSeason asks the marker, the start and the clock; the device retires on the marker and the clock', () => {
    const s = newState(AFTER);
    expect(inSeason(s, AFTER)).toBe(true);
    expect(inSeason({ ...s, startedAt: SEASON_START - 1 }, AFTER)).toBe(false);
    expect(inSeason(s, SEASON_START - 1)).toBe(false);
    // 終 The last week is the seven days before the switch.
    expect(new Date(LAST_WEEK * 1000).toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(retires(veteran(), AFTER)).toBe(true);
    expect(retires(veteran(), SEASON_START - 1)).toBe(false);
    expect(retires(s, AFTER)).toBe(false);
  });
});

describe('印 retiring a device\'s save', () => {
  it('before the switch nothing at all changes', () => {
    const text = sealed(veteran());
    store.map.set('ninefold.save.v1', text);
    const r = load(SEASON_START - 1);
    expect(r.retired).toBeNull();
    expect(r.state.realm).toBe(9);
    expect(r.state.season).toBeNull();
    expect(store.map.get('ninefold.save.v1')).toBe(text);
    expect(pendingFarewell()).toBeNull();
    expect(walked()).toBeNull();
  });

  it('after the switch keeps four numbers, removes the save and its spare, and begins a season cultivator', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(9, 3, 12)));
    store.map.set('ninefold.save.backup', sealed(veteran(9, 1, 12)));
    const r = load(AFTER);

    expect(store.map.has('ninefold.save.v1')).toBe(false);
    expect(store.map.has('ninefold.save.backup')).toBe(false);
    expect(r.state.realm).toBe(1);
    expect(r.state.layer).toBe(0);
    expect(r.state.season).toBe(SEASON);
    expect(r.secondsAway).toBe(0);                            // no welcome-back for the old hours
    const four = { realm: 9, layer: 4, marks: 12, rebirths: 1 };
    expect(r.retired).toEqual(four);                          // the deepest copy, in four numbers
    expect(pendingFarewell()).toEqual(four);
    expect(walked()).toEqual(four);
  });

  it('keeps no copy of the save anywhere: no keepsake key, and nothing on the device but the four numbers', () => {
    const text = sealed(veteran(9, 3, 12));
    store.map.set('ninefold.save.v1', text);
    load(AFTER);
    expect(store.map.has(KEEPSAKE)).toBe(false);
    for (const [k, v] of store.map) {
      expect(v, k).not.toBe(text);
      expect(v.length, k).toBeLessThan(80);                   // four numbers, never a cultivator
    }
    // And the season save written after it is the season's own, never the old one.
    save(load(AFTER + 60).state);
    expect(store.map.has(KEEPSAKE)).toBe(false);
  });

  it('begin clears the farewell, and the card is not due again; the Stele\'s line stays', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(5, 2)));
    load(AFTER);
    expect(seasonCardDue()).toBe(true);
    expect(pendingFarewell()).toMatchObject({ realm: 5, layer: 3 });
    seasonCardRead();
    expect(seasonCardDue()).toBe(false);
    expect(pendingFarewell()).toBeNull();
    expect(walked()).toMatchObject({ realm: 5, layer: 3 });
  });

  it('a farewell kept across a closed app is still there on the next open, until Begin', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(7, 0)));
    load(AFTER);
    // The app was closed before the card was read: the next load retires nothing new.
    const again = load(AFTER + 600);
    expect(again.retired).toBeNull();
    expect(pendingFarewell()).toMatchObject({ realm: 7, layer: 1 });
  });

  it('a tab on this build left open across the switch never writes its closed-test cultivator over the season', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(9, 3)));
    const r = load(AFTER);
    seasonCardRead();
    // The season tab plays on and saves; its spare was kept only at load, as App.tsx does.
    keepSpare(r.state);
    save({ ...r.state, realm: 3, layer: 2, at: AFTER + 300 });
    // The old tab, loaded before the switch, ticks on past it and saves on its timer and on pagehide.
    const old = validate(veteran(9, 5), BEFORE);
    save({ ...old, at: AFTER + 400 });
    keepSpare({ ...old, at: AFTER + 400 });
    const back = load(AFTER + 600);
    expect(back.state.season).toBe(SEASON);
    expect(back.state.realm).toBe(3);                        // nothing of the season was rolled back
    expect(back.state.layer).toBe(2);
    // Before the switch the same state is still the closed test's own, and it is written as ever.
    store.map.clear();
    save({ ...old, at: BEFORE });
    expect(store.map.has('ninefold.save.v1')).toBe(true);
  });

  it('an old tab writing the closed-test save back keeps the season spare; the Stele only rises, the card stays read', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(9, 3)));
    const r = load(AFTER);
    seasonCardRead();
    // The season begins and the clean load keeps a spare of it, as App.tsx does.
    const season: State = { ...r.state, realm: 2, layer: 4 };
    save(season);
    keepSpare(season);
    // A tab still on the closed-test build played on and wrote its save on pagehide.
    store.map.set('ninefold.save.v1', sealed(veteran(9, 5)));

    const back = load(AFTER + 600);
    expect(back.state.season).toBe(SEASON);
    expect(back.state.realm).toBe(2);                        // the season save survived in the spare
    expect(back.state.layer).toBe(4);
    expect(store.map.has('ninefold.save.v1')).toBe(false);   // and the old one is gone again
    expect(walked()).toMatchObject({ realm: 9, layer: 6 });  // the further of the two
    expect(pendingFarewell()).toBeNull();                    // no second card
    // A shallower one never lowers the line.
    store.map.set('ninefold.save.v1', sealed(veteran(4, 0)));
    load(AFTER + 900);
    expect(walked()).toMatchObject({ realm: 9, layer: 6 });
  });

  it('a full storage still retires the save and begins the season: only the line is lost', () => {
    const text = sealed(veteran());
    store.map.set('ninefold.save.v1', text);
    store.map.set('ninefold.save.backup', text);
    const full = memoryStorage(true);
    for (const [k, v] of store.map) full.map.set(k, v);
    (globalThis as { localStorage?: unknown }).localStorage = full;
    const r = load(AFTER);
    expect(full.map.has('ninefold.save.v1')).toBe(false);
    expect(full.map.has('ninefold.save.backup')).toBe(false);
    expect(r.state.season).toBe(SEASON);
    // The card still has its line this time, from the load itself (App.tsx falls back to it).
    expect(r.retired).toMatchObject({ realm: 9, layer: 4 });
    expect(pendingFarewell()).toBeNull();
  });

  it('a cultivator begun on the new build before the switch is retired with everyone else', () => {
    const early: State = { ...newState(SEASON_START - 600), realm: 1, layer: 6, qi: 3000 };
    expect(early.season).toBeNull();
    save(early);
    const r = load(AFTER);
    expect(r.retired).toEqual({ realm: 1, layer: 7, marks: 0, rebirths: 0 });
    expect(r.state.layer).toBe(0);
    expect(r.state.season).toBe(SEASON);
  });

  it('a season save whose marker a closed-test tab dropped is still a season save, by its date', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(9, 3)));
    const first = load(AFTER);
    // A tab still on the closed-test build began again (or read the season save) after the
    // switch and wrote it back without the field it does not know.
    const stripped = { ...first.state, realm: 2, layer: 5 } as Record<string, unknown>;
    delete stripped.season;
    expect(seasonOf(stripped)).toBe(SEASON);
    expect(retires(stripped, AFTER + 600)).toBe(false);
    store.map.set('ninefold.save.v1', sealed(stripped));
    const back = load(AFTER + 600);
    expect(back.retired).toBeNull();
    expect(back.state).toMatchObject({ season: SEASON, realm: 2, layer: 5 });
    expect(walked()).toMatchObject({ realm: 9, layer: 4 });  // the line is untouched
    // Nothing begun before the switch reads as the season this way, nor a start in the future.
    expect(seasonOf({ v: 1, startedAt: SEASON_START - 1 })).toBeNull();
    expect(seasonOf({ v: 1, startedAt: AFTER + 10 }, AFTER)).toBeNull();
    expect(validate({ v: 1, startedAt: AFTER + 10 }, SEASON_START - 5).season).toBeNull();
  });

  it('a season save is never retired, and loads as it always did', () => {
    const s: State = { ...newState(AFTER), realm: 3, layer: 2 };
    save(s);
    const r = load(AFTER + 120);
    expect(r.retired).toBeNull();
    expect(r.state.realm).toBe(3);
    expect(walked()).toBeNull();
    expect(pendingFarewell()).toBeNull();
  });

  it('滅 Erase never touches the card already read, the farewell or the Stele\'s line', () => {
    store.map.set('ninefold.save.v1', sealed(veteran()));
    load(AFTER);
    const line = walked();
    wipe();
    expect(pendingFarewell()).toEqual(line);
    seasonCardRead();
    wipe();
    expect(seasonCardDue()).toBe(false);
    expect(walked()).toEqual(line);
  });

  it('a closed-test save from before the seal, stored plain, retires like a sealed one', () => {
    store.map.set('ninefold.save.v1', JSON.stringify(veteran(6, 2)));
    const r = load(AFTER);
    expect(r.retired).toEqual({ realm: 6, layer: 3, marks: 0, rebirths: 1 });
    expect(store.map.has('ninefold.save.v1')).toBe(false);
    expect(r.state.season).toBe(SEASON);
  });

  it('改 a hand-edited closed-test save does not mark the season cultivator as edited', () => {
    // The closed test took hand-edited saves. This phone sealed its saves, so a plain one
    // under the key reads as edited, and the note used to outlive the cultivator it was about.
    store.map.set('ninefold.sealed', '1');
    store.map.set('ninefold.save.v1', JSON.stringify(veteran(6, 2)));
    load(AFTER);
    expect(wasEdited()).toBe(false);
    // A season spare that stays keeps whatever note it earned for itself.
    store.map.set('ninefold.edited', '1');
    store.map.set('ninefold.save.v1', JSON.stringify(veteran(4, 0)));
    store.map.set('ninefold.save.backup', seal(JSON.stringify({ ...newState(AFTER), season: SEASON })));
    load(AFTER + 60);
    expect(wasEdited()).toBe(true);
  });
});

describe('別 the four numbers are input, capped like a save', () => {
  it('reads only an object of numbers, and caps each one', () => {
    expect(validFarewell({ realm: 99, layer: -4, marks: 1e9, rebirths: 1e9 })).toEqual({ realm: 9, layer: 1, marks: 300, rebirths: 40 });
    // Marks only in the ninth realm, as validate holds them.
    expect(validFarewell({ realm: 4, layer: 3, marks: 12, rebirths: 0 })).toEqual({ realm: 4, layer: 3, marks: 0, rebirths: 0 });
    expect(validFarewell({ realm: 3.7, layer: 2.2 })).toEqual({ realm: 3, layer: 2, marks: 0, rebirths: 0 });
    for (const junk of [null, undefined, 'x', 9, [], {}, { realm: '9', layer: 1 }, { realm: 9 }, { realm: NaN, layer: 1 }]) {
      expect(validFarewell(junk)).toBeNull();
    }
  });

  it('a hand-edited farewell on the device reads capped, and a broken one as nothing', () => {
    store.map.set('ninefold.season.walked', JSON.stringify({ realm: 12, layer: 40, marks: 9999, rebirths: 2 }));
    expect(walked()).toEqual({ realm: 9, layer: 9, marks: 300, rebirths: 2 });
    store.map.set('ninefold.season.farewell', '{not json');
    expect(pendingFarewell()).toBeNull();
  });
});

describe('入 a pasted closed-test save', () => {
  it('cannot be loaded as a season save, and says so in words', () => {
    expect(CLOSED_TEST_REFUSED).toBe('That save is from the closed test, which ended on Monday 26 October. It cannot be loaded in Season 0.');
    const text = exportSave(validate(veteran(), BEFORE));
    expect(importSave(text, AFTER)).toEqual({ state: null, error: CLOSED_TEST_REFUSED });
    expect(importSave(JSON.stringify(veteran()), AFTER).error).toBe(CLOSED_TEST_REFUSED);
    // The cloud's copy goes through the same door (App.tsx and useCloud.ts).
    expect(importSave(JSON.stringify({ game: 'ninefold', state: veteran() }), AFTER).state).toBeNull();
  });

  it('was accepted before the switch, and a season copy is accepted after it', () => {
    expect(importSave(exportSave(validate(veteran(), BEFORE)), BEFORE).state?.realm).toBe(9);
    const s: State = { ...newState(AFTER), realm: 2, layer: 1, levels: { technique: 3, method: 0, pills: 0, cores: 0 } };
    expect(importSave(exportSave(s), AFTER + 60).state?.season).toBe(SEASON);
  });
});

describe('具 the fixtures keep measuring what they measured', () => {
  /**
   * A fabricated save without the marker is retired at load after the switch, and its
   * harness then measures a fresh cultivator and prints a tick (CLAUDE.md, the traps).
   * Every tool that writes the save has to stamp it.
   */
  it('every harness in tools/ that writes the save stamps the season', () => {
    const root = join(__dirname, '../../../tools');
    const files = readdirSync(root).filter((f) => !f.startsWith('.') && /\.(m?[jt]s)$/.test(f) && statSync(join(root, f)).isFile());
    const writers = files.filter((f) => readFileSync(join(root, f), 'utf8').includes('ninefold.save.v1'));
    // A floor: if this finds nothing, it has stopped looking, not stopped finding.
    expect(writers.length).toBeGreaterThanOrEqual(30);
    const bare = writers.filter((f) => !/season: ['"]s0['"]|season: SEASON\b/.test(readFileSync(join(root, f), 'utf8')));
    expect(bare).toEqual([]);
  });
});
