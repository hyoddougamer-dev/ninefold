import { describe, expect, it } from 'vitest';
import { HABITS, play } from '../../../tools/habits.ts';
import { firstSync, verify, GAME_EPOCH } from '../verify.ts';
import { advance } from '../time.ts';
import { newState, type State } from '../state.ts';

/**
 * 驗 The anti-cheat, held to both of its promises.
 *
 * It is only worth having if it never stops an honest player and always stops the ones
 * it exists for. The honest players are the harness's own cultivators, every habit from
 * the one who never fights to the one who plays every waking hour, walked for months and
 * checked at every visit, every day and every week. The dishonest ones are the edits a
 * player can actually make: the clock, the qi, the levels, the kills, the realm, the
 * tower, the gear.
 */

const DAY = 86_400;

interface Shot { day: number; s: State }

function walk(name: string, days: number): Shot[] {
  const h = HABITS.find((x) => x.name === name)!;
  const shots: Shot[] = [];
  play(h, days, (day, s) => shots.push({ day, s: structuredClone(s) }));
  return shots;
}

const WALKED = new Map<string, Shot[]>(HABITS.map((h) => [h.name, walk(h.name, 90)]));

/**
 * 服 What the server does, played against a cultivator: every visit offers the save; the
 * server accepts it if it verifies against the last one it accepted, and otherwise keeps
 * that one and waits. Returns the worst the ranking ever lagged behind the phone, in
 * hours, and anything that would have been held against an honest player.
 */
function server(shots: Shot[]) {
  let base = shots[0];
  let lag = 0;
  let pace = 0;
  const held: string[] = [];
  for (const shot of shots.slice(1)) {
    const v = verify(base.s, shot.s, (shot.day - base.day) * DAY);
    if (v.strike) held.push(`day ${shot.day.toFixed(2)}: strike ${v.why.join(',')}`);
    if (v.suspect) held.push(`day ${shot.day.toFixed(2)}: suspect at pace ${v.pace.toFixed(2)}`);
    if (v.ok) { base = shot; pace = Math.max(pace, v.pace); }
    lag = Math.max(lag, (shot.day - base.day) * 24);
  }
  return { lag, held, last: base, pace };
}

describe('驗 honest play is never held against anybody', () => {
  for (const h of HABITS) {
    it(`${h.name}: no strike, no flag, and the ranking never more than a day and a half behind`, () => {
      const shots = WALKED.get(h.name)!;
      expect(shots.length).toBeGreaterThan(60);
      const r = server(shots);
      console.log(`    ${h.name.padEnd(14)} ranking at most ${r.lag.toFixed(1)} h behind the phone`);
      expect(r.held.slice(0, 5)).toEqual([]);
      expect(r.lag).toBeLessThanOrEqual(36);
      // And a quiet day later, everything the phone has is ranked.
      const end = shots[shots.length - 1];
      expect(verify(r.last.s, end.s, (end.day - r.last.day) * DAY + DAY).ok).toBe(true);
    });
  }
});

describe('驗 the first sync is measured from when the save began', () => {
  it('an honest save a month in passes', () => {
    const shots = WALKED.get('active')!;
    const at = shots.find((x) => x.day >= 30)!;
    // The harness starts in 2023; move the whole save to begin at the epoch.
    const shift = GAME_EPOCH - at.s.startedAt;
    const s = { ...at.s, startedAt: at.s.startedAt + shift, at: at.s.at + shift };
    const { before, seconds } = firstSync(s, s.at);
    expect(verify(before, s, seconds).ok).toBe(true);
  });

  it('a save that claims to have begun before the game existed gets no more time for it', () => {
    const shots = WALKED.get('every hour')!;
    const late = shots[shots.length - 1].s;
    const now = GAME_EPOCH + 2 * DAY;
    const s = { ...late, startedAt: GAME_EPOCH - 400 * DAY, at: now };
    const { before, seconds } = firstSync(s, now);
    expect(seconds).toBe(now - GAME_EPOCH);
    expect(verify(before, s, seconds).ok).toBe(false);
  });
});

describe('驗 every edit a player can make fails', () => {
  const shots = WALKED.get('active')!;
  const a = shots.find((x) => x.day >= 20)!.s;
  const later = shots.find((x) => x.day >= 20.25)!.s;
  const honestGap = (later.at - a.at);

  it('the honest pair it is all measured against passes', () => {
    expect(verify(a, later, honestGap).ok).toBe(true);
  });

  it('a clock moved on a week, synced five minutes later', () => {
    const jumped = advance(a, a.at + 7 * DAY, false, 1);
    const v = verify(a, jumped, 300);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
  });

  it('a clock kept a week ahead is flagged once real time lets it through', () => {
    // Every day the phone claims a week of idle gathering. The server accepts only what
    // the time allows, and a week measured that way is faster than anybody honest.
    let phone = a;
    let base = a;
    let flagged = false;
    for (let d = 1; d <= 14; d++) {
      phone = advance(phone, phone.at + 7 * DAY, false, 1);
      const v = verify(base, phone, d * DAY - (base.at - a.at) * 0);
      if (v.suspect) flagged = true;
      if (v.ok) base = phone;
    }
    expect(flagged).toBe(true);
  });

  it('qi edited', () => {
    const v = verify(a, { ...later, qi: later.qi * 50 + 1e9 }, honestGap);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
  });

  it('levels edited', () => {
    const v = verify(a, { ...later, levels: { ...later.levels, method: later.levels.method + 12, pills: later.levels.pills + 12 } }, honestGap);
    expect(v.ok).toBe(false);
  });

  it('three realms added', () => {
    const v = verify(a, { ...later, realm: Math.min(9, later.realm + 3) }, honestGap);
    expect(v.ok).toBe(false);
  });

  it('a million rats', () => {
    const v = verify(a, { ...later, killed: { ...later.killed, rat: (later.killed.rat ?? 0) + 1_000_000 } }, honestGap);
    expect(v.why).toContain('too-many-kills');
  });

  it('the tower edited to floor five hundred', () => {
    const v = verify(a, { ...later, tower: 500 }, honestGap);
    expect(v.why).toContain('tower');
  });

  it('a ninth-realm sword in a low realm', () => {
    const sword = { id: 'x', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 10 }] } as State['chest'][number];
    const v = verify(a, { ...later, chest: [...later.chest, sword] }, honestGap);
    expect(v.why).toContain('gear');
  });

  it('a restored older copy is not progress, and not a strike', () => {
    const v = verify(later, a, 600);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('went-down');
    expect(v.strike).toBe(false);
  });

  it('a brand new save verifies against itself', () => {
    const s = newState(GAME_EPOCH + DAY);
    const { before, seconds } = firstSync(s, s.at + 60);
    expect(verify(before, advance(s, s.at + 60), seconds).ok).toBe(true);
  });
});
