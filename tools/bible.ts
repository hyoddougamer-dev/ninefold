/**
 * 九境 The Bible: the one page that explains the whole game, and the page we keep.
 *
 * It is a **living document**. Every system in the game has a row in the status board at
 * the top with one of three states, and closing a system means moving its row and
 * writing its section — nothing else. That is the whole process.
 *
 * Every number, every name and every drawing below is read out of the game's own
 * modules, so the page cannot go stale: if something here is wrong, the game is wrong.
 * The only hand-written things are the prose and the status board, and the status board
 * is hand-written on purpose — a machine cannot know whether a system is finished.
 *
 * Run with `npm run bible`.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS, WARDENS, commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { REALMS, realm as realmOf } from '../src/data/realms.ts';
import { ARTS, SEQUENCE_SLOTS, STANCES } from '../src/data/arts.ts';
import { LINES, PILL_GRADES, PILL_LINES } from '../src/data/alchemy.ts';
import {
  AFFIXES, AFFIX_INFO, ARCHETYPES, GEAR, RARITIES, RARITY_INFO, REALM_SETS, SECONDARIES,
  SET_STEPS, SLOTS, SLOT_INFO, archetypesOf, templateOf, type Affix, type Item,
} from '../src/data/gear.ts';
import { ALL_NODES, PATH_INFO, PATHS, TOTAL_COST, nodesOf } from '../src/data/techniques.ts';
import { UPGRADES, UPGRADE_INFO, condenseCost, newState, power, upgradeCost, type State } from '../src/sim/state.ts';
import { CHEST_LIMIT, FUSE_COUNT } from '../src/sim/chest.ts';
import {
  HUNT_SHARE, LADDER_FIRST, LADDER_GROWTH_FIRST, LADDER_GROWTH_LAST, LAYERS,
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
import { CORE_QI_RUNGS, FOCUS_HOLD, FOCUS_MAX, FOCUS_RAMP, TOWER_QI_HOURS, WARDEN_TRIBUTE } from '../src/sim/balance.ts';
import { CORES_FREE_REALMS } from '../src/sim/combat.ts';
import { playAll } from './habits.ts';
import { BRANCHES, climb } from './climb.ts';
import { playEndgame } from './endgame.ts';
import { DEEDS, TRACKS, deedsOn } from '../src/sim/deeds.ts';
import {
  KNOWN_MATERIAL, MARKS, MARK_INFO, MASTERED_POWER, recordCeiling,
} from '../src/sim/record.ts';
import { LEVELS } from '../src/app/sound.ts';
import { NOTICES } from '../src/app/notices.ts';
import { STEPS } from '../src/app/guide.ts';
import { DRIVE_SIZES, driveCost } from '../src/sim/hunt.ts';
import { compare, linesOf, swing } from '../src/sim/inspect.ts';
import { SYSTEMS as OPENED, opensIn } from '../src/sim/unlocks.ts';
import { REFINE_DEPTH, REFINE_GAIN, refineCost, refineFactor, refineSpent } from '../src/sim/refine.ts';
import { CHEST_LIMIT as CHEST } from '../src/sim/chest.ts';

import { num } from '../src/sim/format.ts';
import { icon } from '../src/art/icon.ts';
import { portrait } from '../src/art/aura.ts';
import { arenaScene } from '../src/art/scene.ts';
import { gearTile } from '../src/art/gear.ts';

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
/** 道 The same cultivator down each branch of the tree — the measurement that was missing. */
const BY_BRANCH = BRANCHES.map((b) => ({ b, day: climb(6, true, true, true, b).arrival[8] }));
const ENDGAME = playEndgame(40);
const pc = (x: number) => `${Math.round(x * 1000) / 10}%`;

/**
 * 狀 The status board, and the only hand-written table on the page.
 *
 * `done` means the system is closed: it is built, it is measured by a test, and it is
 * written up below. `open` means it exists and is still moving. `planned` means it is
 * agreed and not started. Nothing else is allowed — "mostly done" is `open`.
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
  const met: number[] = [];
  const add = (realm: number) => { if (Number.isFinite(at(realm))) met.push(at(realm)); };
  for (const sys of OPENED) add(sys.realm);
  for (const b of BEASTS) add(b.realm);
  for (const st of STANCES) add(st.realm);
  for (const a of ARTS) add(a.realm);
  for (const rs of REALM_SETS) add(rs.realm);

  const byWeek = new Map<number, number>();
  for (const d of met) byWeek.set(Math.floor(d / 7), (byWeek.get(Math.floor(d / 7)) ?? 0) + 1);
  const weeks = 13;                                    // three months, which is the ask
  const peak = Math.max(...byWeek.values());
  const rows = Array.from({ length: weeks }, (_, w) => {
    const n = byWeek.get(w) ?? 0;
    const bar = Math.round((n / peak) * 100);
    return `<tr><td>week ${w + 1}<span class="faint"> · day ${w * 7}–${w * 7 + 6}</span></td>
      <td style="text-align:right">${n || '—'}</td>
      <td><span class="wk"><i style="width:${bar}%"></i></span></td></tr>`;
  }).join('');
  return {
    rows, run,
    r4: Math.round(at(4)),
    r8: Math.round(at(9) - at(8)),
    last: Math.round(at(9)),
    done: Math.round(run.days),
    name: run.habit.name,
  };
})();
const CLOCK_ROWS = CLOCK.rows;
const CLOCK_R4 = CLOCK.r4;
const CLOCK_R8 = CLOCK.r8;
const CLOCK_LAST = CLOCK.last;
const CLOCK_DONE = CLOCK.done;
const ACTIVE_NAME = CLOCK.name;
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
    line: `A warden pays a tribute rather than a harvest, so it can no longer fund the core that beats the next one — and 凝丹 lets a core be forced out of raw qi, so nobody is ever stopped. Two beasts a day is worth ${BARELY_SAVES} days of the climb.` },
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

  { han: '曆', name: 'Three months of content', status: 'open', at: 'clock',
    line: 'Measured: an active cultivator meets four of the nine realms in the first five days and the last new thing in the game on day 60. The climb has a pace. What comes after it does not have a calendar.' },

  { han: '轉世', name: 'Rebirth', status: 'planned',
    line: 'Ruled out. 九境 is purely vertical by decision: nothing resets, and every track only goes up. This row stays so the decision is on the page rather than in somebody\'s memory.' },
];

const STATE = {
  done: { han: '成', word: 'closed', tone: 'var(--cyan)' },
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
  const hue = at9 === undefined ? 'var(--magenta)' : 'var(--cyan)';
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
 * the game's own art functions and the game's own numbers — a mockup assembled from
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
    <p class="cap">The switch, and the same count on the tab bar — which is where it is
      seen from every other screen in the game.</p>
  </div>`;
})();

// 凝丹 The card that appears only when 材 material has run out, at the real price.
const MOCK_CONDENSE = (() => {
  const s5: State = { ...newState(0), realm: 5, layer: 8 };
  return `<div class="mk cond">
    <div class="chd"><b class="cjk">凝丹</b><span><em>No 材 material left</em>
      <i>${num(condenseCost(s5))} qi — ${CORE_QI_RUNGS} rungs of the climb</i></span></div>
    <p class="body">You can force a 妖丹 out of raw qi instead. It works, and it is dear:
      this is qi that would have opened layers.</p>
    <span class="go">凝 Condense a core</span>
    <span class="hint"><b class="cjk">狩</b> A beast leaves material when it falls. That
      is the cheap way, and it is one tap away.</span>
    <p class="cap">At the fifth realm's ceiling. The price is condenseCost() and the card
      is drawn only while canBuy(cores) is false — it is an answer, not a fifth box.</p>
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

const page = `<title>九境 Ninefold — the Bible</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.65 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:820px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2,h3 { margin:0; font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,12vw,60px); font-weight:400;
       color:var(--cyan); line-height:1; }
  h2 { font-family:Rajdhani,sans-serif; font-size:26px; display:flex; gap:11px;
       align-items:baseline; }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:30px;
          color:var(--cyan); }
  h3 { font-family:Rajdhani,sans-serif; font-size:14px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; margin-top:6px; }
  p { margin:0; }
  a { color:var(--cyan); }
  .lead { font-size:19px; margin-top:14px; }
  .sec { margin-top:40px; border-top:1px solid var(--line); padding-top:22px;
         display:flex; flex-direction:column; gap:13px; }
  .t { color:var(--faint); max-width:64ch; }
  .t b { color:var(--text); font-weight:600; }
  .big { font-family:Rajdhani,sans-serif; font-weight:700; color:var(--gold); }
  .faint { color:var(--faint); }

  /* 曆 the content clock's week bars. Scoped, like everything else on this page. */
  #clock .wk { display:block; height:8px; border-radius:99px; background:var(--line);
               overflow:hidden; min-width:120px; }
  #clock .wk i { display:block; height:100%; border-radius:99px; background:var(--cyan); }
  #clock td:last-child { width:45%; }

  /* ── 樣 the mockups: the real screens, drawn on the page ───────────────── */
  /* Every rule is scoped to the section. The first draft was not, and its .ladder
     collided with the realm-ladder cards further down the page — which is the same
     shared-class bug the save sheet had in the game, found twice in one day. */
  #mockups .mk { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
        padding:16px; }
  #mockups .mk .cap { margin:12px 0 0; font-size:13px; color:var(--faint); line-height:1.55; }
  #mockups .mk.two { background:none; border:0; padding:0; display:grid; gap:10px; }
  @media(min-width:640px){ #mockups .mk.two { grid-template-columns:1fr 1fr; } }

  /* 梯 — and the block itself has to say so: the page's own .ladder is a grid of
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
  #mockups .ladder .warden { flex:none; width:17px; color:var(--cyan); }
  #mockups .ladder .warden svg { display:block; }

  /* 指 */
  #mockups .coach { display:flex; flex-direction:column; align-items:center; gap:8px; }
  #mockups .coach .arrow { width:34px; height:34px; display:grid; place-items:center;
                  border-radius:99px; background:rgba(6,8,18,.92);
                  border:1px solid rgba(95,220,255,.45); color:var(--cyan);
                  box-shadow:0 0 14px -3px rgba(95,220,255,.8); }
  #mockups .coach .arrow svg { display:block; }
  #mockups .upg { width:100%; max-width:360px; display:flex; align-items:center; gap:13px;
         padding:13px 14px; border-radius:11px; background:var(--panel);
         border:1px solid var(--line); }
  #mockups .upg.ringed { box-shadow:0 0 0 2px var(--cyan), 0 0 0 5px rgba(95,220,255,.14),
                           0 0 22px -4px rgba(95,220,255,.75); }
  #mockups .upg .ic { flex:none; width:26px; color:var(--cyan); }
  #mockups .upg .ic svg { display:block; }
  #mockups .upg > span:nth-child(2) { flex:1; }
  #mockups .upg b { display:block; font-size:15px; font-weight:500; }
  #mockups .upg b em { font-style:normal; font-size:13px; color:var(--faint); margin-left:4px; }
  #mockups .upg i { display:block; font-style:normal; font-size:12.5px; color:var(--faint); }
  #mockups .upg .price { flex:none; font-family:Rajdhani,sans-serif; font-weight:700; font-size:16px;
                color:var(--gold); text-align:right; }
  #mockups .upg .price em { display:block; font-style:normal; font-size:10px; color:var(--faint);
                   font-weight:400; letter-spacing:.1em; text-transform:uppercase; }

  /* 時 */
  #mockups .gcard { background:linear-gradient(180deg,rgba(95,220,255,.09),rgba(95,220,255,.03));
           border:1px solid rgba(95,220,255,.33); border-radius:12px; padding:13px 15px; }
  #mockups .gcard.waiting { background:var(--panel); border-color:var(--line); }
  #mockups .gcard .n { font-size:10px; letter-spacing:.14em; text-transform:uppercase;
              color:var(--cyan); font-family:Archivo,sans-serif; }
  #mockups .gcard.waiting .n { color:var(--faint); }
  #mockups .gcard b { display:block; margin-top:4px; font-size:15.5px; font-weight:500; }
  #mockups .gcard b .cjk { color:var(--cyan); margin-right:4px; }
  #mockups .gcard.waiting b .cjk { color:var(--faint); }
  #mockups .gcard i { display:block; margin-top:5px; font-style:normal; font-size:12.5px;
             color:var(--faint); line-height:1.5; }
  #mockups .gcard .bar { display:block; height:4px; border-radius:99px; margin-top:9px;
                background:rgba(95,220,255,.2); overflow:hidden; }
  #mockups .gcard .bar i { display:block; height:100%; margin:0; background:var(--cyan);
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
  #mockups .sheet2 .line.up .vs b { color:var(--cyan); }
  #mockups .sheet2 .line.down .vs b { color:var(--magenta); }
  #mockups .sheet2 .verd { display:flex; gap:9px; margin-top:16px; }
  #mockups .sheet2 .sw { flex:1; background:var(--panel); border:1px solid var(--line);
                border-radius:11px; padding:13px 10px; text-align:center; }
  #mockups .sheet2 .sw b { display:block; font-size:17px; font-weight:400; color:var(--faint); }
  #mockups .sheet2 .sw em { display:block; margin-top:3px; font-style:normal; font-size:17px;
                   font-family:Rajdhani,sans-serif; font-weight:700; color:var(--cyan); }
  #mockups .sheet2 .sw i { display:block; margin-top:3px; font-style:normal; font-size:10px;
                  letter-spacing:.08em; text-transform:uppercase; color:var(--faint); }

  /* 圍 */
  #mockups .drive .size { display:flex; align-items:center; gap:13px; padding:13px 14px;
                 border-radius:11px; background:var(--panel); border:1px solid var(--line);
                 margin-bottom:8px; }
  #mockups .drive .size .n { flex:none; min-width:44px; font-size:21px; color:var(--cyan);
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
  #mockups .halfbar > span[data-on] b { color:var(--cyan); }
  #mockups .halfbar em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
              font-size:13px; }
  #mockups .halfbar .pip { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
              font-size:11px; color:#0A0C1C; background:var(--gold); border-radius:99px;
              padding:3px 6px; }
  #mockups .tabbar { display:grid; grid-template-columns:repeat(5,1fr);
              background:var(--panel2); border:1px solid var(--line); border-radius:11px;
              padding:9px 0 11px; }
  #mockups .tabbar > span { display:flex; flex-direction:column; align-items:center; gap:3px;
              color:var(--faint); }
  #mockups .tabbar > span[data-on] { color:var(--cyan); }
  #mockups .tabbar b { position:relative; font-size:19px; font-weight:400; line-height:1.1; }
  #mockups .tabbar u { position:absolute; left:100%; bottom:55%; transform:translateX(-3px);
              text-decoration:none; font-family:Rajdhani,sans-serif; font-weight:700;
              font-size:10px; line-height:1; color:#0A0C1C; background:var(--gold);
              border-radius:99px; padding:2.5px 5px; }
  #mockups .tabbar i { font-style:normal; font-size:9.5px; letter-spacing:.16em;
              text-transform:uppercase; }

  /* 凝丹 the card that appears only when 材 runs out */
  #mockups .mk.cond { border-color:var(--magenta); }
  #mockups .cond .chd { display:flex; align-items:center; gap:11px; }
  #mockups .cond .chd b { font-size:23px; font-weight:400; color:var(--magenta); }
  #mockups .cond .chd em { display:block; font-style:normal; font-family:Rajdhani,sans-serif;
              font-weight:700; font-size:16px; }
  #mockups .cond .chd i { font-style:normal; font-size:12.5px; color:var(--faint); }
  #mockups .cond .body { margin:9px 0 12px; font-size:13.5px; color:var(--faint);
              line-height:1.6; }
  #mockups .cond .go { display:block; text-align:center; background:var(--magenta);
              color:#0A0C1C; border-radius:8px; padding:12px; font-size:15px;
              font-family:Rajdhani,sans-serif; font-weight:700; letter-spacing:.06em;
              text-transform:uppercase; }
  #mockups .cond .hint { display:flex; gap:11px; align-items:flex-start; margin-top:10px;
              background:color-mix(in srgb, var(--gold) 10%, var(--panel));
              border:1px solid var(--gold); border-radius:11px; padding:11px 13px;
              font-size:13px; line-height:1.5; }
  #mockups .cond .hint b { flex:none; font-size:17px; font-weight:400; color:var(--gold); }

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
                    font-weight:400; color:var(--cyan); }
  #mockups .corner .menu i { font-style:normal; font-size:13.5px; }
  #mockups .corner .cap { margin:12px 0 0; font-size:13px; color:var(--faint); }

  .toc { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px;
         margin-top:22px; }
  .toc a { display:flex; align-items:baseline; gap:8px; text-decoration:none;
           background:var(--panel2); border:1px solid var(--line); border-radius:10px;
           padding:9px 12px; color:var(--text); font-size:14px; }
  .toc a b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:18px;
             color:var(--cyan); }

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

  table { border-collapse:collapse; width:100%; font-size:14px; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:7px 8px; }
  td b { color:var(--hue,var(--cyan)); font-size:16px; font-weight:400; }
  td i { font-style:normal; color:var(--faint); }
  td.n { font-family:Rajdhani,sans-serif; font-weight:700; text-align:right;
         color:var(--gold); }

  .cards { display:grid; gap:8px; }
  @media(min-width:640px){ .cards.two { grid-template-columns:1fr 1fr; }
                           .cards.three { grid-template-columns:repeat(3,1fr); } }
  .card { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
          padding:12px 14px; }
  .card > b { color:var(--hue,var(--cyan)); font-size:18px; font-weight:400; }
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
  .row .ic { flex:none; color:var(--hue,var(--cyan)); display:grid; place-items:center; }
  .row .ic svg { display:block; }
  .row b { font-size:17px; color:var(--hue,var(--cyan)); font-weight:400; }
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
  .duel .foe { color:#CC79FF; justify-self:center; margin-bottom:12px; }
  .duel .mid { color:var(--cyan); font-size:19px; margin-bottom:30px;
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

  .rule { border-left:3px solid var(--cyan); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; }
  .rule b { color:var(--cyan); }
  .warn { border-left:3px solid var(--magenta); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; }
  .warn b { color:var(--magenta); }

  .where { display:grid; gap:7px; }
  .where a { display:flex; gap:11px; align-items:flex-start; text-decoration:none;
             background:var(--panel2); border:1px solid var(--line); border-radius:11px;
             padding:12px 14px; color:var(--text); }
  .where a b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:21px;
               color:var(--cyan); flex:none; }
  .where a em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
                font-size:16px; display:block; }
  .where a i { font-style:normal; font-size:13px; color:var(--faint); }
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
      <a href="#board"><b>狀</b> Where we are</a>
      <a href="#mockups"><b>樣</b> What it looks like</a>
      <a href="#where"><b>包</b> Where to play</a>
      <a href="#loop"><b>環</b> How it is played</a>
      <a href="#opens"><b>開</b> What each realm opens</a>
      <a href="#habits"><b>勤</b> Playing vs waiting</a>
      <a href="#wall"><b>守貢</b> The wall</a>
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
      <a href="#rules"><b>律</b> The rules</a>
    </div>
  </header>

  <section class="sec" id="mockups">
    <h2><span class="h">樣</span> What it looks like</h2>
    <p class="t">A standing rule, and Bruno's words for it: <i>"faz um mockup visual
      sempre com exemplos quando se altera algo relacionado com aspecto/arte."</i> So
      every screen that changed is drawn here rather than described — with the game's own
      art functions, the game's own tables and, where there is a number, the number the
      game would actually show. A mockup assembled from invented values is a drawing of
      something that does not exist.</p>

    <h3>梯 The climb, drawn</h3>
    <p class="t">"layer 5 of 9" and "realm 5 of 9" were two numbers at opposite ends of
      the screen, and nothing on it ever said that one was <b>inside</b> the other. They
      are one object now, under the live bar, with the warden lit at the end of the rungs
      only when it is actually standing there.</p>
    ${MOCK_LADDER}

    <h3>指 The pointing finger</h3>
    <p class="t">The guide used to describe the button. It now draws a ring on it. The
      whole overlay is <b>inert to the touch</b> — the ring is over the button and the
      button still takes the tap, which is the one thing a coach mark must never get
      wrong. It waits a beat before scrolling, so the card is read before the screen
      moves, and it sits at the empty right-hand end of a wide target rather than over
      the sentence above it.</p>
    ${MOCK_COACH}

    <h3>時 A step you cannot do yet</h3>
    <p class="t">The second step asked for a kill that is not winnable for the first few
      minutes of the game, and asked for it anyway — a ring pulsing on a fight with no
      winning seed in it. A step that is not possible is now the <b>next</b> step: the
      same step, a quieter card, a bar showing how close, and a line handing over
      something to do in the meantime.</p>
    ${MOCK_GUIDE}

    <h3>鑑 Reading a piece of gear</h3>
    <p class="t">Tapping a piece in the chest <b>wore it</b>, so there was never a moment
      in which a player could look at it. The numbers below are not illustrative: they
      are ${templateOf(MOCK_HELD).name} against ${templateOf(MOCK_WORN).name} run through
      the same comparison the game runs, and the two figures at the bottom are
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
      pool, and the tree's first node began about fourteen hundred pixels down — a tab
      called Path whose first screenful contains no path. Two halves and a switch, tree
      first, and the unspent count moved onto the tab bar where it is visible from
      anywhere.</p>
    ${MOCK_HALVES}

    <h3>凝丹 The way out of the only dead end</h3>
    <p class="t">The wall below needs an escape hatch or it is not a wall, it is a stop.
      This is it, and it is drawn only at the moment it is an answer: 材 material at
      zero, a 妖丹 still to be had, and a warden that will not fall without one.</p>
    ${MOCK_CONDENSE}

    <h3>收 The corner</h3>
    <p class="t">Five bare characters floating over the corner of a screen that is already
      teaching characters is five unanswered questions at once. One button, and every row
      arrives with its name in English.</p>
    ${MOCK_MENU}
  </section>

  <section class="sec" id="board">
    <h2><span class="h">狀</span> Where we are</h2>
    <p class="t">Three states and no fourth. <b class="cjk" style="color:var(--cyan)">成</b>
      closed means built, measured by a test, and written up below.
      <b class="cjk" style="color:var(--gold)">行</b> open means it exists and is still
      moving. <b class="cjk">待</b> planned means agreed and not started. "Mostly done" is
      open.</p>
    <p class="t"><b>${SYSTEMS.filter((x) => x.status === 'done').length} closed,
      ${SYSTEMS.filter((x) => x.status === 'open').length} open,
      ${SYSTEMS.filter((x) => x.status === 'planned').length} planned.</b> Counted from the
      board itself, so it cannot disagree with the rows under it.</p>
    <div class="board">${statusRows}</div>
  </section>

  <section class="sec" id="where">
    <h2><span class="h">包</span> Where to play</h2>
    <p class="t">One codebase, two ways in. The page is the game; the APK is a window onto
      the same page, so it is installed once and never again. Every push updates both.</p>
    <div class="where">
      <a href="${PAGES}"><b>網</b><span><em>The page</em>
        <i>${PAGES.replace('https://', '')} — open it on the phone and add it to the home
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
      before.</b> Seven systems were open at realm 1, minute 1 — gear, fusing, the tree,
      the tower, the record, the furnace, refining — so a new cultivator met five tabs and
      a dozen mechanics at once and then climbed eight realms that gave them nothing but
      bigger numbers.</p>
    <table>
      <tr><th>realm</th><th>勢 stance</th><th>訣 art</th><th>開 and what opens</th></tr>
      ${opensRows}
    </table>
    <p class="t">The first realm was deliberately bare, and that was an over-correction.
      The fear was right; the answer taken from it was <em>nothing at all</em>, for
      thirteen hours — a bar, eighteen purchases, and one fight at the very end. The
      second realm blooms, but a player has to last until it.</p>
    <div class="rule"><b>弱 And the first realm's own beasts were sitting there the whole
      time.</b> Measured layer by layer, they arrive as a ladder without a number being
      touched: 山鼠 the rat becomes winnable at the fifth layer, around two hours in, at
      <b>66%</b>; 野犬 the hound at the sixth; 澤蛙 the frog at the seventh; and 妖狐 the
      fox, the warden, at the ninth. Four fights, each a real question when it comes —
      and every one of them was hidden behind the second realm. So 狩 Hunt opens at the
      <b>first</b>. Not the bestiary, not gear, not a stance: three beasts, honest odds,
      and nothing to lose by trying. 器 gear and 勢 the build still arrive together at
      the second, and they read better for it — you have been killing these animals for
      hours, and now they start leaving things behind.</div>
    <div class="rows">${opensCards}</div>
    <div class="rule"><b>A system that arrives late arrives full.</b> The 道 points earned
      from the first layer are all waiting when the tree opens at the fourth realm, and
      every beast killed before the sixth is already counted when 圖鑑 the bestiary starts
      paying for finished realms. Nothing is withheld and then thrown away; it is withheld
      and then handed over. A locked tab keeps its own character and says which realm
      opens it, because you cannot look forward to a tab you have never seen.</div>
    <div class="rule"><b>環 And the first realm has to close its loop.</b> Bruno, playing
      it: <em>"a primeira hunt não dá nada. Apenas está lá."</em> He was right, and the
      hunting was not the problem. A kill paid 材 material, and material bought nothing
      until the third realm — two days with a dead coin in your pocket — while the marks
      those kills earned were counted from the first one and paid from the sixth. Both
      rewards existed. Both were locked in cupboards a fortnight away. So the first realm
      holds one whole loop instead of a third of one: 狩 something to kill, 妖丹 something
      the killing buys at 3 材 for +8% power, and 錄 the count that makes the tenth kill
      worth more than the first. Wardens still do not <em>demand</em> cores until the
      third realm — being sold a thing earlier than you are required to have it is the
      right way round, and the reverse is the wall this section exists to stop.</div>
  </section>

  <section class="sec" id="habits">
    <h2><span class="h">勤</span> Playing, and waiting</h2>
    <p class="t">An idle game has to answer one question honestly: <b>what does being
      there buy me?</b> For a while 九境 answered it badly — measured, somebody playing six
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
        <i>${TOWER_QI_HOURS} hours of your own gathering, once, and never again — there is no
        floor to farm. This is the one place in the game where fighting moves the bar
        instead of only moving your power.</i></span></div>
    </div>
    <div class="rule"><b>And nothing anywhere pays less for being away.</b> The qi gathers
      at full rate with the phone closed, every second of it, whatever else changes. 入定
      is written as a multiplier that starts at 1 and climbs, so no call in the game can
      pay below the promised rate. Being active is worth something because it adds, never
      because being away subtracts.</div>
    <h3>Five cultivators, one game — played out, not guessed</h3>
    <p class="t">Every one of them walks a 道 branch, hunts, picks up what falls and wears
      it. That sentence is newer than it should be: for most of this game's life the
      harness did none of those things, and every number it printed belonged to a
      cultivator who does not exist.</p>
    <table>
      <tr><th>habit</th><th style="text-align:right">visits</th>
          <th style="text-align:right">open</th><th style="text-align:right">realm 9</th>
          <th style="text-align:right">力 at the end</th><th style="text-align:right">tower</th>
          <th style="text-align:right">fights</th></tr>
      ${habitRows}
    </table>
    <p class="t">The top row is the whole point. That cultivator's qi is not the problem —
      every upgrade qi can buy is at its cap and the bar fills as fast as anybody's. What
      they are short of is not qi. It is a reason to have been there.</p>
    <p class="t">And the bottom row is the other half: playing every waking hour is worth
      about <b>twice</b> the speed of playing casually, not twenty times. The game is not
      supposed to belong to whoever has the most free time.</p>
    <div class="warn"><b>器 Gear was the widest hole the game ever had.</b> The 氣 axis on a
      piece is a qi-rate multiplier with no cap, earned by hunting — exactly the
      <em>playing more finishes sooner</em> trap the whole economy was built to avoid. With
      the drops finally picked up and worn, the active cultivator finished on
      <b>day 38</b> and the hourly one on <b>day 20</b>, against a promise of ninety; the
      claim above was false and nothing could see it, because nothing had ever equipped a
      piece. Gear and 道 the tree together now bend toward
      <b>×${UNCAPPED_RATE_CEILING}</b> and can never reach it. It is a bend and not a wall
      on purpose: a cultivator at a hard clamp has two hundred wasted points and every 氣
      roll they find afterwards does nothing, and a stat that silently stops working is
      worse than a stat that was never there.</div>
  </section>

  <section class="sec" id="wall">
    <h2><span class="h">守貢</span> The wall, and why it had to be a slope</h2>
    <p class="t">Bruno asked for it in one sentence: <i>"não um muro que torne impossivel
      mas que dificulte players 100% idle e premeie jogadores mais ativos."</i> Not a
      locked door — a climb that is harder for somebody who never plays and kinder to
      somebody who does.</p>

    <h3>Why the obvious lever could not do it</h3>
    <p class="t">The design was already there and it was not holding. A warden's power
      counts 妖丹 cores, so from the third realm a warden cannot be walked past by anyone
      who has never killed anything — except that <b>the warden itself paid a full
      harvest of 材</b>, so nine warden kills funded the cores for the next nine warden
      kills and the gate financed its own key. Measured, a cultivator who never tapped a
      beast reached the ninth realm holding 39 core levels against the 40 the last warden
      reads for: through by a hair, on a loop that never asked them to play.</p>
    <p class="t">The obvious fix is to cut what a warden pays. It was swept across its
      whole range, and it turns out to have <b>no middle at all</b>:</p>
    <table>
      <tr><th>a warden pays…</th><th style="text-align:right">the waiter finishes</th></tr>
      <tr><td>everything (as shipped)</td><td style="text-align:right">day 142</td></tr>
      <tr><td>90%</td><td style="text-align:right">day 142</td></tr>
      <tr><td>80%</td><td style="text-align:right">day 142</td></tr>
      <tr><td>70%</td><td style="text-align:right"><b>never</b> — stuck in the eighth realm</td></tr>
      <tr><td>60%</td><td style="text-align:right"><b>never</b> — stuck in the seventh</td></tr>
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
      harness grew a cultivator whose day is the waiter's day exactly — one visit, no
      tower, no gear, no furnace — <b>plus two beasts before putting the phone down</b>.
      Two beasts a day is worth <b class="big">${BARELY_SAVES} days</b> off the climb.</p>
    <div class="rule"><b>And nothing was taken away.</b> The qi rate is untouched. Offline
      is untouched. Losing a fight still costs nothing, and the screen still says so. The
      only thing that changed is the price of a warden, paid in the one currency that has
      always come from playing — and the one thing that was added is a way to pay it
      without playing, dearly.</div>
  </section>

  <section class="sec" id="clock">
    <h2><span class="h">曆</span> The content clock</h2>
    <p class="t">Bruno: <i>"o ideal seria haver conteudo para 3 meses para o lançamento
      para dar tempo de planearmos expansões."</i> Three months is thirteen weeks. So the
      question is not how long the climb takes — it is <b>when the last new thing
      arrives</b>, which is a different number and nobody had measured it.</p>
    <p class="t">Counting every named thing a player meets — a system opening, a beast, a
      stance, an art, a lineage of gear — against the days the ${ACTIVE_NAME} cultivator
      actually reaches each realm:</p>
    <table>
      <tr><th>week</th><th style="text-align:right">new things</th><th>&nbsp;</th></tr>
      ${CLOCK_ROWS}
    </table>
    <p class="t">Three readings, and all three are uncomfortable:</p>
    <div class="rows">
      <div class="row"><span class="body"><b class="cjk">前</b> <em>Half the game is spent in week one</em>
        <i>Four of the nine realms arrive by day ${CLOCK_R4}. A player has met a third of
        every named thing in 九境 before they have formed a habit of opening it.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">塊</b> <em>A realm empties itself in its first minute</em>
        <i>Every realm hands over all of its beasts, its stance, its art and its lineage
        at the breakthrough — and the later realms last twelve to sixteen days each. The
        eighth realm is ${CLOCK_R8} days long and delivers everything it has on day one
        of them.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">後</b> <em>And after day ${CLOCK_LAST}, nothing, for ever</em>
        <i>The summit is reached on day ${CLOCK_DONE} and 劫 the tribulation runs at a
        steady ${ENDGAME_PACE} days a mark from there to infinity — the same Dragon, the
        same loop, at a bigger number. That is a pace, not a calendar.</i></span></div>
    </div>
    <div class="warn"><b>What this section is not.</b> It is not a plan yet. It is the
      measurement that any plan has to start from, and it is on this page so that the
      three months are argued about with a number rather than a feeling.</div>
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
      who <em>spends</em> — who opens the app, buys whatever they can afford, and closes it
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
      three buttons that could not be pressed. Not a slow opening — an opening with no
      decision in it. So a cultivator now begins holding ${num(OPENING_PURSE)} qi, which is
      nothing against a climb measured in quintillions and gone inside the first hour. It
      sits just under the first rung at ${num(ladderAt(0))} on purpose: at or above it the
      ladder would swallow the purse on the first tick and the player would watch a layer
      open by itself instead of choosing. Below it, the bar starts nine tenths full and the
      game's first question is the same one it asks in the ninth realm — <em>spend it, or
      let it carry you up?</em></div>
  </section>

  <section class="sec" id="realms">
    <h2><span class="h">境</span> The nine realms</h2>
    <p class="t">Nine names out of cultivation fiction, nine colours walking from cyan to
      magenta, and a drawing that gains something at every one. The warden of a realm bars
      the breakthrough; beating it opens 突破, and pressing 突破 is what takes it.</p>
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
      reading 98%, and only the last one was worth pressing: every beast below your realm
      had fixed power, paid less material and dropped nothing you wanted. Thirty-six
      animals were drawn and twenty-seven of them stopped existing the moment you climbed
      past them.</p>
    <p class="t">So the kills already sitting in the save mean something, and they mean it
      from the first one rather than from the sixth realm. Every beast carries three
      marks:</p>
    <div class="rows">${markRows}</div>
    <p class="t">A finished record — all ${BEASTS.length} beasts, ${MARKS[MARKS.length - 1]}
      kills each — is <b>×${ceiling.material.toFixed(2)}</b> material and
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
      about the harness — a player hunts the strongest beast they can beat, because that
      is the one that pays, so a realm's weakest animal is killed once for its 見 mark
      and then never again. Nothing had ever given a reason to go back for it. Forty
      fights against animals you outclass is that reason, and the test fails if any of
      the five habits ever finishes a realm by accident.</div>

    <h3>示 And the game always says what to do next</h3>
    <p class="t">From the third realm a warden will not fall without 妖丹 cores, and a
      player who has never opened 狩 Hunt meets that wall, loses a fight they cannot read,
      and has nothing anywhere telling them why. 修 Cultivate carries one line, computed
      from the state, that names the thing actually blocking them — the material they are
      short of, the level they can already afford, the empty 訣 sequence — and takes them
      to the screen that fixes it.</p>
    <div class="rule"><b>續 And it is never silent, which is the harder half.</b> For a
      long time that line answered only <em>what is blocking you</em> and said nothing at
      all the rest of the time — which is most of the game, and all of the quiet
      stretches a player actually leaves over. A sentence that only speaks when you are
      stuck teaches a player that not being stuck means there is nothing to do. So below
      the blocking lines there is always another: a beast you can take and the mark it
      still owes you, a level you can afford right now, a beast you cannot take yet
      <em>and the power it stands at against yours</em>, or the next thing the mountain
      will hand over and the realm that hands it. A target with a number on it is
      gameplay. An empty line is not. It is checked the only way a promise like that can
      be — 324 places on the mountain, every realm, every layer, four depths of
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
      can cost nothing — there is nothing to lose that has not already happened.</p>
    <p class="t"><b>氣運 Form.</b> Each side rolls once, before any blow, for
      ±${pc(FORM)} of its power. Blow-by-blow noise averages away over ten rounds, so
      whoever had more power won every single time; one roll per fight does not average
      away, and it is what makes an underdog worth trying.</p>
    <p class="t"><b>The odds on screen are counted, not curved.</b> The number is 41 whole
      fights on spread seeds, won and counted. A sigmoid over the power ratio cannot see a
      stance that halves what you take or an art that triples a strike, and the old one
      cheerfully promised 34% on fights the build lost a hundred times out of a hundred.</p>
    <div class="rule"><b>What a warden asks for.</b> Exactly the power of a cultivator who
      has filled the realm's cap and brought nothing else — so the fight is a coin flip for
      somebody with the levels and nothing more, and the stance, the sequence, the gear, the
      cores and the tree are what turn the coin over. Commons stand at
      ${[0.45, 0.62, 0.84].map((s) => pc(s)).join(', ')} of the realm's reference, which is
      a cultivator ${REFERENCE_BELOW} levels short of the cap.</div>
    <div class="rule"><b>初 Except the first realm, which is spaced against the player.</b>
      Every realm is entered weak — measured, a cultivator arrives at 25%, 23%, 16%, 11%
      and 7% of the realm they are climbing into, and the first at 5%. That is one
      pattern, not an exception. What makes the first realm different is that it is the
      only one with <em>nothing else in it</em>: from the second there is gear to find, a
      stance to choose, a record filling, a tower, a tree, and the wait is furnished. In
      the first there is a bar and three boxes. At the standard spacing the first fight a
      player could win arrived <b>two hours and six minutes</b> in, and the true odds
      before it were not small — they were 0.0%, flat, the whole way. Combat there was a
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
    <h3>勢 Stances — one, always on. You hold the stance of every realm you have reached.</h3>
    <div class="rows">${stanceRows}</div>
    <h3>訣 Arts — ${SEQUENCE_SLOTS} in an order, one firing each round, then looping.
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
      <b>percentage</b>, never a flat amount, so a good weapon found at the third realm is
      still a good weapon at the ninth — and with 煉器 <a href="#refine">refining</a> it can
      go on growing rather than being replaced and forgotten.</p>
    <h3>The five ranks</h3>
    <div class="pills">${RARITIES.map((r) => `<span class="pill">
      <b class="cjk" style="color:${RARITY_INFO[r].colour}">${RARITY_INFO[r].han}</b>
      <i>${RARITY_INFO[r].name} · x${RARITY_INFO[r].mult} · ${SECONDARIES[r]} extra
      ${SECONDARIES[r] === 1 ? 'line' : 'lines'}</i></span>`).join('')}</div>
    <h3>The seven axes</h3>
    <div class="pills">${AFFIXES.map((a) => `<span class="pill">
      <b class="cjk">${AFFIX_INFO[a].han}</b><i>${AFFIX_INFO[a].label}</i></span>`).join('')}</div>
    <h3>The nine lineages — wear ${SET_STEPS.join(', ')} pieces of one realm and it pays</h3>
    <div class="cards two">${setRows}</div>
    <h3>The ${ARCHETYPES.length} shapes, by slot</h3>
    <div class="cards two">${archetypeRows}</div>
    <h3>Every piece in the game, by realm</h3>
    <p class="t">A piece's name is its lineage and its shape: 凡鐵劍 is a Mortal Iron Sword
      and 仙蛻劍 is an Ascendant Sword. Nothing is typed out — a new shape adds nine pieces
      and a tenth realm would add ${ARCHETYPES.length}, without a line of naming.</p>
    <div class="cards">${itemNames}</div>
  </section>

  <section class="sec" id="refine">
    <h2><span class="h">煉器</span> Refining, and what 材 is actually for</h2>
    <p class="t">材 Material was <b>eight times over-supplied</b>, measured. Everything it
      could ever buy — all ${levelCap(9)} 妖丹 cores — costs 93.6M, and 無盡塔 the tower
      alone pays 803M over its first ninety floors before a single beast is hunted. A
      cultivator playing normally finished the climb sitting on three billion of it with
      nothing to spend it on; one who tapped 狩 Hunt hard finished on two hundred and
      eighty billion. Material stopped meaning anything the moment the cores were full.</p>
    <p class="t">So a piece you wear can be <b>refined</b>, with material, for ever. Every
      level adds ${(REFINE_GAIN * 100).toFixed(0)}% to every line on that piece, and there
      is no top level — the price is the only ceiling. It rides the tower's own pay curve,
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
      one used to refuse everything that fell after the last — which a cultivator hunting
      properly manages inside one visit. Losing the 天 that just dropped because forty 凡
      got there first is the game wasting the player's time where they cannot even see it.
      Now the worst piece goes instead, and the arena says which.</div>

    <h3>新 And every system introduces itself, once</h3>
    <p class="t">示 the advice line answers <em>why am I stuck</em>. These answer the other
      half — <em>what is this thing that just appeared</em>. Each one fires when the thing
      it describes first becomes true, fires once ever, and never blocks the game.</p>
    <div class="rows">${noticeRows}</div>
  </section>

  <section class="sec" id="tree">
    <h2><span class="h">道</span> The technique tree</h2>
    <p class="t"><b>One tree, ${ALL_NODES.length} nodes, three branches that all grow from
      起.</b> Gold bridges cross between them, so you can climb one branch and step into the
      next. Points come from the climb itself: one for every three layers, two for every
      warden. A full run earns about <b>${FULL_RUN}</b> against a tree costing
      <b>${TOTAL_COST}</b>, so nobody finishes it — and that gap is the feature. A tree you
      can complete is a checklist, and a checklist is not a build.</p>
    <p class="t">At the middle of each branch there are two nodes and room for one. Each
      keystone is stronger than the node beside it and each one gives something up.</p>
    <div class="cards three">${treeColumns}</div>
    <h3>What a branch costs the clock — measured, tower and furnace on</h3>
    <table>
      <tr><th>branch</th><th style="text-align:right">realm 9 on day</th></tr>
      ${BY_BRANCH.map(({ b, day }) => `<tr><td><b class="cjk">${
        { none: '—', sword: '劍', spirit: '神', fortune: '運' }[b]}</b> <i>${
        { none: 'no tree at all', sword: 'The Sword', spirit: 'The Spirit', fortune: 'Fortune' }[b]}</i></td>
        <td class="n">${day.toFixed(1)}</td></tr>`).join('')}
    </table>
    <div class="warn"><b>神 once cut the game to a third, and nothing could see it.</b>
      劍 and 神 were written with the same numbers — 15, 20, 30, 45, 80 — one on power and
      one on the qi rate. It reads as fair and it is not: power buys fights, and the climb
      is not gated by fights. The run is very nearly <em>days ÷ rate</em>, so nine 神 nodes
      took the ninth realm on <b>day 30</b> against the sword's 82. No test could catch it,
      because no harness had ever spent a 道 point. 神 now pays in 入定 the sitting instead,
      which only counts while you are looking at the phone — and an idle game spends almost
      all of its life shut. No branch may multiply the rate past
      <b>×${TREE_RATE_CEILING}</b>, and <code>dao.test.ts</code> fails if one does.</div>
  </section>

  <section class="sec" id="tower">
    <h2><span class="h">塔</span> The Endless Tower <i class="faint cjk" style="font-size:19px;font-weight:400">無盡塔</i></h2>
    <p class="t">One floor, one beast, one fight. Win and the floor is yours for good; lose
      and nothing happens. Only ever the next floor is open, and it never runs out.</p>
    <p class="t">A floor's power is not a new curve. It reads <b>the same reference the
      wardens read</b>, one realm every ${FLOORS_PER_REALM} floors — so floor
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
    <p class="t">The one thing qi buys that no realm caps. It is paid for <b>twice</b> — in
      qi, which comes from waiting, and in 材 material, which comes from killing things — so
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
    <h3>What a pill costs — ${PILL_SHARE} of the rung it rides, and past the summit it goes
      on climbing</h3>
    <table>
      <tr><th>pill</th><th style="text-align:right">qi</th><th style="text-align:right">材</th></tr>
      ${pillPrices}
    </table>
    <p class="t">One 煉體丹 is +${pc(PILL_POWER)} power for ever. One 破煞丹 takes
      ${pc(1 - 0.985)} off every beast and never takes it below ${pc(PILL_BANE_FLOOR)} of
      its power — a beast that can be reduced to nothing stops being a fight, and then the
      tower has no top. One 聚寶丹 is +${pc(PILL_FORTUNE)} on the rare end of the drop
      table.</p>
    <p class="t">Brewing everything, all the way up, is a real choice and a real cost.
      Measured against the same cultivator climbing the same tower and brewing nothing, it
      takes them from day ${CLIMBER.arrival[8].toFixed(1)} to day
      ${BREWER.arrival[8].toFixed(1)} and leaves them
      ${(power(BREWER.state) / power(CLIMBER.state)).toFixed(1)}x stronger, on
      ${pillsTaken(BREWER.state.brewed)} pills.</p>
    <div class="rule"><b>爐底 The furnace starts one realm behind you, not at the foot of
      the mountain.</b> It opens at the seventh realm, and its first pill used to be priced
      for the first: 450 qi to somebody gathering 192k qi a second. Measured, an hour after
      it opened, tapping the buttons bought a hundred pills and 3.2x power. A system that
      opens late starts where the player is standing — one realm back, so the first pill is
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
      crossings — measured, ten marks a day, every number in the game multiplied by two
      hundred daily until the arithmetic ran out of exponent. A pool that refills is what
      makes 渡劫 a ladder rather than a lever you hold down. It also puts the furnace in
      real tension with the Dragon: qi brewed is qi not pooled.</div>
    <p class="t">The next Dragon is built from <b>the power that actually faced the last
      one</b> — which is not 力. A stance bends every blow and three arts bend three more,
      worth about 1.8x between them, and none of that is in the number on the screen. The
      Dragon used to be anchored below all of it, and the build covered the gap for free:
      measured over twenty-four crossings, the odds never once fell under 90% and 煉體, the
      one pill a Dragon can feel, was never worth brewing. Two days, tap, win, for ever.</p>
    <div class="rule"><b>立 Where the Dragon plants its feet.</b> ${TRIBULATION_FOOTING}x
      the 力 it last faced — not 1.8x, because 力 is the sword and the shield at once and a
      multiplier on blows is worth about its square root in the ratio. The band is narrow
      and it was measured, forty crossings each: 1.20 gives 98% every time and no decision;
      1.45 gives three days and the high sixties; 1.60 runs away to sixty-day crossings;
      1.70 is a wall by the ninth mark.</div>
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
    <p class="t">A cultivator collects numbers in their head — the day, the floor, the
      kills, the marks — and until now the game had nowhere to show them. 碑 the stele is
      that page: ${DEEDS.length} deeds across ${TRACKS.length} tracks, and every unfinished
      one is a <b>bar rather than a padlock</b>, because <em>two floors away</em> is a
      reason to open the app tonight and a locked box is not.</p>
    <div class="rule"><b>A deed pays nothing.</b> Not qi, not power, not material. The
      economy's one law is that nothing uncapped may raise the qi rate, and a list of
      deeds is about as uncapped as a thing gets — but the deeper reason is that 九境 is
      meant to go online. A deed that pays is a deed worth forging, and a leaderboard of
      forged deeds is not a leaderboard.</div>
    <div class="rule"><b>And a deed is derived, never stored.</b> Exactly like 勢 the
      stances and 訣 the arts: nothing in the save says <em>I have done this</em>. Every
      deed is recomputed from numbers the save already carries and the validator already
      caps, so there is no flag to flip — a hand-edited save cannot claim a deed without
      claiming the whole run underneath it.</div>
    ${TRACKS.map((t) => `<div class="card" style="--hue:var(--cyan)">
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
      lost — that protects you from the game; only your own copy protects you from the
      phone.</p>
    <div class="warn"><b>A save is input, and it is validated like any other input.</b>
      Every number is capped, every item is checked against the table it claims to come
      from, no axis may appear twice on one piece, and nothing may hold more qi than the
      fastest conceivable cultivator could have gathered since the run began. Some things
      are not stored at all but <em>derived</em>: stances follow from the realm reached and
      arts from the wardens put down, so an edited save cannot put 龍威 in the first slot at
      realm 1 and walk over every warden in the game. Levels are clamped to the realm's
      cap, because the cap is what holds the curve up.</div>
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
        changes every time a layer opens — applying one rate across the gap would underpay
        it in silence.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">手</b> <em>Only the player climbs a realm</em>
        <i>Time banks qi at a ceiling and stops there. Beating the warden opens 突破;
        pressing it is what takes the realm. The one moment the game stops for is not
        allowed to happen while nobody is looking.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">失</b> <em>Losing costs nothing</em>
        <i>Every fight in the game, wardens and tower floors included. Come back stronger.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">數</b> <em>One table of numbers</em>
        <i>Nothing that shapes the curve lives outside src/sim/balance.ts, and the test
        suite prints all of it on every run — so changing one is never silent.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">氣</b> <em>Nothing uncapped raises the qi rate</em>
        <i>The rule that keeps the economy safe for good. Everything that multiplies
        gathering is behind the realm cap; everything uncapped buys power, fortune or
        knowledge instead. It was written down long before anything enforced it, and both
        器 gear and 道 the tree quietly broke it for months — so <code>rate()</code> now bends them
        toward ×${UNCAPPED_RATE_CEILING} rather than trusting anybody to remember.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">文</b> <em>All the prose is in one file</em>
        <i>src/app/copy.ts. Text scattered across six screens cannot be reviewed, and this
        is the file a translation would replace.</i></span></div>
      <div class="row"><span class="body"><b class="cjk">譯</b> <em>No character is ever the only place a thing is named</em>
        <i>The characters stay — they are what the game looks like, and a version without
        them is a spreadsheet about numbers going up. So every one of them carries an
        English name somewhere it can be found: on the row itself where there is space,
        and on 釋 the key, which is one tap from every screen and is read out of the same
        tables the game reads. A test fails if a rank, an axis, a slot, a pill line or a
        whole system is ever added without one.</i></span></div>
    </div>
  </section>

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Generated from the game's own code by <code>npm run bible</code>. Icons from
      game-icons.net under CC BY 3.0. When a system closes, move its row on the board and
      write its section — that is the whole process.</p>
  </footer>
</div>
`;

writeFileSync('bible.html', page);
const kb = Math.round(page.length / 1024);
console.log(`bible.html — ${kb} KB · ${SYSTEMS.filter((s) => s.status === 'done').length} closed, ` +
  `${SYSTEMS.filter((s) => s.status === 'open').length} open, ` +
  `${SYSTEMS.filter((s) => s.status === 'planned').length} planned · ` +
  `${GEAR.length} items, ${LINES.length * 9} pills, ${BEASTS.length} beasts named in full`);
