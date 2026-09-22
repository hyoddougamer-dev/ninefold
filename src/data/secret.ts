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

/** What is behind a door. One thing each, so a door fits on a line. */
export type Room =
  /** 獸 A beast, one realm above you. Beat it and it pays like a hunt. */
  | { kind: 'beast' }
  /** 泉 A spring, in minutes of your own standing gathering. */
  | { kind: 'spring' }
  /** 龕 A shrine, cold for a long time. 道 points. */
  | { kind: 'shrine' }
  /** 爐 A brazier with something left in it. A piece of gear. */
  | { kind: 'brazier' };

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
    says: 'A beast from a realm above this one. Beat it and it pays like a hunt.' },
  spring: { han: '泉', name: 'A spring that has not been drunk', icon: 'icicles-aura',
    says: 'Qi, counted in minutes of your own gathering, and more of it the deeper you are.' },
  shrine: { han: '龕', name: 'A shrine, long cold', icon: 'crystal-shrine',
    says: 'A 道 point, sometimes two, for whoever sweeps it.' },
  brazier: { han: '爐', name: 'A brazier with something left in it', icon: 'cauldron',
    says: 'A piece of gear, rolled off this realm and lifted.' },
};

/** How many rooms a run is. Seven is short enough to finish in one sitting. */
export const ROOMS = 7;

/** How long after a run before the door opens again, in seconds. */
export const DOOR_GAP = 8 * 3600;

/** The realm the door first appears in. */
export const OPENS_AT = 3;

/**
 * 深 What a room pays, by how deep it is.
 *
 * The last room is worth about three times the first, so walking the whole path is the
 * point and a run abandoned at room two is worth a fraction of one finished. That is
 * the shape a run needs: the reason to keep going is that it gets better.
 *
 * 量 The numbers here were cut by more than half after the first measurement, and one
 * whole room kind was taken out. A run is content and not a faucet, and what it is for
 * is having a beginning and an end.
 *
 * 藏 The cache was the leak, and it took three measurements to see it. It paid 材
 * material, and material to a cultivator who does not hunt is exactly what the wall
 * between idle and active is built to withhold: a hundred and twenty runs handed one
 * over a thousand beasts' worth of it, and the wall sat at 1.59 against a rule of 1.5
 * however hard everything else was cut. **Material comes off beasts and from nowhere
 * else.** What is left pays qi, 道 points and gear, and none of those is something a
 * non-hunter can turn into the power a warden asks for.
 */
export function depthScale(step: number): number {
  return 1 + step * 0.4;
}

/** 泉 A spring pays this many minutes of standing gathering, before depth. */
export const SPRING_MINUTES = 4;

/** 龕 A shrine pays one 道 point, and two in the last two rooms. */
export const SHRINE_DEEP = ROOMS - 1;

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
  /** 氣 Qi taken, in total. */
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
}

export const NO_TAKE: Take = { qi: 0, dao: 0, items: [], rooms: 0, gates: 0, beaten: false };

/**
 * A save is input, and a record of a run is input like everything else.
 *
 * It lives here beside validBeds and for the same reason: state.ts has to reach it and
 * sim/secret.ts reads a State, so putting it there would have the two importing each
 * other at runtime.
 */
export function validTake(raw: unknown, keys: (k: string) => boolean,
  rarities: readonly string[]): Take {
  const o = (raw ?? {}) as Record<string, unknown>;
  const n = (x: unknown, hi: number) =>
    (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(hi, Math.floor(x))) : 0);
  const list = Array.isArray(o.items) ? o.items : [];
  const items = list.slice(0, ROOMS).flatMap((raw) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const template = typeof it.template === 'string' && keys(it.template) ? it.template : null;
    const rarity = typeof it.rarity === 'string' && rarities.includes(it.rarity)
      ? it.rarity : null;
    return template && rarity ? [{ template, rarity }] : [];
  });
  return {
    qi: n(o.qi, 1e18), dao: n(o.dao, ROOMS * 2), items,
    rooms: n(o.rooms, ROOMS), gates: n(o.gates, ROOMS), beaten: o.beaten === true,
  };
}
