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
 * The first realm was bare, and that was an over-correction. The fear was right — a
 * cultivator who meets five tabs, six gear slots, five ranks, seven axes, a chest, a
 * tree and two endless towers in their first ten minutes has met a spreadsheet, not a
 * game — but the answer taken from it was *nothing at all*, for thirteen hours. Played
 * from a clean save, the first realm is a bar, eighteen purchases and one fight at the
 * very end of it.
 *
 * And it did not have to be. The first realm's own three beasts were already there,
 * already balanced, and already arrive as a ladder — measured, layer by layer:
 *
 *     layer 5, about two hours in   山鼠 the rat        66%
 *     layer 6                       野犬 the hound      20% → 98%
 *     layer 7                       澤蛙 the frog       24% → 98%
 *     layer 9, the realm full       妖狐 the fox, warden      63%
 *
 * Four fights, each one a real question when it arrives, and the game hid all of them
 * behind the second realm. So 狩 Hunt opens at the first. Not the bestiary, not gear,
 * not a stance: three beasts, honest odds, and nothing to lose by trying.
 *
 * 器 Gear and 勢 the build still arrive together at the second realm, and they read
 * better for it — you have been killing these animals for hours, and now they start
 * leaving things behind, and now you get to choose how you fight them. From the third
 * realm it goes back to one thing at a time.
 *
 * 環 And the first realm has to *close its loop*, which took two more moves.
 *
 * Bruno, playing it: "a primeira hunt não dá nada. Apenas está lá." He was right, and
 * the reason was not the hunting. A kill paid 材 material and material bought nothing
 * until the third realm — two days with a dead coin in your pocket — while the marks
 * the kills earned were counted and paid nothing until the sixth. The hunting worked.
 * Both of its rewards were locked in cupboards a fortnight away.
 *
 * So 妖丹 cores are for sale from the first realm: the first costs 3 material, which is
 * three rats, and gives +8% power for good. Wardens still do not *demand* cores until
 * the third — being sold a thing earlier than you are required to have it is the right
 * way round, and the reverse is the wall this whole file exists to stop.
 *
 * And 錄 the record pays from the first kill rather than the sixth realm. Ten kills of
 * one animal is +2% material from everything; a hundred is +2% power. Small, permanent,
 * and earned by doing the thing the screen is already asking you to do.
 *
 * That is the loop the first hour was missing: kill, take material, buy power, kill
 * something bigger. It was all there. None of it was switched on.
 *
 * Nothing is taken away when it opens: the kills counted before 錄 pays still count, and
 * the 道 points earned before the tree opens are still there waiting. A system arriving
 * late arrives *full*.
 */

export type System =
  | 'hunt' | 'gear' | 'arts' | 'cores' | 'fuse' | 'tree' | 'tower' | 'record'
  | 'bestiary' | 'furnace' | 'refine' | 'tribulation';

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
  { key: 'hunt', han: '狩', name: 'Hunting', realm: 1,
    gives: 'Beasts you can fight whenever you like, as often as you like, for nothing. They will be too strong for a while. That is what the upgrades are for.' },
  { key: 'gear', han: '器', name: 'Gear', realm: 2,
    gives: 'And what they leave behind, which you can wear.' },
  { key: 'arts', han: '勢', name: 'Stances and Arts', realm: 2,
    gives: 'A stance to fight in, and the art the first warden gave up. Both change every round of every fight.' },
  { key: 'cores', han: '妖丹', name: 'Beast Cores', realm: 1,
    gives: 'The fourth upgrade, and the only one qi cannot buy. It costs 材 material, and material falls off beasts — so this is what the hunting is for. From the third realm a warden will not fall without it.' },
  { key: 'fuse', han: '煉', name: 'Fusing', realm: 3,
    gives: 'Three of a kind become one of the rank above.' },
  { key: 'tree', han: '道', name: 'The Path', realm: 4,
    gives: 'The technique tree. Every 道 point earned since the first realm is waiting for you.' },
  { key: 'tower', han: '塔', name: 'The Endless Tower', realm: 5,
    gives: 'One floor, one beast, no top. Material, and six hours of gathering a floor.' },
  { key: 'record', han: '錄', name: 'The Record', realm: 1,
    gives: 'Every beast you kill is counted, and the count pays. Ten kills of one animal is more material from everything; a hundred is power.' },
  { key: 'bestiary', han: '圖鑑', name: 'The Bestiary', realm: 6,
    gives: 'A realm whose four beasts you have all mastered pays a 道 point. The kills were being counted all along, and now the deepest hunting there is pays for the tree.' },
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
