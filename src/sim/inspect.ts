import {
  AFFIXES, SECONDARIES, primaryOf, templateOf, valueOf,
  type Affix, type Item, type Rarity,
} from '../data/gear.ts';
import { power, rate as rateOf, type State } from './state.ts';
import { carryRefine } from './chest.ts';
import { callingKey } from './schools.ts';

/**
 * 鑑 Reading a piece, and reading it against the one you are wearing.
 *
 * Bruno: *"não existem tooltips, comparação entre equipado e a equipar, não se sabe ao
 * certo os stats de cada item, a rarity, borders etc."*
 *
 * Every one of those is the same hole: the chest showed a picture, one number and a
 * little ▲, and the ▲ was computed from **the sum of the raw roll values**, which is
 * not what better means. A 藏 chest-slots roll and a 力 power roll are not the same
 * kind of number and adding them together answers nothing. A piece with four small
 * lines could out-triangle a piece that doubles your power.
 *
 * So the comparison is done the only way that cannot lie: put the piece on in a copy of
 * the save and ask the sim what changed. `power()` and `rate()` are the two functions
 * the whole game is built on, and they already fold in the affinity, the sets, the
 * refine and the tree. Nothing here re-implements any of that.
 */

/**
 * The save as it would be with this piece worn. Nothing else moves, except what putting
 * it on moves: 承 the refining levels of the piece it replaces come with the place.
 */
export function ifWorn(s: State, item: Item): State {
  const slot = templateOf(item).slot;
  return { ...s, worn: { ...s.worn, [slot]: carryRefine(item, s.worn[slot]).on } };
}

/** The save as it would be with that slot empty. */
export function ifBare(s: State, item: Item): State {
  const worn = { ...s.worn };
  delete worn[templateOf(item).slot];
  return { ...s, worn };
}

export interface Swing {
  /** What wearing it multiplies your power by. 1 is no change. */
  readonly power: number;
  /** And your qi a second. */
  readonly rate: number;
  /** True when it is worth wearing: it raises one and lowers neither. */
  readonly better: boolean;
  /**
   * 職 True when putting it on ends the class you wear, or takes a school off its full.
   *
   * A class's perk is not in power or qi. A Sword Immortal's tower floors count weaker,
   * and a piece that adds 8% power while ending that can lose the very fight it looked
   * like it would win. So the sheet may not call such a piece an upgrade. `better` is
   * left as the two numbers say, because it is what the measuring cultivators wear by.
   */
  readonly costsClass?: boolean;
}

/** Whether wearing this piece ends the class, or steps a school down from its full. */
export function costsClass(s: State, item: Item): boolean {
  const was = callingKey(s);
  if (!was) return false;
  const will = callingKey(ifWorn(s, item));
  if (will === was) return false;
  // The same school going up to its full is a gain, not a cost.
  const [a, t] = was.split(':');
  const [b, u] = (will ?? '').split(':');
  return !(t && u && a === b && Number(u) > Number(t));
}

/**
 * What wearing this piece would actually do.
 *
 * It is measured against the *current* save, so a piece that is an upgrade for a bare
 * slot and a downgrade over what is already there says so without being asked twice.
 */
export function swing(s: State, item: Item): Swing {
  const now = { power: power(s), rate: rateOf(s) };
  const then = ifWorn(s, item);
  const p = power(then) / Math.max(1e-12, now.power);
  const r = rateOf(then) / Math.max(1e-12, now.rate);
  // A hair of tolerance: floating point should never make an identical piece look worse.
  const up = (x: number) => x > 1 + 1e-9;
  const down = (x: number) => x < 1 - 1e-9;
  return { power: p, rate: r, better: (up(p) || up(r)) && !down(p) && !down(r), costsClass: costsClass(s, item) };
}

export interface LineDelta {
  readonly affix: Affix;
  /** What the piece being looked at gives, or 0 if it has no such line. */
  readonly theirs: number;
  /** What the piece already worn gives, or 0. */
  readonly mine: number;
}

/**
 * The two pieces' lines, side by side, in one list.
 *
 * Every axis either of them touches appears exactly once, so a line that only one of
 * them has is still a row: losing 破 sunder is as much a fact as gaining 力 power, and
 * a comparison that only listed the winner's lines would hide half of every trade.
 *
 * Values are the *effective* ones, with 煉 refining already folded in, because that is
 * what the piece is actually worth to the person holding it.
 */
export function compare(item: Item, worn?: Item): readonly LineDelta[] {
  // valueOf already folds 煉 refining in, which is the whole reason it lives in the
  // data file: nothing is allowed to read a roll without it.
  return AFFIXES
    .map((a) => ({ affix: a, theirs: valueOf(item, a), mine: worn ? valueOf(worn, a) : 0 }))
    .filter((d) => d.theirs > 0 || d.mine > 0);
}

/** How many lines a piece of this rank carries: one primary and the rank's secondaries. */
export function linesOf(r: Rarity): number {
  return 1 + SECONDARIES[r];
}

/** The piece's own primary line, which is the one the chest tile shows. */
export { primaryOf };

/**
 * 判 What the sheet says first, in a word.
 *
 * Bruno: *"sinto que tem muito texto matemático que pode confundir players"*. The sheet
 * opened on five rows of percentages, and the line that read 氣 41.3% changed the qi rate
 * by 0.2%, because gear's qi bends toward a ceiling. A player cannot be expected to
 * know that. So the answer comes first, as a word, and the table is there for anyone who
 * wants to check it.
 *
 *   up     raises one of power and qi and lowers neither, and keeps your class
 *   trade  raises one and lowers the other, or raises them at the cost of your class
 *   same   moves neither
 *   down   lowers something and raises nothing
 */
export type Verdict = 'up' | 'trade' | 'same' | 'down';

export function verdictOf(w: Swing): Verdict {
  const up = (x: number) => x > 1 + 1e-9;
  const down = (x: number) => x < 1 - 1e-9;
  if (w.better) return w.costsClass ? 'trade' : 'up';
  if ((up(w.power) && down(w.rate)) || (down(w.power) && up(w.rate))) return 'trade';
  if (!down(w.power) && !down(w.rate)) return 'same';
  return 'down';
}

/**
 * 戰 The verdict, with the nearest fight in it.
 *
 * Power and qi are two of the eight lines. A 法 arts piece or a 破 sunder piece can lower
 * power and still win the fight the sheet shows below it, and the sheet used to open on
 * "Weaker than yours" above odds that went from 40% to 70%. The fight is the thing the
 * power is for, so when it disagrees with the two numbers it gets a say: a piece that
 * wins that fight more often is never called weaker, and one that loses it more often is
 * never called an upgrade.
 *
 * A point either way is noise from the seeded fights, so it has to move by more.
 */
export const FIGHT_SAYS = 0.01;

export function verdictWithFight(v: Verdict, before: number, after: number): Verdict {
  const up = after > before + FIGHT_SAYS;
  const down = after < before - FIGHT_SAYS;
  if (v === 'down' && up) return 'trade';
  if (v === 'same' && up) return 'up';
  if (v === 'same' && down) return 'down';
  if (v === 'up' && down) return 'trade';
  return v;
}

/**
 * 量 How big a change is, in a word rather than a percentage.
 *
 * The edges are where a player would start to feel it: under 2% nobody notices a fight
 * go differently, a quarter is a different game.
 */
export type Size = 'none' | 'little' | 'clear' | 'lot' | 'huge';

export const SIZE_EDGES: readonly [Size, number][] = [
  ['little', 0.02], ['clear', 0.08], ['lot', 0.25], ['huge', Infinity],
];

export function sizeOf(x: number): Size {
  const d = Math.abs(x - 1);
  if (d < 5e-4) return 'none';
  return SIZE_EDGES.find(([, edge]) => d < edge)![0];
}

/**
 * 總 What everything worn does, as two multipliers: the whole body against the same
 * cultivator with nothing on.
 *
 * The top of the gear screen used to add the lines up: 氣 +333.9% for a body whose gear
 * lifted qi by a fifth, because the sum is taken before the ceiling. These two numbers
 * come from `power()` and `rate()`, so they are what the game actually does.
 */
export function gearLift(s: State): { power: number; rate: number } {
  const bare = { ...s, worn: {} };
  return {
    power: power(s) / Math.max(1e-12, power(bare)),
    rate: rateOf(s) / Math.max(1e-12, rateOf(bare)),
  };
}

/** What a worn piece is doing for you: the body with it, against the body without it. */
export function wornSwing(s: State, item: Item): Swing {
  // Already on: it is holding the class up, not costing it.
  return { ...swing(ifBare(s, item), item), costsClass: false };
}
