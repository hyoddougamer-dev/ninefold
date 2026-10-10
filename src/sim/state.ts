import {
  BASE_RATE, LAYERS, LAYERS_PER_REALM, LAYER_BONUS, LEVELS_PER_REALM, MARK_DAYS, gearQiRate,
  TRIBULATION_CHALLENGE, TRIBULATION_FOOTING, TRIBULATION_GAIN, TRIBULATION_POWER, ladderAt,
  ladderBetween, ladderOpen, levelCap, LEVELS_PER_HEAVEN, CORE_QI_RUNGS, CORE_CAP_EXTRA, OPENING_PURSE,
  BEDS, CORE_STEP, UPGRADE_NUMBERS, SET_LIMIT
} from './balance.ts';
import { pct } from './format.ts';

import { type Item, type Refined, type Slot, type Worn } from '../data/gear.ts';

import { layerCostFactor, powerMultiplier, rateMultiplier } from './dao.ts';
import { NO_PILLS, pillPower, type Brewed } from './furnace.ts';
import { recordPower, realmsKnown } from './record.ts';
import { isOpen } from './unlocks.ts';
import { bodyTotals, classPower, classQiRoof, classUpgrades } from './schools.ts';
import { heavensOpened } from '../data/heavens.ts';
import { hasBoon } from '../data/meetings.ts';
import { EMPTY, type Bed } from '../data/herbs.ts';
import { NO_TAKE, type Take } from '../data/secret.ts';
import {
  BOON_SWORDSOUL, MELT_CAP, SEAL_DAYS, SEAL_PAY_MINUTES, SEAL_PAY_SHARE, SEAL_PAY_STEP,
  SEAL_PILL_SHARE
} from './balance.ts';

import { NO_CRAFTS, eatPill, feedShare, unsealCarried, type Crafts } from './crafts.ts';
import { type ChestFilter } from './filters.ts';
import { echoFactor, type Life } from './echo.ts';

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
    effect: `+${pct(UPGRADE_NUMBERS.technique.gain - 1)} power`, ...UPGRADE_NUMBERS.technique,
    affects: 'power', currency: 'qi' },
  method: { han: '功法', name: 'Cultivation Method', icon: 'scroll-unfurled',
    effect: `+${pct(UPGRADE_NUMBERS.method.gain - 1)} qi per second`, ...UPGRADE_NUMBERS.method,
    affects: 'rate', currency: 'qi' },
  // Named 丹藥 Pills until 丹爐 the Furnace arrived and took the word. Two things called
  // "pills" on two screens is exactly the confusion the copy rules forbid, so this one
  // became what it always was: breathing.
  pills: { han: '吐納', name: 'Breathwork', icon: 'energy-breath',
    effect: `+${pct(UPGRADE_NUMBERS.pills.gain - 1)} qi per second`, ...UPGRADE_NUMBERS.pills,
    affects: 'rate', currency: 'qi' },
  cores: { han: '妖丹', name: 'Beast Cores', icon: 'crystal-cluster',
    effect: `+${pct(UPGRADE_NUMBERS.cores.gain - 1)} power`, ...UPGRADE_NUMBERS.cores,
    affects: 'power', currency: 'material' },
};

/** 套 A saved set of gear. See State.sets. */
export interface GearSet {
  readonly name: string;
  readonly ids: Partial<Record<Slot, string>>;
}

export { SET_LIMIT };

/** 名 A loadout's name, cleaned once for the save and for the screen: no control characters, 24 at most. */
export function cleanSetName(raw: string): string {
  return raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
}

/**
 * 套 The three things done to gear that read a body: 煉 fusing (the fusion line), 拆
 * melting (寶匠 the Treasure Smith) and 煉器 refining (器 the Artificer). Each can be given
 * a loadout. See State.tasks.
 */
export const TASKS = ['fuse', 'melt', 'refine'] as const;
export type Task = (typeof TASKS)[number];

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
  /**
   * 瓶頸 When this realm's last rung was reached and its warden came to stand at the gate,
   * in seconds; 0 while no warden stands. The wall loosens with every day after it (see
   * BOTTLENECK_LOOSEN), so a cultivator who only waits still gets through.
   */
  gateAt: number;
  /**
   * 封 Seconds of this gate's seal that qi has filled (paySeal), and that Breakthrough Pills
   * made for a realm below have (feedSeal). Both belong to the gate standing now: 0 while no
   * warden stands, and 0 again the moment the gate is left. Each is capped by validate() in load.ts.
   * Absent in a save from before the bar, which the server reads without the bar's
   * allowance (sealSeconds): a save that carries them is one the bar's game wrote.
   */
  sealPaid?: number;
  sealFed?: number;
  levels: Record<Upgrade, number>;
  killed: Record<string, number>;
  /** 器 What is on the body. */
  worn: Worn;
  /** 藏 What is in the chest, capped at CHEST_LIMIT plus whatever 運 has added. */
  chest: Item[];
  /**
   * 圍 What the last drive left on the table, waiting to be answered: every piece that
   * fell, best first (at most DRIVE_PILE, which is more than a drive can roll), and the
   * instant they fell. Written to the save as rows (sim/pilepack.ts). Nothing in here is worn,
   * fused or counted by anything else, and nothing in here is lost while it waits; the
   * game answers for the player once PILE_HOLD has gone by. See sim/pile.ts.
   */
  pile: Item[];
  pileAt: number;
  /**
   * 留 Whether the layer is held: the bar fills as ever, but a full bar waits for a tap
   * (openLayer) instead of opening by itself, so the qi can be spent on upgrades. Off in
   * every save that never said otherwise. See advance().
   */
  hold: boolean;
  /**
   * 煉 The refining levels of each place on the body. They belong to the place: whatever
   * is worn there has them, a place left empty keeps them for the next piece, and nothing
   * done to a piece (taking it off, melting it, fusing it) moves them. Before 2026-10-06
   * they were stored on the pieces; validate() in load.ts moves an old save's onto the places. See
   * Refined in data/gear.ts.
   */
  refined: Refined;
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
  /**
   * 閉關 The instant the door was shut, or 0 while it is open, and 心魔 how many heart
   * demons have fallen. Everything else about seclusion is derived from these and `at`.
   * See sim/seclusion.ts.
   */
  secludedAt: number;
  demons: number;
  /** 訣 The arts in the order they fire, at most SEQUENCE_SLOTS of them. */
  sequence: string[];
  /** 雷印 Thunder marks: tribulations crossed after the ninth realm. */
  tribulation: number;
  /** 印 The power you had when the last mark was taken. The next Dragon grows from it. */
  tribulationAt: number;
  /** 塔 The highest floor of the Endless Tower that has fallen. */
  tower: number;
  /**
   * 拆 The melting allowance, in seconds of this cultivator's own gathering: what melting
   * a piece may still pay in qi. Fills with time (advance), drawn by every melt. See
   * MELT_FILL.
   */
  melt: number;
  /**
   * 套 Saved sets of gear: a name and, for each place on the body, the piece that goes
   * there. Pieces are named by id and looked up when the set is put on, so a set never
   * holds a copy of anything. See sim/sets.ts.
   */
  sets: readonly GearSet[];
  /**
   * 套 Which loadout each gear task reads, by its place in `sets`. speculaether, on the
   * Discord: one outfit for fusing, one for crafting, one for qi, changed by hand every
   * time. A task given a loadout reads that loadout's body for its numbers, and what is
   * worn stays worn; a task given none reads what is worn, as it always did. See sets.ts
   * taskBody.
   */
  tasks: Partial<Record<Task, number>>;
  /**
   * 存 The chest's saved filters, and 熔 which of them a full chest must spare. See
   * sim/filters.ts.
   */
  filters: readonly ChestFilter[];
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
  /** 龕 The 道 points 秘境 the vault's shrines have paid, against SHRINE_DAO_PER_REALM. */
  vaultDao: number;
  /**
   * 緣 Which answer each meeting was given, by key. The road remembers it: some people
   * only come back to somebody who answered them one way, the 心 heart is added up from
   * it, and the things that stay (boons) are read from it. Older saves have none, and
   * lose nothing by it: their meetings stay met.
   */
  chose: Record<string, 0 | 1>;
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
  /** 鑰 The day (epoch seconds / 86 400) a Realm Key last opened the door. See useKey. */
  keyDay: number;
  /** 岔 When a fork on the 道 Path was last swapped for its twin, in seconds. See sim/fork.ts. */
  forkAt: number;
  /**
   * 泉 The vault's spring: seconds of shut time it holds (at most SPRING_HOLD), counted up
   * to `springAt`. What it holds now is derived (springNow in sim/secret.ts), and so is what
   * each room's share of it is: the rooms are not stored.
   */
  spring: number;
  springAt: number;
  /**
   * 香 The instant the incense burning in the vault's burner runs out, or 0. A stick lit
   * while one burns waits behind it, so one instant is the whole queue; advance() pays
   * INCENSE_BONUS of the standing rate for every second before it.
   */
  incenseUntil: number;
  /** 跡 A challenger's trail taken in the vault: the next 擂台 challenger begins wounded. */
  trail: boolean;
  /**
   * 擂台 The Platform: which period the challengers beaten were counted in (a week and the
   * realm, see periodOf) and how many of its three have fallen. A new period reads as none.
   */
  platform: { readonly period: number; readonly beaten: number };
  /** 擂 Every challenger ever beaten. It only grows, and 驗 the server bounds it by the weeks. */
  bouts: number;
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
  /**
   * 緣 The bond with each beast hunted since gear opened: wins toward a certain drop,
   * and the best rank (an index into RARITIES) that beast has ever left. See FATE_FULL.
   */
  fate: Record<string, { n: number; best: number }>;
  /**
   * 業 The workshop: experience, the task in hand and the instant it was settled to, the
   * pouch, familiarity, tools and arrays. Its levels are derived from its experience, and
   * which beasts it can render from the kills above. See sim/crafts.ts.
   */
  crafts: Crafts;
  /** 新 Which one-time notices have been read. Cosmetic, and the only state that is. */
  seen: string[];
  /**
   * 世 The lives that ended before this one: the marks each crossed and the instant it
   * ended. Empty for a first life. 宿慧 the Echo, the title and the day this life began are
   * all derived from it. See sim/echo.ts and sim/rebirth.ts.
   */
  lives: readonly Life[];
  /**
   * 承 The codex the lives before this one finished: for each of the nine sets in realm
   * order, the best rank (0 none, 1 Mystic to 3 Heaven) any life reached. Empty for a first
   * life and for one whose lives finished no set. Written by reincarnate() alone; the codex
   * reads the higher of this and what this life has made. See sim/hundred.ts.
   */
  codexKept: readonly number[];
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
 * 宿慧 Qi gathered per second: the rate, and 宿慧 the Echo of the lives before this one on
 * top of it. This is what the bar fills at (advance) and what the screen calls the standing
 * rate. Everything paid as seconds of the rate (a bed, a meeting, the spring, a melt) and
 * everything priced in it (a drive, a retrade) keeps reading rate(): the Echo is a share of
 * the cultivating and nothing else, which is what keeps it from reaching any lump.
 */
export function gathering(s: State): number {
  return rate(s) * echoFactor(s.lives);
}

/**
 * 雷池 The thunder pool: two days of gathering at the summit, and the gate on the Dragon.
 *
 * Every other realm is left by filling a layer. The ninth has no layer left to fill, so
 * this is what stands in its place, measured in days of a *standard* rate: the summit's,
 * with 功法 method and 吐納 breathing at this heaven's cap, nothing worn, no Path, and the
 * marks you hold. So it grows with the marks, as fast as the cultivator, and a crossing
 * keeps costing about two days.
 *
 * It used to be two days of your own rate, and rekaris found what that did (2026-10-06):
 * a Qi set made the pool bigger, so the Dragon came in 6h08 dressed for qi and in 3h22
 * stripped. Anything worn or bought that raised the rate raised the gate with it, the
 * trap the tower's pay had until it was read off the floor alone. Now the pool reads
 * nothing you can change but the marks, and qi gear fills it faster, as it should.
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
  const at = { realm: 9, tribulation: s.tribulation } as State;
  const standard = BASE_RATE * LAYER_BONUS ** (LAYERS - 1)
    * UPGRADE_INFO.method.gain ** capOf(at, 'method')
    * UPGRADE_INFO.pills.gain ** capOf(at, 'pills')
    * markBonus(s.tribulation);
  return standard * 86_400 * MARK_DAYS;
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

export function crossTribulation(s: State, dragonPower: number, even: number): State {
  if (!canCross(s)) return s;
  // 境外 Did this crossing open a heaven? If it did, the thing at the end of the next
  // one grows by exactly what the new room is worth. See LEVELS_PER_HEAVEN.
  const opened = heavensOpened(s.tribulation + 1) > heavensOpened(s.tribulation);
  const step = opened ? heavenStep() : 1;
  return {
    ...s,
    tribulation: s.tribulation + 1,
    // Whichever is higher: the Dragon that fell, or the one this cultivator would have
    // met at even odds, stood a footing above it. A cultivator arriving at the top is
    // carrying a whole climb's worth of cores, gear and tree that the first Dragon knows
    // nothing about: without the second reading they would walk through twenty
    // crossings on that margin alone before the endgame started asking them for anything.
    //
    // 立 `even` is read off the fight (evenDragon in combat.ts), stance, arts and class
    // included, so what the next Dragon is built from is what actually stood there.
    tribulationAt: Math.max(s.tribulationAt, dragonPower, even * TRIBULATION_FOOTING) * step,
    qi: Math.max(0, s.qi - tribulationPool(s)),
    wardenFell: false,
    gateAt: 0,
  };
}

export function newState(now: number): State {
  return {
    v: 1, at: now, startedAt: now,
    // 囊 The purse the first minute is bought with. See OPENING_PURSE.
    realm: 1, layer: 0, qi: OPENING_PURSE, materials: 0, wardenFell: false, gateAt: 0, sealPaid: 0, sealFed: 0,
    levels: { technique: 0, method: 0, pills: 0, cores: 0 },
    killed: {},
    worn: {},
    chest: [],
    pile: [], pileAt: 0, hold: false,
    refined: {},
    unlocked: [],
    self: null,
    secludedAt: 0, demons: 0,
    stance: null,
    sequence: [],
    tribulation: 0,
    tribulationAt: 0,
    tower: 0,
    melt: MELT_CAP,
    sets: [],
    tasks: {},
    filters: [],
    brewed: { ...NO_PILLS },
    awakened: [],
    met: [], metAt: 0, metPoints: 0, vaultDao: 0, chose: {},
    beds: Array.from({ length: BEDS }, () => EMPTY), reaped: 0,
    runStep: -1, runAt: 0, runs: 0, lastRun: NO_TAKE, keyDay: 0, forkAt: 0,
    spring: 0, springAt: now, incenseUntil: 0, trail: false,
    platform: { period: -1, beaten: 0 }, bouts: 0,
    quarryWeek: -1,
    fate: {},
    crafts: { ...NO_CRAFTS, since: now },
    seen: [],
    lives: [],
    codexKept: [],
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
  if (i.currency === 'material') return Math.ceil(i.share * CORE_STEP ** level * classUpgrades(s));
  // The rung this level belongs to: LEVELS_PER_REALM levels span LAYERS_PER_REALM rungs.
  // Past the eighty-first it is `ladderOpen` rather than `ladderBetween`, which is the
  // same rule the furnace already climbs by: the mountain ends, the price does not.
  const rung = ((level + 1) * LAYERS_PER_REALM) / LEVELS_PER_REALM - 1;
  // 職 氣 The Qi school pays in cheaper upgrades, because it may not pay in more qi.
  return Math.ceil(i.share * ladderOpen(rung) * classUpgrades(s));
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
 * 盡 As many of one upgrade as can be paid for now, each at its own price, the way a
 * player tapping the box until it greys out would buy them. Nothing is cheaper for being
 * bought together: it is buy() in a loop, and stops where buy() would.
 */
export function buyMax(s: State, u: Upgrade): { state: State; n: number; cost: number } {
  let state = s;
  let n = 0;
  let cost = 0;
  while (canBuy(state, u) && n < 10_000) {
    cost += upgradeCost(state, u);
    state = buy(state, u);
    n++;
  }
  return { state, n, cost };
}

/** 修 Whether 修 draws this upgrade's box: 妖丹 waits for the realm that sells it. */
export function onScreen(s: State, u: Upgrade): boolean {
  return u !== 'cores' || isOpen(s.realm, 'cores');
}

/**
 * 盡 Buy all: every level that can be paid for now, the cheapest first, each at its own
 * price, until nothing more can be. It is the loop the measuring cultivators have always
 * bought by (tools/habits.ts), so the button and the curves are the same player. A box
 * the realm has not opened yet (妖丹 before its realm) is not bought by the button, which
 * buys only what 修 shows; the harness passes its own rule and keeps its old behaviour.
 */
export function buyAll(s: State, shown: (s: State, u: Upgrade) => boolean = onScreen): { state: State; n: number } {
  let state = s;
  let n = 0;
  for (let g = 0; g < 10_000; g++) {
    const can = UPGRADES.filter((u) => shown(state, u) && canBuy(state, u));
    if (!can.length) break;
    can.sort((a, b) => upgradeCost(state, a) - upgradeCost(state, b));
    state = buy(state, can[0]);
    n++;
  }
  return { state, n };
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
  // 氣膝 The gear's bend is read on the rung, so a realm's own pieces still count: see
  // QI_KNEE_FIRST.
  // 備 bodyTotals is read once per body and tree, and this is asked thousands of times.
  return UPGRADE_INFO.method.gain ** s.levels.method
    * UPGRADE_INFO.pills.gain ** s.levels.pills
    * gearQiRate(bodyTotals(s).rate / 100, rateMultiplier(s.unlocked), layersOpened(s), classQiRoof(s))
    * markBonus(s.tribulation);
}

/** 力 Combat power. It decides every beast, and only upgrades and the ladder move it. */
export function power(s: State): number {
  const ladder = (s.realm - 1) * LAYERS_PER_REALM + s.layer + 1;
  return ladder * UPGRADE_INFO.technique.gain ** s.levels.technique
    * UPGRADE_INFO.cores.gain ** s.levels.cores
    * (1 + bodyTotals(s).power / 100)
    * powerMultiplier(s.unlocked)
    * pillPower(s.brewed)
    * (isOpen(s.realm, 'record') ? recordPower(s.killed) : 1)
    // 悟道 No card multiplies this, and that is the measurement rather than an
    // oversight: power is the axis the wall between idle and active is built on. See
    // data/awakening.ts.
    * markBonus(s.tribulation)
    // 職 劍 The Sword school: the one class perk on power itself. See sim/schools.ts.
    * classPower(s)
    // 劍魂 A sword soul from the road: a keepsake, given once. See data/meetings.ts.
    * (hasBoon(s, 'swordsoul') ? BOON_SWORDSOUL : 1);
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
  return !s.wardenFell && (s.realm === 9 ? atTribulation(s) : wardenStands(s) && !sealed(s));
}

/** 封 How many days a realm's gate stays sealed after its warden comes out: SEAL_DAYS. */
export function sealDays(realm: number): number {
  return realm >= 1 && realm <= 9 ? SEAL_DAYS[realm - 1] ?? 0 : 0;
}

/**
 * 封 Days of the gate's bar still to fill, with `unseal` days of a carried 破境丹 Breakthrough
 * Pill counted as already filled. 0 when the gate is open: no seal in this realm, the warden
 * not out yet or already beaten, or the bar full. The bar fills with time by itself
 * (waiting alone always fills it in sealDays), and with what was paid in: qi (paySeal) and
 * Breakthrough Pills made for a realm below (feedSeal). A gate a save holds without a time
 * (gateAt 1, one from before the bottleneck) was met long ago.
 */
export function sealLeft(s: State, unseal = 0): number {
  const days = sealDays(s.realm);
  if (days <= 0 || s.wardenFell || !wardenStands(s) || s.gateAt <= 0) return 0;
  const waited = Math.max(0, (s.at - s.gateAt) / 86_400);
  return Math.max(0, days - waited - sealFilled(s) - Math.max(0, unseal));
}

/** 封 The days of the bar qi and lesser pills have filled at this gate so far. */
export function sealFilled(s: State): number {
  return (Math.max(0, s.sealPaid ?? 0) + Math.max(0, s.sealFed ?? 0)) / 86_400;
}

/**
 * 封 How much more of this gate's bar (in days) qi may still fill: SEAL_PAY_SHARE of the
 * seal, less what it has filled, and never more than the bar has left to fill.
 */
export function sealPayRoom(s: State): number {
  const left = sealLeft(s);
  if (left <= 0) return 0;
  return Math.max(0, Math.min(left, sealDays(s.realm) * SEAL_PAY_SHARE - Math.max(0, s.sealPaid ?? 0) / 86_400));
}

/**
 * 封 The same for lesser Breakthrough Pills: SEAL_PILL_SHARE of the seal, less what they
 * have filled, and never more than the bar has left to fill.
 */
export function sealFeedRoom(s: State): number {
  const left = sealLeft(s);
  if (left <= 0) return 0;
  return Math.max(0, Math.min(left, sealDays(s.realm) * SEAL_PILL_SHARE - Math.max(0, s.sealFed ?? 0) / 86_400));
}

/**
 * 封 What the next tap on the bar fills, in days: a SEAL_PAY_STEP of the seal, or what is
 * left of the room qi has there (sealPayRoom). 0 when nothing can be paid.
 */
export function sealStep(s: State): number {
  return Math.min(sealDays(s.realm) * SEAL_PAY_STEP, sealPayRoom(s));
}

/**
 * 封 What a tap on the bar costs in qi: SEAL_PAY_MINUTES of the cultivator's own gathering
 * (the standing rate, gathering(), with no 入定 and no incense) for every hour it fills. Read
 * off the rate and never into it, so it is a sink that follows the cultivator and nothing
 * paid here can raise anything.
 */
export function sealPrice(s: State): number {
  return sealStep(s) * 24 * SEAL_PAY_MINUTES * 60 * gathering(s);
}

/** 封 Whether a tap on the bar can be paid for right now. */
export function canPaySeal(s: State): boolean {
  const price = sealPrice(s);
  return sealStep(s) > 1e-9 && s.qi >= price;
}

/**
 * 封 Pay qi into the bar: one tap fills sealStep, repeatedly, up to SEAL_PAY_SHARE of the
 * seal. It costs sealPrice, which leaves the save and goes nowhere.
 */
export function paySeal(s: State): State {
  if (!canPaySeal(s)) return s;
  const step = sealStep(s);
  return { ...s, qi: Math.max(0, s.qi - sealPrice(s)), sealPaid: Math.max(0, s.sealPaid ?? 0) + step * 86_400 };
}

/**
 * 封 Eat a Breakthrough Pill made for a realm below this gate to fill part of the bar
 * (feedShare of the seal, up to SEAL_PILL_SHARE of it in all), repeatedly. The pill is
 * spent. The pill made for the gate's own realm is carried instead and breaks the whole bar
 * (see kitFor), so it is never eaten here.
 */
export function feedSeal(s: State, key: string): State {
  const room = sealFeedRoom(s);
  const share = feedShare(key, s.realm);
  if (room <= 0 || share <= 0 || (s.crafts.pouch[key] ?? 0) < 1) return s;
  const fill = Math.min(room, share * sealDays(s.realm));
  const eaten = eatPill(s, key);
  return { ...eaten, sealFed: Math.max(0, s.sealFed ?? 0) + fill * 86_400 };
}

/** 封 The days of the bar a lesser pill (a pouch key) would fill at this gate, or 0. */
export function feedDays(s: State, key: string): number {
  return Math.min(sealFeedRoom(s), feedShare(key, s.realm) * sealDays(s.realm));
}

/**
 * 封 Whether the gate is sealed against a fight right now, with what is carried: a
 * Breakthrough Pill in its hand breaks the seal, and waiting it out always does.
 */
export function sealed(s: State): boolean {
  return sealLeft(s, unsealCarried(s)) > 0;
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
  return { ...s, realm: s.realm + 1, layer: 0, wardenFell: false, gateAt: 0, sealPaid: 0, sealFed: 0 };
}
