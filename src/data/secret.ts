/**
 * 秘境 The secret realm: a run with a beginning and an end.
 *
 * Bruno's second proposal and the last of the four. Everything else in this game is a
 * loop with no ending, which is why three minutes of it can feel like nothing happened.
 * A run has a shape: a door, seven rooms, two ways on at each one, and a thing you can
 * say about it afterwards.
 *
 * 律 The rules it keeps, which are the game's own and one this session had to learn.
 *
 *   失 Losing costs nothing. A beast that puts you down ends the run and takes nothing
 *     back, because everything a room pays is **banked the moment you take it**. There
 *     is nothing carried and so there is nothing to drop, which is also why a save
 *     cannot hold a run's worth of loot in flight and why closing the app in room four
 *     loses only the rooms you had not walked yet.
 *   待 It is entered when you choose and never on a timer. The door opens every few
 *     hours and then waits for ever.
 *   在 And it pays for being there. Opening the app is what walks it, three doors is
 *     what a visit is worth, and a cultivator who is never there never opens a door.
 *   定 The path is chosen, not rolled: it is a function of the save, so two cultivators
 *     with the same history walk the same rooms and the harness can walk them too.
 */

import {
  BLESSED_ROOM, DEEP_ROOMS, DOOR_GAP, ROOMS, SHRINE_DEEP_POINTS, springShare,
} from '../sim/balance.ts';
import { opensAt } from '../sim/unlocks.ts';

/**
 * What is behind a door. One thing each, so a door fits on a line.
 *
 * 泉 香 A reward room offers its share of the spring two ways, now or burned slowly, and a
 * third door that spends the same share on something for another system (2026-10-04).
 */
export type Room =
  /** 獸 A beast, one realm above you. Beat it and the way on opens. */
  | { kind: 'beast' }
  /** 泉 Drink the room's share of the spring: qi, at once. */
  | { kind: 'spring' }
  /** 香 Burn the room's share as incense: half as much again, slowly. */
  | { kind: 'incense' }
  /** 龕 A shrine, cold for a long time. 道 points, while the realm's share lasts. */
  | { kind: 'shrine' }
  /** 爐 A brazier with something left in it. A piece of gear. */
  | { kind: 'brazier' }
  /** 匣 A craftsman's box: herbs and ore of this realm, for the workshop. */
  | { kind: 'box' }
  /** 跡 A challenger's trail: the next 擂台 challenger begins the fight hurt. */
  | { kind: 'trail' };

export type RoomKind = Room['kind'];

export interface KindInfo {
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  /** The line the door says about itself, before it is opened. */
  readonly says: string;
}

export const ROOM_INFO: Readonly<Record<RoomKind, KindInfo>> = {
  beast: { han: '獸', name: 'Something in the dark', icon: 'centipede',
    says: 'A beast from a realm above this one. Beat it and the way on opens.' },
  spring: { han: '泉', name: 'Drink it now', icon: 'icicles-aura',
    says: 'Qi in hand at once, this room\u2019s share of the spring.' },
  incense: { han: '香', name: 'Burn it as incense', icon: 'incense',
    says: 'Half as much again, but slowly: your gathering runs faster while it burns, away or not.' },
  shrine: { han: '龕', name: 'A shrine, long cold', icon: 'crystal-shrine',
    says: 'A 道 point, sometimes two, for whoever sweeps it. It costs this room\u2019s share of the spring.' },
  brazier: { han: '爐', name: 'A brazier with something left in it', icon: 'cauldron',
    says: 'A piece of gear, rolled off this realm and lifted. It costs this room\u2019s share of the spring.' },
  box: { han: '匣', name: 'Take the craftsman\u2019s box', icon: 'covered-jar',
    says: 'Herbs and ore of this realm, for the workshop. No experience with it.' },
  trail: { han: '跡', name: 'Follow the challenger\u2019s trail', icon: 'footprint',
    says: 'Where the next challenger on 擂台 the Platform was hurt: it begins that fight a tenth down.' },
};

/**
 * How many rooms a run is (ROOMS), how many 秘境深 the deeper vault makes it (DEEP_ROOMS),
 * and how long the door stays shut after one (DOOR_GAP): all in balance.ts.
 */
export { DEEP_ROOMS, DOOR_GAP, ROOMS };

/** The realm the path grows in: when 秘境深 the deeper vault opens, and only there. */
export const DEEP_AT = opensAt('deep');

/** How long a run is for the cultivator walking it. */
export const roomsFor = (realm: number) => (realm >= DEEP_AT ? DEEP_ROOMS : ROOMS);

/** The realm the door first appears in: when 秘境 opens, and only there. */
export const OPENS_AT = opensAt('secret');

/**
 * 深 What a room's share of the spring is, by how deep it is (springShare in balance.ts).
 *
 * The last reward room holds four times the first, so walking the whole path is the point
 * and a run abandoned at room two is worth a fraction of one finished. That is the shape a
 * run needs: the reason to keep going is that it gets better. It used to be a fixed number
 * of minutes per room (SPRING_MINUTES and ROOM_DEPTH); since 2026-10-04 the rooms share a
 * spring that fills while the door is shut, so what a run is worth is time, not walks.
 *
 * 藏 The cache was the leak, and it took three measurements to see it. It paid 材
 * material, and material to a cultivator who does not hunt is exactly what the wall
 * between idle and active is built to withhold: a hundred and twenty runs handed one
 * over a thousand beasts' worth of it, and the wall sat at 1.59 against a rule of 1.5
 * however hard everything else was cut. **Material comes off beasts and from nowhere
 * else.** What is left pays qi, 道 points, gear, herbs and ore, and none of those is
 * something a non-hunter can turn into the power a warden asks for.
 */
export { springShare };

/** 泉 How many of a path's rooms are reward rooms: every other one, the first included. */
export const rewardRooms = (realm: number) => Math.ceil(roomsFor(realm) / 2);

/** 龕 A shrine pays one 道 point, and two in the last room of whatever path you walk. */
export const shrineDeep = (realm: number) => roomsFor(realm) - 1;

/**
 * 記 What a run gave, kept so the end of it can say so.
 *
 * Bruno walked seven rooms and came out to nothing: *"no fim mostrar o loot e ganhos
 * totais"*. Every room paid into the save the moment it was opened, which is the law
 * this system is built on, and the cost of that law is that a run leaves no trace of
 * itself. The qi went into a bar that was already moving, the 道 point into a badge on
 * a tab, the piece of gear into a chest with forty others in it.
 *
 * 別 This is a *record*, not loot in flight. Nothing here is ever paid out: the payment
 * already happened, room by room. Deleting this field would cost the player nothing but
 * the sentence at the end, which is exactly the point of keeping it separate.
 */
export interface Take {
  /** 氣 Qi taken, in total: drunk, and whatever a full chest melted. */
  readonly qi: number;
  /** 道 Points taken. */
  readonly dao: number;
  /** 器 The pieces walked out with, enough of each to draw it. */
  readonly items: readonly { readonly template: string; readonly rarity: string }[];
  /** How many rooms were opened, gates included. */
  readonly rooms: number;
  /** 關 How many guardians were put down. */
  readonly gates: number;
  /** Whether a guardian is what ended it. */
  readonly beaten: boolean;
  /** 香 Seconds of incense lit. */
  readonly burn?: number;
  /** 匣 What the boxes held, by pouch key. */
  readonly box?: Readonly<Record<string, number>>;
  /** 跡 Whether a trail was taken. */
  readonly trail?: boolean;
  /** 室 Which reward room took which way, so the end of a run can say where each came from. */
  readonly picks?: readonly { readonly step: number; readonly kind: RoomKind }[];
}

export const NO_TAKE: Take = { qi: 0, dao: 0, items: [], rooms: 0, gates: 0, beaten: false,
  burn: 0, box: {}, trail: false, picks: [] };

const KINDS_TAKEN: readonly RoomKind[] = ['spring', 'incense', 'shrine', 'brazier', 'box', 'trail'];

/**
 * A save is input, and a record of a run is input like everything else.
 *
 * It lives here beside validBeds and for the same reason: state.ts has to reach it and
 * sim/secret.ts reads a State, so putting it there would have the two importing each
 * other at runtime.
 */
export function validTake(raw: unknown, keys: (k: string) => boolean,
  rarities: readonly string[], pouchKeys: (k: string) => boolean = () => false): Take {
  const o = (raw ?? {}) as Record<string, unknown>;
  const n = (x: unknown, hi: number) =>
    (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(hi, Math.floor(x))) : 0);
  const list = Array.isArray(o.items) ? o.items : [];
  const items = list.slice(0, DEEP_ROOMS).flatMap((raw) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const template = typeof it.template === 'string' && keys(it.template) ? it.template : null;
    const rarity = typeof it.rarity === 'string' && rarities.includes(it.rarity)
      ? it.rarity : null;
    return template && rarity ? [{ template, rarity }] : [];
  });
  const rawBox = (o.box && typeof o.box === 'object' && !Array.isArray(o.box) ? o.box : {}) as Record<string, unknown>;
  const box = Object.fromEntries(Object.entries(rawBox).slice(0, 4)
    .filter(([k]) => pouchKeys(k)).map(([k, v]) => [k, n(v, 1e9)]).filter(([, v]) => (v as number) > 0));
  const picks = (Array.isArray(o.picks) ? o.picks : []).slice(0, DEEP_ROOMS).flatMap((raw) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const kind = KINDS_TAKEN.find((k) => k === p.kind);
    return kind ? [{ step: n(p.step, DEEP_ROOMS - 1), kind }] : [];
  });
  return {
    qi: n(o.qi, 1e18), dao: n(o.dao, DEEP_ROOMS * 2), items,
    rooms: n(o.rooms, DEEP_ROOMS), gates: n(o.gates, DEEP_ROOMS), beaten: o.beaten === true,
    burn: n(o.burn, 2 * 86_400), box, trail: o.trail === true, picks,
  };
}

/**
 * 道 The most 道 a single walk of the vault could possibly pay.
 *
 * It exists because `validate` has to cap 道 points and the cap it had was the meetings'
 * own ceiling, nine, which was right when 緣 the meetings were the only thing paying
 * them. 秘境 The vault's shrines pay into the same bank, so from about the fourth walk
 * onwards every point a shrine ever handed over was deleted on the next load. Measured:
 * a save carrying forty came back holding nine.
 *
 * So the cap is derived instead, from how many walks the wall-clock could have allowed,
 * and this is the per-walk bound. Every reward room a shrine, every one of them deep,
 * and 期 the week's blessing on top of one of them: an over-estimate on purpose, because
 * a cap on a currency that can only ever be spent on a tree of fixed size is there to
 * stop a forged heirloom, not to be tight.
 */
export const RUN_DAO_CEILING = Math.ceil(DEEP_ROOMS / 2) * SHRINE_DEEP_POINTS * BLESSED_ROOM;
