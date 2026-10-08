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
import { power, sealDays, sealed } from '../src/sim/state.ts';
import {
  HANDS, ITEM_BY_KEY, RECIPES, SKILL_KEYS, arraySlots, canSet, carry, carrySlot, held, kitFor, levelIn,
  needsOf, placeArray, recipesOf, known, knownAt, secondsOf, setOrder, setTask, skillOpen, work, workSeconds,
  workshopOpen, xpOf, type Where,
} from '../src/sim/crafts.ts';
import {
  HUNDRED_RANKS, RECIPE_BY_KEY, hundredLevel, splitKey, type HundredRank, type Recipe, type SkillKey,
} from '../src/data/crafts.ts';
import { GEAR, SLOTS, type Affix } from '../src/data/gear.ts';
import { HUNDRED_HEAVEN_MADE, SECONDARIES } from '../src/sim/balance.ts';
import { CRUCIBLE } from '../src/data/hundred.ts';
import {
  lineAxes, materialReached, orderRecipe, piecesMade, placesMade, setOpen, type Order,
} from '../src/sim/hundred.ts';
import { limitFor } from '../src/sim/stash.ts';
import { salvage } from '../src/sim/salvage.ts';
import { itemWorth } from '../src/sim/chest.ts';
import { TEMPLATE_BY_KEY, callingOf, schoolOf } from '../src/data/gear.ts';
import { PAIRS, schoolOfAxis, type Pair, type School } from '../src/data/schools.ts';
import { SCHOOL_WAKES } from '../src/sim/balance.ts';

/**
 * 職 How many of each school a build wants on the body: the same rule tools/habits.ts plays.
 */
function quotas(build: School | Pair): Partial<Record<School, number>> {
  const pair = PAIRS.find((p) => p.key === build);
  return pair ? { [pair.a]: SCHOOL_WAKES, [pair.b]: SCHOOL_WAKES } : { [build as School]: SLOTS.length };
}

/**
 * 百形 What a class-builder forges for the class: nothing (the crafter as it was), only the
 * shapes the realm's beasts teach (as the forge was before 2026-10-07), or any shape of a
 * realm whose warden has fallen. tools/anyshape.ts plays all three; the game is the last.
 */
export type Forging = 'none' | 'taught' | 'any';
let forging: Forging = 'any';
export function setForging(f: Forging): void { forging = f; }

/**
 * 職 鑄 The piece a class-builder forges next: for a place the body has nothing of a wanted
 * school in, while that school is short, the newest shape of the school the forge can make
 * and pay for (or feed), unless the chest already holds one of its realm. What a player
 * after a set does at the anvil, with the recipe list grouped by place and school.
 */
function forFor(s: State, build: School | Pair, span: number): string | null {
  const want = quotas(build);
  const counts = callingOf(s.worn).counts;
  const short = (sc: School) => (want[sc] ?? 0) > counts[sc];
  if (forging === 'none' || !(Object.keys(want) as School[]).some(short)) return null;
  for (const slot of SLOTS) {
    const worn = s.worn[slot];
    if (worn && want[schoolOf(worn)] !== undefined) continue;
    const forged = RECIPES.filter((r) => {
      if (r.makes.kind !== 'gear' || !canSet(s, r)) return false;
      if (r.anyShape && (forging === 'taught' || !known(s, r.remains!))) return false;
      const tpl = TEMPLATE_BY_KEY[r.makes.template];
      return tpl?.slot === slot && short(schoolOfAxis(tpl.affix)) && r.realm >= s.realm - 1;
    }).sort((a, b) => b.realm - a.realm || a.level - b.level);
    for (const r of forged) {
      const tpl = TEMPLATE_BY_KEY[(r.makes as { template: string }).template];
      const have = s.chest.some((x) => TEMPLATE_BY_KEY[x.template]?.slot === slot
        && schoolOf(x) === schoolOfAxis(tpl.affix) && TEMPLATE_BY_KEY[x.template].realm >= r.realm);
      if (have) break;
      const t = feed(s, r, span);
      if (t) return t;
    }
  }
  return null;
}

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
  // 封 A realm whose gate seals: the Breakthrough Pill made for it comes before anything,
  // because the seal is the one part of the gate no build opens.
  const pill = sealDays(s.realm) > 0 ? top(RECIPES.filter((r) => r.key === `alchemy:breakthrough${s.realm}`)) : undefined;
  if (pill) out.push(pill);
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
export function pickTask(s: State, span: number, build?: School | Pair, forgeFirst = false): string | null {
  // 戰 The kit first: a hard fight is where the crafts show, so the pouch never runs low.
  for (const r of kitTargets(s)) {
    const it = itemOf(r);
    // 封 One Breakthrough Pill opens one gate, so one in the pouch is stock enough.
    if (!it || stock(s, it) >= (it.startsWith('breakthrough') ? 1 : STOCK)) continue;
    const t = feed(s, r, span);
    if (t) return t;
  }
  // 職 Somebody building a class forges the places their school is short of, next.
  if (build) { const t = forFor(s, build, span); if (t) return t; }
  // 封 A gate that seals ahead, and an Alchemy level short of the Breakthrough Pill made for
  // it: the screen names the level on the recipe, and somebody who means to use the pill
  // levels Alchemy toward it before anything else is levelled.
  const ahead = [s.realm, s.realm + 1].find((r) => sealDays(r) > 0);
  const pillAt = ahead ? RECIPES.find((r) => r.key === `alchemy:breakthrough${ahead}`) : undefined;
  if (pillAt && skillOpen(s, 'alchemy') && levelIn(s, 'alchemy') < pillAt.level) {
    const r = best(s, runnable(s, span, recipesOf('alchemy')));
    if (r) return r.key;
    const top = recipesOf('alchemy').filter((x) => canSet(s, x) && x.makes.kind === 'item').sort((a, b) => b.level - a.level);
    for (const x of top.slice(0, 3)) { const t = feed(s, x, span); if (t) return t; }
  }
  // 百煉 Then the Hundredfold piece in the crucible, if there is one: it, or what feeds it.
  const o = s.crafts.order;
  const piece = o ? orderRecipe(o) : undefined;
  if (piece) { const t = feed(s, piece, span); if (t) return t; }
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
  // 百煉 Somebody chasing the sets levels the forge before the rest.
  const open = SKILL_KEYS.filter((k) => skillOpen(s, k))
    .sort((a, b) => (forgeFirst ? Number(b === 'forge') - Number(a === 'forge') : 0) || levelIn(s, a) - levelIn(s, b));
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
/**
 * 百煉 How a crafter takes the Hundredfold sets: not at all, levelling Forging first like
 * somebody chasing them ('forge'), or keeping all seven crafts level as the workshop's own
 * crafter does and forging the sets as the levels come ('spread').
 */
export type SetChase = false | 'forge' | 'spread';

export function craftVisit(s: State, now: number, span: number, build?: School | Pair, hundred: SetChase = false): State {
  if (!workshopOpen(s)) return s;
  s = work(s, now);
  const slots = arraySlots(levelIn(s, 'array'));
  for (const key of FLOOR_ORDER) {
    if (s.crafts.arrays.length >= slots) break;
    s = placeArray(s, key, true);
  }
  // 百煉 The crucible is filled with the next piece on the plan, if there is one.
  const plan = hundred ? hundredPlan(s) : null;
  // 藏 A set-chaser makes room for the piece: the least worth of what is not kept goes to the melt.
  if (plan && s.chest.length >= limitFor(s) - 1) {
    const spare = s.chest.filter((x) => !x.locked && !x.hundred)
      .sort((a, b) => itemWorth(a) - itemWorth(b)).slice(0, s.chest.length - limitFor(s) + 3);
    s = salvage(s, spare.map((x) => x.id));
  }
  const planned = plan ? { ...s, crafts: { ...s.crafts, order: plan } } : s;
  const want = pickTask(planned, Math.min(span, workSeconds(s)), build, hundred === 'forge');
  if (want === s.crafts.task && (!plan || sameOrder(plan, s.crafts.order))) return s;
  if (plan && want && RECIPE_BY_KEY[want]?.makes.kind === 'hundred') return setOrder(s, plan, now);
  return setTask(plan ? { ...s, crafts: { ...s.crafts, order: plan } } : s, want, now);
}

const sameOrder = (a: Order, b: Order | null | undefined) => !!b && JSON.stringify(a) === JSON.stringify(b);

/**
 * 百煉 The order of a Hundredfold crafter: the lowest realm's set first, each place made at
 * the best rank the forge allows (Heaven once five of the set are made), the shape the one
 * that leads with 力 power where there is one, and every line chosen for the fight, three
 * portions each, from the materials the veins and the knife can give. Null when nothing is
 * left to make or nothing can be made yet.
 */
export function hundredPlan(s: State): Order | null {
  if (!skillOpen(s, 'forge')) return null;
  const forge = levelIn(s, 'forge');
  const ORDER: readonly Affix[] = ['power', 'sunder', 'art', 'rate', 'luck', 'refine', 'find', 'capacity'];
  for (let realm = 1; realm <= s.realm; realm++) {
    if (!setOpen(s.killed, realm)) continue;
    const made = placesMade(s.crafts.made, realm);
    const ranks = HUNDRED_RANKS.filter((r) => hundredLevel(realm, r) <= forge
      && (r !== 'heaven' || piecesMade(s.crafts.made, realm) >= HUNDRED_HEAVEN_MADE));
    for (let i = ranks.length - 1; i >= 0; i--) {
      const rarity: HundredRank = ranks[i];
      const at = HUNDRED_RANKS.indexOf(rarity);
      for (const slot of SLOTS) {
        if (made[slot] >= at) continue;
        const shapes = GEAR.filter((g) => g.realm === realm && g.slot === slot);
        const tpl = shapes.find((g) => g.affix === 'power') ?? shapes[0];
        const axes = ORDER.filter((a) => lineAxes(tpl).includes(a) && materialReached(s, CRUCIBLE[a](realm, rarity)));
        if (axes.length < SECONDARIES[rarity]) continue;
        return { template: tpl.key, rarity, main: 3, lines: axes.slice(0, SECONDARIES[rarity]).map((affix) => ({ affix, n: 3 })) };
      }
    }
  }
  return null;
}

/**
 * 攜 Put the best thing they own in each hand for this fight, judged by the fight's own
 * odds: an elixir first, then a sigil beside it. Nothing carried if nothing helps.
 *
 * 破境 Judged by the odds before the screen's floor, and where those are nothing yet, by
 * how far the kit closes the gap: a fresh wall reads 0% with or without a sigil, and a
 * crafter carries one into it all the same, because each day of bottleneck it breaks is a
 * day sooner through the gate.
 *
 * 劫 `share` is DRAGON_KIT_SHARE unless a harness asks what another would be worth at the
 * Dragon (tools/endgame.ts).
 */
export function carryBest(s: State, b: Beast, where: Where, standing?: number, share?: number): State {
  const owned = Object.entries(s.crafts.pouch).filter(([, n]) => n > 0).map(([k]) => k);
  const chance = (x: State) => {
    const kit = kitFor(x, b, where, share).kit;
    const gap = power(x) * kit.strike / (kit.taken * effectiveBeastPower(x, b, standing, kit.breach ?? 0));
    // 封 A sealed gate is no fight at all, so whatever opens it comes first.
    const open = where === 'warden' && sealed(x) ? 0 : 2;
    return open + oddsRaw(x, b, standing, kit) + 1e-6 * Math.min(1, gap);
  };
  // 破境丹 The pill's hand is the gate's alone; anywhere else it is left as it was.
  for (const hand of HANDS.filter((x) => x !== 'pill' || where === 'warden')) {
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
