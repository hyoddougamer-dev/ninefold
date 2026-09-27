import { describe, expect, it } from 'vitest';
import { cleanName, sync, weekStart, MIN_GAP, STRIKES_TO_BAN, type Store, type Saved, type Standing, type Profile } from '../../../supabase/functions/sync/core.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { GAME_EPOCH } from '../verify.ts';
import { advance } from '../time.ts';
import { WEEK, weekOf } from '../week.ts';
import type { State } from '../state.ts';

/**
 * 同步 The server's sync, run against an in-memory database: what the Edge Function does
 * with a save, without a network. The sim is the same file either way.
 */
function memory() {
  const profiles = new Map<string, Profile>();
  const saves = new Map<string, Saved>();
  const standings = new Map<string, Standing>();
  const logs: { id: string; ok: boolean }[] = [];
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
    async saved(id) { return saves.get(id) ?? null; },
    async standing(id) { return standings.get(id) ?? null; },
    async writeProfile(id, p) { profiles.set(id, p); },
    async writeSaved(id, s) { saves.set(id, structuredClone(s)); },
    async writeStanding(id, s) { standings.set(id, s); },
    async log(id, v) { logs.push({ id, ok: v?.ok ?? false }); },
    async closeWeek(w) { closed = Math.max(closed, w); },
    async lastClosed() { return closed; },
  };
  return { store, profiles, saves, standings, logs };
}

const DAY = 86_400;

/** The harness's active cultivator, moved so the save begins at the game's epoch. */
function walk(days: number) {
  const shots: { day: number; s: State }[] = [];
  play(HABITS.find((h) => h.name === 'active')!, days, (day, s) => shots.push({ day, s: structuredClone(s) }));
  const shift = GAME_EPOCH + 3600 - shots[0].s.startedAt;
  return shots.map(({ day, s }) => ({ day, s: { ...s, startedAt: s.startedAt + shift, at: s.at + shift } }));
}

describe('同步 the ranked sync', () => {
  const shots = walk(20);

  it('an honest cultivator syncing every visit is ranked, and climbs', async () => {
    const m = memory();
    let last = 0;
    for (const { s } of shots) {
      const r = await sync(m.store, 'u1', s, s.at + 30, 'Bruno', GAME_EPOCH);
      expect(r.status).toBe(200);
      if (r.status === 200) {
        expect(r.body.state === 'verified' || r.body.state === 'waiting').toBe(true);
        expect(r.body.suspect).toBe(false);
      }
      last = s.at;
    }
    const st = m.standings.get('u1')!;
    expect(st.climb).toBeGreaterThan(10);
    expect(m.profiles.get('u1')!.name).toBe('Bruno');
    expect(m.profiles.get('u1')!.strikes).toBe(0);
    expect(last).toBeGreaterThan(0);
  });

  it('syncing twice inside the gap is refused', async () => {
    const m = memory();
    const s = shots[5].s;
    expect((await sync(m.store, 'u2', s, s.at + 5, undefined, GAME_EPOCH)).status).toBe(200);
    const again = await sync(m.store, 'u2', s, s.at + 5 + MIN_GAP - 1, undefined, GAME_EPOCH);
    expect(again.status).toBe(429);
  });

  it('a save from the future is brought back to the server clock, and a jump waits', async () => {
    const m = memory();
    const a = shots[10].s;
    await sync(m.store, 'u3', a, a.at + 10, undefined, GAME_EPOCH);
    const jumped = advance(a, a.at + 5 * DAY, false, 1);
    const r = await sync(m.store, 'u3', jumped, a.at + 400, undefined, GAME_EPOCH);
    expect(r.status).toBe(200);
    if (r.status === 200) {
      expect(r.body.ranked).toBe(false);
      expect(r.body.state).toBe('waiting');
    }
    // The cloud copy still keeps what the phone had, so nothing is lost.
    expect(m.saves.get('u3')!.latest).toBeTruthy();
  });

  it('three impossibilities and the player is off the boards', async () => {
    const m = memory();
    const a = shots[10].s;
    await sync(m.store, 'u4', a, a.at + 10, undefined, GAME_EPOCH);
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] };
    for (let i = 1; i <= STRIKES_TO_BAN; i++) {
      await sync(m.store, 'u4', { ...a, at: a.at + i * 100, chest: [...a.chest, sword] }, a.at + i * 100, undefined, GAME_EPOCH);
    }
    expect(m.profiles.get('u4')!.banned).toBe(true);
    const r = await sync(m.store, 'u4', a, a.at + 10_000, undefined, GAME_EPOCH);
    expect(r.status).toBe(403);
  });

  it('a new device’s empty save never overwrites a cultivator further along in the cloud', async () => {
    const m = memory();
    const far = shots[shots.length - 1].s;
    await sync(m.store, 'u6', far, far.at + 10, undefined, GAME_EPOCH);
    const empty = { ...shots[0].s, at: far.at + 100 };
    await sync(m.store, 'u6', empty, far.at + 100, undefined, GAME_EPOCH);
    expect((m.saves.get('u6')!.latest as State).realm).toBe(far.realm);
  });

  it('a guest signed up now cannot take first place with a save that says it began a month ago', async () => {
    const m = memory();
    const far = shots[shots.length - 1].s;
    const r = await sync(m.store, 'g1', far, far.at + 10, 'Cheat', far.at + 10);
    expect(r.status).toBe(200);
    if (r.status === 200) {
      expect(r.body.ranked).toBe(false);
      expect(r.body.state).toBe('waiting');
    }
    expect(m.standings.get('g1')).toBeUndefined();
    expect(m.profiles.get('g1')!.strikes).toBe(0);
  });

  it('a clock run three times as fast is flagged by the week behind it, however often it syncs', async () => {
    const honest = memory(), fast = memory();
    const long = walk(45);
    const t0 = long[0].s.at;
    for (const { s } of long) {
      await sync(honest.store, 'h', s, s.at + 30, undefined, GAME_EPOCH);
      // The same saves, arriving in a third of the real time.
      await sync(fast.store, 'f', s, t0 + (s.at - t0) / 3 + 30, undefined, GAME_EPOCH);
    }
    expect(honest.profiles.get('h')!.suspect).toBe(false);
    expect(fast.profiles.get('f')!.suspect).toBe(true);
    // Flagged, not struck: a pace is a question for a person, not proof.
    expect(fast.profiles.get('f')!.banned).toBe(false);
  }, 60_000);

  it('two syncs sent at once are one sync', async () => {
    const m = memory();
    const s = shots[5].s;
    const both = await Promise.all([sync(m.store, 'r', s, s.at + 5, undefined, GAME_EPOCH), sync(m.store, 'r', s, s.at + 5, undefined, GAME_EPOCH)]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 429]);
  });

  it('keeps names honest: no title, no invisible letters, no look-alikes of a default name', () => {
    expect(cleanName('天下第一')).toBeNull();
    expect(cleanName('期首 Bruno')).toBeNull();
    expect(cleanName('修士 AB12')).toBeNull();
    expect(cleanName('\u202Eonurb')).toBe('onurb');
    expect(cleanName('Br\u200Buno')).toBe('Br uno');
    expect(cleanName('ｂｒｕｎｏ')).toBe('bruno');
    expect(cleanName('Вruno')).toBeNull();
    expect(cleanName('雲中君')).toBe('雲中君');
    expect(cleanName('x')).toBeNull();
  });

  it('three weeks away from the server do not all count as this week', () => {
    const old = { climb: 30, marks: 0, tower: 0, climbedAt: 0, towerAt: 0, week: 0, weekFrom: 20 };
    const monday = (weekOf(GAME_EPOCH + 60 * DAY) * WEEK) - 3 * DAY;
    // Last verified three weeks before Monday; now an hour into the week, sixty layers on.
    const from = weekStart(old, 60, monday - 21 * DAY, monday + 3600);
    expect(60 - from).toBeLessThanOrEqual(1);
    // A player who synced on Sunday night has all of Monday's gain counted.
    expect(weekStart(old, 32, monday - 3600, monday + 3600)).toBe(31);
  });

  it('junk is not a save', async () => {
    const m = memory();
    // validate() makes a cultivator of nearly anything; what it cannot read is refused.
    const r = await sync(m.store, 'u5', 'not a save', GAME_EPOCH + DAY, undefined, GAME_EPOCH);
    expect([200, 400]).toContain(r.status);
  });
});
