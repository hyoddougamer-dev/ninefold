/**
 * 忙 How much there is to do, measured visit by visit.
 *
 * Bruno, at midnight, with the art half finished: *"um player ativo tem atividades
 * suficientes e não se aborrece rápido?"* It is the one question about this game that
 * the curve harnesses cannot answer. 勤 habits.ts measures how long the climb takes,
 * 閒 idle.ts where the qi goes, 階 climb.ts the shape of the ladder. None of them
 * measures whether a person opening the app has anything to press.
 *
 * So this one counts, at the start of every visit of a real simulated climb, how many
 * **kinds** of thing are available and how many separate taps they add up to. A kind is
 * a system: buying an upgrade, hunting, the tower, the furnace, the cave. Kinds matter
 * more than taps, because twenty of the same button is one decision made twenty times.
 *
 *     npm run busy
 *
 * 讀 What it prints, and what each number means:
 *
 *   kinds   how many systems have something to do right now, of ${KINDS} that exist.
 *   taps    how many distinct actions, counting each beast and each upgrade.
 *   thin    a visit with two kinds or fewer: open the app, press the one thing, close it.
 *   quiet   the longest run of days in which nothing new arrived at all.
 */
import {
  UPGRADES, canBreakThrough, canBuy, canCondense, canFightWarden, type State,
} from '../src/sim/state.ts';
import { odds } from '../src/sim/combat.ts';
import { DRIVE_SIZES, canDrive } from '../src/sim/hunt.ts';
import { huntable, wardenOf } from '../src/data/bestiary.ts';
import { isOpen, SYSTEMS, opensAt } from '../src/sim/unlocks.ts';
import { canBrew, canRefine, refinePrice, standingFloor } from '../src/sim/trials.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { LINES } from '../src/data/alchemy.ts';
import { ALL_NODES } from '../src/data/techniques.ts';
import { canUnlock } from '../src/sim/dao.ts';
import { freePoints } from '../src/sim/points.ts';
import { BEDS, canPlant, plantable, ripeCount } from '../src/sim/cave.ts';
import { canEnter } from '../src/sim/secret.ts';
import { due as awakeningDue } from '../src/sim/awaken.ts';
import { salvageable } from '../src/sim/salvage.ts';
import { SLOTS, templateOf, type Slot } from '../src/data/gear.ts';
import { itemWorth } from '../src/sim/chest.ts';
import { HABITS, play } from './habits.ts';

/** 事 One system, and what it has to offer right now. */
export interface Kind {
  readonly han: string;
  readonly name: string;
  readonly taps: (s: State) => number;
}

/**
 * 算 What counts as something to do.
 *
 * The rule throughout: it is only an action if pressing it **changes the save**, and
 * only if it is worth pressing. A beast that would win one time in ten is not something
 * to do, it is a button that wastes a tap, so the hunt counts the beasts a cultivator
 * would actually pick. Anything else flatters the answer, and the answer is the point.
 */
export const KINDS: readonly Kind[] = [
  { han: '修', name: 'buy an upgrade', taps: (s) => UPGRADES.filter((u) => canBuy(s, u)).length },
  { han: '狩', name: 'hunt a beast', taps: (s) => huntable(s.realm, s.layer).filter((b) => odds(s, b) > 0.6).length },
  { han: '圍', name: 'drive a beast', taps: (s) => (huntable(s.realm, s.layer).some((b) => canDrive(s, b)) ? DRIVE_SIZES.length : 0) },
  { han: '守', name: 'fight the warden', taps: (s) => (canFightWarden(s) && odds(s, wardenOf(s.realm)) > 0.2 ? 1 : 0) },
  { han: '突破', name: 'break through', taps: (s) => (canBreakThrough(s) ? 1 : 0) },
  { han: '凝丹', name: 'condense a core', taps: (s) => (canCondense(s) ? 1 : 0) },
  { han: '塔', name: 'climb a floor', taps: (s) => (odds(s, floorBeast(standingFloor(s)), floorPower(standingFloor(s))) > 0.6 ? 1 : 0) },
  { han: '爐', name: 'brew a pill', taps: (s) => LINES.filter((l) => canBrew(s, l)).length },
  { han: '煉器', name: 'refine a piece', taps: (s) => SLOTS.filter((x) => s.worn[x] && canRefine(s, x) && (refinePrice(s, x) ?? Infinity) <= s.materials).length },
  { han: '道', name: 'learn a node', taps: (s) => (isOpen(s.realm, 'tree')
      ? ALL_NODES.filter((n) => canUnlock(n.key, s.unlocked, freePoints(s), isOpen(s.realm, 'keystones'))).length : 0) },
  { han: '洞天', name: 'work the cave', taps: (s) => (isOpen(s.realm, 'cave')
      ? ripeCount(s) + [...Array(BEDS).keys()].filter((i) => plantable(s).some((h) => canPlant(s, i, h.key))).length : 0) },
  { han: '秘境', name: 'walk the vault', taps: (s) => (canEnter(s) ? 1 : 0) },
  { han: '悟道', name: 'take a card', taps: (s) => (awakeningDue(s.realm, s.awakened) ? 1 : 0) },
  { han: '器', name: 'wear what fell', taps: (s) => s.chest.filter((i) => {
      const slot = templateOf(i).slot as Slot;
      const worn = s.worn[slot];
      return !worn || itemWorth(i) > itemWorth(worn);
    }).length },
  { han: '拆', name: 'melt the junk', taps: (s) => (isOpen(s.realm, 'gear') ? Math.min(1, salvageable(s.chest, 'spirit').length) : 0) },
];

/** 訪 One visit, counted. */
export interface Visit {
  readonly day: number;
  readonly realm: number;
  readonly kinds: number;
  readonly taps: number;
  readonly open: readonly string[];
}

export function watchHabit(name: string, maxDays = 120): readonly Visit[] {
  const habit = HABITS.find((h) => h.name === name);
  if (!habit) throw new Error(`忙 there is no habit called ${name}`);
  const visits: Visit[] = [];
  play(habit, maxDays, (day, s) => {
    const open = KINDS.filter((k) => k.taps(s) > 0);
    visits.push({
      day, realm: s.realm, kinds: open.length,
      taps: KINDS.reduce((n, k) => n + k.taps(s), 0),
      open: open.map((k) => k.name),
    });
  });
  return visits;
}

/**
 * 新 The days something arrives that was never there before.
 *
 * A system opening, a realm, and that is all that counts here: a beast is a new row on
 * a screen a player already knows, and a node is a purchase. What this looks for is the
 * gap. 曆 the content clock on the bible page answers the same question over months;
 * this answers it over the first fortnight, which is the one that decides whether
 * anybody sees the second.
 */
export function arrivals(visits: readonly Visit[]): { day: number; what: string }[] {
  const out: { day: number; what: string }[] = [];
  let realm = 0;
  const seen = new Set<string>();
  for (const v of visits) {
    if (v.realm > realm) {
      realm = v.realm;
      out.push({ day: v.day, what: `realm ${realm}` });
      for (const sys of SYSTEMS) {
        if (opensAt(sys.key) === realm && !seen.has(sys.key)) {
          seen.add(sys.key);
          out.push({ day: v.day, what: `${sys.han} ${sys.name}` });
        }
      }
    }
  }
  return out;
}

export function report(name: string, maxDays = 120) {
  const visits = watchHabit(name, maxDays);
  const days = Math.max(...visits.map((v) => v.day));
  const thin = visits.filter((v) => v.kinds <= 2);
  const mean = visits.reduce((n, v) => n + v.kinds, 0) / visits.length;
  const taps = visits.reduce((n, v) => n + v.taps, 0) / visits.length;
  const arrived = arrivals(visits);
  let quiet = 0;
  let quietAt = 0;
  for (let i = 1; i < arrived.length; i++) {
    const gap = arrived[i].day - arrived[i - 1].day;
    if (gap > quiet) { quiet = gap; quietAt = arrived[i - 1].day; }
  }
  const last = arrived[arrived.length - 1];
  return { name, visits, days, thin, mean, taps, arrived, quiet, quietAt, tail: days - (last?.day ?? 0) };
}

if (process.argv[1]?.endsWith('busy.ts')) {
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].length));
  console.log(`\n忙 how much there is to do, of ${KINDS.length} kinds\n`);
  for (const name of ['casual', 'active', 'every hour']) {
    const r = report(name);
    console.log(`  ${pad(name, 12)} ${r.visits.length} visits over ${r.days.toFixed(0)} days`);
    console.log(`  ${' '.repeat(12)} ${r.mean.toFixed(1)} kinds and ${r.taps.toFixed(0)} taps on an average visit`);
    console.log(`  ${' '.repeat(12)} ${r.thin.length} thin visits (2 kinds or fewer), ` +
      `${((r.thin.length / r.visits.length) * 100).toFixed(0)}%`);
    console.log(`  ${' '.repeat(12)} longest quiet stretch ${r.quiet.toFixed(1)} days, from day ${r.quietAt.toFixed(0)}\n`);
  }

  const r = report('active');
  console.log('  開 when a new system arrives, for the active cultivator\n');
  for (const a of r.arrived) console.log(`     day ${pad(a.day.toFixed(1), 6)} ${a.what}`);
  console.log(`\n  and then ${r.tail.toFixed(0)} days with nothing new named at all.\n`);

  // 分 Which systems are actually live, visit by visit, across the whole climb.
  const counts = new Map<string, number>();
  for (const v of r.visits) for (const k of v.open) counts.set(k, (counts.get(k) ?? 0) + 1);
  console.log('  用 how often each kind has anything to offer\n');
  for (const k of KINDS) {
    const n = counts.get(k.name) ?? 0;
    const share = (n / r.visits.length) * 100;
    console.log(`     ${pad(k.han, 5)} ${pad(k.name, 20)} ${share.toFixed(0).padStart(3)}% of visits`);
  }
  console.log();
}
