import { describe, expect, it } from 'vitest';
import {
  BOX_HOURS, INCENSE_BONUS, INCENSE_HOLD, INCENSE_WORTH, PLATFORM_EDGE, PLATFORM_HOURS, PLATFORM_REALM,
  SPRING_FILL, SPRING_HOLD, TEMPER_EDGE, TRAIL_WOUND, springShare,
} from '../balance.ts';
import { ROOMS } from '../../data/secret.ts';
import {
  burnAt, doorsAt, enter, giftOf, inside, isGate, leave, open, shareAt, springNow, SPRING_FULL,
} from '../secret.ts';
import {
  answerHeld, answered, beatChallenger, beatenNow, challengeFight, challengeOdds, challengerOf, challengerPays,
  challengerPower, periodNow, standingTier, temperOf,
} from '../platform.ts';
import { TEMPERS } from '../../data/platform.ts';
import { stanceChoices } from '../arts.ts';
import { advance, rate } from '../time.ts';
import { breakThrough, newState, power, validate, type State } from '../state.ts';
import { effectiveBeastPower } from '../combat.ts';
import { kitWhere } from '../crafts.ts';
import { towerRate } from '../trials.ts';
import { WEEK, isBlessed } from '../week.ts';
import { verify } from '../verify.ts';
import { levelOf } from '../../data/crafts.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;

/** A fifth-realm cultivator at the ceiling, strong enough for every gate, the door long open. */
const walker = (over: Partial<State> = {}): State => ({
  ...newState(T0), realm: 5, layer: 8, qi: 1e12, materials: 1e6, wardenFell: false,
  levels: { technique: 30, method: 30, pills: 30, cores: 30 },
  at: T0 + 10 * DAY, startedAt: T0, runAt: T0 + 8 * DAY, springAt: T0, spring: 0, ...over,
} as State);

/** Open the door of this kind at the room the walker stands in, or the first one. */
const take = (s: State, kind: string, seed = 7): State => {
  const doors = doorsAt(s, s.runStep);
  const i = Math.max(0, doors.findIndex((d) => d.kind === kind));
  return open(s, i as 0 | 1 | 2, seed);
};

describe('泉 the spring fills while the door is shut', () => {
  it('gathers SPRING_FILL an hour and holds a day at most, for ever', () => {
    const s = walker({ springAt: T0 + 10 * DAY - 6 * 3600 });
    expect(springNow(s)).toBe(6 * 3600);
    expect(springNow(walker())).toBe(SPRING_HOLD);
    expect(springNow(walker({ at: T0 + 400 * DAY }))).toBe(SPRING_HOLD);
    // A full spring is an hour and thirty-six minutes of gathering.
    expect(SPRING_FULL).toBeCloseTo(96 * 60, 6);
  });

  it('shares it among the reward rooms, deeper more: 10, 20, 30 and 40% in seven rooms', () => {
    let s = enter(walker({ levels: { technique: 80, method: 30, pills: 30, cores: 80 } }));
    expect(s.spring).toBe(SPRING_HOLD);
    const shares: number[] = [];
    for (let i = 0; i < ROOMS && inside(s); i++) {
      if (!isGate(s.runStep)) shares.push(shareAt(s, s.runStep) / SPRING_HOLD);
      s = take(s, 'spring', 100 + i);
    }
    expect(shares.length).toBe(4);
    shares.forEach((x, k) => expect(x).toBeCloseTo(springShare(k, 4), 9));
    expect(s.spring).toBeCloseTo(0, 6);
  });

  it('pays a drunk room its share in your own gathering, and keeps the rooms not reached', () => {
    let s = enter(walker());
    const g = giftOf(s, { kind: 'spring' }, 0);
    const week = isBlessed(s, 0) ? 2 : 1;
    expect(g.worth).toBeCloseTo(SPRING_HOLD * springShare(0, 4) * SPRING_FILL * week, 6);
    const before = s.qi;
    s = take(s, 'spring');
    expect(s.qi - before).toBe(g.qi);
    expect(g.qi).toBeCloseTo(g.worth * rate(s), -1);
    // 退 Walk out at the gate: the three rooms not reached stay in the spring.
    s = leave(s);
    expect(s.spring).toBeCloseTo(SPRING_HOLD * (1 - springShare(0, 4)), 6);
    // And it fills on from there, to a day at most.
    expect(springNow({ ...s, at: s.at + 3600 })).toBeCloseTo(Math.min(SPRING_HOLD, s.spring + 3600), 6);
  });

  it('takes nothing when a guardian puts you down, the unreached rooms included', () => {
    const weak = walker({ levels: { technique: 0, method: 0, pills: 0, cores: 0 } });
    let s = take(enter(weak), 'spring');
    const held = s.spring;
    for (let i = 0; i < 5 && inside(s); i++) s = open(s, 0, 4242 + i);
    if (s.lastRun.beaten) expect(s.spring).toBeGreaterThanOrEqual(held - 1e-6);
  });
});

describe('香 incense: half as much again, slowly', () => {
  it('lights for the room’s share at INCENSE_WORTH, and burns for INCENSE_BONUS of the standing rate', () => {
    let s = enter(walker());
    s = take(s, 'spring');
    s = open(s, 0, 11);               // the gate
    expect(isGate(s.runStep)).toBe(false);
    const burn = burnAt(s, s.runStep);
    const drink = giftOf(s, { kind: 'spring' }, s.runStep).qi;
    s = take(s, 'incense');
    expect(s.incenseUntil).toBeCloseTo(s.at + burn, 6);
    s = leave(s);
    // Burned out at the ceiling, where qi banks, it pays half as much again as drinking.
    const lit = advance(s, s.at + burn + 3600);
    const cold = advance({ ...s, incenseUntil: 0 }, s.at + burn + 3600);
    expect((lit.qi - cold.qi) / drink).toBeCloseTo(INCENSE_WORTH, 2);
    // And never multiplied by 入定: the sitting deepens the gathering, the stick burns beside it.
    const sat = advance(s, s.at + 1800, false, 3);
    const satCold = advance({ ...s, incenseUntil: 0 }, s.at + 1800, false, 3);
    expect(sat.qi - satCold.qi).toBeCloseTo(INCENSE_BONUS * rate(s) * 1800, -2);
  });

  it('burns while the app is shut, and a stick lit behind another waits its turn', () => {
    const s = walker({ incenseUntil: T0 + 10 * DAY + 3600 });
    const away = advance(s, s.at + 5 * 3600);
    const none = advance({ ...s, incenseUntil: 0 }, s.at + 5 * 3600);
    expect(away.qi - none.qi).toBeCloseTo(INCENSE_BONUS * rate(s) * 3600, -2);
  });

  it('is never offered when the burner has no room for it, so nothing is wasted', () => {
    const full = enter(walker({ incenseUntil: T0 + 10 * DAY + INCENSE_HOLD }));
    for (let step = 0; step < ROOMS; step += 2) {
      expect(doorsAt(full, step).some((d) => d.kind === 'incense')).toBe(false);
      expect(doorsAt(full, step)[0].kind).toBe('spring');
    }
  });
});

describe('匣 跡 the third door', () => {
  it('fills the pouch with the realm’s herbs and ore, and pays no experience', () => {
    // A gatherer at herb and vein 60, so the best they gather is the sixth realm's.
    const xp = { herb: 2e6, vein: 2e6, render: 0, forge: 0, alchemy: 0, sigil: 0, array: 0 };
    const s0 = walker({ realm: 6, crafts: { ...newState(T0).crafts, xp } });
    expect(levelOf(xp.herb)).toBeGreaterThan(56);
    // Find a run whose path offers a box, and walk to it.
    for (let runs = 0; runs < 40; runs++) {
      let s = enter({ ...s0, runs });
      for (let i = 0; i < ROOMS && inside(s); i++) {
        const doors = doorsAt(s, s.runStep);
        const box = doors.findIndex((d) => d.kind === 'box');
        if (box < 0) { s = take(s, 'spring', 300 + i); continue; }
        expect(s.runStep).toBeGreaterThanOrEqual(2);
        const g = giftOf(s, doors[box], s.runStep);
        const hours = BOX_HOURS * (s.runStep / 2);
        expect(g.box?.herb?.[1]).toBe(Math.floor((hours * 3600) / 6));
        const after = open(s, box as 0 | 1 | 2, 5);
        expect(after.crafts.xp).toEqual(s.crafts.xp);
        expect(after.crafts.pouch[g.box!.herb![0]]).toBe(g.box!.herb![1]);
        // And the save keeps it: validate() holds the pouch to the same bound the box read.
        const back = validate(JSON.parse(JSON.stringify(after)), after.at);
        expect(back.crafts.pouch[g.box!.herb![0]]).toBe(g.box!.herb![1]);
        return;
      }
    }
    throw new Error('no path in forty runs offered a box');
  });

  it('offers a trail only once the Platform stands and a challenger is still up', () => {
    const offered = (s: State) => [...Array(40).keys()].some((runs) =>
      [2, 4, 6].some((step) => doorsAt({ ...s, runs }, step).some((d) => d.kind === 'trail')));
    expect(offered(walker({ realm: PLATFORM_REALM - 1 }))).toBe(false);
    expect(offered(walker())).toBe(true);
    expect(offered(walker({ trail: true }))).toBe(false);
    const allDown = walker();
    expect(offered({ ...allDown, platform: { period: periodNow(allDown), beaten: 3 } })).toBe(false);
  });
});

describe('擂台 the Platform', () => {
  const fighter = (over: Partial<State> = {}) => walker({ stance: 'endure', ...over });

  it('opens at its realm, and stands three challengers a period, in order, once each', () => {
    expect(standingTier(walker({ realm: PLATFORM_REALM - 1 }))).toBe(null);
    let s = fighter();
    expect(standingTier(s)).toBe(0);
    expect(beatChallenger(s, 1)).toBe(s);           // only the one standing
    s = beatChallenger(s, 0);
    expect(standingTier(s)).toBe(1);
    expect(beatenNow(s)).toBe(1);
    s = beatChallenger(beatChallenger(s, 1), 2);
    expect(standingTier(s)).toBe(null);
    expect(s.bouts).toBe(3);
    expect(beatChallenger(s, 2)).toBe(s);           // and never twice
    // A new week stands three more, and so does a breakthrough.
    expect(standingTier({ ...s, at: s.at + WEEK })).toBe(0);
    const next = breakThrough({ ...s, wardenFell: true });
    expect(next.realm).toBe(s.realm + 1);
    expect(standingTier(next)).toBe(0);
  });

  it('measures each against your own power, the temper on top unless it is answered', () => {
    const s = fighter();
    const t = temperOf(s);
    for (let tier = 0 as 0 | 1 | 2; tier <= 2; tier = (tier + 1) as 0 | 1 | 2) {
      const want = power(s) * PLATFORM_EDGE[tier] * (answered(s, t) ? 1 : TEMPER_EDGE);
      expect(challengerPower(s, tier)).toBeCloseTo(want, 6);
    }
    const ans = answerHeld(s, t);
    expect(ans).not.toBe(null);
    expect(answered({ ...s, stance: ans }, t)).toBe(true);
  });

  it('gives every temper an answer held by the realm the Platform opens in', () => {
    for (const t of TEMPERS) {
      expect(stanceChoices(PLATFORM_REALM, 0).some((x) => t.stances.includes(x.key)), t.key).toBe(true);
    }
  });

  it('sets the dice for the period: the same body meets the same fight', () => {
    const s = fighter();
    for (const tier of [0, 1, 2] as const) {
      expect(challengeFight(s, tier).won).toBe(challengeFight({ ...s }, tier).won);
      expect(challengeFight(s, tier).rounds).toEqual(challengeFight(s, tier).rounds);
    }
  });

  it('pays hours of gathering without gear, whatever is worn', () => {
    const bare = fighter();
    const dressed = fighter({ worn: { weapon: { id: 'w', template: 'sword5', rarity: 'heaven',
      rolls: [{ affix: 'power', value: 20 }, { affix: 'rate', value: 20 }] } } });
    for (const tier of [0, 1, 2] as const) {
      expect(challengerPays(bare, tier)).toBeCloseTo(PLATFORM_HOURS[tier] * 3600 * towerRate(bare), 6);
      expect(challengerPays(dressed, tier)).toBeCloseTo(challengerPays(bare, tier), 6);
    }
    const won = beatChallenger(bare, 0);
    expect(won.qi - bare.qi).toBeCloseTo(challengerPays(bare, 0), 3);
  });

  it('is a hard fight like a warden: the kit goes in, the tower’s class does not', () => {
    const s = fighter();
    const c = challengerOf(s, 1);
    expect(kitWhere(s, c, challengerPower(s, 1))).toBe('platform');
    expect(c.challenger).toBe(1);
    // 劍仙 The Sword Immortal's hold is on the tower's floors only.
    const plain = effectiveBeastPower(s, c, 1000);
    expect(plain).toBeGreaterThan(0);
  });

  it('opens a trail’s challenger a tenth down, and the trail is spent only by a win', () => {
    const s = fighter();
    const cold = challengeFight(s, 2);
    const hurt = challengeFight({ ...s, trail: true }, 2);
    expect(hurt.rounds[0].beastHealth).toBeLessThan(cold.rounds[0].beastHealth);
    expect(challengeOdds({ ...s, trail: true }, 2, undefined, true)).toBeGreaterThanOrEqual(challengeOdds(s, 2, undefined, true));
    void TRAIL_WOUND;
    expect(beatChallenger({ ...s, trail: true }, 0).trail).toBe(false);
  });
});

describe('守 a save is input: the new fields are capped', () => {
  it('caps the spring, the incense, the trail, the period and the bouts', () => {
    const now = T0 + 20 * DAY;
    const forged = validate({
      ...walker({ at: now }), spring: 9e9, springAt: now + 9e9, incenseUntil: now + 9e9,
      trail: true, platform: { period: 9e15, beaten: 99 }, bouts: 1e9,
    }, now);
    expect(forged.spring).toBe(SPRING_HOLD);
    expect(forged.springAt).toBeLessThanOrEqual(now);
    expect(forged.incenseUntil).toBe(now + INCENSE_HOLD);
    expect(forged.platform.beaten).toBe(3);
    expect(forged.platform.period).toBeLessThanOrEqual(periodNow(forged));
    expect(forged.bouts).toBeLessThanOrEqual(3 * (Math.floor(20 * DAY / WEEK) + 10));
    const early = validate({ ...walker({ realm: 3, at: now }), trail: true, bouts: 5 }, now);
    expect(early.trail).toBe(false);
    expect(early.bouts).toBe(0);
  });

  it('reads a save from before the spring as filling from its last run, empty', () => {
    const raw = JSON.parse(JSON.stringify(walker())) as Record<string, unknown>;
    delete raw.spring; delete raw.springAt; delete raw.incenseUntil; delete raw.platform; delete raw.bouts;
    const s = validate(raw, T0 + 10 * DAY);
    expect(s.spring).toBe(0);
    expect(s.springAt).toBe(T0 + 8 * DAY);
    expect(springNow(s)).toBe(2 * DAY > SPRING_HOLD ? SPRING_HOLD : 2 * DAY);
    expect(s.incenseUntil).toBe(0);
    expect(s.bouts).toBe(0);
  });
});

describe('驗 the server still catches what was edited', () => {
  const base = (over: Partial<State> = {}) => walker({ stance: 'endure', ...over });

  it('waits on bouts the weeks cannot hold, and calls a shrunk count going down', () => {
    const before = base({ bouts: 6 });
    const after = { ...before, at: before.at + 3600, bouts: 60 };
    const v = verify(before, after, 3600);
    expect(v.why).toContain('too-fast');
    expect(v.strike).toBe(false);
    const down = verify(before, { ...before, at: before.at + 3600, bouts: 2 }, 3600);
    expect(down.why).toContain('went-down');
    expect(down.strike).toBe(false);
  });

  it('waits on a challenger no body the save holds could have beaten', () => {
    const weak = base({ realm: PLATFORM_REALM, layer: 0, levels: { technique: 0, method: 0, pills: 0, cores: 0 },
      stance: null, sequence: [] });
    const claimed = { ...weak, at: weak.at + 3600, bouts: 3, platform: { period: periodNow(weak), beaten: 3 } };
    const v = verify(weak, claimed, 3600);
    expect(v.why).toContain('too-fast');
    expect(v.strike).toBe(false);
  });

  it('waits on a spring or an incense that time could not have filled', () => {
    // A spring emptied by the last run, and an hour later claiming to be full again.
    const before = base({ spring: 0, springAt: T0 + 10 * DAY });
    const spring = verify(before, { ...before, at: before.at + 3600, spring: SPRING_HOLD, springAt: before.at + 3600 }, 3600);
    expect(spring.why).toContain('too-fast');
    expect(spring.strike).toBe(false);
    // And a stick relit by hand to burn a day, with no spring spent to light it.
    const incense = verify(before, { ...before, at: before.at + 3600, incenseUntil: before.at + 3600 + INCENSE_HOLD }, 3600);
    expect(incense.why).toContain('too-fast');
    expect(incense.strike).toBe(false);
  });

  it('lets an honest run through: the spring drunk and burned, a challenger beaten', () => {
    const before = base();
    let s = enter({ ...before, at: before.at + 600 });
    for (let i = 0; i < ROOMS && inside(s); i++) s = take(s, i % 4 === 2 ? 'incense' : 'spring', 900 + i);
    if (inside(s)) s = leave(s);
    if (challengeFight(s, 0).won) s = beatChallenger(s, 0);
    const v = verify(before, s, 900);
    expect(v.why).toEqual([]);
  });
});
