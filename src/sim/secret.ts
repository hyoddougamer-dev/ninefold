import { bestGather, doorGapFor, kitFor, pouchRoom, spendKit, tookPart } from './crafts.ts';
import {
  DOOR_GAP, NO_TAKE, OPENS_AT, ROOM_INFO, ROOMS,
  rewardRooms, roomsFor, shrineDeep, springShare, type Room, type RoomKind, type Take,
} from '../data/secret.ts';
import { stash } from './stash.ts';
import { commonsOf, type Beast } from '../data/bestiary.ts';
import { REALM_KEY } from '../data/crafts.ts';
import { beastPower, odds } from './combat.ts';

import { rate } from './time.ts';
import { rollDrop } from './drops.ts';
import { fortuneOf } from './fortune.ts';
import { isBlessed } from './week.ts';
import {
  BLESSED_ROOM, BOX_HOURS, BRAZIER_LUCK, INCENSE_BONUS, INCENSE_HOLD, INCENSE_WORTH,
  SHRINE_DAO_PER_REALM, SHRINE_DEEP_POINTS, SHRINE_POINTS, SPRING_FILL, SPRING_HOLD,
} from './balance.ts';
import type { State } from './state.ts';
import { classSpring } from './schools.ts';
import { platformOpen, standingTier } from './platform.ts';

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

const KINDS: readonly RoomKind[] = ['spring', 'shrine', 'brazier'];

/**
 * 泉 What the spring holds now, in seconds of shut time: what it held when it was last
 * counted, and every second since, up to SPRING_HOLD. It is the cave's rule: a full spring
 * waits for ever, it simply does not grow past full. Nothing is taken for being away.
 */
export function springNow(s: State): number {
  return Math.min(SPRING_HOLD, Math.max(0, s.spring ?? 0) + Math.max(0, s.at - (s.springAt ?? s.at)));
}

/** 泉 Seconds of gathering a full spring is worth: SPRING_HOLD at SPRING_FILL. */
export const SPRING_FULL = SPRING_HOLD * SPRING_FILL;

/**
 * 深 The share of the spring this reward room takes, in seconds of shut time.
 *
 * Room k of n takes springShare(k, n) of what the spring held when the run began. Every
 * reward room before it has been taken (a run is walked in order and a room is spent by
 * whichever door is opened), so that is this room's part of what is left, which is how it
 * is read: the save never has to remember what the spring held at the door.
 */
export function shareAt(s: State, step: number): number {
  if (isGate(step)) return 0;
  const n = rewardRooms(s.realm);
  const k = Math.min(n - 1, Math.floor(step / 2));
  // What springShare gives rooms k..n-1 together, as a share of the whole.
  let rest = 0;
  for (let j = k; j < n; j++) rest += springShare(j, n);
  const held = inside(s) ? Math.max(0, s.spring ?? 0) : springNow(s);
  return rest > 0 ? (held * springShare(k, n)) / rest : 0;
}

/**
 * 泉 What a room's share is worth, in seconds of standing gathering: SPRING_FILL of it, 期
 * doubled in the week's blessed room, and 尋仙 the Immortal Seeker drinks deeper.
 */
export function worthAt(s: State, step: number): number {
  const week = isBlessed(s, step) ? BLESSED_ROOM : 1;
  return shareAt(s, step) * SPRING_FILL * week * classSpring(s);
}

/** 香 Seconds of incense a room's share would burn for: INCENSE_WORTH of it, at INCENSE_BONUS. */
export function burnAt(s: State, step: number): number {
  return (worthAt(s, step) * INCENSE_WORTH) / INCENSE_BONUS;
}

/** 香 Seconds of burning still queued behind the burner. */
export function incenseLeft(s: State): number {
  return Math.max(0, (s.incenseUntil ?? 0) - s.at);
}

/** 香 Whether the burner has room for this room's stick: a room never offers what would be wasted. */
export function incenseFits(s: State, step: number): boolean {
  const burn = burnAt(s, step);
  return burn > 0 && incenseLeft(s) + burn <= INCENSE_HOLD;
}

export interface BoxHolds {
  readonly herb: readonly [string, number] | null;
  readonly ore: readonly [string, number] | null;
}

/**
 * 匣 What a craftsman's box at this step holds: BOX_HOURS of the paths and of the veins for
 * every reward room past the first, of the best herb and ore this cultivator gathers, at the
 * craft's own pace. Never more than the pouch can keep (pouchRoom), so validate() never
 * trims what a box gave.
 */
export function boxAt(s: State, step: number): BoxHolds {
  const hours = BOX_HOURS * Math.max(0, Math.floor(step / 2));
  const one = (skill: 'herb' | 'vein'): readonly [string, number] | null => {
    const r = bestGather(s, skill);
    if (!r || r.makes.kind !== 'item') return null;
    const key = r.makes.item;
    const n = Math.min(pouchRoom(s, key), Math.floor((hours * 3600) / r.seconds));
    return n > 0 ? [key, n] : null;
  };
  return { herb: one('herb'), ore: one('vein') };
}

/** 跡 Whether a trail is worth finding: the Platform stands, a challenger is still up, none held. */
export function trailOpen(s: State): boolean {
  return platformOpen(s) && !s.trail && standingTier(s) !== null;
}

/**
 * The doors at a step: one guardian at a gate, and at a reward room its share of the
 * spring two ways (泉 drunk now, 香 burned slowly) and a third door that spends the same
 * share on something for another system.
 *
 * 龕 The third door is the shrine wherever the old pair of doors would have held one and
 * the realm's 道 share lasts, so 道 arrives exactly as often as it did. Otherwise, from the
 * third room on, it is drawn from 爐 a piece of gear, 匣 a craftsman's box and 跡 a trail,
 * seeded by the save like every other door. A first room past a spent shrine has two.
 */
export function doorsAt(s: State, step: number): readonly Room[] {
  // 關 A gate is one beast and one question: go on, or walk out with what you have.
  // Two of them was tried and it is not a choice: the gate pays nothing either way, so
  // there was never a reason to pick the harder one, and at the fourth realm both read
  // 2% against a realm above. Two identical numbers on a screen is the thing this
  // repository already refuses to do on 狩 the hunt.
  if (isGate(step)) return [{ kind: 'beast' }];
  const out: Room[] = [{ kind: 'spring' }];
  if (incenseFits(s, step)) out.push({ kind: 'incense' });
  const third = thirdAt(s, step);
  if (third) out.push(third);
  return out;
}

/** The third door at a reward room, or null. See doorsAt. */
function thirdAt(s: State, step: number): Room | null {
  const seed = hash(s.startedAt + s.runs * 6151 + step * 131);
  const allowed = KINDS.filter((k) => k !== 'brazier' || step >= 2);
  const first = allowed[seed % allowed.length];
  const rest = allowed.filter((k) => k !== first);
  const second = rest[(seed >>> 8) % rest.length];
  const shrineLeft = SHRINE_DAO_PER_REALM * Math.min(9, s.realm) - (s.vaultDao ?? 0) > 0;
  if ((first === 'shrine' || second === 'shrine') && shrineLeft) return { kind: 'shrine' };
  if (step < 2) return null;
  const box = boxAt(s, step);
  const pool: RoomKind[] = ['brazier'];
  if (box.herb || box.ore) pool.push('box');
  if (trailOpen(s)) pool.push('trail');
  return { kind: pool[(seed >>> 16) % pool.length] } as Room;
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
  // 泉 The spring is counted at the door, and the rooms share what it holds from here.
  return canEnter(s)
    ? { ...s, runStep: 0, lastRun: NO_TAKE, spring: springNow(s), springAt: s.at }
    : s;
}

/**
 * 退 Walk out, from anywhere, keeping everything already taken.
 *
 * It is the same call whether the walker chose to leave, ran out of rooms, or was put
 * down by a beast, because all three mean the same thing: the run is over and what was
 * banked stays banked. The clock starts here, so a run walked to the end and a run
 * abandoned in room one cost the same wait. 泉 The rooms not reached stay in the spring,
 * and the time spent inside is counted into it on the way out.
 */
export function leave(s: State): State {
  if (!inside(s)) return s;
  const spring = Math.min(SPRING_HOLD, Math.max(0, s.spring ?? 0) + Math.max(0, s.at - (s.springAt ?? s.at)));
  return { ...s, runStep: OUTSIDE, runAt: s.at, runs: s.runs + 1, spring, springAt: s.at };
}

/** 記 One more of something on the record of the run. Nothing here is ever paid out. */
function add(take: Take, more: { qi?: number; dao?: number; rooms?: number; burn?: number }): Take {
  return {
    ...take,
    qi: take.qi + (more.qi ?? 0),
    dao: take.dao + (more.dao ?? 0),
    rooms: take.rooms + (more.rooms ?? 0),
    burn: (take.burn ?? 0) + (more.burn ?? 0),
  };
}

/** What a door gives, before it is opened: the line on the door reads exactly this. */
export interface Gift {
  readonly qi: number;
  readonly materials: number;
  readonly dao: number;
  readonly item: boolean;
  readonly fight: Beast | null;
  /** 香 Seconds of incense lit. */
  readonly burn: number;
  /** 匣 What the box holds. */
  readonly box: BoxHolds | null;
  /** 跡 A trail. */
  readonly trail: boolean;
  /** 泉 The room's share, in seconds of standing gathering, whichever door spends it. */
  readonly worth: number;
}

/** What a door gives, in whole numbers, for the line that says so before it is opened. */
export function giftOf(s: State, room: Room, step: number): Gift {
  // 期 The week's blessed room doubles the share behind its doors (worthAt), so 秘境 the
  // screen's own line, which reads this function, cannot promise one number and pay
  // another. 關 A gate is never blessed: see blessedStep.
  const worth = worthAt(s, step);
  const none: Gift = { qi: 0, materials: 0, dao: 0, item: false, fight: null, burn: 0, box: null,
    trail: false, worth };
  switch (room.kind) {
    case 'spring':
      return { ...none, qi: Math.round(worth * rate(s)) };
    case 'incense':
      return { ...none, burn: burnAt(s, step) };
    case 'shrine': {
      // 龕 A shrine pays 道 up to its realm's share (SHRINE_DAO_PER_REALM), and is only
      // offered while that share lasts; 期 the blessed room pays it twice.
      const left = SHRINE_DAO_PER_REALM * Math.min(9, s.realm) - (s.vaultDao ?? 0);
      const week = isBlessed(s, step) ? BLESSED_ROOM : 1;
      const points = (step >= shrineDeep(s.realm) ? SHRINE_DEEP_POINTS : SHRINE_POINTS) * week;
      return { ...none, dao: Math.max(0, Math.min(left, points)) };
    }
    case 'brazier':
      return { ...none, item: true };
    case 'box':
      return { ...none, box: boxAt(s, step) };
    case 'trail':
      return { ...none, trail: true };
    default:
      return { ...none, worth: 0, fight: beastAt(s, step) };
  }
}

/**
 * Open one of the doors.
 *
 * 銀 Everything lands in the save here and now. A beast door is the one that can end
 * the run: the fight is settled with the same odds the hunt screen quotes and the same
 * seed discipline as every other roll, and losing walks you out with everything you
 * already took. 泉 A reward room is spent by whichever door is opened: its share leaves
 * the spring, as qi now, as incense, or as the third door's thing.
 */
export function open(s: State, which: 0 | 1 | 2, seed: number): State {
  if (!inside(s)) return s;
  const step = s.runStep;
  const room = doorsAt(s, step)[which];
  if (!room) return s;
  const gift = giftOf(s, room, step);

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
  } else {
    // 泉 The room is spent, whichever door it was.
    out = {
      ...out,
      spring: Math.max(0, (out.spring ?? 0) - shareAt(s, step)),
      lastRun: { ...out.lastRun, picks: [...(out.lastRun.picks ?? []), { step, kind: room.kind }] },
    };
  }
  if (gift.qi) out = { ...out, qi: out.qi + gift.qi, lastRun: add(out.lastRun, { qi: gift.qi }) };
  if (gift.materials) out = { ...out, materials: out.materials + gift.materials };
  if (gift.dao) {
    out = { ...out, metPoints: out.metPoints + gift.dao, vaultDao: (out.vaultDao ?? 0) + gift.dao,
      lastRun: add(out.lastRun, { dao: gift.dao }) };
  }
  if (gift.burn > 0) {
    // 香 One burner: a stick lit while another burns waits behind it.
    out = { ...out, incenseUntil: Math.max(out.at, out.incenseUntil ?? 0) + gift.burn,
      lastRun: add(out.lastRun, { burn: gift.burn }) };
  }
  if (gift.box) {
    // 匣 Into the pouch as it is, with no experience: the workshop's, to use.
    const pouch = { ...out.crafts.pouch };
    const box: Record<string, number> = { ...(out.lastRun.box ?? {}) };
    for (const got of [gift.box.herb, gift.box.ore]) {
      if (!got) continue;
      pouch[got[0]] = (pouch[got[0]] ?? 0) + got[1];
      box[got[0]] = (box[got[0]] ?? 0) + got[1];
    }
    out = { ...out, crafts: { ...out.crafts, pouch }, lastRun: { ...out.lastRun, box } };
  }
  if (gift.trail) out = { ...out, trail: true, lastRun: { ...out.lastRun, trail: true } };
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
  DOOR_GAP, OPENS_AT, ROOMS, ROOM_INFO, rewardRooms, roomsFor, springShare, type Room, type RoomKind,
};
