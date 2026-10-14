import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLOSED_TEST, CLOSED_TEST_REFUSED, closedTest, closedTestFileName, exportSave, importSave, keepSpare, load,
  rearm, save, seasonCardDue, seasonCardRead, wipe,
} from '../save.ts';
import { SEASON, SEASON_START, inSeason, retires, seasonAt, seasonOf } from '../season.ts';
import { SEASON_START as FROM_VERIFY, GAME_EPOCH } from '../verify.ts';
import { newState, type State } from '../state.ts';
import { validate } from '../load.ts';
import { open, seal } from '../seal.ts';

/**
 * 季 Season 0, The Seal Falls 落印: the marker, the switch, and the closed-test copy that is
 * sealed and kept. docs/SEASON0-PLAN.md section 2 is what these hold the client to.
 */

const DAY = 86_400;
const BEFORE = SEASON_START - 3 * DAY;     // the closed test's last week
const AFTER = SEASON_START + 3600;         // the first hour of the season

function memoryStorage(fullAfter = Infinity) {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (k === CLOSED_TEST && fullAfter <= 0) throw new Error('QuotaExceededError');
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
    const base = { ...newState(AFTER) } as Record<string, unknown>;
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
    expect(store.map.has(CLOSED_TEST)).toBe(false);
    expect(closedTest(SEASON_START - 1)).toBeNull();
  });

  it('after the switch keeps the old save byte for byte and begins a season cultivator', () => {
    const text = sealed(veteran(9, 3, 12));
    store.map.set('ninefold.save.v1', text);
    store.map.set('ninefold.save.backup', sealed(veteran(9, 1, 12)));
    const r = load(AFTER);

    expect(store.map.get(CLOSED_TEST)).toBe(text);           // the very text, deepest copy
    expect(store.map.has('ninefold.save.v1')).toBe(false);
    expect(store.map.has('ninefold.save.backup')).toBe(false);
    expect(r.state.realm).toBe(1);
    expect(r.state.layer).toBe(0);
    expect(r.state.season).toBe(SEASON);
    expect(r.secondsAway).toBe(0);                            // no welcome-back for the old hours
    expect(r.retired).toMatchObject({ realm: 9, layer: 4, marks: 12, rebirths: 1, kept: true });
  });

  it('the copy a player takes out is the save export, marked as the closed test', () => {
    store.map.set('ninefold.save.v1', sealed(veteran()));
    const r = load(AFTER);
    const copy = r.retired!.text;
    const body = JSON.parse(open(copy).json!);
    expect(body.game).toBe('ninefold');
    expect(body.state.realm).toBe(9);
    expect(body.state.season).toBeNull();
    // The same shape exportSave writes, so it is the same text a save export is.
    const exported = JSON.parse(open(exportSave(validate(veteran(), AFTER))).json!);
    expect(Object.keys(body)).toEqual(Object.keys(exported));
    expect(closedTest(AFTER)?.text && JSON.parse(open(closedTest(AFTER)!.text).json!).state.realm).toBe(9);
    expect(closedTestFileName({ realm: 9 })).toMatch(/^ninefold-closedtest-realm9-\d{4}-\d{2}-\d{2}\.txt$/);
  });

  it('a second retirement does not overwrite the first with anything that is not further along', () => {
    const first = sealed(veteran(9, 3));
    store.map.set('ninefold.save.v1', first);
    load(AFTER);
    save(newState(AFTER));
    // Something shallower turns up in the main key: it is not kept over the first.
    store.map.set('ninefold.save.v1', sealed(veteran(5, 2)));
    load(AFTER + 60);
    expect(store.map.get(CLOSED_TEST)).toBe(first);
    // And the same depth does not either: the one already kept stays.
    store.map.set('ninefold.save.v1', sealed({ ...veteran(9, 3), qi: 5 }));
    load(AFTER + 120);
    expect(store.map.get(CLOSED_TEST)).toBe(first);
  });

  it('an old tab writing the closed-test save back keeps the season spare, and the copy only grows', () => {
    store.map.set('ninefold.save.v1', sealed(veteran(9, 3)));
    const r = load(AFTER);
    // The season begins and the clean load keeps a spare of it, as App.tsx does.
    const season: State = { ...r.state, realm: 2, layer: 4 };
    save(season);
    keepSpare(season);
    // A tab still on the closed-test build played on and wrote its save on pagehide.
    const further = sealed(veteran(9, 5));
    store.map.set('ninefold.save.v1', further);

    const back = load(AFTER + 600);
    expect(back.state.season).toBe(SEASON);
    expect(back.state.realm).toBe(2);                        // the season save survived in the spare
    expect(back.state.layer).toBe(4);
    expect(store.map.get(CLOSED_TEST)).toBe(further);        // the copy is the one further along
  });

  it('a failed write of the copy removes nothing and starts no season save over it', () => {
    store = memoryStorage(0);
    (globalThis as { localStorage?: unknown }).localStorage = store;
    const text = sealed(veteran());
    store.map.set('ninefold.save.v1', text);
    const r = load(AFTER);
    expect(r.retired).toMatchObject({ realm: 9, kept: false });
    expect(r.retired!.text.length).toBeGreaterThan(20);       // it can still be copied out by hand
    expect(store.map.get('ninefold.save.v1')).toBe(text);
    // The game holds still: neither the save nor the spare is written over the only copy.
    save(r.state);
    keepSpare(r.state);
    expect(store.map.get('ninefold.save.v1')).toBe(text);
    expect(store.map.has('ninefold.save.backup')).toBe(false);
  });

  it('a cultivator begun on the new build before the switch is retired with everyone else', () => {
    const early: State = { ...newState(SEASON_START - 600), realm: 1, layer: 6, qi: 3000 };
    expect(early.season).toBeNull();
    save(early);
    const r = load(AFTER);
    expect(r.retired).toMatchObject({ realm: 1, layer: 7, kept: true });
    expect(r.state.layer).toBe(0);
    expect(r.state.season).toBe(SEASON);
  });

  it('a season save is never retired, and loads as it always did', () => {
    const s: State = { ...newState(AFTER), realm: 3, layer: 2 };
    save(s);
    const r = load(AFTER + 120);
    expect(r.retired).toBeNull();
    expect(r.state.realm).toBe(3);
    expect(store.map.has(CLOSED_TEST)).toBe(false);
  });

  it('滅 Erase never touches the kept copy, nor the card already read', () => {
    store.map.set('ninefold.save.v1', sealed(veteran()));
    load(AFTER);
    const kept = store.map.get(CLOSED_TEST);
    expect(seasonCardDue()).toBe(true);
    seasonCardRead();
    expect(seasonCardDue()).toBe(false);
    wipe();
    expect(store.map.get(CLOSED_TEST)).toBe(kept);
    expect(seasonCardDue()).toBe(false);
  });

  it('reading the kept copy never marks the season save as edited', () => {
    // A closed-test save from before the seal is plain text, and it is kept as plain text.
    store.map.set('ninefold.save.v1', JSON.stringify(veteran()));
    load(AFTER);
    save(newState(AFTER));                                   // the season seals from now on
    closedTest(AFTER);
    load(AFTER + 60);
    expect(store.map.has('ninefold.edited')).toBe(false);
  });
});

describe('入 a pasted closed-test save', () => {
  it('cannot be played as a season save, and says so in words', () => {
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
