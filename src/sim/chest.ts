import { FORGED } from '../data/crafts.ts';
import {
  FUSED, RARITIES, RARITY_INFO, REALM_SETS, SLOTS, TEMPLATE_BY_KEY, baseValue, refinedBy, roundValue, schoolOf,
  templateOf, wornTotals, type Affix, type Item, type Rarity, type Roll, type Slot, type Worn,
} from '../data/gear.ts';
import type { School } from '../data/schools.ts';
import {
  CHEST_LIMIT, CLASS_AMP, FUSE_COUNT, FUSE_TOP, PAIR_CHEST, SCHOOL_WAKES, SECONDARIES, SECONDARY_SHARE,
} from './balance.ts';
import { chestCap, extraChestSlots } from './dao.ts';
import { chestSlots } from './awaken.ts';

/**
 * 藏 The chest, and 煉 the fusion.
 *
 * The chest is deliberately finite. Without a limit there is no decision in a drop:
 * everything is kept, nothing is ever weighed. With one, every 凡 Common that falls is
 * a small question: melt it, or make room for it?
 *
 * Fusion is the answer to that question, and it is why the limit is not just an
 * annoyance: three of the same piece at the same rank become one of the rank above.
 */

export { CHEST_LIMIT, FUSE_COUNT };

/**
 * 承 Whether a piece holds refining levels of its own. Those levels were paid for in
 * material and live nowhere else, so no bulk action may take the piece: not the melt by
 * rank, not a fusion, not a full chest. The testers' path (the Discord, 2026-10-04):
 * taken off, the place filled by another piece, and the piece melted with the commons.
 * Melting it from its own sheet still works, because that is the player choosing it, and
 * the sheet says so.
 */
export function holdsLevels(item: Item): boolean {
  return Math.floor(item.refine ?? 0) > 0;
}

export function chestFull(chest: readonly Item[], limit = CHEST_LIMIT): boolean {
  return chest.length >= limit;
}

/**
 * 值 How good a piece is, roughly, for deciding which of two to keep.
 *
 * Rank, realm, refining and 質 quality, not the raw roll values, because eight axes on
 * different scales cannot be added together into a number that means anything. Quality
 * can: it is the first line against what its own rank and realm usually roll, so it reads
 * the same on every piece in the game. Without it a full chest could melt a ×1.30 fused
 * Heaven piece before a ×0.96 drop of the same realm, because both weighed the same.
 * This is only ever used to answer "is the thing that just dropped better than the worst
 * thing in the chest", and for that it is right far more often than it is wrong.
 */
export function itemWorth(item: Item): number {
  return RARITY_INFO[item.rarity].mult * templateOf(item).realm * refinedBy(item) * qualityOf(item);
}

export interface Kept {
  readonly chest: readonly Item[];
  /** What fell on the floor: the worst piece, the new one, or nothing. */
  readonly dropped: Item | null;
}

/**
 * Puts a piece in the chest, and when there is no room keeps the better of the two.
 *
 * It used to refuse, which meant a full chest silently ate every drop after the fortieth
 *, and a cultivator hunting properly fills forty slots in one visit. Losing the 天 that
 * just fell because forty 凡 got there first is the game wasting the player's time, and
 * the player cannot even see it happen. Now the worst piece goes instead, and the arena
 * says which.
 */
export function addToChest(
  chest: readonly Item[], item: Item, limit = CHEST_LIMIT,
  /** 熔 Pieces a full chest must leave alone besides the locked ones: a kept filter's (sim/filters.ts). */
  spare: (it: Item) => boolean = () => false,
): Kept {
  if (!chestFull(chest, limit)) return { chest: [...chest, item], dropped: null };

  // 鎖 A locked piece is never the one that goes. If every piece is locked, the new one
  // goes instead, which is what a full chest always did with a piece no better than its
  // worst: nothing the player chose to keep is ever taken. 承 Nor a piece holding refining
  // levels, which were paid for and live nowhere else. 熔 Nor one a kept filter shows.
  let worstAt = -1;
  for (let i = 0; i < chest.length; i++) {
    if (chest[i].locked || holdsLevels(chest[i]) || spare(chest[i])) continue;
    if (worstAt < 0 || itemWorth(chest[i]) < itemWorth(chest[worstAt])) worstAt = i;
  }
  const worst = worstAt >= 0 ? chest[worstAt] : undefined;
  if (!worst || itemWorth(item) <= itemWorth(worst)) return { chest, dropped: item };

  const next = chest.slice();
  next[worstAt] = item;
  return { chest: next, dropped: worst };
}

/**
 * Takes exactly one piece out of the chest: this very piece if it is there, else the
 * first with its id. It used to drop every piece with the id, and two fused pieces could
 * share one, so wearing one twin melted the other and whatever it had been refined to.
 */
export function removeFromChest(chest: readonly Item[], id: string, which?: Item): readonly Item[] {
  let at = which ? chest.indexOf(which) : -1;
  if (at < 0) at = chest.findIndex((x) => x.id === id);
  if (at < 0) return chest;
  return [...chest.slice(0, at), ...chest.slice(at + 1)];
}

/**
 * 號 A name for a piece no other piece holds: `base`, or `base` with a count after it.
 * Kept to the 64 characters a save allows for an id.
 */
export function freshId(base: string, taken: ReadonlySet<string>): string {
  const root = base.slice(0, 58);
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) {
    const id = `${root}~${n}`;
    if (!taken.has(id)) return id;
  }
}

/** A short, stable fingerprint of a string (FNV-1a), for ids made from other ids. */
function print(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * 承 What refining does when a piece is put on over another: the levels go with the
 * place on the body, not with the metal.
 *
 * Bruno chose this from the drop proposal. Measured before it, an active cultivator
 * picked up 158 pieces between the sixth realm and the ninth and wore three, and the
 * chest held no upgrade at all in the seventh, eighth or ninth: the old piece, refined
 * twenty times, was worth twice itself, and no fresh drop could catch it. With the
 * levels carried, the same chests held 8, 14 and 14.
 *
 * The two pieces trade levels rather than copy them: the one going on takes the higher
 * of the two counts and the one coming off keeps the lower. Nothing is made and nothing
 * is lost, so swapping back puts everything where it was, and two pieces can never
 * both hold the levels that were paid for once.
 */
export function carryRefine(item: Item, previous: Item | undefined): { on: Item; off: Item | undefined } {
  if (!previous) return { on: item, off: previous };
  const a = Math.floor(item.refine ?? 0);
  const b = Math.floor(previous.refine ?? 0);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  const withLevel = (x: Item, n: number): Item => {
    const { refine: _was, ...rest } = x;
    return n > 0 ? { ...rest, refine: n } : rest;
  };
  return { on: withLevel(item, hi), off: withLevel(previous, lo) };
}

/**
 * Equipping swaps: whatever was in the slot goes back to the chest, and since the new
 * item just left it, the count never rises, so equipping can never overflow. 承 The
 * refining levels trade places on the way: see carryRefine.
 */
export function equip(worn: Worn, chest: readonly Item[], item: Item, slot: Slot): {
  worn: Worn; chest: readonly Item[];
} {
  const { on, off } = carryRefine(item, worn[slot]);
  const without = removeFromChest(chest, item.id, item);
  return {
    worn: { ...worn, [slot]: on },
    chest: off ? [...without, off] : without,
  };
}

export function unequip(worn: Worn, chest: readonly Item[], slot: Slot, limit = CHEST_LIMIT): {
  worn: Worn; chest: readonly Item[]; refused: boolean;
} {
  const item = worn[slot];
  if (!item) return { worn, chest, refused: false };
  if (chestFull(chest, limit)) return { worn, chest, refused: true };
  const next = { ...worn };
  delete next[slot];
  return { worn: next, chest: [...chest, item], refused: false };
}

export function nextRarity(rarity: Rarity): Rarity | null {
  const i = RARITIES.indexOf(rarity);
  return i >= 0 && i < RARITIES.length - 1 ? RARITIES[i + 1] : null;
}

/** The top rank, which a fusion keeps rather than raises: see fusesInto. */
const TOP_RANK: Rarity = RARITIES[RARITIES.length - 1];

/**
 * 天 What three of a rank fuse into: the rank above, and at 天 Heaven, Heaven again.
 *
 * rekaris, on the Discord (2026-10-04): a cultivator with luck and drop chance fills
 * the chest with Heaven pieces that fell, and every one is weaker than a fused one.
 * Three found Heaven pieces now make one Heaven piece, with the fusion quality on top
 * and FUSE_TOP over it, the same as every rank below. Nothing gets a new rank: the
 * fusion only ever moves a piece along the band its own rank already allowed.
 */
export function fusesInto(rarity: Rarity): Rarity | null {
  return nextRarity(rarity) ?? (rarity === TOP_RANK ? TOP_RANK : null);
}

/**
 * 源 Whether a piece was found: left by a beast, a room or a meeting, and never made by
 * a fusion or the forge. A piece from before the drops said where they came from says
 * nothing, and is counted as not found, so a doubt always keeps a piece.
 */
export function wasFound(it: Item): boolean {
  return typeof it.from === 'string' && it.from !== FORGED && it.from !== FUSED;
}

/**
 * 天 Whether a fusion at this rank may take this piece. Below Heaven, any piece that
 * fuses away at all. At Heaven only a found one: a fused Heaven piece is never fused
 * again, so 煉 Fuse all cannot feed a piece back into itself and fold a chest of Heaven
 * into one, and the best piece a fusion made is never melted into a worse one.
 */
function fusesAt(it: Item, rarity: Rarity): boolean {
  return fusesAway(it) && (rarity !== TOP_RANK || wasFound(it));
}

/** Groups of three-or-more identical pieces (same template, same rank) in the chest. */
export function fusable(chest: readonly Item[]): readonly { template: string; rarity: Rarity; count: number }[] {
  const tally = new Map<string, number>();
  for (const it of chest) {
    // 業 A forged piece is finished: it is never one of three. See sim/crafts.ts.
    // 鎖 Nor is a locked one: fusing melts three pieces into one. 承 Nor one holding
    // refining levels, which a fusion would melt with it.
    if (!fusesAt(it, it.rarity)) continue;
    const key = `${it.template}|${it.rarity}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const out: { template: string; rarity: Rarity; count: number }[] = [];
  for (const [key, count] of tally) {
    const [template, rarity] = key.split('|') as [string, Rarity];
    if (count >= FUSE_COUNT && fusesInto(rarity)) out.push({ template, rarity, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

/** Whether a fusion may melt this piece: not forged, not locked, holding no levels. */
function fusesAway(it: Item): boolean {
  return it.from !== FORGED && !it.locked && !holdsLevels(it);
}

/**
 * 質 What a fusion of these three comes out at, against its own rank's base: the average
 * quality of what went in, times what 巧手 and the 煉 line add, never above FUSE_TOP.
 * The 煉 row reads it before the tap, so the number on the button is the number made.
 */
export function fusedQuality(three: readonly Item[], quality = 1): number {
  if (three.length === 0) return 0;
  return Math.min(FUSE_TOP,
    three.reduce((sum, x) => sum + qualityOf(x), 0) / three.length * quality);  // 巧手 Deft Hands lifts this; FUSE_TOP caps it
}

/**
 * 質 A piece's quality: its first line against what its own rank and realm usually roll.
 * Derived, never stored. A drop rolls about 0.85 to 1.35 of it; a fusion stops at FUSE_TOP.
 */
export function qualityOf(item: Item): number {
  const tpl = TEMPLATE_BY_KEY[item.template];
  const base = tpl ? baseValue(tpl, item.rarity, tpl.affix) : 0;
  return base > 0 ? (item.rolls[0]?.value ?? 0) / base : 1;
}

/** 質 The three a fusion of this group would take: the first three it may, in chest order. */
export function fuseThree(chest: readonly Item[], template: string, rarity: Rarity): readonly Item[] {
  return chest.filter((x) => x.template === template && x.rarity === rarity && fusesAt(x, rarity))
    .slice(0, FUSE_COUNT);
}

/**
 * Three become one, a rank higher, and the roll quality survives the melt. 天 At Heaven,
 * three found pieces become one Heaven piece (see fusesInto).
 *
 * The new piece keeps the average quality of what went in, measured against its own
 * rank's base. Three lucky 靈 make a better 玄 than three unlucky ones, so a good roll
 * is never wasted by fusing it.
 */
export function fuse(
  chest: readonly Item[], template: string, rarity: Rarity, quality = 1,
  /** Ids held elsewhere (the body), which the new piece must not take either. */
  taken: Iterable<string> = [],
): { chest: readonly Item[]; made: Item | null } {
  const up = fusesInto(rarity);
  const tpl = TEMPLATE_BY_KEY[template];
  if (!up || !tpl) return { chest, made: null };

  const matching = chest.filter((x) => x.template === template && x.rarity === rarity && fusesAt(x, rarity));
  if (matching.length < FUSE_COUNT) return { chest, made: null };

  const eaten = matching.slice(0, FUSE_COUNT);
  // By the piece itself, not its id: a twin with the same id is not one of the three.
  const eatenOnes = new Set<Item>(eaten);

  // Quality carries across: the average of what went in, measured against its own rank's
  // base, so three lucky pieces make a better one than three unlucky ones.
  const rolled = fusedQuality(eaten, quality);

  // And so does the flavour: the new piece's extra lines are the ones that turned up
  // most often in the three that were melted, so a set of luck pieces fuses into a luck
  // piece rather than into a lottery.
  const tally = new Map<Affix, number>();
  for (const it of eaten) {
    for (const roll of it.rolls.slice(1)) tally.set(roll.affix, (tally.get(roll.affix) ?? 0) + 1);
  }
  const inherited = [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, SECONDARIES[up])
    .map(([affix]): Roll => ({
      affix,
      value: roundValue(affix, baseValue(tpl, up, affix) * SECONDARY_SHARE * rolled),
    }));

  // 號 Named after the three that went in, so two fusions never make one name: it used
  // to be built from the chest's size and the roll, and two fusions a day apart could
  // match, which is how one twin's refining went with the other.
  const left = chest.filter((x) => !eatenOnes.has(x));
  const ids = new Set([...left.map((x) => x.id), ...taken]);
  const made: Item = {
    id: freshId(`fu-${template}-${up}-${print(eaten.map((x) => x.id).join('|'))}`, ids),
    template,
    rarity: up,
    rolls: [
      { affix: tpl.affix, value: roundValue(tpl.affix, baseValue(tpl, up, tpl.affix) * rolled) },
      ...inherited,
    ],
    // 源 Made, not found: the sheet says so, and a Heaven fusion never takes it again.
    from: FUSED,
  };

  return { chest: [...left, made], made };
}

/**
 * The chest's real size: the base, what 運 has added, what 藏 rolls on gear add, and any
 * keystone's cap, which overrides the lot.
 *
 * Gear slots arrive as a fraction because affinity multiplies them, so they are floored
 * here: half a place in a chest is not a place, and the screen must never promise one.
 */
export function chestLimit(
  unlocked: readonly string[], gearSlots = 0, awakened: readonly string[] = [],
): number {
  const cap = chestCap(unlocked);
  // 捨甲 A keystone that caps the chest caps it against everything, cards included:
  // a node that closes a door has to actually close it.
  return cap ?? CHEST_LIMIT + extraChestSlots(unlocked)
    + Math.floor(Math.max(0, gearSlots)) + chestSlots(awakened);
}

/**
 * 職 Whether these pieces could dress a pair: three places of one school and three of the
 * other, each place filled from the pieces that fit it. Six places, each given to one
 * school or the other: 2^6 ways.
 */
export function couldWearPair(pieces: readonly Item[], a: School, b: School): boolean {
  const has = SLOTS.map((slot) => {
    const fit = pieces.filter((it) => TEMPLATE_BY_KEY[it.template] && templateOf(it).slot === slot);
    return { a: fit.some((it) => schoolOf(it) === a), b: fit.some((it) => schoolOf(it) === b) };
  });
  for (let mask = 0; mask < 1 << SLOTS.length; mask++) {
    let na = 0, nb = 0;
    for (let i = 0; i < SLOTS.length; i++) {
      if (mask & (1 << i)) { if (has[i].a) na++; } else if (has[i].b) nb++;
    }
    if (na >= SCHOOL_WAKES && nb >= SCHOOL_WAKES) return true;
  }
  return false;
}

/** 套 The most 藏 places any full realm set adds. */
const SET_ROOM_MOST = Math.max(0, ...REALM_SETS.map((rs) =>
  rs.steps.reduce((n, step) => n + (step.effects.capacity ?? 0), 0)));

/**
 * 藏 The most places these pieces could ever have made the chest, however they were worn:
 * every 藏 line held, worn or carried, at the largest class amplifier, the fullest set,
 * 甲匠 the Armourer's hundred when the pieces could dress him, and the tree and the cards,
 * ignoring 空囊 the keystone's cap. validate() trims a chest only past this.
 *
 * A chest can honestly hold more than its limit: put on a piece that brings fewer places,
 * leave the Armourer, change loadout, buy the keystone that caps the chest. Nothing is
 * lost on the screen when that happens, and the next load must not lose it either: on
 * 2026-10-05 an Armourer with 141 pieces changed one weapon and the reload kept 48.
 */
export function chestCeiling(
  unlocked: readonly string[], held: readonly Item[], awakened: readonly string[],
  affinityOf: (slot: Slot) => number,
): number {
  const lines = held.reduce((n, it) => n + Math.max(0, wornTotals(
    { [TEMPLATE_BY_KEY[it.template]?.slot ?? 'weapon']: it } as Worn, affinityOf,
  ).capacity), 0);
  const armourer = couldWearPair(held, 'body', 'artificer') ? PAIR_CHEST : 0;
  const room = lines * Math.max(1, ...CLASS_AMP) + SET_ROOM_MOST + armourer;
  return CHEST_LIMIT + extraChestSlots(unlocked) + chestSlots(awakened) + Math.ceil(room);
}
