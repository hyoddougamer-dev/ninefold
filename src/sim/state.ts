import {
  LAYERS_PER_REALM, REALM_COST, TRIBULATION_CHALLENGE, TRIBULATION_GAIN,
  TRIBULATION_POWER,
} from './balance.ts';
import { BEASTS } from '../data/bestiary.ts';
import {
  AFFIXES, RARITIES, SECONDARIES, SLOTS, TEMPLATE_BY_KEY, setBonus,
  type Affix, type Item, type Rarity, type Roll, type Worn,
} from '../data/gear.ts';
import { CHEST_LIMIT } from './chest.ts';
import { affinity, layerCostFactor, powerMultiplier, rateMultiplier, validateUnlocked } from './dao.ts';
import { validateSequence, validateStance } from './arts.ts';

/** The four things qi is spent on. All of them multiply; none of them is ever lost. */
export type Upgrade = 'technique' | 'method' | 'pills' | 'cores';

export const UPGRADES: readonly Upgrade[] = ['technique', 'method', 'pills', 'cores'];

export const UPGRADE_INFO: Record<Upgrade, {
  han: string; name: string; icon: string; effect: string;
  base: number; step: number; gain: number; affects: 'rate' | 'power';
  currency: 'qi' | 'material';
}> = {
  technique: { han: '劍訣', name: 'Sword Technique', icon: 'katana',
    effect: '+18% power', base: 60, step: 1.16, gain: 1.18, affects: 'power', currency: 'qi' },
  method: { han: '功法', name: 'Cultivation Method', icon: 'scroll-unfurled',
    effect: '+15% qi per second', base: 100, step: 1.19, gain: 1.15, affects: 'rate', currency: 'qi' },
  pills: { han: '丹藥', name: 'Pills', icon: 'fire-gem',
    effect: '+10% qi per second', base: 45, step: 1.14, gain: 1.10, affects: 'rate', currency: 'qi' },
  cores: { han: '妖丹', name: 'Beast Cores', icon: 'crystal-cluster',
    effect: '+12% power', base: 3, step: 1.22, gain: 1.12, affects: 'power', currency: 'material' },
};

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
 * The greater of two things: the ladder, and a fixed step beyond the power you had when
 * you last crossed. The anchor is what makes the endgame hold — the Dragon can never
 * fall behind the cultivator, whatever the economy does.
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

/** The Dragon is always callable at the top. What decides it is whether you can win. */
export function atTribulation(s: State): boolean {
  return s.realm === 9;
}

export function canCross(s: State): boolean {
  return s.realm === 9 && s.wardenFell;
}

/** Crossing grants the mark, notes where you stood, and puts the Dragon back up. */
export function crossTribulation(s: State): State {
  if (!canCross(s)) return s;
  return {
    ...s,
    tribulation: s.tribulation + 1,
    tribulationAt: power(s),
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
  };
}

export function upgradeCost(s: State, u: Upgrade): number {
  const i = UPGRADE_INFO[u];
  return Math.ceil(i.base * i.step ** s.levels[u]);
}

export function canBuy(s: State, u: Upgrade): boolean {
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
    * markBonus(s.tribulation);
}

/** The realm is full and only the warden is left? */
export function atCeiling(s: State): boolean {
  return s.layer >= LAYERS_PER_REALM - 1
    && s.qi >= (REALM_COST[s.realm - 1] / LAYERS_PER_REALM) * layerCostFactor(s.unlocked)
    && Number.isFinite(REALM_COST[s.realm - 1]);
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
  const levels = Object.fromEntries(
    UPGRADES.map((u) => [u, clamp(Math.floor(num(rawLevels[u], 0)), 0, 999)]),
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
    return { id, template: tpl.key, rarity, rolls };
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
  const qiCeiling = 1.02 ** 81 * 1.15 ** 200 * 1.10 ** 200 * elapsed + 1e6;

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
    tribulation: realm === 9 ? clamp(Math.floor(num(o.tribulation, 0)), 0, 999) : 0,
    tribulationAt: realm === 9 ? Math.max(0, num(o.tribulationAt, 0)) : 0,
  };
}
