import { beforeEach, describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { arrivalOf, playEndgame } from '../../../tools/endgame.ts';
import {
  ECHO_CEILING, ECHO_LIFE_MAX, ECHO_STEP, LAYERS, LIVES_MAX, REBIRTH_MARKS,
} from '../balance.ts';
import { MARKS_LIMIT, echoFactor, echoOf, lifeEcho, livesExtend, progressOf, validLives, type Life } from '../echo.ts';
import {
  bornFrom, canReincarnate, echoAfter, lifeOf, lifeStart, lifeTitle, reincarnate,
} from '../rebirth.ts';
import { gathering, layersOpened, newState, rate, validate, type State } from '../state.ts';
import { advance } from '../time.ts';
import { importSave, keepSpare, load, rearm, save, untouched, exportSave } from '../save.ts';
import { GAME_EPOCH, verify } from '../verify.ts';
import { sync, type Profile, type Saved, type Standing, type Store } from '../../../supabase/functions/sync/core.ts';

/**
 * 轉世 Rebirth, held to what it promises.
 *
 *   - the Echo grows with how far a life went, slower each step, and never past the ceiling;
 *   - a new life is a clean one, and only what is meant to carry carries;
 *   - the record is input, capped like every other field of a save;
 *   - a reborn cultivator is never held against by the server, and a forged record buys
 *     at most the ceiling and waits for the time it claims.
 */
const T0 = 1_700_000_000;
const DAY = 86_400;

/** A summit cultivator, by hand: the ninth realm's last rung, `marks` crossed. */
const summit = (marks: number, at = T0 + 90 * DAY): State => ({
  ...newState(T0), at, realm: 9, layer: 8, tribulation: marks, qi: 1e9, self: 'woman',
  seen: ['whom', 'guide'],
});

describe('宿慧 the Echo', () => {
  it('is a step for every doubling of the marks a life crossed', () => {
    expect(lifeEcho(0)).toBe(0);
    expect(lifeEcho(REBIRTH_MARKS)).toBeCloseTo(ECHO_STEP);
    expect(lifeEcho(3)).toBeCloseTo(2 * ECHO_STEP);
    expect(lifeEcho(7)).toBeCloseTo(3 * ECHO_STEP);
    expect(lifeEcho(15)).toBeCloseTo(4 * ECHO_STEP);
    // Concave: every extra mark is worth less than the one before it.
    for (let m = 2; m < 40; m++) expect(lifeEcho(m) - lifeEcho(m - 1)).toBeLessThanOrEqual(lifeEcho(m - 1) - lifeEcho(Math.max(0, m - 2)) + 1e-12);
    expect(lifeEcho(MARKS_LIMIT)).toBe(ECHO_LIFE_MAX);
  });

  it('never passes the ceiling, however many lives and however deep', () => {
    const most: Life[] = Array.from({ length: LIVES_MAX }, (_, i) => ({ marks: MARKS_LIMIT, at: T0 + i }));
    expect(echoOf(most)).toBe(ECHO_CEILING);
    expect(echoFactor(most)).toBe(1 + ECHO_CEILING);
    expect(echoOf([])).toBe(0);
    expect(echoOf(undefined)).toBe(0);
  });

  it('raises what is gathered and nothing priced in the rate', () => {
    const s = { ...summit(3), lives: [{ marks: 7, at: T0 }] };
    expect(gathering(s)).toBeCloseTo(rate(s) * (1 + 3 * ECHO_STEP));
    expect(rate(s)).toBe(rate({ ...s, lives: [] }));
    // advance() is the one place it pays: a minute at the ceiling banks the Echo's share more.
    const a = advance({ ...s, layer: 8, realm: 8 }, s.at + 60);
    const b = advance({ ...s, layer: 8, realm: 8, lives: [] }, s.at + 60);
    expect((a.qi - s.qi) / (b.qi - s.qi)).toBeCloseTo(1 + 3 * ECHO_STEP, 6);
  });
});

describe('轉世 a new life', () => {
  it('opens at the summit with the first Dragon crossed, and not before', () => {
    expect(canReincarnate(summit(0))).toBe(false);
    expect(canReincarnate({ ...summit(5), layer: 7 })).toBe(false);
    expect(canReincarnate({ ...summit(5), realm: 8 })).toBe(false);
    expect(canReincarnate(summit(REBIRTH_MARKS))).toBe(true);
    expect(reincarnate(summit(0), T0 + 91 * DAY)).toEqual(summit(0));
  });

  it('begins clean, keeps who the cultivator is, and writes the life it left', () => {
    const old = { ...summit(3), killed: { rat: 50 }, levels: { technique: 60, method: 54, pills: 54, cores: 70 },
      unlocked: ['root'], awakened: ['x'], tower: 140, materials: 1e12, quarryWeek: 2900, runs: 12 };
    const now = old.at + 600;
    const s = reincarnate(old, now);
    expect(s.realm).toBe(1);
    expect(layersOpened(s)).toBe(0);
    expect(s.tribulation).toBe(0);
    expect(s.tower).toBe(0);
    expect(s.levels).toEqual({ technique: 0, method: 0, pills: 0, cores: 0 });
    expect(s.killed).toEqual({});
    expect(s.unlocked).toEqual([]);
    expect(s.awakened).toEqual([]);
    expect(s.materials).toBe(0);
    expect(s.worn).toEqual({});
    expect(s.chest).toEqual([]);
    // What carries.
    expect(s.startedAt).toBe(old.startedAt);
    expect(s.self).toBe('woman');
    expect(s.seen).toEqual(old.seen);
    expect(s.quarryWeek).toBe(2900);
    expect(s.runs).toBe(12);
    expect(s.lives).toEqual([{ marks: 3, at: now }]);
    expect(s.at).toBe(now);
    expect(lifeOf(s)).toBe(2);
    expect(lifeStart(s)).toBe(now);
    expect(lifeTitle(s)?.name).toBe('Twice-Born');
    expect(lifeTitle(old)).toBeNull();
    expect(echoAfter(old)).toBeCloseTo(2 * ECHO_STEP);
    expect(echoOf(s.lives)).toBeCloseTo(2 * ECHO_STEP);
  });

  it('is never refused as empty, and is further along than the life it left', () => {
    const old = summit(3);
    const s = reincarnate(old, old.at + 60);
    expect(untouched(s)).toBe(false);
    expect(progressOf(s)).toBeGreaterThan(progressOf(old));
    expect(importSave(exportSave(s), s.at + 60).state?.lives).toEqual(s.lives);
  });

  it('stops at the ninth life remembered', () => {
    const lives = Array.from({ length: LIVES_MAX }, (_, i) => ({ marks: 3, at: T0 + i }));
    expect(canReincarnate({ ...summit(3), lives })).toBe(false);
    expect(canReincarnate({ ...summit(3), lives: lives.slice(1) })).toBe(true);
  });
});

describe('世 the record is input', () => {
  const now = T0 + 400 * DAY;
  it('keeps at most LIVES_MAX lives, each a life that could have ended', () => {
    const raw = Array.from({ length: LIVES_MAX + 5 }, (_, i) => ({ marks: 3, at: T0 + i * DAY }));
    expect(validLives(raw, T0, now)).toHaveLength(LIVES_MAX);
    expect(validLives([{ marks: 0, at: T0 }, { marks: -4 }, { marks: 'x' }, null, 7], T0, now)).toEqual([]);
    expect(validLives([{ marks: 1e9, at: T0 + DAY }], T0, now)).toEqual([{ marks: MARKS_LIMIT, at: T0 + DAY }]);
    expect(validLives('nope', T0, now)).toEqual([]);
  });

  it('moves an instant out of place into place rather than dropping the life', () => {
    const out = validLives([{ marks: 3, at: T0 + 9 * DAY }, { marks: 5, at: T0 + 2 * DAY }, { marks: 2, at: now + 9e9 }], T0, now);
    expect(out.map((l) => l.marks)).toEqual([3, 5, 2]);
    expect(out[1].at).toBe(T0 + 9 * DAY);
    expect(out[2].at).toBe(now);
  });

  it('round-trips through validate, and a save without one reads as a first life', () => {
    const s = reincarnate(summit(7), T0 + 100 * DAY);
    const back = validate(JSON.parse(JSON.stringify(s)), s.at + 10);
    expect(back.lives).toEqual(s.lives);
    const { lives: _gone, ...old } = s;
    expect(validate(old, s.at + 10).lives).toEqual([]);
  });
});

describe('備 the spare copy never undoes a rebirth', () => {
  beforeEach(() => {
    const map = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
    };
    rearm();
  });
  it('loads the new life over a spare that is the old one', () => {
    const old = summit(3);
    keepSpare(old);
    const s = reincarnate(old, old.at + 60);
    save(s);
    expect(load(s.at + 120).state.lives).toHaveLength(1);
    expect(load(s.at + 120).state.realm).toBeLessThan(9);
  });
});

/**
 * 驗 The server, against a cultivator who really climbed, crossed three marks, was reborn
 * and climbed again: the active habit, walked.
 */
describe('驗 a reborn cultivator on the ranked server', () => {
  const h = HABITS.find((x) => x.name === 'active')!;
  const first = play(h);
  // The endgame, stamped in time: playEndgame counts days but does not move the clock.
  const e = playEndgame(3, 'pill', arrivalOf(first.state));
  const days = e.days.reduce((a, b) => a + b, 0);
  const old = validate({ ...e.end, at: first.state.at + days * DAY }, first.state.at + days * DAY);
  // The last save the server saw before the third mark: the summit with one crossed.
  const one = playEndgame(1, 'pill', arrivalOf(first.state));
  const oneAt = first.state.at + one.days[0] * DAY;
  const synced1 = validate({ ...one.end, at: oneAt }, oneAt);
  const bornAt = old.at + 300;
  const reborn = reincarnate(old, bornAt);
  const shots: { at: number; s: State }[] = [];
  play(h, 40, (_d, s) => shots.push({ at: s.at, s: structuredClone(s) }), reborn);

  it('has a life to measure', () => {
    expect(old.tribulation).toBe(3);
    expect(reborn.lives).toEqual([{ marks: 3, at: bornAt }]);
    expect(shots.length).toBeGreaterThan(200);
    expect(shots[shots.length - 1].s.realm).toBeGreaterThanOrEqual(5);
  });

  it('is never struck, never flagged, and never more than a day and a half behind', () => {
    let base = { at: old.at, s: old };
    let lag = 0;
    let accepted = 0;
    const held: string[] = [];
    for (const shot of shots) {
      const s = validate(shot.s, shot.at);
      const v = verify(base.s, s, shot.at - base.at);
      if (v.strike || v.suspect) held.push(`${((shot.at - bornAt) / DAY).toFixed(2)}: ${v.why.join(',')} ${v.pace.toFixed(2)}`);
      if (v.ok) { base = { at: shot.at, s }; accepted++; }
      lag = Math.max(lag, (shot.at - base.at) / 3600);
    }
    expect(held.slice(0, 5)).toEqual([]);
    expect(accepted).toBeGreaterThan(shots.length / 2);
    expect(lag).toBeLessThanOrEqual(36);
  });

  it('is accepted when the server last saw an earlier mark, once the time covers the marks', () => {
    const later = shots[Math.floor(shots.length / 4)];
    const v = verify(synced1, validate(later.s, later.at), later.at - oneAt);
    expect(v.why).toEqual([]);
    expect(v.strike).toBe(false);
  });

  it('a rebirth claiming marks the time could not hold waits, and is never struck', () => {
    const forged = { ...reborn, lives: [{ marks: MARKS_LIMIT, at: bornAt }] };
    const v = verify(synced1, forged, bornAt - oneAt);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
    expect(v.strike).toBe(false);
  });

  it('a first life that forges a record waits for the marks it claims', () => {
    const early = validate(first.state, first.state.at);
    const forged = { ...early, at: early.at + 3600, lives: [{ marks: 31, at: early.at + 60 }, { marks: 31, at: early.at + 120 }] };
    const v = verify(early, forged, 3600);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
  });

  it('reads at an honest pace over every day and every week of the new life', () => {
    // 疑 What the server's day and week windows read: from the old life and from every
    // visit of the new one, to the first visit a day and a week later.
    const all = [{ at: old.at, s: old }, ...shots.map((x) => ({ at: x.at, s: validate(x.s, x.at) }))];
    let windows = 0;
    let worst = 0;
    for (const span of [DAY, 7 * DAY]) {
      for (let i = 0; i < all.length; i += 3) {
        const j = all.findIndex((x) => x.at >= all[i].at + span);
        if (j < 0) break;
        const v = verify(all[i].s, all[j].s, all[j].at - all[i].at);
        expect(v.suspect, `${span / DAY}d from ${((all[i].at - bornAt) / DAY).toFixed(1)}: pace ${v.pace.toFixed(2)}`).toBe(false);
        worst = Math.max(worst, v.pace);
        windows++;
      }
    }
    console.log(`    reborn active, life 2: ${windows} day and week windows, worst pace ${worst.toFixed(2)}`);
    expect(windows).toBeGreaterThan(100);
  });

  it('two copies reborn their own way are another copy, never a strike', () => {
    const other = reincarnate({ ...old, tribulation: 4 }, bornAt + 60);
    const v = verify(reborn, other, 600);
    expect(livesExtend(reborn.lives, other.lives)).toBe(false);
    expect(v.why).toContain('went-down');
    expect(v.strike).toBe(false);
    // And the old life arriving after the new one is behind, not a cheat.
    const back = verify(reborn, { ...old, at: bornAt + 900 }, 900);
    expect(back.why).toContain('went-down');
    expect(back.strike).toBe(false);
  });

  it('a claimed Echo raises the bound by the ceiling and no more', () => {
    const s = shots[shots.length - 1].s;
    const most = { ...s, lives: Array.from({ length: LIVES_MAX }, (_, i) => ({ marks: MARKS_LIMIT, at: bornAt + i })) };
    expect(gathering(most) / gathering({ ...s, lives: [] })).toBeCloseTo(1 + ECHO_CEILING, 9);
    expect(bornFrom(s, most.lives, s.at).lives).toBe(most.lives);
    expect(layersOpened(s)).toBeLessThan(LAYERS);
  });
});

/**
 * 同步 And the sync itself, against an in-memory database: the cloud copy follows the new
 * life (or the next device would sign in to the old one), and the boards keep the best the
 * old life reached, because a standing only ever keeps the higher of what it had.
 */
describe('同步 a rebirth through the ranked sync', () => {
  function memory() {
    const profiles = new Map<string, Profile>();
    const saves = new Map<string, Saved>();
    const standings = new Map<string, Standing>();
    const claims = new Map<string, number>();
    const states: string[] = [];
    const store: Store = {
      async claim(id, now, gap) {
        const last = claims.get(id);
        if (last !== undefined && now - last < gap) return gap - (now - last);
        claims.set(id, now);
        return 0;
      },
      async mark(id, strike, suspect) {
        const p = profiles.get(id)!;
        const next = { ...p, strikes: p.strikes + (strike ? 1 : 0), suspect: p.suspect || suspect };
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
      async log(_id, v) { states.push(v?.ok ? 'ok' : (v?.why ?? []).join(',')); },
      async closeWeek() {},
      async lastClosed() { return Number.MAX_SAFE_INTEGER; },
    };
    return { store, profiles, saves, standings, states };
  }

  it('moves the cloud copy to the new life and keeps the old life on the boards', async () => {
    const h = HABITS.find((x) => x.name === 'active')!;
    const walked: State[] = [];
    const first = play(h, 400, (_d, s) => walked.push(structuredClone(s)));
    const e = playEndgame(3, 'pill', arrivalOf(first.state));
    const endAt = first.state.at + e.days.reduce((a, b) => a + b, 0) * DAY;
    const old = { ...e.end, at: endAt };
    const reborn = reincarnate(old, endAt + 300);
    const next: State[] = [];
    play(h, 20, (_d, s) => next.push(structuredClone(s)), reborn);
    // Moved so the run begins just after the game's epoch, as the server's own test does.
    const shift = GAME_EPOCH + 3600 - old.startedAt;
    const move = (s: State): State => ({ ...s, startedAt: s.startedAt + shift, at: s.at + shift,
      lives: s.lives.map((l) => ({ ...l, at: l.at + shift })) });
    const m = memory();
    const offer = async (s: State) => {
      const x = move(s);
      const r = await sync(m.store, 'u', x, x.at + 30, 'Shibaki', x.startedAt);
      expect(r.status).toBe(200);
    };
    for (let i = 0; i < walked.length; i += 6) await offer(walked[i]);
    await offer(old);
    const before = m.standings.get('u')!;
    expect(before.marks).toBe(3);
    expect(before.climb).toBe(LAYERS - 1);
    const n = m.states.length;
    for (let i = 0; i < next.length; i += 3) await offer(next[i]);
    const after = m.standings.get('u')!;
    // The boards keep the best the old life reached.
    expect(after.marks).toBe(3);
    expect(after.climb).toBe(LAYERS - 1);
    expect(after.tower).toBeGreaterThanOrEqual(before.tower);
    // The cloud copy and the verified copy are the new life.
    const far = Number.MAX_SAFE_INTEGER / 2;
    expect(validate(m.saves.get('u')!.latest, far).lives).toHaveLength(1);
    expect(validate(m.saves.get('u')!.verified, far).lives).toHaveLength(1);
    expect(m.profiles.get('u')!.strikes).toBe(0);
    expect(m.profiles.get('u')!.suspect).toBe(false);
    // And the new life was measured, not waved through: its syncs were verified.
    const reborns = m.states.slice(n);
    expect(reborns.length).toBeGreaterThan(20);
    expect(reborns.filter((x) => x === 'ok').length).toBeGreaterThan(reborns.length / 2);
  }, 60_000);
});
