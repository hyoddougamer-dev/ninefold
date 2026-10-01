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
  CRAFT_ARRAY_DOOR, CRAFT_ARRAY_GUARD, CRAFT_ARRAY_QUALITY, CRAFT_ARRAY_SLOTS, CRAFT_ARRAY_SPEED,
  CRAFT_ARRAY_TWICE, CRAFT_ARRAY_XP, CRAFT_FURNACE_DISCOUNT, CRAFT_KIT, CRAFT_LONG_WATCH_HOURS,
  CRAFT_MARKS, CRAFT_MARK_FASTER, CRAFT_MARK_TWICE, CRAFT_QUALITY, CRAFT_QUALITY_MULT,
  CRAFT_RENDER_KNOWN, CRAFT_SEEK_MAX, CRAFT_TOOL_STEP, CRAFT_TOOL_STEPS, CRAFT_WORK_HOURS, DEMONS, DEMONS_PER_REALM, VARIANCE,
} from './balance.ts';
import { opensAt } from './unlocks.ts';
import {
  ITEM_BY_KEY, LEVEL_CAP, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_BY_KEY, SKILL_KEYS, TOOL_METALS, XP_CAP,
  FORGED, arrayKey, levelOf, pouchKey, splitKey, tierLevel,
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
  readonly carry: Carry;
  /** 尋 Sure drops waiting for the next beasts beaten on the hunt. */
  readonly seek: number;
}

const zeroSkills = <T>(v: T): Record<SkillKey, T> =>
  Object.fromEntries(SKILL_KEYS.map((k) => [k, v])) as Record<SkillKey, T>;

export const NO_CRAFTS: Crafts = {
  xp: zeroSkills(0), task: null, since: 0, pouch: {}, made: {},
  tools: zeroSkills(0), arrays: [], carry: { elixir: null, sigil: null }, seek: 0,
};

/* ── 讀 Reading the workshop ─────────────────────────────────────────────── */

export function skillOpen(s: State, skill: SkillKey): boolean {
  return s.realm >= SKILL_BY_KEY[skill].realm;
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

/** 熟 How many of a recipe's five marks it has. */
export function marksOf(s: State, r: Recipe): number {
  const n = s.crafts.made[r.key] ?? 0;
  return CRAFT_MARKS.filter((m) => n >= m).length;
}

export function placed(s: State, key: string): boolean {
  return s.crafts.arrays.includes(arrayKey(key));
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

/** 陣 And the arrays that speed a craft. */
function arrayFactor(s: State, skill: SkillKey): number {
  const fast = (skill === 'herb' && placed(s, 'dew'))
    || (skill === 'vein' && placed(s, 'earthvein'))
    || ((skill === 'forge' || skill === 'alchemy') && placed(s, 'firetame'));
  return fast ? 1 - CRAFT_ARRAY_SPEED : 1;
}

/** 時 Seconds one make of this recipe takes, for this cultivator, now. */
export function secondsOf(s: State, r: Recipe): number {
  return r.seconds * toolFactor(s, r.skill) * arrayFactor(s, r.skill)
    * (marksOf(s, r) >= 1 ? 1 - CRAFT_MARK_FASTER : 1);
}

/** 經 The experience one make pays this cultivator. */
export function xpOf(s: State, r: Recipe): number {
  return r.xp * (placed(s, 'heavenearth') ? 1 + CRAFT_ARRAY_XP : 1);
}

/** 眠 How long the workshop keeps going after the last visit, in seconds. */
export function workSeconds(s: State): number {
  return (CRAFT_WORK_HOURS + (placed(s, 'longwatch') ? CRAFT_LONG_WATCH_HOURS : 0)) * 3600;
}

/** 熟 What a make needs, with the third mark's one fewer of the first thing. */
export function needsOf(s: State, r: Recipe): readonly (readonly [string, number])[] {
  const less = marksOf(s, r) >= 3;
  return r.needs.map(([k, n], i) => [k, i === 0 && less && n > 1 ? n - 1 : n] as const);
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

/** 品 The odds of each rank, from how far above the recipe and how familiar. */
export function qualityOdds(above: number, marks: number, palace = false): readonly number[] {
  const q = CRAFT_QUALITY;
  const score = Math.max(0, above) + marks * q.mark + (marks >= 4 ? q.mark : 0) + (palace ? CRAFT_ARRAY_QUALITY : 0);
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
  return qualityOdds(levelIn(s, r.skill) - r.level, marksOf(s, r), placed(s, 'ninepalace'));
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

  const marks = marksOf(s, r);
  const rank = r.graded ? pick(qualityFor(s, r), d()) : -1;
  let out: State = { ...s, materials };
  if (r.makes.kind === 'item') {
    const twice = (marks >= 2 && d() < CRAFT_MARK_TWICE)
      || (r.skill === 'render' && placed(s, 'keenedge') && d() < CRAFT_ARRAY_TWICE);
    addTo(pouch, pouchKey(r.makes.item, r.graded ? rank : undefined), twice ? 2 : 1);
  } else if (r.makes.kind === 'gear') {
    const piece = forged(s, r, r.makes.template, rank, d);
    if (piece) out = stash(out, piece).state;
  }
  const xp = Math.min(XP_CAP, (c.xp[r.skill] ?? 0) + xpOf(s, r));
  return {
    ...out,
    crafts: {
      ...c, pouch, tools,
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
  const c = s.crafts;
  if (!Number.isFinite(now)) return s;
  if (!c.task) return c.since === now ? s : { ...s, crafts: { ...c, since: now } };
  const r = RECIPE_BY_KEY[c.task];
  if (!r || !canSet(s, r)) return { ...s, crafts: { ...c, task: null, since: now } };
  if (now <= c.since) return s;

  const end = Math.min(now, c.since + workSeconds(s));
  let out = s;
  let at = c.since;
  // 守 A day's worth of the fastest recipe is under thirty thousand makes; this is only a
  // guard against a clock that has gone somewhere a clock cannot go.
  for (let guard = 0; guard < 200_000; guard++) {
    const t = secondsOf(out, r);
    if (at + t > end) break;
    if (blocked(out, r) !== null) { at = now; break; }
    out = makeOne(out, r);
    at += t;
  }
  // The workshop stood still at its limit: the rest of the absence is not owed, and the
  // make that was half done when it stopped is dropped rather than finished on return.
  const since = end < now ? now : at;
  return { ...out, crafts: { ...out.crafts, since: Math.min(now, since) } };
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

/** Whether a pouch key can be carried into a fight, and in which hand. */
export function carrySlot(key: string): 'elixir' | 'sigil' | null {
  const { key: k, quality } = splitKey(key);
  const it = ITEM_BY_KEY[k];
  if (!it || quality === null) return null;
  if (it.kind === 'elixir' && (/^(mend|guard|might)\d$/.test(k) || ELIXIR_CARRIED.has(k))) return 'elixir';
  if (it.kind === 'sigil' && SIGIL_CARRIED.has(k.slice('sigil:'.length))) return 'sigil';
  return null;
}

/** Carry a thing from the pouch into the next hard fight, or put it back (null). */
export function carry(s: State, hand: 'elixir' | 'sigil', key: string | null): State {
  if (key !== null && (carrySlot(key) !== hand || (s.crafts.pouch[key] ?? 0) < 1)) return s;
  return { ...s, crafts: { ...s.crafts, carry: { ...s.crafts.carry, [hand]: key } } };
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

export type Where = 'warden' | 'demon' | 'vault';

/**
 * 戰 Which fights a kit may enter. Never the Dragon above the ninth realm, never a tower
 * floor (those are not a Where), and never a common beast on the hunt.
 */
export function kitWhere(s: State, b: Beast, standing?: number): Where | null {
  if (b.key === 'heartdemon') return 'demon';
  if (standing !== undefined) return null;
  if (b.warden && !(b.key === 'dragon' && s.realm === 9)) return 'warden';
  return null;
}

/** 級 What a tier-N thing is worth in a realm-M fight: full at or below its tier, half a realm above. */
function fade(tier: number, fightRealm: number): number {
  return fightRealm <= tier ? 1 : CRAFT_KIT.fade ** (fightRealm - tier);
}

/** 攜 The pouch keys that took part in a fight, one per hand: only these are spent. */
export interface Used {
  readonly elixir: string | null;
  readonly sigil: string | null;
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

export const NOT_USED: Used = { elixir: null, sigil: null };

/**
 * 戰 The kit a fight is fought with: what is carried, and the Guardian Array under the
 * floor. The array is not carried and never spent.
 */
export function kitFor(s: State, b: Beast, where: Where | null): Carried {
  if (!where) return { kit: NO_KIT, spends: false, used: NOT_USED };
  const fightRealm = Math.max(1, Math.min(9, where === 'demon' ? s.realm : b.realm));
  let strike = 1, taken = 1, mend = 0, demon = 1, reflect = 0;
  let bind = false, revive = false, spends = false;
  let usedElixir: string | null = null, usedSigil: string | null = null;

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
    spends = spends || before;
  }
  if ((where === 'warden' || where === 'demon') && placed(s, 'guardian')) taken *= 1 - CRAFT_ARRAY_GUARD;
  return { kit: { strike, taken, mend, bind, reflect, revive, demon }, spends, used: { elixir: usedElixir, sigil: usedSigil } };
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
  for (const k of [used.elixir, used.sigil]) {
    if (!k || (pouch[k] ?? 0) < 1) continue;
    addTo(pouch, k, -1);
    if (!pouch[k]) { if (elixir === k) elixir = null; if (sigil === k) sigil = null; }
  }
  return { ...s, crafts: { ...c, pouch, carry: { elixir, sigil } } };
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
  const fightRealm = where === 'demon' ? s.realm : b.realm;
  const f = tier > 0 ? fade(tier, fightRealm) : 0;
  const five = sig >= (RECIPE_BY_KEY['sigil:fivethunder']?.level ?? 99) && s.realm >= 7;
  const thunder = sig >= (RECIPE_BY_KEY['sigil:thunder']?.level ?? 99);
  const strike = (1 + CRAFT_KIT.might * top * f)
    * (1 + (five ? CRAFT_KIT.fiveThunders : thunder ? CRAFT_KIT.thunder : 0) * top);
  const guard = tier > 0 ? 1 - CRAFT_KIT.guard * top * f : 1;
  return { ...NO_KIT, strike, taken: Math.min(guard, 1 - CRAFT_KIT.warding * top) * (1 - CRAFT_ARRAY_GUARD),
    mend: CRAFT_KIT.mend * top, bind: sig > 0, revive: alch >= 97,
    demon: where === 'demon' ? (1 - CRAFT_KIT.purity * top) * (1 - CRAFT_KIT.calmHeart * top) : 1 };
}

/* ── 爐 What the crafts do elsewhere ─────────────────────────────────────── */

/** 丹 The furnace's material price, multiplied: every Alchemy level takes 0.2% off. */
export function furnaceDiscount(s: State): number {
  return 1 - CRAFT_FURNACE_DISCOUNT * (skillOpen(s, 'alchemy') ? Math.min(LEVEL_CAP, levelIn(s, 'alchemy')) : 0);
}

/** 秘門 The vault door's gap, in seconds, for this cultivator. */
export function doorGapFor(s: State, gap: number): number {
  return placed(s, 'hiddendoor') ? gap - CRAFT_ARRAY_DOOR : gap;
}

/* ── 守 A save is input ──────────────────────────────────────────────────── */

/**
 * 經 The most experience a second of work can pay in each craft: its best recipe, at the
 * fastest the tools, arrays and familiarity make it, and the Heaven-Earth Array on top.
 * validate() and 驗 the server both read this; neither ever knows more than it does.
 */
export const XP_PER_SECOND_MAX: Readonly<Record<SkillKey, number>> = Object.fromEntries(SKILL_KEYS.map((k) => {
  const fastest = (1 - CRAFT_TOOL_STEP * CRAFT_TOOL_STEPS) * (1 - CRAFT_ARRAY_SPEED) * (1 - CRAFT_MARK_FASTER);
  const best = Math.max(...RECIPES.filter((r) => r.skill === k).map((r) => r.xp / (r.seconds * fastest)));
  return [k, best * (1 + CRAFT_ARRAY_XP)];
})) as Record<SkillKey, number>;

const POUCH_LIMIT = 1e9;
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
  const open = (k: SkillKey) => s.realm >= SKILL_BY_KEY[k].realm;

  const rawXp = rec(o.xp);
  const xp = zeroSkills(0);
  for (const k of SKILL_KEYS) {
    xp[k] = open(k) ? num(rawXp[k], 0, Math.min(XP_CAP, elapsed * XP_PER_SECOND_MAX[k] * 1.05)) : 0;
  }
  const level = (k: SkillKey) => levelOf(xp[k]);

  // 儲 A thing is only in the pouch if this craft level and realm could have made it, and
  // never more of it than the craft's experience paid for: every make pays the recipe's
  // experience or more, and the most any make yields is two (the second mark, Keen-Edge).
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
    const most = xp[r.skill] >= XP_CAP ? POUCH_LIMIT : Math.ceil(xp[r.skill] / r.xp) * 2 + 1;
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
    const most = xp[r.skill] >= XP_CAP ? 1e8 : Math.ceil(xp[r.skill] / r.xp);
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

  // 陣 Placed arrays: real ones, held, no repeats, no more than the floor has room for.
  const slots = open('array') ? arraySlots(level('array')) : 0;
  const arrays = (Array.isArray(o.arrays) ? o.arrays : [])
    .filter((x): x is string => typeof x === 'string' && ITEM_BY_KEY[x]?.kind === 'array' && (pouch[x] ?? 0) > 0)
    .filter((x, i, all) => all.indexOf(x) === i)
    .slice(0, slots);

  const rawCarry = rec(o.carry);
  const hand = (x: unknown, which: 'elixir' | 'sigil') =>
    typeof x === 'string' && carrySlot(x) === which && (pouch[x] ?? 0) > 0 ? x : null;
  const carryOut: Carry = { elixir: hand(rawCarry.elixir, 'elixir'), sigil: hand(rawCarry.sigil, 'sigil') };

  const task = typeof o.task === 'string' && RECIPE_BY_KEY[o.task]
    && open(RECIPE_BY_KEY[o.task].skill) && level(RECIPE_BY_KEY[o.task].skill) >= RECIPE_BY_KEY[o.task].level
    && s.realm >= RECIPE_BY_KEY[o.task].realm ? o.task : null;

  return {
    xp, task,
    since: num(o.since, s.startedAt, now, now),
    pouch, made, tools, arrays, carry: carryOut,
    // 尋 Sure drops come only from a Seeking Sigil or incense, so only a hand that can make one holds any.
    seek: seeks(level) ? Math.floor(num(o.seek, 0, CRAFT_SEEK_MAX)) : 0,
  };
}

/** 尋 Whether these levels could make anything that leaves a sure drop. */
function seeks(level: (k: SkillKey) => number): boolean {
  return level('sigil') >= RECIPE_BY_KEY['sigil:seeking'].level || level('alchemy') >= RECIPE_BY_KEY['alchemy:seekincense'].level;
}

/** Every recipe of a craft, in the order the screen and the guide list them. */
export function recipesOf(skill: SkillKey): readonly Recipe[] {
  return RECIPES.filter((r) => r.skill === skill);
}

export { FORGED, RECIPES, RECIPE_BY_KEY, SKILLS, SKILL_BY_KEY, SKILL_KEYS, ITEM_BY_KEY };
