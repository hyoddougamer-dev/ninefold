/**
 * 九境 The Bible: the one page that explains the whole game, and the page we keep.
 *
 * It is a **living document**. Every system in the game has a row in the status board at
 * the top with one of three states, and closing a system means moving its row and
 * writing its section, and nothing else. That is the whole process.
 *
 * Every number, every name and every drawing below is read out of the game's own
 * modules, so the page cannot go stale: if something here is wrong, the game is wrong.
 * The only hand-written things are the prose and the status board, and the status board
 * is hand-written on purpose, because a machine cannot know whether a system is finished.
 *
 * Run with `npm run bible`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { BEASTS, WARDENS, commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { REALMS, realm as realmOf } from '../src/data/realms.ts';
import { ARTS, SEQUENCE_SLOTS, STANCES, STANCE_LAYER } from '../src/data/arts.ts';
import { LINES, PILL_GRADES, PILL_LINES } from '../src/data/alchemy.ts';
import { HEAVENS, MARKS_PER_HEAVEN, heavenAt, heavensOpened, marksToNext, nextHeaven } from '../src/data/heavens.ts';
import { COMMON_LAYERS, comingIn } from '../src/data/bestiary.ts';
import {
  AFFIXES, AFFIX_INFO, ARCHETYPES, GEAR, LINEAGE_LAYER, RARITIES, RARITY_INFO,
  REALM_SETS, SECONDARIES,
  SET_STEPS, SLOTS, SLOT_INFO, archetypesOf, templateOf, type Affix, type Item,
} from '../src/data/gear.ts';
import { ALL_NODES, PATH_INFO, PATHS, TOTAL_COST, nodesOf } from '../src/data/techniques.ts';
import { AWAKENINGS, ALL_CARDS, HEAVEN_CARDS } from '../src/data/awakening.ts';
import { MEETINGS, MEET_POINT_CEILING } from '../src/data/meetings.ts';
import { BEDS, HERBS } from '../src/data/herbs.ts';
import { ROOMS as SECRET_ROOMS, ROOM_INFO, DOOR_GAP } from '../src/data/secret.ts';
import { isGate } from '../src/sim/secret.ts';
import { UPGRADES, UPGRADE_INFO, condenseCost, heavenStep, newState, power, upgradeCost, type State } from '../src/sim/state.ts';
import { floorMaterial } from '../src/sim/trials.ts';
import { CHEST_LIMIT, FUSE_COUNT } from '../src/sim/chest.ts';
import {
  HUNT_SHARE, LADDER_FIRST, LADDER_GROWTH_FIRST, LADDER_GROWTH_LAST, LAYERS, LAYER_BONUS,
  LAYERS_PER_REALM, LEVELS_PER_REALM, MARK_DAYS, TARGET_DAYS, TREE_RATE_CEILING,
  UNCAPPED_RATE_CEILING,
  TRIBULATION_CHALLENGE,
  TRIBULATION_FOOTING, TRIBULATION_GAIN, ladderAt, levelCap, realmCost, OPENING_PURSE,
} from '../src/sim/balance.ts';
import { FORM, REFERENCE_BELOW, beastPower, loot, lootFrom, seenBounty } from '../src/sim/combat.ts';
import { FLOORS_PER_REALM, SEAL_LOOT, floorLoot, floorPower } from '../src/sim/tower.ts';
import {
  PILL_BANE_FLOOR, PILL_FORTUNE, PILL_POWER, PILL_SHARE, pillCost, pillsTaken,
} from '../src/sim/furnace.ts';
import { daoEarned, daoFree, POINTS_PER_BESTIARY,
} from '../src/sim/dao.ts';
import { layersOpened } from '../src/sim/time.ts';
import { CORE_CAP_EXTRA, CORE_QI_RUNGS, FOCUS_HOLD, FOCUS_MAX, FOCUS_RAMP, LEVELS_PER_HEAVEN, SALVAGE_SHARE_FIRST, SALVAGE_SHARE_LAST, TOWER_QI_HOURS, WARDEN_TRIBUTE } from '../src/sim/balance.ts';
import { CORES_FREE_REALMS } from '../src/sim/combat.ts';
import { playAll } from './habits.ts';
import { BRANCHES, climb } from './climb.ts';
import { playEndgame } from './endgame.ts';
import { allowedShare, walkAll } from './idle.ts';
import { DEEDS, TRACKS, deedsOn } from '../src/sim/deeds.ts';
import {
  KNOWN_MATERIAL, MARKS, MARK_INFO, MASTERED_POWER, recordCeiling,
} from '../src/sim/record.ts';
import { LEVELS } from '../src/app/sound.ts';
import { NOTICES } from '../src/app/notices.ts';
import { STEPS } from '../src/app/guide.ts';
import { DRIVE_SIZES, driveCost } from '../src/sim/hunt.ts';
import { salvageValue, salvageWorth, salvageable } from '../src/sim/salvage.ts';
import { BASE_DROP_CHANCE, rollDrop } from '../src/sim/drops.ts';
import { compare, linesOf, swing } from '../src/sim/inspect.ts';
import { SYSTEMS as OPENED, opensAt, opensIn } from '../src/sim/unlocks.ts';
import {
  REFINE_DEPTH, REFINE_GAIN, REFINE_LIMIT, refineCost, refineFactor, refineSpent,
} from '../src/sim/refine.ts';
import { CHEST_LIMIT as CHEST } from '../src/sim/chest.ts';

import { num } from '../src/sim/format.ts';
import { icon } from '../src/art/icon.ts';
import { portrait } from '../src/art/aura.ts';
import { arenaScene } from '../src/art/scene.ts';
import { gearTile } from '../src/art/gear.ts';
import { chamber } from '../src/art/secret.ts';
import { PLATE_CSS, liftArt, writePlates } from './lift.ts';
import { PICTURES, pictureOf, type Painted } from '../src/data/pictures.ts';
import { FIGURES, figureKey } from '../src/data/figures.ts';
import { FAMILIES, paintedIn } from './artgaps.ts';
import { SHEETS } from './sheets.ts';
import { KINDS, report as busyReport } from './busy.ts';
import { SOURCES, walk as worthWalk } from './worth.ts';

/**
 * 測 How many tests there are, counted rather than remembered.
 *
 * The number was written into the Portuguese page by hand once, and a hand-written count
 * is a claim with a shelf life. Every `it(` in the suite is counted here instead, so the
 * page says what the repository actually holds on the day it was built.
 */
/**
 * 譯 The eight cultivators' names, for the one page written in Portuguese.
 *
 * The names themselves stay English, because they are identifiers the harness, the tests
 * and every other section use. This is a gloss beside them, not a rename: a reader of
 * the Portuguese page should not have to hold an English glossary to read a table.
 */
const HABIT_PT: Record<string, string> = {
  'never fights': 'nunca luta',
  'barely fights': 'quase não luta',
  'once a day': 'uma vez por dia',
  casual: 'ocasional',
  active: 'ativo',
  'every hour': 'de hora a hora',
  'drives it all': 'usa o 圍 em tudo',
  'walks 神': 'segue o 神',
};

const TEST_DIRS = ['src/sim/__tests__', 'src/app/__tests__'];
const TESTS = TEST_DIRS.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.test.ts')).map((f) => `${d}/${f}`))
  .reduce((n, f) => n + (readFileSync(f, 'utf8').match(/^\s*it\(/gm)?.length ?? 0), 0);

const PAGES = 'https://hyoddougamer-dev.github.io/ninefold/';
const REPO = 'https://github.com/hyoddougamer-dev/ninefold';
const ACTIONS = `${REPO}/actions/workflows/apk.yml`;

const FULL_RUN = daoEarned(LAYERS - 1, WARDENS.length);

/**
 * 量 The three measurements this page quotes, made here rather than typed in.
 *
 * Every one of these used to be a sentence somebody wrote down after reading a test, and
 * every one of them was wrong within a week of the balance moving. They are run now.
 */
const CLIMBER = climb(6, true, false, true);     // climbs the tower, never brews
const BREWER = climb(6, true, true);             // and pours everything into the furnace
/** 道 The same cultivator down each branch of the tree: the measurement that was missing. */
const BY_BRANCH = BRANCHES.map((b) => ({ b, day: climb(6, true, true, true, b).arrival[8] }));
const ENDGAME = playEndgame(40);
const pc = (x: number) => `${Math.round(x * 1000) / 10}%`;

/**
 * 狀 The status board, and the only hand-written table on the page.
 *
 * `done` means the system is closed: it is built, it is measured by a test, and it is
 * written up below. `open` means it exists and is still moving. `planned` means it is
 * agreed and not started. Nothing else is allowed. "Mostly done" is `open`.
 */
type Status = 'done' | 'open' | 'planned';

interface System {
  readonly han: string;
  readonly name: string;
  readonly status: Status;
  readonly line: string;
  /** Where to read about it on this page. */
  readonly at?: string;
}

const RUNS = playAll();

/**
 * 樣 The numbers the mockups and the board quote, taken from the game rather than typed.
 *
 * Bruno asked for a visual mockup with real examples whenever anything about the look
 * changes, so the examples have to *be* real: the same art functions the game draws
 * with, the same comparison the item sheet runs, the same prices the drive charges.
 */
/**
 * By name, never by position. These were `RUNS[0]` and `RUNS[1]` until a cultivator was
 * added to the harness, at which point every sentence on this page that said "somebody
 * who hunts a little" was quietly describing somebody else. The same slip was in
 * players.test.ts on the same day, which is what makes it a rule rather than a fix.
 */
const runNamed = (name: string) => RUNS.find((r) => r.habit.name === name)!;
const WAITER = runNamed('never fights');
const BARELY = runNamed('barely fights');
const HUNTER = runNamed('once a day');
const WAITER_COST = Math.round((WAITER.arrival[8] ?? 0) - (HUNTER.arrival[8] ?? 0));
/** 守貢 What two beasts a day are worth, in days off the climb. */
const BARELY_SAVES = Math.round((WAITER.arrival[8] ?? 0) - (BARELY.arrival[8] ?? 0));

/**
 * 曆 The content clock: when the last new thing in the game arrives.
 *
 * Every number here is read off the same run the rest of the page is written from, so a
 * beast moved to another realm or a realm that takes a week longer moves this section
 * without anybody remembering to.
 *
 * Gear is left out of the count on purpose. It is 54 archetypes recoloured once a realm,
 * and counting all ${GEAR.length} pieces drowns the nine things a player would actually
 * name as new.
 */
const CLOCK = (() => {
  const run = runNamed('active');
  const at = (realm: number) => run.arrival[realm - 1] ?? Infinity;
  /** 層 A thing that arrives at a layer rather than at a breakthrough. */
  const atLayer = (realm: number, layer: number) =>
    run.layerDay[(realm - 1) * LAYERS_PER_REALM + layer] ?? Infinity;
  const met: number[] = [];
  const add = (d: number) => { if (Number.isFinite(d)) met.push(d); };
  for (const sys of OPENED) add(at(sys.realm));
  // 出 Beasts walk out at a layer, which is the whole point of the change below.
  for (const b of BEASTS) add(atLayer(b.realm, b.layer));
  // 勢 器 And so, now, do the stance and the lineage. See STANCE_LAYER, LINEAGE_LAYER.
  for (const st of STANCES) add(atLayer(st.realm, STANCE_LAYER));
  for (const rs of REALM_SETS) add(rs.realm === 1 ? at(2) : atLayer(rs.realm, LINEAGE_LAYER));
  /**
   * 訣 誤 An art is the warden's own, so it is held the moment that warden falls, which
   * is the *last* layer of its realm. This table counted it at the realm's arrival, a
   * whole realm early, which put all nine of them in the week they were furthest from.
   * Week one read 37 and it was never 37.
   */
  for (const a of ARTS) add(atLayer(a.realm, LAYERS_PER_REALM - 1));

  /**
   * 境外 And the heavens, which arrive after the summit and are the only reason this
   * table now runs past week nine. Their days come from the endgame harness rather than
   * from the climb, and the two are joined end to end the way a player meets them.
   */
  const end = playEndgame(MARKS_PER_HEAVEN * HEAVENS.length + 2);
  const summit = run.days;
  const heavenDay: number[] = [];
  let cum = 0;
  end.days.forEach((d, i) => {
    cum += d;
    const marks = i + 1;
    // A heaven opens on the crossing that first reaches it.
    if (heavensOpened(marks) > heavensOpened(marks - 1)) heavenDay.push(summit + cum);
  });
  for (const d of heavenDay) add(d);

  const byWeek = new Map<number, number>();
  for (const d of met) byWeek.set(Math.floor(d / 7), (byWeek.get(Math.floor(d / 7)) ?? 0) + 1);
  const weeks = Math.ceil((heavenDay[heavenDay.length - 1] ?? summit) / 7) + 1;
  const peak = Math.max(...byWeek.values());
  const rows = Array.from({ length: weeks }, (_, w) => {
    const n = byWeek.get(w) ?? 0;
    const bar = Math.round((n / peak) * 100);
    const mark = w === 12 ? '<span class="faint"> ← three months</span>' : '';
    // 期 The week turns every seven days from the first, so every row has one. It is a
    // column of its own rather than a number added to the count: a new quarry is the
    // same beasts pointed at differently, and folding it into "new things" would make
    // this table flatter than the game is.
    return `<tr><td>week ${w + 1}<span class="faint"> · day ${w * 7}–${w * 7 + 6}</span>${mark}</td>
      <td style="text-align:right">${n || '—'}</td>
      <td style="text-align:center" class="cjk">期</td>
      <td><span class="wk"><i style="width:${bar}%"></i></span></td></tr>`;
  }).join('');
  /** 期 The weeks inside the first three months with nothing new named in them. */
  const quiet = Array.from({ length: 13 }, (_, w) => w).filter((w) => !byWeek.get(w));
  return {
    rows, run,
    r4: Math.round(at(4)),
    r8: Math.round(at(9) - at(8)),
    last: Math.round(heavenDay[heavenDay.length - 1] ?? at(9)),
    done: Math.round(run.days),
    name: run.habit.name,
    firstHeaven: Math.round(heavenDay[0] ?? 0),
    quiet: quiet.map((w) => w + 1),
    heavenDays: heavenDay.map((d) => Math.round(d)),
  };
})();
const CLOCK_ROWS = CLOCK.rows;
const CLOCK_R4 = CLOCK.r4;
const CLOCK_R8 = CLOCK.r8;
const CLOCK_LAST = CLOCK.last;
const CLOCK_DONE = CLOCK.done;
const ACTIVE_NAME = CLOCK.name;
const CLOCK_FIRST_HEAVEN = CLOCK.firstHeaven;
const CLOCK_QUIET = CLOCK.quiet;

/** 閒 Where a realm's qi goes, and how long the bar stands still. */
const IDLE = walkAll();
const idleFirst = (name: string) => IDLE.find((x) => x.name === name)!.rows.find((r) => r.realm === 1)!;
const IDLE_FIRST = Math.round(idleFirst('once a day').ceilingHours / idleFirst('once a day').hours * 100);
/** 費 The days the ninth-rung change took off, measured rather than remembered. */
const IDLE_SAVED = '3 to 16';
const allowedRows = Array.from({ length: 9 }, (_, i) => {
  const r = i + 1;
  return `<tr><td>${realmOf(r).han} <span class="faint">${realmOf(r).name}</span></td>
    <td style="text-align:right">${Math.round(allowedShare(r) * 100)}%</td></tr>`;
}).join('');
const idleRows = IDLE.map((run) => `
  <div class="card"><em>${run.name}<span class="faint"> · ${run.checks}× a day</span></em>
    <table style="margin-top:8px">
      <tr><th>realm</th><th style="text-align:right">lasts</th>
          <th style="text-align:right">into 修</th>
          <th style="text-align:right">bar full</th>
          <th style="text-align:right">守 out of reach</th></tr>
      ${run.rows.map((r) => `<tr><td>${realmOf(r.realm).han}</td>
        <td style="text-align:right">${r.hours.toFixed(0)}h</td>
        <td style="text-align:right">${(r.intoUpgrades * 100).toFixed(0)}%</td>
        <td style="text-align:right">${(r.stuckHours / r.hours * 100).toFixed(0)}%</td>
        <td style="text-align:right"${r.ceilingHours > 0 ? ' class="hot"' : ''}>${
          (r.ceilingHours / r.hours * 100).toFixed(0)}%</td></tr>`).join('')}
    </table></div>`).join('');

/**
 * 丹 What the hunting earns against what the cap ever let it spend.
 *
 * The one cultivator who matters to this question is the one who actually presses the
 * button, so IDLERS carries a fourth now. See tools/idle.ts.
 */
const coreRows = IDLE.map((run) => `
  <div class="card"><em>${run.name}<span class="faint"> · ${run.checks}\u00d7 a day</span></em>
    <table style="margin-top:8px">
      <tr><th>realm</th><th style="text-align:right">\u6750 earned</th>
          <th style="text-align:right">\u6750 spent</th>
          <th style="text-align:right">dead</th></tr>
      ${run.rows.filter((r) => r.realm <= 5).map((r) => `<tr><td>${realmOf(r.realm).han}</td>
        <td style="text-align:right">${num(Math.round(r.materialEarned))}</td>
        <td style="text-align:right">${num(Math.round(r.materialSpent))}</td>
        <td style="text-align:right"${r.deadMaterial > 0.1 ? ' class="hot"' : ''}>${
          (r.deadMaterial * 100).toFixed(0)}%</td></tr>`).join('')}
    </table></div>`).join('');

/** 丹 The fourth box, at the old cap and at the new one, drawn with the game's own row. */
const MOCK_CORES = (() => {
  const row = (levels: number, cap: number, price: string) => `
    <div class="upg">
      <span class="ic">${icon(UPGRADE_INFO.cores.icon, 26)}</span>
      <span><b>${UPGRADE_INFO.cores.name} <em class="cjk">${UPGRADE_INFO.cores.han}</em></b>
        <i>${UPGRADE_INFO.cores.effect} \u00b7 ${levels} of ${cap}</i></span>
      <span class="price">${price}</span>
    </div>`;
  return `<div class="mk two">
    <div>
      <p class="cap" style="margin:0 0 8px">Before · halfway up the second realm, holding 3360 \u6750</p>
      ${row(LEVELS_PER_REALM * 2, LEVELS_PER_REALM * 2, '<b class="cjk" style="color:var(--gold)">\u6eff</b>')}
    </div>
    <div>
      <p class="cap" style="margin:0 0 8px">After · the same save, the same material</p>
      ${row(LEVELS_PER_REALM * 2, LEVELS_PER_REALM * 2 + CORE_CAP_EXTRA, '110<em>\u6750</em>')}
    </div>
  </div>`;
})();

/** 境外 One card a heaven, with its Dragon drawn from the game's own icon table. */
/** 拆 What a melt is worth early and late, and what it adds up to over a realm. */
const salvageRows = (() => {
  const perRealm = Array.from({ length: 9 }, (_, i) => {
    const realm = i + 1;
    const pays = salvageValue({ id: 'x', template: `sword${realm}`, rarity: 'common', rolls: [] });
    const layer = ladderAt((realm - 1) * LAYERS_PER_REALM + 4);
    return `<tr><td>${realmOf(realm).han} <span class="faint">${realmOf(realm).name}</span></td>
      <td style="text-align:right">${num(pays)}</td>
      <td style="text-align:right">${(pays / layer * 100).toFixed(1)}%</td></tr>`;
  }).join('');
  const share = (h: typeof RUNS[number], realm: number) => {
    const r = h;
    const days = (r.arrival[realm] ?? r.days) - (r.arrival[realm - 1] ?? 0);
    const kills = r.habit.checks * r.habit.hunts * days;
    let worth = 0; let n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const item = rollDrop(commonsOf(realm)[0], realm, seed);
      if (item) { worth += salvageValue(item); n++; }
    }
    const pay = kills * BASE_DROP_CHANCE * (n ? worth / n : 0);
    let ladder = 0;
    for (let k = 0; k < LAYERS_PER_REALM; k++) ladder += ladderAt((realm - 1) * LAYERS_PER_REALM + k);
    return `${(pay / ladder * 100).toFixed(1)}%`;
  };
  const hunters = RUNS.filter((r) => r.habit.gear);
  const byHabit = hunters.map((r) => `<tr><td>${r.habit.name}</td>${
    [2, 3, 4, 5, 6].map((realm) => `<td style="text-align:right">${share(r, realm)}</td>`).join('')
  }</tr>`).join('');
  return `<div class="cards two">
    <div class="card"><em>One 凡 Common, against the layer it drops on</em>
      <table style="margin-top:8px"><tr><th>realm</th><th style="text-align:right">melts for</th>
        <th style="text-align:right">of a layer</th></tr>${perRealm}</table></div>
    <div class="card"><em>And the melt over a whole realm's ladder</em>
      <table style="margin-top:8px"><tr><th>habit</th><th style="text-align:right">2</th>
        <th style="text-align:right">3</th><th style="text-align:right">4</th>
        <th style="text-align:right">5</th><th style="text-align:right">6</th></tr>${byHabit}</table></div>
  </div>`;
})();

const heavenRows = `<div class="cards two">${HEAVENS.map((h, i) => `
  <div class="card" style="--hue:${h.colour}">
    <div class="hrow">
      <span class="hic" style="color:${h.colour}">${icon(h.dragon.icon, 34)}</span>
      <span><b class="cjk">${h.han}</b> <em>${h.name}</em>
        <i class="faint">${h.dragon.han} ${h.dragon.name} · from mark ${MARKS_PER_HEAVEN * i + 1}${
          CLOCK.heavenDays[i] !== undefined ? ` · about day ${CLOCK.heavenDays[i]}` : ''}</i></span>
    </div>
    <p class="hg">${h.gains}</p>
    <p class="hr" style="color:${h.colour}">＋${LEVELS_PER_HEAVEN} levels of 劍訣 and 妖丹</p>
  </div>`).join('')}</div>`;
/** 劫 How long a mark takes once the pace has settled, from the endgame harness. */
const ENDGAME_PACE = (() => {
  const d = playEndgame(12).days;
  return Math.round(d.slice(4).reduce((a, b) => a + b, 0) / d.slice(4).length);
})();
const DRIVE_TAPS = BEASTS.length * (1 + Math.ceil((MARKS[2] - MARKS[1]) / DRIVE_SIZES[DRIVE_SIZES.length - 1]));
const NINTH = { ...newState(0), realm: 9 } as State;
const OLD_RAT = num(lootFrom(NINTH, commonsOf(1)[0]));

/** 鑑 A real trade, run through the real comparison, for the sheet the mockup draws. */
const MOCK_WORN: Item = { id: 'w', template: 'sword3', rarity: 'spirit',
  rolls: [{ affix: 'power', value: 12.8 }, { affix: 'sunder', value: 2.3 }] };
const MOCK_HELD: Item = { id: 'h', template: 'sword5', rarity: 'heaven', refine: 3,
  rolls: [{ affix: 'power', value: 32.5 }, { affix: 'rate', value: 18.2 },
    { affix: 'luck', value: 9.1 }, { affix: 'find', value: 2.9 }, { affix: 'capacity', value: 2 }] };
const MOCK_HERO: State = { ...newState(0), realm: 5, layer: 4, worn: { weapon: MOCK_WORN } };
const MOCK_LINES = compare(MOCK_HELD, MOCK_WORN);
const MOCK_SWING = swing(MOCK_HERO, MOCK_HELD);

const pct = (v: number, a: Affix) =>
  (AFFIX_INFO[a].unit === '%' ? `${Math.round(v * 10) / 10}%` : `${Math.floor(v)}`);
const sign = (x: number) => `${x > 1 ? '+' : ''}${Math.round((x - 1) * 1000) / 10}%`;

const SYSTEMS: readonly System[] = [
  { han: '階', name: 'The ladder', status: 'done', at: 'ladder',
    line: `Eighty-one rungs, each dearer than the last. ${TARGET_DAYS} days to the top, measured against a cultivator who spends.` },
  { han: '上限', name: 'The realm cap', status: 'done', at: 'cap',
    line: `${LEVELS_PER_REALM} levels of each upgrade per realm. It is what stops the qi rate running away.` },
  { han: '氣', name: 'Qi and the four upgrades', status: 'done', at: 'qi',
    line: 'Gathering, and the four things it buys. Every price rides the ladder.' },
  { han: '境', name: 'The nine realms', status: 'done', at: 'realms',
    line: 'Nine names, nine colours, nine auras, and a breakthrough between each.' },
  { han: '狩', name: 'Hunting and the bestiary', status: 'done', at: 'beasts',
    line: '36 beasts, three commons and one warden to a realm. Free to fight, free to lose.' },
  { han: '戰', name: 'Combat', status: 'done', at: 'combat',
    line: 'Settled in one go, played back two beats to a round. The odds are simulated, not curved.' },
  { han: '勢', name: 'Stances and arts', status: 'done', at: 'build',
    line: `Nine stances, nine arts, ${SEQUENCE_SLOTS} slots in the sequence. The order matters.` },
  { han: '器', name: 'Gear and the nine sets', status: 'done', at: 'gear',
    line: `${GEAR.length} pieces, ${RARITIES.length} ranks, ${AFFIXES.length} axes, and a named lineage for every realm.` },
  { han: '煉器', name: 'Refining', status: 'done', at: 'refine',
    line: 'Material makes a worn piece better, for ever, with no top level. It is the only thing 材 could not buy before, and 材 was eight times over-supplied.' },
  { han: '道', name: 'The technique tree', status: 'done', at: 'tree',
    line: `One merged tree of ${ALL_NODES.length} nodes costing ${TOTAL_COST} 道 against about ${FULL_RUN} a run. Nobody finishes it.` },
  { han: '開', name: 'What each realm opens', status: 'done', at: 'opens',
    line: 'Nine realms, and every one of them hands over something that was not there before. No resets anywhere: the game is purely vertical.' },
  { han: '勤', name: 'Playing versus waiting', status: 'done', at: 'habits',
    line: `A warden asks for 妖丹, sitting with it gathers deeper, and a tower floor pays hours. Somebody who never fights still gets there, ${WAITER_COST} days later.` },
  { han: '守貢', name: 'The wall, and why it is a slope', status: 'done', at: 'wall',
    line: `A warden pays a tribute rather than a harvest, so it can no longer fund the core that beats the next one, and 凝丹 lets a core be forced out of raw qi, so nobody is ever stopped. Two beasts a day is worth ${BARELY_SAVES} days of the climb.` },
  { han: '塔', name: 'The Endless Tower', status: 'done', at: 'tower',
    line: `One floor, one beast, no top. The material economy and ${TOWER_QI_HOURS} hours of gathering a floor.` },
  { han: '爐', name: 'The Furnace', status: 'done', at: 'furnace',
    line: `27 named pills on three lines. The only uncapped thing qi buys, and it may never touch the qi rate.` },
  { han: '碑', name: 'The stele', status: 'done', at: 'stele',
    line: `${DEEDS.length} deeds across ${TRACKS.length} tracks, every one of them derived from the save and worth nothing. A record, not a currency.` },
  { han: '劫', name: 'The tribulation', status: 'done', at: 'top',
    line: `A pool that refills in ${MARK_DAYS} days, a Dragon that grows ${TRIBULATION_CHALLENGE}x a crossing, and a mark worth ${(1 + TRIBULATION_GAIN).toFixed(2)}x.` },
  { han: '存', name: 'The save', status: 'done', at: 'save',
    line: 'One browser key, a spare copy, an export you can paste anywhere, and a validator that treats a save as input.' },
  { han: '包', name: 'Page and APK', status: 'done', at: 'where',
    line: 'One codebase, published to GitHub Pages, wrapped once in an APK that never needs installing again.' },

  { han: '錄', name: 'The record', status: 'done', at: 'record',
    line: `Three marks on every beast at ${MARKS.join(', ')} kills. It is what makes a beast below your realm worth killing at all.` },
  { han: '示', name: 'Telling a stuck player why', status: 'done', at: 'record',
    line: 'One line on 修 Cultivate, computed from the state, that names the thing blocking you and takes you to it.' },
  { han: '音', name: 'Sound', status: 'done',
    line: `${LEVELS.length} volume steps on the one button, and a cue for every action including the tower, the furnace and a mark earned.` },

  { han: '新', name: 'Teaching each system', status: 'done', at: 'refine',
    line: `${NOTICES.length} cards that arrive once, when the thing they explain first becomes true, and never block the game.` },
  { han: '引', name: 'The first session', status: 'done', at: 'opens',
    line: `${STEPS.length} numbered steps on 修, each finished by doing the thing and not by reading it. Nothing about it is stored, so it ends by itself and cannot come back.` },
  { han: '釋', name: 'The key to every character', status: 'done', at: 'rules',
    line: 'One tap from every screen, read out of the same tables the game reads. No character is ever the only place a thing is named.' },
  { han: '圖鑑', name: 'Finishing a realm of the bestiary', status: 'done', at: 'record',
    line: `A realm whose four beasts are all 熟 Known pays ${POINTS_PER_BESTIARY} 道, from the sixth realm. The one thing hunting never asked for: going back.` },
  { han: '梯', name: 'Seeing the climb', status: 'done', at: 'mockups',
    line: `Nine realms and nine rungs drawn as one object under the bar, with the warden lit at the end of them. "layer 3 of 9" and "realm 1 of 9" were two numbers at opposite ends of a screen and nothing ever said one was inside the other.` },
  { han: '指', name: 'The pointing finger', status: 'done', at: 'mockups',
    line: 'The guide draws a ring and an arrow on the real button. The overlay takes no taps, so the ring is over the button and the button still works.' },
  { han: '時', name: 'A step you cannot do yet', status: 'done', at: 'mockups',
    line: 'A step that is not possible yet is the *next* step, not the instruction: a quieter card, a bar showing how close, and something to do in the meantime.' },
  { han: '境', name: 'What a realm is', status: 'done', at: 'mockups',
    line: 'A page reached from the realm\'s own name: what a realm is, what stands at the end of this one, what it opened, and what the next one is worth.' },
  { han: '見', name: 'The first sight of a beast', status: 'done', at: 'beasts',
    line: `Half a rung of qi the first time each beast falls, divided by the realm after that. 36 beasts, 36 payments in a lifetime, so it cannot be farmed and it is not a rate.` },
  { han: '圍', name: 'The drive', status: 'done', at: 'mockups',
    line: `${DRIVE_SIZES.join(', ')} kills in one tap on a beast you have 熟 Known, paid for in qi. The whole record goes from ${MARKS[2] * BEASTS.length} taps to ${DRIVE_TAPS}.` },
  { han: '舊', name: 'Old beasts worth going back for', status: 'done', at: 'beasts',
    line: `A beast pays at least a quarter of what the weakest common of *your* realm pays. 山鼠 the rat went from 1 材 for ever to ${OLD_RAT} at the ninth realm.` },
  { han: '鑑', name: 'Reading a piece of gear', status: 'done', at: 'mockups',
    line: 'Tapping a piece opened nothing and wore it. It now opens a sheet: the rank named, every line, both sides of the trade, and the swing taken from the sim rather than from adding roll values up.' },
  { han: '誠', name: 'Honest odds', status: 'done', at: 'combat',
    line: 'A fight that wins none of its sampled seeds says how far off it is rather than quoting the 2% floor. The first realm\'s three beasts read 2%, 2%, 2% and now read ×2.4, ×7.0, ×14.0.' },
  { han: '半', name: 'Finding the tree', status: 'done', at: 'mockups',
    line: 'The 道 tab held a stance picker, nine sequence slots and an art pool before it held any tree, so the tree began fourteen hundred pixels below the fold. Two halves and a switch; the tree is the one that opens.' },
  { han: '點', name: 'Points you have not spent', status: 'done', at: 'mockups',
    line: 'An unspent 道 point was money on the floor two taps and a scroll away. The count now rides the tab itself, so it is visible from every other screen in the game.' },
  { han: '收', name: 'The corner, folded', status: 'done', at: 'mockups',
    line: 'Five bare characters floating over the corner became one button, and each arrives with its name in English when it opens.' },

  { han: '境外', name: 'The heavens above the ninth realm', status: 'done', at: 'heavens',
    line: `${HEAVENS.length} named heavens, one every ${MARKS_PER_HEAVEN} crossings, each with its own Dragon drawn and named and ${LEVELS_PER_HEAVEN} more levels of 劍訣 and 妖丹 behind it. The endgame was forty crossings against one animal.` },
  { han: '拆', name: 'Melting gear down', status: 'done', at: 'salvage',
    line: `A full chest threw the worst piece on the floor and paid nothing for it. A piece now melts for a share of the first rung of **its own** realm, falling from ${SALVAGE_SHARE_FIRST} at the first to ${SALVAGE_SHARE_LAST} at the ninth. One at a time, or everything at or below a rank in one tap.` },
  { han: '出', name: 'Beasts that walk out mid-realm', status: 'done', at: 'clock',
    line: `A realm's three commons arrive at layers ${COMMON_LAYERS.join(', ')} instead of all at the breakthrough. The eighth realm is ${CLOCK_R8} days long and used to hand over everything it had in the first minute of them.` },
  { han: '守', name: 'A warden that stays where it is put', status: 'done', at: 'idle',
    line: 'It used to stand only while the bar was full, so buying the upgrades that beat it made it vanish and cost a whole rung of re-earning. It stands on the last rung now, for zero days off the climb.' },
  { han: '費', name: 'The warden is the ninth rung', status: 'done', at: 'idle',
    line: `Eight rungs of gathering fill a realm and the warden is the ninth: 突破 asks for nothing else, and the qi gathered on that last rung is no longer burned on the way out. Measured, it takes ${IDLE_SAVED} days off the climb and the first realm goes from 48 hours to 24 for somebody who opens the app once a day.` },
  { han: '閒', name: 'Where a realm\'s qi goes', status: 'done', at: 'idle',
    line: `Measured rather than assumed: every realm lets you buy about ${Math.round(allowedShare(1) * 100)}% of its own ladder, so no realm is short of things to spend on. What the first realms are short of is a warden that falls. The lightest cultivator stands at the first realm's ceiling for ${IDLE_FIRST}% of it.` },
  { han: '曆', name: 'Three months of content', status: 'done', at: 'clock',
    line: `Measured rather than hoped for: the last named thing now arrives on day ${CLOCK_LAST}, against a climb that used to run out on day 60.` },

  // 提 The four content systems, in the order they were built.
  { han: '悟道', name: 'A choice that makes you different', status: 'done', at: 'awaken',
    line: `Three cards at every breakthrough and at every heaven, and you keep one: ${ALL_CARDS.length} of them across seventeen choices. 道 The tree accumulates, so everybody ends up owning most of it; a card taken is two doors shut. No card pays power, because power is the axis the wall is built on.` },
  { han: '緣', name: 'Somebody on the road', status: 'done', at: 'meet',
    line: `${MEETINGS.length} meetings, one choice each and two named outcomes. Not economy: everything they could ever pay together is ${MEET_POINT_CEILING} 道 against ${TOTAL_COST} for the tree, and half the answers are nothing at all. Nine realms and a Dragon, and until this nothing in it had ever spoken.` },
  { han: '洞天', name: 'A place you own', status: 'done', at: 'cave',
    line: `${BEDS} beds. 材 goes into the ground and comes up as qi over real hours, and a ripe bed waits for ever. Worked from both ends by hand, so it pays for opening the app rather than for owning it. Every seed says what it ripens into and what that is an hour, so the one decision the beds exist for is made with the numbers visible.` },
  { han: '秘境', name: 'A run with an ending', status: 'done', at: 'secret',
    line: `${SECRET_ROOMS} rooms, two ways on at each, and every other one is a gate with one guardian. Nothing is carried, so losing takes nothing back. Every door is the room it goes to, drawn, and the end of a run says what the whole thing gave. Four shapes and five measurements before the wall held.` },

  { han: '期', name: 'The one thing that never runs out', status: 'done', at: 'week',
    line: `Everything else in the game arrives once, the last of it around the seventh week. One mark rides the calendar instead: a beast worth double 材 material, a herb worth planting, a room of 秘境 worth reaching, all three derived from the week and the save alone. No server, no clock to cheat, and it may never touch the qi rate. Measured, the cultivator who never fights finishes on the same day with it as without.` },

  { han: '氣查', name: 'The audit of the qi', status: 'done', at: 'audit',
    line: 'npm run qi walks every path the qi can take. Every verb against the price it quotes, the ladder across an absence, a save round-tripped through validate, a clock that jumps backwards. It found three caps written twice, a drive that could empty a pocket, and a homecoming card that reported 0 qi gathered to a cultivator who had gathered 205M.' },

  { han: '轉世', name: 'Rebirth', status: 'planned',
    line: 'Ruled out. 九境 is purely vertical by decision: nothing resets, and every track only goes up. This row stays so the decision is on the page rather than in somebody\'s memory.' },
];

/** 狀 The board, counted once, so the summary and the board itself cannot disagree. */
const CLOSED = SYSTEMS.filter((x) => x.status === 'done').length;
const OPEN = SYSTEMS.filter((x) => x.status === 'open').length;
const PLANNED = SYSTEMS.filter((x) => x.status === 'planned').length;

const STATE = {
  done: { han: '成', word: 'closed', tone: 'var(--jade)' },
  open: { han: '行', word: 'open', tone: 'var(--gold)' },
  planned: { han: '待', word: 'planned', tone: 'var(--faint)' },
} as const;

// ── the sections ─────────────────────────────────────────────────────────────

const statusRows = SYSTEMS.map((s) => {
  const st = STATE[s.status];
  const label = s.at ? `<a href="#${s.at}">${s.name}</a>` : s.name;
  return `<div class="srow" style="--hue:${st.tone}">
    <span class="st"><b class="cjk">${st.han}</b><i>${st.word}</i></span>
    <span class="body"><b class="cjk">${s.han}</b> <em>${label}</em><i>${s.line}</i></span>
  </div>`;
}).join('');


const opensRows = REALMS.map((r) => {
  const stance = STANCES.find((x) => x.realm === r.n)!;
  const art = ARTS.find((x) => x.realm === r.n)!;
  const systems = opensIn(r.n);
  return `<tr style="--hue:${r.colour}">
    <td><b class="cjk">${r.han}</b> <i>${r.name}</i></td>
    <td><span class="cjk">${stance.han}</span> <i>${stance.name}</i></td>
    <td><span class="cjk">${art.han}</span> <i>${art.name}</i></td>
    <td>${systems.length === 0 ? '<i>the loop itself</i>' : systems.map((x) =>
      `<b class="cjk" style="color:var(--gold)">${x.han}</b> <em>${x.name}</em>`).join('<br>')}</td>
  </tr>`;
}).join('');

const opensCards = OPENED.map((x) => `
  <div class="row" style="--hue:${realmOf(x.realm).colour}">
    <span class="body">
      <b class="cjk">${x.han}</b> <em>${x.name}</em>
      <i>${realmOf(x.realm).han} ${realmOf(x.realm).name}, the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][x.realm - 1]} realm · ${x.gives}</i>
    </span>
  </div>`).join('');

const habitRows = RUNS.map((r) => {
  const at9 = r.arrival[8];
  const hue = at9 === undefined ? 'var(--cinnabar)' : 'var(--jade)';
  return `<tr style="--hue:${hue}">
    <td><b class="cjk">${r.habit.name}</b><i style="display:block">${r.habit.who}</i></td>
    <td class="n">${r.habit.checks}x</td>
    <td class="n">${r.habit.minutes} min</td>
    <td class="n" style="color:${hue}">${at9 === undefined ? `never · stuck at ${r.reached}` : `day ${at9.toFixed(0)}`}</td>
    <td class="n">${num(r.power)}</td>
    <td class="n">${r.state.tower || '—'}</td>
    <td class="n">${r.fights.toLocaleString('en-GB')}</td>
  </tr>`;
}).join('');

const ceiling = recordCeiling();

const refineRows = [0, 5, 10, 15, 20, 25, 30].map((n) => `<tr>
    <td><b class="cjk">煉 ${n}</b></td>
    <td class="n">${num(refineCost(n))}</td>
    <td class="n">${num(refineSpent(n))}</td>
    <td class="n">×${refineFactor(n).toFixed(2)}</td>
  </tr>`).join('');

const noticeRows = NOTICES.map((n) => `
  <div class="row">
    <span class="body"><b class="cjk">${n.han}</b> <em>${n.title}</em><i>${n.text}</i></span>
  </div>`).join('');

const markRows = MARK_INFO.map((m, i) => `
  <div class="row">
    <span class="body">
      <b class="cjk">${m.han}</b> <em>${m.name}</em>
      <i>at ${MARKS[i]} ${MARKS[i] === 1 ? 'kill' : 'kills'} · ${m.pays}</i>
    </span>
  </div>`).join('');

const ladderRows = REALMS.map((r) => {
  const first = ladderAt((r.n - 1) * LAYERS_PER_REALM);
  const last = ladderAt((r.n - 1) * LAYERS_PER_REALM + LAYERS_PER_REALM - 1);
  return `<tr style="--hue:${r.colour}">
    <td><b class="cjk">${r.han}</b> <i>${r.name}</i></td>
    <td class="n">${num(first)}</td><td class="n">${num(last)}</td>
    <td class="n">${num(realmCost(r.n))}</td>
    <td class="n">${levelCap(r.n)}</td>
  </tr>`;
}).join('');

const realmRungs = REALMS.map((r) => `
  <div class="rung" style="--hue:${r.colour}">
    <span class="no">${r.n}</span>
    <span class="fig">${portrait({ realm: r.n, pulse: 0.3 })}</span>
    <b class="cjk">${r.han}</b><i>${r.name}</i>
  </div>`).join('');

const upgradeRows = UPGRADES.map((u) => {
  const i = UPGRADE_INFO[u];
  const fresh = newState(0);
  const first = upgradeCost(fresh, u);
  const top = upgradeCost({ ...fresh, realm: 9, levels: { ...fresh.levels, [u]: levelCap(9) - 1 } }, u);
  return `<div class="row">
    <span class="ic">${icon(i.icon, 22)}</span>
    <span class="body">
      <b class="cjk">${i.han}</b> <em>${i.name}</em>
      <i>${i.effect} · paid in ${i.currency === 'qi' ? 'qi' : '材 material'} ·
         first level ${num(first)}, last ${num(top)}</i>
    </span>
  </div>`;
}).join('');

const beastGrid = REALMS.map((r) => `
  <div class="col" style="--hue:${r.colour}">
    <span class="no">${r.n}</span>
    ${[...commonsOf(r.n), wardenOf(r.n)].map((b) => `
      <span class="bst${b.warden ? ' w' : ''}" title="${b.han} ${b.name}">${icon(b.icon, 24)}</span>
      <i class="bn">${b.han}</i>`).join('')}
  </div>`).join('');

const beastNames = REALMS.map((r) => `
  <div class="card" style="--hue:${r.colour}">
    <b class="cjk">${r.han}</b> <i class="faint">${r.name}</i>
    <div class="lin">${[...commonsOf(r.n), wardenOf(r.n)].map((b) =>
      `<span><b style="color:${r.colour}">${b.han}</b> <i>${b.name}${b.warden ? ' · warden' : ''} · 力 ${num(beastPower(b))} · 材 ${num(loot(b))}</i></span>`).join('')}</div>
  </div>`).join('');

/* ── 畫 The paintings ───────────────────────────────────────────────────── */

/**
 * 圖檔 One painting, pointed at where the bible keeps it.
 *
 * The game serves art/<kind>/<key>.webp out of its own public folder. The bible is one
 * file and a folder beside it, so every painting it shows is copied into bible-art/art/
 * at the end of this script, found by reading the finished page back rather than by a
 * second list. A painting that leaves the page stops being published with it.
 */
function pic(kind: Painted, key: string, alt: string): string {
  const src = pictureOf(kind, key);
  return src
    ? `<img class="pic" src="bible-art/${src}" alt="${alt}" loading="lazy">`
    : `<span class="pic gap" aria-hidden="true"></span>`;
}

/* ── 問 The three questions asked at midnight ──────────────────────────── */

/**
 * 忙 How much there is to do, and 值 what each system is worth.
 *
 * Both are full climbs, played here rather than remembered: three habits walked visit by
 * visit for the first hundred and twenty days, and one walked to the top with every
 * source of power stripped out of the save in turn. See tools/busy.ts and tools/worth.ts.
 */
const BUSY = ['casual', 'active', 'every hour'].map((n) => busyReport(n));
const ACTIVE_BUSY = BUSY.find((b) => b.name === 'active')!;
/**
 * 開 The systems, told apart from the realms they arrive with.
 *
 * 雷池 the tribulation is on the list and it is the ninth realm itself, so "everything is
 * open by day 45" is true and says the wrong thing. What the gap actually is, is between
 * the last system a player can be surprised by and the end of the climb.
 */
const SYS_IN = ACTIVE_BUSY.arrived.filter((a) => !a.what.startsWith('realm'));
const SYS_LAST = SYS_IN[SYS_IN.length - 2];
const SYS_EARLY = SYS_IN.filter((a) => a.day < 5).length;

const WORTH = worthWalk();
const TOP_WORTH = WORTH[WORTH.length - 1];

const busyRows = BUSY.map((b) => `<tr>
  <td><em>${b.name}</em></td>
  <td class="n">${b.visits.length}</td>
  <td class="n">${b.mean.toFixed(1)}</td>
  <td class="n">${b.taps.toFixed(0)}</td>
  <td class="n">${((b.thin.length / b.visits.length) * 100).toFixed(0)}%</td>
  <td class="n">${b.quiet.toFixed(0)}d</td>
</tr>`).join('');

const liveRows = (() => {
  const counts = new Map<string, number>();
  for (const v of ACTIVE_BUSY.visits) for (const k of v.open) counts.set(k, (counts.get(k) ?? 0) + 1);
  return KINDS.map((k) => {
    const share = ((counts.get(k.name) ?? 0) / ACTIVE_BUSY.visits.length) * 100;
    return `<tr>
      <td><b class="cjk">${k.han}</b> <i>${k.name}</i></td>
      <td class="n">${share.toFixed(0)}%</td>
      <td><span class="wk"><i style="width:${share.toFixed(0)}%"></i></span></td>
    </tr>`;
  }).join('');
})();

const arriveRows = ACTIVE_BUSY.arrived.map((a) => `<tr>
  <td class="n">day ${a.day.toFixed(1)}</td><td>${a.what}</td></tr>`).join('');

const worthRows = WORTH.map((w, i) => `<tr${i === WORTH.length - 1 ? ' class="last"' : ''}>
  <td><b class="cjk">${realmOf(w.realm).han}</b> <i>${i === WORTH.length - 1 ? 'the top' : `realm ${w.realm}`}</i></td>
  ${SOURCES.map((src) => {
    const v = w.share[src.name];
    const txt = v >= 1000 ? `×${(v / 1000).toFixed(0)}k` : v >= 10 ? `×${v.toFixed(0)}` : `×${v.toFixed(2)}`;
    return `<td class="n"${v < 1.02 ? ' style="color:var(--faint)"' : ''}>${txt}</td>`;
  }).join('')}
</tr>`).join('');

const paintCell = (img: string, han: string, name: string, hue?: string) => `
  <span class="cell">${img}
    <b class="cjk"${hue ? ` style="color:${hue}"` : ''}>${han}</b>
    <i>${name}</i></span>`;

const sheetCells = (key: string, kind: Painted, hue?: (i: number) => string) => {
  const sheet = SHEETS.find((sh) => sh.key === key)!;
  return sheet.cells.map((c, i) =>
    paintCell(pic(kind, c.key, c.name), c.han, c.name, hue?.(i))).join('');
};

const figStrip = (who: string) => REALMS.map((r) => paintCell(
  pic('self', figureKey(who, r.n), `${FIGURES.find((f) => f.key === who)!.name} at ${r.name}`),
  r.han, r.name, r.colour)).join('');

const realmPaint = REALMS.map((r) => paintCell(
  pic('realm', String(r.n), r.name), r.han, `${r.name} · ${r.stuff}`, r.colour)).join('');

const beastPaint = REALMS.flatMap((r) => [...commonsOf(r.n), wardenOf(r.n)].map((b) => paintCell(
  pic('beast', b.key, b.name),
  b.han, `${b.name}${b.warden ? ' · warden' : ''}`, r.colour))).join('');

const skyPaint = HEAVENS.map((h) => paintCell(
  pic('heaven', String(h.n), h.name), h.han, h.name, h.colour)).join('');

const dragonPaint = HEAVENS.map((h) => paintCell(
  pic('beast', `heaven-${h.n}`, h.dragon.name), h.dragon.han, h.dragon.name, h.colour)).join('');

const meetPaint = sheetCells('meetings', 'meet');

// 符 Nine arts and four sundries, which is enough to say what an emblem is. Every one
// of them is in the game and on 張 the sheets page. Only these are shown here because a
// published page may carry at most 255 files beside it, the drawings already take half
// of that, and the arts are the family a player meets first.
const EMBLEM_SHOWN = ['art-fox', 'art-ape', 'art-tiger', 'art-crane', 'art-wolf',
  'art-turtle', 'art-serpent', 'art-dragon', 'art-puppet',
  'herb-orchid', 'pill-fortune', 'room-shrine', 'card-taotie'];
const emblemPaint = SHEETS.filter((sh) => sh.kind === 'emblem')
  .flatMap((sh) => sh.cells)
  .filter((c) => EMBLEM_SHOWN.includes(c.key))
  .sort((a, b) => EMBLEM_SHOWN.indexOf(a.key) - EMBLEM_SHOWN.indexOf(b.key))
  .map((c) => paintCell(pic('emblem', c.key, c.name), c.han, c.name))
  .join('');

const sheetRows = SHEETS.map((sh) => {
  const have = sh.cells.filter((c) => PICTURES[sh.kind].includes(c.key)).length;
  return `<tr>
    <td><b class="cjk">${sh.han}</b> <i>${sh.title}</i></td>
    <td class="n">${sh.cols}×${sh.rows}</td>
    <td class="n">${sh.cells.length}</td>
    <td class="n">${have === sh.cells.length ? '✓' : `${have}`}</td>
  </tr>`;
}).join('');

const gapRows = FAMILIES.map((f) => {
  const have = paintedIn(f);
  return `<tr>
    <td><b class="cjk">${f.han}</b> <i>${f.name}</i></td>
    <td class="n">${have} of ${f.count}</td>
    <td><i class="faint">${f.sheet ?? f.seen}</i></td>
  </tr>`;
}).join('');

const PAINTED_ALL = FAMILIES.reduce((n, f) => n + paintedIn(f), 0);
const DRAWN_ALL = FAMILIES.reduce((n, f) => n + f.count, 0);

const stanceRows = STANCES.map((s) => `
  <div class="row" style="--hue:${realmOf(s.realm).colour}">
    <span class="body">
      <b class="cjk">${s.han}</b> <em>${s.name}</em>
      <i>realm ${s.realm} · ${s.text} <span style="color:var(--gold)">Wants ${s.wants}.</span></i>
    </span>
  </div>`).join('');

const artRows = ARTS.map((a) => `
  <div class="row" style="--hue:${realmOf(a.realm).colour}">
    <span class="ic">${icon(a.icon, 22)}</span>
    <span class="body">
      <b class="cjk">${a.han}</b> <em>${a.name}</em>
      <i>from ${wardenOf(a.realm).han} ${wardenOf(a.realm).name}, realm ${a.realm} · ${a.text}</i>
    </span>
  </div>`).join('');

const setRows = REALM_SETS.map((s) => {
  const r = realmOf(s.realm);
  const steps = s.steps.map((st) =>
    `<span class="pill"><b>${st.pieces}</b><i>${Object.entries(st.effects)
      .map(([a, v]) => `${AFFIX_INFO[a as keyof typeof AFFIX_INFO].han} +${v}`).join(' ')}</i></span>`).join('');
  return `<div class="card" style="--hue:${r.colour}">
    <b class="cjk" style="color:${r.colour}">${s.han}</b> <em>${s.name}</em>
    <i class="faint" style="display:block;margin:3px 0 7px">realm ${s.realm} · ${s.lore}</i>
    <div class="pills">${steps}</div>
  </div>`;
}).join('');

const archetypeRows = SLOTS.map((slot) => `
  <div class="card">
    <b class="cjk">${SLOT_INFO[slot].han}</b> <em>${SLOT_INFO[slot].name}</em>
    <div class="lin" style="margin-top:6px">${archetypesOf(slot).map((a) =>
      `<span><b>${a.han}</b> <i>${a.name} · ${AFFIX_INFO[a.affix].han}</i></span>`).join('')}</div>
  </div>`).join('');

const itemNames = REALM_SETS.map((s) => {
  const r = realmOf(s.realm);
  const pieces = GEAR.filter((g) => g.realm === s.realm);
  return `<details class="items" style="--hue:${r.colour}">
    <summary><b class="cjk" style="color:${r.colour}">${s.han}</b>
      <em>${s.name}</em> <i>${pieces.length} pieces</i></summary>
    <div class="lin">${pieces.map((g) =>
      `<span><b style="color:${r.colour}">${g.han}</b> <i>${g.name}</i></span>`).join('')}</div>
  </details>`;
}).join('');

const treeColumns = PATHS.map((p) => {
  const info = PATH_INFO[p];
  return `<div class="card" style="--hue:${info.colour}">
    <b class="cjk" style="color:${info.colour}">${info.han}</b> <em>${info.name}</em>
    <i class="faint" style="display:block;margin:3px 0 8px">${info.blurb}</i>
    ${nodesOf(p).map((nd) => `<div class="node${nd.keystone ? ' key' : ''}">
      <b class="cjk">${nd.han}</b> <em>${nd.name}</em>
      <i>${nd.cost} 道 · ${nd.text}${nd.excludes ? ' · closes the other side of the fork' : ''}</i>
    </div>`).join('')}
  </div>`;
}).join('');

const towerRows = [1, 3, 5, 7, 9].map((r) => {
  const floor = r * FLOORS_PER_REALM;
  return `<tr style="--hue:${realmOf(r).colour}">
    <td><b class="cjk">floor ${floor}</b></td>
    <td class="n">${num(floorPower(floor))}</td>
    <td><i>${wardenOf(r).han} ${wardenOf(r).name}</i></td>
    <td class="n">${num(floorLoot(floor))}</td>
  </tr>`;
}).join('') + [100, 200, 400].map((floor) => `<tr style="--hue:var(--faint)">
    <td><b class="cjk">floor ${floor}</b></td>
    <td class="n">${num(floorPower(floor))}</td>
    <td><i>past the mountain</i></td>
    <td class="n">${num(floorLoot(floor))}</td>
  </tr>`).join('');

const none = { body: 0, bane: 0, fortune: 0 };
const pillRows = LINES.map((line) => {
  const info = PILL_LINES[line];
  return `<div class="card">
    <span class="ic" style="float:left;margin-right:10px;color:var(--gold)">${icon(info.icon, 22)}</span>
    <b class="cjk">${info.han}</b> <em>${info.name}</em>
    <i class="faint" style="display:block;margin:3px 0 7px">${info.effect}. ${info.lore}</i>
    <div class="lin">${PILL_GRADES[line].map((g, i) =>
      `<span><b style="color:${realmOf(i + 1).colour}">${g.han}</b> <i>${g.name} · realm ${i + 1}</i></span>`).join('')}</div>
  </div>`;
}).join('');

const pillPrices = [0, 20, 40, 60, 80, 120].map((n) => {
  const cost = pillCost({ ...none, body: n }, 'body');
  return `<tr><td><b class="cjk">pill ${n + 1}</b></td>
    <td class="n">${num(cost.qi)}</td><td class="n">${num(cost.materials)}</td></tr>`;
}).join('');

// ── the page ─────────────────────────────────────────────────────────────────

/**
 * 樣 The mockups.
 *
 * Bruno: *"faz um mockup visual sempre com exemplos quando se altera algo relacionado
 * com aspecto/arte."* So every screen change since the last version is drawn here, with
 * the game's own art functions and the game's own numbers. A mockup assembled from
 * invented values would be a drawing of a thing that does not exist.
 */

// 梯 The climb, exactly as the screen draws it: a realm halfway up, five rungs paid.
const MOCK_LADDER = (() => {
  const r = realmOf(5);
  const dots = REALMS.map((x, i) => `<span class="dot" style="--c:${x.colour}"${
    i + 1 < 5 ? ' data-done="true"' : i + 1 === 5 ? ' data-here="true"' : ''}></span>`).join('');
  const rungs = Array.from({ length: LAYERS_PER_REALM }, (_, i) =>
    `<span class="rung"><i style="width:${i < 4 ? 100 : i === 4 ? 62 : 0}%;background:${r.colour}"></i></span>`).join('');
  return `<div class="mk ladder">
    <div class="lrow"><span class="lab">境 realm 5/9</span><span class="realms">${dots}</span></div>
    <div class="lrow"><span class="lab">層 layer 5/9</span><span class="rungs">${rungs}</span>
      <span class="warden">${icon(wardenOf(5).icon, 17)}</span></div>
    <p class="cap">Your qi fills one rung. Nine rungs fill ${r.han} ${r.name}. Its warden
      then stands at the end, and beating it opens the next realm.</p>
  </div>`;
})();

// 指 The ring and the arrow, over a real upgrade box.
const MOCK_COACH = `<div class="mk coach">
  <span class="arrow"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 3 L12 19 M5.5 12.5 L12 19.5 L18.5 12.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  <div class="upg ringed">
    <span class="ic">${icon(UPGRADE_INFO.technique.icon, 26)}</span>
    <span><b>${UPGRADE_INFO.technique.name} <em class="cjk">${UPGRADE_INFO.technique.han}</em></b>
      <i>${UPGRADE_INFO.technique.effect} · 0 of ${LEVELS_PER_REALM}</i></span>
    <span class="price">763<em>qi</em></span>
  </div>
</div>`;

// 時 The same guide step in both of its states.
const MOCK_GUIDE = `<div class="mk two">
  <div class="gcard">
    <span class="n">Step 2 of ${STEPS.length}</span>
    <b><span class="cjk">狩</span> ${STEPS[1].title}</b>
    <i>${STEPS[1].text}</i>
  </div>
  <div class="gcard waiting">
    <span class="n">Next · 2 of ${STEPS.length}</span>
    <b><span class="cjk">狩</span> ${STEPS[1].title}</b>
    <i>${STEPS[1].waiting?.text ?? ''}<span class="bar"><i style="width:44%"></i></span></i>
  </div>
</div>`;

// 鑑 A real trade, through the real comparison.
const MOCK_ITEM = (() => {
  const tpl = templateOf(MOCK_HELD);
  const rar = RARITY_INFO[MOCK_HELD.rarity];
  const ranks = RARITIES.map((x) => `<span class="rank"${x === MOCK_HELD.rarity
    ? ` data-on="true" style="--c:${RARITY_INFO[x].colour}"` : ''}><b class="cjk">${RARITY_INFO[x].han}</b></span>`).join('');
  const rows = MOCK_LINES.map((d) => {
    const dir = d.theirs > d.mine ? 'up' : d.theirs < d.mine ? 'down' : '';
    return `<div class="line ${dir}"><b class="cjk">${AFFIX_INFO[d.affix].han}</b>
      <span class="lab">${AFFIX_INFO[d.affix].label}</span>
      <span class="vs"><i>${d.mine > 0 ? pct(d.mine, d.affix) : '—'}</i><em>→</em><b>${
        d.theirs > 0 ? pct(d.theirs, d.affix) : '—'}</b></span></div>`;
  }).join('');
  return `<div class="mk sheet2">
    <div class="ihead">${gearTile(MOCK_HELD, { size: 76 })}
      <span><b class="cjk" style="color:${rar.colour}">${tpl.han}</b>
        <i>${tpl.name}</i>
        <em>${SLOT_INFO[tpl.slot].han} ${SLOT_INFO[tpl.slot].name} · realm ${tpl.realm} make</em></span></div>
    <div class="ranks">${ranks}<span class="rn" style="color:${rar.colour}">${rar.name}<i>${
      linesOf(MOCK_HELD.rarity)} lines</i></span></div>
    <h4>Against the ${templateOf(MOCK_WORN).name} you are wearing</h4>
    ${rows}
    <div class="verd"><span class="sw"><b class="cjk">力</b><em>${sign(MOCK_SWING.power)}</em><i>power</i></span>
      <span class="sw"><b class="cjk">氣</b><em>${sign(MOCK_SWING.rate)}</em><i>qi per second</i></span></div>
  </div>`;
})();

// 圍 The drive's three sizes, at the price the game charges halfway up the fifth realm.
const MOCK_DRIVE = (() => {
  const s5: State = { ...newState(0), realm: 5, layer: 4 };
  const b = commonsOf(5)[0];
  const per = lootFrom(s5, b);
  return `<div class="mk drive">
    ${DRIVE_SIZES.map((n) => `<div class="size"><span class="n">${n}</span>
      <span class="what"><b>${n} kills</b><i>about ${num(per * n)} 材</i></span>
      <span class="price">${num(driveCost(s5, n))}<em>qi</em></span></div>`).join('')}
    <p class="cap">${b.han} ${b.name}, halfway up the fifth realm. Fifty kills costs about
      one rung wherever you are standing, and fighting it one at a time is still free.</p>
  </div>`;
})();

// 半 The 道 screen's two halves, and the count that rides the tab.
const MOCK_HALVES = (() => {
  // A real cultivator at the fifth realm: the points are what daoFree() actually says.
  const s5: State = { ...newState(0), realm: 5, layer: 4, unlocked: ['root'] };
  const free = daoFree(layersOpened(s5), 4, s5.unlocked, 0);
  return `<div class="mk two">
    <div class="halfbar">
      <span data-on="true"><b class="cjk">道</b><em>Techniques</em><i class="pip">${free}</i></span>
      <span><b class="cjk">勢</b><em>Stance &amp; Arts</em></span>
    </div>
    <div class="tabbar">
      ${[['修', 'Cultivate'], ['狩', 'Hunt'], ['塔', 'Trials'], ['器', 'Gear']].map(
        ([h, n]) => `<span><b class="cjk">${h}</b><i>${n}</i></span>`).join('')}
      <span data-on="true"><b class="cjk">道<u>${free}</u></b><i>Path</i></span>
    </div>
    <p class="cap">The switch, and the same count on the tab bar, which is where it is
      seen from every other screen in the game.</p>
  </div>`;
})();

// 凝丹 The card that appears only when 材 material has run out, at the real price.
/**
 * 塔 What the tower card used to quote against what the floor pays, at the summit the
 * audit photographed: the table times the seals, against floorMaterial, which is the
 * number the save is credited and the one the card and the arena now read.
 */
const TOWER = (() => {
  const s: State = {
    ...newState(0), realm: 9, layer: 8, tower: 150, wardenFell: true,
    killed: { rat: 12, hound: 11, frog: 10, serpent: 3, mantis: 2, bat: 1, beetle: 2, owl: 1,
              raven: 1, boar: 2, wolf: 1, vulture: 1, crab: 1, fox: 1, ape: 1, crane: 1, tiger: 1 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought',
               'formula', 'ninerungs', 'quickfire', 'sealbreaker', 'slowfire', 'skystair',
               'ninereturns', 'topless', 'uncarved'],
  };
  const quoted = floorLoot(151) * (1 + SEAL_LOOT * Math.floor(150 / FLOORS_PER_REALM));
  const paid = floorMaterial(s, 151);
  return { quoted, paid, share: `${Math.round((quoted / paid) * 100)}%` };
})();

const MOCK_CONDENSE = (() => {
  const s5: State = { ...newState(0), realm: 5, layer: 8 };
  return `<div class="mk cond">
    <div class="chd"><b class="cjk">凝丹</b><span><em>Not enough 材 material</em>
      <i>${num(condenseCost(s5))} qi · the price of ${CORE_QI_RUNGS} layers</i></span></div>
    <p class="body">You can force a 妖丹 out of raw qi instead. It works, and it is dear:
      this is qi that would have opened layers.</p>
    <span class="go">凝 Condense a core</span>
    <span class="hint"><b class="cjk">狩</b> A beast leaves material when it falls. That
      is the cheap way, and it is one tap away.</span>
    <p class="cap">At the fifth realm's ceiling. The price is condenseCost() and the card
      is drawn only while canBuy(cores) is false. It never shows before the first kill: a
      new cultivator has no material because nothing has fallen yet, not because it ran out.</p>
  </div>`;
})();

// 出 The beasts of a realm that have not walked out yet, at the sixth realm's third rung.
const MOCK_COMING = (() => {
  const realm = 6;
  const layer = 2;
  const rows = comingIn(realm, layer).map((b) => {
    const r = realmOf(b.realm);
    return `<div class="crow">
      <span class="cic" style="color:${r.colour}">${icon(b.icon, 30)}</span>
      <span class="cn"><b class="cjk" style="color:${r.colour}">${b.han}</b>
        <i>${b.name}</i></span>
      <span class="cl">layer ${b.layer + 1}</span></div>`;
  }).join('');
  return `<div class="mk coming2">${rows}
    <p class="cap">Standing on the third rung of ${realmOf(realm).han}
      ${realmOf(realm).name}. ${commonsOf(realm)[0].name} is already out; the other two
      are the realm's next two events.</p></div>`;
})();

// 拆 The melt, drawn: the rank chips and the button that states its own size.
const MOCK_SALVAGE = (() => {
  // A chest of the junk a real hunt leaves, at the third realm.
  const realm = 3;
  const junk: Item[] = [
    { id: 'a', template: `sword${realm}`, rarity: 'common', rolls: [] },
    { id: 'b', template: `robe${realm}`, rarity: 'common', rolls: [] },
    { id: 'c', template: `plainring${realm}`, rarity: 'common', rolls: [] },
    { id: 'd', template: `sandals${realm}`, rarity: 'common', rolls: [] },
    { id: 'e', template: `band${realm}`, rarity: 'spirit', rolls: [] },
    { id: 'f', template: `charm${realm}`, rarity: 'spirit', rolls: [] },
    { id: 'g', template: `sword${realm}`, rarity: 'mystic', rolls: [] },
  ];
  const picked = salvageable(junk, 'common');
  const chips = RARITIES.map((r) => `<span class="rk"${r === 'common'
    ? ` data-on="true" style="--c:${RARITY_INFO[r].colour}"` : ''}><b class="cjk">${
    RARITY_INFO[r].han}</b></span>`).join('');
  const layer = ladderAt((realm - 1) * LAYERS_PER_REALM + 4);
  return `<div class="mk salv">
    <div class="chestrow">${chips}<span class="upto">Common and below</span></div>
    <div class="meltbtn"><b class="cjk">拆</b>
      <i>Melt ${picked.length} pieces</i>
      <em>${num(salvageWorth(picked))}<span>qi</span></em></div>
    <p class="cap">Seven pieces in the chest at 金丹 the third realm, four of them 凡. The
      button says what it will take and what it pays before it is pressed, because there
      is no undo, and what it pays is ${(salvageWorth(picked) / layer * 100).toFixed(0)}%
      of the layer being climbed.</p>
  </div>`;
})();

// 境外 The card above the summit, at the fourth mark, with the real copy and icon.
const MOCK_HEAVEN = (() => {
  const marks = 4;
  const h = heavenAt(marks)!;
  const nx = nextHeaven(marks)!;
  return `<div class="mk hcard" style="--hue:${h.colour}">
    <div class="hh"><span class="hn"><b class="cjk">${h.han}</b><em>${h.name}</em></span>
      <span class="hm"><b>${marks}</b><i>${marks} marks</i></span></div>
    <p class="hgain">${h.gains}</p>
    <p class="hroom">＋${LEVELS_PER_HEAVEN} levels of 劍訣 and 妖丹, for good</p>
    <div class="hnx"><span class="hic" style="color:${nx.colour}">${icon(nx.dragon.icon, 40)}</span>
      <span><em>${marksToNext(marks)} more crossings open</em>
        <i><b class="cjk" style="color:${nx.colour}">${nx.han}</b> ${nx.name} ·
          ${nx.dragon.han} ${nx.dragon.name}</i></span></div>
    <p class="cap">At four marks. The heaven, the room it opened, and the animal three
      crossings away. All of it out of heavens.ts, including which Dragon is drawn.</p>
  </div>`;
})();

// 收 The corner, shut and open.
const MOCK_MENU = `<div class="mk two">
  <div class="corner"><span class="sw1">≡</span><p class="cap">Shut, which is how every
    visit starts.</p></div>
  <div class="corner"><div class="menu">
    ${[['存', 'Your save'], ['?', 'How to play'], ['釋', 'What the characters mean'],
       ['碑', 'The stele'], ['♪', 'Sound on']].map(([h, n]) =>
      `<span><b class="cjk">${h}</b><i>${n}</i></span>`).join('')}
  </div></div>
</div>`;

/* ── 提 the proposals: content systems, drawn rather than described ──────────
 *
 * Bruno: "sem sistemas de conteúdo, sinto que é tudo muito superficial e vazio,
 * consegues apresentar propostas visuais de coisas que possamos implementar".
 *
 * Nothing below exists in the game. Each one is drawn with the game's own art
 * functions and its own tables, because a proposal described in a paragraph is a
 * proposal nobody can judge, and the rule for anything a player would see is the same
 * whether it is shipped or only offered.
 *
 * All four are written to the laws the game already keeps: sim stays pure, nothing
 * uncapped may raise the qi rate, nothing is taken away for being away, and losing
 * costs nothing.
 */

/** 洞天 Three beds, one ripe, one growing, one empty. */
const MOCK_CAVE = (() => {
  const beds = [
    { han: '龍血草', name: 'Dragonblood Grass', ic: 'spiral-bloom', at: 1, say: 'Ripe. Take it.', hue: 'var(--gold)' },
    { han: '月華蘭', name: 'Moonlight Orchid', ic: 'crystal-cluster', at: 0.62, say: 'Ripe in 2h 14m', hue: 'var(--jade)' },
    { han: '', name: 'Empty bed', ic: 'incense', at: 0, say: 'Plant something', hue: 'var(--line)' },
  ];
  return `<div class="mk cave">
    <div class="beds">${beds.map((b) => `
      <div class="bed" style="--c:${b.hue}"${b.at >= 1 ? ' data-ripe="true"' : ''}>
        <span class="ring"><i style="--a:${Math.round(b.at * 360)}deg"></i>
          <em>${icon(b.ic, 30)}</em></span>
        <b class="cjk">${b.han || '空'}</b>
        <i>${b.name}</i>
        <span class="when">${b.say}</span>
      </div>`).join('')}</div>
  </div>`;
})();

/** 秘境 A seven room path, three walked, two doors open at the fourth. */
const MOCK_SECRET = (() => {
  const rooms = [
    { ic: 'rat', done: true }, { ic: 'gold-nuggets', done: true },
    { ic: 'praying-mantis', done: true }, { ic: 'wax-seal', here: true },
    { ic: '', }, { ic: '' }, { ic: 'dragon-head', last: true },
  ];
  const path = rooms.map((r, i) => `<span class="room"${r.done ? ' data-done="true"'
    : r.here ? ' data-here="true"' : r.last ? ' data-last="true"' : ''}>${
    r.ic ? icon(r.ic, 24) : '<em>?</em>'}${i < rooms.length - 1 ? '<i class="link"></i>' : ''}</span>`).join('');
  const doors = [
    { han: '獸', name: 'A beast in the dark', ic: 'centipede', say: '力 340. It drops a piece of your realm plus one.' },
    { han: '龕', name: 'A shrine, long cold', ic: 'crystal-shrine', say: 'One 道 point, or two if you leave the offering.' },
  ];
  return `<div class="mk secret">
    <div class="path">${path}</div>
    <div class="doors">${doors.map((d) => `
      <div class="door"><span class="s">${icon(d.ic, 26)}</span>
        <span><b class="cjk">${d.han}</b> <em>${d.name}</em><i>${d.say}</i></span>
      </div>`).join('')}</div>
  </div>`;
})();

/** 悟道 Three cards at a breakthrough, one taken. */
const MOCK_AWAKEN = (() => {
  const cards = [
    { han: '血食', name: 'Blood Feast', ic: 'boar-tusks', say: 'Beasts give +25% 材 material, for ever.', on: true },
    { han: '心鏡', name: 'Mirror Heart', ic: 'yin-yang', say: '入定 sitting lasts half an hour instead of a quarter.' },
    { han: '逆鱗', name: 'Inverted Scale', ic: 'dragon-spiral', say: 'A beast one realm above you is fought at your own realm’s odds.' },
  ];
  return `<div class="mk awaken">${cards.map((c) => `
    <div class="card"${c.on ? ' data-on="true"' : ''}>
      <span class="s">${icon(c.ic, 30)}</span>
      <b class="cjk">${c.han}</b><em>${c.name}</em>
      <i>${c.say}</i>
    </div>`).join('')}</div>`;
})();

/** 緣 One small thing, on the screen it would sit on. */
const MOCK_MEET = `<div class="mk meet">
  <div class="card">
    <span class="s">${icon('tied-scroll', 30)}</span>
    <span class="body">
      <b><span class="cjk">緣</span> An old man on the mountain road</b>
      <i>He is selling one thing and he will not say what it is. He wants 材 400.</i>
      <span class="picks">
        <span class="pick">Buy it</span>
        <span class="pick">Walk on</span>
      </span>
    </span>
  </div>
</div>`;

/** 悟道 Every trio, as the game offers them: the eight realms, then the nine heavens. */
const trioBlock = (trio: typeof AWAKENINGS[number], at: string) => `
  <div class="trio">
    <span class="at">${at}</span>
    <div class="three">${trio.map((c) => `
      <div class="ac"><span class="s">${icon(c.icon, 24)}</span>
        <b class="cjk">${c.han}</b><em>${c.name}</em>
        <i>${c.says}</i></div>`).join('')}</div>
  </div>`;

const AWAKEN_TABLE = AWAKENINGS
  .map((trio, i) => trioBlock(trio, `Reaching ${realmOf(i + 2).han} ${realmOf(i + 2).name}`))
  .join('');

const HEAVEN_TABLE = HEAVENS
  .map((h, i) => trioBlock(HEAVEN_CARDS[i], `Entering ${h.han} ${h.name}`))
  .join('');

/** 緣 Everybody on the road, and what the two answers do. */
const MEET_TABLE = MEETINGS.map((m) => `
  <tr><td><b class="cjk">${m.han}</b> ${m.name}</td>
    <td class="n">${m.realm}</td>
    <td>${m.picks.map((p) => {
      const cost = p.costMaterial ? `材 ${p.costMaterial} beasts` : p.costQi ? `${p.costQi} min of qi` : 'free';
      const got = p.outcome.kind === 'qi' ? `${p.outcome.minutes} min of qi`
        : p.outcome.kind === 'material' ? `材 ${p.outcome.share} beasts`
        : p.outcome.kind === 'dao' ? `${p.outcome.points} 道`
        : p.outcome.kind === 'item' ? 'a piece of gear' : 'nothing';
      return `<i>${p.label}: ${cost} \u2192 ${got}</i>`;
    }).join('')}</td></tr>`).join('');

/** 洞天 The three herbs, priced and paid as the game prices and pays them. */
const CAVE_TABLE = HERBS.map((h) => `
  <tr><td><span class="s">${icon(h.icon, 20)}</span> <b class="cjk">${h.han}</b> ${h.name}</td>
    <td class="n">${h.realm}</td><td class="n">${h.hours}h</td>
    <td class="n">材 ${h.costBeasts} beasts</td>
    <td class="n">${h.paysMinutes} min of qi</td>
    <td class="n">${(h.paysMinutes / h.hours).toFixed(1)}</td></tr>`).join('');

/** 秘境 The seven rooms, and which of them are gates. */
const SECRET_PATH = Array.from({ length: SECRET_ROOMS }, (_, i) => `
  <span class="rm"${isGate(i) ? ' data-gate="true"' : ''}>
    ${icon(isGate(i) ? ROOM_INFO.beast.icon : 'wax-seal', 20)}
    <em>${i + 1}</em>
  </span>`).join('');

/** 秘境 What is behind a door that is not a gate. */
/**
 * 圖 The rooms, drawn, at the depth each of them sits at.
 *
 * Bruno again, on the whole game and this screen in particular: *"o jogo é puramente
 * quase só texto."* These are the real panels art/secret.ts draws behind the two doors,
 * called here with the same arguments the screen calls them with.
 */
const SECRET_VAULTS = (['spring', 'shrine', 'brazier', 'beast'] as const).map((k, i) => `
  <figure class="vault">
    <span class="art">${chamber({ kind: k, step: i * 2, realm: 6 })}</span>
    <figcaption><b class="cjk">${ROOM_INFO[k].han}</b> ${ROOM_INFO[k].name}
      <em>room ${i * 2 + 1}</em></figcaption>
  </figure>`).join('');

/** 出 The way out, which is the panel the end of a run wears. */
const SECRET_OUT = `<span class="art">${chamber({ kind: 'out', step: SECRET_ROOMS, realm: 6 })}</span>`;

const SECRET_ROOMS_TABLE = (['spring', 'shrine', 'brazier'] as const).map((k) => `
  <tr><td><span class="s">${icon(ROOM_INFO[k].icon, 20)}</span>
    <b class="cjk">${ROOM_INFO[k].han}</b> ${ROOM_INFO[k].name}</td>
    <td>${ROOM_INFO[k].says}</td></tr>`).join('');

const page = `<meta charset="utf-8">
<title>九境 Ninefold · the Bible</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  /* 墨 The same eight the game wears. The bible was still in cyan and magenta on
     blue-black long after the game stopped being, and it renders 境 the realms and 牌
     the plates with the game's own functions, so half of every page was ink and the
     other half was neon. A living document that shows the game in colours it does not
     have is the exact thing this page exists not to be. */
  :root { --ground:#14110D; --panel:#1E1A14; --panel2:#191510; --line:#3A3226;
          --jade:#7FB495; --cinnabar:#D2604E; --text:#EDE3D2; --faint:#9C907C;
          --gold:#D4AF56; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.65 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:820px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2,h3 { margin:0; font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,12vw,60px); font-weight:400;
       color:var(--jade); line-height:1; }
  h2 { font-family:Rajdhani,sans-serif; font-size:26px; display:flex; gap:11px;
       align-items:baseline; }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:30px;
          color:var(--jade); }
  h3 { font-family:Rajdhani,sans-serif; font-size:14px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; margin-top:6px; }
  p { margin:0; }
  a { color:var(--jade); }
  .lead { font-size:19px; margin-top:14px; }
  .sec { margin-top:40px; border-top:1px solid var(--line); padding-top:22px;
         display:flex; flex-direction:column; gap:13px; }
  .t { color:var(--faint); max-width:64ch; }
  .t b { color:var(--text); font-weight:600; }
  .big { font-family:Rajdhani,sans-serif; font-weight:700; color:var(--gold); }
  .faint { color:var(--faint); }

  /* 拆 the melt: the rank chips and the button that states its own size. */
  #salvage .mk { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
                 padding:16px; }
  #salvage .mk .cap { margin:12px 0 0; font-size:13px; color:var(--faint); line-height:1.55; }
  #salvage .chestrow { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  #salvage .rk { width:34px; height:34px; border-radius:9px; display:grid; place-items:center;
                 background:var(--ground); border:1px solid var(--line); color:var(--line); }
  #salvage .rk b { font-size:16px; font-weight:400; color:inherit; }
  #salvage .rk[data-on] { border-color:var(--c); color:var(--c);
                          box-shadow:0 0 12px -3px var(--c); }
  #salvage .upto { margin-left:4px; font-size:12.5px; color:var(--faint); }
  #salvage .meltbtn { display:flex; align-items:center; gap:12px; margin-top:10px;
                      background:var(--panel); border:1px solid var(--line);
                      border-radius:11px; padding:12px 14px; }
  #salvage .meltbtn b { flex:none; font-size:20px; font-weight:400; color:var(--gold); }
  #salvage .meltbtn i { flex:1; font-style:normal; font-size:14.5px; }
  #salvage .meltbtn em { flex:none; font-style:normal; font-size:17px; color:var(--gold);
                         font-family:Rajdhani,sans-serif; font-weight:700; text-align:right; }
  #salvage .meltbtn em span { display:block; font-size:10px; color:var(--faint);
                              font-weight:400; letter-spacing:.1em; text-transform:uppercase; }
  #salvage .card em { display:block; margin-bottom:2px; }
  #salvage td, #salvage th { padding:5px 6px; font-size:13px; }

  /* 閒 the ceiling column, where it is worth looking at. */
  #idle td.hot { color:var(--cinnabar); font-family:Rajdhani,sans-serif; font-weight:700; }
  #idle td, #idle th { padding:5px 6px; font-size:13px; }
  #idle .card em { display:block; margin-bottom:2px; }
  #idle .card .t { font-size:13.5px; }
  /* Three tables do not fit three columns on this page; two do, and the third wraps
     under them rather than running off the edge, which is how the first draft read. */
  #idle .idlecards { grid-template-columns:1fr; }
  @media(min-width:760px){ #idle .idlecards { grid-template-columns:1fr 1fr; } }

  /* 境外 the heavens, one card each. */
  #heavens .hrow { display:flex; gap:12px; align-items:flex-start; }
  #heavens .hic { flex:none; }
  #heavens .hic svg { display:block; }
  #heavens .card > .hrow b { font-size:20px; font-weight:400; color:var(--hue); }
  #heavens .hrow em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
                      font-size:16px; }
  #heavens .hrow i { display:block; font-style:normal; font-size:12px; margin-top:2px; }
  #heavens .hg { margin:9px 0 0; font-size:13.5px; color:var(--faint); line-height:1.55; }
  #heavens .hr { margin:5px 0 0; font-size:12px; font-family:Rajdhani,sans-serif;
                 font-weight:700; letter-spacing:.03em; }

  /* 曆 the content clock's week bars. Scoped, like everything else on this page. */
  #clock .wk { display:block; height:8px; border-radius:99px; background:var(--line);
               overflow:hidden; min-width:120px; }
  #clock .wk i { display:block; height:100%; border-radius:99px; background:var(--jade); }
  #clock td:last-child { width:45%; }

  /* ── 悟道 the trios, and 緣 the people on the road ────────────────────── */
  #awaken .trios { display:grid; gap:14px; margin-top:16px; }
  #awaken .trio .at { display:block; font-size:10.5px; letter-spacing:.14em;
        text-transform:uppercase; color:var(--faint); font-family:Archivo,sans-serif;
        font-weight:600; margin-bottom:8px; }
  #awaken .three { display:grid; gap:8px; }
  @media(min-width:640px){ #awaken .three { grid-template-columns:repeat(3,1fr); } }
  #awaken .ac { padding:12px 13px; border-radius:11px; background:var(--panel);
        border:1px solid var(--line); }
  #awaken .ac .s { display:block; color:var(--jade); margin-bottom:6px; }
  #awaken .ac b { font-size:18px; font-weight:400; color:var(--jade); margin-right:7px; }
  #awaken .ac em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
        font-size:13.5px; }
  #awaken .ac i { display:block; font-style:normal; margin-top:6px; font-size:12px;
        color:var(--faint); line-height:1.5; }
  #meet .meets td i { display:block; font-style:normal; font-size:12px; color:var(--faint);
        line-height:1.5; }
  #meet .meets td b.cjk { color:var(--jade); font-weight:400; margin-right:4px; }
  #week .weeks { display:grid; gap:10px; margin:14px 0 6px; }
  #week .weeks p { display:flex; gap:12px; margin:0; background:var(--panel2);
                   border:1px solid var(--line); border-radius:11px; padding:12px 14px; }
  #week .weeks b.cjk { flex:none; font-size:20px; font-weight:400; color:var(--gold);
                       line-height:1.2; }
  #week .weeks em { display:block; font-style:normal; font-weight:700; font-size:15px; }
  #week .weeks i { display:block; font-style:normal; font-size:13.5px; color:var(--faint);
                   margin-top:3px; line-height:1.6; }
  #cave .cavetbl td b.cjk { color:var(--jade); font-weight:400; margin-right:4px; }
  #secret .cavetbl td b.cjk { color:var(--jade); font-weight:400; margin-right:4px; }
  #secret .cavetbl td .s { display:inline-block; vertical-align:-4px; color:var(--jade);
        margin-right:5px; }
  /* 圖 the drawn rooms, scoped to this section so nothing else can wear them */
  #secret .vaults { display:grid; gap:10px; margin:14px 0 6px; }
  #secret .vault { margin:0; background:var(--panel2); border:1px solid var(--line);
                   border-radius:13px; overflow:hidden; }
  #secret .vault .art { display:block; height:120px; }
  #secret .vault .art svg { display:block; width:100%; height:100%; }
  #secret .vault figcaption { padding:10px 13px 12px; font-size:13.5px; }
  #secret .vault figcaption b.cjk { color:var(--jade); font-weight:400; margin-right:5px; }
  #secret .vault figcaption em { display:block; margin-top:3px; font-style:normal;
                                 font-size:11px; letter-spacing:.14em; text-transform:uppercase;
                                 color:var(--faint); }
  #secret .mk.out .art { display:block; height:120px; border-radius:11px; overflow:hidden; }
  #secret .mk.out .art svg { display:block; width:100%; height:100%; }
  #secret .cap { margin:8px 0 0; font-size:12.5px; color:var(--faint); line-height:1.55; }
  #secret .spath { display:flex; align-items:center; gap:6px; margin:16px 0 4px; }
  #secret .rm { flex:1; display:grid; place-items:center; gap:4px; padding:10px 4px;
        border-radius:11px; background:var(--panel); border:1px solid var(--line);
        color:var(--line); }
  #secret .rm[data-gate] { color:var(--cinnabar);
        border-color:color-mix(in srgb, var(--cinnabar) 35%, transparent); }
  #secret .rm em { font-style:normal; font-size:10.5px; color:var(--faint);
        font-family:Rajdhani,sans-serif; font-weight:700; }
  #cave .cavetbl td .s { display:inline-block; vertical-align:-4px; color:var(--jade);
        margin-right:5px; }

  /* ── 提 the proposals: four content systems, drawn rather than described ── */
  #proposals h3 .built, #proposals h3 .todo { margin-left: 9px; padding:3px 9px; border-radius:99px;
        font-size:10px; letter-spacing:.1em; text-transform:uppercase; font-weight:700;
        vertical-align:middle; }
  #proposals h3 .built { color:#14110D; background:var(--jade); }
  #proposals h3 .todo { color:var(--faint); border:1px solid var(--line); }
  #proposals .mk { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
                   padding:15px; margin:14px 0 0; }
  #proposals .cap { margin:12px 0 0; font-size:13px; color:var(--faint); line-height:1.55; }
  #proposals .law { display:inline-block; margin:10px 8px 0 0; padding:3px 9px; border-radius:99px;
                    font-size:11.5px; color:var(--jade); border:1px solid var(--line);
                    background:rgba(95,220,255,.06); }
  #proposals .cost { font-family:Rajdhani,sans-serif; font-weight:700; color:var(--gold); }

  /* 洞天 three beds in a row */
  #proposals .cave .beds { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  #proposals .bed { text-align:center; padding:12px 6px; border-radius:11px;
                    border:1px solid var(--line); background:var(--panel); }
  #proposals .bed[data-ripe] { border-color:var(--gold); box-shadow:0 0 22px -10px var(--gold); }
  #proposals .bed .ring { position:relative; display:block; width:62px; height:62px; margin:0 auto 9px; }
  #proposals .bed .ring i { position:absolute; inset:0; border-radius:99px;
        background:conic-gradient(var(--c) var(--a), rgba(37,42,92,.55) 0); }
  #proposals .bed .ring i::after { content:''; position:absolute; inset:4px; border-radius:99px;
        background:var(--panel2); }
  #proposals .bed .ring em { position:absolute; inset:0; display:grid; place-items:center;
        color:var(--c); }
  #proposals .bed b { display:block; font-size:16px; font-weight:400; color:var(--c); }
  #proposals .bed i { display:block; font-style:normal; font-size:11.5px; color:var(--faint); }
  #proposals .bed .when { display:block; margin-top:6px; font-family:Rajdhani,sans-serif;
        font-weight:600; font-size:12.5px; color:var(--text); }

  /* 秘境 a path of rooms, and the two doors at the one you stand in */
  #proposals .secret .path { display:flex; align-items:center; margin:2px 0 16px; }
  #proposals .room { position:relative; flex:1; display:flex; align-items:center;
        justify-content:center; height:52px; }
  #proposals .room em { font-style:normal; color:var(--line); font-size:17px; }
  #proposals .room > svg, #proposals .room > em { position:relative; z-index:1;
        display:grid; place-items:center; width:44px; height:44px; border-radius:99px;
        background:var(--panel); border:1px solid var(--line); color:var(--line); }
  #proposals .room[data-done] > svg { color:var(--jade); border-color:rgba(95,220,255,.45); }
  /* 此 Where you stand: the one room on the path that is a decision right now. */
  #proposals .room[data-here] > svg { color:var(--gold); border-color:var(--gold);
        box-shadow:0 0 0 4px rgba(255,206,107,.12), 0 0 20px -6px var(--gold); }
  #proposals .room[data-last] > svg { color:var(--cinnabar); border-color:rgba(255,95,200,.5); }
  #proposals .room .link { position:absolute; left:50%; right:-50%; top:50%; height:2px;
        background:var(--line); }
  #proposals .room[data-done] .link { background:linear-gradient(90deg,
        rgba(95,220,255,.45), rgba(95,220,255,.22)); }
  #proposals .doors { display:grid; gap:8px; }
  @media(min-width:560px){ #proposals .doors { grid-template-columns:1fr 1fr; } }
  #proposals .door { display:flex; gap:11px; align-items:flex-start; padding:11px 12px;
        border:1px solid var(--line); border-radius:11px; background:var(--panel); }
  #proposals .door .s { flex:none; color:var(--jade); }
  #proposals .door b { font-size:17px; font-weight:400; color:var(--jade); }
  #proposals .door em { font-style:normal; font-size:13px; color:var(--text); }
  #proposals .door i { display:block; font-style:normal; margin-top:4px; font-size:12px;
        color:var(--faint); line-height:1.5; }

  /* 悟道 three cards, one taken */
  #proposals .awaken { display:grid; gap:9px; }
  @media(min-width:640px){ #proposals .awaken { grid-template-columns:repeat(3,1fr); } }
  #proposals .awaken .card { padding:14px 13px; border-radius:12px; background:var(--panel);
        border:1px solid var(--line); }
  #proposals .awaken .card[data-on] { border-color:var(--gold);
        box-shadow:0 0 26px -12px var(--gold); }
  #proposals .awaken .s { display:block; color:var(--jade); margin-bottom:8px; }
  #proposals .awaken .card[data-on] .s { color:var(--gold); }
  #proposals .awaken b { font-size:19px; font-weight:400; color:var(--jade); margin-right:7px; }
  #proposals .awaken .card[data-on] b { color:var(--gold); }
  #proposals .awaken em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
        font-size:14px; }
  #proposals .awaken i { display:block; font-style:normal; margin-top:7px; font-size:12.5px;
        color:var(--faint); line-height:1.55; }

  /* 緣 one small card, the way it would sit on a screen */
  #proposals .meet .card { display:flex; gap:12px; align-items:flex-start; padding:13px 14px;
        border-radius:13px; background:var(--panel); border:1px solid var(--jade); }
  #proposals .meet .s { flex:none; color:var(--jade); }
  #proposals .meet b { display:block; font-family:Rajdhani,sans-serif; font-weight:700; font-size:16px; }
  #proposals .meet b .cjk { color:var(--jade); font-weight:400; margin-right:5px; }
  #proposals .meet i { display:block; font-style:normal; margin-top:4px; font-size:12.5px;
        color:var(--faint); line-height:1.55; }
  #proposals .meet .picks { display:flex; gap:8px; margin-top:11px; }
  #proposals .meet .pick { padding:7px 13px; border-radius:9px; font-size:12.5px;
        background:var(--jade); color:#14110D; font-weight:600; }
  #proposals .meet .pick:last-child { background:none; color:var(--faint);
        border:1px solid var(--line); }

  /* ── 樣 the mockups: the real screens, drawn on the page ───────────────── */
  /* Every rule is scoped to the section. The first draft was not, and its .ladder
     collided with the realm-ladder cards further down the page, which is the same
     shared-class bug the save sheet had in the game, found twice in one day. */
  #mockups .mk { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
        padding:16px; }
  #mockups .mk .cap { margin:12px 0 0; font-size:13px; color:var(--faint); line-height:1.55; }
  /* 丹 The same two blocks the mockups use, borrowed by name for the cores section. */
  #cores .mk { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
               padding:16px; }
  #cores .mk.two { background:none; border:0; padding:0; display:grid; gap:14px; }
  @media(min-width:640px){ #cores .mk.two { grid-template-columns:1fr 1fr; } }
  #cores .cap { margin:0 0 8px; font-size:12.5px; color:var(--faint);
                font-family:Rajdhani,sans-serif; font-weight:700; letter-spacing:.06em;
                text-transform:uppercase; }
  #cores td, #cores th { padding:5px 6px; font-size:13px; }
  #cores .card em { display:block; margin-bottom:2px; }
  #cores td.hot { color:var(--cinnabar); font-family:Rajdhani,sans-serif; font-weight:700; }
  #mockups .mk.two { background:none; border:0; padding:0; display:grid; gap:10px; }
  @media(min-width:640px){ #mockups .mk.two { grid-template-columns:1fr 1fr; } }

  /* 梯 And the block itself has to say so: the page's own .ladder is a grid of
     realm cards, and scoping the children was not enough to stop it applying here. */
  #mockups .mk.ladder { display:block; }
  #mockups .ladder .lrow { display:flex; align-items:center; gap:10px; margin-bottom:9px; }
  #mockups .ladder .lab { flex:none; width:96px; font-size:11.5px; color:var(--faint);
                 font-family:Rajdhani,sans-serif; font-weight:700; }
  #mockups .ladder .realms { flex:1; display:flex; gap:5px; }
  #mockups .ladder .dot { flex:1; height:3px; border-radius:99px; background:var(--line); }
  #mockups .ladder .dot[data-done] { background:var(--c); opacity:.5; }
  #mockups .ladder .dot[data-here] { background:var(--c); height:5px; box-shadow:0 0 8px -1px var(--c); }
  #mockups .ladder .rungs { flex:1; display:flex; gap:3px; }
  #mockups .ladder .rung { flex:1; height:10px; border-radius:3px; background:var(--line);
                  overflow:hidden; }
  #mockups .ladder .rung i { display:block; height:100%; border-radius:2px; }
  #mockups .ladder .warden { flex:none; width:17px; color:var(--jade); }
  #mockups .ladder .warden svg { display:block; }

  /* 指 */
  #mockups .coach { display:flex; flex-direction:column; align-items:center; gap:8px; }
  #mockups .coach .arrow { width:34px; height:34px; display:grid; place-items:center;
                  border-radius:99px; background:rgba(6,8,18,.92);
                  border:1px solid rgba(95,220,255,.45); color:var(--jade);
                  box-shadow:0 0 14px -3px rgba(95,220,255,.8); }
  #mockups .coach .arrow svg { display:block; }
  #mockups .upg, #cores .upg { width:100%; max-width:360px; display:flex; align-items:center; gap:13px;
         padding:13px 14px; border-radius:11px; background:var(--panel);
         border:1px solid var(--line); }
  #mockups .upg.ringed, #cores .upg.ringed { box-shadow:0 0 0 2px var(--jade), 0 0 0 5px rgba(95,220,255,.14),
                           0 0 22px -4px rgba(95,220,255,.75); }
  #mockups .upg .ic, #cores .upg .ic { flex:none; width:26px; color:var(--jade); }
  #mockups .upg .ic svg, #cores .upg .ic svg { display:block; }
  #mockups .upg > span:nth-child(2), #cores .upg > span:nth-child(2) { flex:1; }
  #mockups .upg b, #cores .upg b { display:block; font-size:15px; font-weight:500; }
  #mockups .upg b em, #cores .upg b em { font-style:normal; font-size:13px; color:var(--faint); margin-left:4px; }
  #mockups .upg i, #cores .upg i { display:block; font-style:normal; font-size:12.5px; color:var(--faint); }
  #mockups .upg .price, #cores .upg .price { flex:none; font-family:Rajdhani,sans-serif; font-weight:700; font-size:16px;
                color:var(--gold); text-align:right; }
  #mockups .upg .price em, #cores .upg .price em { display:block; font-style:normal; font-size:10px; color:var(--faint);
                   font-weight:400; letter-spacing:.1em; text-transform:uppercase; }

  /* 時 */
  #mockups .gcard { background:linear-gradient(180deg,rgba(95,220,255,.09),rgba(95,220,255,.03));
           border:1px solid rgba(95,220,255,.33); border-radius:12px; padding:13px 15px; }
  #mockups .gcard.waiting { background:var(--panel); border-color:var(--line); }
  #mockups .gcard .n { font-size:10px; letter-spacing:.14em; text-transform:uppercase;
              color:var(--jade); font-family:Archivo,sans-serif; }
  #mockups .gcard.waiting .n { color:var(--faint); }
  #mockups .gcard b { display:block; margin-top:4px; font-size:15.5px; font-weight:500; }
  #mockups .gcard b .cjk { color:var(--jade); margin-right:4px; }
  #mockups .gcard.waiting b .cjk { color:var(--faint); }
  #mockups .gcard i { display:block; margin-top:5px; font-style:normal; font-size:12.5px;
             color:var(--faint); line-height:1.5; }
  #mockups .gcard .bar { display:block; height:4px; border-radius:99px; margin-top:9px;
                background:rgba(95,220,255,.2); overflow:hidden; }
  #mockups .gcard .bar i { display:block; height:100%; margin:0; background:var(--jade);
                  border-radius:99px; }

  /* 鑑 */
  #mockups .sheet2 .ihead { display:flex; gap:15px; align-items:center; }
  #mockups .sheet2 .ihead svg { display:block; flex:none; }
  #mockups .sheet2 .ihead b { display:block; font-size:24px; font-weight:400; line-height:1.15; }
  #mockups .sheet2 .ihead i { display:block; font-style:normal; font-size:15px; }
  #mockups .sheet2 .ihead em { display:block; margin-top:5px; font-style:normal; font-size:12px;
                      color:var(--faint); }
  #mockups .sheet2 .ranks { display:flex; align-items:center; gap:5px; margin-top:14px; }
  #mockups .sheet2 .rank { width:30px; height:30px; border-radius:8px; display:grid;
                  place-items:center; border:1px solid var(--line); color:var(--line); }
  #mockups .sheet2 .rank b { font-size:15px; font-weight:400; color:inherit; }
  #mockups .sheet2 .rank[data-on] { border-color:var(--c); color:var(--c);
                           box-shadow:0 0 12px -3px var(--c); }
  #mockups .sheet2 .rn { margin-left:8px; font-size:14px; }
  #mockups .sheet2 .rn i { display:block; font-style:normal; font-size:11px; color:var(--faint); }
  #mockups .sheet2 h4 { margin:16px 0 2px; font-family:Rajdhani,sans-serif; font-size:12px;
               color:var(--faint); letter-spacing:.1em; text-transform:uppercase; }
  #mockups .sheet2 .line { display:flex; align-items:center; gap:12px; padding:10px 0;
                  border-bottom:1px solid var(--line); }
  #mockups .sheet2 .line b { flex:none; min-width:26px; font-size:18px; font-weight:400;
                    color:var(--text); }
  #mockups .sheet2 .line .lab { flex:1; font-size:13.5px; }
  #mockups .sheet2 .line .vs { flex:none; display:flex; gap:7px; align-items:baseline; font-size:14px;
                      font-family:Rajdhani,sans-serif; font-weight:700; }
  #mockups .sheet2 .line .vs i, #mockups .sheet2 .line .vs em { font-style:normal; color:var(--faint);
                                              font-weight:400; }
  #mockups .sheet2 .line.up .vs b { color:var(--jade); }
  #mockups .sheet2 .line.down .vs b { color:var(--cinnabar); }
  #mockups .sheet2 .verd { display:flex; gap:9px; margin-top:16px; }
  #mockups .sheet2 .sw { flex:1; background:var(--panel); border:1px solid var(--line);
                border-radius:11px; padding:13px 10px; text-align:center; }
  #mockups .sheet2 .sw b { display:block; font-size:17px; font-weight:400; color:var(--faint); }
  #mockups .sheet2 .sw em { display:block; margin-top:3px; font-style:normal; font-size:17px;
                   font-family:Rajdhani,sans-serif; font-weight:700; color:var(--jade); }
  #mockups .sheet2 .sw i { display:block; margin-top:3px; font-style:normal; font-size:10px;
                  letter-spacing:.08em; text-transform:uppercase; color:var(--faint); }

  /* 圍 */
  #mockups .drive .size { display:flex; align-items:center; gap:13px; padding:13px 14px;
                 border-radius:11px; background:var(--panel); border:1px solid var(--line);
                 margin-bottom:8px; }
  #mockups .drive .size .n { flex:none; min-width:44px; font-size:21px; color:var(--jade);
                    font-family:Rajdhani,sans-serif; font-weight:700; }
  #mockups .drive .size .what { flex:1; }
  #mockups .drive .size .what b { display:block; font-size:14.5px; font-weight:500; }
  #mockups .drive .size .what i { display:block; font-style:normal; font-size:12px; color:var(--faint); }
  #mockups .drive .size .price { flex:none; text-align:right; font-family:Rajdhani,sans-serif;
                        font-weight:700; font-size:15px; color:var(--gold); }
  #mockups .drive .size .price em { display:block; font-style:normal; font-size:10px;
                           color:var(--faint); font-weight:400; letter-spacing:.1em;
                           text-transform:uppercase; }

  /* 半 the two halves of 道, and 點 the count on the tab bar */
  #mockups .halfbar { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:4px;
              background:var(--panel2); border:1px solid var(--line); border-radius:11px; }
  #mockups .halfbar > span { display:flex; align-items:center; justify-content:center;
              gap:7px; padding:10px 6px; border-radius:8px; color:var(--faint); }
  #mockups .halfbar > span[data-on] { background:var(--panel); color:var(--ink);
              box-shadow:inset 0 0 0 1px var(--line); }
  #mockups .halfbar b { font-size:17px; font-weight:400; }
  #mockups .halfbar > span[data-on] b { color:var(--jade); }
  #mockups .halfbar em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
              font-size:13px; }
  #mockups .halfbar .pip { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
              font-size:11px; color:#14110D; background:var(--gold); border-radius:99px;
              padding:3px 6px; }
  #mockups .tabbar { display:grid; grid-template-columns:repeat(5,1fr);
              background:var(--panel2); border:1px solid var(--line); border-radius:11px;
              padding:9px 0 11px; }
  #mockups .tabbar > span { display:flex; flex-direction:column; align-items:center; gap:3px;
              color:var(--faint); }
  #mockups .tabbar > span[data-on] { color:var(--jade); }
  #mockups .tabbar b { position:relative; font-size:19px; font-weight:400; line-height:1.1; }
  #mockups .tabbar u { position:absolute; left:100%; bottom:55%; transform:translateX(-3px);
              text-decoration:none; font-family:Rajdhani,sans-serif; font-weight:700;
              font-size:10px; line-height:1; color:#14110D; background:var(--gold);
              border-radius:99px; padding:2.5px 5px; }
  #mockups .tabbar i { font-style:normal; font-size:9.5px; letter-spacing:.16em;
              text-transform:uppercase; }

  /* 凝丹 the card that appears only when 材 runs out */
  #mockups .mk.cond { border-color:var(--cinnabar); }
  #mockups .cond .chd { display:flex; align-items:center; gap:11px; }
  #mockups .cond .chd b { font-size:23px; font-weight:400; color:var(--cinnabar); }
  #mockups .cond .chd em { display:block; font-style:normal; font-family:Rajdhani,sans-serif;
              font-weight:700; font-size:16px; }
  #mockups .cond .chd i { font-style:normal; font-size:12.5px; color:var(--faint); }
  #mockups .cond .body { margin:9px 0 12px; font-size:13.5px; color:var(--faint);
              line-height:1.6; }
  #mockups .cond .go { display:block; text-align:center; background:var(--cinnabar);
              color:#14110D; border-radius:8px; padding:12px; font-size:15px;
              font-family:Rajdhani,sans-serif; font-weight:700; letter-spacing:.06em;
              text-transform:uppercase; }
  #mockups .cond .hint { display:flex; gap:11px; align-items:flex-start; margin-top:10px;
              background:color-mix(in srgb, var(--gold) 10%, var(--panel));
              border:1px solid var(--gold); border-radius:11px; padding:11px 13px;
              font-size:13px; line-height:1.5; }
  #mockups .cond .hint b { flex:none; font-size:17px; font-weight:400; color:var(--gold); }

  /* 境外 the heaven card */
  #mockups .mk.hcard { border-color:var(--hue); }
  #mockups .hcard .hh { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  #mockups .hcard .hn b { font-size:23px; font-weight:400; color:var(--hue); }
  #mockups .hcard .hn em { font-style:normal; font-family:Rajdhani,sans-serif;
                           font-weight:700; font-size:16px; margin-left:8px; }
  #mockups .hcard .hm { text-align:right; flex:none; }
  #mockups .hcard .hm b { display:block; font-family:Rajdhani,sans-serif; font-weight:700;
                          font-size:22px; color:var(--hue); }
  #mockups .hcard .hm i { font-style:normal; font-size:10px; letter-spacing:.1em;
                          text-transform:uppercase; color:var(--faint); }
  #mockups .hcard .hgain { margin:8px 0 0; font-size:14px; }
  #mockups .hcard .hroom { margin:6px 0 0; font-size:13px; color:var(--hue);
                           font-family:Rajdhani,sans-serif; font-weight:700; }
  #mockups .hcard .hnx { display:flex; gap:12px; align-items:center; margin-top:13px;
                         padding-top:13px; border-top:1px solid var(--line); }
  #mockups .hcard .hic { flex:none; }
  #mockups .hcard .hic svg { display:block; }
  #mockups .hcard .hnx em { display:block; font-style:normal; font-family:Rajdhani,sans-serif;
                            font-weight:700; font-size:13px; color:var(--faint);
                            letter-spacing:.06em; text-transform:uppercase; }
  #mockups .hcard .hnx i { display:block; font-style:normal; font-size:14px; margin-top:2px; }

  /* 出 the beasts still to come */
  #mockups .coming2 { background:none; border:0; padding:0; }
  #mockups .crow { display:flex; align-items:center; gap:12px; padding:11px 13px;
                   background:var(--panel2); border:1px dashed var(--line);
                   border-radius:11px; margin-bottom:7px; opacity:.75; }
  #mockups .crow .cic { flex:none; }
  #mockups .crow .cic svg { display:block; }
  #mockups .crow .cn { flex:1; }
  #mockups .crow .cn b { display:block; font-size:16px; font-weight:400; }
  #mockups .crow .cn i { font-style:normal; font-size:12.5px; color:var(--faint); }
  #mockups .crow .cl { flex:none; font-size:12px; color:var(--faint);
                       font-family:Rajdhani,sans-serif; font-weight:700; }

  /* 收 */
  #mockups .corner { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
            padding:16px; }
  #mockups .corner .sw1 { display:grid; place-items:center; width:28px; height:28px; margin-left:auto;
                 border-radius:8px; background:var(--panel); border:1px solid var(--line);
                 color:var(--faint); }
  #mockups .corner .menu { margin-left:auto; max-width:230px; padding:5px; background:var(--ground);
                  border:1px solid var(--line); border-radius:11px; }
  #mockups .corner .menu span { display:flex; align-items:center; gap:11px; padding:9px; }
  #mockups .corner .menu b { flex:none; width:22px; text-align:center; font-size:16px;
                    font-weight:400; color:var(--jade); }
  #mockups .corner .menu i { font-style:normal; font-size:13.5px; }
  #mockups .corner .cap { margin:12px 0 0; font-size:13px; color:var(--faint); }

  .toc { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px;
         margin-top:22px; }
  .toc a { display:flex; align-items:baseline; gap:8px; text-decoration:none;
           background:var(--panel2); border:1px solid var(--line); border-radius:10px;
           padding:9px 12px; color:var(--text); font-size:14px; }
  .toc a b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:18px;
             color:var(--jade); }

  .board { display:grid; gap:6px; }
  .srow { display:flex; gap:12px; align-items:flex-start; background:var(--panel2);
          border:1px solid var(--line); border-left:3px solid var(--hue);
          border-radius:10px; padding:10px 13px; }
  .srow .st { flex:none; width:56px; text-align:center; color:var(--hue); }
  .srow .st b { display:block; font-size:19px; font-weight:400; }
  .srow .st i { font-style:normal; font-size:9.5px; letter-spacing:.11em;
                text-transform:uppercase; font-family:Archivo,sans-serif; }
  .srow .body b { font-size:17px; color:var(--hue); }
  .srow .body em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
                   font-size:17px; }
  .srow .body em a { text-decoration:none; }
  .srow .body i { font-style:normal; display:block; font-size:13.5px; color:var(--faint); }

  /* 幅 A table is the one thing on this page allowed to be wider than the phone, and
     only inside its own scroller. Read on a 400px screen the wide ones used to push the
     whole page sideways, which moves every paragraph with them. */
  table { border-collapse:collapse; width:100%; font-size:14px; display:block;
          overflow-x:auto; }
  @media(min-width:560px){ table { display:table; } }
  table tr { display:table; width:100%; table-layout:fixed; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:7px 8px; }
  td b { color:var(--hue,var(--jade)); font-size:16px; font-weight:400; }
  td i { font-style:normal; color:var(--faint); }
  td.n { font-family:Rajdhani,sans-serif; font-weight:700; text-align:right;
         color:var(--gold); }

  .cards { display:grid; gap:8px; }
  @media(min-width:640px){ .cards.two { grid-template-columns:1fr 1fr; }
                           .cards.three { grid-template-columns:repeat(3,1fr); } }
  .card { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
          padding:12px 14px; }
  .card > b { color:var(--hue,var(--jade)); font-size:18px; font-weight:400; }
  .card em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
             font-size:16px; }
  .pills { display:flex; flex-wrap:wrap; gap:6px; }
  .pill { display:inline-flex; flex-direction:column; align-items:center;
          background:var(--panel); border:1px solid var(--line); border-radius:9px;
          padding:6px 12px; }
  .pill b { font-family:Rajdhani,sans-serif; font-weight:700; font-size:17px; color:var(--gold); }
  .pill i { font-style:normal; font-size:10.5px; color:var(--faint); }

  .ladder { display:grid; grid-template-columns:repeat(auto-fit,minmax(78px,1fr)); gap:7px; }
  .rung { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
          padding:7px 5px 8px; text-align:center; position:relative; }
  .rung .fig { display:block; width:100%; aspect-ratio:1; }
  .rung .fig svg { display:block; width:100%; height:100%; }
  .rung b { display:block; font-size:14px; color:var(--hue); }
  .rung i { font-style:normal; font-size:9px; color:var(--faint); display:block; }
  .rung .no { position:absolute; top:4px; left:6px; font-family:Rajdhani,sans-serif;
              font-weight:700; font-size:10px; color:var(--hue); }

  .rows { display:grid; gap:6px; }
  .row { display:flex; gap:11px; align-items:flex-start; background:var(--panel2);
         border:1px solid var(--line); border-left:3px solid var(--hue,var(--line));
         border-radius:10px; padding:9px 12px; }
  .row .ic { flex:none; color:var(--hue,var(--jade)); display:grid; place-items:center; }
  .row .ic svg { display:block; }
  .row b { font-size:17px; color:var(--hue,var(--jade)); font-weight:400; }
  .row em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700; font-size:16px; }
  .row i { font-style:normal; display:block; font-size:13px; color:var(--faint); }
  .row .body { flex:1; }

  .node { border-top:1px solid var(--line); padding:6px 0 5px; }
  .node b { font-size:15px; color:var(--hue); }
  .node em { font-size:14px; }
  .node i { font-style:normal; display:block; font-size:12px; color:var(--faint); }
  .node.key { border-left:2px solid var(--gold); padding-left:8px; }
  .node.key b { color:var(--gold); }

  .beastgrid { display:grid; grid-template-columns:repeat(9,1fr); gap:4px; }
  .col { background:var(--panel2); border:1px solid var(--line); border-radius:8px;
         padding:15px 2px 6px; display:flex; flex-direction:column; align-items:center;
         gap:2px; position:relative; }
  .col .no { position:absolute; top:3px; left:0; right:0; text-align:center;
             font-family:Rajdhani,sans-serif; font-weight:700; font-size:9px; color:var(--hue); }
  .bst { color:var(--hue); opacity:.55; display:grid; place-items:center; }
  .bst svg { display:block; }
  .bst.w { opacity:1; filter:drop-shadow(0 0 6px var(--hue)); }
  .bn { font-style:normal; font-family:'Noto Serif SC',serif; font-size:9px;
        color:var(--faint); margin-bottom:3px; }

  .stage { position:relative; height:180px; border:1px solid var(--line); border-radius:12px;
           overflow:hidden; }
  .stage .sc, .stage .sc svg { position:absolute; inset:0; width:100%; height:100%; }
  .duel { position:absolute; inset:0; display:grid; grid-template-columns:1fr 54px 1fr;
          align-items:end; padding:0 18px 22px; }
  .duel span { display:grid; place-items:center; }
  .duel .you { width:82px; height:82px; justify-self:center; }
  .duel .you svg { width:100%; height:100%; }
  .duel .foe { color:var(--cinnabar); justify-self:center; margin-bottom:12px; }
  .duel .mid { color:var(--jade); font-size:19px; margin-bottom:30px;
               text-shadow:0 0 14px currentColor; }

  .lin { display:flex; flex-wrap:wrap; gap:8px 12px; }
  .lin span { display:inline-flex; align-items:baseline; gap:5px; font-size:11.5px; }
  .lin b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:16px; }
  .lin i { font-style:normal; color:var(--faint); }

  .items { background:var(--panel2); border:1px solid var(--line);
           border-left:3px solid var(--hue); border-radius:10px; padding:10px 13px; }
  .items summary { cursor:pointer; display:flex; gap:9px; align-items:baseline; }
  .items summary b { font-size:18px; font-weight:400; }
  .items summary em { font-style:normal; font-family:Rajdhani,sans-serif;
                      font-weight:700; font-size:16px; }
  .items summary i { font-style:normal; color:var(--faint); font-size:12.5px;
                     margin-left:auto; }
  .items .lin { margin-top:10px; }

  .rule { border-left:3px solid var(--jade); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; }
  .rule b { color:var(--jade); }
  .warn { border-left:3px solid var(--cinnabar); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; }
  .warn b { color:var(--cinnabar); }

  .where { display:grid; gap:7px; }
  .where a { display:flex; gap:11px; align-items:flex-start; text-decoration:none;
             background:var(--panel2); border:1px solid var(--line); border-radius:11px;
             padding:12px 14px; color:var(--text); }
  .where a b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:21px;
               color:var(--jade); flex:none; }
  .where a em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
                font-size:16px; display:block; }
  .where a i { font-style:normal; font-size:13px; color:var(--faint); }

  /* 畫 The paintings, shown as themselves. Every name here is scoped to #paint,
     because .cell, .strip and .pair are exactly the names a second screen would want,
     and a class shared between two screens has cost this repository a session twice. */
  #paint .strip { display:grid; gap:10px; margin:12px 0 20px;
                  grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); }
  #paint .strip.wide { grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); }
  #paint .strip.tall { grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); }
  #paint .cell { display:block; text-align:center; min-width:0; }
  #paint .cell .pic { display:block; width:100%; aspect-ratio:1/1; object-fit:cover;
                      border-radius:8px; border:1px solid var(--line);
                      background:var(--panel2); }
  #paint .strip.wide .cell .pic { aspect-ratio:16/9; }
  #paint .strip.tall .cell .pic { aspect-ratio:3/4; }
  #paint .strip.alpha .cell .pic { object-fit:contain; }
  #paint .cell .gap { opacity:.35; }
  #paint .cell b { display:block; font-size:13px; margin-top:6px; line-height:1.2; }
  #paint .cell i { display:block; font-style:normal; font-size:11px; line-height:1.3;
                   color:var(--faint); }
  #paint .pair { display:grid; grid-template-columns:1fr 1fr; gap:16px;
                 max-width:400px; margin:14px 0 20px; }
  #paint .pair span { display:block; text-align:center; min-width:0; }
  #paint .pair img { display:block; width:100%; aspect-ratio:1/1; object-fit:contain; }
  #paint .pair .round img { border-radius:50%; background:var(--panel2);
                            border:1px solid var(--line); object-fit:cover; }
  #paint .pair em { display:block; font-style:normal; font-size:12.5px; margin-top:8px; }
  #paint .pair i { display:block; font-style:normal; font-size:11.5px; color:var(--faint); }

  /* 問 The three questions: a bar in a table cell, and the row that is the top. */
  #questions .wk { display:block; height:7px; border-radius:99px; background:var(--line);
                   overflow:hidden; min-width:90px; }
  #questions .wk i { display:block; height:100%; border-radius:99px; background:var(--jade); }
  #questions table.live td:last-child { width:45%; }
  #questions table.worth td, #questions table.worth th { padding:5px 6px; font-size:13px; }
  #questions tr.last td { border-top:2px solid var(--gold); }
  #questions .row em { display:block; }

  /* 鬥 The arena, photographed before and drawn after, side by side. */
  #paint .shots { display:grid; gap:12px; margin:14px 0 6px; }
  @media(min-width:640px){ #paint .shots { grid-template-columns:1fr 1fr; } }
  #paint .shots figure { margin:0; }
  #paint .shots img { display:block; width:100%; border-radius:10px;
                      border:1px solid var(--line); }
  #paint .shots figcaption { margin-top:8px; font-size:13px; color:var(--faint);
                             line-height:1.5; }
  #paint .shots b { color:var(--text); font-weight:600; }

  ${PLATE_CSS}
</style>

<div class="sheet">
  <header>
    <h1>九境</h1>
    <p class="lead"><b>Ninefold.</b> An idle cultivation game. Qi gathers on its own, with
      the phone closed. Nine realms, about <b class="big">${TARGET_DAYS} days</b> to the
      top, and no end after that.</p>
    <p class="t" style="margin-top:10px">This is the one page to read. Everything the game
      has is in it, in the order you would ask about it, and every number and name below
      is read straight out of the game's own code. <b>It is a living document:</b> the
      board underneath says what is finished and what is not, and closing a system means
      moving its row and writing its section.</p>
    <div class="toc">
      <a href="#resumo"><b>簡</b> Em português</a>
      <a href="#board"><b>狀</b> Where we are</a>
      <a href="#mockups"><b>樣</b> What it looks like</a>
      <a href="#paint"><b>畫</b> The paintings</a>
      <a href="#newplayer"><b>審</b> Read as a new player</a>
      <a href="#questions"><b>問</b> Three questions</a>
      <a href="#where"><b>包</b> Where to play</a>
      <a href="#loop"><b>環</b> How it is played</a>
      <a href="#opens"><b>開</b> What each realm opens</a>
      <a href="#habits"><b>勤</b> Playing vs waiting</a>
      <a href="#wall"><b>守貢</b> The wall</a>
      <a href="#read"><b>診</b> Reading a save</a>
      <a href="#wait"><b>待</b> Prices you cannot pay</a>
      <a href="#huntlist"><b>狩</b> The 98% screen</a>
      <a href="#rate"><b>氣</b> Why the rate moves</a>
      <a href="#cores"><b>丹</b> The coin the hunting paid</a>
      <a href="#salvage"><b>拆</b> Melting gear</a>
      <a href="#idle"><b>閒</b> Where the qi goes</a>
      <a href="#heavens"><b>境外</b> Beyond the ninth</a>
      <a href="#week"><b>期</b> The week</a>
      <a href="#clock"><b>曆</b> The content clock</a>
      <a href="#ladder"><b>階</b> The ladder</a>
      <a href="#cap"><b>上限</b> The cap</a>
      <a href="#qi"><b>氣</b> Qi</a>
      <a href="#realms"><b>境</b> The realms</a>
      <a href="#beasts"><b>狩</b> The beasts</a>
      <a href="#seen"><b>見</b> First sight</a>
      <a href="#record"><b>錄</b> The record</a>
      <a href="#combat"><b>戰</b> Combat</a>
      <a href="#build"><b>勢</b> The build</a>
      <a href="#gear"><b>器</b> Gear</a>
      <a href="#refine"><b>煉器</b> Refining</a>
      <a href="#tree"><b>道</b> The tree</a>
      <a href="#tower"><b>塔</b> The tower</a>
      <a href="#furnace"><b>爐</b> The furnace</a>
      <a href="#top"><b>劫</b> The top</a>
      <a href="#stele"><b>碑</b> The stele</a>
      <a href="#save"><b>存</b> The save</a>
      <a href="#audit"><b>氣查</b> The audit of the qi</a>
      <a href="#rules"><b>律</b> The rules</a>
    </div>
  </header>

  <section class="sec resumo" id="resumo">
    <h2><span class="h">簡</span> Em duas páginas, em português</h2>
    <p class="t"><b>Esta página é para o Bruno.</b> Tudo o resto na bíblia está em inglês
      porque o jogo e o código estão em inglês; isto está aqui porque a pergunta
      <i>"não sei bem o que temos e se está tudo funcional"</i> merece uma resposta curta
      antes das quarenta e tal secções que explicam porquê.</p>

    <h3>O que é o jogo</h3>
    <p class="t">Um jogo <b>idle</b> de cultivo, para telemóvel, ao alto, com uma mão. O qi
      sobe sozinho, com a app fechada, sempre, sem exceção. Gasta-se em quatro coisas que
      multiplicam e nunca se perdem. Nove reinos, cada um com nove degraus, e no fim de
      cada um está uma besta que tem de cair para se avançar. Acima do nono reino há mais
      nove <b>céus</b>, e depois disso não acaba.</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">氣</b> <em>Juntar</em>
        <i>Sozinho, com o telemóvel fechado. Nunca se perde nada por se estar ausente.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">修</b> <em>Gastar</em>
        <i>劍訣 poder · 功法 e 吐納 velocidade · 妖丹 núcleos, que só o 材 material compra.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">狩</b> <em>Caçar</em>
        <i>Perder não custa nada, nunca. As bestas dão 材 material e deixam cair equipamento.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">突破</b> <em>Passar de reino</em>
        <i>Oito degraus enchem o reino e o warden é o nono. O qi que tiveres vem contigo.</i></span></div>
    </div>

    <h3>O que já lá está</h3>
    <div class="cards two">
      <div class="card"><em>Sistemas</em>
        <p class="t" style="margin-top:6px"><b>${CLOSED}</b> fechados, <b>${OPEN}</b> abertos,
        <b>${PLANNED}</b> planeado. Um sistema só conta como fechado quando está construído,
        medido por um teste e escrito nesta página.</p></div>
      <div class="card"><em>Conteúdo</em>
        <p class="t" style="margin-top:6px">${REALMS.length} reinos · ${HEAVENS.length} céus ·
        ${BEASTS.length} bestas e ${HEAVENS.length} Dragões com nome · ${STANCES.length} posturas ·
        ${ARTS.length} artes · ${GEAR.length} peças de equipamento · ${ALL_NODES.length} nós na
        árvore · 27 pílulas · ${DEEDS.length} feitos.</p></div>
    </div>

    <h3>Quanto tempo dá</h3>
    <table>
      <tr><th>como se joga</th><th style="text-align:right">chega ao 9.º reino</th>
          <th style="text-align:right">acaba a subida</th></tr>
      ${RUNS.map((r) => `<tr><td style="white-space:nowrap">${HABIT_PT[r.habit.name] ?? r.habit.name}<br>
        <i style="font-style:normal;opacity:.45;font-size:11px">${r.habit.name}</i></td>
        <td style="text-align:right">${(r.arrival[8] ?? 0).toFixed(0)} dias</td>
        <td style="text-align:right">${r.days.toFixed(0)} dias</td></tr>`).join('')}
    </table>
    <p class="t">Depois disso abrem-se os nove céus, um a cada três travessias. Para quem
      joga com regularidade, o <b>último nome novo do jogo chega ao dia ${CLOCK_LAST}</b>.
      Três meses são o dia 91. Nas semanas entre um céu e o seguinte o 期 muda na mesma,
      todas as segundas-feiras.</p>

    <h3>O que mudou com a auditoria</h3>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">審</b> <em>Lido como um jogador novo</em>
        <i>Cada ecrã, do primeiro minuto ao topo. Um cartão vermelho a dizer "sem material"
        no primeiro minuto, "3 bestas ao alcance" quando nenhuma se podia vencer, "degrau"
        num sítio e "camada" no outro. Tudo corrigido, e os números que o texto diz passaram
        a ser testados contra o jogo.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">塔</b> <em>Recompensas mal ditas</em>
        <i>No topo, a torre mostrava ${TOWER.share} do material que pagava. O 圍 não pagava
        o qi da presa da semana, e a arena não dizia quando esse qi chegava.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">雷池</b> <em>A cultivadora volta ao topo</em>
        <i>No topo, o retrato dava lugar a um trapézio liso. Agora ela está sentada no meio do
        lago de trovão, que enche à volta dela.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">渡劫</b> <em>A nona pintura estava rasgada</em>
        <i>Recortada, era uma cabeça e dois farrapos. Foi repintada inteira, nas duas figuras,
        com a oitava como referência para a cara.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">悟道</b> <em>As cartas dos céus estão pintadas</em>
        <i>As ${HEAVEN_CARDS.length * 3} cartas que eram pictogramas, três céus por folha, cada linha na
        cor do seu céu. As ${ALL_CARDS.length} cartas do jogo estão todas pintadas.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">鬥</b> <em>A arena acaba o combate</em>
        <i>A besta vencida cai em tinta, cada golpe atira tinta, a vitória tem anéis de luz e
        o que se ganhou aparece em fichas.</i></span></div>
    </div>

    <h3>Está tudo funcional?</h3>
    <div class="rule"><b>Sim, e há dois comandos que o confirmam.</b> <code>npm run smoke</code>
      abre o jogo construído num browser a sério, em seis profundidades. Visita todos os
      separadores e abre o canto e os painéis atrás dele. Falha se alguma coisa rebentar,
      não desenhar nada, ou mostrar <code>NaN</code> ao jogador. A última vez que
      correu: <b>todos os ecrãs abriram e nada estava partido</b>.</p>
      <p class="t" style="margin-top:8px">E <code>npm run actions</code> é a outra metade
      da pergunta, que é a que interessa antes de outra pessoa jogar: <b>carrega nas
      coisas</b>. Comprar, lutar, perder, vestir, derreter, fundir, refinar, destilar.
      Subir a torre, aprender um nó, tomar uma postura, fazer um 圍. Derrubar um warden,
      passar de reino, atravessar o 劫, copiar o save para fora. Cada acto verifica o
      <em>save</em> e não os pixels. Um botão que acende e não faz nada passa no smoke e
      falha aqui. Última vez: <b>os dezasseis actos fizeram o que existem para fazer</b>.
      Ao lado disso correm <b>${TESTS} testes</b>, dos quais um atira dez mil saves
      estragados ao <code>validate()</code> e outro seiscentos e setenta e dois
      dirigidos, campo a campo.</div>

    <h3>O que falta decidir</h3>
    <p class="t">Nada está a meio. A única linha do quadro que não está fechada é
      <b>轉世 Rebirth</b>, e está marcada como <em>planeada</em> só para a decisão ficar
      escrita: 九境 é puramente vertical, nada faz reset, e todas as barras só sobem.</p>
  </section>

  <section class="sec" id="mockups">
    <h2><span class="h">樣</span> What it looks like</h2>
    <p class="t">A standing rule, and Bruno's words for it: <i>"faz um mockup visual
      sempre com exemplos quando se altera algo relacionado com aspecto/arte."</i> So
      every screen that changed is drawn here rather than described. It uses the game's
      own art functions and its own tables, and where there is a number it is the number
      the game would actually show. A mockup assembled from invented values is a drawing of
      something that does not exist.</p>

    <h3>梯 The climb, drawn</h3>
    <p class="t">"layer 5 of 9" and "realm 5 of 9" were two numbers at opposite ends of
      the screen, and nothing on it ever said that one was <b>inside</b> the other. They
      are one object now, under the live bar, with the warden lit at the end of the rungs
      only when it is actually standing there.</p>
    ${MOCK_LADDER}

    <h3>指 The pointing finger</h3>
    <p class="t">The guide used to describe the button. It now draws a ring on it. The
      whole overlay is <b>inert to the touch</b>. The ring is over the button and the
      button still takes the tap, which is the one thing a coach mark must never get
      wrong. It waits a beat before scrolling, so the card is read before the screen
      moves, and it sits at the empty right-hand end of a wide target rather than over
      the sentence above it.</p>
    ${MOCK_COACH}

    <h3>時 A step you cannot do yet</h3>
    <p class="t">The second step asked for a kill that is not winnable for the first few
      minutes of the game, and asked for it anyway: a ring pulsing on a fight with no
      winning seed in it. A step that is not possible is now the <b>next</b> step: the
      same step, a quieter card, a bar showing how close, and a line handing over
      something to do in the meantime.</p>
    ${MOCK_GUIDE}

    <h3>鑑 Reading a piece of gear</h3>
    <p class="t">Tapping a piece in the chest <b>wore it</b>, so there was never a moment
      in which a player could look at it. The numbers below are not illustrative. They
      are ${templateOf(MOCK_HELD).name} against ${templateOf(MOCK_WORN).name}, run through
      the same comparison the game runs. The two figures at the bottom are
      <code>power()</code> and <code>rate()</code> with the piece put on in a copy of the
      save. Both sides of the trade appear, including the 破 line it loses.</p>
    ${MOCK_ITEM}

    <h3>圍 The drive</h3>
    <p class="t">${MARKS[2] * BEASTS.length} taps to finish the record, and the most
      played cultivator we model reaches eight beasts of ${BEASTS.length}. A beast you
      have 熟 Known can be driven instead: ${DRIVE_SIZES.join(', ')} kills in one tap,
      paid for in qi, which is also the exchange the economy never had.</p>
    ${MOCK_DRIVE}

    <h3>半 Finding the tree</h3>
    <p class="t">Bruno, standing in the fifth realm with ${daoFree(
      layersOpened({ ...newState(0), realm: 5, layer: 4 } as State), 4, ['root'], 0)} 道
      unspent: <i>"não encontro o tree/path function estou confuso."</i> He was not
      missing it. The 道 tab opened on a stance picker, nine sequence slots and an art
      pool, and the tree's first node began about fourteen hundred pixels down. A tab
      called Path whose first screenful contains no path. Two halves and a switch, tree
      first, and the unspent count moved onto the tab bar where it is visible from
      anywhere.</p>
    ${MOCK_HALVES}

    <h3>凝丹 The way out of the only dead end</h3>
    <p class="t">The wall below needs an escape hatch or it is not a wall, it is a stop.
      This is it, and it is drawn only at the moment it is an answer: 材 material at
      zero, a 妖丹 still to be had, and a warden that will not fall without one.</p>
    ${MOCK_CONDENSE}

    <h3>境外 The card above the summit</h3>
    <p class="t">Forty crossings against one animal called 龍 was the endgame. This is
      what stands in its place: the heaven you are in, what it opened, and the next one
      with its own Dragon already drawn. The whole card is read out of heavens.ts:
      the name, the colour, the count of crossings, and which animal the icon is.</p>
    ${MOCK_HEAVEN}

    <h3>出 Beasts still to come</h3>
    <p class="t">A realm's three commons now walk out at layers ${COMMON_LAYERS.join(', ')}
      rather than all at once. The ones that have not arrived are <b>shown</b> rather than
      hidden, dimmed and dashed with the layer that brings them. It is the same argument
      as a locked tab, for the same reason: you cannot look forward to a thing you have
      never seen.</p>
    ${MOCK_COMING}

    <h3>收 The corner</h3>
    <p class="t">Five bare characters floating over the corner of a screen that is already
      teaching characters is five unanswered questions at once. One button, and every row
      arrives with its name in English.</p>
    ${MOCK_MENU}
  </section>

  <section class="sec" id="newplayer">
    <h2><span class="h">審</span> Read as a new player</h2>
    <p class="t">Every screen, from a brand new save to the ninth heaven, read by somebody
      who has never seen the game, at 400 and at 320 wide. The harnesses were all green
      before it started, which is the point of doing it: none of what follows was a thing
      any of them could see.</p>
    <table>
      <tr><th>where</th><th>what a new player read</th><th>what it says now</th></tr>
      <tr><td>修, minute one</td><td>A red card under the boxes: <i>No 材 material left</i>, before anything had ever been killed</td><td>Nothing, until the first kill. Then <i>Not enough 材 material</i></td></tr>
      <tr><td>狩, minute one</td><td><i>3 beasts within reach</i>, over three rows that each said ×2.4, ×7 and ×14 <i>needed</i></td><td><i>3 beasts to hunt · 0 you can beat now</i>, and ×2.4 <i>stronger</i></td></tr>
      <tr><td>修, the ladder</td><td>The widget said <i>layer 4/9</i>, the sentence beside it said <i>rung</i></td><td><i>layer</i>, everywhere the player reads it</td></tr>
      <tr><td>引 the help</td><td><i>The button beside this one</i>, and there has been no button beside it since the menu folded</td><td>Where the Menu is, and that a dotted character answers a tap</td></tr>
      <tr><td>器 refining</td><td><i>+12 material</i> on a price</td><td><i>12 material</i></td></tr>
      <tr><td>器 the chest</td><td><i>靈 2 lines · 天 5</i></td><td><i>A 靈 piece carries 2 lines and a 天 piece 5</i></td></tr>
      <tr><td>道 the tree</td><td><i>6 free · 0/6</i>, and names at 8px and 40%</td><td><i>6 to spend · 0 of 6 spent</i>, names at 9.5px, forks further apart</td></tr>
      <tr><td>秘境 the key</td><td><i>Seven rooms</i>, with eleven on the door at the summit</td><td>A row of rooms, no count</td></tr>
      <tr><td>爐 at the summit</td><td>Every pill greyed, both prices in gold, nothing saying which was short</td><td>A qi price in red, and a line saying so</td></tr>
      <tr><td>洞天 the cave</td><td>The week's herb only as a chip inside the seed list, saying <i>3d left</i></td><td><i>青苔 Spirit Moss is in season: a bed of it pays half again</i>, over the beds</td></tr>
      <tr><td>緣, 秘境, 洞天</td><td>Two monospace fonts the page never loads, so the phone's own</td><td>The game's own fonts</td></tr>
    </table>
    <div class="rule"><b>實 And the numbers the prose says are tested now.</b> Eight hundred qi,
      +8% a core, three rats, ten kills, a quarter of an hour, two days, seventeen choices.
      Each sentence that names a number is held to the constant it names. The day the
      number moves, the sentence fails a test instead of lying on a phone.</div>

    <h3>塔 圍 Two rewards paid in silence</h3>
    <p class="t">The tower card and the arena worked out a floor's material for themselves,
      as the table times the seals, and the save was credited the record and the cards on
      top. At the summit the audit photographed, the card quoted <b>${num(TOWER.quoted)}</b>
      材 for a floor that paid <b>${num(TOWER.paid)}</b>: ${TOWER.share} of it.
      <code>floorMaterial</code> is the one function all three read now. And 圍 the drive,
      which promises to pay exactly what the taps would have, swallowed the week's
      first-kill qi on the quarry and kept paying the 熟 rate after 通 landed mid-drive. Both
      have tests that fail on the old code.</p>

    <h3>畫 The art the audit asked for, and got</h3>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">渡劫</b> <em>The ninth cultivator, both figures</em>
        <i>The panel had been asked for "half of it left as bare paper", and on a dark screen
        that cut to a head and two scraps. It was asked again on a leaf of its own, with the
        eighth attached for the face, and came back whole.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">悟道</b> <em>The ${HEAVEN_CARDS.length * 3} heaven cards</em>
        <i>They were pictograms beside the realms' ${AWAKENINGS.length * 3} painted cards. Three
        sheets, three heavens to a sheet and one heaven to a row, each row in its heaven's own
        pigment. All ${ALL_CARDS.length} cards in the game are painted now.</i></span></div>
    </div>
    <p class="t">Everything else a player sees is painted or drawn from the save. That is
      ${BEASTS.length} creatures, 9 Dragons, 9 realms, 9 heavens, 18 cultivators, 10
      encounters and 9 arts, with the herbs, the pills and the rooms. The stances, the gear and the tree's nodes are
      characters and frames on purpose.</p>
  </section>

  <section class="sec" id="paint">
    <h2><span class="h">畫</span> The paintings</h2>
    <p class="t">Every creature in the game was a silhouette inside a ring: one shape in
      one colour out of a public icon set, on a blue-black ground. It read, and it read as
      a placeholder. The first painting was dropped straight into that ring and Bruno said
      exactly what it looked like: <i>"as imagens estão horríveis .. como podemos melhorar
      isto, está um badge ampliado e mal cortado circular .. péssimo."</i> He was looking
      at a square painting blown up inside a circle with the corners of the paper still in
      it, which is the worst of both.</p>
    <p class="t">This section is how the art is made now, and it is written down because
      none of it is a one-off. ${DRAWN_ALL} things in this game are drawn as a thing.
      ${PAINTED_ALL} of them are painted. The rest arrive one sheet at a time, and the
      game is playable at every point in between.</p>

    <h3>色 The palette came first</h3>
    <p class="t">The old ground was <code>#04121A</code> with cyan and magenta on it, which
      is a science fiction palette wearing Chinese characters. Bruno, seeing it beside the
      first paintings: <i>"demasiado neon."</i> Everything is now eight colours that exist
      as ground minerals: ink, paper, jade, celadon, old bronze, gold leaf, cinnabar and
      imperial violet. The nine realms walk that ramp in order. Green is the first
      breath and the body, gold is the core, red is the furnace and the tribulation, and
      violet is what is left after all of it. This page was repainted with them, because a
      living document that shows the game in colours the game does not have is the one
      thing it must not be.</p>

    <h3>張 One sheet at a time</h3>
    <p class="t">Bruno paints these with the free credits of an image model, which is a
      few pictures a day: <i>"não consigo gerar tantas imagens com os créditos gratuitos
      do gpt. consegues dar-me um prompt por batches e depois recortar as imagens e fazer
      a tua magia?"</i> So nothing is ever asked for one picture at a time. A sheet is one
      prompt that comes back as one image: a ruled grid with nine or twelve paintings
      inside it, all in the same hand, the same ink and the same light.
      <code>npm run sheets</code> writes the prompts out of the game's own tables, so a
      creature that is renamed is renamed in its prompt and a creature that is added gets
      a panel. Fourteen sheets cover everything painted so far.</p>
    <table>
      <tr><th>sheet</th><th style="text-align:right">grid</th>
          <th style="text-align:right">panels</th><th style="text-align:right">in</th></tr>
      ${sheetRows}
    </table>

    <h3>剪 The cut</h3>
    <p class="t">One file arrives and the game needs ${SHEETS.reduce((n, sh) => n + sh.cells.length, 0)}
      of them, so <code>npm run slice</code> cuts the sheet up. The whole difficulty is
      finding the rules, and it took three tries. The first cutter looked for the flattest
      rows of pixels and settled on bare paper eight pixels off the line. The second looked
      for the darkest rows, and a dark creature leaning on the edge of its panel is darker
      than a pencil line. A rule is not the darkest thing on a page. It is the
      <b>thinnest</b>: a row much darker than the paper three to twenty pixels either side
      of it, and nothing else on a painted sheet is thin in that way. The third cutter
      measures that contrast, hunts a third of a cell around where each rule ought to be,
      and falls back to the nominal line when it finds nothing convincing. It has not been
      wrong on a sheet since.</p>
    <p class="t">A panel is then cut for the shape the screen wants. 牌 the plate keeps its
      paper and is masked into a disc, because at 46 pixels a pale disc with a painting on
      it reads as a page out of a bestiary. 鬥 the arena wears the same creature with the
      paper keyed off it and the edge softened, because at full size that same disc is a
      sticker. That is the picture Bruno was complaining about, and both halves of the
      answer are one painting:</p>
    <div class="pair">
      <span class="round"><img src="bible-art/${pictureOf('beast', 'tiger')}" alt="The plate of the White Tiger">
        <em>牌 the plate</em><i>46px, on the hunt list. Keeps its paper.</i></span>
      <span><img src="bible-art/${pictureOf('cut', 'tiger')}" alt="The cut-out of the White Tiger">
        <em>剪 the cut-out</em><i>Full size, in the arena. The paper is keyed off.</i></span>
    </div>
    <h3>鬥 The arena, before and after</h3>
    <p class="t">The left is Bruno's own phone at midnight, and the words that came with
      it: <i>"a arena está péssima como podes ver e sem criatividade, cultivador menor que
      os monstros ... Mas está feio."</i> The right is the same fight, at the same width,
      from the built game. Both fighters are cut the same way now and sized against each
      other rather than against the half they were given. The ground has no line in
      it.</p>
    <div class="shots">
      <figure>
        <img src="bible-art/shot/arena-before.webp" alt="The arena before: the cultivator inside a bright disc, half the size of the boar">
        <figcaption><b>Before.</b> A coin with somebody in it, a boar twice her size, and
          a black bar for a floor. She is 96 pixels of painting inside 190 pixels of
          paper.</figcaption>
      </figure>
      <figure>
        <img src="bible-art/shot/arena-after.webp" alt="The arena after: both fighters cut the same way, on the same ground">
        <figcaption><b>After.</b> 滲 the same bleed on both, 圓光 the halo behind her head,
          and the painting running down into the dark instead of stopping at a
          rule.</figcaption>
      </figure>
    </div>
    <p class="t">Keying the paper off is the one step that cannot be done by darkness
      either. Pale creatures came out full of holes: the inside of a white tiger is as
      pale as the page it is on. A transparent region fully enclosed by the creature is
      flooded back in. The cultivator cannot be keyed at all: skin painted in ink
      <em>is</em> paper. Those are vignetted instead, which keeps the page and loses the
      edge of it.</p>

    <h3>修 Who the cultivator is</h3>
    <p class="t">The first 修 sheet aged one man from a villager to a ghost, and Bruno
      stopped it there. What he said: <i>"não acho certo o cultivador ficar velho apenas
      porque sim e ser apenas male, tem que existir alguma lógica ou escolha."</i> Both
      halves of that are
      right. There are two figures, the game never picks for you, and nobody ages: it is
      the same person in all nine, and what changes is their standing and how solidly they
      are there. By the ninth they are barely painted at all. Until the question is asked
      the screen draws 影 the figure it always drew, which is a shape and nobody in
      particular, and the answer is a painting and a name. Nothing about the numbers reads
      it.</p>
    <div class="strip alpha">${figStrip('woman')}</div>
    <div class="strip alpha">${figStrip('man')}</div>
    <p class="t">The aura is still the game's, drawn live and read off the save: rings,
      motes, spokes and halos that no painting can carry, because they change while you
      watch them. What did change is that a painted figure gets <b>half</b> the aura, and
      the halo behind the head turns once every two minutes. At full strength the seventh
      realm drowned the painting it was meant to be lighting.</p>

    <h3>境 The nine realms</h3>
    <p class="t">A landscape each, seen from a great height, the mountains across the
      middle and the bottom of the panel almost empty, because the bottom of the panel is
      where the fight happens. Each one is painted in its realm's own pigment.</p>
    <div class="strip wide">${realmPaint}</div>

    <h3>狩 The bestiary</h3>
    <p class="t">${BEASTS.length} of them, three commons and one warden to a realm, all
      painted. They are the hunt list, the bestiary, the tower floors and the arena.</p>
    <div class="strip">${beastPaint}</div>

    <h3>境外 The skies and their Dragons</h3>
    <p class="t">Above the ninth realm there is no ground, so the backdrop is sky: cloud
      and starfield with nothing to stand on, walking out of violet through gold to bone.
      It is the one backdrop that moves, ninety seconds for a pass, slower than anybody
      will notice. Each heaven has its own Dragon, and giving them paintings is what
      stopped nine crossings looking like one animal fought nine times.</p>
    <div class="strip wide">${skyPaint}</div>
    <div class="strip">${dragonPaint}</div>

    <h3>緣 The encounters</h3>
    <p class="t">These keep their paper on purpose. An encounter is a page out of a
      traveller's notebook and it is shown as one, in a band across the top of the card
      that stops the game.</p>
    <div class="strip tall">${meetPaint}</div>

    <h3>符 The emblems</h3>
    <p class="t">Everything the game draws as a symbol in a row: an art, an awakening card,
      a herb, a line of pills, a room of the vault. ${PICTURES.emblem.length} of them are
      painted. They are shown at twenty to thirty pixels, so each is one object on bare
      paper in as few strokes as it takes, rather than a scene nobody can see. They are
      also the one family whose keys collide: 狼噬 Wolf Bite is an art and 貪狼 Greedy Wolf
      is a card, both are keyed <code>wolf</code>, and every key carries its family in
      front of it for that reason. Nine arts and four others:</p>
    <div class="strip alpha">${emblemPaint}</div>

    <h3>動 What moves</h3>
    <p class="t">Bruno: <i>"tenta adicionar algumas animações e auras, brilhos etc ..
      conforme aplicável para dar enfase."</i> Four of them, and every one obeys the rule
      the palette obeys: <b>nothing emits light</b>. A glow is a lamp or the moon.</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">滲</b> <em>Ink meeting paper</em>
        <i>A painting arrives by soaking in rather than sliding: half a second out of blur
        and grey into itself. Used by every painting that appears on a card.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">雲</b> <em>The heavens drift</em>
        <i>Ninety seconds for one pass, and only above the ninth realm. A realm's mountains
        stay still, because mountains do.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">圓光</b> <em>The halo turns</em>
        <i>One turn every two minutes. At that speed it is not an animation, it is the
        difference between a portrait and a photograph of one.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">入</b> <em>The fight begins</em>
        <i>She settles in from the left, the beast stalks in from the right a beat later so
        the eye goes to it. Nothing moves on the way out, because a fight that is over is
        over.</i></span></div>
    </div>
    <p class="t">All four stand down for <code>prefers-reduced-motion</code>. A game
      somebody opens forty times a day is the wrong place to insist.</p>

    <h3>缺 What is still a pictogram</h3>
    <p class="t">Counted by <code>npm run artgaps</code>, which reads the game's own tables
      rather than the folder, so a family that grows shows up here the day it grows.</p>
    <table>
      <tr><th>family</th><th style="text-align:right">painted</th><th>where it is, or what a sheet would be</th></tr>
      ${gapRows}
    </table>
    <p class="t"><b>A missing picture is not a hole.</b> Everything paintable falls back to
      印 the seal, which is the frame and the icon the game already ships, and the painting
      takes the same box when it lands. So the art can arrive one file at a time over
      months and the game is never half drawn: it is drawn one way until it is drawn a
      better one. <code>npm run pictures</code> reads the folder and writes the list, so a
      painting dropped in is in the game on the next build, and a painting nobody made
      costs nothing at all.</p>
  </section>

  <section class="sec" id="questions">
    <h2><span class="h">問</span> Three questions, answered with numbers</h2>
    <p class="t">Bruno, at midnight, going to bed: <i>"um player ativo tem atividades
      suficientes e não se aborrece rápido? Tem conteúdo relevante para fazermos rankings
      etc? Sistema de equipamentos atual é relevante?"</i> Two of the three are
      measurable, so they were measured rather than argued about. The harnesses that
      answer them are <code>npm run busy</code> and <code>npm run worth</code>. The third
      is a decision, and it is written down as one.</p>

    <h3>忙 Is there enough to do?</h3>
    <p class="t">A kind is a system with something to offer: hunting, the tower, the cave,
      an upgrade that can be afforded. A tap is one separate action, so twenty beasts
      within reach is one kind and twenty taps. Kinds are the number that matters, because
      twenty of the same button is one decision made twenty times. A thin visit is two
      kinds or fewer: open the app, press the one thing, close it.</p>
    <table>
      <tr><th>how they play</th><th style="text-align:right">visits</th>
          <th style="text-align:right">kinds</th><th style="text-align:right">taps</th>
          <th style="text-align:right">thin</th><th style="text-align:right">quiet</th></tr>
      ${busyRows}
    </table>
    <div class="rule"><b>Yes, and it is not close.</b> The active cultivator has
      ${ACTIVE_BUSY.mean.toFixed(1)} kinds of thing to do and ${ACTIVE_BUSY.taps.toFixed(0)}
      separate actions waiting on an average visit, and
      ${((ACTIVE_BUSY.thin.length / ACTIVE_BUSY.visits.length) * 100).toFixed(0)}% of visits
      are thin. Nothing in the first two months is a screen with one button on it.</div>
    <p class="t">The honest half of the answer was the last column. The first reading of
      it said <b>the problem is not how much there is to do, it is that nothing new
      arrives after the third week</b>, and it was right. Four things have changed it
      since. A realm's arrivals are spread across its layers, and 秘境深 the deeper vault
      arrives at the seventh realm. 爐 The furnace moved to the ninth, and 期 the week
      turns every seven days for ever. ${SYS_EARLY} of the ${SYS_IN.length}
      systems still open inside the first four days, the last on day
      ${SYS_LAST.day.toFixed(0)}. The longest stretch with nothing new named is now
      ${ACTIVE_BUSY.quiet.toFixed(0)} days, from day ${ACTIVE_BUSY.quietAt.toFixed(0)}, and
      the nine heavens carry a card each after the summit.</p>
    <table>
      <tr><th>when</th><th>what opens</th></tr>
      ${arriveRows}
    </table>
    <p class="t">And this is which systems are actually live, visit by visit, across the
      whole climb of the active cultivator. A low number is not automatically wrong: 守 the
      warden is meant to be rare and 突破 the breakthrough is meant to be nine moments. A
      low number on something that cost a month to build is worth looking at.</p>
    <table class="live">${liveRows}</table>
    <div class="rule"><b>爐 The furnace read 0%, and the reason was worse than idle.</b>
      The first reading said nobody ever needed it, and that was the harness's own policy
      talking: it brewed only when a warden was out of reach. Played by a cultivator who
      brews toward the next tower floor, the furnace was a <b>trap</b>: 72 pills, seven
      more floors, and the ninth realm on day 67 instead of 47. Thirty-four days of the
      climb lost to the system that looked most like progress. It opens at the ninth realm
      now, where pills are the answer to the Dragon rather than a tax on the ladder.</div>
    <p class="t">The three zeroes above it are a different thing and not a fault. 突破 the
      breakthrough, 悟道 the card and 拆 the melt are counted at the <em>start</em> of a
      visit, and the visit before them did them. They are never waiting for you, which
      is what they should be.</p>

    <h3>值 Is the gear system relevant?</h3>
    <p class="t">Exactly answerable, because <code>power()</code> multiplies its terms:
      take a cultivator the harness has played to the top, strip one source out of the
      save, and divide. What comes back is what that source is carrying, with nothing to
      argue about.</p>
    <table class="worth">
      <tr><th>at</th>${SOURCES.map((x) => `<th style="text-align:right">${x.han}</th>`).join('')}</tr>
      ${worthRows}
    </table>
    <div class="rows">
      ${SOURCES.map((x) => {
        const v = TOP_WORTH.share[x.name];
        const txt = v >= 1000 ? `×${(v / 1000).toFixed(0)}k` : v >= 10 ? `×${v.toFixed(0)}` : `×${v.toFixed(2)}`;
        return `<div class="row"><span class="body"><b class="cjk">${x.han}</b>
          <em>${x.name} ${txt}</em><i>${x.note}</i></span></div>`;
      }).join('')}
    </div>
    <div class="rule"><b>器 Gear is relevant, and it is third.</b> It multiplies a finished
      cultivator's power by ${TOP_WORTH.share['the gear worn'].toFixed(1)}, behind 劍訣
      technique and 妖丹 cores and ahead of 道 the tree. It is also the only one of the
      seven that arrives by luck rather than by being paid for. That is the argument for
      keeping it: it is the reason two cultivators with the same numbers are not the same
      cultivator. What it is <em>not</em> is a system a player thinks about, because the
      chest already knows the answer: wear the better piece. The decision it could have and
      does not is 親 affinity, which the tree pays for by slot and almost nobody would
      notice.</div>

    <h3>榜 Is there anything to rank?</h3>
    <p class="t">There is plenty worth ranking. Days to the ninth realm, floors of 塔 the
      tower, crossings of 雷池 the tribulation, how much of the bestiary is 通 Mastered, the
      power at the top. Every one of them is a single number already in the save.</p>
    <p class="t">The reason there is no leaderboard is not content, it is that
      <b>九境 has no server and the save is a text file on the phone</b>. Anything a phone
      sends can be written by the person holding it. A ranking built on numbers the save
      reports is a ranking of who edited their save, and the first week of any leaderboard
      is the week that proves it. There are three honest ways out, in order of cost:</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">碑</b> <em>The stele, which already exists</em>
        <i>A run's record, written for the player alone. No server, no cheating, no
        comparison. It is what the game does today and it is the right default.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">局</b> <em>A season with a seed</em>
        <i>Everybody plays the same seeded run for a fortnight and what is uploaded is the
        <b>input</b>, not the score: the taps and their times. The server replays them
        through <code>sim/</code>, which is pure by rule, and gets the same number or
        throws the run away. This is the one design that works because of how this game is
        already written, and it is a week of work and a small server.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">友</b> <em>Friends only, unverified</em>
        <i>A code you paste to a friend. Nobody polices it, and nobody minds, because the
        comparison is with somebody you know. Two days of work and no server at all.</i></span></div>
    </div>
    <p class="t"><b>The recommendation is 友 first and 局 only if the game finds an
      audience.</b> A verified leaderboard on a game with no players is a server bill.</p>

    <h3>續 What the measurement said to do next, and all three are done</h3>
    <p class="t">Three things, in the order the numbers put them in. None of them was more
      content for the sake of it: the first two were about a game that already had
      everything in it by the third week. Each row now says what was built.</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">遲</b> <em>Hold two systems back</em>
        <i>${SYS_EARLY} of the ${SYS_IN.length} arrive inside four days, five of them in the
        second realm, which is one afternoon. Moving
        秘境 the vault and 爐 the furnace up the climb costs nothing to build and buys two
        arrivals in the month that currently has none. <b>Done:</b> 秘境深 the deeper vault
        at the seventh realm, 爐 at the ninth, and a realm's own arrivals spread across its
        layers.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">爐</b> <em>Give the furnace a job</em>
        <i>It is the one system the measurement says is dead: 0% of visits, ×1.00 of a
        finished cultivator's power. A pill is qi spent on power, and qi spent on the
        ladder is also power, sooner. It needs to buy something the ladder cannot: a
        consumable a warden actually wants, or a floor of 塔 the tower that will not open
        without one. <b>Done</b>, and the answer was the opposite of the question: it was
        not dead but a trap, and it moved to the ninth realm.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">期</b> <em>One thing that changes on its own</em>
        <i>Every system in this game is a staircase, and a staircase is finished the day
        you see the top of it. The cheapest thing that is never finished is a rotation: a
        beast the week pays double for, a room of 秘境 that moves, a herb that is only in
        season. It is a day of work and it is the only kind of content that does not run
        out. <b>Done</b>, exactly as written: <a href="#week">期 the week</a>.</i></span></div>
    </div>
  </section>

  <section class="sec" id="proposals">
    <h2><span class="h">提</span> Four systems that are not in the game</h2>
    <p class="t">Bruno, after a morning of the early game getting faster:</p>
    <p class="t"><i>"sem sistemas de conteúdo, sinto que é tudo muito superficial e
      vazio, consegues apresentar propostas visuais de coisas que possamos
      implementar"</i></p>
    <p class="t">He is right, and the measurement agrees. Everything the first three realms ask of a
      player is a number going up. 材 material buys 妖丹 and now 煉器, qi buys the
      ladder, and that is the whole of it. There is no place you own, no run with an
      ending, no choice that makes your cultivator different from anybody else's, and
      nothing in the world that ever speaks to you.</p>
    <p class="t"><b>All four are built now</b>, and each has a section of its own
      further down this page. They are drawn here as they were proposed, with the game's
      own
      art and its own tables rather than described, because a system in a paragraph is a
      system nobody can judge. Each one is written to the laws this game already keeps:
      the sim stays pure, <b>nothing uncapped may ever raise the qi rate</b>, nothing is
      taken away for being away, and losing costs nothing. They are in the order I would
      build them.</p>

    <h3>提一 · 洞天 A place you own <span class="built">built</span></h3>
    <p class="t">A cave with three beds. You plant a 靈草 spirit herb and it ripens over
      real hours, and a ripe herb waits for you for ever. Herbs are the third thing 爐
      the furnace wants, so pills stop being qi and material alone.</p>
    <p class="t">This is the one that answers idle directly. Right now the only thing
      that happens while you are away is a bar filling, and a bar is not a place. A bed
      you planted six hours ago is a reason to open the app that is not arithmetic. The
      decision is real too: a bed planted is a bed you cannot use until it is taken, so
      three beds and five herbs is a choice every time.</p>
    ${MOCK_CAVE}
    <p class="cap">Two beds working and one waiting. The ring is the growing, the
      character is the herb, and the line underneath is the only number on it.</p>
    <p><span class="law">Idle: it grows while you are gone</span>
       <span class="law">Never taken away: a ripe herb waits</span>
       <span class="law">Pays pills, never the qi rate</span></p>
    <p class="t"><span class="cost">Cost:</span> a new screen, a table of herbs, one
      field on the save. The furnace already exists and already takes two inputs.</p>

    <h3>提二 · 秘境 A run with an ending <span class="built">built</span></h3>
    <p class="t">A door that opens at the third realm. Inside is a path of seven rooms,
      and at each one you are shown two ways on and told what is behind each. A beast. A
      cache. A cold shrine. A wanderer who wants something. You pick, you walk, and
      seven rooms later you come out with what you took.</p>
    <p class="t">This is the session. Everything in the game today is a loop with no
      ending, which is what makes three minutes of it feel like nothing happened. A run
      has a beginning and an end and a story you can tell about it, and it is the shape
      every idle game with legs eventually grows. Falling in a room does not hurt you.
      You come out early with what you already have, because losing costs nothing is the
      promise this whole game is built on.</p>
    ${MOCK_SECRET}
    <p class="cap">Three rooms walked, standing at the fourth, and a warden at the end of
      it. The two doors name what is behind them, because a blind choice is a coin toss
      and a coin toss is not a decision.</p>
    <p><span class="law">Losing costs nothing: you walk out</span>
       <span class="law">Entered when you choose, never on a timer</span>
       <span class="law">Pays gear, 道 points and herbs</span></p>
    <p class="t"><span class="cost">Cost:</span> the biggest of the four. A room table, a
      path generator seeded off the save, and a screen. The fighting, the drops and the
      gear it hands out are all already built.</p>

    <h3>提三 · 悟道 A choice that makes you different <span class="built">built</span></h3>
    <p class="t">Every breakthrough, three cards. You take one and it is yours for the
      rest of the climb. Nine realms, nine choices, and no two cultivators arrive at the
      ninth realm the same.</p>
    <p class="t">道 The tree is the closest thing the game has to this and it is not the
      same: its nodes are bought with points that accumulate, so given enough time
      everybody owns most of it. A card taken at a breakthrough is a door closed on two
      others. That is what makes it a build rather than a checklist, and it is the one
      of the four that costs almost nothing to make.</p>
    ${MOCK_AWAKEN}
    <p class="cap">Three cards at the fifth breakthrough, one taken. Every effect on them
      pays material, odds, drops or the length of 入定, and never the gathering rate.</p>
    <p><span class="law">Nothing uncapped touches the qi rate</span>
       <span class="law">A door closed is what makes it a build</span>
       <span class="law">Nine of them across a climb</span></p>
    <p class="t"><span class="cost">Cost:</span> the cheapest by a long way. A table of
      cards, one array on the save, and a sheet at the breakthrough. The effects plug
      into the same places 道 the tree's already do.</p>

    <h3>提四 · 緣 Somebody on the road <span class="built">built</span></h3>
    <p class="t">About one visit in six, a small card. An old man selling something he
      will not name. A broken sword in the road. A merchant who takes material and gives
      back a thing you cannot buy. One choice, two outcomes, and it is gone.</p>
    <p class="t">This one is not economy at all, it is the world. 九境 has nine realms,
      thirty-six beasts and a Dragon at the top, and nothing in it has ever spoken. A
      card like this costs a day to build and is the difference between a spreadsheet
      with characters on it and somewhere you are.</p>
    ${MOCK_MEET}
    <p class="cap">It sits where 示 the advice sits, it never blocks anything, and
      walking on is always free.</p>
    <p><span class="law">Never takes anything you did not offer</span>
       <span class="law">Never blocks, never expires while you are away</span>
       <span class="law">Flavour first, economy second</span></p>
    <p class="t"><span class="cost">Cost:</span> a day. A table of meetings, a seeded
      roll on the visit, and one card that already has a shape on the screen.</p>

    <h3>What was built, and what is left</h3>
    <p class="t"><b>悟道 and 緣 are in the game.</b> They were the first two for the same
      reason they are cheapest. One lands at a moment the game already had and was
      spending on a single button. The other is a day's work for the whole difference
      in how the world reads. Both have their own sections below, with what the
      measurements said.</p>
    <p class="t"><b>洞天 and 秘境 are built too</b>, each with its own section below.
      秘境 was left for last because it is the one worth doing properly, and it took
      five measurements and four different shapes before the wall between idle and
      active held.</p>
  </section>

  <section class="sec" id="awaken">
    <h2><span class="h">悟道</span> The three cards at a breakthrough</h2>
    <p class="t">Eight breakthroughs and nine heavens, ${ALL_CARDS.length} cards, and you
      keep one of every three. The other two close for good. 道 The tree is the nearest thing the game
      already had and it is not the same: its points accumulate, so given enough days
      everybody owns most of it, which makes it a checklist. A card taken is two doors
      shut, and that is what makes a build.</p>
    <p class="t">It is not fired, it is derived. What is owed is the realm minus one plus
      the heavens the marks have opened, what is taken is the length of the list, and the
      difference is the offer. So it
      cannot be missed by a reload, cannot be lost by closing the app mid-choice, and a
      save hand-edited to skip one is simply asked again. The whole mechanism is one
      subtraction.</p>

    <h3>力 Why no card pays power, which took a measurement to learn</h3>
    <p class="t">The first table had five power cards compounding to <b>3.5x</b>. The
      pure idler reached the ninth realm on day <b>121</b> instead of <b>171</b>, while
      every cultivator who actually plays moved by less than a day: they are gated by qi
      and the idler is gated by power. The repo's own wall rule caught it, which is what
      it is for. Halving the numbers did not fix it either, because the shape was wrong
      and not the size.</p>
    <p class="t">So every card pays for <b>being there</b>. Material needs kills, drops
      need kills, melting needs drops, refining needs material. A cultivator who never
      opens the app gets nothing from any of them, which is the same deal the rest of
      the game offers. The wall now reads <b>1.79x</b> against a rule of 1.5.</p>

    <div class="trios">${AWAKEN_TABLE}</div>

    <h3>境外 And nine more, one at each heaven</h3>
    <p class="t">忙 The harness counts what a cultivator has to decide, and the endgame
      had nothing in that column at all. The ninth realm is reached around day 47, the
      nine heavens run from about day 50 to day 140, and every crossing in them was the
      same crossing at a bigger number. The realms hand over eight permanent choices
      between them and the heavens handed over none, so the half of the game that lasts
      longest was the half with no build in it.</p>
    <p class="t">The same mechanism carries them: the trios continue in one list, the
      offer is the same subtraction, and nothing in <code>sim/awaken.ts</code> knows that
      a heaven is different from a realm.</p>
    <p class="t">Two of the realm cards' seven kinds are dead by the first heaven, because
      道 the tree is finished and 藏 the chest is large. So two new kinds name what is
      alive up there: a pill asks less 材 material, and a floor of 塔 the tower pays more
      of it. Neither pays power. A pill is cheaper, not stronger.</p>
    <p class="t">量 What they are worth, measured, because it is not what a realm card is
      worth. Forty crossings played out on each way of leaning: <b>134 to 149 days</b>,
      and a seventh of the power between the widest two. That is the right answer, and
      the reason is 雷池 the pool: the endgame's clock is written in days of your own
      gathering, so <b>nothing a card pays can make a crossing come sooner</b>. A heaven
      card is a build, not a speed-up, and it must never be sold as one.</p>

    <h3>煉器 What writing them found, which was worse than what they fixed</h3>
    <p class="t">Every card here read as worth nothing, and for a while that looked like
      the cards being wrong. It was the harness. The endgame loop gathered, climbed and
      brewed and <b>never once refined</b>, so 材 material only ever went up and ended at
      <b>2.2e29</b> with nowhere to go. 示 The advice line has always sent a capped
      cultivator to 煉器, and a real one arrives at the heavens refining every slot.</p>
    <p class="t">With that one step added, a piece comes out at refine level <b>90</b>.
      The Dragon at its old footing was then a walkover in <b>28 crossings of 40</b>,
      which is the exact fault TRIBULATION_FOOTING exists to prevent. It was re-measured
      from 1.45 to <b>1.59</b>, and the endgame now reads 144 days with a median crossing
      at 66%. The same fault 爐 the furnace had, in the same harness: a spending policy
      nobody wrote down, quietly deciding the answer.</p>

    <div class="trios">${HEAVEN_TABLE}</div>
  </section>

  <section class="sec" id="meet">
    <h2><span class="h">緣</span> Somebody on the road</h2>
    <p class="t">Every few hours, one small card. An old man selling something he will
      not name, a broken sword in the road, a drunk two realms above you who cannot
      stand up. One choice, two named outcomes, and it is gone.</p>
    <p class="t">This one is not economy, and the numbers say so: the largest 道 haul
      every meeting in the game could ever pay is <b>${MEET_POINT_CEILING}</b> points,
      against ${TOTAL_COST} for the whole tree, and half the answers are nothing at all.
      九境 has nine realms, thirty-six beasts and a Dragon at the top, and until this
      nothing in it had ever spoken.</p>
    <p class="t">Three rules, and they are the game's own. <b>取</b> Nothing is ever
      taken that was not offered: every cost sits on the button that charges it and
      walking on is free, always. <b>待</b> It never blocks and never expires, because
      what is on offer is derived from the save rather than fired at a moment.
      <b>定</b> It is chosen and not rolled: which meeting comes next is a function of
      the save, so two cultivators with the same history meet the same people, and the
      harness can walk it.</p>
    <p class="t">A qi figure on a meeting is counted in <b>minutes of that cultivator's
      own standing gathering</b>. A share of the rung was tried first and it is the
      wrong scale. A rung is a whole layer and grows exponentially, so six tenths of one
      read as 23.8M qi at the fourth realm to somebody holding two hundred thousand.</p>

    <table class="tbl meets">
      <thead><tr><th>Who</th><th class="n">From realm</th><th>The two answers</th></tr></thead>
      <tbody>${MEET_TABLE}</tbody>
    </table>
  </section>

  <section class="sec" id="cave">
    <h2><span class="h">洞天</span> A place you own</h2>
    <p class="t">${BEDS} beds. 材 Material goes into the ground and comes up as 氣 qi,
      on its own, over real hours. Until this the only thing that happened while the app
      was shut was a bar filling, and a bar is not a place.</p>

    <h3>律 Why it cannot be farmed by somebody who is never there</h3>
    <p class="t">悟道 The cards taught this the hard way a few hours before the cave was
      built. Anything that pays while you are away must not let the cultivator who is
      never there win. So a bed is worked <b>from both ends by hand</b>. You plant it,
      hours pass, and you come back and take it. Somebody who never opens the app plants
      nothing and harvests nothing, and ${BEDS} beds cap what any amount of opening it
      can ever be worth.</p>
    <p class="t">換 And what it converts is the other half. A seed costs 材 material,
      which only ever falls off beasts, and a ripe bed pays qi, which is the climb. So
      the cave is a hunter's road to the ladder and cannot be walked by somebody who
      does not hunt. It also puts a third answer beside 妖丹 cores and 煉器 refining for
      the question of where the material goes.</p>

    <h3>量 What it was worth, and what it had to be cut to</h3>
    <p class="t">The first numbers were 13 to 18 minutes of qi an hour a bed. Three beds
      is then <b>54 minutes of gathering an hour</b> on top of the sixty you already
      have, which is very nearly doubling the rate, and the climb collapsed:</p>
    <table class="tbl"><thead><tr><th>Habit</th><th class="n">Before the cave</th>
      <th class="n">First numbers</th><th class="n">Shipped</th></tr></thead><tbody>
      <tr><td>never fights</td><td class="n">145</td><td class="n">145</td><td class="n">145</td></tr>
      <tr><td>once a day</td><td class="n">90</td><td class="n">64</td><td class="n">85</td></tr>
      <tr><td>casual</td><td class="n">88</td><td class="n">64</td><td class="n">83</td></tr>
      <tr><td>active</td><td class="n">61.5</td><td class="n">36</td><td class="n">56</td></tr>
      <tr><td>every hour</td><td class="n">39.8</td><td class="n">26.5</td><td class="n">37</td></tr>
    </tbody></table>
    <p class="t">Cut to about a seventh, the cave takes <b>5 to 9 per cent</b> off the
      climb for the cultivators who work it and nothing at all off the one who never
      fights, because that one never has the material to plant with. The wall reads
      <b>1.87x</b> against a rule of 1.5.</p>

    <table class="tbl cavetbl">
      <thead><tr><th>Herb</th><th class="n">From realm</th><th class="n">Takes</th>
        <th class="n">Seed</th><th class="n">Pays</th><th class="n">Min of qi an hour</th></tr></thead>
      <tbody>${CAVE_TABLE}</tbody>
    </table>
    <p class="t">The longer herb is the better rate, and that is the decision the beds
      are for. A two-hour herb three times a day beats a twelve-hour one if you are
      there three times a day, and loses badly if you are not. Nothing rots and nothing
      is lost by being late. The only thing a long wait costs is the bed it stands
      in.</p>

    <h3>明 The table above, on the screen</h3>
    <p class="t">Bruno: <i>"a farming também devia ser mais coerente e perceber o tipo de
      ganhos"</i>. The decision in the paragraph above was real and the screen was not
      showing any of it. A seed asked for material and named an hour count. It said
      nothing at all about what came back until the bed was ripe, which makes the one
      choice the cave exists for a choice made blind.</p>
    <p class="t">So a seed now says three things: what it costs, what it ripens into, and
      what that is an hour. A bed still growing says what it will be worth rather than
      only when it is ready. And the screen says the one thing about the value that
      surprises people: a bed pays at the rate you gather at <b>when you take it</b>, so
      a breakthrough while it grows makes it worth more, and nothing ever makes it worth
      less. The claim that the longer herb is the better rate is now a test, because a
      screen that quotes a rate is a screen that can start lying.</p>

    <h3>進 And the formatter carried wrong, which the cave is what landed on</h3>
    <p class="t">A bed four hours from ripe read as <b>3h 60min</b>. Rounding the hours
      and the minutes separately lets the remainder overflow its own unit, and a day
      less a few minutes reads as 1d 24h the same way. The bug is as old as the
      function; nothing had ever landed on the wrong side of a boundary before. It
      rounds to the smaller unit first and carries now, and a test walks three days a
      few seconds at a time looking for it.</p>
  </section>

  <section class="sec" id="secret">
    <h2><span class="h">秘境</span> A run with an ending</h2>
    <p class="t">A door that opens every ${DOOR_GAP / 3600} hours and then waits for
      ever. ${SECRET_ROOMS} rooms, two ways on at each, and every other one is a gate
      with a single guardian and no way past it. Everything else in this game is a loop
      with no ending, which is why three minutes of it can feel like nothing
      happened.</p>
    <div class="spath">${SECRET_PATH}</div>

    <h3>銀 Nothing is carried, so nothing is at stake</h3>
    <p class="t">Every room pays into the save the moment it is opened, and that one
      decision is what makes the rest of it simple. Losing costs nothing because there
      is nothing to lose. Closing the app in room four keeps every room already walked.
      A save can never hold a run's worth of gear in flight for <code>validate</code> to
      have to reason about. Three numbers are stored and no loot: where you are, when
      the last run ended, and how many you have finished.</p>

    <h3>量 Three measurements, three leaks, and all of them the same law</h3>
    <p class="t">This one took the longest to get right, and every version of the problem
      was a version of the same rule: <b>a thing that pays must not pay the cultivator
      who is never there</b>.</p>
    <table class="tbl"><thead><tr><th>What was tried</th><th class="n">The wall</th>
      <th>What was leaking</th></tr></thead><tbody>
      <tr><td>Seven reward doors, no gates</td><td class="n">1.39</td>
        <td>A cultivator who never hunts walked all seven, every run, and took 29 days off their climb.</td></tr>
      <tr><td>Gates of two beasts a realm above</td><td class="n">1.56</td>
        <td>The gates themselves paid: three kills of a beast above your realm a run, with the material and the drops.</td></tr>
      <tr><td>A gate that pays nothing at all</td><td class="n">1.88</td>
        <td>Better. But both doors read 2% at the fourth realm, which is not a choice, and it is content a mid-realm player cannot touch.</td></tr>
      <tr><td>One guardian, ramped, own realm first</td><td class="n">1.53</td>
        <td>Readable, and now the walker got through: 藏 the cache was handing a non-hunter a thousand beasts' worth of 材.</td></tr>
      <tr><td><b>Shipped: no material anywhere in the run</b></td><td class="n"><b>1.91</b></td>
        <td>材 comes off beasts and from nowhere else. What is left pays qi, 道 points and gear.</td></tr>
    </tbody></table>
    <p class="t">關 The rule the gates ended on was already written down in this
      repository, for 守 the wardens: <b>a gate that pays for its own key is not a
      gate</b>. Beating a guardian opens the way and does nothing else. No material, no
      drop, and not a mark on 錄 the record, because it is not a hunt.</p>
    <p class="t">Shipped, the whole run costs about <b>one per cent</b> of the climb for
      every habit, which is what a content system should cost. What it is for is having
      a beginning and an end.</p>

    <h3>圖 A door is a picture of where it goes</h3>
    <p class="t">A run was a paragraph, a row of seals and two buttons with a 26 pixel
      icon on each. 藝 <code>art/secret.ts</code> draws the room behind each door
      instead, and it keeps the rule 塔 the tower set: <b>the drawing is a reading of the
      save, not a picture next to it</b>. The vault is the colour of the realm you are
      standing in. The arches recede one further for every two rooms behind you, so room
      six is visibly deeper underground than room one. A gate is drawn as what a gate is:
      the way on, barred, with something awake in front of it.</p>
    <div class="vaults">${SECRET_VAULTS}</div>
    <p class="cap">The four panels above are the real function, called with the arguments
      the screen calls it with, at the sixth realm.</p>

    <h3>記 What the run gave, at the end of it</h3>
    <p class="t">Bruno: <i>"no fim mostrar o loot e ganhos totais"</i>. He was right, and
      the cause was the law this system is built on. Every room pays into the save the
      moment it is opened. So a run that paid four times over lands in a bar that was
      already moving, a badge on a tab, and a chest with forty other pieces in it.
      Nothing was ever wrong. Nothing was ever visible either.</p>
    <p class="t">So the save carries a <b>record</b> of the run beside the run: qi, 道
      points, the pieces walked out with, the rooms opened and the guardians put down.
      It is a record and never loot in flight. The difference is held to by a test: the
      qi on the tally has to equal the qi the save gained, to the unit.</p>
    <p class="t">The running total is on the screen while the run is still being walked
      too, because that is the question a gate asks: is what I am holding worth the next
      one?</p>
    <div class="mk secret out">${SECRET_OUT}
      <p class="cap">出 The way out, the panel the end of a run wears.</p></div>

    <h3>深 The three gates, and what is behind the other four doors</h3>
    <p class="t">The first gate is the strongest common of the realm you stand in, which
      somebody near their ceiling should beat. The second is the weakest of the realm
      above. The third is the strongest thing the realm above has, and it is meant to
      stop most people. A mid-realm walker gets two or three rooms and walks out with
      them; a ceiling walker gets all ${SECRET_ROOMS}.</p>
    <table class="tbl cavetbl"><thead><tr><th>Room</th><th>What is behind it</th></tr></thead>
      <tbody>${SECRET_ROOMS_TABLE}</tbody></table>
  </section>

  <section class="sec" id="week">
    <h2><span class="h">期</span> The one thing that never runs out</h2>
    <p class="t">忙 The harness that counts how much there is to do said the plainest
      thing about a long idle game: <b>everything in it arrives once</b>. Forty-odd
      arrivals, the last of them around the seventh week, and after that the game is the
      same game every day for ever. The bestiary is read, the tree is spent, 秘境 walks
      the same rooms. Nothing was ever different on a Tuesday.</p>
    <p class="t">One mark now rides the calendar. It hands over no new content: it points
      at content that is already there and says <i>that one, this week</i>.</p>
    <div class="weeks">
      <p><b class="cjk">獸</b><span><em>The week's quarry</em><i>One common beast, drawn
        from what has walked out for this cultivator, worth <b>double 材 material</b> all
        week. The first kill of the week pays a share of a rung of qi, once.</i></span></p>
      <p><b class="cjk">草</b><span><em>The herb in season</em><i>A bed of it pays
        <b>half again</b>. It is the only week the short herb beats the long one, which is
        the one decision 洞天 the cave exists for.</i></span></p>
      <p><b class="cjk">室</b><span><em>The blessed room</em><i>One reward room of 秘境
        <b>pays double</b>, named on the door card before the run starts. Never a gate: a
        gate pays nothing by design, and doubling nothing is a mark with nothing behind
        it.</i></span></p>
    </div>

    <h3>純 Why there is no server and nothing to sync</h3>
    <p class="t">All three are a pure function of the week number and the save, and the
      week number is read off the same instant <code>validate</code> has already capped at
      the real clock. So two cultivators who open the app on the same Tuesday are looking
      at the same week. A phone with its clock wound forward gets a different week, not a
      second helping of this one. The whole memory of it is <b>one number</b>
      on the save: the week the once-a-week qi was last taken in. A week index rather than
      an instant, on purpose, because a week index cannot be walked backwards.</p>

    <h3>律 Why it may never touch the rate, and does not</h3>
    <p class="t">A rotation is uncapped by construction: there is always a next week. So
      every one of the three is a multiplier on something already capped <b>by hand</b>.
      The quarry pays 材 material, which only falls off a beast somebody went and killed.
      The season pays a bed, and there are three beds and they are planted with material.
      The blessed room is one room of one run, and the door only opens once a day.</p>
    <p class="t">量 Measured over a whole climb, before and after: the cultivator who
      <b>never fights finishes on day 144 either way</b>, and the active one moves from 58
      to 57. A rotation the idler cannot see is the entire point of it.</p>
  </section>

  <section class="sec" id="board">
    <h2><span class="h">狀</span> Where we are</h2>
    <p class="t">Three states and no fourth. <b class="cjk" style="color:var(--jade)">成</b>
      closed means built, measured by a test, and written up below.
      <b class="cjk" style="color:var(--gold)">行</b> open means it exists and is still
      moving. <b class="cjk">待</b> planned means agreed and not started. "Mostly done" is
      open.</p>
    <p class="t"><b>${CLOSED} closed, ${OPEN} open, ${PLANNED} planned.</b> Counted from the
      board itself, so it cannot disagree with the rows under it.</p>
    <div class="board">${statusRows}</div>
  </section>

  <section class="sec" id="where">
    <h2><span class="h">包</span> Where to play</h2>
    <p class="t">One codebase, two ways in. The page is the game; the APK is a window onto
      the same page, so it is installed once and never again. Every push updates both.</p>
    <div class="where">
      <a href="${PAGES}"><b>網</b><span><em>The page</em>
        <i>${PAGES.replace('https://', '')} · open it on the phone and add it to the home
        screen. It works with no signal once it has loaded once.</i></span></a>
      <a href="${ACTIONS}"><b>包</b><span><em>The APK</em>
        <i>Run the workflow, wait for the green tick, download the artifact, unzip it and
        open the .apk. It points at the page above, so it never needs rebuilding for a
        change to the game.</i></span></a>
      <a href="${REPO}"><b>碼</b><span><em>The code</em>
        <i>Everything, including this page's own source in tools/bible.ts.</i></span></a>
    </div>
  </section>

  <section class="sec" id="loop">
    <h2><span class="h">環</span> How it is played</h2>
    <p class="t">Open the app. Take the hours that passed. Spend what they gathered. Fight
      something. Close it again.</p>
    <div class="cards two">
      <div class="card"><b class="cjk">修</b> <em>Cultivate</em>
        <i class="faint" style="display:block;margin-top:5px">The bar, the four upgrades,
          the warden at the ceiling and 突破 the breakthrough. This is the screen the game
          is played on.</i></div>
      <div class="card"><b class="cjk">狩</b> <em>Hunt</em>
        <i class="faint" style="display:block;margin-top:5px">Every common beast you have
          reached, fought as often as you like. Gear falls here, and 材 material. 錄 the
          bestiary folds out at the bottom.</i></div>
      <div class="card"><b class="cjk">塔</b> <em>Trials</em>
        <i class="faint" style="display:block;margin-top:5px">無盡塔 the tower and 丹爐 the
          furnace. One floor at a time, and everything the floors pay for.</i></div>
      <div class="card"><b class="cjk">器</b> <em>Gear</em>
        <i class="faint" style="display:block;margin-top:5px">Six slots, the chest, and
          煉 fusing ${FUSE_COUNT} of a rank into one of the next.</i></div>
      <div class="card"><b class="cjk">道</b> <em>Path</em>
        <i class="faint" style="display:block;margin-top:5px">The technique tree, 勢 your
          stance and 訣 your sequence of arts.</i></div>
      <div class="card"><b class="cjk">存</b> <em>The save</em>
        <i class="faint" style="display:block;margin-top:5px">Behind the 存 button in the
          corner. Copy it somewhere, because it lives in this browser and nowhere
          else.</i></div>
    </div>
  </section>

  <section class="sec" id="opens">
    <h2><span class="h">開</span> What each realm opens</h2>
    <p class="t"><b>九境 is purely vertical. Nothing resets, ever.</b> There is no rebirth
      and there will not be one: the ladder, 無盡塔 the tower, 爐 the furnace, 煉器 refining
      and 渡劫 the marks all only go up, and four of those five have no top at all.</p>
    <p class="t">A game shaped that way owes the player one thing in return, and for a
      long time it did not pay it: <b>climbing has to hand you something you did not have
      before.</b> Seven systems were open at realm 1, minute 1: gear, fusing, the tree,
      the tower, the record, the furnace, refining. So a new cultivator met five tabs and
      a dozen mechanics at once and then climbed eight realms that gave them nothing but
      bigger numbers.</p>
    <table>
      <tr><th>realm</th><th>勢 stance</th><th>訣 art</th><th>開 and what opens</th></tr>
      ${opensRows}
    </table>
    <p class="t">The first realm was deliberately bare, and that was an over-correction.
      The fear was right; the answer taken from it was <em>nothing at all</em>, for
      thirteen hours: a bar, eighteen purchases, and one fight at the very end. The
      second realm blooms, but a player has to last until it.</p>
    <div class="rule"><b>弱 And the first realm's own beasts were sitting there the whole
      time.</b> Measured layer by layer, they arrive as a ladder without a number being
      touched: 山鼠 the rat becomes winnable at the fifth layer, around two hours in, at
      <b>66%</b>; 野犬 the hound at the sixth; 澤蛙 the frog at the seventh; and 妖狐 the
      fox, the warden, at the ninth. Four fights, each a real question when it comes, and
      and every one of them was hidden behind the second realm. So 狩 Hunt opens at the
      <b>first</b>. Not the bestiary, not gear, not a stance: three beasts, honest odds,
      and nothing to lose by trying. 器 gear and 勢 the build still arrive together at
      the second, and they read better for it. You have been killing these animals for
      hours, and now they start leaving things behind.</div>
    <div class="rows">${opensCards}</div>
    <div class="rule"><b>A system that arrives late arrives full.</b> The 道 points earned
      from the first layer are all waiting when the tree opens at the
      ${realmOf(opensAt('tree')).han} ${realmOf(opensAt('tree')).name} realm. Every beast
      killed before the ${realmOf(opensAt('bestiary')).name} realm is already counted when
      圖鑑 the bestiary starts paying for finished realms. Nothing is withheld and then thrown away; it is withheld
      and then handed over. A locked tab keeps its own character and says which realm
      opens it, because you cannot look forward to a tab you have never seen.</div>
    <div class="rule"><b>道 And the tree came down two realms, because it was already
      paid for.</b> Bruno, halfway up the second: <em>"não existe bem gasto nem incentivo
      para mais nada."</em> Measured at that exact spot he was holding <b>six 道 points</b>
      , one for every three layers opened since the first minute and two for the warden he
      had put down, and the cheapest node in the tree costs one. The whole of the game's
      theorycrafting was bought and sitting behind two more realms. Moving it costs
      <b>three days either way</b> across all eight cultivators: the deepest thing in 九境
      was free to hand over.</div>
    <div class="rule"><b>樞 What the fourth realm gives instead is the half of the tree
      that is a decision.</b> Three keystones, each stronger than the node beside it and
      each taking something away to pay for it. 捨甲 Forsake Armour silences two slots.
      忘機 Forget the Mechanism costs 45% of your power. 空囊 Empty Pouch shrinks the chest
      to twelve. Those are not upgrades and they are not what a second-realm
      cultivator should meet first. They are drawn from the second realm on and the card
      says which realm opens them, because a fork you know is coming is a climb with a
      plan in it.</div>
    <div class="rule"><b>環 And the first realm has to close its loop.</b> Bruno, playing
      it: <em>"a primeira hunt não dá nada. Apenas está lá."</em> He was right, and the
      hunting was not the problem. A kill paid 材 material, and material bought nothing
      until the third realm: two days with a dead coin in your pocket. The marks those
      kills earned were counted from the first one and paid from the sixth. Both
      rewards existed. Both were locked in cupboards a fortnight away. So the first realm
      holds one whole loop instead of a third of one. 狩 Something to kill. 妖丹 Something
      the killing buys, at 3 材 for +8% power. 錄 A count that makes the tenth kill worth
      more than the first. Wardens still do not <em>demand</em> cores until the
      third realm. Being sold a thing earlier than you are required to have it is the
      right way round, and the reverse is the wall this section exists to stop.</div>
  </section>

  <section class="sec" id="habits">
    <h2><span class="h">勤</span> Playing, and waiting</h2>
    <p class="t">An idle game has to answer one question honestly: <b>what does being
      there buy me?</b> For a while 九境 answered it badly. Measured, somebody playing six
      times a day reached the ninth realm <em>later</em> than somebody who opened the app
      once, because the qi they spent on power was qi that did not open a layer.</p>
    <p class="t">Three things carry the difference now, and every one of them only ever
      <b>adds</b>:</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">妖丹</b> <em>A warden asks for cores</em>
        <i>Cores are not bought with qi. They are bought with 材 material, and material only
        falls off things you kill. The first ${CORES_FREE_REALMS} realms ask for none, so a
        new cultivator learns what a warden is before learning that a warden is not enough;
        from the third it tightens a realm at a time.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">入定</b> <em>Sitting with it gathers deeper</em>
        <i>With the app open the rate climbs to ${FOCUS_MAX}x over ${FOCUS_RAMP / 60} minutes,
        holds, and ends after ${FOCUS_HOLD / 60}. It ends on purpose: a multiplier that
        simply held would be farmed by leaving the phone on a charger. To sit again, leave
        and come back.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">塔</b> <em>A tower floor pays hours</em>
        <i>${TOWER_QI_HOURS} hours of your own gathering, once, and never again. There is no
        floor to farm. This is the one place in the game where fighting moves the bar
        instead of only moving your power.</i></span></div>
    </div>
    <div class="rule"><b>And nothing anywhere pays less for being away.</b> The qi gathers
      at full rate with the phone closed, every second of it, whatever else changes. 入定
      is written as a multiplier that starts at 1 and climbs, so no call in the game can
      pay below the promised rate. Being active is worth something because it adds, never
      because being away subtracts.</div>
    <h3>Five cultivators, one game, played out rather than guessed</h3>
    <p class="t">Every one of them walks a 道 branch, hunts, picks up what falls and wears
      it. That sentence is newer than it should be: for most of this game's life the
      harness did none of those things. Every number it printed belonged to a
      cultivator who does not exist.</p>
    <table>
      <tr><th>habit</th><th style="text-align:right">visits</th>
          <th style="text-align:right">open</th><th style="text-align:right">realm 9</th>
          <th style="text-align:right">力 at the end</th><th style="text-align:right">tower</th>
          <th style="text-align:right">fights</th></tr>
      ${habitRows}
    </table>
    <p class="t">The top row is the whole point. That cultivator's qi is not the problem.
      every upgrade qi can buy is at its cap and the bar fills as fast as anybody's. What
      they are short of is not qi. It is a reason to have been there.</p>
    <p class="t">And the bottom row is the other half: playing every waking hour is worth
      about <b>twice</b> the speed of playing casually, not twenty times. The game is not
      supposed to belong to whoever has the most free time.</p>
    <div class="warn"><b>器 Gear was the widest hole the game ever had.</b> The 氣 axis on a
      piece is a qi-rate multiplier with no cap, earned by hunting: exactly the
      <em>playing more finishes sooner</em> trap the whole economy was built to avoid. With
      the drops finally picked up and worn, the active cultivator finished on
      <b>day 38</b> and the hourly one on <b>day 20</b>, against a promise of ninety; the
      claim above was false and nothing could see it, because nothing had ever equipped a
      piece. Gear and 道 the tree together now bend toward
      <b>×${UNCAPPED_RATE_CEILING}</b> and can never reach it. It is a bend and not a wall
      on purpose. A cultivator at a hard clamp has two hundred wasted points, and every
      氣 roll they find afterwards does nothing. A stat that silently stops working is
      worse than a stat that was never there.</div>
  </section>

  <section class="sec" id="wall">
    <h2><span class="h">守貢</span> The wall, and why it had to be a slope</h2>
    <p class="t">Bruno asked for it in one sentence: <i>"não um muro que torne impossivel
      mas que dificulte players 100% idle e premeie jogadores mais ativos."</i> Not a
      locked door. A climb that is harder for somebody who never plays and kinder to
      somebody who does.</p>

    <h3>Why the obvious lever could not do it</h3>
    <p class="t">The design was already there and it was not holding. A warden's power
      counts 妖丹 cores, so from the third realm a warden cannot be walked past by anyone
      who has never killed anything. Except that <b>the warden itself paid a full harvest
      of 材</b>. Nine warden kills funded the cores for the next nine warden kills, and
      the gate financed its own key. Measured, a cultivator who never tapped a beast
      reached the ninth realm holding 39 core levels against the 40 the last warden reads
      for. Through by a hair, on a loop that never asked them to play.</p>
    <p class="t">The obvious fix is to cut what a warden pays. It was swept across its
      whole range, and it turns out to have <b>no middle at all</b>:</p>
    <table>
      <tr><th>a warden pays…</th><th style="text-align:right">the waiter finishes</th></tr>
      <tr><td>everything (as shipped)</td><td style="text-align:right">day 142</td></tr>
      <tr><td>90%</td><td style="text-align:right">day 142</td></tr>
      <tr><td>80%</td><td style="text-align:right">day 142</td></tr>
      <tr><td>70%</td><td style="text-align:right"><b>never</b>, stuck in the eighth realm</td></tr>
      <tr><td>60%</td><td style="text-align:right"><b>never</b>, stuck in the seventh</td></tr>
    </table>
    <p class="t">A core's price climbs by a third every level and a tribute is flat, so
      the two curves cross once and the answer flips from <em>unchanged</em> to
      <em>stopped for ever</em> between two neighbouring settings. There is no number to
      tune. A lever with no middle cannot build a wall that only slows you down.</p>

    <h3>So the middle was built instead</h3>
    <p class="t">Two pieces, and neither works without the other.</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">守貢</b> <em>A warden pays a tribute, not a harvest</em>
        <i>${Math.round(WARDEN_TRIBUTE * 100)}% of what its depth is worth, and never the
        old-beast floor. A gate that pays for its own key is not a gate.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">凝丹</b> <em>And a core can always be forced out of raw qi</em>
        <i>${CORE_QI_RUNGS} rungs of the ladder you are standing on, for one level. It is
        a bad exchange and the screen says so, which is the whole point: it is the door
        that stops the wall being a stop, and it is priced so that using it hurts.</i></span></div>
    </div>
    <p class="t">The second one is what turns the cliff into a dial. Measured across it,
      with every other cultivator unchanged <b>to the day</b>:</p>
    <table>
      <tr><th>a condensed core costs…</th><th style="text-align:right">the waiter finishes</th>
          <th style="text-align:right">everybody who fights</th></tr>
      <tr><td>2.2 rungs</td><td style="text-align:right">day 171</td><td style="text-align:right">unchanged</td></tr>
      <tr><td>4 rungs</td><td style="text-align:right">day 188</td><td style="text-align:right">unchanged</td></tr>
      <tr><td><b>6 rungs (shipped)</b></td><td style="text-align:right"><b>day 217</b></td><td style="text-align:right">unchanged</td></tr>
      <tr><td>9 rungs</td><td style="text-align:right">day 253</td><td style="text-align:right">unchanged</td></tr>
      <tr><td>14 rungs</td><td style="text-align:right">day 316</td><td style="text-align:right">unchanged</td></tr>
      <tr><td>20 rungs</td><td style="text-align:right">day 392</td><td style="text-align:right">unchanged</td></tr>
    </table>

    <h3>What it actually asks for</h3>
    <p class="t">This is the number that matters, and it is deliberately small. 勤 the
      harness grew a cultivator whose day is the waiter's day exactly, one visit with no
      tower, no gear and no furnace, <b>plus two beasts before putting the phone down</b>.
      Two beasts a day is worth <b class="big">${BARELY_SAVES} days</b> off the climb.</p>
    <div class="rule"><b>And nothing was taken away.</b> The qi rate is untouched. Offline
      is untouched. Losing a fight still costs nothing, and the screen still says so. The
      only thing that changed is the price of a warden, paid in the one currency that has
      always come from playing. The one thing that was added is a way to pay it without
      playing, dearly.</div>
  </section>

  <section class="sec" id="salvage">
    <h2><span class="h">拆</span> Melting gear down</h2>
    <p class="t">Bruno, on the early game: <i>"uma nota para impulsionar ou melhorar
      pelo menos um pouco o fluxo de qi inicialmente. Salvage gear por exemplo, multiple
      salvage ou solo salvage, por algum qi."</i></p>
    <p class="t">The hole it fills turned out to be older than the thin qi flow. 藏 A full
      chest does not refuse a drop. It throws the worst piece on the floor to make room,
      so from the second realm onward the game has been <b>deleting gear and paying
      nothing for it</b>, one piece per drop for the rest of the run. Salvage is what
      that deletion should always have been.</p>
    ${MOCK_SALVAGE}

    <h3>早 Why the share falls as the realms rise</h3>
    <p class="t">The first version paid a flat share and it was swept across its whole
      range. It did <b>nothing at all</b> for the cultivators it was asked to help:</p>
    <table>
      <tr><th>a flat share of…</th><th style="text-align:right">once a day</th>
          <th style="text-align:right">casual</th><th style="text-align:right">active</th>
          <th style="text-align:right">every hour</th></tr>
      <tr><td>nothing</td><td style="text-align:right">108</td><td style="text-align:right">95</td><td style="text-align:right">72</td><td style="text-align:right">52</td></tr>
      <tr><td>0.05</td><td style="text-align:right">107</td><td style="text-align:right">95</td><td style="text-align:right">71</td><td style="text-align:right">49</td></tr>
      <tr><td>0.10</td><td style="text-align:right">107</td><td style="text-align:right">95</td><td style="text-align:right">70</td><td style="text-align:right">46</td></tr>
      <tr><td>0.20</td><td style="text-align:right">108</td><td style="text-align:right">95</td><td style="text-align:right">68</td><td style="text-align:right">43</td></tr>
      <tr><td>0.35</td><td style="text-align:right">108</td><td style="text-align:right">93</td><td style="text-align:right">66</td><td style="text-align:right"><b>38</b></td></tr>
    </table>
    <p class="t">Four kills a day is under one drop a day, so the two cultivators in the
      middle did not move by a single day at any setting. What moved was the hourly one,
      who melts thousands, and who already runs out of game first, so taking fourteen
      days off their climb is the opposite of what was wanted.</p>
    <div class="rule"><b>So the share is tilted, not tuned.</b> It falls geometrically
      from <b>${SALVAGE_SHARE_FIRST}</b> of a first-realm rung to
      <b>${SALVAGE_SHARE_LAST}</b> of a ninth-realm one. Generous where a piece of junk
      is a real fraction of a layer and there is nothing else to spend on. Mean where
      sheer volume could turn it into a second income. Shipped, the climb moves by
      a day for everybody and by four for the hourly cultivator.</div>

    <h3>What it is actually worth</h3>
    <p class="t">A 凡 Common against the layer being climbed when it drops, and then what
      the melt adds up to across a whole realm. Both read out of the game rather than
      argued about:</p>
    ${salvageRows}
    <div class="warn"><b>舊 煉 煉器 The three things it must never become.</b> It reads the
      <em>item's</em> realm and never the hunter's, so a second-realm 凡 pays a
      second-realm sum for ever. That is less than a millionth of a layer by the ninth,
      and farming weak beasts for qi is arithmetically impossible. Three 凡 melt for more than
      the one 靈 they fuse into, so 煉 stays a thing you do for the piece and never for
      the qi. And 煉器 refining is not counted at all, or 材 material would have a second
      door out into qi and the furnace would have two.</div>

    <h3>\u8cb7 Where the qi goes the moment it lands</h3>
    <p class="t">Bruno, having played with it: <i>"j\u00e1 tive imensos casos de salvage items
      e o meu qi resetar ou n\u00e3o contabilizar."</i> Traced in the running game, at the
      second realm's fourth rung: he stands at <b>60,059 qi</b>, melts four pieces for
      <b>24,000</b>, and the number on the screen reads <b>8,892</b>. He was paid, and he
      watched fifty-one thousand qi leave.</p>
    <p class="t">Nothing was taken. That rung costs 75,000 and <code>advance</code> has
      one rule it has always had: <b>a layer opens the instant its price is met</b>, and
      nobody chooses. A lump landing on a rung you can nearly afford buys it, and the bar
      starts again on the next one. It is the climb happening. The game simply never said
      so.</p>
    <div class="rule"><b>\u6eA2 So the melt says it before the tap, not after.</b> The button
      carries a second line, <em>opens 1 layer straight away</em> or <em>goes into the
      bar</em>, read from <code>buysWith</code>, which walks the same rungs
      <code>advance</code> walks with no clock in it, so the button cannot promise one
      thing and the ladder do another.</div>
    <div class="warn"><b>And the arithmetic under it was not exact either.</b> The rung
      loop was written for qi that arrives from the clock, and that qi lands on the price
      exactly, so setting the leftover to zero was right by accident and only by
      accident. Every other way qi arrives is a lump: \u62c6 a melt, \u5854 a tower floor, \u898b
      the first sight of a beast, \u56ca the opening purse. Those went through a branch that
      fed the shortfall back as negative time and <b>over-credited</b>: a 45,000 lump was
      accounted as 50,541. It carries the remainder across the rung now, and the tests
      check that every qi is either standing in the bar or spent on a rung.</div>
  </section>

  <section class="sec" id="idle">
    <h2><span class="h">閒</span> Where a realm's qi goes</h2>
    <p class="t">A claim that felt true, and was worth testing before anything was built
      on it. Bruno, on the early game: <i>"hoje os quatro upgrades enchem-se em ~9 horas
      e depois a barra só enche"</i>, and the answer that suggested itself was to give the
      first three realms something more to spend qi on.</p>
    <p class="t"><b>It would have been wasted work.</b> Every realm lets you buy the same
      share of its own ladder, to within six points:</p>
    <div class="cards two">
      <div class="card"><em>The eighteen qi levels a realm allows, against that realm's
        own nine rungs</em>
        <table style="margin-top:8px"><tr><th>realm</th>
          <th style="text-align:right">allows</th></tr>${allowedRows}</table></div>
      <div class="card"><em>And what that means</em>
        <p class="t" style="margin-top:8px">The first realm is not an outlier by a single
        point. A cultivator who checks in puts <b>44–62%</b> of their qi into upgrades and
        the bar gets the rest, which is the idle contract working rather than failing. And
        the four boxes are full at most 4–14% of a realm, only in the stretch right before
        the warden.</p></div>
    </div>

    <h3>頂 What the measurement did find</h3>
    <p class="t">A different thing in the same place, and it is the one worth knowing. A
      realm's bar <b>stops at its ninth rung</b>. There is no tenth, and 突破 the
      breakthrough needs the warden down first, so qi banks there with nowhere at all to
      go. For the lightest cultivator that is half of the first realm, and it used to be
      three quarters of a first realm twice as long:</p>
    <div class="cards three idlecards">${idleRows}</div>
    <p class="t" style="font-size:13px">
      <b>into 修</b> is the share of that realm's qi that went into upgrades rather than
      into the bar. <b>bar full</b> is the share of the realm spent at its ceiling, where
      the bar has stopped and qi banks until 突破 takes it. <b>守 out of reach</b> is the
      part of that with the warden still standing there unbeaten, which is the genuinely
      dead half and is dealt with below.</p>
<p class="t">It decays fast, and it decays with <em>showing up</em>: 50% of the first
      realm at one visit a day, 34% at three, 21% at six, and <b>nothing at all</b> from
      the fourth realm on for anybody. What is left of it is entirely the wait to be
      strong enough for a warden: a fight to prepare for rather than a bar to watch.</p>

    <h3>守 費 Both halves of it were gates, and both are gone</h3>
    <p class="t">The wait splits in two, and one half turned out to be a fault rather
      than a fact. A warden used to stand <em>while the bar was full</em>:
      <code>atCeiling</code>, which is the last rung plus the qi to pay for it. So a cultivator who arrived too
      weak, banked until they could afford the upgrades that would beat it, and then
      bought them, <b>watched the warden vanish</b>: the qi they had just spent was what
      was holding it there. The game took the fight away at the exact moment they did the
      right thing to win it, and asked for a whole rung back before offering it again.</p>
    <p class="t">Traced on somebody who opens the app once a day: at 24 hours they stand
      at the first realm's last rung with <b>63% against 妖狐 the fox</b> and no fox to
      fight. They leave the realm at 48. Every visit rhythm leaves it at 98%, so the
      warden was never the wall. The vanishing was.</p>
    <div class="rule"><b>守 It stands on the rung now, and does not walk off.</b> That
      change on its own cost <b>zero days</b> and took the first realm's dead stretch
      from 74% to 25%.</div>
    <p class="t">The other half was the toll. Having beaten the warden you still had to
      be <em>holding</em> the ninth rung's price to press 突破, and the breakthrough then
      burned it. I told Bruno that was a double charge and <b>it was not</b>: banking the
      rung, spending it on upgrades and banking it again is two payments for two
      different things. What it really was is a question about how much a realm costs,
      nine rungs or eight, and he answered it.</p>
    <div class="rule"><b>費 So the warden is the ninth rung.</b> Eight rungs of gathering
      fill a realm and beating the warden is the rest of it; 突破 asks for nothing else.
      銀 And the qi is no longer destroyed on the way out. It was destroyed because it
      <em>was</em> the payment, and with the payment gone, burning it would be a second
      toll dressed as a clean slate. So it carries, and every hour spent at a full bar is
      now qi kept rather than qi burned.</div>
    <p class="t">Measured, it takes <b>3 to 16 days</b> off the climb and takes most from
      the cultivators who show up least: 184 days to 168 for the one who never fights,
      107 to 95 for one visit a day, 71 to 67 for six. The first realm goes from
      <b>48 hours to 24</b> at one visit a day, and the 守 column above is now zero from
      the fourth realm up for everybody.</p>
    <div class="warn"><b>And it cost something, which is worth writing down.</b> 銀 The
      carry closed most of the gap in the 修 column. A light visitor used to put 13% of
      the first realm's qi into upgrades, against a frequent one's 44%, because the
      ladder took it before they could reach it. Now it is 61% against 66%, because the qi they could
      not intercept reaches them at the next breakthrough instead. So the ladder's
      interception is <b>no longer one of the reasons playing beats waiting</b>. The
      reasons that are left all need a tap: 材 material, 塔 the tower, 爐 the furnace and
      器 the gear. The gap itself is unmoved, 2.5x between never fighting and playing
      actively against 2.6x before, but it now rests entirely on them.</div>

    <h3>梯 And the mechanism underneath all of it, which is one line</h3>
    <div class="rule"><b>A layer opens by itself the moment the qi reaches its price.</b>
      Nobody chooses. A cultivator who visits once a day has the ladder take the qi five
      or ten times between visits, and arrives holding a fraction of a rung. One who
      visits six times intercepts far more of it.</div>
    <p class="t">That is not a fault to be repaired, and it is written down here so that
      it stops being rediscovered as one. It used to be the largest single reason that
      playing beats waiting, and 銀 the carry above has since taken most of that away.
      That is the honest correction to this paragraph, rather than leaving it standing.</p>
    <p class="t">Two other candidate fixes were measured and both were dropped: more to
      spend on in the early realms (the share table at the top says there is already as
      much as anywhere). And opening 圍 the drive at the first kill rather than the tenth,
      which moved one realm by one point. A cultivator who visits once a day cannot spend
      qi while the app is shut, whatever is on the screen.</p>
  </section>

  <section class="sec" id="read">
    <h2><span class="h">\u8a3a</span> Reading a cultivator from the save they sent you</h2>
    <p class="t">Every improvement in this repository came from one person playing and
      saying what they felt: <i>"n\u00e3o encontro o tree"</i>, <i>"a primeira hunt n\u00e3o d\u00e1
      nada"</i>, <i>"o qi resetar"</i>, <i>"o qi per sec est\u00e1 sempre a alterar"</i>. That is
      the best signal this project has, and it runs through exactly one phone. The moment
      anybody else plays it stops working: somebody plays for twenty minutes, stops, and
      nothing comes back but silence.</p>
    <div class="rule"><b>There is no account and no cloud, and there should not be
      one.</b> What there is, is \u51fa the save the player already holds. The corner
      menu hands them the whole thing as text with a copy button. A tester sends that,
      and <code>npm run read</code> reads the run out of it. It reads and prints; it never
      writes anything and it never asks the network.</div>
    <h3>\u7a7a The section it exists for</h3>
    <p class="t">Where they got to and how they compare to the eight modelled
      cultivators is worth knowing. <b>What is open to them and has never once been
      touched</b> is worth building the tool for. Read off a fabricated tester who
      reached the fifth realm in eleven days:</p>
    <div class="mk"><pre style="margin:0;font-size:12.5px;line-height:1.6;white-space:pre-wrap;color:var(--faint)">\u7a7a what is open to them and never been touched

   \u9053 the tree, open since the \u7bc9\u57fa Foundation realm, not one node, 21 \u9053 sitting unspent
   \u52e2 no stance taken, open since the \u7bc9\u57fa Foundation realm, 9 to choose from
   \u5854 the tower never climbed, open since the \u5316\u795e Spirit Severing realm
   \u570d the drive, 4 beasts are \u719f Known and could be driven instead of tapped

\u5224 the one line

   nothing was in the way, 4 boxes lit and 13 beasts in reach, and they stopped
   anyway, with 4 systems open and never once used. That list is where to look first.</pre>
      <p class="cap">"Reached the fifth realm on day eleven and never opened \u9053" is a
      sentence somebody can act on. "I played for a bit and stopped" is not.</p></div>
    <div class="rule"><b>\u5224 There are only two interesting shapes.</b> Either the game
      had run out of things for them, nothing to buy and nothing to fight, or it had
      not, and they left anyway. The second is the harder finding and the more useful
      one, and the untouched list is the first place to look for why.</div>
  </section>

  <section class="sec" id="wait">
    <h2><span class="h">\u5f85</span> The home screen had nothing to press four visits in five</h2>
    <p class="t">Measured, six visits a day, counting what \u4fee Cultivate could actually
      offer at each one:</p>
    <table>
      <tr><th>realm</th><th style="text-align:right">boxes lit</th>
          <th style="text-align:right">nothing to press</th>
          <th style="text-align:right">all four \u6eff</th>
          <th style="text-align:right">dearer than the rung</th></tr>
      <tr><td>2</td><td style="text-align:right">3.6</td><td style="text-align:right">0%</td><td style="text-align:right">0%</td><td style="text-align:right">0.00</td></tr>
      <tr><td>4</td><td style="text-align:right">1.1</td><td style="text-align:right">52%</td><td style="text-align:right">0%</td><td style="text-align:right">0.27</td></tr>
      <tr><td>5</td><td style="text-align:right">0.5</td><td style="text-align:right">68%</td><td style="text-align:right">0%</td><td style="text-align:right">0.90</td></tr>
      <tr><td><b>7</b></td><td style="text-align:right"><b>0.2</b></td><td style="text-align:right"><b>84%</b></td><td style="text-align:right">0%</td><td style="text-align:right"><b>1.12</b></td></tr>
      <tr><td>9</td><td style="text-align:right">0.3</td><td style="text-align:right">80%</td><td style="text-align:right">0%</td><td style="text-align:right">0.81</td></tr>
    </table>
    <p class="t"><b>Never because the boxes were full.</b> That column is zero the whole
      way up. Always because nothing was affordable, and the last column is why.</p>
    <div class="rule"><b>\u968e A layer opens the instant its price is met, so the rung you
      stand on is the ceiling on the qi you may ever hold.</b> An upgrade dearer than
      that rung cannot be saved for at all, not slowly and not ever: the bar takes the
      qi first, every time. It becomes affordable by <em>climbing</em>, when the rungs
      themselves grow dearer than it. \u529f\u6cd5 costs a whole rung by design, so from the
      fourth realm on about one of the three is in that state at any moment.</div>
    <p class="t">That is the economy working, not a fault in it. The fault was leaving
      the player to infer it from a price they watched never arrive, which is not
      something anybody infers. They conclude the game is broken, or that they are
      playing it wrong.</p>
    <div class="rule"><b>So every price that cannot be paid now says which of the two it
      is.</b> <code>in 40m</code> when the rung you are on can hold it and gathering will
      do; <code>after 4 more layers</code> when it cannot, with one line underneath
      saying why. Read off the real sixth realm: 5.95B one rung up, 12.5B four rungs up,
      8.22B two rungs up. The screen went from three dead prices to three answers, and
      the economy did not move by a single qi.</div>
    <div class="rule"><b>\u521d And it lands hardest where it matters most.</b> Driven from
      a brand new save with the clock wound forward, the tenth minute of 九境 is a screen
      with <b>nothing affordable on it</b>. Measured, 0 of 4 boxes lit, and still 0 at
      half an hour. It now reads <code>763 qi \u00b7 in 8 min</code>,
      <code>1090 qi \u00b7 in 14 min</code>, <code>491 qi \u00b7 in 4 min</code>. A dead first ten
      minutes became a schedule, which is the difference between a game that is idling
      and a game that looks broken.</div>
    <p class="t">The countdown rides the <b>standing</b> rate and not the one \u5165\u5b9a is
      paying at that moment, on purpose: the sitting ends after a quarter of an hour, so
      a countdown riding on it would promise a minute that arrives at four. A player who
      is sitting gets there sooner than the screen said, which is the only direction this
      is allowed to be wrong in.</p>
  </section>

  <section class="sec" id="huntlist">
    <h2><span class="h">\u72e9</span> Twenty-five buttons that all said 98%</h2>
    <p class="t">Measured over a whole climb, six visits a day, counting every beast the
      hunt screen offered at every visit and what its odds actually said:</p>
    <table>
      <tr><th>realm</th><th style="text-align:right">beasts shown</th>
          <th style="text-align:right">over 90%</th>
          <th style="text-align:right">a real question</th>
          <th style="text-align:right">finished</th></tr>
      <tr><td>1</td><td style="text-align:right">3.0</td><td style="text-align:right">53%</td><td style="text-align:right">7%</td><td style="text-align:right">0.0</td></tr>
      <tr><td>2</td><td style="text-align:right">5.1</td><td style="text-align:right">92%</td><td style="text-align:right">6%</td><td style="text-align:right">0.0</td></tr>
      <tr><td>3</td><td style="text-align:right">7.8</td><td style="text-align:right">99%</td><td style="text-align:right">1%</td><td style="text-align:right">0.0</td></tr>
      <tr><td>5</td><td style="text-align:right">13.6</td><td style="text-align:right">100%</td><td style="text-align:right">0%</td><td style="text-align:right">3.0</td></tr>
      <tr><td>7</td><td style="text-align:right">19.6</td><td style="text-align:right">100%</td><td style="text-align:right">0%</td><td style="text-align:right">7.3</td></tr>
      <tr><td><b>9</b></td><td style="text-align:right"><b>25.4</b></td><td style="text-align:right"><b>100%</b></td><td style="text-align:right"><b>0%</b></td><td style="text-align:right"><b>13.0</b></td></tr>
    </table>
    <p class="t">From the third realm on <b>nothing on that screen is ever a question</b>,
      and by the ninth it is twenty-five rows of 98% with half of them already finished.
      This page's own notes said it feared exactly that screen, and the sort that put the
      unfinished ones on top was only half an answer. A list of twenty-five is a list
      nobody reads, however well it is ordered.</p>
    <div class="rule"><b>The odds were never the point, and the game already has a
      difficulty ladder.</b> \u5854 The tower reads your own power at every floor and has no
      top; the bestiary is a <em>collection</em>, priced as a share of a reference
      cultivator who owns nothing but levels. Anybody who wears gear and walks the tree
      is far above that reference, so every common is winnable and always was meant to
      be. What was wrong was a screen presenting a collection as if it were a series of
      fights.</div>
    <div class="rule"><b>\u5b8c So the finished ones fold.</b> One line saying how many and
      what they are still good for. \u6750 Material, and \u570d the drive to take it without
      tapping. It opens if you want it. The ninth realm's screen goes from
      <b>26 cards to 14</b>, and what is left is every beast with a mark still in it.</div>
  </section>

  <section class="sec" id="rate">
    <h2><span class="h">\u6c23</span> Why the qi a second would not stand still</h2>
    <p class="t">Bruno, watching the number: <i>"verifiquei que o qi per sec est\u00e1 sempre a
      alterar. N\u00e3o faz muito sentido, n\u00e3o deveria ser um valor fixo consoante stats?"</i>
      He was right, and the game agreed with him without ever telling him.</p>
    <p class="t">There are <b>two</b> numbers and the screen was showing their product
      under one name. The <b>standing</b> rate is fixed by what has been climbed and what
      has been bought: ${LAYERS} layers at \u00d7${LAYER_BONUS} each, the upgrades, the
      gear, the tree. It does not move unless you move it. \u5165\u5b9a <b>the sitting</b> is the
      other one: it climbs from \u00d71 to \u00d7${FOCUS_MAX} over ${FOCUS_RAMP / 60} minutes with
      the app open, holds, and ends after ${FOCUS_HOLD / 60} minutes. So the one number on
      the screen rose for three minutes, sat still for twelve, and then fell to a third
      of itself while the player watched, with nothing beside it.</p>
    <div class="rule"><b>The standing rate leads now, and the sitting rides alongside
      it.</b> <code>+124 qi / s standing</code>, a \u5165\u5b9a \u00d73.0 badge, and
      <code>373 qi / s now</code> underneath. The fixed number is the one the eye rests
      on and the moving one says what is moving it, which is the rule every other pair
      of numbers in this game already followed.</div>
    <div class="rule"><b>And when it ends, the screen says so.</b> A rate that falls by
      two thirds with nothing beside it reads as something taken away, and the one
      promise 九境 makes is that nothing ever is. The line names the standing rate it
      returned to, says the sitting was extra, and says another one begins when you come
      back. Which is also true: leaving is what starts the next one.</div>
    <div class="warn"><b>\u9418 Found with a clock, not with a stopwatch.</b> The ending is
      ${FOCUS_HOLD / 60} minutes in, so nobody was ever going to catch it by watching.
      Playwright's <code>page.clock</code> drives the built game's own clock forward, and
      both states, the sitting at \u00d73 and the line after it passes, were read off the
      real screen in a second and a half.</div>
  </section>

  <section class="sec" id="cores">
    <h2><span class="h">\u4e39</span> The coin the hunting paid, and what it could buy</h2>
    <p class="t">Bruno, halfway up the second realm: <i>"dei max em todos os monstros
      dispon\u00edveis e vou a meio do realm, n\u00e3o existe bem gasto nem incentivo para mais
      nada."</i> Measured, it was worse than that reads. \u6750 material is the one thing
      hunting pays, \u5996\u4e39 cores are the only thing that buys it, and the cores cap was
      <b>the realm's cap, the same as the three bought with qi</b>. So the cap was reached
      early and every kill after it earned a coin with nothing behind it.</p>
    <p class="t">For a cultivator who actually taps the button, before the change:
      <b>eight per cent</b> of what the hunting paid was ever spendable: 3360 \u6750
      earned in the second realm against 266 spent, and 585,500 against 9611 in the
      fourth. The dead stretch ran 75% of the second realm, 95% of the third and 98% of
      the fourth.</p>
    <div class="rule"><b>\u5996\u4e39 runs ${CORE_CAP_EXTRA} levels past the realm's cap now, and
      nothing else does.</b> The other three are bought with qi, which arrives at a rate
      the game controls, so their cap is what stops a spender finishing the climb in
      three days. Material is earned <em>by hand</em>: it cannot be waited for, it never
      touches the qi rate, and its own price already climbs 35% a level against a gain of
      8%. The price was always the wall. The cap was a second wall in front of it, and it
      was the one that bound.</div>
    <h3>\u5f8c What it reads as, on the screen</h3>
    <p class="t">The same save either way: three boxes at \u6eff full, 3360 \u6750 in the pocket
      and nothing to press, against the same three boxes full and a fourth that is still
      asking. Drawn with the game's own row and the game's own table.</p>
    ${MOCK_CORES}
    <h3>\u5ea6 And measured after, which is the half that decides it</h3>
    <div class="cards two">${coreRows}</div>
    <p class="t" style="font-size:13px">The dead stretch is <b>0% in every one of the
      first three realms, for every habit</b>, including the one who taps it out. What it
      costs the climb is one to three days for somebody who hunts and <b>nothing at all</b>
      for somebody who does not: ${WAITER.days.toFixed(0)} days for the cultivator who
      never fights, either way.</p>
    <div class="warn"><b>\u5b9a And it is a flat number rather than a multiplier, which is
      what the first attempt got wrong.</b> Doubling the cap fixed the second realm and
      broke the ninth. Above the fifth realm material is no longer earned by hand at all,
      because \u5854 the tower pays it in bulk. A doubled cap there is not a wall handed
      back to the price. It is no wall. The endgame's own test caught it in one run, with
      walkover crossings going from 5 of 40 to <b>14 of 40</b> against a rule of at most
      10. Flat, the same ${CORE_CAP_EXTRA} levels are a doubling where the hole is and a
      fraction of a cap where the tower is filling your pockets.</div>
    <div class="rule"><b>\u5ee3 And two realms' worth was not enough either.</b> At two it
      cleared the first three realms and left the rest of the climb dead again for
      somebody who really taps: 22% of the fourth, 41% of the fifth, <b>70% of the
      seventh</b>. Swept: three realms' worth takes it to <b>zero in every realm of the
      game</b>, four and five change nothing more, and the endgame does not move at all
      at 5 of 40 walkover crossings for two realms of room, for three and for four. Three is simply the
      smallest number that finishes the job, which is the only reason it is the number.</div>
  </section>

  <section class="sec" id="heavens">
    <h2><span class="h">境外</span> Beyond the ninth realm</h2>
    <p class="t">The climb ends at 渡劫 the ninth realm and 劫 the tribulation runs on for
      ever after it: a pool that refills in ${MARK_DAYS} days, a Dragon that comes back
      ${TRIBULATION_CHALLENGE}x heavier, a mark worth ${(1 + TRIBULATION_GAIN).toFixed(2)}x.
      A fine engine with nothing in it: <b>forty crossings against one animal called 龍</b>,
      told apart only by the number beside it.</p>
    <p class="t">So the ladder continues, and a heaven is exactly what a realm is, namely a
      name, a colour, a thing standing at the end of it, and something it opens. One
      every ${MARKS_PER_HEAVEN} crossings, which at the ${ENDGAME_PACE} days a crossing
      settles at is a little over a week each.</p>
    ${heavenRows}
    <div class="rule"><b>What a heaven opens, and what it deliberately does not.</b>
      ${LEVELS_PER_HEAVEN} more levels of 劍訣 and 妖丹, the two upgrades that buy power,
      and <em>nothing at all</em> on 功法 or 吐納. That restriction is not tidiness; it is
      the whole lesson of the first version, which opened room on all four.</div>
    <p class="t">The rate ones look safe, and that is what makes them dangerous.
      雷池 the pool is measured in days of your own gathering, so a heaven that multiplies
      the rate multiplies the pool with it and <b>the clock holds perfectly</b>. What does
      not ride the rate is every price written against the ladder, and the furnace is the
      largest of them. A rate six and a half times bigger makes every pill six and a half
      times cheaper in real terms, and pills are uncapped power. Measured, on the endgame
      harness, forty crossings:</p>
    <table>
      <tr><th>a heaven opens…</th><th style="text-align:right">walkovers (over 90%)</th>
          <th style="text-align:right">days for 40 marks</th></tr>
      <tr><td>nothing, the endgame as it was</td><td style="text-align:right">4 of 40</td><td style="text-align:right">119</td></tr>
      <tr><td>${LEVELS_PER_HEAVEN} levels of all four</td><td style="text-align:right"><b>28 of 40</b></td><td style="text-align:right">117</td></tr>
      <tr><td><b>${LEVELS_PER_HEAVEN} levels of 劍訣 and 妖丹 only (shipped)</b></td>
          <td style="text-align:right"><b>5 of 40</b></td><td style="text-align:right">137</td></tr>
    </table>
    <div class="warn"><b>立 And the Dragon is handed the same step.</b> Six levels of 劍訣
      and six of 妖丹 are worth ×${heavenStep().toFixed(2)} power, so that figure is read
      out of the upgrade table and multiplied into the next Dragon's anchor at the moment
      the heaven opens. It cannot drift from what the player actually receives, because it
      is computed from the thing the player receives. A heaven raises both sides: what it
      really gives is a name, an animal, and four boxes that stop saying 滿 for the rest of
      the game.</div>
  </section>

  <section class="sec" id="clock">
    <h2><span class="h">曆</span> The content clock</h2>
    <p class="t">Bruno: <i>"o ideal seria haver conteudo para 3 meses para o lançamento
      para dar tempo de planearmos expansões."</i> Three months is thirteen weeks. So the
      question is not how long the climb takes. It is <b>when the last new thing
      arrives</b>, which is a different number and nobody had measured it.</p>
    <p class="t">Counting every named thing a player meets, a system opening, a beast, a
      stance, an art or a lineage of gear, against the days the ${ACTIVE_NAME} cultivator
      actually reaches each realm:</p>
    <table>
      <tr><th>week</th><th style="text-align:right">new things</th>
          <th style="text-align:center">the week</th><th>&nbsp;</th></tr>
      ${CLOCK_ROWS}
    </table>
    <p class="t">The first reading of this table had three uncomfortable answers in it,
      and two of them have been dealt with since:</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">前</b> <em>Half the game is still spent in week one</em>
        <i>Four of the nine realms arrive by day ${CLOCK_R4}, and that is left alone on
        purpose. Slowing the opening of an idle game to protect its ending is how you
        lose the players who would have reached the ending.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">出</b> <em>A realm no longer empties itself in its first minute</em>
        <i>It used to hand over all three of its beasts at the breakthrough, and the
        eighth realm is ${CLOCK_R8} days long. Its commons now walk out at layers
        ${COMMON_LAYERS.join(', ')}, about a quarter and two thirds of the way through,
        so the weeks that read as blank above have something in them. The first realm is
        the exception and keeps all three, because its beasts are already spaced by
        difficulty and there is nothing else in it to look at.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">境外</b> <em>And the summit is no longer the end of the content</em>
        <i>The climb finishes on day ${CLOCK_DONE}; the first heaven opens on day
        ${CLOCK_FIRST_HEAVEN} and the ninth on day ${CLOCK_LAST}. 劫 the tribulation still
        runs for ever, but for ${HEAVENS.length} heavens it is running <b>toward</b>
        something with a name.</i></span></div>
    </div>
    <div class="rule"><b>Three months was the ask, and it is met with room to spare.</b>
      Thirteen weeks is day 91; the last named thing in the game now arrives on day
      ${CLOCK_LAST}. Everything in this table is read off the same two harnesses the rest
      of the page is written from, so it moves when the game moves.</div>
    <p class="t">期 And the weeks in between. Inside the thirteen,
      ${CLOCK_QUIET.length === 0 ? 'every week names something new'
        : `${CLOCK_QUIET.length === 1 ? 'week' : 'weeks'} ${CLOCK_QUIET.join(' and ')}
      ${CLOCK_QUIET.length === 1 ? 'names' : 'name'} nothing new, because a heaven comes
      every ten or eleven days and a week is seven`}. That is what 期 the week is for: a
      quarry, a herb and a room of 秘境 that turn every Monday whether anything arrives or
      not. It is on purpose that nothing more was added to fill them. Content held back is
      content an expansion can bring.</p>
  </section>

  <section class="sec" id="ladder">
    <h2><span class="h">階</span> The ladder</h2>
    <p class="t">The climb is <b>${LAYERS} rungs</b>, nine to a realm, and every rung costs
      more than the one below it. Three numbers describe the whole mountain: the first rung
      costs <b>${num(LADDER_FIRST)}</b> qi, each rung is <b>${LADDER_GROWTH_FIRST}x</b> the
      last at the foot, and <b>${LADDER_GROWTH_LAST}x</b> at the summit. Nothing else is
      typed; every other price in the game is a share of one of these.</p>
    <p class="t">The growth never falls below what the qi rate itself grows by, so the
      climb never speeds up: <b>every realm is longer than the one before it, all nine of
      them.</b></p>
    <table>
      <tr><th>realm</th><th style="text-align:right">first layer</th>
          <th style="text-align:right">ninth layer</th><th style="text-align:right">the realm</th>
          <th style="text-align:right">level cap</th></tr>
      ${ladderRows}
    </table>
    <div class="rule"><b>How the ${TARGET_DAYS} days is measured.</b> Against a cultivator
      who <em>spends</em>, who opens the app, buys whatever they can afford, and closes it
      again. The earlier curve was measured against one who never spent a single qi, and
      against somebody playing the game as written that same curve took
      <b>three days</b>, not ninety. The ladder is the same for everybody; what moves is
      how much of it a habit skips, and 勤 above has that table.</div>
  </section>

  <section class="sec" id="cap">
    <h2><span class="h">上限</span> The cap</h2>
    <p class="t">A realm holds <b>${LEVELS_PER_REALM} levels of each upgrade</b> and not one
      more. The ninth holds ${levelCap(9)}. When they are full the box turns gold, says
      <b class="cjk">滿</b>, and the only way to hold more is to climb.</p>
    <p class="t">It is the wall the game had no version of. Without it the rate upgrades pay
      for the rate upgrades and nothing anywhere says stop. It also says something true: a
      body only holds so much. To hold more, raise the realm.</p>
    <p class="t">The second half of the same idea is that <b>a level's price rides the
      mountain</b>. The nth level costs a share of the rung it belongs to, so the last level
      a realm allows only becomes affordable near the end of that realm. Measured, the
      buying now spreads across 95% of every realm instead of its first hour.</p>
  </section>

  <section class="sec" id="qi">
    <h2><span class="h">氣</span> Qi, and the four things it buys</h2>
    <p class="t">Qi gathers at a rate, the rate fills a layer, and a filled layer costs
      nothing but time. Two upgrades make it come faster and two make you stronger. None of
      them is ever lost, and all four are capped by the realm.</p>
    <div class="rows">${upgradeRows}</div>
    <p class="t">材 <b>Material</b> is the other currency and it cannot be waited for. It
      comes from killing things: a tower floor pays it once, a beast pays
      ${pc(HUNT_SHARE)} of that every time it dies.</p>
    <div class="rule"><b>囊 And the first minute was bought for ${num(OPENING_PURSE)} qi.</b>
      Played from a clean save, the opening was <b>three minutes and forty-five seconds</b>
      of nothing: 1 qi a second, the cheapest box on the screen at
      ${num(upgradeCost(newState(0), 'pills'))}, and the words SPEND YOUR QI standing over
      three buttons that could not be pressed. Not a slow opening, an opening with no
      decision in it. So a cultivator now begins holding ${num(OPENING_PURSE)} qi, which is
      nothing against a climb measured in quintillions and gone inside the first hour. It
      sits just under the first rung at ${num(ladderAt(0))} on purpose: at or above it the
      ladder would swallow the purse on the first tick. The player would then watch a layer
      open by itself instead of choosing. Below it, the bar starts nine tenths full and the
      game's first question is the same one it asks in the ninth realm: <em>spend it, or
      let it carry you up?</em></div>
  </section>

  <section class="sec" id="realms">
    <h2><span class="h">境</span> The nine realms</h2>
    <p class="t">Nine names out of cultivation fiction, nine ground pigments walking from
      jade through gold leaf and cinnabar to imperial violet, and a drawing that gains
      something at every one. 畫 the paintings above show the landscape each one is. The
      warden of a realm bars the breakthrough; beating it opens 突破, and pressing 突破 is
      what takes it.</p>
    <div class="ladder">${realmRungs}</div>
    <div class="cards three">
      ${REALMS.map((r) => `<div class="card" style="--hue:${r.colour}">
        <b class="cjk">${r.han}</b> <em>${r.name}</em>
        <i class="faint" style="display:block;margin-top:4px">${r.gains}</i></div>`).join('')}
    </div>
  </section>

  <section class="sec" id="beasts">
    <h2><span class="h">狩</span> The beasts</h2>
    <p class="t">${BEASTS.length} of them: three commons and one warden to a realm, from
      vermin in the first to a dragon in the ninth. Commons are free hunting and can be
      fought as often as you like. Wardens die once.</p>
    <div class="beastgrid">${beastGrid}</div>
    <div class="cards">${beastNames}</div>
  </section>

  <section class="sec" id="seen">
    <h2><span class="h">見</span> The first sight of a beast</h2>
    <p class="t">A kill paid 材 material, material bought 妖丹 cores, and all of it was
      invisible next to a qi bar that is the only number the screen ever shows moving.
      The player's whole attention is on qi, and combat never touched it.</p>
    <p class="t">So the <b>first</b> kill of every beast pays qi, once, for ever, inside
      the 見 Seen mark that until then only filled in a page. The share is divided by the
      realm on purpose: flat, it took twenty-two days off a hundred-and-twelve-day climb,
      which answers a complaint nobody made.</p>
    <table><thead><tr><th>Realm</th><th>Beast</th><th class="n">Pays</th>
      <th class="n">Of a rung</th><th>Warden</th></tr></thead><tbody>${
      [1, 3, 5, 7, 9].map((r) => {
        const b = commonsOf(r)[0];
        const rung = ladderAt((r - 1) * LAYERS_PER_REALM + 3);
        return `<tr><td>${r}</td><td><b class="cjk">${b.han}</b> <i>${b.name}</i></td>
          <td class="n">${num(seenBounty(b))}</td>
          <td class="n">${Math.round(seenBounty(b) / rung * 100)}%</td>
          <td><i>nothing</i></td></tr>`;
      }).join('')}</tbody></table>
    <div class="rule"><b>守 A warden pays nothing, and the reason is 突破 rather than
      balance.</b> Breaking through sets the qi to nothing, and breaking through is what
      every cultivator does the second the warden falls. A prize the next tap destroys is
      a trap for anybody who notices.</div>
    <div class="rule"><b>舊 And an old beast pays what it is worth to you.</b> 澤蛙 the
      frog of the first realm paid 2 材 and the ninth realm's paid ${num(loot(commonsOf(9)[2]))},
      so going back to finish a beast you had left behind was a hundred fights for a
      rounding error. A beast now pays at least a quarter of what the weakest common of
      <i>your own</i> realm pays: 山鼠 the rat goes from 1 材 for ever to ${OLD_RAT} at the
      ninth. A quarter, so hunting at the top of your reach is still plainly better, and
      going back is no longer charity.</div>
  </section>

  <section class="sec" id="record">
    <h2><span class="h">錄</span> The record</h2>
    <p class="t">狩 Hunt had a real problem. By the fifth realm it was fifteen buttons all
      reading 98%, and only the last one was worth pressing. Every beast below your realm
      had fixed power, paid less material and dropped nothing you wanted. Thirty-six
      animals were drawn and twenty-seven of them stopped existing the moment you climbed
      past them.</p>
    <p class="t">So the kills already sitting in the save mean something, and they mean it
      from the first one rather than from the sixth realm. Every beast carries three
      marks:</p>
    <div class="rows">${markRows}</div>
    <p class="t">A finished record, all ${BEASTS.length} beasts at ${MARKS[MARKS.length - 1]}
      kills each, is <b>×${ceiling.material.toFixed(2)}</b> material and
      <b>×${ceiling.power.toFixed(2)}</b> power. Worth having, never worth grinding for in
      one sitting, and reached by somebody who has been hunting for months rather than by
      somebody who farmed the first rat. ${(KNOWN_MATERIAL * 100).toFixed(0)}% and
      ${(MASTERED_POWER * 100).toFixed(0)}% a beast.</p>
    <div class="rule"><b>Neither mark touches the qi rate.</b> A mark is a hundred taps or
      it is nothing, so if the record paid in gathering it would be the one uncapped thing
      in the game that pays for waiting. It pays in material and in power, and the list
      re-sorts itself: a beast with a mark still in it rises, and one you have finished
      with sinks and goes quiet.</div>
    <div class="rule"><b>圖鑑 And a realm you have finished is worth a 道 point.</b>
      From the sixth realm, a realm whose four beasts are all 熟 Known pays one. The bar
      was set at 通 Mastered first and measuring it killed the idea: across five
      cultivators and ten thousand fights, <b>not one realm was ever finished</b>, and
      not one at ten kills each either. The reason is a fact about the game rather than
      about the harness. A player hunts the strongest beast they can beat, because that
      is the one that pays, so a realm's weakest animal is killed once for its 見 mark
      and then never again. Nothing had ever given a reason to go back for it. Forty
      fights against animals you outclass is that reason, and the test fails if any of
      the five habits ever finishes a realm by accident.</div>

    <h3>示 And the game always says what to do next</h3>
    <p class="t">From the third realm a warden will not fall without 妖丹 cores, and a
      player who has never opened 狩 Hunt meets that wall. They lose a fight they cannot read,
      and has nothing anywhere telling them why. 修 Cultivate carries one line, computed
      from the state, that names the thing actually blocking them. The material they are
      short of, the level they can already afford, the empty 訣 sequence. Then it takes
      them to the screen that fixes it.</p>
    <div class="rule"><b>續 And it is never silent, which is the harder half.</b> For a
      long time that line answered only <em>what is blocking you</em> and said nothing at
      all the rest of the time, which is most of the game and all of the quiet
      stretches a player actually leaves over. A sentence that only speaks when you are
      stuck teaches a player that not being stuck means there is nothing to do. So below
      the blocking lines there is always another. A beast you can take and the mark it
      still owes you. A level you can afford right now. A beast you cannot take yet
      <em>and the power it stands at against yours</em>, or the next thing the mountain
      will hand over and the realm that hands it. A target with a number on it is
      gameplay. An empty line is not. It is checked the only way a promise like that can
      be: 324 places on the mountain, every realm, every layer, four depths of
      investment, and not one of them with nothing to say.</div>
    <p class="t">Walking the first realm, it reads:</p>
    <table>
      <tr><th>when</th><th>示</th></tr>
      <tr><td class="n">0 min</td><td>山鼠 stands at 力 2.4. You are at 力 1. Every level and every layer closes that.</td></tr>
      <tr><td class="n">11 min</td><td>山鼠 is within reach at 71%. 1 more kill earns its 見 mark.</td></tr>
      <tr><td class="n">1.6 h</td><td>野犬 is within reach at 85%.</td></tr>
      <tr><td class="n">3.5 h</td><td>澤蛙 is within reach at 98%.</td></tr>
      <tr><td class="n">6.9 h</td><td>Nothing left to buy in this realm. 築基 Foundation opens the next thing to spend on.</td></tr>
    </table>
  </section>

  <section class="sec" id="combat">
    <h2><span class="h">戰</span> Combat</h2>
    <div class="stage">
      <span class="sc">${arenaScene(6)}</span>
      <div class="duel">
        <span class="you">${portrait({ realm: 6, pulse: 0.4 })}</span>
        <span class="mid cjk">對</span>
        <span class="foe">${icon(wardenOf(6).icon, 64)}</span>
      </div>
    </div>
    <p class="t">The whole fight is settled the moment you press the button, and the screen
      plays it back. <b>A round is two beats</b>, not one: you strike, then the beast
      answers, so a blow lands alone and you can see whose it was. That is also why losing
      can cost nothing. There is nothing to lose that has not already happened.</p>
    <p class="t"><b>氣運 Form.</b> Each side rolls once, before any blow, for
      ±${pc(FORM)} of its power. Blow-by-blow noise averages away over ten rounds, so
      whoever had more power won every single time. One roll per fight does not average
      away, and that is what makes an underdog worth trying.</p>
    <p class="t"><b>The odds on screen are counted, not curved.</b> The number is 41 whole
      fights on spread seeds, won and counted. A sigmoid over the power ratio cannot see
      a stance that halves what you take or an art that triples a strike. The old one
      cheerfully promised 34% on fights the build lost a hundred times out of a hundred.</p>
    <div class="rule"><b>What a warden asks for.</b> Exactly the power of a cultivator who
      has filled the realm's cap and brought nothing else. So the fight is a coin flip
      for somebody with the levels and nothing more. The stance, the sequence, the gear,
      the cores and the tree are what turn the coin over. Commons stand at
      ${[0.45, 0.62, 0.84].map((s) => pc(s)).join(', ')} of the realm's reference, which is
      a cultivator ${REFERENCE_BELOW} levels short of the cap.</div>
    <div class="rule"><b>初 Except the first realm, which is spaced against the player.</b>
      Every realm is entered weak. Measured, a cultivator arrives at 25%, 23%, 16%, 11%
      and 7% of the realm they are climbing into, and the first at 5%. That is one
      pattern, not an exception. What makes the first realm different is that it is the
      only one with <em>nothing else in it</em>: from the second there is gear to find, a
      stance to choose, a record filling, a tower, a tree, and the wait is furnished. In
      the first there is a bar and three boxes. At the standard spacing the first fight a
      player could win arrived <b>two hours and six minutes</b> in, and the true odds
      before it were not small. They were 0.0%, flat, the whole way. Combat there was a
      step, not a ramp. So the first realm's three commons stand at
      ${[0.12, 0.35, 0.70].map((x) => pc(x)).join(', ')} instead, and were measured back:
      ${commonsOf(1).map((c) => `${c.han} 力 ${beastPower(c).toFixed(1)}`).join(', ')},
      winnable at <b>12 minutes</b>, <b>1.7 hours</b> and <b>3.6 hours</b>. The warden
      does not move: a warden is always a filled realm cap.</div>
  </section>

  <section class="sec" id="build">
    <h2><span class="h">勢</span> The build: stances and arts</h2>
    <p class="t">Both decisions are made <b>outside</b> the fight, because an idle game that
      needs you present at the fight stops being one.</p>
    <h3>勢 Stances, one, always on. You hold the stance of every realm you have reached.</h3>
    <div class="rows">${stanceRows}</div>
    <h3>訣 Arts, ${SEQUENCE_SLOTS} in an order, one firing each round, then looping.
      A warden hands over its own art when it falls.</h3>
    <div class="rows">${artRows}</div>
    <p class="t">The order is the point. 鶴唳 takes power off the beast for the rest of the
      fight, so it is worth more early; 狼噬 grows with every round already fought, so it is
      worth more late. Two cultivators with the same three arts in a different order are not
      playing the same build. An empty slot fires nothing, so a full sequence always beats a
      short one.</p>
  </section>

  <section class="sec" id="gear">
    <h2><span class="h">器</span> Gear</h2>
    <p class="t"><b>${GEAR.length} pieces:</b> ${ARCHETYPES.length} shapes at every one of
      the nine realms. ${RARITIES.length} ranks, ${AFFIXES.length} axes, ${SLOTS.length}
      slots, and a chest of ${CHEST_LIMIT} before anything widens it. Gear always grants a
      <b>percentage</b>, never a flat amount. A good weapon found at the third realm is
      still a good weapon at the ninth, and with 煉器 <a href="#refine">refining</a> it can
      go on growing rather than being replaced and forgotten.</p>
    <h3>The five ranks</h3>
    <div class="pills">${RARITIES.map((r) => `<span class="pill">
      <b class="cjk" style="color:${RARITY_INFO[r].colour}">${RARITY_INFO[r].han}</b>
      <i>${RARITY_INFO[r].name} · x${RARITY_INFO[r].mult} · ${SECONDARIES[r]} extra
      ${SECONDARIES[r] === 1 ? 'line' : 'lines'}</i></span>`).join('')}</div>
    <h3>The seven axes</h3>
    <div class="pills">${AFFIXES.map((a) => `<span class="pill">
      <b class="cjk">${AFFIX_INFO[a].han}</b><i>${AFFIX_INFO[a].label}</i></span>`).join('')}</div>
    <h3>The nine lineages: wear ${SET_STEPS.join(', ')} pieces of one realm and it pays</h3>
    <div class="cards two">${setRows}</div>
    <h3>The ${ARCHETYPES.length} shapes, by slot</h3>
    <div class="cards two">${archetypeRows}</div>
    <h3>Every piece in the game, by realm</h3>
    <p class="t">A piece's name is its lineage and its shape: 凡鐵劍 is a Mortal Iron Sword
      and 仙蛻劍 is an Ascendant Sword. Nothing is typed out. A new shape adds nine pieces
      and a tenth realm would add ${ARCHETYPES.length}, without a line of naming.</p>
    <div class="cards">${itemNames}</div>
  
    <h3>\u5ea6 What it is actually worth, measured</h3>
    <p class="t">Nothing in this repository had ever answered that. The harness equips
      what it finds, so the answer is the same climb run twice: once wearing what
      dropped and once wearing nothing at all:</p>
    <table>
      <tr><th>cultivator</th><th style="text-align:right">wearing it</th>
          <th style="text-align:right">wearing none</th>
          <th style="text-align:right">the power between them</th></tr>
      <tr><td>active</td><td style="text-align:right">day 65</td><td style="text-align:right">day 82</td><td style="text-align:right">5.2\u00d7</td></tr>
      <tr><td>once a day</td><td style="text-align:right">day 95</td><td style="text-align:right">day 110</td><td style="text-align:right">3.4\u00d7</td></tr>
    </table>
    <p class="t"><b>Thirteen to seventeen days</b>, and three to five times the power at
      the summit. It is printed by <code>players.test.ts</code> on every run, because a
      silent break in the drops, the chest or the set bonuses would otherwise cost days
      off every curve on this page and show up as nothing at all.</p>
  </section>

  <section class="sec" id="refine">
    <h2><span class="h">煉器</span> Refining, and what 材 is actually for</h2>
    <p class="t">材 Material was <b>eight times over-supplied</b>, measured. Everything it
      could ever buy, all ${levelCap(9)} 妖丹 cores, costs 93.6M, and 無盡塔 the tower
      alone pays 803M over its first ninety floors before a single beast is hunted. A
      cultivator playing normally finished the climb sitting on three billion of it with
      nothing to spend it on; one who tapped 狩 Hunt hard finished on two hundred and
      eighty billion. Material stopped meaning anything the moment the cores were full.</p>
    <p class="t">So a piece you wear can be <b>refined</b>, with material, for ever. Every
      level adds ${(REFINE_GAIN * 100).toFixed(0)}% to every line on that piece, and there
      is no top level. The price is the only ceiling. It rides the tower's own pay curve,
      ${REFINE_DEPTH} floors to a level, so it is meaningful at the first realm and still
      meaningful at the ninth.</p>
    <table>
      <tr><th>level</th><th style="text-align:right">next costs</th>
          <th style="text-align:right">all of it so far</th>
          <th style="text-align:right">its lines</th></tr>
      ${refineRows}
    </table>
    <p class="t">A run's material roughly <b>doubles</b> what your gear is worth, and a run
      spent farming gets a little further up the same curve rather than somewhere else
      entirely. <b>The levels stay on the piece</b>, which is the decision: material poured
      into one sword is not in the next sword.</p>
    <div class="rule"><b>And the chest stopped eating drops.</b> ${CHEST} slots, and a full
      one used to refuse everything that fell after the last, which a cultivator hunting
      properly manages inside one visit. Losing the 天 that just dropped because forty 凡
      got there first is the game wasting the player's time where they cannot even see it.
      Now the worst piece goes instead, and the arena says which.</div>

    <h3>頂 "No top level" was false, and it was holding up a wall</h3>
    <p class="t">The paragraph above said there is no top level, and the code had one:
      99, with a comment saying nothing reachable came near it. Once 煉器 was in the
      endgame harness it did. A cultivator who refines comes out of forty crossings at
      level 90 on every slot, and eight crossings later every slot is at 99. Then the
      material has nowhere to go and the power stops growing with the tower, while the
      Dragon, which is footed on a cultivator who refines, keeps growing.</p>
    <table>
      <tr><th>crossing</th><th style="text-align:right">with the limit at 99</th>
          <th style="text-align:right">with no limit</th></tr>
      <tr><td>50</td><td class="n">7 days</td><td class="n">4 days</td></tr>
      <tr><td>55</td><td class="n">16 days</td><td class="n">7 days</td></tr>
      <tr><td>60</td><td class="n">38 days</td><td class="n">6 days</td></tr>
      <tr><td>70</td><td class="n">227 days</td><td class="n">7 days</td></tr>
      <tr><td>74 on</td><td class="n"><b>never</b></td><td class="n">7 to 10 days</td></tr>
    </table>
    <div class="rule"><b>So the limit is gone, and what it guarded is read off the save.</b>
      ${REFINE_LIMIT} is now an arithmetic guard and nothing else. What stops a hand-edited
      save claiming a sword worth fifty thousand of itself is the material ceiling
      <code>validate</code> already reads off 塔 the tower: a level whose price is past
      it is a level nobody paid for. It climbs one level for every four floors, which is
      the same four floors a level costs, and a real endgame round-trips with every level
      intact. <code>longhaul.test.ts</code> plays eighty crossings on every run.</div>
    <div class="warn"><b>界 And where it still slopes.</b> Past eighty crossings, a little
      over a year of play, the marks lengthen again: a fortnight from about the
      hundredth, 32 days at the hundred and twentieth. A slope rather than a cliff. It is
      left there on purpose for now. The ask is three months of content with room for
      expansions, and this starts more than a year in, inside the endgame an expansion
      will change.</div>

    <h3>新 And every system introduces itself, once</h3>
    <p class="t">示 the advice line answers <em>why am I stuck</em>. These answer the other
      half: <em>what is this thing that just appeared</em>. Each one fires when the thing
      it describes first becomes true, fires once ever, and never blocks the game.</p>
    <div class="rows">${noticeRows}</div>
  </section>

  <section class="sec" id="tree">
    <h2><span class="h">道</span> The technique tree</h2>
    <p class="t"><b>One tree, ${ALL_NODES.length} nodes, three branches that all grow from
      起.</b> Gold bridges cross between them, so you can climb one branch and step into the
      next. Points come from the climb itself: one for every three layers, two for every
      warden. A full run earns about <b>${FULL_RUN}</b> against a tree costing
      <b>${TOTAL_COST}</b>, so nobody finishes it, and that gap is the feature. A tree you
      can complete is a checklist, and a checklist is not a build.</p>
    <p class="t">At the middle of each branch there are two nodes and room for one. Each
      keystone is stronger than the node beside it and each one gives something up.</p>
    <div class="cards three">${treeColumns}</div>
    <h3>What a branch costs the clock, measured with the tower and furnace on</h3>
    <table>
      <tr><th>branch</th><th style="text-align:right">realm 9 on day</th></tr>
      ${BY_BRANCH.map(({ b, day }) => `<tr><td><b class="cjk">${
        { none: '—', sword: '劍', spirit: '神', fortune: '運' }[b]}</b> <i>${
        { none: 'no tree at all', sword: 'The Sword', spirit: 'The Spirit', fortune: 'Fortune' }[b]}</i></td>
        <td class="n">${day.toFixed(1)}</td></tr>`).join('')}
    </table>
    <div class="warn"><b>神 once cut the game to a third, and nothing could see it.</b>
      劍 and 神 were written with the same numbers, 15, 20, 30, 45, 80, one on power and
      one on the qi rate. It reads as fair and it is not: power buys fights, and the climb
      is not gated by fights. The run is very nearly <em>days ÷ rate</em>, so nine 神 nodes
      took the ninth realm on <b>day 30</b> against the sword's 82. No test could catch it,
      because no harness had ever spent a 道 point. 神 now pays in 入定 the sitting instead,
      which only counts while you are looking at the phone, and an idle game spends almost
      all of its life shut. No branch may multiply the rate past
      <b>×${TREE_RATE_CEILING}</b>, and <code>dao.test.ts</code> fails if one does.</div>
  </section>

  <section class="sec" id="tower">
    <h2><span class="h">塔</span> The Endless Tower <i class="faint cjk" style="font-size:19px;font-weight:400">無盡塔</i></h2>
    <p class="t">One floor, one beast, one fight. Win and the floor is yours for good; lose
      and nothing happens. Only ever the next floor is open, and it never runs out.</p>
    <p class="t">A floor's power is not a new curve. It reads <b>the same reference the
      wardens read</b>, one realm every ${FLOORS_PER_REALM} floors, so floor
      ${FLOORS_PER_REALM * 3} <em>is</em> the third realm's warden, floor ${LAYERS} is the
      Dragon, and floor 200 is what a twenty-second realm's warden would be if the mountain
      had one.</p>
    <table>
      <tr><th>floor</th><th style="text-align:right">power</th><th>stands where</th>
          <th style="text-align:right">pays 材</th></tr>
      ${towerRows}
    </table>
    <p class="t">Every ${FLOORS_PER_REALM} floors is a <b>塔印 seal</b>, worth
      ${pc(SEAL_LOOT)} more material from everything. Seals pay in material rather than in
      power on purpose: a ladder that pays for climbing itself is not a ladder.</p>
    <p class="t">The tower is also where a build is actually tested. A warden is a gate you
      pass once; the tower keeps rising, so the question it asks is always
      <em>does the build work</em>.</p>
  </section>

  <section class="sec" id="furnace">
    <h2><span class="h">爐</span> The Furnace <i class="faint cjk" style="font-size:19px;font-weight:400">丹爐</i></h2>
    <p class="t">The one thing qi buys that no realm caps. It is paid for <b>twice</b>: in
      qi, which comes from waiting, and in 材 material, which comes from killing things. So
      waiting alone can never buy power and neither can fighting alone. The furnace is where
      the two halves of the game meet.</p>
    <div class="rule"><b>The rule the whole economy stands on.</b> Nothing uncapped may ever
      raise the qi rate. The furnace raises power, makes beasts read weaker and sweetens
      what drops; not one of those feeds the qi that pays for it, so there is no loop to
      close and no runaway to find. Rate upgrades stay behind the realm cap where they
      belong.</div>
    <h3>Three lines, ${LINES.length * 9} named pills. The pill is named for the cultivator,
      not the recipe.</h3>
    <div class="cards">${pillRows}</div>
    <h3>What a pill costs: ${PILL_SHARE} of the rung it rides, and past the summit it goes
      on climbing</h3>
    <table>
      <tr><th>pill</th><th style="text-align:right">qi</th><th style="text-align:right">材</th></tr>
      ${pillPrices}
    </table>
    <p class="t">One 煉體丹 is +${pc(PILL_POWER)} power for ever. One 破煞丹 takes
      ${pc(1 - 0.985)} off every beast and never takes it below ${pc(PILL_BANE_FLOOR)} of
      its power. A beast that can be reduced to nothing stops being a fight, and then the
      tower has no top. One 聚寶丹 is +${pc(PILL_FORTUNE)} on the rare end of the drop
      table.</p>
    <p class="t">Brewing everything, all the way up, is a real choice and a real cost.
      Measured against the same cultivator climbing the same tower and brewing nothing, it
      takes them from day ${CLIMBER.arrival[8].toFixed(1)} to day
      ${BREWER.arrival[8].toFixed(1)} and leaves them
      ${(power(BREWER.state) / power(CLIMBER.state)).toFixed(1)}x stronger, on
      ${pillsTaken(BREWER.state.brewed)} pills.</p>
    <div class="rule"><b>爐底 The furnace starts one realm behind you, not at the foot of
      the mountain.</b> It opens at the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][opensAt('furnace') - 1]} realm, and its first pill used to be priced
      for the first: 450 qi to somebody gathering 192k qi a second. Measured, an hour after
      it opened, tapping the buttons bought a hundred pills and 3.2x power. A system that
      opens late starts where the player is standing, one realm back, so the first pill is
      an hour and a half of gathering rather than fifteen hours or seven minutes.</div>
  </section>

  <section class="sec" id="top">
    <h2><span class="h">劫</span> The tribulation <i class="faint cjk" style="font-size:19px;font-weight:400">渡劫</i></h2>
    <p class="t">The ninth realm used to be a dead end: its layers never opened, the bar read
      zero for ever and the qi piled up with nowhere to go. An idle game may not end, and
      that is what ending looks like.</p>
    <p class="t">So the ninth realm keeps its name. Once the last rung is open the qi bar
      becomes <b>雷池 the thunder pool</b>, which holds <b>${MARK_DAYS} days of your own
      gathering</b>. Fill it and the 龍 Dragon comes. Beat it and you take a
      <b>雷印 thunder mark</b>, worth <b>${(1 + TRIBULATION_GAIN).toFixed(2)}x</b> to your
      power and your qi alike; crossing empties the pool, and the next Dragon stands
      <b>${TRIBULATION_CHALLENGE}x</b> higher than the one that fell.</p>
    <div class="rule"><b>Why the pool exists.</b> An endgame gated only by power has no
      clock at all. The furnace sells power, so one day's qi bought a fortnight of
      crossings. Measured, ten marks a day, every number in the game multiplied by two
      hundred daily until the arithmetic ran out of exponent. A pool that refills is what
      makes 渡劫 a ladder rather than a lever you hold down. It also puts the furnace in
      real tension with the Dragon: qi brewed is qi not pooled.</div>
    <p class="t">The next Dragon is built from <b>the power that actually faced the last
      one</b>, which is not 力. A stance bends every blow and three arts bend three more,
      worth about 1.8x between them, and none of that is in the number on the screen. The
      Dragon used to be anchored below all of it, and the build covered the gap for free.
      Measured over twenty-four crossings, the odds never once fell under 90%, and 煉體,
      the one pill a Dragon can feel, was never worth brewing. Two days, tap, win, for ever.</p>
    <div class="rule"><b>立 Where the Dragon plants its feet.</b> ${TRIBULATION_FOOTING}x
      the 力 it last faced, not 1.8x, because 力 is the sword and the shield at once and a
      multiplier on blows is worth about its square root in the ratio. The band is narrow,
      and it was measured at forty crossings each, twice. Without 煉器 refining in the
      loop, 1.20 gave 98% every time and 1.45 the high sixties. With it, which is what a
      real cultivator does, 1.45 is a walkover in 28 crossings of 40, 1.59 settles at 66%,
      and 1.62 runs away to a mark of 32 days.</div>
    <p class="t">The rest is solved, not chosen. Three pills a crossing, a price that rises
      ${LADDER_GROWTH_LAST}x a pill and a pill worth ${pc(PILL_POWER)} give a mark of
      ${(1 + TRIBULATION_GAIN).toFixed(3)}x and a Dragon of ${TRIBULATION_CHALLENGE}x.</p>
    <p class="t">Measured, played out crossing by crossing: <b>${ENDGAME.days.length} marks
      in ${ENDGAME.days.reduce((a, b) => a + b, 0)} days</b>, ${Math.min(...ENDGAME.days)} to
      ${Math.max(...ENDGAME.days)} days each, ending on tower floor ${ENDGAME.end.tower}
      with ${pillsTaken(ENDGAME.end.brewed)} pills brewed. The margin a good run arrives
      with buys the first crossings at
      ${Math.round(Math.max(...ENDGAME.chances) * 100)}%; the odds then walk down and settle
      at ${Math.round(ENDGAME.chances[ENDGAME.chances.length - 1] * 100)}%, and the furnace
      is what holds them there.</p>
  </section>

  <section class="sec" id="stele">
    <h2><span class="h">碑</span> The stele, and what a deed is worth</h2>
    <p class="t">A cultivator collects numbers in their head, the day, the floor, the
      kills, the marks, and until now the game had nowhere to show them. 碑 the stele is
      that page: ${DEEDS.length} deeds across ${TRACKS.length} tracks, and every unfinished
      one is a <b>bar rather than a padlock</b>, because <em>two floors away</em> is a
      reason to open the app tonight and a locked box is not.</p>
    <div class="rule"><b>A deed pays nothing.</b> Not qi, not power, not material. The
      economy's one law is that nothing uncapped may raise the qi rate, and a list of
      deeds is about as uncapped as a thing gets. The deeper reason is that 九境 is
      meant to go online. A deed that pays is a deed worth forging, and a leaderboard of
      forged deeds is not a leaderboard.</div>
    <div class="rule"><b>And a deed is derived, never stored.</b> Exactly like 勢 the
      stances and 訣 the arts: nothing in the save says <em>I have done this</em>. Every
      deed is recomputed from numbers the save already carries and the validator already
      caps, so there is no flag to flip. A hand-edited save cannot claim a deed without
      claiming the whole run underneath it.</div>
    ${TRACKS.map((t) => `<div class="card" style="--hue:var(--jade)">
      <b class="cjk">${t.han}</b> <em>${t.name}</em>
      <div class="lin" style="margin-top:8px">${deedsOn(t.key).map((d) =>
        `<span><b style="color:var(--gold)">${d.han}</b> <i>${d.name} · ${d.line}</i></span>`).join('')}</div>
    </div>`).join('')}
  </section>

  <section class="sec" id="save">
    <h2><span class="h">存</span> The save</h2>
    <p class="t">It lives in this browser, on this phone. There is no account. Clear the
      browser data and it is gone, so the 存 button hands you a copy to paste into a note.
      The game also keeps a spare of its own and falls back to it if the main one is ever
      lost. That protects you from the game; only your own copy protects you from the
      phone.</p>
    <div class="warn"><b>A save is input, and it is validated like any other input.</b>
      Every number is capped and every item is checked against the table it claims to
      come from. No axis may appear twice on one piece. Nothing may hold more qi than the
      fastest conceivable cultivator could have gathered since the run began. Some things
      are not stored at all but <em>derived</em>: stances follow from the realm reached and
      arts from the wardens put down, so an edited save cannot put 龍威 in the first slot at
      realm 1 and walk over every warden in the game. Levels are clamped to the realm's
      cap, because the cap is what holds the curve up.</div>
    <p class="t">Every one of those caps has to be the <b>same</b> cap the game itself
      sells against, and three times now it has not been. See 氣查 below.</p>
  </section>

  <section class="sec" id="audit">
    <h2><span class="h">氣查</span> The audit of the qi</h2>
    <p class="t">Bruno, for the third time in this project's life: <i>"sinto que existem
      bugs e opções que resetam ou tiram qi quando utilizadas."</i> Twice before he was
      right, and both times the fault was found by hand after the fact. So the third time
      it was built into the repository instead: <code>npm run qi</code> walks every path
      the qi can take and asks four different questions about it.</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">出入</b> <em>Every verb pays what it says</em>
        <i>Each action in the game is applied to a real cultivator and the qi that moved
        is compared against the price the screen quotes for it. A button that takes more
        than it says is the complaint, exactly.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">梯</b> <em>The ladder conserves</em>
        <i>Across any absence, the qi gathered is either standing in the bar or was spent
        on a rung. There is no third place for it to be, and a lump landing on a cheap
        rung keeps its remainder.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">存</b> <em>A save survives being read back</em>
        <i>The state is round-tripped through <code>validate</code> at the end of every
        habit and at forty crossings. A field that comes back different is a field the
        game deletes every time the app is closed.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">鐘</b> <em>The clock cannot rob you</em>
        <i>A phone whose clock jumps backwards, a phone set before the day the run began,
        a day away: none of them may take qi.</i></span></div>
    </div>

    <h3>What it found on the first run</h3>
    <p class="t">Four things, and three of them were the same bug wearing different
      clothes: <b>a cap written twice, where the copy in the validator was the older
      one</b>. That is the same fault 失 the levels had, in the same function.</p>
    <table class="tbl"><thead><tr><th>What</th><th>What it did</th><th>Now</th></tr></thead>
      <tbody>
      <tr><td><b class="cjk">藏</b> the chest</td>
        <td>Capped at the flat 40 in the validator while 運 the branch, a 藏 line on a
          piece of gear and 悟道 a card all hand out more. Measured, a finished cultivator
          holds 58 to 90 pieces. Every one past the fortieth was deleted on every
          load.</td>
        <td>Capped at the limit that cultivator actually has.</td></tr>
      <tr><td><b class="cjk">頂</b> the ceiling on qi</td>
        <td>A typed formula that knew about the two rate upgrades and not about 雷印 a
          mark, which multiplies the rate by 1.728. At forty marks a save held 78.8
          quintillion qi and came back holding 5.26. 雷池 The pool sat a hundred million
          times above what the save was allowed to stand on, so the Dragon could never
          have been called again.</td>
        <td>Read off the cultivator's own rate, which already knows everything that
          touches it.</td></tr>
      <tr><td><b class="cjk">材</b> the ceiling on material</td>
        <td>A flat trillion. The tower is the whole material economy and it has no top: a
          save at forty marks held 3.23e29 材 and came back holding a trillion.</td>
        <td>Read off 塔 the tower, which is where the material comes from and which is
          capped at three thousand floors.</td></tr>
      <tr><td><b class="cjk">圍</b> a drive</td>
        <td><code>Math.max(0, qi - cost)</code>: a drive nobody could afford took
          <b>everything they had</b> and ran anyway. A test was guarding it, and the test
          was called "never goes below nothing".</td>
        <td>Refused outright. Nothing taken, nothing killed.</td></tr>
    </tbody></table>

    <h3>歸 And the one that was not a bug at all, which is the one he was seeing</h3>
    <p class="t">A layer opens the instant its price is met and the qi is taken. So a
      cultivator who closes the app with a nearly full bar comes back to a bar that is
      nearly empty and a rung further up. <b>The number they have been watching all day is
      smaller than when they left.</b> Nothing was taken. It is standing in the rung.</p>
    <p class="t">The homecoming card was making it worse rather than explaining it. It
      reported <code>after.qi - before.qi</code>, floored at zero, so the cultivator above
      was told they had gathered <b>nothing</b>. Measured on a real save, nine hours away:
      205M gathered, one layer opened, and 425M went into the climb. The card said
      <code>0</code>.</p>
    <div class="rule"><b>So the return counts the rungs in.</b> What the hours gathered is
      the qi in the bar plus every rung it opened on the way, and the card says where it
      went in as many words. The ladder did not change by a single qi.</div>

    <h3>價 And the last button that took qi without saying so</h3>
    <p class="t">渡劫 Crossing spends 雷池 the whole pool, which at the summit is the whole
      bar. The button said <i>"Cross the tribulation"</i> and nothing else, so a player
      pressed it and watched two days of gathering go to nothing with the screen silent
      about it. That is the same fault 拆 the melt had, and this repository already
      settled how it ends: <b>the trade is stated before the tap, not explained after
      it.</b> The line under the button now reads the price off the pool itself.</p>
  </section>

  <section class="sec" id="rules">
    <h2><span class="h">律</span> The rules the game is built on</h2>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">純</b> <em>The simulation is pure</em>
        <i>Everything in src/sim is (state, instant) → new state. No clock is read, no dice
        are unseeded. That is why the same fight always plays out the same way, and why the
        balance can be measured by a test instead of argued about.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">時</b> <em>Time moves by timestamp</em>
        <i>Never by frame. A twenty-hour absence is paid layer by layer, because the rate
        changes every time a layer opens. Applying one rate across the gap would underpay
        it in silence.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">手</b> <em>Only the player climbs a realm</em>
        <i>Time banks qi at a ceiling and stops there. Beating the warden opens 突破;
        pressing it is what takes the realm. The one moment the game stops for is not
        allowed to happen while nobody is looking.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">失</b> <em>Losing costs nothing</em>
        <i>Every fight in the game, wardens and tower floors included. Come back stronger.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">數</b> <em>One table of numbers</em>
        <i>Nothing that shapes the curve lives outside src/sim/balance.ts, and the test
        suite prints all of it on every run, so changing one is never silent.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">氣</b> <em>Nothing uncapped raises the qi rate</em>
        <i>The rule that keeps the economy safe for good. Everything that multiplies
        gathering is behind the realm cap; everything uncapped buys power, fortune or
        knowledge instead. It was written down long before anything enforced it, and both
        器 gear and 道 the tree quietly broke it for months, so <code>rate()</code> now bends them
        toward ×${UNCAPPED_RATE_CEILING} rather than trusting anybody to remember.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">文</b> <em>All the prose is in one file</em>
        <i>src/app/copy.ts. Text scattered across six screens cannot be reviewed, and this
        is the file a translation would replace.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">譯</b> <em>No character is ever the only place a thing is named</em>
        <i>The characters stay, because they are what the game looks like, and a version without
        them is a spreadsheet about numbers going up. So every one of them carries an
        English name somewhere it can be found. On the row itself where there is space.
        And on 釋 the key, which is one tap from every screen and reads out of the same
        tables the game does. A test fails if a rank, an axis, a slot, a pill line or a
        whole system is ever added without one.</i></span></div>
    </div>
  </section>

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Generated from the game's own code by <code>npm run bible</code>. The paintings
      are the game's own files, copied in beside this page. The icons under them, which is
      what every unpainted thing still wears, are from game-icons.net under CC BY 3.0.
      When a system closes, move its row on the board and write its section. That is the
      whole process.</p>
  </footer>
</div>
`;

/**
 * 搬 The paintings the page points at, copied in beside it.
 *
 * Two kinds of pointer, and both have to work. An <img> written by this file says
 * bible-art/art/beast/tiger.webp, because it is read from the page. A drawing lifted
 * into bible-art/ says art/beast/tiger.webp, because 修 the portrait wrote that href
 * for the game and the file it now sits in is inside bible-art/ already. One folder
 * satisfies both, so the paintings go to bible-art/art/<kind>/<key>.webp and neither
 * pointer has to know about the other.
 *
 * 讀 Which paintings is read back off the finished page rather than listed here. A
 * second list would be a second thing to forget.
 */
let COPIED = 0;
function copyPaintings(out: { page: string; plates: Map<string, string> }): number {
  const dir = 'bible-art/art';
  rmSync(dir, { recursive: true, force: true });
  // 尋 Two pointers, found two ways. A page written here says bible-art/art/… or
  // bible-art/shot/…; a drawing lifted into that folder says art/… because 修 the
  // portrait wrote the href for the game. Looking for a bare "art/" in both was the bug:
  // it matched the "art/" inside "bible-art/" and asked for public/art/shot/….
  const want = new Set<string>();
  for (const m of out.page.matchAll(/bible-art\/((?:art|shot)\/[a-z0-9-]+(?:\/[a-z0-9-]+)?\.webp)/g)) want.add(m[1]);
  for (const svg of out.plates.values()) {
    for (const m of svg.matchAll(/href="(art\/[a-z]+\/[a-z0-9-]+\.webp)"/g)) want.add(m[1]);
  }
  let bytes = 0;
  for (const rel of [...want].sort()) {
    // 照 A screenshot of the real app is kept in bible-shots/ and published beside the
    // page the same way a painting is. It is not in public/: the game does not ship
    // pictures of itself.
    const from = rel.startsWith('shot/') ? `bible-shots/${rel.slice(5)}` : `public/${rel}`;
    if (!existsSync(from)) throw new Error(`頁 the page points at ${rel} and there is no such painting`);
    mkdirSync(`bible-art/${rel.slice(0, rel.lastIndexOf('/'))}`, { recursive: true });
    const file = readFileSync(from);
    writeFileSync(`bible-art/${rel}`, file);
    bytes += file.length;
  }
  COPIED = want.size;
  return bytes;
}

const lifted = liftArt(page, 'bible-art');
writeFileSync('bible.html', lifted.page);
const kb = Math.round(lifted.page.length / 1024);
const artKb = Math.round(writePlates('bible-art', lifted.plates) / 1024);
const picKb = Math.round(copyPaintings(lifted) / 1024);
console.log(`bible.html · ${kb} KB · ${SYSTEMS.filter((s) => s.status === 'done').length} closed, ` +
  `${SYSTEMS.filter((s) => s.status === 'open').length} open, ` +
  `${SYSTEMS.filter((s) => s.status === 'planned').length} planned · ` +
  `${GEAR.length} items, ${LINES.length * 9} pills, ${BEASTS.length} beasts named in full`);
console.log(`bible-art/ · ${lifted.plates.size} drawings · ${artKb} KB, lifted off the page`);
console.log(`bible-art/art/ · ${COPIED} paintings and screenshots · ${picKb} KB · ` +
  `${lifted.plates.size + COPIED} files beside the page, of the 255 a publish allows`);
