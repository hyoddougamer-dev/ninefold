/**
 * 早 What there is to do in the first three realms, counted visit by visit.
 *
 * Bruno, playing it: *"sinto que não há mais nada a fazer sem ser esperar e fazer hunt e
 * salvage para qi nos early realms, é um pouco entediante."*
 *
 * That is a claim about the game, so it gets measured rather than argued with. A
 * cultivator plays the way a phone game is really played, twelve short visits a day, and
 * every visit is asked one question: **what could you press, and was any of it new?**
 *
 * Nine kinds of thing are counted, and they are not all worth the same:
 *
 *   新 a beast walked out that has never been fought       a genuinely new thing
 *   錄 a beast one kill from 見, 熟 or 通                    progress with an end in sight
 *   買 an upgrade you can afford and are not capped on      a decision
 *   道 a node in the tree you can afford                    a decision
 *   器 something in the chest better than what you wear     a decision
 *   妖 the warden, standing and worth trying                the moment of the realm
 *   突破 the breakthrough itself
 *   拆 melting, which is never a decision: it is tidying
 *   狩 hunting a beast already 通 Mastered, which pays and asks nothing
 *
 * The last two are the ones Bruno named. A visit whose only offers are those two is a
 * visit with **nothing to decide**, and the headline number is the share of visits in
 * each realm that look like that.
 *
 *     npm run early
 */
import { LAYERS_PER_REALM, focusAt } from '../src/sim/balance.ts';
import {
  UPGRADES, breakThrough, buy, canBreakThrough, canBuy, canCondense, canFightWarden,
  capOf, condense, filledRealms, newState, upgradeCost, type State,
} from '../src/sim/state.ts';
import { advance, layersOpened } from '../src/sim/time.ts';
import { odds, takeKill } from '../src/sim/combat.ts';
import { huntable, wardenOf } from '../src/data/bestiary.ts';
import { isOpen, systemInfo, SYSTEMS } from '../src/sim/unlocks.ts';
import { ALL_NODES } from '../src/data/techniques.ts';
import { affinity, canUnlock, daoFree, dropChanceBonus, dropsRankUp, rarityLuck } from '../src/sim/dao.ts';
import { rollDrop } from '../src/sim/drops.ts';
import { salvageUpTo, salvageValue } from '../src/sim/salvage.ts';
import { addToChest, chestLimit, equip, itemWorth } from '../src/sim/chest.ts';
import { SLOTS, templateOf, wornTotals, type Slot } from '../src/data/gear.ts';
import { canRefine, refine, refinePrice } from '../src/sim/trials.ts';
import { advice } from '../src/app/advice.ts';
import { MARKS, marksOf } from '../src/sim/record.ts';
import { DRIVE_SIZES, canDrive, drive, driveCost } from '../src/sim/hunt.ts';
import { ladderBetween } from '../src/sim/balance.ts';
import type { Beast } from '../src/data/bestiary.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;
/**
 * 人 How the cultivator plays. Three of them, because the first measurement this
 * harness made was of somebody who does not exist.
 *
 * It started with twelve visits a day and six kills a visit, reached the fourth realm on
 * day four and reported that there was never nothing to do. Bruno's own save is realm 3
 * on **day 31**, with about a hundred kills behind it in total. So the model was not
 * wrong about the game, it was measuring a cultivator who plays it eighteen times harder
 * than the person complaining. A harness calibrated to nobody proves nothing.
 */
export interface Player {
  readonly name: string;
  readonly checks: number;
  readonly minutes: number;
  readonly hunts: number;
  readonly who: string;
}

export const PLAYERS: readonly Player[] = [
  { name: 'Bruno', checks: 3, minutes: 4, hunts: 1,
    who: 'Calibrated to the real save: realm 3 on day 31, about a hundred kills behind it.' },
  { name: 'grinds', checks: 12, minutes: 2, hunts: 6,
    who: 'Opens it every waking hour and kills whatever is in front of them.' },
  { name: 'drops in', checks: 2, minutes: 5, hunts: 3,
    who: 'Twice a day, a few minutes, a handful of fights.' },
];

/** What a visit was offered. Every field is a thing the player could have pressed. */
export interface Offers {
  readonly day: number;
  readonly realm: number;
  readonly layer: number;
  /** 新 A beast out in this realm that has never been fought. */
  readonly fresh: number;
  /** 錄 Beasts still short of a mark, which is progress you can see the end of. */
  readonly marking: number;
  /** 狩 Beasts already 通 Mastered: they still pay, and they ask nothing. */
  readonly stale: number;
  /** 買 Upgrades affordable right now and not at the realm's ceiling. */
  readonly buys: number;
  /** 道 Nodes in the tree affordable right now. */
  readonly nodes: number;
  /** 器 A piece in the chest better than the one worn in its slot. */
  readonly wear: number;
  /** 拆 Anything in the chest at all. */
  readonly melt: boolean;
  /** 妖 The warden, standing, and worth a try. */
  readonly warden: boolean;
  readonly breakthrough: boolean;
  /** 道 Points already earned and not yet spent: a free upgrade sitting in a tab. */
  readonly freePoints: number;
  /** 示 Which character the one line of advice was pointing at. */
  readonly pointedAt: string;
}

/** A visit with something to decide, as against one that is only tidying and grinding. */
export function decides(o: Offers): boolean {
  return o.fresh > 0 || o.marking > 0 || o.buys > 0 || o.nodes > 0
    || o.wear > 0 || o.warden || o.breakthrough;
}

/** 曆 A thing that happened for the first time, and the day it happened. */
export interface Arrival { readonly day: number; readonly realm: number; readonly what: string; }

function betterInChest(s: State): number {
  let n = 0;
  for (const item of s.chest) {
    const slot = templateOf(item).slot as Slot;
    const worn = s.worn[slot];
    if (!worn || itemWorth(item) > itemWorth(worn)) n++;
  }
  return n;
}

function takeDrop(s: State, beast: Beast, seed: number): State {
  const fortune = {
    chance: dropChanceBonus(s.unlocked),
    luck: rarityLuck(s.unlocked),
    always: dropsRankUp(s.unlocked),
  };
  const item = rollDrop(beast, s.realm, seed, fortune);
  if (!item) return s;
  const limit = chestLimit(s.unlocked, wornTotals(s.worn, (x) => affinity(s.unlocked, x)).capacity);
  const kept = addToChest(s.chest, item, limit);
  let out: State = { ...s, chest: [...kept.chest] };
  if (kept.dropped) out = { ...out, qi: out.qi + salvageValue(kept.dropped) };
  if (kept.dropped?.id === item.id) return out;
  const slot = templateOf(item).slot as Slot;
  const worn = out.worn[slot];
  if (!worn || itemWorth(item) > itemWorth(worn)) {
    const after = equip(out.worn, out.chest, item, slot);
    out = { ...out, worn: after.worn, chest: [...after.chest] };
  }
  return out;
}

const WARDEN_KEYS = new Set(Array.from({ length: 9 }, (_, i) => wardenOf(i + 1).key));

function freeNodes(s: State): number {
  const wardens = Object.keys(s.killed).filter((k) => WARDEN_KEYS.has(k)).length;
  return daoFree(layersOpened(s), wardens, s.unlocked, filledRealms(s));
}

export interface Early {
  readonly visits: readonly Offers[];
  readonly arrivals: readonly Arrival[];
  readonly state: State;
}

/** Play the first `upTo` realms, recording every visit and every first time. */
export function walk(p: Player, upTo = 3, spends = true): Early {
  const { checks: CHECKS, minutes: MINUTES, hunts: HUNTS } = p;
  let s = newState(T0);
  let t = T0;
  const tick = DAY / CHECKS;
  const visits: Offers[] = [];
  const arrivals: Arrival[] = [];
  let seed = 991;
  const met = new Set<string>();
  const marked = new Set<string>();
  const opened = new Set<string>();
  const seenRank = new Set<string>();
  const say = (what: string) => arrivals.push({ day: (t - T0) / DAY, realm: s.realm, what });

  for (const sys of SYSTEMS) if (isOpen(s.realm, sys.key)) opened.add(sys.key);

  while (s.realm <= upTo && (t - T0) / DAY < 400) {
    const open = MINUTES * 60;
    for (let k = 1; k <= 10; k++) s = advance(s, t + (open * k) / 10, false, focusAt((open * k) / 10, 0));
    t += tick;
    s = advance(s, t);

    // 察 Read the screen *before* touching anything: this is what the player saw.
    const out = huntable(s.realm, s.layer);
    const o: Offers = {
      day: (t - T0) / DAY, realm: s.realm, layer: s.layer,
      fresh: out.filter((b) => !(s.killed[b.key] ?? 0)).length,
      marking: out.filter((b) => (s.killed[b.key] ?? 0) > 0
        && marksOf(s.killed[b.key] ?? 0) < MARKS.length).length,
      stale: out.filter((b) => marksOf(s.killed[b.key] ?? 0) >= MARKS.length).length,
      buys: UPGRADES.filter((u) => canBuy(s, u) && s.levels[u] < capOf(s, u)).length,
      nodes: isOpen(s.realm, 'tree')
        ? ALL_NODES.filter((n) => canUnlock(n.key, s.unlocked, freeNodes(s), isOpen(s.realm, 'keystones'))).length
        : 0,
      wear: betterInChest(s),
      melt: s.chest.length > 0,
      warden: canFightWarden(s) && odds(s, wardenOf(s.realm)) > 0.2,
      breakthrough: canBreakThrough(s),
      freePoints: isOpen(s.realm, 'tree') ? freeNodes(s) : 0,
      pointedAt: advice(s)?.han ?? '',
    };
    visits.push(o);

    // 演 And then play the visit.
    if (canFightWarden(s)) {
      for (let i = 0; i < 40; i++) {
        if (odds(s, wardenOf(s.realm)) > 0.5 || !canCondense(s)) break;
        s = condense(s);
      }
    }
    if (canFightWarden(s) && odds(s, wardenOf(s.realm)) > 0.2) {
      const before = s.realm;
      s = takeKill(s, wardenOf(s.realm));
      if (s.wardenFell) say(`妖 beat ${wardenOf(before).name}, the warden`);
    }
    if (canBreakThrough(s)) {
      s = breakThrough(s);
      say(`境 broke through into realm ${s.realm}`);
      for (const sys of SYSTEMS) {
        if (isOpen(s.realm, sys.key) && !opened.has(sys.key)) {
          opened.add(sys.key);
          say(`開 ${systemInfo(sys.key).name} opened`);
        }
      }
    }

    for (let i = 0; i < HUNTS; i++) {
      const b = [...huntable(s.realm, s.layer)].reverse().find((x) => odds(s, x) > 0.7);
      if (!b) break;
      if (!met.has(b.key)) { met.add(b.key); say(`新 ${b.name} walked out`); }
      const was = marksOf(s.killed[b.key] ?? 0);
      s = takeKill(s, b);
      const now = marksOf(s.killed[b.key] ?? 0);
      if (now > was) {
        const key = `${b.key}:${now}`;
        if (!marked.has(key)) { marked.add(key); say(`錄 ${b.name} reached mark ${now} of ${MARKS.length}`); }
      }
      const before = s.chest.length;
      s = takeDrop(s, b, ++seed);
      for (const it of s.chest.slice(before)) {
        if (!seenRank.has(it.rarity)) { seenRank.add(it.rarity); say(`階 first ${it.rarity} piece fell`); }
      }
    }

    if (isOpen(s.realm, 'gear')) s = salvageUpTo(s, 'spirit');

    // 煉器 The visit walk refines too, or the state it measures the advice against is
    // one where material only ever piles up and the line would fire for ever.
    if (spends && isOpen(s.realm, 'refine')) for (let i = 0; i < 60; i++) {
      const keep = canBuy(s, 'cores') ? upgradeCost(s, 'cores') : 0;
      const slot = SLOTS.filter((x) => s.worn[x] && canRefine(s, x))
        .sort((a, b) => itemWorth(s.worn[b]!) - itemWorth(s.worn[a]!))[0];
      if (!slot) break;
      const price = refinePrice(s, slot);
      if (price === null || s.materials - price < keep) break;
      s = refine(s, slot);
    }

    for (let g = 0; g < 400; g++) {
      const can = UPGRADES.filter((u) => canBuy(s, u));
      if (!can.length) break;
      can.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
      s = buy(s, can[0]);
    }
    // 道 Nodes are bought the moment they can be, which is the most generous reading.
    // 示 Unless we are measuring what a player who has not found the tab is told, which
    // is Bruno's case exactly: eleven points unspent, and the advice pointing at a bat.
    if (spends && isOpen(s.realm, 'tree')) for (let g = 0; g < 200; g++) {
      const want = ALL_NODES.find((n) => canUnlock(n.key, s.unlocked, freeNodes(s), isOpen(s.realm, 'keystones')));
      if (!want) break;
      s = { ...s, unlocked: [...s.unlocked, want.key] };
      say(`道 bought ${want.key}`);
    }

    const l = layersOpened(s);
    const at = `${s.realm}:${l % LAYERS_PER_REALM}`;
    if (!opened.has(`layer${at}`)) { opened.add(`layer${at}`); }
  }
  return { visits, arrivals, state: s };
}

/** 表 The findings, per realm. */
export function findings(e: Early, p: Player) {
  const CHECKS = p.checks;
  const realms = [...new Set(e.visits.map((v) => v.realm))].sort((a, b) => a - b);
  return realms.map((realm) => {
    const vs = e.visits.filter((v) => v.realm === realm);
    const dead = vs.filter((v) => !decides(v));
    const days = vs.length / CHECKS;
    const news = e.arrivals.filter((a) => a.realm === realm);
    // 隙 The longest run of visits in a row with nothing to decide, in hours.
    let run = 0, worst = 0;
    for (const v of vs) { run = decides(v) ? 0 : run + 1; worst = Math.max(worst, run); }
    return {
      realm, visits: vs.length, days,
      deadShare: dead.length / vs.length,
      worstRunHours: (worst * 24) / CHECKS,
      news: news.length,
      /** 決 The average number of different decisions a visit actually offered. */
      choices: vs.reduce((n, v) =>
        n + (v.fresh > 0 ? 1 : 0) + (v.marking > 0 ? 1 : 0) + (v.buys > 0 ? 1 : 0)
          + (v.nodes > 0 ? 1 : 0) + (v.wear > 0 ? 1 : 0) + (v.warden ? 1 : 0), 0) / vs.length,
      /** 狩 The share of visits whose only hunting left is a beast already Mastered. */
      staleOnly: vs.filter((v) => v.stale > 0 && v.fresh === 0 && v.marking === 0).length / vs.length,
    };
  });
}

/**
 * 候 The waiting, measured minute by minute instead of visit by visit.
 *
 * The visit model said there was never nothing to decide, and it was answering the wrong
 * question. A purchase you can afford *this second* counts as something to do, but the
 * player taps it once and is then back to watching a bar. What Bruno is describing is
 * not the absence of a button, it is the **gap between buttons**, and a per-visit count
 * cannot see a gap.
 *
 * So this walks the clock a minute at a time with nobody touching the game, and asks at
 * every minute: is there anything at all here that a tap would change? A minute with
 * nothing affordable, nothing new out and no warden standing is a minute of waiting.
 */
export interface Wait {
  readonly realm: number;
  /** Minutes walked in this realm. */
  readonly minutes: number;
  /** Of those, how many had nothing affordable. */
  readonly waiting: number;
  /** The gaps between one thing becoming affordable and the next, in minutes. */
  readonly gaps: readonly number[];
}

export function waits(upTo = 3, playing = false): readonly Wait[] {
  let s = newState(T0);
  let t = T0;
  const out = new Map<number, { minutes: number; waiting: number; gaps: number[] }>();
  let sinceBuy = 0;
  let seed = 7;

  // 停 Nobody hunts and nobody drives. This is the floor: what the game gives a player
  // who only opens it, spends what they can and closes it again.
  while (s.realm <= upTo && (t - T0) < 400 * DAY) {
    t += 60;
    s = advance(s, t);
    const row = out.get(s.realm) ?? { minutes: 0, waiting: 0, gaps: [] };
    row.minutes++;

    // 煉器 A refine you can afford is a thing to press, and it is the only one in the
    // early game with no ceiling on it. Counted the same as an upgrade.
    const canRefineNow = SLOTS.some((x) => s.worn[x] && canRefine(s, x));
    const canAny = UPGRADES.some((u) => canBuy(s, u) && s.levels[u] < capOf(s, u)) || canRefineNow;
    const standing = canFightWarden(s) && odds(s, wardenOf(s.realm)) > 0.2;
    if (!canAny && !standing) { row.waiting++; sinceBuy++; }
    else { row.gaps.push(sinceBuy); sinceBuy = 0; }
    out.set(s.realm, row);

    // 演 And the player, when there is something, does it.
    for (let g = 0; g < 400; g++) {
      const can = UPGRADES.filter((u) => canBuy(s, u));
      if (!can.length) break;
      can.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
      s = buy(s, can[0]);
    }
    if (standing) {
      s = takeKill(s, wardenOf(s.realm));
      if (canBreakThrough(s)) s = breakThrough(s);
    }
    // 狩 The other cultivator hunts what they can and 圍 drives with the spare qi,
    // which is the one exchange the early game has: qi into material into 妖丹.
    // If the waiting is the same either way, the drive is not the answer.
    if (playing) {
      for (let i = 0; i < 3; i++) {
        const b = [...huntable(s.realm, s.layer)].reverse().find((x) => odds(s, x) > 0.7);
        if (!b) break;
        s = takeKill(s, b);
        s = takeDrop(s, b, ++seed);
      }
      for (let i = 0; i < 60; i++) {
        const keep = canBuy(s, 'cores') ? upgradeCost(s, 'cores') : 0;
        const slot = SLOTS.filter((x) => s.worn[x] && canRefine(s, x))
          .sort((a, b) => itemWorth(s.worn[b]!) - itemWorth(s.worn[a]!))[0];
        if (!slot) break;
        const price = refinePrice(s, slot);
        if (price === null || s.materials - price < keep) break;
        s = refine(s, slot);
      }
      for (let i = 0; i < 10; i++) {
        const b = [...huntable(s.realm, s.layer)].reverse().find((x) => canDrive(s, x));
        if (!b) break;
        const keep = ladderBetween(layersOpened(s));
        const n = [...DRIVE_SIZES].reverse().find((x) => s.qi - driveCost(s, x) >= keep);
        if (!n) break;
        s = drive(s, b, n, ++seed).state;
      }
    }
  }
  return [...out.entries()].map(([realm, r]) => ({ realm, ...r, gaps: r.gaps }));
}

if (process.argv[1]?.endsWith('early.ts')) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  for (const p of PLAYERS) {
    const e = walk(p, 3);
    const f = findings(e, p);
    console.log(`\n早 ${p.name}: ${p.checks} visits a day, ${p.minutes} minutes, ${p.hunts} fights a visit.`);
    console.log(`   ${p.who}\n`);
    console.log('  realm  days   visits   nothing to decide   longest dead run   new things   choices a visit');
    for (const r of f) {
      console.log(`  ${String(r.realm).padStart(5)}  ${r.days.toFixed(1).padStart(4)}   `
        + `${String(r.visits).padStart(6)}   ${pct(r.deadShare).padStart(17)}   `
        + `${(`${r.worstRunHours.toFixed(1)}h`).padStart(16)}   ${String(r.news).padStart(10)}   `
        + `${r.choices.toFixed(2).padStart(15)}`);
    }
    const last = e.visits[e.visits.length - 1];
    console.log(`\n  reached realm ${last.realm} on day ${last.day.toFixed(1)}, `
      + `${Object.values(e.state.killed).reduce((a, b) => a + b, 0)} kills behind them.`);

    // 隙 The stretches with nothing new, which is the whole of the complaint.
    const gaps = e.arrivals.map((a, i) => ({ g: a.day - (i ? e.arrivals[i - 1].day : 0), a }));
    const biggest = [...gaps].sort((x, y) => y.g - x.g).slice(0, 4);
    console.log('\n  隙 the longest stretches with nothing new:');
    for (const b of biggest) {
      console.log(`      ${b.g.toFixed(1).padStart(5)} days, ending at realm ${b.a.realm}  ${b.a.what}`);
    }
  }

  // 候 And the floor: what the game gives a cultivator who only ever opens it.
  for (const [label, playing] of [['候 Nobody hunting, nobody driving: the waiting on its own.', false],
                                  ['狩 The same cultivator, hunting and 圍 driving everything they can.', true]] as const) {
  console.log(`\n${label}\n`);
  console.log('  realm   hours   minutes waiting   share   median gap   longest gap');
  for (const w of waits(3, playing)) {
    const sorted = [...w.gaps].sort((a, b) => a - b);
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const max = sorted.length ? sorted[sorted.length - 1] : 0;
    console.log(`  ${String(w.realm).padStart(5)}   ${(w.minutes / 60).toFixed(1).padStart(5)}   `
      + `${String(w.waiting).padStart(15)}   ${`${Math.round((w.waiting / w.minutes) * 100)}%`.padStart(5)}   `
      + `${`${med} min`.padStart(10)}   ${`${max} min`.padStart(11)}`);
  }
  }
  console.log();
}
