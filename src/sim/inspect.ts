import {
  AFFIXES, SECONDARIES, primaryOf, templateOf, valueOf,
  type Affix, type Item, type Rarity,
} from '../data/gear.ts';
import { power, rate as rateOf, type State } from './state.ts';

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

/** The save as it would be with this piece worn. Nothing else moves. */
export function ifWorn(s: State, item: Item): State {
  return { ...s, worn: { ...s.worn, [templateOf(item).slot]: item } };
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
  return { power: p, rate: r, better: (up(p) || up(r)) && !down(p) && !down(r) };
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
