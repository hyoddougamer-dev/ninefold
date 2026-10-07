import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { canFightWarden, layersOpened, sealLeft, sealDays, sealed, validate, type State } from '../state.ts';
import { advance } from '../time.ts';
import { settle } from '../crafts.ts';
import { load } from '../save.ts';
import { seal } from '../seal.ts';
import { progressOf } from '../echo.ts';
import { reincarnate } from '../rebirth.ts';
import { EDGE_STRICT_FROM, SEAL_GRACE, SEAL_STRICT_FROM, SLACK, verify } from '../verify.ts';
import { sync, type Store, type Saved, type Standing, type Profile } from '../../../supabase/functions/sync/core.ts';

/**
 * 舊 Saves the game before the seal wrote, read by the game after it.
 *
 * Every fixture in fixtures/legacy was written by the client that was live on 2026-10-06
 * (origin/main, 271371a), playing the harness's own cultivators: tools/habits.ts at that
 * commit, with T0 moved to a real date, and each save taken exactly as that client sent it
 * (its outbound copy, through JSON). Timeline A is a climb played wholly before the release,
 * timeline B one played after it on a phone that never updated. They were picked out of
 * about thirteen thousand such saves, every one of which was also read here, outside the
 * suite, against the old code: validate() and an hour of the load path give the same state
 * in both builds, and no pair of them is ever struck; see the report of 2026-10-07.
 *
 * Three promises are held, because real players' saves cross this release:
 *   - a save the old client wrote loads whole, and nothing new is invented in it;
 *   - a pair of them is never struck, and a pair from before the release is never charged
 *     for a rule the old game did not have (the seal, the Platform's grown edge);
 *   - a phone still on the old build after it waits at the worst, and the wait clears by
 *     itself within a gate's seal.
 */

interface Fixture { from: string; day: number; phase: string; serverAt: number; save: Record<string, unknown> }
const DIR = new URL('./fixtures/legacy/', import.meta.url);
const NAMES = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const fx = (name: string): Fixture => JSON.parse(readFileSync(new URL(`${name}.json`, DIR), 'utf8'));
/** As the server reads it: validated against its clock. */
const read = (name: string, now = fx(name).serverAt): State => validate(fx(name).save, now);
const DAY = 86_400;

/** Canonical JSON: the same value whatever order its keys were written in. */
const canon = (x: unknown): string => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

/**
 * What validate() is allowed to change in an honest old save, and nothing else: the stance
 * (derived from the arts), each worn piece's refining (moved onto State.refined, which the
 * old client also wrote), the vault run's burn (rounded to a whole second), and the new
 * game's own fields, which it fills empty.
 */
const DERIVED = new Set(['stance', 'worn', 'lastRun', 'lives', 'codexKept', 'crafts']);

describe('舊 the legacy fixtures', () => {
  it('are there, eleven of them, each a whole save from the old client', () => {
    // A harness that reached nothing passes: hold the count to a floor.
    expect(NAMES.length).toBe(11);
    for (const n of NAMES) {
      const f = fx(n);
      expect(f.save.v, n).toBe(1);
      // The old client never wrote the new game's fields.
      expect('lives' in f.save, n).toBe(false);
      expect('codexKept' in f.save, n).toBe(false);
    }
  });
});

describe('舊 an old save loads whole', () => {
  for (const name of NAMES) {
    it(`${name}: every field the player sees comes back as it was written`, () => {
      const raw = fx(name).save;
      const s = read(name) as unknown as Record<string, unknown>;
      for (const k of Object.keys(raw)) {
        if (DERIVED.has(k)) continue;
        expect(canon(s[k]), `${name}.${k}`).toBe(canon(raw[k]));
      }
      // Worn: every piece, its lines, its source, its lock; only the refining moved, and
      // it moved to the place, at the same level.
      const worn = raw.worn as Record<string, Record<string, unknown>>;
      const refined = raw.refined as Record<string, number>;
      for (const [slot, it] of Object.entries(worn)) {
        const { refine, ...piece } = it;
        expect(canon((s.worn as Record<string, unknown>)[slot]), `${name} worn ${slot}`).toBe(canon(piece));
        if (typeof refine === 'number') expect((s.refined as Record<string, number>)[slot] ?? 0).toBe(Math.max(refine, refined[slot] ?? 0));
      }
      expect(Object.keys(s.worn as object).sort()).toEqual(Object.keys(worn).sort());
      // The workshop: every number in it, and the two hands it had.
      const c = raw.crafts as Record<string, unknown>;
      const sc = s.crafts as Record<string, unknown>;
      for (const k of Object.keys(c)) {
        if (k === 'carry') continue;
        expect(canon(sc[k]), `${name}.crafts.${k}`).toBe(canon(c[k]));
      }
      expect(canon({ ...(sc.carry as object), pill: undefined })).toBe(canon(c.carry));
      // The vault's last run, its burn to the second.
      const run = raw.lastRun as Record<string, unknown> | undefined;
      if (run) expect(canon({ ...(s.lastRun as object), burn: Math.round(Number(run.burn)) })).toBe(canon({ ...run, burn: Math.round(Number(run.burn)) }));
    });
  }

  it('invents nothing the old game did not have: no life, no codex, no crucible, no pill, no Hundredfold mark', () => {
    for (const name of NAMES) {
      const s = read(name);
      expect(s.lives, name).toEqual([]);
      expect(s.codexKept, name).toEqual([]);
      expect(s.crafts.order ?? null, name).toBeNull();
      expect(s.crafts.carry.pill ?? null, name).toBeNull();
      expect([...Object.values(s.worn), ...s.chest].some((it) => it?.hundred), name).toBe(false);
    }
  });

  it('holds the pieces the mid-workshop save had: forged, fused and refined', () => {
    const s = read('workshop');
    const all = [...Object.values(s.worn), ...s.chest];
    expect(all.some((it) => it?.from === 'forge')).toBe(true);
    expect(all.some((it) => it?.from === 'fused')).toBe(true);
    expect(Object.keys(s.refined).length).toBe(6);
    expect(s.crafts.task).not.toBeNull();
    expect(read('fullchest').chest.length).toBe((fx('fullchest').save.chest as unknown[]).length);
  });

  describe('through the app\'s own load path', () => {
    beforeEach(() => {
      const map = new Map<string, string>();
      (globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => { map.set(k, v); },
        removeItem: (k: string) => { map.delete(k); },
        clear: () => map.clear(),
        key: (i: number) => [...map.keys()][i] ?? null,
        get length() { return map.size; },
      };
    });

    for (const name of NAMES) {
      it(`${name}: the sealed copy the old client stored opens to the same cultivator`, () => {
        const f = fx(name);
        localStorage.setItem('ninefold.save.v1', seal(JSON.stringify(f.save)));
        localStorage.setItem('ninefold.sealed', '1');
        const at = Number(f.save.at);
        const got = load(at).state;
        const want = settle(advance(validate(f.save, at), at), at).state;
        expect(canon(got)).toBe(canon(want));
        expect(got.realm).toBe(f.save.realm);
        expect(got.layer).toBe(f.save.layer);
        expect(got.tribulation).toBe(f.save.tribulation);
        expect(got.chest.length).toBe((f.save.chest as unknown[]).length);
      });
    }
  });

  it('orders exactly as the old game ordered: progressOf is the ladder and the marks for a first life', () => {
    for (const name of NAMES) {
      const s = read(name);
      expect(progressOf(s), name).toBe(layersOpened(s) + s.tribulation);
    }
  });
});

describe('封 the seal, meeting a save from before it', () => {
  it('shuts the gate on the new client for an old save whose warden has just come out, and takes nothing', () => {
    const s = read('gate8-after-at', Number(fx('gate8-after-at').save.at));
    expect(s.wardenFell).toBe(false);
    expect(sealLeft(s)).toBeGreaterThan(0);
    expect(sealLeft(s)).toBeLessThanOrEqual(sealDays(8));
    expect(sealed(s)).toBe(true);
    expect(canFightWarden(s)).toBe(false);
    expect(s.qi).toBe(fx('gate8-after-at').save.qi);
  });
});

describe('驗 old-client pairs on the new server', () => {
  const pair = (a: string, b: string) => {
    const now = fx(b).serverAt;
    return { before: read(a, now), after: read(b, now), dt: now - fx(a).serverAt };
  };

  it('a gate crossed before the release is ranked: the old game had no seal', () => {
    const { before, after, dt } = pair('gate5-before-at', 'gate5-before-past');
    expect(before.at).toBeLessThan(SEAL_STRICT_FROM);
    expect(after.realm).toBe(6);
    const v = verify(before, after, dt);
    expect(v.why).toEqual([]);
    expect(v.suspect).toBe(false);
  });

  for (const [at, past, realm] of [['gate5-after-at', 'gate5-after-past', 5], ['gate8-after-at', 'gate8-after-past', 8]] as const) {
    it(`a phone still on the old build crossing gate ${realm} after it waits, is never struck, and clears within the seal`, () => {
      const { before, after, dt } = pair(at, past);
      expect(before.at).toBeGreaterThanOrEqual(SEAL_STRICT_FROM);
      const v = verify(before, after, dt);
      expect(v.strike).toBe(false);
      expect(v.why).toEqual(['too-fast']);
      // The wait is the seal still owed when the server last ranked it, and no more.
      const clears = (sealLeft(before) * DAY - SEAL_GRACE) / SLACK + 60;
      expect(clears).toBeLessThanOrEqual(sealDays(realm) * DAY / SLACK);
      expect(verify(before, after, clears).why).toEqual([]);
    });
  }

  it('a mark crossed between two visits is ranked, as it was', () => {
    const { before, after, dt } = pair('tribulation-at', 'tribulation-past');
    expect(after.tribulation).toBe(before.tribulation + 1);
    const v = verify(before, after, dt);
    expect(v.why).toEqual([]);
  });

  for (const name of ['day0', 'workshop', 'fullchest', 'gate5-before-past', 'tribulation-past']) {
    it(`${name}: the new client carrying on an old save for an hour is ranked`, () => {
      const before = read(name);
      const t = fx(name).serverAt + 3600;
      const after = settle(advance(before, t), t).state;
      const v = verify(before, after, 3600);
      expect(v.why, name).toEqual([]);
    });
  }

  it('reads the grown Platform edge only from EDGE_STRICT_FROM, the instant the seal is read from', () => {
    expect(EDGE_STRICT_FROM).toBe(SEAL_STRICT_FROM);
    // Two days after the release of 2026-10-08: see SEAL_STRICT_FROM.
    expect(new Date(SEAL_STRICT_FROM * 1000).toISOString()).toBe('2026-10-10T00:00:00.000Z');
  });
});

/** The server's database, in memory. */
function memory() {
  const profiles = new Map<string, Profile>();
  const saves = new Map<string, Saved>();
  const standings = new Map<string, Standing>();
  let closed = 0;
  const claims = new Map<string, number>();
  const store: Store = {
    async claim(id, now, gap) {
      const last = claims.get(id);
      if (last !== undefined && now - last < gap) return gap - (now - last);
      claims.set(id, now);
      return 0;
    },
    async mark(id, strike, suspect, ban) {
      const p = profiles.get(id)!;
      const strikes = p.strikes + (strike ? 1 : 0);
      const next = { ...p, strikes, suspect: p.suspect || suspect, banned: p.banned || strikes >= ban };
      profiles.set(id, next);
      return next;
    },
    async profile(id) { return profiles.get(id) ?? null; },
    async barred() { return null; },
    async saved(id) { return saves.get(id) ?? null; },
    async standing(id) { return standings.get(id) ?? null; },
    async writeProfile(id, p) { profiles.set(id, p); },
    async writeSaved(id, s) { saves.set(id, structuredClone(s)); },
    async writeStanding(id, s) { standings.set(id, s); },
    async log() { /* the verdicts are read off the replies */ },
    async closeWeek(w) { closed = Math.max(closed, w); },
    async lastClosed() { return closed; },
  };
  return { store, profiles, saves };
}

/** What a phone sends: the save as JSON. */
const wire = (s: unknown) => JSON.parse(JSON.stringify(s));

describe('同步 the sync core across the release', () => {
  it('an old save already ranked, then the new client carrying it on: verified, nothing struck', async () => {
    const m = memory();
    const f = fx('workshop');
    const joined = Number(f.save.startedAt);
    const r1 = await sync(m.store, 'u', f.save, f.serverAt, 'tester', joined);
    expect(r1.status).toBe(200);
    const t = f.serverAt + 3600;
    const next = settle(advance(validate(f.save, t), t), t).state;
    const r2 = await sync(m.store, 'u', wire(next), t, undefined, joined);
    expect(r2.status === 200 && r2.body.state).toBe('verified');
    expect(m.profiles.get('u')!.strikes).toBe(0);
  });

  it('an old phone crossing a sealed gate after the release waits, says how far behind, and is ranked once the seal has passed', async () => {
    const m = memory();
    const a = fx('gate8-after-at'), b = fx('gate8-after-past');
    const joined = Number(a.save.startedAt);
    const r1 = await sync(m.store, 'u', a.save, a.serverAt, 'tester', joined - 30 * DAY);
    expect(r1.status === 200 && r1.body.state).toBe('verified');
    const r2 = await sync(m.store, 'u', b.save, b.serverAt, undefined, joined - 30 * DAY);
    expect(r2.status).toBe(200);
    if (r2.status !== 200) return;
    expect(r2.body.state).toBe('waiting');
    expect(r2.body.ranked).toBe(false);
    // The same save, sent again as the hours pass, is ranked within the gate's seal.
    let at = b.serverAt;
    let state = r2.body.state;
    while (state === 'waiting' && at - a.serverAt < sealDays(8) * DAY) {
      at += 3600;
      const r = await sync(m.store, 'u', b.save, at, undefined, joined - 30 * DAY);
      state = r.status === 200 ? r.body.state : 'refused';
    }
    expect(state).toBe('verified');
    expect((at - a.serverAt) / 3600).toBeLessThanOrEqual(sealDays(8) * 24 / SLACK + 1);
    expect(m.profiles.get('u')!.strikes).toBe(0);
  });

  it('a rebirth the new client made from an old save is kept: an old phone sending the old life afterwards is behind, never a strike, and never wipes it', async () => {
    const m = memory();
    const f = fx('tribulation-past');
    const joined = Number(f.save.startedAt);
    expect((await sync(m.store, 'u', f.save, f.serverAt, 'tester', joined)).status).toBe(200);
    // The new client, maybe offline for a while, ends the life and syncs the new one.
    const t = f.serverAt + 6 * 3600;
    const reborn = reincarnate(advance(validate(f.save, t), t), t);
    expect(reborn.lives.length).toBe(1);
    const r2 = await sync(m.store, 'u', wire(reborn), t, undefined, joined);
    expect(r2.status).toBe(200);
    if (r2.status !== 200) return;
    expect(['verified', 'waiting']).toContain(r2.body.state);
    // Another device still on the old build, still on the old life, a day on.
    const later = t + DAY;
    const old = { ...f.save, at: Number(f.save.at) + DAY + 6 * 3600 };
    const r3 = await sync(m.store, 'u', old, later, undefined, joined);
    expect(r3.status === 200 && r3.body.state).toBe('behind');
    expect(m.profiles.get('u')!.strikes).toBe(0);
    // The cloud copy is still the new life, with its record.
    const kept = validate(m.saves.get('u')!.latest, later);
    expect(kept.lives.length).toBe(1);
    // And the pick on sign-in: the new client offers the cloud's new life to a phone holding
    // the old one (lives first); the old client, which reads the ladder and the marks, never
    // offers it, so it can only push its old life, which the server answers as behind.
    const oldLife = validate(old, later);
    expect(progressOf(kept)).toBeGreaterThan(progressOf(oldLife));
    expect(layersOpened(kept) + kept.tribulation).toBeLessThan(layersOpened(oldLife) + oldLife.tribulation);
  });
});
