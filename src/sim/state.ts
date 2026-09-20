import {
  BASE_RATE, LAYERS, LAYERS_PER_REALM, LAYER_BONUS, LEVELS_PER_REALM, MARK_DAYS,
  TRIBULATION_CHALLENGE, TRIBULATION_GAIN, TRIBULATION_POWER, TRIBULATION_SLACK,
  ladderAt, ladderBetween, levelCap,
} from './balance.ts';
import { BEASTS } from '../data/bestiary.ts';
import {
  AFFIXES, RARITIES, SECONDARIES, SLOTS, TEMPLATE_BY_KEY, setBonus,
  type Affix, type Item, type Rarity, type Roll, type Worn,
} from '../data/gear.ts';
import { CHEST_LIMIT } from './chest.ts';
import { affinity, layerCostFactor, powerMultiplier, rateMultiplier, validateUnlocked } from './dao.ts';
import { validateSequence, validateStance } from './arts.ts';
import { NO_PILLS, brewed as validBrewed, pillPower, type Brewed } from './furnace.ts';
import { recordPower } from './record.ts';
import { clampRefine } from './refine.ts';
import { isOpen } from './unlocks.ts';

/** The four things qi is spent on. All of them multiply; none of them is ever lost. */
export type Upgrade = 'technique' | 'method' | 'pills' | 'cores';

export const UPGRADES: readonly Upgrade[] = ['technique', 'method', 'pills', 'cores'];

/**
 * 修 The four upgrades.
 *
 * `share` is the part of this file that carries the whole economy. A level does not
 * have a price of its own: it costs a share of **the layer of the mountain it belongs
 * to**. Level 6 of a six-per-realm upgrade costs what the last layer of the first realm
 * costs; level 12 costs what the last layer of the second realm costs, and so on for
 * ever.
 *
 * That one rule is what killed the runaway. Prices used to be `base * step^level`,
 * a ladder of their own that had nothing to do with the mountain — so the mountain grew
 * and the prices did not, every upgrade a realm allowed was affordable within its first
 * hour, and the whole nine-realm climb collapsed to three days for anyone who spent.
 * Riding the ladder means the last level a realm allows only becomes affordable near
 * the end of that realm, which is what spreads the buying across the realm instead of
 * its first hour.
 *
 * 妖丹 Beast Cores are the exception: they are bought with 材 materials, which come from
 * killing things and not from waiting, so they ride their own small curve.
 */
export const UPGRADE_INFO: Record<Upgrade, {
  han: string; name: string; icon: string; effect: string;
  /** What one level costs, as a share of the layer it rides. Cores read this in materials. */
  share: number; gain: number; affects: 'rate' | 'power';
  currency: 'qi' | 'material';
}> = {
  technique: { han: '劍訣', name: 'Sword Technique', icon: 'katana',
    effect: '+22% power', share: 0.7, gain: 1.22, affects: 'power', currency: 'qi' },
  method: { han: '功法', name: 'Cultivation Method', icon: 'scroll-unfurled',
    effect: '+20% qi per second', share: 1.0, gain: 1.20, affects: 'rate', currency: 'qi' },
  // Named 丹藥 Pills until 丹爐 the Furnace arrived and took the word. Two things called
  // "pills" on two screens is exactly the confusion the copy rules forbid, so this one
  // became what it always was: breathing.
  pills: { han: '吐納', name: 'Breathwork', icon: 'energy-breath',
    effect: '+14% qi per second', share: 0.45, gain: 1.14, affects: 'rate', currency: 'qi' },
  cores: { han: '妖丹', name: 'Beast Cores', icon: 'crystal-cluster',
    effect: '+8% power', share: 3, gain: 1.08, affects: 'power', currency: 'material' },
};

/** What 妖丹 costs in materials at a given level. Materials are earned by hand, not by
 *  waiting, so this is the one price that does not ride the mountain. */
export const CORE_STEP = 1.35;

export interface State {
  readonly v: 1;
  /** Epoch seconds this state is correct as of. */
  at: number;
  startedAt: number;
  realm: number;   // 1..9
  layer: number;   // 0..8 layers opened in the current realm
  qi: number;
  materials: number;
  /** Has the current realm's warden fallen? Until it has, there is no breakthrough. */
  wardenFell: boolean;
  levels: Record<Upgrade, number>;
  killed: Record<string, number>;
  /** 器 What is on the body. */
  worn: Worn;
  /** 藏 What is in the chest, capped at CHEST_LIMIT plus whatever 運 has added. */
  chest: Item[];
  /** 道 Technique nodes taken, in the order they were taken. */
  unlocked: string[];
  /** 勢 The stance you fight in, or none yet. */
  stance: string | null;
  /** 訣 The arts in the order they fire, at most SEQUENCE_SLOTS of them. */
  sequence: string[];
  /** 雷印 Thunder marks: tribulations crossed after the ninth realm. */
  tribulation: number;
  /** 印 The power you had when the last mark was taken. The next Dragon grows from it. */
  tribulationAt: number;
  /** 塔 The highest floor of the Endless Tower that has fallen. */
  tower: number;
  /** 丹 Pills brewed, by line. The one thing no realm caps. */
  brewed: Brewed;
  /** 新 Which one-time notices have been read. Cosmetic, and the only state that is. */
  seen: string[];
}

/** What the marks already taken are worth. They multiply, to power and to qi alike. */
export function markBonus(marks: number): number {
  return (1 + TRIBULATION_GAIN) ** marks;
}

/** How far up the Dragon stands for this many marks, before the anchor. */
export function tribulationScale(marks: number): number {
  return TRIBULATION_POWER ** marks;
}

/**
 * 劫 What the next Dragon brings.
 *
 * The greater of two things: the ladder, and a fixed step beyond **the Dragon you last
 * put down**. The anchor is what makes the endgame hold — the Dragon can never fall
 * behind, whatever the economy does.
 */
export function tribulationPower(s: State, base: number): number {
  return Math.max(base * tribulationScale(s.tribulation), s.tribulationAt * TRIBULATION_CHALLENGE);
}

/**
 * 劫 How ready you are for the next crossing: your power against the Dragon's.
 *
 * This is what the bar reads at the top, and it is the honest thing to show. Qi is not
 * the gate up there — the wait is the wait to afford the next levels of 劍訣, and this
 * says how much of that wait is behind you.
 */
export function tribulationReadiness(s: State, dragonPower: number): number {
  return dragonPower > 0 ? Math.min(1, power(s) / dragonPower) : 0;
}

/** How many layers have been opened in total, across every realm. 0..80. */
export function layersOpened(s: State): number {
  return (s.realm - 1) * LAYERS_PER_REALM + s.layer;
}

/** Qi per second, right now. The single source of the rate; nothing else computes it. */
export function rate(s: State): number {
  return BASE_RATE * LAYER_BONUS ** layersOpened(s) * rateBonus(s);
}

/**
 * 雷池 The thunder pool: two days of your own gathering, and the gate on the Dragon.
 *
 * Every other realm is left by filling a layer. The ninth has no layer left to fill, so
 * this is what stands in its place — and it is measured in *days of your own rate*
 * rather than in a fixed number, so it grows exactly as fast as you do and a crossing
 * never stops costing two days.
 *
 * Without it the endgame had no clock at all. Power was the only gate, the furnace sold
 * power, and one day's qi bought a fortnight of crossings — measured, ten marks a day,
 * every number in the game multiplied by two hundred daily until the arithmetic ran out
 * of exponent. A pool that refills is the thing that makes 渡劫 a ladder rather than a
 * lever you hold down.
 *
 * It also puts the furnace in real tension with the Dragon: qi brewed is qi not pooled.
 */
export function tribulationPool(s: State): number {
  return rate(s) * 86_400 * MARK_DAYS;
}

/** The Dragon is callable once the pool is full. What decides it is whether you can win. */
export function atTribulation(s: State): boolean {
  return s.realm === 9 && layersOpened(s) >= LAYERS - 1 && s.qi >= tribulationPool(s);
}

export function canCross(s: State): boolean {
  return atTribulation(s) && s.wardenFell;
}

/**
 * Crossing grants the mark, notes the Dragon that fell, and stands the next one up.
 *
 * What it remembers is **the Dragon's power, not the cultivator's**. That distinction is
 * the whole endgame. Anchoring to the cultivator's own 力 quietly forgives everything
 * the build is worth: a stance and a sequence are together worth nearly twice the
 * number on the screen, so a cultivator who beat one Dragon beat the next one too, and
 * the one after that, for ever, without ever brewing a thing. Anchoring to the Dragon
 * cancels the build out of both sides, and what is left is the honest question — what
 * have you added since last time?
 */
export function crossTribulation(s: State, dragonPower: number): State {
  if (!canCross(s)) return s;
  return {
    ...s,
    tribulation: s.tribulation + 1,
    // Whichever is higher: the Dragon that fell, or what the cultivator actually stood
    // there with. A cultivator arriving at the top is carrying a whole climb's worth of
    // cores, gear and tree that the first Dragon knows nothing about — without this
    // second reading they would walk through twenty crossings on that margin alone
    // before the endgame started asking them for anything.
    tribulationAt: Math.max(s.tribulationAt, dragonPower, power(s) / TRIBULATION_SLACK),
    qi: Math.max(0, s.qi - tribulationPool(s)),
    wardenFell: false,
  };
}

export function newState(now: number): State {
  return {
    v: 1, at: now, startedAt: now,
    realm: 1, layer: 0, qi: 0, materials: 0, wardenFell: false,
    levels: { technique: 0, method: 0, pills: 0, cores: 0 },
    killed: {},
    worn: {},
    chest: [],
    unlocked: [],
    stance: null,
    sequence: [],
    tribulation: 0,
    tribulationAt: 0,
    tower: 0,
    brewed: { ...NO_PILLS },
    seen: [],
  };
}

/**
 * 上限 How many levels of one upgrade this cultivator may hold.
 *
 * Six per realm, so the ninth realm allows fifty-four. It is the wall that makes the
 * curve hold whatever the player does, and the reason the ladder is worth climbing:
 * more realm is more room.
 */
export function capOf(s: State): number {
  return levelCap(s.realm);
}

export function atCap(s: State, u: Upgrade): boolean {
  return s.levels[u] >= capOf(s);
}

/** What the next level costs. Qi levels ride the mountain; cores ride materials. */
export function upgradeCost(s: State, u: Upgrade): number {
  const i = UPGRADE_INFO[u];
  const level = s.levels[u];
  if (i.currency === 'material') return Math.ceil(i.share * CORE_STEP ** level);
  // The rung this level belongs to: LEVELS_PER_REALM levels span LAYERS_PER_REALM rungs.
  const rung = ((level + 1) * LAYERS_PER_REALM) / LEVELS_PER_REALM - 1;
  return Math.ceil(i.share * ladderBetween(rung));
}

export function canBuy(s: State, u: Upgrade): boolean {
  if (atCap(s, u)) return false;
  const i = UPGRADE_INFO[u];
  const cost = upgradeCost(s, u);
  return i.currency === 'qi' ? s.qi >= cost : s.materials >= cost;
}

export function buy(s: State, u: Upgrade): State {
  if (!canBuy(s, u)) return s;
  const i = UPGRADE_INFO[u];
  const cost = upgradeCost(s, u);
  return {
    ...s,
    qi: i.currency === 'qi' ? s.qi - cost : s.qi,
    materials: i.currency === 'material' ? s.materials - cost : s.materials,
    levels: { ...s.levels, [u]: s.levels[u] + 1 },
  };
}

/** Qi rate multiplier coming from upgrades and from what is worn. */
export function rateBonus(s: State): number {
  return UPGRADE_INFO.method.gain ** s.levels.method
    * UPGRADE_INFO.pills.gain ** s.levels.pills
    * setBonus(s.worn, (slot) => affinity(s.unlocked, slot)).rate
    * rateMultiplier(s.unlocked)
    * markBonus(s.tribulation);
}

/** 力 Combat power. It decides every beast, and only upgrades and the ladder move it. */
export function power(s: State): number {
  const ladder = (s.realm - 1) * LAYERS_PER_REALM + s.layer + 1;
  return ladder * UPGRADE_INFO.technique.gain ** s.levels.technique
    * UPGRADE_INFO.cores.gain ** s.levels.cores
    * setBonus(s.worn, (slot) => affinity(s.unlocked, slot)).power
    * powerMultiplier(s.unlocked)
    * pillPower(s.brewed)
    * (isOpen(s.realm, 'record') ? recordPower(s.killed) : 1)
    * markBonus(s.tribulation);
}

/** The realm is full and only the warden is left? */
export function atCeiling(s: State): boolean {
  const n = (s.realm - 1) * LAYERS_PER_REALM + s.layer;
  if (s.layer < LAYERS_PER_REALM - 1 || n >= LAYERS - 1) return false;
  return s.qi >= ladderAt(n) * layerCostFactor(s.unlocked);
}

export function canBreakThrough(s: State): boolean {
  return atCeiling(s) && s.wardenFell && s.realm < 9;
}

export function breakThrough(s: State): State {
  if (!canBreakThrough(s)) return s;
  return { ...s, realm: s.realm + 1, layer: 0, qi: 0, wardenFell: false };
}

/**
 * A save is input, and it is validated like any other input.
 *
 * The earlier build shipped without this and had a hole where a hand-edited heirloom
 * multiplied the qi rate by 196,502x and passed every check. The qi ceiling below is
 * what closes that hole: nothing may hold more qi than the fastest conceivable
 * cultivator could have gathered in the wall-clock time since the run began.
 */
export function validate(raw: unknown, now: number): State {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (o.v !== 1) return newState(now);

  const num = (x: unknown, fallback: number) =>
    typeof x === 'number' && Number.isFinite(x) ? x : fallback;
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  const startedAt = clamp(num(o.startedAt, now), 0, now);
  const realm = clamp(Math.floor(num(o.realm, 1)), 1, 9);
  const layer = clamp(Math.floor(num(o.layer, 0)), 0, LAYERS_PER_REALM - 1);

  const rawLevels = (o.levels ?? {}) as Record<string, unknown>;
  // Nothing may hold more levels than its realm allows — the cap is what holds the
  // whole curve up, so a hand-edited save does not get to walk around it.
  const levels = Object.fromEntries(
    UPGRADES.map((u) => [u, clamp(Math.floor(num(rawLevels[u], 0)), 0, levelCap(realm))]),
  ) as Record<Upgrade, number>;

  const rawKilled = (o.killed ?? {}) as Record<string, unknown>;
  const killed: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawKilled)) {
    if (!BEASTS.some((x) => x.key === k)) continue;   // a beast that does not exist is not a kill
    const n = Math.floor(num(v, 0));
    if (n > 0) killed[k] = n;
  }

  const item = (raw: unknown, used: Set<string>): Item | null => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const tpl = typeof o.template === 'string' ? TEMPLATE_BY_KEY[o.template] : undefined;
    if (!tpl) return null;                                    // a piece that does not exist is not a piece
    const rarity = RARITIES.includes(o.rarity as Rarity) ? (o.rarity as Rarity) : 'common';
    const id = typeof o.id === 'string' && o.id.length <= 64 ? o.id : `${tpl.key}-${used.size}`;
    if (used.has(id)) return null;                            // two things may not be one thing
    used.add(id);

    // Lines are validated one at a time: a line on an axis that does not exist is not a
    // line, the same axis may not appear twice, no rank may carry more lines than it is
    // allowed, and every value is capped at what the last realm's top rank could roll.
    const seenAffix = new Set<Affix>();
    const rolls: Roll[] = [];
    for (const raw of Array.isArray(o.rolls) ? o.rolls : []) {
      if (rolls.length > SECONDARIES[rarity]) break;          // one primary plus its share
      const r = (raw ?? {}) as Record<string, unknown>;
      const affix = AFFIXES.includes(r.affix as Affix) ? (r.affix as Affix) : null;
      if (!affix || seenAffix.has(affix)) continue;
      seenAffix.add(affix);
      rolls.push({ affix, value: clamp(num(r.value, 0), 0, 120) });
    }
    if (rolls.length === 0) rolls.push({ affix: tpl.affix, value: 0 });
    // 煉 Refining is levels on the piece, paid for in material. It is capped here at a
    // number nothing reachable comes near, so a hand-edited save cannot claim a sword
    // worth fifty thousand of itself.
    const refine = clampRefine(typeof o.refine === 'number' ? o.refine : 0);
    return refine > 0 ? { id, template: tpl.key, rarity, rolls, refine }
      : { id, template: tpl.key, rarity, rolls };
  };

  const used = new Set<string>();
  const rawWorn = (o.worn ?? {}) as Record<string, unknown>;
  const worn: Worn = {};
  for (const slot of SLOTS) {
    const it = item(rawWorn[slot], used);
    if (it && TEMPLATE_BY_KEY[it.template].slot === slot) worn[slot] = it;
  }

  const chest: Item[] = [];
  for (const raw of Array.isArray(o.chest) ? o.chest : []) {
    if (chest.length >= CHEST_LIMIT) break;
    const it = item(raw, used);
    if (it) chest.push(it);
  }

  // The ceiling: the whole ladder, every plausible upgrade, times the elapsed time.
  const elapsed = Math.max(0, now - startedAt);
  const top = levelCap(9);
  const qiCeiling = 1.02 ** LAYERS * UPGRADE_INFO.method.gain ** top
    * UPGRADE_INFO.pills.gain ** top * 1e4 * elapsed + 1e6;

  return {
    v: 1,
    startedAt,
    at: clamp(num(o.at, now), startedAt, now),
    realm,
    layer,
    qi: clamp(num(o.qi, 0), 0, qiCeiling),
    materials: clamp(num(o.materials, 0), 0, 1e12),
    wardenFell: o.wardenFell === true,
    levels,
    killed,
    worn,
    chest,
    unlocked: validateUnlocked(o.unlocked),
    // Neither of these is owned in the save: the stances follow from the realm reached
    // and the arts from the wardens put down. So a hand-edited save cannot put 龍威 in
    // the first slot at realm 1 and walk over every warden in the game.
    stance: validateStance(o.stance, realm),
    sequence: validateSequence(o.sequence, killed),
    // Marks are only reachable at realm 9, and only one at a time.
    // Capped at three hundred so the multipliers stay inside a double: a mark is
    // worth 4.3x and 4.3^300 is already a number with a hundred and ninety digits.
    tribulation: realm === 9 ? clamp(Math.floor(num(o.tribulation, 0)), 0, 300) : 0,
    tribulationAt: realm === 9 ? Math.max(0, num(o.tribulationAt, 0)) : 0,
    // The tower is climbed one floor at a time and every floor is a fight, so a save
    // claiming floor nine thousand is claiming nine thousand fights that never happened.
    tower: clamp(Math.floor(num(o.tower, 0)), 0, 3000),
    brewed: validBrewed(o.brewed),
    // 新 The one piece of state worth nothing to cheat: the worst a forged list can do
    // is skip a card that explains the game. It is bounded so it cannot grow a save.
    seen: (Array.isArray(o.seen) ? o.seen : [])
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 32)
      .filter((x, i, all) => all.indexOf(x) === i)
      .slice(0, 32),
  };
}
