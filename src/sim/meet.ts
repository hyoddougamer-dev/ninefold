import { MEETINGS, boonsOf, heartOf, meetingOf, roadOpen, type Boon, type Meeting, type Outcome, type Pick } from '../data/meetings.ts';
import { HEART_PATH } from './balance.ts';
import { stash } from './stash.ts';
import { classMeet } from './schools.ts';
import { rate } from './time.ts';
import { loot } from './combat.ts';
import { commonsOf } from '../data/bestiary.ts';
import { rollDrop } from './drops.ts';
import type { State } from './state.ts';
import { MEET_GAP } from './balance.ts';

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

/** How long after one meeting before the next can arrive, in seconds: see balance.ts. */
export { MEET_GAP };

/** The first realm anybody is met in, read off the meetings themselves. */
const MEETS_FROM = Math.min(...MEETINGS.map((m) => m.realm));

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
  if (s.realm < MEETS_FROM) return null;
  const since = s.at - (s.metAt || s.startedAt);
  if (since < MEET_GAP) return null;
  const left = MEETINGS.filter((m) => !s.met.includes(m.key) && roadOpen(m, s.realm, s.tribulation, s.met, s.chose));
  if (!left.length) return null;
  // 歸 Somebody coming back comes first. A return is the road answering you, and making
  // it wait behind a stranger would bury the one meeting that is about what you did.
  const back = left.filter((m) => m.after);
  const from = back.length ? back : left;
  return from[pick(s.startedAt + s.met.length * 7919) % from.length];
}

/** 心 Where this cultivator's heart leans: kind above zero, hard below. */
export function heart(s: State): number {
  return heartOf(s.met, s.chose);
}

/** 心 The path the heart walks, once it has leaned far enough to be one. */
export function pathOf(s: State): 'kind' | 'hard' | 'even' {
  const h = heart(s);
  return h >= HEART_PATH ? 'kind' : h <= -HEART_PATH ? 'hard' : 'even';
}

/** 緣 The things the road has left that stay. */
export function boons(s: { readonly met: readonly string[]; readonly chose: Readonly<Record<string, 0 | 1>> }): ReadonlySet<Boon> {
  return boonsOf(s.met, s.chose);
}

/**
 * 歸 How many people met so far may still come back, which the road page says without
 * saying who: a meeting that follows one of the answers already given, and has not
 * happened yet.
 */
export function stillToCome(s: State): number {
  return MEETINGS.filter((m) => m.after && !s.met.includes(m.key)
    && s.chose[m.after.key] === m.after.pick).length;
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
    // 卜師 The Diviner is paid half again, in qi or in material. Never in 道.
    case 'qi': return { qi: Math.round(o.minutes * perMinute(s) * classMeet(s)), materials: 0, dao: 0 };
    case 'material': return { qi: 0, materials: Math.round(o.share * beastPay(s) * classMeet(s)), dao: 0 };
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
  if (!m || s.met.includes(key) || !roadOpen(m, s.realm, s.tribulation, s.met, s.chose)) return s;
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
    chose: { ...s.chose, [key]: which },
  };

  // 道 Points from a meeting are earned like any other, so they are stored as what they
  // are: the list of them, which sim/points.ts adds up with everything else.
  if (gift.dao > 0) out = { ...out, metPoints: (out.metPoints ?? 0) + gift.dao };

  // 器 A piece, rolled from this realm's own table, with the meeting's own luck.
  if (p.outcome.kind === 'item') {
    const commons = commonsOf(Math.max(1, Math.min(9, out.realm)));
    const beast = commons[commons.length - 1] ?? commons[0];
    const item = beast
      ? rollDrop(beast, out.realm, seed, { chance: 1, luck: p.outcome.luck, always: true, anyShape: true, source: 'road' },
        out.layer)
      : null;
    // 藏 Into the chest the one way every find goes: 空囊 applied, a full chest's
    // cast-off melted rather than lost.
    out = stash(out, item).state;
  }
  return out;
}

export { MEETINGS, meetingOf, type Boon, type Meeting, type Pick };
