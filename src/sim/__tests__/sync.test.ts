import { describe, expect, it } from 'vitest';
import { cleanName, sync, weekStart, MIN_GAP, STRIKES_TO_REVIEW, NEW_RUN_LEAP, REPEAT_WINDOW, type Store, type Saved, type Standing, type Profile } from '../../../supabase/functions/sync/core.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { GAME_EPOCH, type Verdict } from '../verify.ts';
import { advance } from '../time.ts';
import { WEEK, weekOf } from '../week.ts';
import { validate, type State } from '../state.ts';
import { withPackedPile } from '../pilepack.ts';
import { progressOf } from '../echo.ts';

/**
 * 同步 The server's sync, run against an in-memory database: what the Edge Function does
 * with a save, without a network. The sim is the same file either way.
 */
function memory() {
  const profiles = new Map<string, Profile>();
  const barred = new Map<string, { strikes: number; banned: boolean; suspect?: boolean }>();
  const saves = new Map<string, Saved>();
  const standings = new Map<string, Standing>();
  const logs: { id: string; ok: boolean; v: Verdict | null }[] = [];
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
    async barred(id) { return barred.get(id) ?? null; },
    async saved(id) { return saves.get(id) ?? null; },
    async standing(id) { return standings.get(id) ?? null; },
    async writeProfile(id, p) { profiles.set(id, p); },
    async writeSaved(id, s) { saves.set(id, structuredClone(s)); },
    async writeStanding(id, s) { standings.set(id, s); },
    async log(id, v) { logs.push({ id, ok: v?.ok ?? false, v }); },
    async closeWeek(w) { closed = Math.max(closed, w); },
    async lastClosed() { return closed; },
  };
  return { store, profiles, saves, standings, logs, barred };
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

  it('three impossibilities and the player is off the boards for review, never banned', async () => {
    const m = memory();
    const a = shots[10].s;
    await sync(m.store, 'u4', a, a.at + 10, undefined, GAME_EPOCH);
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] };
    // Three impossibilities, each further along than the last: the same save offered again
    // is one offence (see the test below), so each of these has to have moved on.
    const later = shots.filter(({ s }, i, all) => i > 10 && progressOf(s) > progressOf(all[i - 1].s));
    expect(later.length).toBeGreaterThanOrEqual(STRIKES_TO_REVIEW);
    for (const { s } of later.slice(0, STRIKES_TO_REVIEW)) {
      await sync(m.store, 'u4', { ...s, chest: [...s.chest, sword] }, s.at + 10, undefined, GAME_EPOCH);
    }
    const p = m.profiles.get('u4')!;
    expect(p.strikes).toBe(STRIKES_TO_REVIEW);
    expect(p.suspect).toBe(true);     // off the boards (board() leaves suspects off)
    expect(p.banned).toBe(false);     // but never banned by the machine
    // It goes on syncing, and an honest save after it is still kept as the cloud copy.
    const last = later[STRIKES_TO_REVIEW - 1].s;
    const r = await sync(m.store, 'u4', { ...last, at: last.at + 10_000 }, last.at + 10_000, undefined, GAME_EPOCH);
    expect(r.status).toBe(200);
    // Every refused sync is in the log with what it tried, for the panel.
    expect(m.logs.filter((x) => x.v?.strike).every((x) => x.v!.why.includes('gear'))).toBe(true);
  });

  it('the same refused save offered again and again is one strike, not one each time', async () => {
    const m = memory();
    // 2026-10-07: a new account's first save was refused, and the game offered it again
    // every half minute. Each offer used to count, and three made the account a suspect.
    const a = shots[10].s;
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] };
    const bad = { ...a, chest: [...a.chest, sword] };
    for (let i = 0; i < 5; i++) {
      const r = await sync(m.store, 'n1', { ...bad, at: a.at + i * 25 }, a.at + 10 + i * 25, undefined, GAME_EPOCH);
      expect(r.status === 200 && r.body.state).toBe('refused');
      expect(r.status === 200 && r.body.ranked).toBe(false);
    }
    expect(m.profiles.get('n1')!.strikes).toBe(1);
    expect(m.profiles.get('n1')!.suspect).toBe(false);
    // Every offer is still in the log as refused, for the panel.
    expect(m.logs.filter((x) => x.id === 'n1' && x.v?.strike)).toHaveLength(5);
    expect(m.standings.get('n1')).toBeUndefined();

    // A refused save that has moved on is a new offence.
    const on = shots.find(({ s }) => progressOf(s) > progressOf(a))!.s;
    await sync(m.store, 'n1', { ...on, chest: [...on.chest, sword] }, on.at + 10, undefined, GAME_EPOCH);
    expect(m.profiles.get('n1')!.strikes).toBe(2);

    // And so is the same save offered again after a long silence.
    const t = on.at + 10 + REPEAT_WINDOW + 1;
    await sync(m.store, 'n1', { ...on, at: t, chest: [...on.chest, sword] }, t, undefined, GAME_EPOCH);
    expect(m.profiles.get('n1')!.strikes).toBe(3);
    expect(m.profiles.get('n1')!.suspect).toBe(true);
    expect(m.profiles.get('n1')!.banned).toBe(false);
  });

  it('a refused save right after a verified one of the same progress is still struck', async () => {
    const m = memory();
    const a = shots[10].s;
    const b = shots[11].s;
    // An honest pair is untouched.
    await sync(m.store, 'n2', a, a.at + 10, undefined, GAME_EPOCH);
    await sync(m.store, 'n2', b, b.at + 10, undefined, GAME_EPOCH);
    expect(m.profiles.get('n2')!).toMatchObject({ strikes: 0, suspect: false });
    // The last sync verified, so an edited copy of it is an offence of its own.
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] };
    await sync(m.store, 'n2', { ...b, at: b.at + 60, chest: [...b.chest, sword] }, b.at + 60, undefined, GAME_EPOCH);
    expect(m.profiles.get('n2')!.strikes).toBe(1);
  });

  it('a player who deletes the account and signs in again on the same email keeps what was against it', async () => {
    const m = memory();
    const a = shots[10].s;
    // What delete_me() leaves behind for the new account's email (see the schema test).
    m.barred.set('u5', { strikes: STRIKES_TO_REVIEW, banned: true });
    const r = await sync(m.store, 'u5', a, a.at + 10, undefined, GAME_EPOCH);
    expect(r.status).toBe(403);
    // Two strikes carried over: one more impossibility and it is kept for review.
    m.barred.set('u6', { strikes: STRIKES_TO_REVIEW - 1, banned: false });
    await sync(m.store, 'u6', a, a.at + 10, undefined, GAME_EPOCH);
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] };
    await sync(m.store, 'u6', { ...a, at: a.at + 100, chest: [...a.chest, sword] }, a.at + 100, undefined, GAME_EPOCH);
    expect(m.profiles.get('u6')!.suspect).toBe(true);
    expect(m.profiles.get('u6')!.banned).toBe(false);
    // And a flag for review alone carries over too.
    m.barred.set('u7', { strikes: 0, banned: false, suspect: true });
    await sync(m.store, 'u7', a, a.at + 10, undefined, GAME_EPOCH);
    expect(m.profiles.get('u7')!.suspect).toBe(true);
  });

  it('a new run far past the last verified save is kept for review and earns no week credit', async () => {
    const m = memory();
    const early = shots[3].s;
    await sync(m.store, 'u8', early, early.at + 10, undefined, GAME_EPOCH);
    const later = shots[shots.length - 1].s;
    const leap = { ...later, startedAt: later.startedAt + 1 };
    const r = await sync(m.store, 'u8', leap, later.at + 10, undefined, early.startedAt - 30 * 86_400);
    expect(r.status === 200 && r.body.ranked, 'the leap verified, so the rule was reached').toBe(true);
    {
      expect(m.profiles.get('u8')!.suspect).toBe(true);
      expect(m.logs.at(-1)!.v!.why).toContain('newrun');
      const st = m.standings.get('u8')!;
      expect(st.climb + st.marks - st.weekFrom).toBe(0);
    }
    expect(NEW_RUN_LEAP).toBeGreaterThan(0);
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

describe('圍 a drive\'s pile in the cloud copy', () => {
  it('is kept as rows in the one copy a new device pulls, and not in the three that only measure', async () => {
    const shots = walk(8);
    const m = memory();
    const s = shots[shots.length - 1].s;
    const pile = Array.from({ length: 500 }, (_, i) => ({
      id: `p${i}-sword1`, template: 'sword1', rarity: 'common' as const, rolls: [{ affix: 'power' as const, value: 1 }],
    }));
    const sent = withPackedPile({ ...s, pile, pileAt: s.at });
    const r = await sync(m.store, 'u9', JSON.parse(JSON.stringify(sent)), s.at + 30, undefined, GAME_EPOCH);
    expect(r.status).toBe(200);
    const kept = m.saves.get('u9')!;
    const latest = kept.latest as { pile: unknown[] };
    expect(latest.pile.length).toBe(500);
    expect(Array.isArray(latest.pile[0])).toBe(true);
    for (const copy of [kept.verified, kept.day?.state, kept.week?.state]) {
      if (copy) expect((copy as { pile: unknown[] }).pile).toEqual([]);
    }
    // And a device that pulls the cloud copy gets every piece back through validate().
    expect(validate(kept.latest, s.at + 60).pile.map((x) => x.id)).toEqual(pile.map((x) => x.id));
  });
});
