import { MEETINGS, meetingOf, type Meeting, type Outcome, type Pick } from '../data/meetings.ts';
import { rate } from './time.ts';
import { loot } from './combat.ts';
import { commonsOf } from '../data/bestiary.ts';
import { rollDrop } from './drops.ts';
import { addToChest, chestLimit } from './chest.ts';
import { affinity } from './dao.ts';
import { wornTotals } from '../data/gear.ts';
import { salvageValue } from './salvage.ts';
import { salvageBonus } from './awaken.ts';
import type { State } from './state.ts';

/**
 * 緣 Whether somebody is on the road, and what happens when you answer them.
 *
 * 定 Nothing here is random. Which meeting comes next is a function of the save, so two
 * cultivators with the same history meet the same people in the same order, the same
 * way every drop in this game is a function of a seed. An idle game that rolls dice
 * against the clock is a game whose harnesses can only ever measure an average.
 *
 * 待 And it never expires. A meeting sits on the screen until it is answered, and
 * closing the app does not lose it, because what is on offer is derived from `met` and
 * `metAt` rather than fired at a moment. Nothing in this game is taken away for being
 * away, and that includes an offer.
 */

/** How long after one meeting before the next can arrive, in seconds. */
export const MEET_GAP = 3 * 3600;

/** A cheap, stable hash, so a save picks its own meetings and always the same ones. */
function pick(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * Who is waiting on the road, or nobody.
 *
 * 一 Never two at once, never one already met, and never one from a realm this
 * cultivator has not reached. When the realm has run out of people who have not been
 * met, it is quiet, which is honest: this is flavour and not a chore list.
 */
export function meetingDue(s: State): Meeting | null {
  if (s.realm < 2) return null;
  const since = s.at - (s.metAt || s.startedAt);
  if (since < MEET_GAP) return null;
  const left = MEETINGS.filter((m) => m.realm <= s.realm && !s.met.includes(m.key));
  if (!left.length) return null;
  return left[pick(s.startedAt + s.met.length * 7919) % left.length];
}

/**
 * 氣 A minute of this cultivator's own standing gathering.
 *
 * Every qi figure on a meeting is counted in these. A share of the rung was tried and
 * it is the wrong scale: a rung is a whole layer and grows exponentially, so the same
 * number means a rounding error at the first realm and a fortune at the fifth.
 * 入定 is deliberately left out: a meeting is worth the same whether you are sitting
 * with it or not.
 */
function perMinute(s: State): number {
  return rate(s) * 60;
}

/** 材 What a beast of this realm pays, which is what a share of material is a share of. */
function beastPay(s: State): number {
  const commons = commonsOf(Math.max(1, Math.min(9, s.realm)));
  return commons.length ? loot(commons[0]) : 1;
}

/** What a pick costs, in the two currencies, as whole numbers. */
export function priceOf(s: State, p: Pick): { qi: number; materials: number } {
  return {
    qi: Math.ceil((p.costQi ?? 0) * perMinute(s)),
    materials: Math.ceil((p.costMaterial ?? 0) * beastPay(s)),
  };
}

export function canAnswer(s: State, p: Pick): boolean {
  const cost = priceOf(s, p);
  return s.qi >= cost.qi && s.materials >= cost.materials;
}

/** What an answer gives, as whole numbers, for the line that says so before it is pressed. */
export function giftOf(s: State, o: Outcome): { qi: number; materials: number; dao: number } {
  switch (o.kind) {
    case 'qi': return { qi: Math.round(o.minutes * perMinute(s)), materials: 0, dao: 0 };
    case 'material': return { qi: 0, materials: Math.round(o.share * beastPay(s)), dao: 0 };
    case 'dao': return { qi: 0, materials: 0, dao: o.points };
    default: return { qi: 0, materials: 0, dao: 0 };
  }
}

/**
 * Answer the person on the road.
 *
 * 取 A pick that cannot be paid for changes nothing at all, rather than half of it: the
 * screen already refuses to offer it, and this is the guard behind the screen.
 *
 * The meeting is written into `met` either way, because walking on is an answer. `metAt`
 * is set from the instant in the state rather than from a clock, so this stays pure.
 */
export function answer(s: State, key: string, which: 0 | 1, seed: number): State {
  const m = meetingOf(key);
  if (!m || s.met.includes(key)) return s;
  const p = m.picks[which];
  if (!canAnswer(s, p)) return s;

  const cost = priceOf(s, p);
  const gift = giftOf(s, p.outcome);
  let out: State = {
    ...s,
    qi: Math.max(0, s.qi - cost.qi) + gift.qi,
    materials: Math.max(0, s.materials - cost.materials) + gift.materials,
    met: [...s.met, key],
    metAt: s.at,
  };

  // 道 Points from a meeting are earned like any other, so they are stored as what they
  // are: the list of them, which sim/points.ts adds up with everything else.
  if (gift.dao > 0) out = { ...out, metPoints: (out.metPoints ?? 0) + gift.dao };

  // 器 A piece, rolled from this realm's own table, with the meeting's own luck.
  if (p.outcome.kind === 'item') {
    const commons = commonsOf(Math.max(1, Math.min(9, out.realm)));
    const beast = commons[commons.length - 1] ?? commons[0];
    const item = beast
      ? rollDrop(beast, out.realm, seed, { chance: 1, luck: p.outcome.luck, always: true })
      : null;
    if (item) {
      const limit = chestLimit(out.unlocked,
        wornTotals(out.worn, (x) => affinity(out.unlocked, x)).capacity, out.awakened);
      const kept = addToChest(out.chest, item, limit);
      out = { ...out, chest: [...kept.chest] };
      // 拆 Whatever the chest turned away is melted rather than lost, the same as a drop.
      if (kept.dropped) {
        out = { ...out, qi: out.qi + salvageValue(kept.dropped, salvageBonus(out.awakened)) };
      }
    }
  }
  return out;
}

export { MEETINGS, meetingOf, type Meeting, type Pick };
