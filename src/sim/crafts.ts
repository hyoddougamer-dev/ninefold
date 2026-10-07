/**
 * 業 The workshop, as the simulation sees it: pure, like everything in `sim/`.
 *
 * One task at a time, the way Melvor Idle does it: pick a recipe and it repeats until it
 * is stopped or runs out of something. It is **not ticked**. What the workshop has done is
 * worked out when it is asked, from the instant it was last settled, the same way 洞天 the
 * cave's beds are read from the instant they were planted: so a closed app, a phone that
 * slept and a harness that jumps a day all get the same work, action for action.
 *
 * 眠 It works for CRAFT_WORK_HOURS after the last visit and then stands still, which is
 * what makes coming back worth something without making staying away worth everything.
 * Nothing it made is ever lost, and nothing waits to spoil.
 *
 * 定 Every roll is seeded from the run and the count of that recipe made, never from the
 * clock, so settling every second and settling once a day give the same pouch.
 *
 * 律 Nothing here raises the qi rate or makes qi. The one place a craft could have made
 * qi, melting what the forge makes, is closed: a forged piece is finished, it cannot be
 * fused, and it melts back into its metal. See `unmake`.
 */
import {
  CRAFT_ARRAY_DEPTH_EVERY, CRAFT_ARRAY_DEPTH_STEPS, CRAFT_ARRAY_DEPTH_TOP,
  CRAFT_ARRAY_DOOR, CRAFT_ARRAY_GUARD, CRAFT_ARRAY_QUALITY, CRAFT_ARRAY_SLOTS, CRAFT_ARRAY_SPEED,
  CRAFT_ARRAY_TWICE, CRAFT_ARRAY_XP, CRAFT_FURNACE_DISCOUNT, CRAFT_KIT, CRAFT_LONG_WATCH_HOURS,
  CRAFT_FEED_LEVEL, CRAFT_MARKS, CRAFT_MARK_FASTER, CRAFT_MARK_SUB, CRAFT_MARK_TWICE, CRAFT_MASTERY_BAND,
  CRAFT_MASTERY_SPEED, CRAFT_QUALITY, CRAFT_QUALITY_MULT,
  CRAFT_RENDER_KNOWN, CRAFT_SEEK_MAX, CRAFT_TOOL_STEP, CRAFT_TOOL_STEPS, CRAFT_WORK_HOURS, DEMONS, DEMONS_PER_REALM, VARIANCE,
} from './balance.ts';
import { opensAt } from './unlocks.ts';
import {
  ITEM_BY_KEY, LEVEL_CAP, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_BY_KEY, SKILL_KEYS, TOOL_METALS, XP_CAP,
  BREAKTHROUGH_TIERS, FORGED, arrayKey, breakthroughKey, levelOf, pouchKey, splitKey, tierLevel,
  type Recipe, type SkillKey,
} from '../data/crafts.ts';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import {
  RARITIES, TEMPLATE_BY_KEY, baseValue, roundValue, type Item, type Roll,
} from '../data/gear.ts';
import { rollSecondaries } from './drops.ts';
import { limitFor, stash } from './stash.ts';
import { NO_KIT, type Kit } from './kit.ts';
import type { State } from './state.ts';

export interface Carry {
  /** A pouch key: an elixir, with its rank. */
  readonly elixir: string | null;
  /** A pouch key: a sigil, with its rank. */
  readonly sigil: string | null;
  /**
   * 破境丹 A pouch key: a Breakthrough Pill, with its rank, carried in a hand of its own
   * because it does one thing only, at one gate. Absent in a save from before the seal.
   */
  readonly pill?: string | null;
}

export interface Crafts {
  /** 經 Experience per craft. The level is derived from it, never stored. */
  readonly xp: Readonly<Record<SkillKey, number>>;
  /** The recipe the workshop is making, or null when it is standing still. */
  readonly task: string | null;
  /** 時 The instant the workshop was settled up to. */
  readonly since: number;
  /** 儲物袋 The pouch: everything gathered and made, by key (a graded thing with its rank). */
  readonly pouch: Readonly<Record<string, number>>;
  /** 熟 How many of each recipe have been made: familiarity. */
  readonly made: Readonly<Record<string, number>>;
  /** 具 The best tool held for each craft, as a step 0..6. */
  readonly tools: Readonly<Record<SkillKey, number>>;
  /** 陣 The arrays cut into the floor, by item key. */
  readonly arrays: readonly string[];
  /**
   * 深 How many copies of each array have been cut, by item key: its depth is read off it
   * (CRAFT_ARRAY_DEPTH_EVERY). Kept beside `made` rather than read from it because `made`
   * also holds the light copies of before 2026-10-05, each a CRAFT_ARRAY_WORK'th of one
   * now; a save from before is given its old copies at that worth (see validCrafts).
   */
  readonly cut: Readonly<Record<string, number>>;
  readonly carry: Carry;
  /** 尋 Sure drops waiting for the next beasts beaten on the hunt. */
  readonly seek: number;
}

const zeroSkills = <T>(v: T): Record<SkillKey, T> =>
  Object.fromEntries(SKILL_KEYS.map((k) => [k, v])) as Record<SkillKey, T>;

const RECIPES_OF: Readonly<Record<SkillKey, readonly Recipe[]>> =
  Object.fromEntries(SKILL_KEYS.map((k) => [k, RECIPES.filter((r) => r.skill === k)])) as unknown as Record<SkillKey, readonly Recipe[]>;

export const NO_CRAFTS: Crafts = {
  xp: zeroSkills(0), task: null, since: 0, pouch: {}, made: {},
  tools: zeroSkills(0), arrays: [], cut: {}, carry: { elixir: null, sigil: null, pill: null }, seek: 0,
};

/* ── 讀 Reading the workshop ─────────────────────────────────────────────── */

/**
 * 開 The craft whose level opens each late craft before its realm does: Alchemy from Herb
 * Gathering, Sigil Writing from Vein Delving, Arrays from Forging, at CRAFT_FEED_LEVEL.
 * The four first crafts open by realm alone, so a feeder is always open when it counts.
 */
export const FEEDER: Readonly<Partial<Record<SkillKey, SkillKey>>> = { alchemy: 'herb', sigil: 'vein', array: 'forge' };

/**
 * 開 Whether a craft is open at this realm with these levels: its realm, or its feeder at
 * CRAFT_FEED_LEVEL. One rule, read by the game and by validate() alike, so a save can
 * never hold a craft the screen would not have opened. Every recipe keeps its own realm.
 */
export function openBy(realm: number, skill: SkillKey, level: (k: SkillKey) => number): boolean {
  if (realm >= SKILL_BY_KEY[skill].realm) return true;
  const f = FEEDER[skill];
  return !!f && realm >= SKILL_BY_KEY[f].realm && level(f) >= CRAFT_FEED_LEVEL;
}

export function skillOpen(s: State, skill: SkillKey): boolean {
  return openBy(s.realm, skill, (k) => levelOf(s.crafts.xp[k] ?? 0));
}

export function workshopOpen(s: State): boolean {
  return SKILLS.some((k) => skillOpen(s, k.key));
}

export function levelIn(s: State, skill: SkillKey): number {
  return levelOf(s.crafts.xp[skill] ?? 0);
}

/** 榜 The seven levels added up, 7 to 693: the number the Crafts Board is ordered by. */
export function totalLevel(s: State): number {
  return SKILL_KEYS.reduce((n, k) => n + levelIn(s, k), 0);
}

/** 解 How many of a beast have to fall before Rendering knows it: ten of a common, one warden. */
export function knownAt(beast: string): number {
  return WARDEN_KEYS.has(beast) ? 1 : CRAFT_RENDER_KNOWN;
}
const WARDEN_KEYS = new Set(BEASTS.filter((b) => b.warden).map((b) => b.key));

/** 解 Whether Rendering knows a beast: enough of it have fallen. See CRAFT_RENDER_KNOWN. */
export function known(s: State, beast: string): boolean {
  return (s.killed[beast] ?? 0) >= knownAt(beast);
}

export function held(s: State, key: string): number {
  if (key === 'mat') return s.materials;
  return s.crafts.pouch[key] ?? 0;
}

/**
 * 熟 How many of a recipe's five marks it has. A pill or a sigil counts each make as
 * CRAFT_KIT_WORK light ones (Recipe.marks), so a mark takes the hours it always did.
 */
export function marksOf(s: State, r: Recipe): number {
  const n = s.crafts.made[r.key] ?? 0;
  return r.marks.filter((m) => n >= m).length;
}

/** 熟 Whether a recipe's make can come out twice: a thing for the pouch, never an array. */
export function doubles(r: Recipe): boolean {
  return r.makes.kind === 'item' && ITEM_BY_KEY[r.makes.item]?.kind !== 'array';
}

/**
 * 熟 Whether mark `i` (1 to 5) does its own thing for this recipe: the first always, the
 * second if it doubles, the third if it needs more than one of its first thing, the
 * fourth and fifth if it makes a thing with a rank.
 */
export function markApplies(r: Recipe, i: number): boolean {
  if (i === 1) return true;
  if (i === 2) return doubles(r);
  if (i === 3) return r.needs.length > 0 && r.needs[0][1] > r.weight;
  return !!r.graded;
}

/**
 * 熟 The marks that stand in for one that would do nothing (see CRAFT_MARK_SUB): how many
 * make it faster, and how much more chance of two they add.
 */
export function subsOf(s: State, r: Recipe): { readonly fast: number; readonly twice: number } {
  const m = marksOf(s, r);
  let fast = 0, twice = 0;
  for (let i = 2; i <= m; i++) {
    if (markApplies(r, i)) continue;
    if (doubles(r)) twice += CRAFT_MARK_SUB; else fast++;
  }
  return { fast, twice };
}

/** 熟 The chance one make of this recipe comes out twice, from its marks. */
export function twiceOf(s: State, r: Recipe): number {
  return (marksOf(s, r) >= 2 && doubles(r) ? CRAFT_MARK_TWICE : 0) + subsOf(s, r).twice;
}

/** 熟 How many of a craft's recipes have every mark: the count its mastery is read from. */
export function masteredIn(s: State, skill: SkillKey): number {
  let n = 0;
  for (const r of RECIPES_OF[skill]) if ((s.crafts.made[r.key] ?? 0) >= r.marks[r.marks.length - 1]) n++;
  return n;
}

/**
 * 熟 How much faster `n` recipes mastered make their craft: CRAFT_MASTERY_SPEED each for
 * the first CRAFT_MASTERY_BAND, and each band after that half what the one before gave a
 * recipe. It rises with every recipe and never reaches CRAFT_MASTERY_BOUND.
 */
export function masteryFor(n: number): number {
  let sum = 0, each = CRAFT_MASTERY_SPEED;
  for (let left = Math.max(0, Math.floor(n)); left > 0; left -= CRAFT_MASTERY_BAND, each /= 2) {
    sum += Math.min(left, CRAFT_MASTERY_BAND) * each;
  }
  return sum;
}

/** 熟 How much faster a craft's mastery makes every recipe of it: see masteryFor. */
export function masteryOf(s: State, skill: SkillKey): number {
  return masteryFor(masteredIn(s, skill));
}

/** 熟 The most a craft's mastery can ever be: every recipe it has, mastered. */
export function masteryMost(skill: SkillKey): number {
  return masteryFor(RECIPES_OF[skill].length);
}

export function placed(s: State, key: string): boolean {
  return s.crafts.arrays.includes(arrayKey(key));
}

/** 深 How many copies of an array have been cut. */
export function cutOf(s: State, key: string): number {
  return s.crafts.cut?.[arrayKey(key)] ?? 0;
}

/** 深 An array's depth, 0 to CRAFT_ARRAY_DEPTH_STEPS: one step every CRAFT_ARRAY_DEPTH_EVERY copies. */
export function depthOf(s: State, key: string): number {
  return Math.min(CRAFT_ARRAY_DEPTH_STEPS, Math.floor(cutOf(s, key) / CRAFT_ARRAY_DEPTH_EVERY));
}

/** 深 How many more copies to the next step, or 0 at full depth. */
export function toNextDepth(s: State, key: string): number {
  if (depthOf(s, key) >= CRAFT_ARRAY_DEPTH_STEPS) return 0;
  return CRAFT_ARRAY_DEPTH_EVERY - (cutOf(s, key) % CRAFT_ARRAY_DEPTH_EVERY);
}

/** 深 What a depth multiplies an array's effect by: 1 at the first copy, CRAFT_ARRAY_DEPTH_TOP at full depth. */
export function depthStrength(depth: number): number {
  const d = Math.max(0, Math.min(CRAFT_ARRAY_DEPTH_STEPS, depth));
  return 1 + (CRAFT_ARRAY_DEPTH_TOP - 1) * d / CRAFT_ARRAY_DEPTH_STEPS;
}

/** 陣 How strongly a placed array works for this cultivator: 0 when it is not in the floor. */
export function arrayStrength(s: State, key: string): number {
  return placed(s, key) ? depthStrength(depthOf(s, key)) : 0;
}

/** 陣 How many arrays the floor holds at this Arrays level. */
export function arraySlots(level: number): number {
  let n = 0;
  for (const [at, slots] of CRAFT_ARRAY_SLOTS) if (level >= at) n = slots;
  return n;
}

/** 具 How much faster the tool this cultivator holds makes the craft. */
function toolFactor(s: State, skill: SkillKey): number {
  return 1 - CRAFT_TOOL_STEP * Math.max(0, Math.min(CRAFT_TOOL_STEPS, s.crafts.tools[skill] ?? 0));
}

/** 陣 And the arrays that speed a craft, as deep as they are. */
function arrayFactor(s: State, skill: SkillKey): number {
  const key = skill === 'herb' ? 'dew' : skill === 'vein' ? 'earthvein'
    : skill === 'forge' || skill === 'alchemy' ? 'firetame' : null;
  return key ? 1 - CRAFT_ARRAY_SPEED * arrayStrength(s, key) : 1;
}

/** 時 Seconds one make of this recipe takes, for this cultivator, now. */
export function secondsOf(s: State, r: Recipe): number {
  return r.seconds * toolFactor(s, r.skill) * arrayFactor(s, r.skill)
    * (marksOf(s, r) >= 1 ? 1 - CRAFT_MARK_FASTER : 1)
    * (1 - CRAFT_MARK_SUB) ** subsOf(s, r).fast
    * (1 - masteryOf(s, r.skill));
}

/** 經 The experience one make pays this cultivator. */
export function xpOf(s: State, r: Recipe): number {
  return r.xp * (1 + CRAFT_ARRAY_XP * arrayStrength(s, 'heavenearth'));
}

/** 眠 How long the workshop keeps going after the last visit, in seconds. */
export function workSeconds(s: State): number {
  return (CRAFT_WORK_HOURS + CRAFT_LONG_WATCH_HOURS * arrayStrength(s, 'longwatch')) * 3600;
}

/**
 * 熟 What a make needs, with the third mark's one fewer of the first thing: one light
 * make's worth, so a pill or a sigil (Recipe.weight) asks for that many fewer.
 */
export function needsOf(s: State, r: Recipe): readonly (readonly [string, number])[] {
  const less = marksOf(s, r) >= 3;
  return r.needs.map(([k, n], i) => [k, i === 0 && less && n > r.weight ? n - r.weight : n] as const);
}

export type Blocked = 'shut' | 'level' | 'realm' | 'needs' | 'remains' | 'chest' | 'tool' | null;

/** Why a recipe cannot be made right now, or null if it can. The screen says each one. */
export function blocked(s: State, r: Recipe): Blocked {
  if (!skillOpen(s, r.skill)) return 'shut';
  if (levelIn(s, r.skill) < r.level) return 'level';
  if (s.realm < r.realm) return 'realm';
  if (r.makes.kind === 'tool' && (s.crafts.tools[r.makes.skill] ?? 0) >= r.makes.step) return 'tool';
  if (r.remains && !known(s, r.remains)) return 'remains';
  if (needsOf(s, r).some(([k, n]) => held(s, k) < n)) return 'needs';
  if (r.makes.kind === 'gear' && s.chest.length >= limitFor(s)) return 'chest';
  return null;
}

/** Whether a recipe could be set going at all: open, levelled and reached, whatever is in the pouch. */
export function canSet(s: State, r: Recipe): boolean {
  const b = blocked(s, r);
  return b === null || b === 'needs' || b === 'remains' || b === 'chest';
}

/* ── 品 Quality ─────────────────────────────────────────────────────────── */

/**
 * 品 The odds of each rank, from how far above the recipe and how familiar. `palace` is
 * how strongly the Nine Palaces Array works (arrayStrength): 0 without it.
 */
export function qualityOdds(above: number, marks: number, palace = 0): readonly number[] {
  const q = CRAFT_QUALITY;
  const score = Math.max(0, above) + marks * q.mark + (marks >= 4 ? q.mark : 0) + CRAFT_ARRAY_QUALITY * palace;
  const w = [
    marks >= 5 ? 0 : 100,
    q.spiritBase + score * q.spiritPer,
    score >= q.mysticFrom ? q.mysticBase + (score - q.mysticFrom) * q.mysticPer : 0,
    score >= q.earthFrom ? (score - q.earthFrom) * q.earthPer : 0,
    score >= q.heavenFrom ? (score - q.heavenFrom) * q.heavenPer : 0,
  ];
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

export function qualityFor(s: State, r: Recipe): readonly number[] {
  return qualityOdds(levelIn(s, r.skill) - r.level, marksOf(s, r), arrayStrength(s, 'ninepalace'));
}

/* ── 定 Seeded rolls ─────────────────────────────────────────────────────── */

/** A 32-bit hash of the run, the recipe and how many of it have been made. */
function seedOf(s: State, r: Recipe, n: number): number {
  let h = 2166136261 ^ Math.floor(s.startedAt);
  for (let i = 0; i < r.key.length; i++) h = Math.imul(h ^ r.key.charCodeAt(i), 16777619);
  h = Math.imul(h ^ n, 2246822507);
  h ^= h >>> 13;
  return h >>> 0;
}

function dice(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(odds: readonly number[], roll: number): number {
  let at = roll;
  for (let i = 0; i < odds.length; i++) {
    at -= odds[i];
    if (at < 0) return i;
  }
  return odds.length - 1;
}

/* ── 作 Making ──────────────────────────────────────────────────────────── */

function addTo(pouch: Record<string, number>, key: string, n: number): void {
  const v = (pouch[key] ?? 0) + n;
  if (v > 0) pouch[key] = v; else delete pouch[key];
}

/**
 * 器 A forged piece: the template chosen, the rank from the forge's quality. It is marked
 * as forged, which is what keeps it out of fusion and out of the melt for qi.
 */
function forged(s: State, r: Recipe, template: string, rank: number, d: () => number): Item | null {
  const tpl = TEMPLATE_BY_KEY[template];
  if (!tpl) return null;
  const rarity = RARITIES[Math.max(0, Math.min(RARITIES.length - 1, rank))];
  const swing = 1 - VARIANCE + d() * VARIANCE * 2;
  const primary: Roll = { affix: tpl.affix, value: roundValue(tpl.affix, baseValue(tpl, rarity, tpl.affix) * swing) };
  return {
    id: `forge-${(s.crafts.made[r.key] ?? 0).toString(36)}-${template}-${seedOf(s, r, -1).toString(36)}`,
    template, rarity, rolls: [primary, ...rollSecondaries(tpl, rarity, d)], from: FORGED,
  };
}


/** One make of a recipe, which is assumed to be unblocked. */
function makeOne(s: State, r: Recipe): State {
  const c = s.crafts;
  const n = c.made[r.key] ?? 0;
  const d = dice(seedOf(s, r, n));
  const pouch: Record<string, number> = { ...c.pouch };
  let materials = s.materials;
  for (const [k, m] of needsOf(s, r)) {
    if (k === 'mat') materials -= m; else addTo(pouch, k, -m);
  }
  const tools = r.makes.kind === 'tool'
    ? { ...c.tools, [r.makes.skill]: Math.max(c.tools[r.makes.skill] ?? 0, r.makes.step) } : c.tools;

  const rank = r.graded ? pick(qualityFor(s, r), d()) : -1;
  let out: State = { ...s, materials };
  if (r.makes.kind === 'item') {
    const chance = twiceOf(s, r);
    const twice = (chance > 0 && d() < chance)
      || (r.skill === 'render' && placed(s, 'keenedge') && d() < CRAFT_ARRAY_TWICE * arrayStrength(s, 'keenedge'));
    addTo(pouch, pouchKey(r.makes.item, r.graded ? rank : undefined), twice ? 2 : 1);
  } else if (r.makes.kind === 'gear') {
    const piece = forged(s, r, r.makes.template, rank, d);
    if (piece) out = stash(out, piece).state;
  }
  const xp = Math.min(XP_CAP, (c.xp[r.skill] ?? 0) + xpOf(s, r));
  // 深 An array cut is a copy toward its depth.
  const item = r.makes.kind === 'item' ? r.makes.item : null;
  const cut = item && ITEM_BY_KEY[item]?.kind === 'array' ? { ...c.cut, [item]: (c.cut[item] ?? 0) + 1 } : c.cut;
  return {
    ...out,
    crafts: {
      ...c, pouch, tools, cut,
      made: { ...c.made, [r.key]: n + 1 },
      xp: { ...c.xp, [r.skill]: xp },
    },
  };
}

/**
 * 時 Settle the workshop up to `now`: every make the time allows, one at a time, until the
 * time or the materials run out.
 *
 * It works up to workSeconds() past the instant it was last settled and stands still
 * after that. A make that is only part done when the time runs out is kept as part done
 * (the instant moves by whole makes), unless the workshop hit its limit, when the rest of
 * the absence is simply time it stood still.
 *
 * A task that cannot be made (nothing to render, the pouch empty) stays set and waits:
 * the instant moves to now, so what arrives later is not paid for time it was not there.
 */
export function work(s: State, now: number): State {
  return settle(s, now).state;
}

/**
 * 停 Why the workshop stood still, if it did.
 *
 *   'needs', 'chest', 'remains'  the task was set and waited for what it needs;
 *   'idle'     there was no task, or the one set could not be made any more (a tool
 *              already held clears itself after its one make);
 *   'limit'    it worked its CRAFT_WORK_HOURS after the last visit and then rested.
 *
 * None of these is a loss: nothing made is taken back, and nothing waits to spoil.
 */
export type Stood = 'needs' | 'chest' | 'remains' | 'idle' | 'limit';

export interface Settled {
  readonly state: State;
  /** Why it stopped making, or null if it was still working at `now`. */
  readonly stood: Stood | null;
  /** 時 The instant it stopped making, when it did. */
  readonly stoodFrom: number | null;
}

/**
 * 時 work(), with the report the 歸 return card reads: why it stopped and since when.
 * The state it hands back is exactly what work() always handed back; the report is read
 * off the same loop, so the card and the pouch can never disagree.
 */
export function settle(s: State, now: number): Settled {
  const c = s.crafts;
  if (!Number.isFinite(now)) return { state: s, stood: null, stoodFrom: null };
  if (!c.task) {
    return { state: c.since === now ? s : { ...s, crafts: { ...c, since: now } }, stood: 'idle', stoodFrom: c.since };
  }
  const r = RECIPE_BY_KEY[c.task];
  if (!r || !canSet(s, r)) {
    return { state: { ...s, crafts: { ...c, task: null, since: now } }, stood: 'idle', stoodFrom: c.since };
  }
  if (now <= c.since) return { state: s, stood: null, stoodFrom: null };

  const end = Math.min(now, c.since + workSeconds(s));
  let out = s;
  let at = c.since;
  let stood: Stood | null = null;
  let stoodFrom: number | null = null;
  // 守 A day's worth of the fastest recipe is under thirty thousand makes; this is only a
  // guard against a clock that has gone somewhere a clock cannot go.
  for (let guard = 0; guard < 200_000; guard++) {
    const t = secondsOf(out, r);
    if (at + t > end) break;
    const b = blocked(out, r);
    if (b !== null) {
      stood = b === 'needs' || b === 'chest' || b === 'remains' ? b : 'idle';
      stoodFrom = at;
      at = now;
      break;
    }
    out = makeOne(out, r);
    at += t;
  }
  // The workshop stood still at its limit: the rest of the absence is not owed, and the
  // make that was half done when it stopped is dropped rather than finished on return.
  // 待 The loop can also end on the clock with the pouch already empty: the next make
  // was due after `now`, and it could not have started anyway. That is a wait, not work.
  if (stood === null) {
    const b = blocked(out, r);
    if (b === 'needs' || b === 'chest' || b === 'remains') { stood = b; stoodFrom = at; }
    else if (end < now) { stood = 'limit'; stoodFrom = end; }
  }
  const since = end < now ? now : at;
  return { state: { ...out, crafts: { ...out.crafts, since: Math.min(now, since) } }, stood, stoodFrom };
}

/** 作 Set the workshop going on a recipe. Settles what was running first. */
export function setTask(s: State, key: string | null, now: number): State {
  const settled = work(s, now);
  if (key === null) return { ...settled, crafts: { ...settled.crafts, task: null, since: now } };
  const r = RECIPE_BY_KEY[key];
  if (!r || !canSet(settled, r)) return settled;
  return { ...settled, crafts: { ...settled.crafts, task: key, since: now } };
}

/** How far through the make in hand, 0..1, for the bar on the screen. */
export function progressOf(s: State, now: number): number {
  const c = s.crafts;
  const r = c.task ? RECIPE_BY_KEY[c.task] : undefined;
  if (!r || blocked(s, r) !== null) return 0;
  return Math.max(0, Math.min(1, (now - c.since) / secondsOf(s, r)));
}

/* ── 陣 Arrays ───────────────────────────────────────────────────────────── */

/** Cut an array into the floor, or lift it out again. Lifting it is free and it is kept. */
export function placeArray(s: State, key: string, on: boolean): State {
  const k = arrayKey(key);
  const c = s.crafts;
  if (!on) return c.arrays.includes(k) ? { ...s, crafts: { ...c, arrays: c.arrays.filter((x) => x !== k) } } : s;
  if (c.arrays.includes(k) || (c.pouch[k] ?? 0) < 1 || !skillOpen(s, 'array')) return s;
  if (c.arrays.length >= arraySlots(levelIn(s, 'array'))) return s;
  return { ...s, crafts: { ...c, arrays: [...c.arrays, k] } };
}

/* ── 戰 Carrying ─────────────────────────────────────────────────────────── */

const SIGIL_CARRIED = new Set(['warding', 'thunder', 'binding', 'mirror', 'purity', 'fivethunder', 'soullock', 'heavenseal']);
const ELIXIR_CARRIED = new Set(['calmheart', 'nineturn']);
const PILL_CARRIED = new Set(BREAKTHROUGH_TIERS.map(breakthroughKey));

/** The three hands: an elixir, a sigil, and 破境丹 a Breakthrough Pill for the gate. */
export type Hand = 'elixir' | 'sigil' | 'pill';
export const HANDS: readonly Hand[] = ['elixir', 'sigil', 'pill'];

/** Whether a pouch key can be carried into a fight, and in which hand. */
export function carrySlot(key: string): Hand | null {
  const { key: k, quality } = splitKey(key);
  const it = ITEM_BY_KEY[k];
  if (!it || quality === null) return null;
  if (PILL_CARRIED.has(k)) return 'pill';
  if (it.kind === 'elixir' && (/^(mend|guard|might)\d$/.test(k) || ELIXIR_CARRIED.has(k))) return 'elixir';
  if (it.kind === 'sigil' && SIGIL_CARRIED.has(k.slice('sigil:'.length))) return 'sigil';
  return null;
}

/** Carry a thing from the pouch into the next hard fight, or put it back (null). */
export function carry(s: State, hand: Hand, key: string | null): State {
  if (key !== null && (carrySlot(key) !== hand || (s.crafts.pouch[key] ?? 0) < 1)) return s;
  return { ...s, crafts: { ...s.crafts, carry: { ...s.crafts.carry, [hand]: key } } };
}

/**
 * 破境 The most days of a warden's bottleneck the pouch could break, one of each hand at
 * best: what the screen offers when nothing is carried yet, so "carry one" names a number.
 */
export function breachHeld(s: State, b: Beast): number {
  let best = { elixir: 0, sigil: 0, pill: 0 };
  for (const [key, n] of Object.entries(s.crafts.pouch)) {
    const hand = n > 0 ? carrySlot(key) : null;
    if (!hand) continue;
    const alone = carry(carry(carry(s, 'elixir', null), 'sigil', null), 'pill', null);
    const days = kitFor(carry(alone, hand, key), b, 'warden').kit.breach ?? 0;
    if (days > best[hand]) best = { ...best, [hand]: days };
  }
  return best.elixir + best.sigil + best.pill;
}

/**
 * 封 The most days of the gate's seal the pouch could break: the best Breakthrough Pill
 * held, read at this realm's warden. What the gate's card offers when none is carried.
 */
export function unsealHeld(s: State): number {
  let best = 0;
  const b = BEASTS.find((x) => x.warden && x.realm === s.realm);
  if (!b) return 0;
  for (const [key, n] of Object.entries(s.crafts.pouch)) {
    if (n <= 0 || carrySlot(key) !== 'pill') continue;
    best = Math.max(best, kitFor(carry(s, 'pill', key), b, 'warden').kit.unseal ?? 0);
  }
  return best;
}

/** 封 Days of the seal the Breakthrough Pill carried counts as at this realm's gate, or 0. */
export function unsealCarried(s: State): number {
  const b = BEASTS.find((x) => x.warden && x.realm === s.realm);
  return b ? kitFor(s, b, 'warden').kit.unseal ?? 0 : 0;
}

/** 尋 Use a Seeking Sigil or burn incense: the next beast beaten on the hunt leaves a piece. */
export function takeSeeking(s: State, key: string): State {
  const k = splitKey(key).key;
  if ((k !== 'sigil:seeking' && k !== 'seekincense') || (s.crafts.pouch[key] ?? 0) < 1) return s;
  if (s.crafts.seek >= CRAFT_SEEK_MAX) return s;
  const pouch = { ...s.crafts.pouch };
  addTo(pouch, key, -1);
  return { ...s, crafts: { ...s.crafts, pouch, seek: s.crafts.seek + 1 } };
}

/** 尋 Spend one waiting sure drop, if there is one. The caller asks before rolling the drop. */
export function spendSeek(s: State): State {
  return s.crafts.seek > 0 ? { ...s, crafts: { ...s.crafts, seek: s.crafts.seek - 1 } } : s;
}

export type Where = 'warden' | 'demon' | 'vault' | 'platform' | 'tower';

/**
 * 戰 Which fights a kit may enter. Never the Dragon above the ninth realm and never a
 * common beast on the hunt. 擂 A challenger on the Platform is a hard fight like a warden:
 * what is carried changes it, which is one of the ways past a loss when the dice are set
 * for the period. 塔 A tower floor is one too since 2026-10-05 (see CRAFT_KIT), and there
 * the climber chooses it on the floor's card, since a hundred floors would otherwise spend
 * an hour's pill on every one of them.
 */
export function kitWhere(s: State, b: Beast, standing?: number): Where | null {
  if (b.key === 'heartdemon') return 'demon';
  if (b.challenger !== undefined) return 'platform';
  if (standing !== undefined) return 'tower';
  if (b.warden && !(b.key === 'dragon' && s.realm === 9)) return 'warden';
  return null;
}


/**
 * 級 The realm a fight is read in, for a kit's tier: the beast's own, and the cultivator's
 * for 心魔 the demon and 塔 a floor. A floor's beast stands at the tower's own power, nine
 * floors to a realm and on past the ninth, so read by the floor a climber at the fifth
 * realm meets seventh- and ninth-realm fights, and their own realm's pill worked at a
 * quarter of itself or less: measured with tools/towerkit.ts (2026-10-05), a pill or a
 * sigil made for the realm moved the floor reached by nothing before the ninth realm. A
 * pill is made for the climber's realm, so up the tower it is read there.
 */
function fightRealmOf(s: State, b: Beast, where: Where): number {
  return where === 'demon' || where === 'tower' ? s.realm : b.realm;
}

/** 級 What a tier-N thing is worth in a realm-M fight: full at or below its tier, half a realm above. */
function fade(tier: number, fightRealm: number): number {
  return fightRealm <= tier ? 1 : CRAFT_KIT.fade ** (fightRealm - tier);
}

/** 攜 The pouch keys that took part in a fight, one per hand: only these are spent. */
export interface Used {
  readonly elixir: string | null;
  readonly sigil: string | null;
  /** 破境丹 The Breakthrough Pill, at a warden only. */
  readonly pill?: string | null;
}

export interface Carried {
  readonly kit: Kit;
  /** Whether anything carried was put into this fight, and so is spent if it is won. */
  readonly spends: boolean;
  /**
   * Which of the two hands did something here. A hand that did nothing is not spent: a
   * Purity Sigil carried beside an elixir into a warden used to be spent with the elixir,
   * though it only ever works on a heart demon.
   */
  readonly used: Used;
}

export const NOT_USED: Used = { elixir: null, sigil: null, pill: null };

/**
 * 戰 The kit a fight is fought with: what is carried, and the Guardian Array under the
 * floor. The array is not carried and never spent.
 */
export function kitFor(s: State, b: Beast, where: Where | null): Carried {
  if (!where) return { kit: NO_KIT, spends: false, used: NOT_USED };
  const fightRealm = Math.max(1, Math.min(9, fightRealmOf(s, b, where)));
  let strike = 1, taken = 1, mend = 0, demon = 1, reflect = 0, breach = 0, unseal = 0;
  let bind = false, revive = false, spends = false;
  let usedElixir: string | null = null, usedSigil: string | null = null, usedPill: string | null = null;

  const e = s.crafts.carry.elixir;
  if (e && (s.crafts.pouch[e] ?? 0) > 0) {
    const { key, quality } = splitKey(e);
    const it = ITEM_BY_KEY[key];
    const q = CRAFT_QUALITY_MULT[quality ?? 0];
    const f = it ? fade(it.realm, fightRealm) : 0;
    const line = /^(mend|guard|might)\d$/.exec(key)?.[1];
    if (line === 'mend') { mend += CRAFT_KIT.mend * q * f; spends = true; }
    if (line === 'guard') { taken *= 1 - CRAFT_KIT.guard * q * f; spends = true; }
    if (line === 'might') { strike *= 1 + CRAFT_KIT.might * q * f; spends = true; }
    if (key === 'calmheart' && where === 'demon') { demon *= 1 - CRAFT_KIT.calmHeart * q; spends = true; }
    if (key === 'nineturn') { revive = true; spends = true; }
    if (spends) usedElixir = e;
    // 破境 Whatever an elixir does at a warden, it also breaks the bottleneck.
    if (spends && where === 'warden') breach += CRAFT_KIT.breach * q * f;
  }
  const g = s.crafts.carry.sigil;
  if (g && (s.crafts.pouch[g] ?? 0) > 0) {
    const before = spends;
    spends = false;
    const { key, quality } = splitKey(g);
    const it = ITEM_BY_KEY[key];
    const q = CRAFT_QUALITY_MULT[quality ?? 0];
    const f = it ? fade(it.realm, fightRealm) : 0;
    switch (key.slice('sigil:'.length)) {
      case 'warding': taken *= 1 - CRAFT_KIT.warding * q * f; spends = true; break;
      case 'thunder': strike *= 1 + CRAFT_KIT.thunder * q * f; spends = true; break;
      case 'fivethunder': strike *= 1 + CRAFT_KIT.fiveThunders * q * f; spends = true; break;
      case 'binding': bind = true; spends = true; break;
      case 'mirror': reflect += CRAFT_KIT.mirror * q * f; spends = true; break;
      case 'purity': if (where === 'demon') { demon *= 1 - CRAFT_KIT.purity * q; spends = true; } break;
      // 鎖魂 Only where it can count twice: with one demon left in the realm it would count
      // once like any other, so it stays in the pouch.
      case 'soullock': if (where === 'demon' && demonsLeft(s) >= 2) spends = true; break;
      case 'heavenseal':
        taken *= 1 - CRAFT_KIT.warding * q * f;
        strike *= 1 + CRAFT_KIT.thunder * q * f;
        spends = true;
        break;
    }
    if (spends) usedSigil = g;
    if (spends && where === 'warden') breach += CRAFT_KIT.breach * q * f;
    spends = spends || before;
  }
  // 破境丹 The Breakthrough Pill does one thing, at the gate of a realm with a bottleneck or a
  // seal: it counts as days of both. Anywhere else it takes no part and is never spent.
  const p = s.crafts.carry.pill;
  if (p && where === 'warden' && b.realm === s.realm && b.realm < 9 && (s.crafts.pouch[p] ?? 0) > 0) {
    const { key, quality } = splitKey(p);
    const it = ITEM_BY_KEY[key];
    if (it && PILL_CARRIED.has(key)) {
      const days = CRAFT_KIT.unseal * CRAFT_QUALITY_MULT[quality ?? 0] * fade(it.realm, fightRealm);
      unseal += days;
      breach += days;
      usedPill = p;
      spends = true;
    }
  }
  if (where === 'warden' || where === 'demon') taken *= 1 - CRAFT_ARRAY_GUARD * arrayStrength(s, 'guardian');
  return {
    kit: { strike, taken, mend, bind, reflect, revive, demon, wound: 0, breach, unseal },
    spends, used: { elixir: usedElixir, sigil: usedSigil, pill: usedPill },
  };
}

/**
 * 心魔 Demons this realm still has to let out. The same sum as seclusion.ts's demonsFor,
 * written here because seclusion.ts reads the state and the state reads this file;
 * crafts.test holds the two to each other.
 */
export function demonsLeft(s: Pick<State, 'realm' | 'demons'>): number {
  return Math.min(DEMONS, Math.max(0, (s.realm - opensAt('seclusion') + 1) * DEMONS_PER_REALM)) - s.demons;
}

/** 鎖魂 Whether a Soul-Lock Sigil is carried, so a fallen heart demon counts twice. */
export function soulLocked(s: State): boolean {
  const g = s.crafts.carry.sigil;
  return !!g && splitKey(g).key === 'sigil:soullock' && (s.crafts.pouch[g] ?? 0) > 0;
}

/**
 * 戰 A won fight spends what took part in it (see Carried.used): one of each, and a hand
 * that runs out is empty again. A lost one spends nothing, because losing costs nothing.
 * The keys are the ones read when the fight began, so nothing changed in the pouch while
 * it was being fought can be spent in their place.
 */
/**
 * 九轉 What a won fight actually spends. Every other elixir works in every round it is
 * carried, but the Nine-Turn Pill does one thing, once, and only if the cultivator
 * falls: a win that never needed it has not used it. The rule the screen states is "a win
 * spends whichever took part", and a pill still in the pouch at the end took no part.
 */
export function tookPart(used: Used, revived: boolean): Used {
  return used.elixir && splitKey(used.elixir).key === 'nineturn' && !revived ? { ...used, elixir: null } : used;
}

export function spendKit(s: State, used: Used): State {
  const c = s.crafts;
  const pouch = { ...c.pouch };
  let { elixir, sigil } = c.carry;
  let pill = c.carry.pill ?? null;
  for (const k of [used.elixir, used.sigil, used.pill ?? null]) {
    if (!k || (pouch[k] ?? 0) < 1) continue;
    addTo(pouch, k, -1);
    if (!pouch[k]) { if (elixir === k) elixir = null; if (sigil === k) sigil = null; if (pill === k) pill = null; }
  }
  return { ...s, crafts: { ...c, pouch, carry: { elixir, sigil, pill } } };
}

/**
 * 業 A won fight's reward, and its kit spent only if the reward landed. `after` is what
 * the reward made of `before`: a reward that refused (a Platform challenger beaten just as
 * the week turned, a floor already counted, a demon no longer due) hands back the same
 * state, and a fight that paid nothing has spent nothing either. A loss never calls this.
 */
export function spendOnWin(before: State, after: State, used: Used): State {
  return after === before ? before : spendKit(after, used);
}

/**
 * 戰 The strongest kit this cultivator's crafts could possibly put into a fight: Heaven
 * rank of the best elixir and sigil their levels and realm allow. 驗 the server reads it,
 * because it sees a warden beaten and not what was carried into the fight.
 */
export function bestKit(s: State, b: Beast, where: Where): Kit {
  const alch = skillOpen(s, 'alchemy') ? levelIn(s, 'alchemy') : 0;
  const sig = skillOpen(s, 'sigil') ? levelIn(s, 'sigil') : 0;
  const top = CRAFT_QUALITY_MULT[CRAFT_QUALITY_MULT.length - 1];
  const tier = Math.max(0, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].filter((t) => tierLevel(t) + 6 <= alch && t <= s.realm));
  const f = tier > 0 ? fade(tier, fightRealmOf(s, b, where)) : 0;
  const five = sig >= (RECIPE_BY_KEY['sigil:fivethunder']?.level ?? 99) && s.realm >= 7;
  const thunder = sig >= (RECIPE_BY_KEY['sigil:thunder']?.level ?? 99);
  const strike = (1 + CRAFT_KIT.might * top * f)
    * (1 + (five ? CRAFT_KIT.fiveThunders : thunder ? CRAFT_KIT.thunder : 0) * top);
  const guard = tier > 0 ? 1 - CRAFT_KIT.guard * top * f : 1;
  if (where === 'tower') {
    // 塔 Up the tower only what these levels could have made, and no Guardian Array, which
    // works on wardens and demons alone. The wardens' reading below is looser (a mend and a
    // Warding Sigil for anybody) and stays so; a floor's verdict is also the line between
    // waiting and counting, so it is read as the levels allow (tools/towerkit.ts).
    // A level is 1 before anything is made, so the first recipes ask for experience earned.
    const wrote = sig > 0 && (s.crafts.xp.sigil ?? 0) > 0;
    const brewed = alch > 0 && (s.crafts.xp.alchemy ?? 0) > 0;
    const ward = wrote ? 1 - CRAFT_KIT.warding * top : 1;
    const bind = sig >= (RECIPE_BY_KEY['sigil:binding']?.level ?? 99) && s.realm >= 4;
    const mirror = sig >= (RECIPE_BY_KEY['sigil:mirror']?.level ?? 99) && s.realm >= 5 ? CRAFT_KIT.mirror * top : 0;
    return { ...NO_KIT, strike, taken: Math.min(guard, ward), mend: brewed ? CRAFT_KIT.mend * top : 0, bind,
      reflect: mirror, revive: alch >= (RECIPE_BY_KEY['alchemy:nineturn']?.level ?? 99) && s.realm >= 9 };
  }
  // 深 The Guardian at its deepest: a save names its own copies, so the deepest is the most it can be.
  return { ...NO_KIT, strike, taken: Math.min(guard, 1 - CRAFT_KIT.warding * top) * (1 - CRAFT_ARRAY_GUARD * CRAFT_ARRAY_DEPTH_TOP),
    mend: CRAFT_KIT.mend * top, bind: sig > 0, revive: alch >= 97,
    breach: where === 'warden' ? CRAFT_KIT.breach * top * (f + (sig > 0 ? 1 : 0)) : 0,
    demon: where === 'demon' ? (1 - CRAFT_KIT.purity * top) * (1 - CRAFT_KIT.calmHeart * top) : 1 };
}

/**
 * 封 The most days of a realm's seal a Breakthrough Pill this save's Alchemy could have
 * made would count as, at Heaven rank: the best tier its level and realm allow, read at
 * that realm's gate. 驗 the server reads it, because it sees a sealed gate crossed and
 * never what was carried into it, so it allows the most an honest pill can ever be.
 */
export function bestUnseal(s: State, realm: number): number {
  if (!skillOpen(s, 'alchemy')) return 0;
  const alch = levelIn(s, 'alchemy');
  const top = CRAFT_QUALITY_MULT[CRAFT_QUALITY_MULT.length - 1];
  let best = 0;
  for (const tier of BREAKTHROUGH_TIERS) {
    const r = RECIPE_BY_KEY[`alchemy:${breakthroughKey(tier)}`];
    if (!r || tier > realm || tier > s.realm || alch < r.level) continue;
    best = Math.max(best, CRAFT_KIT.unseal * top * fade(tier, realm));
  }
  return best;
}

/* ── 爐 What the crafts do elsewhere ─────────────────────────────────────── */

/** 丹 The furnace's material price, multiplied: every Alchemy level takes 0.2% off. */
export function furnaceDiscount(s: State): number {
  return 1 - CRAFT_FURNACE_DISCOUNT * (skillOpen(s, 'alchemy') ? Math.min(LEVEL_CAP, levelIn(s, 'alchemy')) : 0);
}

/** 秘門 The vault door's gap, in seconds, for this cultivator: the Hidden Door as deep as it is. */
export function doorGapFor(s: State, gap: number): number {
  return gap - CRAFT_ARRAY_DOOR * arrayStrength(s, 'hiddendoor');
}

/**
 * 秘門 The shortest the door's gap can have been for a save holding this pouch: a Hidden
 * Door held at all is read at its deepest step. validate() and 驗 the server both read it
 * as a ceiling on how often the vault can have been walked, so an honest deep array is
 * never read as too fast, and a copy lifted out of the floor still counts, since it can
 * go back in.
 */
export function shortestDoorGap(pouch: Readonly<Record<string, number>>, gap: number): number {
  return (pouch[arrayKey('hiddendoor')] ?? 0) > 0 ? gap - CRAFT_ARRAY_DOOR * CRAFT_ARRAY_DEPTH_TOP : gap;
}

/* ── 守 A save is input ──────────────────────────────────────────────────── */

/**
 * 經 The most experience a second of work can pay in each craft: its best recipe, at the
 * fastest the tools, arrays and familiarity make it, and the Heaven-Earth Array on top.
 * validate() and 驗 the server both read this; neither ever knows more than it does.
 */
export const XP_PER_SECOND_MAX: Readonly<Record<SkillKey, number>> = Object.fromEntries(SKILL_KEYS.map((k) => {
  // The first mark, the four after it standing in as speed at most, the craft mastered in
  // every recipe it has, and the arrays at their deepest.
  const fastest = (1 - CRAFT_TOOL_STEP * CRAFT_TOOL_STEPS) * (1 - CRAFT_ARRAY_SPEED * CRAFT_ARRAY_DEPTH_TOP)
    * (1 - CRAFT_MARK_FASTER) * (1 - CRAFT_MARK_SUB) ** (CRAFT_MARKS.length - 1) * (1 - masteryMost(k));
  const best = Math.max(...RECIPES.filter((r) => r.skill === k).map((r) => r.xp / (r.seconds * fastest)));
  return [k, best * (1 + CRAFT_ARRAY_XP * CRAFT_ARRAY_DEPTH_TOP)];
})) as Record<SkillKey, number>;

const POUCH_LIMIT = 1e9;

/**
 * 守 The experience one make paid at its lightest: a pill or a sigil before 2026-10-05
 * paid a CRAFT_KIT_WORK'th of what it pays now. The bounds below are read with it, so a
 * pouch filled with the old, light pills is never trimmed for being honest: nothing is
 * taken away from a save for a rebalance it did not ask for.
 */
const lightXp = (r: Recipe) => r.xp / r.weight;
/** The recipe that makes each item: one each, so a pouch key names the craft behind it. */
const MAKER: Readonly<Record<string, Recipe>> = Object.fromEntries(
  RECIPES.filter((r) => r.makes.kind === 'item').map((r) => [(r.makes as { item: string }).item, r]));

/**
 * 守 The workshop from a save. Every number is capped by something the save cannot forge:
 * experience by the time the run has lived, a level's tools and arrays by the level,
 * and anything that names nothing is not there.
 */
export function validCrafts(raw: unknown, s: Pick<State, 'realm' | 'killed' | 'startedAt'>, now: number): Crafts {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (x: unknown, lo: number, hi: number, fallback = 0) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback;
  const rec = (x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {});
  const elapsed = Math.max(0, now - s.startedAt);

  // 開 The feeders first (they open by realm alone), then the crafts their levels open,
  // read off the experience already validated: so an honest early alchemist keeps hers.
  const rawXp = rec(o.xp);
  const xp = zeroSkills(0);
  const fedLast = [...SKILL_KEYS].sort((a, b) => (FEEDER[a] ? 1 : 0) - (FEEDER[b] ? 1 : 0));
  for (const k of fedLast) {
    xp[k] = openBy(s.realm, k, (f) => levelOf(xp[f]))
      ? num(rawXp[k], 0, Math.min(XP_CAP, elapsed * XP_PER_SECOND_MAX[k] * 1.05)) : 0;
  }
  const open = (k: SkillKey) => openBy(s.realm, k, (f) => levelOf(xp[f]));
  const level = (k: SkillKey) => levelOf(xp[k]);

  // 儲 A thing is only in the pouch if this craft level and realm could have made it, and
  // never more of it than the craft's experience paid for: every make pays the recipe's
  // experience or more, and the most any make yields is two (the marks, Keen-Edge).
  const pouch: Record<string, number> = {};
  let entries = 0;
  for (const [k, v] of Object.entries(rec(o.pouch))) {
    if (entries >= 2000) break;
    const { key, quality } = splitKey(k);
    const it = ITEM_BY_KEY[key];
    if (!it) continue;
    if (it.graded ? quality === null : quality !== null) continue;
    const r = MAKER[key];
    if (!r || !open(r.skill) || level(r.skill) < r.level || s.realm < r.realm) continue;
    // At 99 the experience stops and the makes do not, so a finished craft is not held to it.
    const most = xp[r.skill] >= XP_CAP ? POUCH_LIMIT : Math.ceil(xp[r.skill] / lightXp(r)) * 2 + 1;
    const n = Math.floor(num(v, 0, Math.min(POUCH_LIMIT, most)));
    if (n > 0) { pouch[k] = n; entries++; }
  }

  // 熟 Familiarity is made things counted, and every make paid the recipe's experience, so
  // no recipe can have been made more often than its craft's experience allows (a craft
  // at 99 stops earning and keeps making, so it is not held to it).
  const made: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec(o.made))) {
    const r = RECIPE_BY_KEY[k];
    // And only recipes this level and realm could have made at all, as the pouch above:
    // a level never falls, so an honest save never holds a count it could not have made.
    if (!r || !open(r.skill) || level(r.skill) < r.level || s.realm < r.realm) continue;
    const most = xp[r.skill] >= XP_CAP ? 1e8 : Math.ceil(xp[r.skill] / lightXp(r));
    const n = Math.floor(num(v, 0, most));
    if (n > 0) made[k] = n;
  }

  // 具 A tool is only held if this forge level and realm could have made it.
  const forge = open('forge') ? level('forge') : 0;
  const rawTools = rec(o.tools);
  const tools = zeroSkills(0);
  for (const k of SKILL_KEYS) {
    let allowed = 0;
    TOOL_METALS.forEach((realm, i) => { if (forge >= tierLevel(realm) + 2 && s.realm >= realm) allowed = i + 1; });
    tools[k] = Math.floor(num(rawTools[k], 0, allowed));
  }

  // 深 Copies cut of each array, toward its depth. Every copy is a make of its recipe, so
  // never more than `made`; and every copy at today's weight paid the recipe's whole
  // experience, so never more than the craft's experience pays for (at 99 the experience
  // stops and the copies do not). A save from before depth has no `cut`: its old, light
  // copies count at their worth, CRAFT_ARRAY_WORK of them to one now, which is the same
  // experience and so fits the same bound.
  const cut: Record<string, number> = {};
  const cutMost = (r: Recipe) => Math.min(made[r.key] ?? 0, xp.array >= XP_CAP ? 1e8 : Math.ceil(xp.array / r.xp));
  if (o.cut === undefined) {
    for (const r of RECIPES_OF.array) {
      const n = Math.floor(Math.min(cutMost(r), (made[r.key] ?? 0) / r.weight));
      if (n > 0) cut[(r.makes as { item: string }).item] = n;
    }
  } else {
    for (const [k, v] of Object.entries(rec(o.cut))) {
      const r = MAKER[k];
      if (!r || r.skill !== 'array') continue;
      const n = Math.floor(num(v, 0, cutMost(r)));
      if (n > 0) cut[k] = n;
    }
  }

  // 陣 Placed arrays: real ones, held, no repeats, no more than the floor has room for.
  const slots = open('array') ? arraySlots(level('array')) : 0;
  const arrays = (Array.isArray(o.arrays) ? o.arrays : [])
    .filter((x): x is string => typeof x === 'string' && ITEM_BY_KEY[x]?.kind === 'array' && (pouch[x] ?? 0) > 0)
    .filter((x, i, all) => all.indexOf(x) === i)
    .slice(0, slots);

  const rawCarry = rec(o.carry);
  const hand = (x: unknown, which: Hand) =>
    typeof x === 'string' && carrySlot(x) === which && (pouch[x] ?? 0) > 0 ? x : null;
  // 破境丹 The third hand holds only a Breakthrough Pill the pouch holds, which the pouch
  // above only holds if this Alchemy level and realm could have made it.
  const carryOut: Carry = {
    elixir: hand(rawCarry.elixir, 'elixir'), sigil: hand(rawCarry.sigil, 'sigil'), pill: hand(rawCarry.pill, 'pill'),
  };

  const task = typeof o.task === 'string' && RECIPE_BY_KEY[o.task]
    && open(RECIPE_BY_KEY[o.task].skill) && level(RECIPE_BY_KEY[o.task].skill) >= RECIPE_BY_KEY[o.task].level
    && s.realm >= RECIPE_BY_KEY[o.task].realm ? o.task : null;

  return {
    xp, task,
    since: num(o.since, s.startedAt, now, now),
    pouch, made, tools, arrays, cut, carry: carryOut,
    // 尋 Sure drops come only from a Seeking Sigil or incense, so only a hand that can make one holds any.
    seek: seeks(level) ? Math.floor(num(o.seek, 0, CRAFT_SEEK_MAX)) : 0,
  };
}

/** 尋 Whether these levels could make anything that leaves a sure drop. */
function seeks(level: (k: SkillKey) => number): boolean {
  return level('sigil') >= RECIPE_BY_KEY['sigil:seeking'].level || level('alchemy') >= RECIPE_BY_KEY['alchemy:seekincense'].level;
}

/**
 * 匣 How many more of a gathered thing the pouch may take before validate() would trim it
 * on the next load: the same bound validCrafts holds every pouch to. 秘境 the vault's
 * craftsman's box reads it, so a box never hands over herbs the save then deletes.
 */
export function pouchRoom(s: State, key: string): number {
  const r = MAKER[key];
  if (!r) return 0;
  const xp = s.crafts.xp[r.skill] ?? 0;
  if (!skillOpen(s, r.skill) || levelOf(xp) < r.level || s.realm < r.realm) return 0;
  const most = xp >= XP_CAP ? POUCH_LIMIT : Math.ceil(xp / lightXp(r)) * 2 + 1;
  return Math.max(0, Math.floor(Math.min(POUCH_LIMIT, most) - (s.crafts.pouch[key] ?? 0)));
}

/** 匣 The best thing of a gathering craft this cultivator can make now: its recipe, or null. */
export function bestGather(s: State, skill: 'herb' | 'vein'): Recipe | null {
  if (!skillOpen(s, skill)) return null;
  const lv = levelIn(s, skill);
  const can = RECIPES_OF[skill].filter((r) => r.level <= lv && r.realm <= s.realm);
  return can.length ? can.reduce((a, b) => (b.level > a.level ? b : a)) : null;
}

/** Every recipe of a craft, in the order the screen and the guide list them. */
export function recipesOf(skill: SkillKey): readonly Recipe[] {
  return RECIPES_OF[skill];
}

export { FORGED, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_BY_KEY, SKILL_KEYS, ITEM_BY_KEY };
