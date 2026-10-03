import { doorGapFor, kitFor, spendKit, tookPart } from './crafts.ts';
import {
  DOOR_GAP, NO_TAKE, OPENS_AT, ROOM_INFO, ROOMS, SPRING_MINUTES,
  depthScale, roomsFor, shrineDeep, type Room, type RoomKind, type Take,
} from '../data/secret.ts';
import { stash } from './stash.ts';
import { commonsOf, type Beast } from '../data/bestiary.ts';
import { REALM_KEY } from '../data/crafts.ts';
import { beastPower, odds } from './combat.ts';

import { rate } from './time.ts';
import { rollDrop } from './drops.ts';
import { fortuneOf } from './fortune.ts';
import { isBlessed } from './week.ts';
import { BLESSED_ROOM, BRAZIER_LUCK, SHRINE_DAO_PER_REALM, SHRINE_DEEP_POINTS, SHRINE_POINTS } from './balance.ts';
import type { State } from './state.ts';
import { classSpring } from './schools.ts';

/**
 * 秘境 Walking the seven rooms.
 *
 * 銀 Everything a room pays is banked the moment it is taken, and nothing is carried.
 * That one decision is what makes the rest of this simple: losing costs nothing because
 * there is nothing to lose, closing the app in room four keeps every room already
 * walked, and a save can never hold a run's worth of loot in flight for `validate` to
 * have to reason about.
 *
 * 定 And the path is a function of the save rather than a die. `runs` counts the runs
 * finished, so the next path is fixed before it is walked, the same path comes back
 * after a reload, and the harness walks exactly what a player walks.
 */

/** Where the walker is: -1 outside, otherwise the room they stand at. See roomsFor. */
export const OUTSIDE = -1;

function hash(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

const KINDS: readonly RoomKind[] = ['spring', 'shrine', 'brazier'];

/**
 * 關 Every other room is a pair of beasts, and there is no way past them.
 *
 * The first version let a walker take seven reward doors in a row and it broke the one
 * rule this game is built on. Measured: a cultivator who never hunts walked 113 runs
 * and took **29 days** off their climb, while everybody who plays moved by two, because
 * the rooms hand over material and gear and those are exactly what the have-nots lack.
 * The wall fell to 1.39 against a rule of 1.5.
 *
 * So the odd rooms are gates. Two beasts, one realm above, and the only choice is which
 * one to try. A cultivator who cannot put down a beast above their realm walks out at
 * room one with a room's worth of nothing, which is what a secret realm should do to
 * somebody who is not ready for it, and it gates the whole thing on power rather than
 * on turning up.
 */
export function isGate(step: number): boolean {
  return step % 2 === 1;
}

/**
 * The two doors at a step, which are always two different things.
 *
 * A choice between two caches is not a choice, so the second door is picked out of what
 * is left after the first. 爐 The brazier is kept out of the first two rooms, because a
 * piece of gear in room one is the whole run's best thing before a decision was made.
 */
export function doorsAt(s: State, step: number): readonly Room[] {
  // 關 A gate is one beast and one question: go on, or walk out with what you have.
  // Two of them was tried and it is not a choice: the gate pays nothing either way, so
  // there was never a reason to pick the harder one, and at the fourth realm both read
  // 2% against a realm above. Two identical numbers on a screen is the thing this
  // repository already refuses to do on 狩 the hunt.
  if (isGate(step)) return [{ kind: 'beast' }];
  const seed = hash(s.startedAt + s.runs * 6151 + step * 131);
  const allowed = KINDS.filter((k) => k !== 'brazier' || step >= 2);
  const first = allowed[seed % allowed.length];
  const rest = allowed.filter((k) => k !== first);
  const second = rest[(seed >>> 8) % rest.length];
  return [{ kind: first }, { kind: second }];
}

/** 獸 The beast behind a beast door: a common of the realm above, deeper is stronger. */
export function beastAt(s: State, step: number): Beast {
  /**
   * 深 The three gates ramp out of your own realm and into the one above.
   *
   * The first is the strongest common of the realm you stand in, which somebody near
   * their ceiling should beat. The second is the weakest of the realm above. The third
   * is the strongest thing the realm above has, and it is meant to stop most people.
   *
   * 量 Both ends of this were tried and measured. Every gate at a realm above read 2%
   * at every door for a cultivator halfway up their realm, which is content they cannot
   * touch for most of a realm. Every gate in their own realm let the cultivator who
   * never hunts walk all seven rooms, and the wall fell to 1.53 against a rule of 1.5.
   * The ramp gives a mid-realm walker two or three rooms and a ceiling walker all
   * seven, which is what a secret realm should be worth to each of them.
   */
  const gate = Math.floor(step / 2);
  const sorted = (realm: number) => [...commonsOf(Math.max(1, Math.min(9, realm)))]
    .sort((a, b) => beastPower(a) - beastPower(b));
  const mine = sorted(s.realm);
  const above = sorted(s.realm + 1);
  if (gate <= 0) return mine[mine.length - 1] ?? mine[0];
  const pool = above.length ? above : mine;
  return gate === 1 ? pool[0] : pool[pool.length - 1];
}

export function doorOpen(s: State): boolean {
  if (s.realm < OPENS_AT) return false;
  return s.at - (s.runAt || s.startedAt) >= doorGap(s);
}

/** 秘門 The gap between runs, which the Hidden Door Array shortens. */
export function doorGap(s: State): number {
  return s.crafts ? doorGapFor(s, DOOR_GAP) : DOOR_GAP;
}

export function inside(s: State): boolean {
  return s.runStep >= 0 && s.runStep < roomsFor(s.realm);
}

export function canEnter(s: State): boolean {
  return doorOpen(s) && !inside(s);
}

/** 鑰 The day a moment falls in, for the key's one-a-day: whole UTC days. */
export const keyDayOf = (at: number): number => Math.floor(at / 86_400);

/** 鑰 Whether a Realm Key would open the door now: held, the door shut, not used today. */
export function canUseKey(s: State): boolean {
  return s.realm >= OPENS_AT && !inside(s) && !doorOpen(s)
    && (s.crafts?.pouch[REALM_KEY] ?? 0) > 0 && (s.keyDay ?? 0) < keyDayOf(s.at);
}

/**
 * 鑰 Open the door with a key: the gap since the last run is counted as served, the key
 * is spent, and today's key is used. The run itself is the same as any other.
 */
export function useKey(s: State): State {
  if (!canUseKey(s)) return s;
  const left = (s.crafts.pouch[REALM_KEY] ?? 0) - 1;
  const pouch = Object.fromEntries(Object.entries({ ...s.crafts.pouch, [REALM_KEY]: left }).filter(([, n]) => n > 0));
  return {
    ...s,
    crafts: { ...s.crafts, pouch },
    runAt: Math.max(0, s.at - doorGap(s)),
    keyDay: keyDayOf(s.at),
  };
}

/** How long until the door opens again, in seconds. Zero when it is open. */
export function doorIn(s: State): number {
  if (s.realm < OPENS_AT) return 0;
  return Math.max(0, doorGap(s) - (s.at - (s.runAt || s.startedAt)));
}

/**
 * 入 Walking in, which is also where the record of the last run is wiped.
 *
 * It is cleared here rather than on the way out so that the tally the end of a run
 * shows survives the app being shut: a walker put down in room five, who closes the
 * app and comes back tomorrow, is still owed the sentence about what those five rooms
 * gave them.
 */
export function enter(s: State): State {
  return canEnter(s) ? { ...s, runStep: 0, lastRun: NO_TAKE } : s;
}

/**
 * 退 Walk out, from anywhere, keeping everything already taken.
 *
 * It is the same call whether the walker chose to leave, ran out of rooms, or was put
 * down by a beast, because all three mean the same thing: the run is over and what was
 * banked stays banked. The clock starts here, so a run walked to the end and a run
 * abandoned in room one cost the same wait.
 */
export function leave(s: State): State {
  if (!inside(s)) return s;
  return { ...s, runStep: OUTSIDE, runAt: s.at, runs: s.runs + 1 };
}

/** 記 One more of something on the record of the run. Nothing here is ever paid out. */
function add(take: Take, more: { qi?: number; dao?: number; rooms?: number }): Take {
  return {
    ...take,
    qi: take.qi + (more.qi ?? 0),
    dao: take.dao + (more.dao ?? 0),
    rooms: take.rooms + (more.rooms ?? 0),
  };
}

/** What a door gives, in whole numbers, for the line that says so before it is opened. */
export function giftOf(s: State, room: Room, step: number): {
  qi: number; materials: number; dao: number; item: boolean; fight: Beast | null;
} {
  const deep = depthScale(step);
  // 期 The week's blessed room doubles whatever stands behind its doors. It is applied
  // here rather than at the point of payment so that 秘境 the screen's own line, which
  // reads this function to say what a door gives before it is opened, cannot promise one
  // number and pay another. 關 A gate is never blessed: see blessedStep.
  const week = isBlessed(s, step) ? BLESSED_ROOM : 1;
  const none = { qi: 0, materials: 0, dao: 0, item: false, fight: null as Beast | null };
  switch (room.kind) {
    case 'spring':
      // 尋仙 The Immortal Seeker drinks deeper.
      return { ...none, qi: Math.max(1, Math.round(SPRING_MINUTES * deep * rate(s) * 60 * week * classSpring(s))) };
    case 'shrine': {
      // 龕 A shrine pays 道 up to its realm's share (SHRINE_DAO_PER_REALM), then pays as
      // a spring does, so the door is never empty and the tree is never finished on day 2.
      const left = SHRINE_DAO_PER_REALM * Math.min(9, s.realm) - (s.vaultDao ?? 0);
      if (left <= 0) {
        return { ...none, qi: Math.max(1, Math.round(SPRING_MINUTES * deep * rate(s) * 60 * week * classSpring(s))) };
      }
      return { ...none, dao: Math.min(left, (step >= shrineDeep(s.realm) ? SHRINE_DEEP_POINTS : SHRINE_POINTS) * week) };
    }
    case 'brazier':
      return { ...none, item: true };
    default:
      return { ...none, fight: beastAt(s, step) };
  }
}

/**
 * Open one of the two doors.
 *
 * 銀 Everything lands in the save here and now. A beast door is the one that can end
 * the run: the fight is settled with the same odds the hunt screen quotes and the same
 * seed discipline as every other roll, and losing walks you out with everything you
 * already took.
 */
export function open(s: State, which: 0 | 1, seed: number): State {
  if (!inside(s)) return s;
  const room = doorsAt(s, s.runStep)[which];
  if (!room) return s;
  const gift = giftOf(s, room, s.runStep);

  let out: State = s;
  if (gift.fight) {
    /**
     * 關 A gate beast pays nothing at all, and this repository already had the rule
     * written down for 守 the wardens: *a gate that pays for its own key is not a gate.*
     *
     * Measured, it had to be applied here too. The gates were added to stop a cultivator
     * who never hunts walking seven reward doors, and then the gates themselves handed
     * that cultivator three kills of a beast above their realm every run, with the
     * material and the drops, which is exactly what a non-hunter lacks. Cutting every
     * other reward in the run by half moved the wall from 1.56 to 1.60 and this moved it
     * to where it belongs, because the kills were the leak and not the caches.
     *
     * So beating it opens the way and nothing else. No material, no drop, and not a mark
     * on 錄 the record, because it is not a hunt. What the run pays is what is past it.
     */
    const beast = gift.fight;
    // 戰 One roll, the same odds the screen would quote, and nothing is staked on it.
    // 業 What is carried goes in with the walker and is spent only if the gate falls.
    const carried = kitFor(s, beast, 'vault');
    const roll = (hash(seed) % 10_000) / 10_000;
    const won = roll < odds(s, beast, undefined, carried.kit);
    if (!won) return leave({ ...s, lastRun: { ...s.lastRun, beaten: true } });
    // 九轉 A gate is one roll, not a fight, so a Nine-Turn Pill is said to have brought the
    // walker back when the same roll would have lost without it; otherwise it stays.
    const revived = carried.kit.revive && roll >= odds(s, beast, undefined, { ...carried.kit, revive: false });
    out = { ...(carried.spends ? spendKit(out, tookPart(carried.used, revived)) : out), lastRun: { ...out.lastRun, gates: out.lastRun.gates + 1 } };
  }
  if (gift.qi) out = { ...out, qi: out.qi + gift.qi, lastRun: add(out.lastRun, { qi: gift.qi }) };
  if (gift.materials) out = { ...out, materials: out.materials + gift.materials };
  if (gift.dao) {
    out = { ...out, metPoints: out.metPoints + gift.dao, vaultDao: (out.vaultDao ?? 0) + gift.dao,
      lastRun: add(out.lastRun, { dao: gift.dao }) };
  }
  if (gift.item) {
    const pool = commonsOf(Math.max(1, Math.min(9, out.realm)));
    const from = pool[pool.length - 1] ?? pool[0];
    const item = from
      ? rollDrop(from, out.realm, seed ^ 0x51ed2701,
        { ...fortuneOf(out), chance: 1, always: true, luck: (fortuneOf(out).luck ?? 1) + BRAZIER_LUCK,
          anyShape: true, source: 'secret' },
        out.layer)
      : null;
    if (item) {
      // 藏 The one way every find goes in: 空囊 applied, a full chest's cast-off melted.
      const st = stash(out, item);
      out = { ...st.state, lastRun: {
        ...st.state.lastRun,
        items: [...st.state.lastRun.items, { template: st.item!.template, rarity: st.item!.rarity }],
      } };
      /**
       * 拆 A chest with no room in it melts the worst piece down, and the qi that comes
       * back is part of what the run gave. Saying "a piece of gear" and not counting the
       * qi it turned into would be the tally lying about a room.
       */
      if (st.melted > 0) out = { ...out, lastRun: add(out.lastRun, { qi: st.melted }) };
    }
  }

  out = { ...out, lastRun: add(out.lastRun, { rooms: 1 }) };
  const next = out.runStep + 1;
  return next >= roomsFor(out.realm) ? leave(out) : { ...out, runStep: next };
}

export {
  DOOR_GAP, OPENS_AT, ROOMS, ROOM_INFO, depthScale, roomsFor, type Room, type RoomKind,
};
