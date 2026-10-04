import { describe, expect, it } from 'vitest';
import { AUTO_HABIT, HABITS, play } from '../../../tools/habits.ts';
import { playEndgame } from '../../../tools/endgame.ts';
import { rate } from '../time.ts';
import { TOWER_FORGED, anchorFloor, bodiesHeld, firstSync, towerVerdict, verify, GAME_EPOCH, PRE_JOIN_CREDIT } from '../verify.ts';
import { floorBeast, floorPower } from '../tower.ts';
import { saveSet } from '../sets.ts';
import { RUN_DAO_CEILING } from '../../data/secret.ts';
import { validate } from '../state.ts';
import { fuse } from '../chest.ts';
import { FUSE_TOP, focusAt } from '../balance.ts';
import { TEMPLATE_BY_KEY, baseValue } from '../../data/gear.ts';
import { advance } from '../time.ts';
import { UPGRADES, breakThrough, buy, canBreakThrough, canBuy, canFightWarden, capOf, newState, power, type State } from '../state.ts';
import { beatable, odds, oddsRaw, takeKill } from '../combat.ts';
import { huntable, wardenOf } from '../../data/bestiary.ts';

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

describe('自 the auto-hunter melting all day is honest too', () => {
  // 拆 Melting pays qi beside the gathering, out of its allowance. The verifier used to
  // fit it inside SLACK alone, and MELT_FILL rising on 2026-10-03 left the margin thin;
  // the allowance is in the budget now, and the hand that melts most proves it.
  it('no strike, no flag, and the ranking never more than a day and a half behind', () => {
    const shots: Shot[] = [];
    play(AUTO_HABIT, 90, (day, s) => shots.push({ day, s: structuredClone(s) }));
    expect(shots.length).toBeGreaterThan(60);
    const r = server(shots);
    console.log(`    ${AUTO_HABIT.name.padEnd(14)} ranking at most ${r.lag.toFixed(1)} h behind the phone`);
    expect(r.held.slice(0, 5)).toEqual([]);
    expect(r.lag).toBeLessThanOrEqual(36);
  }, 120_000);
});

describe('業 a ranked save from before the workshop', () => {
  it('still verifies, and the workshop it then starts is measured from zero', () => {
    // The server's last accepted copy was written before crafts existed. It is read back
    // through validate(), so it arrives with an empty workshop, and the next honest sync
    // (a day later, workshop and all) is judged against that.
    const shots = WALKED.get('crafts it all')!;
    const at = shots.findIndex((x) => x.day >= 30);
    const then = shots[at];
    const { crafts: _none, ...old } = structuredClone(then.s) as unknown as Record<string, unknown>;
    const before = validate(old, then.s.at);
    expect(Object.values(before.crafts.xp).every((x) => x === 0)).toBe(true);
    const next = shots.find((x) => x.day >= then.day + 1)!;
    const fresh = validate({ ...structuredClone(next.s), crafts: { ...next.s.crafts, xp: {}, pouch: {}, made: {} } }, next.s.at);
    const v = verify(before, fresh, (next.day - then.day) * DAY);
    expect(v.why).toEqual([]);
    expect(v.ok).toBe(true);
  });
});

describe('坐 the first sitting reaches the boards', () => {
  /** A new player, the way tools/sitting.mjs plays one: buy what is lit, fight what is winnable. */
  function sitting(minutes: number): State {
    const T = GAME_EPOCH + 10 * DAY;
    let s = newState(T);
    let t = T;
    while (t - T < minutes * 60) {
      for (const u of UPGRADES) while (canBuy(s, u) && s.levels[u] < capOf(s, u)) s = buy(s, u);
      if (canFightWarden(s) && odds(s, wardenOf(s.realm)) > 0.5) {
        s = takeKill(s, wardenOf(s.realm));
        if (canBreakThrough(s)) s = breakThrough(s);
      }
      const b = [...huntable(s.realm, s.layer)].reverse().find((x) => odds(s, x) > 0.7);
      if (b) s = takeKill(s, b);
      t += 12;
      s = advance(s, t, false, focusAt(t - T));
    }
    return s;
  }

  it('accepts an honest new player at every point of the first half hour', () => {
    // Measured 2026-09-30 on the live server: every first sync of an active first half
    // hour was refused as too fast, so nobody saw their name on a board the day they tried.
    for (const m of [2, 5, 10, 15, 20, 30]) {
      const s = sitting(m);
      const { before, seconds, first } = firstSync(s, s.at, s.startedAt + 5);
      const v = verify(before, s, seconds, first);
      expect(v.why, `${m} min`).toEqual([]);
    }
  });

  it('but a first sync a quarter of an hour in that claims the third realm still waits', () => {
    const s = { ...sitting(15), realm: 3, layer: 4 };
    const { before, seconds, first } = firstSync(s, s.at, s.startedAt + 5);
    expect(verify(before, s, seconds, first).ok).toBe(false);
  });
});

describe('可 a warden won against the odds is not a cheat', () => {
  // Measured 2026-09-30: this build reads 0 of 41 against the second realm's warden, so
  // the screen shows 2% and the server used to strike whoever won it. A loss costs
  // nothing, so pressing it until it lands is honest, and three strikes were a ban.
  const T = GAME_EPOCH + 40 * DAY;
  const edge = { ...newState(T - 30 * DAY), at: T, realm: 2, layer: 8, levels: { technique: 6, method: 12, pills: 12, cores: 12 } };

  it('reads the fight as winnable when it is, rarely', () => {
    expect(oddsRaw(edge, wardenOf(2))).toBe(0);
    expect(beatable(edge, wardenOf(2))).toBe(true);
  });

  it('accepts the crossing it won, and still refuses one this build could never win', () => {
    const crossed = { ...edge, realm: 3, layer: 0 };
    expect(verify(edge, crossed, 30 * DAY).why).not.toContain('warden');
    const bare = { ...edge, levels: { technique: 0, method: 0, pills: 0, cores: 0 } };
    const forged = { ...bare, realm: 3, layer: 0 };
    expect(beatable(bare, wardenOf(2))).toBe(false);
    const v = verify(bare, forged, 30 * DAY);
    expect(v.why).toContain('warden');
    expect(v.strike).toBe(true);
  });
});

describe('驗 the first sync is measured from when the save began', () => {
  it('an honest save a month in passes', () => {
    const shots = WALKED.get('active')!;
    const at = shots.find((x) => x.day >= 30)!;
    // The harness starts in 2023; move the whole save to begin at the epoch.
    const shift = GAME_EPOCH - at.s.startedAt;
    const s = { ...at.s, startedAt: at.s.startedAt + shift, at: at.s.at + shift };
    // An account made the day the save began: all of that month is its own.
    const { before, seconds, first } = firstSync(s, s.at, s.startedAt);
    expect(verify(before, s, seconds, first).ok).toBe(true);
  });

  it('a guest signed up a second ago cannot bring a month with them, and waits instead', () => {
    const shots = WALKED.get('active')!;
    const at = shots.find((x) => x.day >= 30)!;
    const shift = GAME_EPOCH - at.s.startedAt;
    const s = { ...at.s, startedAt: at.s.startedAt + shift, at: at.s.at + shift };
    const { before, seconds, first } = firstSync(s, s.at, s.at);
    expect(seconds).toBeLessThanOrEqual(PRE_JOIN_CREDIT);
    const v = verify(before, s, seconds, first);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
    expect(v.strike).toBe(false);
  });

  it('a save that claims to have begun before the game existed gets no more time for it', () => {
    const shots = WALKED.get('every hour')!;
    const late = shots[shots.length - 1].s;
    const now = GAME_EPOCH + 2 * DAY;
    const s = { ...late, startedAt: GAME_EPOCH - 400 * DAY, at: now };
    const { before, seconds, first } = firstSync(s, now, GAME_EPOCH);
    expect(seconds).toBe(now - GAME_EPOCH);
    expect(verify(before, s, seconds, first).ok).toBe(false);
  });
});

describe('盾 what 驗 the audit found, closed', () => {
  // A summit save with real marks on it, from the endgame harness.
  const top = playEndgame(3).end;

  it('three hundred thunder marks forged onto a summit save are not thirty seconds of work', () => {
    const forged = { ...top, tribulation: top.tribulation + 300, at: top.at + 30 };
    expect(verify(top, forged, 30).ok).toBe(false);
    // And five more is not somehow harder than three hundred: time is time.
    const five = verify(top, { ...top, tribulation: top.tribulation + 5, at: top.at + 30 }, 30);
    expect(five.ok).toBe(false);
  });

  it('the Dragon\'s anchor cannot be edited down to make crossings easy', () => {
    const eased = { ...top, tribulationAt: 0, at: top.at + 600 };
    const v = verify(top, validate(eased, eased.at), 600);
    expect(v.ok).toBe(false);
    expect(v.strike).toBe(true);
  });

  it('a mark cannot be taken with the Dragon\'s anchor left where it was', () => {
    // Honest: every crossing played, through four heavens opening, clears the floor.
    let prev = playEndgame(1).end;
    for (let n = 2; n <= 12; n++) {
      const next = playEndgame(n).end;
      expect(next.tribulationAt).toBeGreaterThanOrEqual(anchorFloor(prev, next.tribulation) * 0.999);
      prev = next;
    }
    // Forged: one more mark, the anchor untouched, and all the time in the world.
    const later = top.at + 30 * 86_400;
    const static_ = { ...top, tribulation: top.tribulation + 1, at: later };
    const v = verify(top, validate(static_, later), later - top.at);
    expect(v.why).toContain('anchor');
    expect(v.strike).toBe(true);
  });

  it('道 from the road and the vault is bounded by the meetings answered and the doors opened', () => {
    const later = top.at + 3600;
    const forged = { ...top, metPoints: top.metPoints + 500, at: later };
    const v = verify(top, validate(forged, later), 3600);
    expect(v.ok).toBe(false);
    expect(v.why).toContain('too-fast');
    // An hour is at most three walks through the vault, which is all an hour may claim.
    const honest = { ...top, metPoints: top.metPoints + 3 * RUN_DAO_CEILING, at: later };
    expect(verify(top, validate(honest, later), 3600).ok).toBe(true);
  });

  it('a warden cannot be said to have fallen without a kill of it', () => {
    const r3 = WALKED.get('active')!.map((x) => x.s).find((x) => x.realm === 3 && !x.wardenFell && !(x.killed.crane > 0))!;
    expect(validate({ ...r3, wardenFell: true }, r3.at).wardenFell).toBe(false);
  });

  it('pills before the furnace exist are not kept', () => {
    const early = WALKED.get('active')!.map((x) => x.s).find((x) => x.realm === 5)!;
    const v = validate({ ...early, brewed: { body: 3000, bane: 3000, fortune: 3000 } }, early.at);
    expect(v.brewed).toEqual({ body: 0, bane: 0, fortune: 0 });
  });

  it('a warden of a realm not reached is not a kill, so it hands over no art and no 道', () => {
    const early = WALKED.get('active')!.map((x) => x.s).find((x) => x.realm === 3)!;
    const v = validate({ ...early, tower: 0, killed: { ...early.killed, dragon: 1, jiao: 1, direwolf: 1 } }, early.at);
    expect(v.killed.dragon).toBeUndefined();
    expect(v.killed.jiao).toBeUndefined();
    // The tower's floors are fights with the beasts of their realms, so a claimed floor
    // keeps its kills; the claim itself is what verify() holds to the build.
    expect(validate({ ...early, tower: 40, killed: { jiao: 1 } }, early.at).killed.jiao).toBeUndefined();
    expect(validate({ ...early, tower: 60, killed: { direwolf: 1 } }, early.at).killed.direwolf).toBe(1);
  });

  it('a line is capped at what its own rank and realm could make', () => {
    const early = WALKED.get('active')!.map((x) => x.s).find((x) => x.realm === 1)!;
    const forged = { ...early, chest: [{ id: 'f', template: 'sword1', rarity: 'heaven', rolls: [
      { affix: 'power', value: 120 }, { affix: 'rate', value: 120 }] }] };
    const it = validate(forged, early.at).chest[0];
    const tpl = TEMPLATE_BY_KEY.sword1;
    expect(it.rolls[0].value).toBeLessThanOrEqual(baseValue(tpl, 'heaven', 'power') * FUSE_TOP * 1.001);
    expect(it.rolls[1].value).toBeLessThanOrEqual(baseValue(tpl, 'heaven', 'rate') * 0.6 * FUSE_TOP * 1.001);
  });

  it('a fusion never compounds past its ceiling, however good the hands', () => {
    const three = [0, 1, 2].map((i) => ({ id: `c${i}`, template: 'sword5', rarity: 'common' as const,
      rolls: [{ affix: 'power' as const, value: baseValue(TEMPLATE_BY_KEY.sword5, 'common', 'power') * 1.15 }] }));
    const made = fuse(three, 'sword5', 'common', 3).made!;
    expect(made.rolls[0].value).toBeLessThanOrEqual(baseValue(TEMPLATE_BY_KEY.sword5, 'spirit', 'power') * FUSE_TOP * 1.001);
  });

  it('another run of the game (a second phone, a wiped save) is never a strike', () => {
    const shots = WALKED.get('active')!;
    const a = shots.find((x) => x.day >= 20)!.s;
    const other = { ...shots[3].s, startedAt: a.startedAt + 999, at: a.at + 600 };
    const v = verify(a, other, 600);
    expect(v.ok).toBe(false);
    expect(v.strike).toBe(false);
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
    // A month of this cultivator's own gathering, claimed in six hours. It was "fifty
    // times the qi plus a billion", which stopped being a lie the day the fixture landed
    // on a save that had just spent its qi on a breakthrough.
    const v = verify(a, { ...later, qi: later.qi * 50 + rate(later) * 30 * DAY }, honestGap);
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
    const { before, seconds, first } = firstSync(s, s.at + 60);
    expect(verify(before, advance(s, s.at + 60), seconds, first).ok).toBe(true);
  });
});

/**
 * 套 A climber who changes clothes after climbing.
 *
 * The server used to read a new floor against what was worn at the sync, so a cultivator
 * who climbed and then put on a loadout that does not fight (or took everything off) was
 * struck for a floor honestly taken. It now reads the strongest body the save holds.
 */
describe('套 a floor is read against the strongest body the save holds', () => {
  const shots = WALKED.get('active')!;
  /** Everything worn taken off into the chest: the body that cannot fight. */
  const strip = (s: State): State => {
    const pieces = Object.values(s.worn).filter((x) => x !== undefined);
    return { ...s, worn: {}, chest: [...s.chest, ...pieces] };
  };
  /** Consecutive syncs where floors were climbed inside one realm, by a body that mattered. */
  const pairs = shots.slice(1).map((next, i) => ({ base: shots[i].s, next: next.s }))
    .filter(({ base, next }) => next.tower > base.tower && next.realm === base.realm
      && Object.keys(next.worn).length >= 4 && verify(base, next, next.at - base.at).ok)
    .filter(({ next }) => !beatable(strip(next), floorBeast(next.tower), floorPower(next.tower)));

  it('finds honest climbs that the bare body could not have won, so it measures something', () => {
    console.log(`    ${pairs.length} syncs where the active cultivator climbed a floor its bare body loses`);
    expect(pairs.length).toBeGreaterThanOrEqual(10);
  });

  it('never strikes an honest climber who put another loadout on after climbing', () => {
    for (const { base, next } of pairs) {
      const gap = next.at - base.at;
      // The body it climbed in, saved as a loadout, and then taken off.
      const saved = strip(saveSet(next, 0, 'Climb'));
      const v = verify(base, saved, gap);
      expect(v.strike, `floor ${next.tower}: ${v.why.join(',')}`).toBe(false);
      expect(v.ok, `floor ${next.tower}: ${v.why.join(',')}`).toBe(true);
      // And swapped by hand, no loadout at all: the pieces sit loose in the chest.
      const loose = verify(base, strip(next), gap);
      expect(loose.strike, `floor ${next.tower} by hand: ${loose.why.join(',')}`).toBe(false);
    }
  });

  it('reads every body the save holds, and the strongest of them wins the floor', () => {
    const { next } = pairs[0];
    const saved = strip(saveSet(next, 0, 'Climb'));
    expect(towerVerdict(saved, next.tower)).toBe('ok');
    expect(bodiesHeld(saved).length).toBe(3);
  });

  it('waits on a floor out of reach but not out of the question, and strikes a forged one', () => {
    const { base, next } = pairs[pairs.length - 1];
    const gap = next.at - base.at;
    const strongest = Math.max(...bodiesHeld(next).map(power));
    // The first floor none of its bodies can win: a lucky win the sampled fights missed.
    let f = next.tower + 1;
    while (bodiesHeld(next).some((b) => beatable(b, floorBeast(f), floorPower(f)))) f++;
    expect(floorPower(f) / strongest).toBeLessThan(TOWER_FORGED);
    const early = verify(base, { ...next, tower: f }, gap);
    expect(early.strike).toBe(false);
    expect(early.why).not.toContain('tower');
    // Edited: no body comes near it, worn or saved, so it is a strike.
    const forged = verify(base, { ...saveSet(next, 0, 'Climb'), tower: 500 }, gap);
    console.log(`    floor ${f} waits at x${(floorPower(f) / strongest).toFixed(2)}; floor 500 is x${(floorPower(500) / strongest).toExponential(1)} the strongest body`);
    expect(forged.strike).toBe(true);
    expect(forged.why).toContain('tower');
  });
});
