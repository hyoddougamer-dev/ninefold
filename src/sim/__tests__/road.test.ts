import { describe, expect, it } from 'vitest';
import { MEETINGS, heartOf, meetingOf } from '../../data/meetings.ts';
import { answer, boons, heart, meetingDue, pathOf, stillToCome, MEET_GAP } from '../meet.ts';
import { newState, power, validate, type State } from '../state.ts';
import { effectiveBeastPower, oddsRaw } from '../combat.ts';
import { driveCost } from '../hunt.ts';
import { fortuneOf } from '../fortune.ts';
import { verify } from '../verify.ts';
import { BEASTS, wardenOf } from '../../data/bestiary.ts';
import {
  BOON_BLOOD, BOON_FAMILIAR, BOON_SWORDSOUL, BOON_TOKEN, HEART_PATH,
} from '../balance.ts';

/**
 * 緣起 The road remembers: people come back to what you did, the heart leans with every
 * answer, and five meetings leave something that stays.
 */
const T0 = 1_700_000_000;

/** A cultivator at the top with every realm's road open and plenty to pay with. */
function traveller(marks = 30): State {
  return { ...newState(T0), realm: 9, layer: 8, tribulation: marks, qi: 1e40, materials: 1e30, at: T0 + 10 * 86_400 };
}

/** Walk the road to its end, answering each meeting the way `choose` says. */
function walk(choose: (s: State, key: string) => 0 | 1, from = traveller()): State {
  let s = from;
  for (let i = 0; i < MEETINGS.length + 5; i++) {
    s = { ...s, at: s.at + MEET_GAP };
    const m = meetingDue(s);
    if (!m) break;
    s = answer(s, m.key, choose(s, m.key), i + 1);
  }
  return s;
}

const lean = (want: 1 | -1) => (_: State, key: string): 0 | 1 => {
  const m = meetingOf(key)!;
  return m.picks[1].heart === want ? 1 : m.picks[0].heart === want ? 0 : 0;
};

describe('緣起 the road remembers', () => {
  it('every meeting on the road can be met by somebody', () => {
    const walks = [lean(1), lean(-1), () => 0 as const, () => 1 as const].map((f) => walk(f));
    const met = new Set(walks.flatMap((s) => s.met));
    const missing = MEETINGS.map((m) => m.key).filter((k) => !met.has(k));
    console.log(`\n  緣 ${MEETINGS.length} meetings; kind walk met ${walks[0].met.length} (heart ${heart(walks[0])}),`
      + ` hard walk met ${walks[1].met.length} (heart ${heart(walks[1])})\n`);
    expect(missing).toEqual([]);
    // 心 And the two paths are different roads: the kind never meet the demonic
    // cultivator, the hard never meet the monk.
    expect(walks[0].met).toContain('monk');
    expect(walks[0].met).not.toContain('demon');
    expect(walks[1].met).toContain('demon');
    expect(walks[1].met).not.toContain('monk');
    expect(pathOf(walks[0])).toBe('kind');
    expect(pathOf(walks[1])).toBe('hard');
  });

  it('somebody coming back remembers which answer you gave', () => {
    const at5 = { ...traveller(0), realm: 5 };
    const gave = answer({ ...at5, at: at5.at + MEET_GAP }, 'beggar', 0, 1);
    const swept = answer({ ...at5, at: at5.at + MEET_GAP }, 'beggar', 1, 1);
    const on = (s: State) => ({ ...s, realm: 6, at: s.at + MEET_GAP });
    // Returns come first, so the next person on a realm-six road is the one who remembers.
    expect(meetingDue(on(gave))?.key).toBe('disciple');
    expect(meetingDue(on(swept))?.key).toBe('keeper');
    expect(stillToCome(gave)).toBe(1);
    // And a return cannot be answered by somebody who never met the first meeting.
    const stranger = on(at5);
    expect(answer(stranger, 'disciple', 0, 1)).toBe(stranger);
  });

  it('the heart is added up from the answers, and a path needs a habit', () => {
    let s = { ...traveller(0), realm: 5 };
    for (const k of ['brokensword', 'beggar']) s = answer({ ...s, at: s.at + MEET_GAP }, k, k === 'beggar' ? 0 : 1, 1);
    expect(heart(s)).toBe(2);
    expect(pathOf(s)).toBe('even');
    s = answer({ ...s, at: s.at + MEET_GAP }, 'stele', 0, 1);
    expect(heart(s)).toBe(HEART_PATH);
    expect(pathOf(s)).toBe('kind');
    expect(heartOf(s.met, s.chose)).toBe(heart(s));
  });

  it('each thing that stays does what it says, and only that', () => {
    const base = traveller();
    const given = (key: string, which: 0 | 1, after?: [string, 0 | 1]) => {
      let s = base;
      if (after) s = answer({ ...s, at: s.at + MEET_GAP }, after[0], after[1], 1);
      return answer({ ...s, at: s.at + MEET_GAP }, key, which, 2);
    };
    const crows = given('crows', 0, ['crow', 0]);
    expect(boons(crows).has('familiar')).toBe(true);
    expect((fortuneOf(crows).chance ?? 0) - (fortuneOf(base).chance ?? 0)).toBeCloseTo(BOON_FAMILIAR, 9);

    const soul = given('swordsoul', 0, ['brokensword', 1]);
    expect(power(soul) / power(base)).toBeCloseTo(BOON_SWORDSOUL, 9);

    const token = given('tradesman', 0, ['merchant', 0]);
    expect(driveCost(token, 1000) / driveCost(base, 1000)).toBeCloseTo(BOON_TOKEN, 2);

    // 血 The blood method thins a beast, and never the Dragon above the ninth realm.
    let hard: State = { ...base, chose: {}, met: [] };
    for (const k of ['brokensword', 'beggar', 'drunk', 'stele']) {
      hard = answer({ ...hard, at: hard.at + MEET_GAP }, k, meetingOf(k)!.picks[1].heart === -1 ? 1 : 0, 3);
    }
    const blood = answer({ ...hard, at: hard.at + MEET_GAP }, 'demon', 0, 4);
    expect(boons(blood).has('blood')).toBe(true);
    const rat = BEASTS.find((b) => b.key === 'rat')!;
    expect(effectiveBeastPower(blood, rat) / effectiveBeastPower(hard, rat)).toBeCloseTo(BOON_BLOOD, 9);
    const dragon = wardenOf(9);
    expect(effectiveBeastPower(blood, dragon)).toBe(effectiveBeastPower(hard, dragon));

    // 蓮 The lotus mends, which shows as better odds against the same beast.
    let kind: State = { ...base, chose: {}, met: [] };
    for (const k of ['brokensword', 'beggar', 'drunk', 'stele']) {
      kind = answer({ ...kind, at: kind.at + MEET_GAP }, k, meetingOf(k)!.picks[0].heart === 1 ? 0 : 1, 3);
    }
    const lotus = answer({ ...kind, at: kind.at + MEET_GAP }, 'monk', 0, 4);
    expect(boons(lotus).has('lotus')).toBe(true);
    const even = { ...kind, qi: 0 };
    const stand = power(even) * 1.6;
    expect(oddsRaw({ ...lotus, qi: 0 }, dragon, stand)).toBeGreaterThanOrEqual(oddsRaw(even, dragon, stand));
  });

  it('a save cannot claim a return, a path or an answer it did not earn', () => {
    const s = validate({ ...traveller(), met: ['monk', 'crows'], chose: { monk: 0, crows: 0 } }, T0 + 20 * 86_400);
    expect(s.met).toEqual([]);
    expect(boons(s).size).toBe(0);
    const ok = validate({ ...traveller(), met: ['crow', 'crows'], chose: { crow: 0, crows: 0 } }, T0 + 20 * 86_400);
    expect(ok.met).toEqual(['crow', 'crows']);
    expect(boons(ok).has('familiar')).toBe(true);
  });

  it('the server refuses an answer changed afterwards, and waits on a road walked too fast', () => {
    const a = walk(() => 0, traveller());
    const b = { ...a, at: a.at + 3600 };
    const flipped = { ...b, chose: { ...b.chose, crow: 1 as const } };
    const v = verify(a, flipped, 3600);
    expect(v.why).toContain('road');
    expect(v.strike).toBe(true);
    const fresh = traveller();
    const rushed = walk(() => 0, fresh);
    const w = verify(fresh, { ...rushed, at: fresh.at + 3600 }, 3600);
    expect(w.why).toContain('too-fast');
  });
});
