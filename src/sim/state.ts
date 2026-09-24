import {
  BASE_RATE, LAYERS, LAYERS_PER_REALM, LAYER_BONUS, LEVELS_PER_REALM, MARK_DAYS,
  uncappedRate,
  TRIBULATION_CHALLENGE, TRIBULATION_FOOTING, TRIBULATION_GAIN, TRIBULATION_POWER,
  ladderAt, ladderBetween, ladderOpen, levelCap, LEVELS_PER_HEAVEN, CORE_QI_RUNGS, CORE_CAP_EXTRA,
  FLOOR_LOOT, FLOOR_LOOT_GROWTH, FOCUS_MAX, OPENING_PURSE,
} from './balance.ts';
import { BEASTS } from '../data/bestiary.ts';
import { figureOf } from '../data/figures.ts';
import {
  AFFIXES, RARITIES, SECONDARIES, SLOTS, TEMPLATE_BY_KEY, setBonus, wornTotals,
  type Affix, type Item, type Rarity, type Roll, type Worn,
} from '../data/gear.ts';
import { chestLimit } from './chest.ts';
import { affinity, layerCostFactor, powerMultiplier, rateMultiplier, validateUnlocked } from './dao.ts';
import { owed as cardsOwed, valid as validAwakened } from './awaken.ts';
import { validateSequence, validateStance } from './arts.ts';
import { NO_PILLS, brewed as validBrewed, pillPower, type Brewed } from './furnace.ts';
import { recordPower, realmsKnown } from './record.ts';
import { clampRefine } from './refine.ts';
import { isOpen } from './unlocks.ts';
import { weekOf } from './week.ts';
import { heavensOpened } from '../data/heavens.ts';
import { MEET_POINT_CEILING, validMet } from '../data/meetings.ts';
import { BEDS, EMPTY, validBeds, type Bed } from '../data/herbs.ts';
import {
  DOOR_GAP, NO_TAKE, OPENS_AT as SECRET_OPENS_AT, RUN_DAO_CEILING, roomsFor, validTake,
  type Take,
} from '../data/secret.ts';

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
 * a ladder of their own that had nothing to do with the mountain, so the mountain grew
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
  /**
   * 相 Who the cultivator is, or null while the game has not asked yet.
   *
   * 擇 It is a painting and a name and nothing else: no number in this file reads it,
   * no harness measures it, and a save that carries null draws the shape the game has
   * always drawn. It is stored rather than derived because it is the one fact about
   * this cultivator that the climb cannot tell you. See data/figures.ts.
   */
  self: string | null;
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
  /**
   * 悟道 The cards taken at each breakthrough, in the order they were taken.
   *
   * Same shape as `unlocked` and for the same reason: the list is the only thing stored
   * and every fact about it is derived. What is *owed* is derived too, from the realm,
   * so an offer cannot be lost by a reload and never had to be remembered. See
   * sim/awaken.ts.
   */
  awakened: string[];
  /**
   * 緣 The people already met, by key, and the instant of the last one.
   *
   * Both are needed and neither is enough on its own: the list is what stops somebody
   * being met twice, and the instant is what keeps them from arriving one after another
   * on the same visit. `metPoints` is the 道 points meetings have handed over, which are
   * earned exactly like any others. See sim/meet.ts.
   */
  met: string[];
  metAt: number;
  metPoints: number;
  /**
   * 洞天 The three beds. A key and the instant it was planted, and everything else
   * about a bed is derived from those two: how far along it is, whether it is ripe, how
   * long is left. Nothing ticks and nothing has to be caught up on load, which is why a
   * save shut for a week comes back to three ripe beds. See sim/cave.ts.
   */
  beds: Bed[];
  /** How many beds have been taken, for 碑 the stele and for the harnesses. */
  reaped: number;
  /**
   * 秘境 Where the walker is: -1 outside, otherwise the room they stand at.
   *
   * Three numbers and no loot, because everything a room pays is banked the moment it
   * is taken. So a save can never hold a run's worth of gear in flight, losing a fight
   * has nothing to take back, and closing the app in room four keeps every room already
   * walked. `runs` counts the runs finished and is what the next path is drawn from, so
   * the path is fixed before it is walked. See sim/secret.ts.
   */
  runStep: number;
  runAt: number;
  runs: number;
  /**
   * 記 What the last run gave, in total, so the end of one can say so.
   *
   * It is a record and not loot in flight: every room paid into the save the moment it
   * was opened, and this is only the sum of what was already paid. See data/secret.ts.
   */
  lastRun: Take;
  /**
   * 期 The week the quarry's once-a-week qi was last taken in, or -1 for never.
   *
   * 一 One number is the whole memory of the rotation, and everything else about a week
   * is derived from `at`: which beast, which herb, which room, how long is left. A week
   * index rather than an instant on purpose, because a week index cannot be walked
   * backwards by a phone's clock into a second payment. See sim/week.ts.
   */
  quarryWeek: number;
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
 * put down**. The anchor is what makes the endgame hold: the Dragon can never fall
 * behind, whatever the economy does.
 */
export function tribulationPower(s: State, base: number): number {
  return Math.max(base * tribulationScale(s.tribulation), s.tribulationAt * TRIBULATION_CHALLENGE);
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
 * this is what stands in its place, and it is measured in *days of your own rate*
 * rather than in a fixed number, so it grows exactly as fast as you do and a crossing
 * never stops costing two days.
 *
 * Without it the endgame had no clock at all. Power was the only gate, the furnace sold
 * power, and one day's qi bought a fortnight of crossings, measured, ten marks a day,
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
 * cancels the build out of both sides, and what is left is the honest question: what
 * have you added since last time?
 */
/**
 * 立 What a heaven's room is worth in power, and therefore what the Dragon is owed.
 *
 * The two capped upgrades that touch power are 劍訣 and 妖丹, so this is exactly the
 * multiplier a cultivator gets out of a heaven once they have filled the new room. It
 * is computed from the same table the upgrades are bought from, so it cannot drift from
 * what the player actually receives.
 */
export function heavenStep(): number {
  return UPGRADE_INFO.technique.gain ** LEVELS_PER_HEAVEN
    * UPGRADE_INFO.cores.gain ** LEVELS_PER_HEAVEN;
}

export function crossTribulation(s: State, dragonPower: number): State {
  if (!canCross(s)) return s;
  // 境外 Did this crossing open a heaven? If it did, the thing at the end of the next
  // one grows by exactly what the new room is worth. See LEVELS_PER_HEAVEN.
  const opened = heavensOpened(s.tribulation + 1) > heavensOpened(s.tribulation);
  const step = opened ? heavenStep() : 1;
  return {
    ...s,
    tribulation: s.tribulation + 1,
    // Whichever is higher: the Dragon that fell, or what the cultivator actually stood
    // there with. A cultivator arriving at the top is carrying a whole climb's worth of
    // cores, gear and tree that the first Dragon knows nothing about: without this
    // second reading they would walk through twenty crossings on that margin alone
    // before the endgame started asking them for anything.
    //
    // 立 TRIBULATION_FOOTING is what makes that reading honest. What stood in front of the
    // Dragon was not 力; it was 力 with a stance and three arts on it, and that is the
    // number the next Dragon has to be built from.
    tribulationAt: Math.max(s.tribulationAt, dragonPower, power(s) * TRIBULATION_FOOTING) * step,
    qi: Math.max(0, s.qi - tribulationPool(s)),
    wardenFell: false,
  };
}

export function newState(now: number): State {
  return {
    v: 1, at: now, startedAt: now,
    // 囊 The purse the first minute is bought with. See OPENING_PURSE.
    realm: 1, layer: 0, qi: OPENING_PURSE, materials: 0, wardenFell: false,
    levels: { technique: 0, method: 0, pills: 0, cores: 0 },
    killed: {},
    worn: {},
    chest: [],
    unlocked: [],
    self: null,
    stance: null,
    sequence: [],
    tribulation: 0,
    tribulationAt: 0,
    tower: 0,
    brewed: { ...NO_PILLS },
    awakened: [],
    met: [], metAt: 0, metPoints: 0,
    beds: Array.from({ length: BEDS }, () => EMPTY), reaped: 0,
    runStep: -1, runAt: 0, runs: 0, lastRun: NO_TAKE,
    quarryWeek: -1,
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
/**
 * 上限 How many levels of an upgrade this cultivator may hold.
 *
 * Below the summit it is the realm's cap and nothing else. Above it, 境外 a heaven opens
 * LEVELS_PER_HEAVEN more: **but only on the two upgrades that buy power**, and that
 * restriction is the whole of the lesson the first version taught:
 *
 * 功法 and 吐納 multiply the qi rate, and a heaven every three crossings would have
 * multiplied it by six and a half. 雷池 the pool rides the rate, so the *clock* would
 * have held perfectly, which is exactly what made it hard to see. What does not ride
 * the rate is every price written against the ladder, and the furnace is the biggest of
 * them: a rate six times larger makes every pill six times cheaper in real terms, and
 * pills are uncapped power. Measured, the endgame went from 4 walkover crossings in 40
 * to 28.
 *
 * So a heaven does not teach you to gather faster. It gives you somewhere to put what
 * you already gather, and 立 heavenStep hands the same increase to the thing waiting at
 * the end of it, so the fight is exactly as contested as it was before.
 *
 * Passing no upgrade answers the realm's own cap, which is what the screens that speak
 * about all four at once need.
 */
export function capOf(s: State, u?: Upgrade): number {
  const room = u && UPGRADE_INFO[u].affects === 'power'
    ? LEVELS_PER_HEAVEN * heavensOpened(s.tribulation) : 0;
  // 丹 Cores go further than the rest, because they are bought by hand rather than
  // waited for and their own price is already the wall. See CORE_CAP_EXTRA.
  const reach = u === 'cores' ? CORE_CAP_EXTRA : 0;
  return levelCap(s.realm) + reach + room;
}

export function atCap(s: State, u: Upgrade): boolean {
  return s.levels[u] >= capOf(s, u);
}

/** What the next level costs. Qi levels ride the mountain; cores ride materials. */
export function upgradeCost(s: State, u: Upgrade): number {
  const i = UPGRADE_INFO[u];
  const level = s.levels[u];
  if (i.currency === 'material') return Math.ceil(i.share * CORE_STEP ** level);
  // The rung this level belongs to: LEVELS_PER_REALM levels span LAYERS_PER_REALM rungs.
  // Past the eighty-first it is `ladderOpen` rather than `ladderBetween`, which is the
  // same rule the furnace already climbs by: the mountain ends, the price does not.
  const rung = ((level + 1) * LAYERS_PER_REALM) / LEVELS_PER_REALM - 1;
  return Math.ceil(i.share * ladderOpen(rung));
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

/**
 * 凝丹 The other price of a 妖丹 core: raw qi, for somebody with no beast to hand.
 *
 * It rides the rung the cultivator is standing on rather than the core's own level, so
 * it means the same thing at every realm: *this many layers of climbing*, and it can
 * never be outgrown or gamed by stalling. See CORE_QI_RUNGS for why it exists at all.
 */
export function condenseCost(s: State): number {
  return Math.ceil(ladderBetween(layersOpened(s)) * CORE_QI_RUNGS);
}

export function canCondense(s: State): boolean {
  return !atCap(s, 'cores') && s.qi >= condenseCost(s);
}

export function condense(s: State): State {
  if (!canCondense(s)) return s;
  return {
    ...s,
    qi: s.qi - condenseCost(s),
    levels: { ...s.levels, cores: s.levels.cores + 1 },
  };
}

/**
 * 圖鑑 The 道 points a cultivator's bestiary is paying, which is none before the sixth
 * realm. It lives here so that every screen and every harness asks the same question.
 */
export function filledRealms(s: State): number {
  return isOpen(s.realm, 'bestiary') ? realmsKnown(s.killed) : 0;
}

/** Qi rate multiplier coming from upgrades and from what is worn. */
export function rateBonus(s: State): number {
  // 頂 Gear and the tree are the two uncapped things that touch the qi rate, and together
  // they bend toward a ceiling: see UNCAPPED_RATE_CEILING for the twenty-day game they
  // made. The capped upgrades and 雷印 the marks are outside it on purpose.
  const uncapped = setBonus(s.worn, (slot) => affinity(s.unlocked, slot)).rate
    * rateMultiplier(s.unlocked);
  return UPGRADE_INFO.method.gain ** s.levels.method
    * UPGRADE_INFO.pills.gain ** s.levels.pills
    * uncappedRate(uncapped)
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
    // 悟道 No card multiplies this, and that is the measurement rather than an
    // oversight: power is the axis the wall between idle and active is built on. See
    // data/awakening.ts.
    * markBonus(s.tribulation);
}

/** The realm is full and only the warden is left? */
export function atCeiling(s: State): boolean {
  const n = (s.realm - 1) * LAYERS_PER_REALM + s.layer;
  if (s.layer < LAYERS_PER_REALM - 1 || n >= LAYERS - 1) return false;
  return s.qi >= ladderAt(n) * layerCostFactor(s.unlocked);
}

/**
 * 守 When the realm's warden is standing at the end of it.
 *
 * Not *while the bar is full*: **once the last rung is reached**, and it does not walk
 * off again. That distinction is one line and it was worth a day of the first realm.
 *
 * It used to be `atCeiling`, which is the last rung *plus the qi to pay for it*. So a
 * cultivator who arrived at the ceiling too weak, banked qi until they could afford the
 * upgrades that would beat the warden, and then bought them, watched the warden vanish
 * from the screen, because the qi they had just spent was the qi that was holding it
 * there. The game took the fight away at the exact moment the player did the right thing
 * to win it, and then asked them to re-earn a whole rung before offering it again.
 *
 * Traced on a cultivator who opens the app once a day: at 24 hours they stand at the
 * first realm's last rung with 63% against 妖狐 the fox and no fox to fight. They leave
 * the realm at 48 hours. Every visit rhythm leaves it at 98%, so the warden was never
 * the wall: the vanishing was.
 *
 * 費 The toll is untouched. 突破 the breakthrough still costs the ninth rung, which is
 * `canBreakThrough` below, so a realm is still nine rungs paid for. Measured across all
 * eight cultivators, this change costs **zero days**: what it buys is a warden that
 * stays where it is put.
 *
 * 頂 The ninth realm is not part of this. There the bar becomes 雷池 the thunder pool and
 * the Dragon comes when the pool is full: the pool *is* the crossing's price, refilling
 * is the endgame's whole clock, and "fill it and the Dragon comes" is the promise the
 * screen makes.
 */
export function wardenStands(s: State): boolean {
  const n = (s.realm - 1) * LAYERS_PER_REALM + s.layer;
  return s.layer >= LAYERS_PER_REALM - 1 && n < LAYERS - 1;
}

/**
 * 守 And whether it can be fought right now, which is the guard itself rather than a
 * rule a screen remembers. A warden below the last rung has never been reachable; it was
 * only ever the screens declining to draw it, and a guard that lives in a screen is one
 * that a second screen forgets.
 */
export function canFightWarden(s: State): boolean {
  return !s.wardenFell && (s.realm === 9 ? atTribulation(s) : wardenStands(s));
}

/**
 * 費 What it costs to leave a realm, which is the warden and nothing else.
 *
 * Eight rungs of gathering and then the warden: **the warden is the ninth rung**, and
 * that sentence is the whole of the change. It used to also demand that you be holding
 * the ninth rung's price at the moment you pressed 突破, and the breakthrough then threw
 * that qi away.
 *
 * I told Bruno that was a double charge and it was not, and the correction matters
 * because it is the only reason to do this: banking the rung, spending it on upgrades
 * and banking it again is two payments for two different things. What it really is, is
 * a choice about how much a realm costs: nine rungs or eight, and he made it.
 *
 * Measured across the eight cultivators it takes 4 to 8 days off the climb, and it takes
 * most off the ones who show up least, because they are the ones who spent the longest
 * re-earning it.
 *
 * 銀 And the qi is no longer destroyed on the way out. It was destroyed because it *was*
 * the payment; with the payment gone, wiping it would be a second toll dressed as a
 * clean slate, and worse, it would make spending down to nothing before pressing the
 * button the right move, which is a chore rather than a decision. So it carries, and
 * every second spent waiting at a full bar is now qi kept rather than qi burned.
 */
export function canBreakThrough(s: State): boolean {
  return wardenStands(s) && s.wardenFell && s.realm < 9;
}

export function breakThrough(s: State): State {
  if (!canBreakThrough(s)) return s;
  // 銀 The qi carries. See canBreakThrough for why it no longer burns.
  return { ...s, realm: s.realm + 1, layer: 0, wardenFell: false };
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

  // 印 The marks are read before the levels, because the levels are capped against them.
  const tribulation = realm === 9 ? clamp(Math.floor(num(o.tribulation, 0)), 0, 300) : 0;

  const rawLevels = (o.levels ?? {}) as Record<string, unknown>;
  /**
   * Nothing may hold more levels than it is allowed: the cap is what holds the whole
   * curve up, so a hand-edited save does not get to walk around it.
   *
   * 失 It has to be the *same* cap the game sells against, and for a while it was not.
   * This clamped to `levelCap(realm)` flat, while `capOf` adds a heaven's room to the
   * power upgrades and two realms' worth to 妖丹. So a ninth-realm cultivator with two
   * heavens open bought 劍訣 up to 66, closed the app, and reopened it at 54: the save is
   * rewritten on unload, validated on load, and the levels 境外 had just paid for were
   * deleted every single time. Found by round-tripping a save rather than by reading the
   * code, which is the only way this kind of thing is ever found.
   */
  const capFor = (u: Upgrade) => capOf({ realm, tribulation } as State, u);
  const levels = Object.fromEntries(
    UPGRADES.map((u) => [u, clamp(Math.floor(num(rawLevels[u], 0)), 0, capFor(u))]),
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

  /**
   * 藏 The chest is capped at the limit **this cultivator actually has**, and for the
   * whole of the game's life it was capped at the flat forty instead.
   *
   * 運 The Fortune branch, 囊 the pouch nodes, a 藏 line on a piece of gear and 悟道 a
   * card all add slots, and the game fills them: measured, a finished cultivator holds
   * between 58 and 90 pieces. Every one of them past the fortieth was deleted on every
   * load, which is every time the app was closed, because a save is rewritten on unload
   * and validated on the way back in. Found by 氣查 the audit, which round-trips a real
   * run through this function rather than reading it.
   *
   * It is the same bug 失 the levels had, in the same function, for the same reason: a
   * cap written twice, and the copy in here was the older one.
   */
  const unlocked = validateUnlocked(o.unlocked);
  /**
   * 悟道 Each entry has to be a real card from the trio its own turn offers, and there
   * may be no more of them than the cultivator has actually been offered.
   *
   * 境外 The second half of that used to be missing, and the heavens are what made it
   * matter: `valid` checks the *order* of the list and nothing else, so a second-realm
   * save claiming every realm card passed, and once nine more trios existed behind the
   * marks it could claim those too. Seventeen permanent cards on a cultivator who has
   * crossed nothing. The offer is a subtraction, so the cap is the same subtraction.
   */
  const awakened = [...validAwakened(Array.isArray(o.awakened) ? o.awakened.filter(
    (x: unknown): x is string => typeof x === 'string') : [])]
    .slice(0, cardsOwed(realm, tribulation));
  const slots = chestLimit(unlocked,
    wornTotals(worn, (x) => affinity(unlocked, x)).capacity, awakened);

  const chest: Item[] = [];
  for (const raw of Array.isArray(o.chest) ? o.chest : []) {
    if (chest.length >= slots) break;
    const it = item(raw, used);
    if (it) chest.push(it);
  }

  const elapsed = Math.max(0, now - startedAt);

  const out: State = {
    v: 1,
    startedAt,
    at: clamp(num(o.at, now), startedAt, now),
    realm,
    layer,
    qi: Math.max(0, num(o.qi, 0)),
    materials: Math.max(0, num(o.materials, 0)),
    wardenFell: o.wardenFell === true,
    levels,
    killed,
    worn,
    chest,
    unlocked,
    // Neither of these is owned in the save: the stances follow from the realm reached
    // and the arts from the wardens put down. So a hand-edited save cannot put 龍威 in
    // the first slot at realm 1 and walk over every warden in the game.
    // 相 A forged figure is simply not one of the two, so it falls back to not having
    // been asked, which every screen already draws.
    self: figureOf(typeof o.self === 'string' ? o.self : null)?.key ?? null,
    stance: validateStance(o.stance, realm, layer),
    sequence: validateSequence(o.sequence, killed),
    // Marks are only reachable at realm 9, and only one at a time.
    // Capped at three hundred so the multipliers stay inside a double: a mark is
    // worth 4.3x and 4.3^300 is already a number with a hundred and ninety digits.
    tribulation,
    tribulationAt: realm === 9 ? Math.max(0, num(o.tribulationAt, 0)) : 0,
    // The tower is climbed one floor at a time and every floor is a fight, so a save
    // claiming floor nine thousand is claiming nine thousand fights that never happened.
    tower: clamp(Math.floor(num(o.tower, 0)), 0, 3000),
    brewed: validBrewed(o.brewed),
    // 悟道 A forged list could otherwise claim every card in the game, or claim the
    // ninth realm's card in the second. Each entry has to be a card that exists, from
    // the trio that entry's turn actually offers. See sim/awaken.ts.
    awakened,
    // 緣 A key that names nobody is not a meeting, and nobody is met twice. The points
    // are capped at what every meeting in the game could ever hand over, so a forged
    // save cannot claim a tree's worth of them.
    met: validMet(o.met),
    metAt: clamp(num(o.metAt, 0), 0, now),
    // 道 And the bank they land in is not only theirs: 秘境 the vault's shrines pay into
    // it too, so the ceiling has to allow for every walk the clock could have allowed.
    // See RUN_DAO_CEILING for the measurement that made this necessary.
    metPoints: clamp(Math.floor(num(o.metPoints, 0)), 0,
      MEET_POINT_CEILING + Math.ceil(elapsed / DOOR_GAP) * RUN_DAO_CEILING),
    // 洞天 Always exactly three beds. A key naming no herb is an empty bed, and no bed
    // may claim to have been planted tomorrow or before the cultivator existed.
    beds: validBeds(o.beds, clamp(num(o.at, now), startedAt, now), startedAt),
    reaped: clamp(Math.floor(num(o.reaped, 0)), 0, 1e6),
    // 秘境 A step outside the seven rooms is outside, which is what an unknown number
    // means. The realm gates it too: a save cannot claim to be standing in a door the
    // second realm has never seen.
    // 深 And the path this cultivator's own realm walks, not the deepest there is: a
    // seventh-realm save may stand in room ten and a fifth-realm one may not.
    runStep: realm >= SECRET_OPENS_AT
      ? clamp(Math.floor(num(o.runStep, -1)), -1, roomsFor(realm) - 1) : -1,
    runAt: clamp(num(o.runAt, 0), 0, now),
    runs: clamp(Math.floor(num(o.runs, 0)), 0, 1e6),
    lastRun: validTake(o.lastRun, (k) => k in TEMPLATE_BY_KEY, RARITIES),
    // 期 A week the cultivator has not lived through yet is not a week they took the
    // quarry's qi in, so the ceiling is this instant's own week. -1 is never, which is
    // what any save written before the rotation existed comes back as.
    quarryWeek: clamp(Math.floor(num(o.quarryWeek, -1)), -1, weekOf(clamp(num(o.at, now), startedAt, now))),
    // 新 The one piece of state worth nothing to cheat: the worst a forged list can do
    // is skip a card that explains the game. It is bounded so it cannot grow a save.
    seen: (Array.isArray(o.seen) ? o.seen : [])
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 32)
      .filter((x, i, all) => all.indexOf(x) === i)
      .slice(0, 32),
  };

  /**
   * 頂 And the one field that has to be measured against the cultivator itself: the qi.
   *
   * The ceiling exists because an earlier build shipped without any, and a hand-edited
   * heirloom multiplied the qi rate by 196,502x and passed every check. So nothing may
   * hold more qi than it could have gathered in the wall-clock time since the run began.
   *
   * 量 What that number is has to be read off **this cultivator**, and for a long time
   * it was a guess: a typed formula with a factor of ten thousand in it that knew about
   * the two rate upgrades and nothing else. It did not know about 雷印 the marks, and a
   * mark multiplies the rate by 1.728. Measured by 氣查 the audit, a save at forty marks
   * held 78.8 quintillion qi and came back holding 5.26, which is 93% of the endgame
   * deleted on every load, and 雷池 the pool, which is two days of that cultivator's own
   * gathering, sat a hundred million times above what this function would allow them to
   * be standing on. The Dragon could never have been called again.
   *
   * Now it is derived. `rate` already knows everything that touches the rate, because
   * every one of those fields was validated above and none of them can be forged past
   * its own cap. The rate only ever grows, so today's rate across the whole run is
   * already an over-estimate of every second of it, and 入定 at its deepest is the most
   * any of those seconds could have been worth.
   */
  const gathered = rate(out) * FOCUS_MAX * elapsed;
  // What a cultivator is allowed to be standing on having spent nothing: the rung under
  // their feet, and at the summit 雷池 the pool, which the ladder has no way to take.
  const standing = tribulationPool(out) + ladderAt(Math.min(LAYERS - 1, layersOpened(out)));
  // 塔 拆 泉 And the lumps, which are not gathered: a tower floor, a melted chest, a
  // spring, a ripe bed. Ten times over is generous, and still eight orders of magnitude
  // under the number this replaced.
  const qiCeiling = (gathered + standing) * 10 + 1e6;

  /**
   * 材 And the same for the material, which had the same kind of number on it: a flat
   * trillion, typed once and never measured.
   *
   * 塔 The tower is the whole material economy and it has no top, so the pile a real
   * cultivator holds has no fixed size either. Measured by the audit, a save at forty
   * marks held 3.23e29 材 and came back holding a trillion, which is every material the
   * endgame ever earned deleted on every load.
   *
   * So it is read off the tower, which is where the material comes from and which *is*
   * capped, at three thousand floors. A floor pays once and the floors grow
   * geometrically, so the highest floor cleared is worth more than every floor under it
   * put together, and ten thousand times that is a generous ceiling that still moves
   * with the cultivator rather than standing still while they climb past it.
   */
  const floorsWorth = FLOOR_LOOT * FLOOR_LOOT_GROWTH ** Math.max(0, out.tower - 1);
  const matCeiling = floorsWorth * 1e4 + gathered + 1e6;

  return {
    ...out,
    qi: Math.min(out.qi, qiCeiling),
    materials: Math.min(out.materials, matCeiling),
  };
}
