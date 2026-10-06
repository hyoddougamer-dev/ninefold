/**
 * 業 How a cultivator who takes the workshop seriously plays it, for the harnesses.
 *
 * `habits.ts` plays the fights and the ladder; this is the other half of a visit for
 * somebody who crafts. It is written as a player would play it, with nothing the screen
 * does not show: set the workshop on something that will still be running when they
 * come back, keep a few of the best kit in the pouch for the next hard fight, level the
 * craft that is furthest behind, and cut the arrays into the floor as they come.
 *
 * It is deliberately the strong version. The question it exists to answer is what the
 * crafts can do to the climb at most, so the policy is greedy where a real player would
 * be lazy: it always carries the best thing it owns, and it never lets the workshop run
 * dry if anything it holds could keep it going.
 */
import type { State } from '../src/sim/state.ts';
import type { Beast } from '../src/data/bestiary.ts';
import { effectiveBeastPower, oddsRaw } from '../src/sim/combat.ts';
import { power } from '../src/sim/state.ts';
import {
  ITEM_BY_KEY, RECIPES, SKILL_KEYS, arraySlots, canSet, carry, carrySlot, held, kitFor, levelIn,
  needsOf, placeArray, recipesOf, known, knownAt, secondsOf, setTask, skillOpen, work, workSeconds,
  workshopOpen, xpOf, type Where,
} from '../src/sim/crafts.ts';
import { splitKey, type Recipe, type SkillKey } from '../src/data/crafts.ts';
import { limitFor } from '../src/sim/stash.ts';

/** How many of the best kit they like to have in the pouch before levelling something else. */
const STOCK = 3;

/** 陣 The order they cut arrays into the floor: the fight first, then the craft itself. */
const FLOOR_ORDER = ['guardian', 'heavenearth', 'longwatch', 'ninepalace', 'keenedge', 'firetame', 'hiddendoor', 'dew', 'earthvein'];

/** How many makes of a recipe what they hold would pay for. Infinity when it needs nothing. */
function lasts(s: State, r: Recipe): number {
  let n = Infinity;
  for (const [k, need] of needsOf(s, r)) n = Math.min(n, Math.floor(held(s, k) / need));
  if (r.remains && !known(s, r.remains)) n = 0;
  return n;
}

/** Everything they hold of a thing, whatever its quality. */
function stock(s: State, item: string): number {
  let n = 0;
  for (const [k, c] of Object.entries(s.crafts.pouch)) if (splitKey(k).key === item) n += c;
  return n;
}

/** The item a recipe makes, if it makes one. */
const itemOf = (r: Recipe) => (r.makes.kind === 'item' ? r.makes.item : null);

/** Recipes that can run right now and would still be running for most of `span` seconds. */
function runnable(s: State, span: number, rs: readonly Recipe[]): Recipe[] {
  return rs.filter((r) => {
    if (!canSet(s, r)) return false;
    if (r.makes.kind === 'gear' && s.chest.length >= limitFor(s) - 2) return false;
    // An array is kept: a second copy deepens it (CRAFT_ARRAY_DEPTH_EVERY), which the
    // levelling below reaches by cutting the best one again and again, so here, where the
    // question is only what fills the floor, a copy already held is passed over.
    const it = itemOf(r);
    if (it && ITEM_BY_KEY[it]?.kind === 'array' && stock(s, it) > 0) return false;
    if (r.makes.kind === 'tool' && (s.crafts.tools[r.makes.skill] ?? 0) >= r.makes.step) return false;
    const makes = lasts(s, r);
    return makes >= 1 && makes * secondsOf(s, r) >= Math.min(span, 3600) * 0.25;
  });
}

const rate = (s: State, r: Recipe) => xpOf(s, r) / secondsOf(s, r);
const best = (s: State, rs: readonly Recipe[]) => rs.reduce<Recipe | null>((a, r) => (!a || rate(s, r) > rate(s, a) ? r : a), null);

/** The kit worth keeping in stock: the strongest elixir and sigil they can make. */
function kitTargets(s: State): Recipe[] {
  const out: Recipe[] = [];
  const top = (rs: Recipe[]) => rs.filter((r) => canSet(s, r)).sort((a, b) => b.level - a.level)[0];
  const might = top(RECIPES.filter((r) => r.skill === 'alchemy' && /^alchemy:might\d$/.test(r.key)));
  const guard = top(RECIPES.filter((r) => r.skill === 'alchemy' && /^alchemy:guard\d$/.test(r.key)));
  const strike = top(RECIPES.filter((r) => ['sigil:heavenseal', 'sigil:fivethunder', 'sigil:thunder'].includes(r.key)));
  const ward = top(RECIPES.filter((r) => r.key === 'sigil:warding'));
  const demon = top(RECIPES.filter((r) => ['sigil:soullock', 'sigil:purity'].includes(r.key)));
  for (const r of [might, strike, guard, ward, demon]) if (r) out.push(r);
  return out;
}

/**
 * 鏈 A recipe, or failing that whatever would feed it: the herb, the ore, the part or the
 * metal it is short of, followed down the chain as far as it goes. This is the planning a
 * player does on the screen, where every missing need is named in red.
 */
function feed(s: State, r: Recipe, span: number, depth = 0): string | null {
  if (runnable(s, span, [r]).length) return r.key;
  if (depth > 3 || !canSet(s, r)) return null;
  for (const [k, n] of needsOf(s, r)) {
    if (k === 'mat' || held(s, k) >= n * 40) continue;
    for (const m of RECIPES.filter((x) => x.makes.kind === 'item' && x.makes.item === k)) {
      const t = feed(s, m, span, depth + 1);
      if (t) return t;
    }
  }
  return null;
}

/**
 * 作 What the workshop is set on at the end of a visit.
 *
 * `span` is how long until they are back, so a task that would run dry in minutes is
 * passed over for one that keeps going, or for gathering what it is short of.
 */
export function pickTask(s: State, span: number): string | null {
  // 戰 The kit first: a hard fight is where the crafts show, so the pouch never runs low.
  for (const r of kitTargets(s)) {
    const it = itemOf(r);
    if (!it || stock(s, it) >= STOCK) continue;
    const t = feed(s, r, span);
    if (t) return t;
  }
  // 陣 An array not yet cut and a tool not yet forged are each worth more than a level.
  const floor = RECIPES.filter((r) => r.skill === 'array' && canSet(s, r) && stock(s, itemOf(r)!) === 0)
    .sort((a, b) => FLOOR_ORDER.indexOf(a.key.slice(6)) - FLOOR_ORDER.indexOf(b.key.slice(6)));
  for (const r of floor) { const t = feed(s, r, span); if (t) return t; }
  const tools = RECIPES.filter((r) => r.makes.kind === 'tool' && canSet(s, r)).sort((a, b) => a.level - b.level);
  for (const r of tools) { const t = feed(s, r, span); if (t) return t; }
  // 級 Then the craft furthest behind: its best rate that will keep running, or else
  // whatever feeds the best recipe it has. Arrays level like any other craft: making
  // another copy is how Arrays climbs, the way a player levels it, and since 2026-10-05
  // every ten copies deepen that array too, so here any array it can make and pay for counts.
  const open = SKILL_KEYS.filter((k) => skillOpen(s, k))
    .sort((a, b) => levelIn(s, a) - levelIn(s, b));
  for (const k of open) {
    const r = best(s, k === 'array'
      ? recipesOf('array').filter((x) => canSet(s, x) && lasts(s, x) >= 1)
      : runnable(s, span, recipesOf(k as SkillKey)));
    if (r) return r.key;
    const top = recipesOf(k as SkillKey).filter((x) => canSet(s, x) && x.makes.kind === 'item')
      .sort((a, b) => b.level - a.level);
    for (const x of top.slice(0, 3)) { const t = feed(s, x, span); if (t) return t; }
  }
  return best(s, runnable(s, span, [...recipesOf('herb'), ...recipesOf('vein')]))?.key ?? null;
}

/**
 * 解 A beast Rendering does not know yet, among the ones they can safely hunt: the errand
 * the screen sets in red ("0 of 10 killed"), run the way a player runs it, a few kills of
 * an old beast on the way to the new ones.
 */
export function toLearn(s: State, safe: readonly Beast[]): Beast | undefined {
  if (!skillOpen(s, 'render')) return undefined;
  return safe.find((b) => !b.warden && (s.killed[b.key] ?? 0) < knownAt(b.key));
}

/**
 * 業 One visit to the workshop: settle what ran while they were away, cut what arrays
 * they can into the floor, and set it going on the next thing.
 */
export function craftVisit(s: State, now: number, span: number): State {
  if (!workshopOpen(s)) return s;
  s = work(s, now);
  const slots = arraySlots(levelIn(s, 'array'));
  for (const key of FLOOR_ORDER) {
    if (s.crafts.arrays.length >= slots) break;
    s = placeArray(s, key, true);
  }
  const want = pickTask(s, Math.min(span, workSeconds(s)));
  return want === s.crafts.task ? s : setTask(s, want, now);
}

/**
 * 攜 Put the best thing they own in each hand for this fight, judged by the fight's own
 * odds: an elixir first, then a sigil beside it. Nothing carried if nothing helps.
 *
 * 破境 Judged by the odds before the screen's floor, and where those are nothing yet, by
 * how far the kit closes the gap: a fresh wall reads 0% with or without a sigil, and a
 * crafter carries one into it all the same, because each day of bottleneck it breaks is a
 * day sooner through the gate.
 */
export function carryBest(s: State, b: Beast, where: Where, standing?: number): State {
  const owned = Object.entries(s.crafts.pouch).filter(([, n]) => n > 0).map(([k]) => k);
  const chance = (x: State) => {
    const kit = kitFor(x, b, where).kit;
    const gap = power(x) * kit.strike / (kit.taken * effectiveBeastPower(x, b, standing, kit.breach ?? 0));
    return oddsRaw(x, b, standing, kit) + 1e-6 * Math.min(1, gap);
  };
  for (const hand of ['elixir', 'sigil'] as const) {
    let pick: State = carry(s, hand, null);
    let at = chance(pick);
    for (const k of owned) {
      if (carrySlot(k) !== hand) continue;
      const tried = carry(s, hand, k);
      const p = chance(tried);
      if (p > at + 1e-9) { pick = tried; at = p; }
    }
    s = pick;
  }
  return s;
}
