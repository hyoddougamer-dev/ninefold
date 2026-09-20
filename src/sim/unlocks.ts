/**
 * 開 What opens, and when.
 *
 * 九境 is a purely vertical game: nothing ever resets, and every track in it — the
 * ladder, 無盡塔 the tower, 爐 the furnace, 煉器 refining, 渡劫 the marks — only goes up.
 * That is the shape Bruno asked for, and it works. What it was missing is the other half
 * of vertical progression: **climbing has to hand you something you did not have before.**
 *
 * It did not. Seven systems were open at realm 1, minute 1 — gear, fusing, the tree, the
 * tower, the record, the furnace, refining — so a new cultivator met five tabs and a
 * dozen mechanics at once, and then climbed eight realms that gave them nothing but
 * bigger numbers. Only the stance, the art and the cores were laddered.
 *
 * Now every realm opens something, on top of the 勢 stance and the 訣 art it already
 * gave. Each arrives at the point where the player has the problem it solves — hunting
 * and gear once the first realm's loop is understood, cores when a warden first refuses
 * to fall, the tower when there is power and a need for material, the furnace when qi
 * has started to pile up, refining when material has.
 *
 * The first realm is deliberately bare: one screen, a bar, three boxes and a warden at
 * the top of it. A cultivator who meets five tabs, six gear slots, five ranks, seven
 * axes, a chest, a tree and two endless towers in their first ten minutes has met a
 * spreadsheet, not a game.
 *
 * The second realm is where it blooms, and it blooms all at once on purpose: hunting,
 * gear and the build arrive together because they are one idea — fight things, keep what
 * they leave, decide how you fight. A beast you cannot take anything from is a button
 * that does nothing, and a stance with nothing to choose between is not a decision. From
 * the third realm it goes back to one thing at a time.
 *
 * Nothing is taken away when it opens: the kills counted before 錄 pays still count, and
 * the 道 points earned before the tree opens are still there waiting. A system arriving
 * late arrives *full*.
 */

export type System =
  | 'hunt' | 'gear' | 'arts' | 'cores' | 'fuse' | 'tree' | 'tower' | 'record'
  | 'furnace' | 'refine' | 'tribulation';

export interface SystemInfo {
  readonly key: System;
  readonly han: string;
  readonly name: string;
  /** The realm that opens it. */
  readonly realm: number;
  /** One line, for the locked screen and for the bible. */
  readonly gives: string;
}

export const SYSTEMS: readonly SystemInfo[] = [
  { key: 'hunt', han: '狩', name: 'Hunting', realm: 2,
    gives: 'Beasts you can fight whenever you like, as often as you like, for nothing.' },
  { key: 'gear', han: '器', name: 'Gear', realm: 2,
    gives: 'And what they leave behind, which you can wear.' },
  { key: 'arts', han: '勢', name: 'Stances and Arts', realm: 2,
    gives: 'A stance to fight in, and the art the first warden gave up. Both change every round of every fight.' },
  { key: 'cores', han: '妖丹', name: 'Beast Cores', realm: 3,
    gives: 'The fourth upgrade, bought with material rather than qi. From here a warden will not fall without it.' },
  { key: 'fuse', han: '煉', name: 'Fusing', realm: 3,
    gives: 'Three of a kind become one of the rank above.' },
  { key: 'tree', han: '道', name: 'The Path', realm: 4,
    gives: 'The technique tree. Every 道 point earned since the first realm is waiting for you.' },
  { key: 'tower', han: '塔', name: 'The Endless Tower', realm: 5,
    gives: 'One floor, one beast, no top. Material, and six hours of gathering a floor.' },
  { key: 'record', han: '錄', name: 'The Record', realm: 6,
    gives: 'Every beast you have ever killed starts paying. The marks were being counted all along.' },
  { key: 'furnace', han: '爐', name: 'The Furnace', realm: 7,
    gives: 'Pills, bought with qi and material together, with no cap on any of it.' },
  { key: 'refine', han: '煉器', name: 'Refining', realm: 8,
    gives: 'Material makes a piece you already wear better, for ever.' },
  { key: 'tribulation', han: '雷池', name: 'The Tribulation', realm: 9,
    gives: 'The last layers of the whole climb. When they run out the bar becomes the thunder pool, and a Dragon comes back heavier every time you put it down.' },
];

const BY_KEY: Readonly<Record<System, SystemInfo>> =
  Object.fromEntries(SYSTEMS.map((s) => [s.key, s])) as Record<System, SystemInfo>;

export function systemInfo(key: System): SystemInfo {
  return BY_KEY[key];
}

export function opensAt(key: System): number {
  return BY_KEY[key].realm;
}

/** Is this system open to a cultivator of this realm? */
export function isOpen(realm: number, key: System): boolean {
  return realm >= BY_KEY[key].realm;
}

/** Everything this realm hands over, for the card that says so. */
export function opensIn(realm: number): readonly SystemInfo[] {
  return SYSTEMS.filter((s) => s.realm === realm);
}
