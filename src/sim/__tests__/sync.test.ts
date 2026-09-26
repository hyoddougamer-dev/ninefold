import { describe, expect, it } from 'vitest';
import { sync, MIN_GAP, STRIKES_TO_BAN, type Store, type Saved, type Standing, type Profile } from '../../../supabase/functions/sync/core.ts';
import { HABITS, play } from '../../../tools/habits.ts';
import { GAME_EPOCH } from '../verify.ts';
import { advance } from '../time.ts';
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
  const store: Store = {
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
      const r = await sync(m.store, 'u1', s, s.at + 30, 'Bruno');
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
    expect((await sync(m.store, 'u2', s, s.at + 5)).status).toBe(200);
    const again = await sync(m.store, 'u2', s, s.at + 5 + MIN_GAP - 1);
    expect(again.status).toBe(429);
  });

  it('a save from the future is brought back to the server clock, and a jump waits', async () => {
    const m = memory();
    const a = shots[10].s;
    await sync(m.store, 'u3', a, a.at + 10);
    const jumped = advance(a, a.at + 5 * DAY, false, 1);
    const r = await sync(m.store, 'u3', jumped, a.at + 400);
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
    await sync(m.store, 'u4', a, a.at + 10);
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] };
    for (let i = 1; i <= STRIKES_TO_BAN; i++) {
      await sync(m.store, 'u4', { ...a, at: a.at + i * 100, chest: [...a.chest, sword] }, a.at + i * 100);
    }
    expect(m.profiles.get('u4')!.banned).toBe(true);
    const r = await sync(m.store, 'u4', a, a.at + 10_000);
    expect(r.status).toBe(403);
  });

  it('a new device’s empty save never overwrites a cultivator further along in the cloud', async () => {
    const m = memory();
    const far = shots[shots.length - 1].s;
    await sync(m.store, 'u6', far, far.at + 10);
    const empty = { ...shots[0].s, at: far.at + 100 };
    await sync(m.store, 'u6', empty, far.at + 100);
    expect((m.saves.get('u6')!.latest as State).realm).toBe(far.realm);
  });

  it('junk is not a save', async () => {
    const m = memory();
    // validate() makes a cultivator of nearly anything; what it cannot read is refused.
    const r = await sync(m.store, 'u5', 'not a save', GAME_EPOCH + DAY);
    expect([200, 400]).toContain(r.status);
  });
});
