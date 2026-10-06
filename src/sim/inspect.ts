import {
  AFFIXES, SECONDARIES, primaryOf, templateOf, valueOf,
  type Affix, type Item, type Rarity,
} from '../data/gear.ts';
import { power, rate as rateOf, type State } from './state.ts';
import { equip } from './chest.ts';
import { levelAt } from './refine.ts';
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
 * The save as it would be with this piece worn. Nothing else moves: 承 the place's
 * refining is the place's, so the piece simply has it once it is on.
 */
export function ifWorn(s: State, item: Item): State {
  const slot = templateOf(item).slot;
  return { ...s, worn: { ...s.worn, [slot]: item } };
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
 *
 * 承 Both pieces are read at `level`, the refining of the place they share (levelAt in
 * sim/refine.ts), because either one worn there has it. rekaris, on the Discord: a worn
 * piece with +50% on every line from its levels read as better than a strict upgrade,
 * because the upgrade's lines were read bare while the worn piece's were read refined. With
 * the levels on the place there is one number to read both at, and no way to read them
 * apart.
 */
export function compare(item: Item, worn?: Item, level = 0): readonly LineDelta[] {
  return AFFIXES
    .map((a) => ({ affix: a, theirs: valueOf(item, a, level), mine: worn ? valueOf(worn, a, level) : 0 }))
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
  // 量 The same edge the rows under it use (sizeOf): a change they print as "no change"
  // is no change here either, or the sheet read "An upgrade" over two rows of nothing.
  const up = (x: number) => sizeOf(x) !== 'none' && x > 1;
  const down = (x: number) => sizeOf(x) !== 'none' && x < 1;
  if (!up(w.power) && !up(w.rate) && !down(w.power) && !down(w.rate)) return 'same';
  if ((up(w.power) || up(w.rate)) && !down(w.power) && !down(w.rate)) return w.costsClass ? 'trade' : 'up';
  if ((up(w.power) && down(w.rate)) || (down(w.power) && up(w.rate))) return 'trade';
  if (!down(w.power) && !down(w.rate)) return 'same';
  return 'down';
}

/**
 * 比 When power and qi do not move, the other six lines decide. An amethyst with four
 * times the 運 of the one worn used to read "The same as yours", because only two of
 * the eight lines were ever asked.
 */
export function verdictByLines(v: Verdict, lines: readonly LineDelta[]): Verdict {
  // ▲ An upgrade gives up nothing: a piece that raises power and drops the 運 you wear is
  // a trade, the same rule the chest's ▲ keeps (linesHeld).
  if (v === 'up') return lines.every(holds) ? 'up' : 'trade';
  if (v !== 'same') return v;
  const more = lines.some((d) => d.affix !== 'power' && d.affix !== 'rate' && d.theirs > d.mine * 1.001);
  const less = lines.some((d) => d.affix !== 'power' && d.affix !== 'rate' && d.theirs < d.mine * 0.999);
  return more && less ? 'trade' : more ? 'up' : less ? 'down' : 'same';
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

/** One line held: the new piece gives at least what the worn one gives on it. */
const holds = (d: LineDelta): boolean => d.mine <= 0 || d.theirs >= d.mine * 0.999;

/**
 * ▲ Whether a piece keeps every line the worn one has: each is matched or beaten by the
 * new piece read as worn (承 at the place's refining, as the worn one is). Found from the
 * Discord (2026-10-04): ▲ only ever asked power and qi, so 著 Wear all upgrades could swap
 * a ring with 運 luck on it for one with a little more power and no 運 at all.
 */
export function linesHeld(s: State, item: Item): boolean {
  const slot = templateOf(item).slot;
  const worn = s.worn[slot];
  return !worn || compare(item, worn, levelAt(s.refined, slot)).every(holds);
}

/**
 * ▲ Whether the chest marks a piece ▲: the sim says it raises power or qi and lowers
 * neither, read with 承 the place's levels on it, it keeps the class, and
 * it gives up no line the worn piece has. A strict upgrade, and nothing less. The one
 * rule the chest, the verdict's drop and 著 Wear all upgrades all draw from.
 */
export function marksUp(s: State, item: Item): boolean {
  return upOf(s, item, swing(s, item));
}

/** marksUp, for a caller that already has the swing. */
export function upOf(s: State, item: Item, m: Swing): boolean {
  return m.better && !m.costsClass && linesHeld(s, item);
}

/** 套 Whether a piece is named by any saved loadout, so a bulk swap leaves it where it is. */
export function inLoadout(s: State, item: Item): boolean {
  return s.sets.some((set) => Object.values(set.ids).includes(item.id));
}

/**
 * ▲ 著 Wear all upgrades: what pressing the button puts on.
 *
 * One place at a time, the biggest 力 gain first and then 氣, each read against the body
 * as it stands after the last swap, because one piece going on can change what the next
 * one does (a set, a class). Never a 鎖 locked piece, never one a 套 loadout names, never
 * one that costs the class or gives up a line: exactly the pieces the chest draws ▲ on. It stops when
 * nothing is ▲ any more, which it must, because every swap raises a number and lowers none.
 */
export function wearBetter(s: State): { state: State; worn: number } {
  let out = s;
  let worn = 0;
  for (let i = 0; i < 24; i++) {
    let best: { item: Item; m: Swing } | null = null;
    for (const item of out.chest) {
      if (item.locked || inLoadout(out, item)) continue;
      const m = swing(out, item);
      if (!upOf(out, item, m)) continue;
      if (!best || m.power > best.m.power + 1e-12
        || (Math.abs(m.power - best.m.power) <= 1e-12 && m.rate > best.m.rate)) best = { item, m };
    }
    if (!best) break;
    // The same swap the sheet's 著 button makes; 承 the place keeps its levels.
    const next = equip(out.worn, out.chest, best.item, templateOf(best.item).slot);
    out = { ...out, worn: next.worn, chest: [...next.chest] };
    worn++;
  }
  return { state: out, worn };
}

/** What a worn piece is doing for you: the body with it, against the body without it. */
export function wornSwing(s: State, item: Item): Swing {
  // Already on: it is holding the class up, not costing it.
  return { ...swing(ifBare(s, item), item), costsClass: false };
}
