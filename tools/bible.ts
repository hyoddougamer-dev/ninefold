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
  SET_STEPS, SLOTS, SLOT_INFO, archetypesOf,
} from '../src/data/gear.ts';
import { ALL_NODES, PATH_INFO, PATHS, TOTAL_COST, nodesOf } from '../src/data/techniques.ts';
import { UPGRADES, UPGRADE_INFO, newState, power, upgradeCost } from '../src/sim/state.ts';
import { CHEST_LIMIT, FUSE_COUNT } from '../src/sim/chest.ts';
import {
  HUNT_SHARE, LADDER_FIRST, LADDER_GROWTH_FIRST, LADDER_GROWTH_LAST, LAYERS,
  LAYERS_PER_REALM, LEVELS_PER_REALM, MARK_DAYS, TARGET_DAYS, TREE_RATE_CEILING,
  UNCAPPED_RATE_CEILING,
  TRIBULATION_CHALLENGE,
  TRIBULATION_FOOTING, TRIBULATION_GAIN, ladderAt, levelCap, realmCost,
} from '../src/sim/balance.ts';
import { FORM, REFERENCE_BELOW, beastPower, loot } from '../src/sim/combat.ts';
import { FLOORS_PER_REALM, SEAL_LOOT, floorLoot, floorPower } from '../src/sim/tower.ts';
import {
  PILL_BANE_FLOOR, PILL_FORTUNE, PILL_POWER, PILL_SHARE, pillCost, pillsTaken,
} from '../src/sim/furnace.ts';
import { daoEarned } from '../src/sim/dao.ts';
import { FOCUS_HOLD, FOCUS_MAX, FOCUS_RAMP, TOWER_QI_HOURS } from '../src/sim/balance.ts';
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
import { SYSTEMS as OPENED, opensIn } from '../src/sim/unlocks.ts';
import { REFINE_DEPTH, REFINE_GAIN, refineCost, refineFactor, refineSpent } from '../src/sim/refine.ts';
import { CHEST_LIMIT as CHEST } from '../src/sim/chest.ts';

import { num } from '../src/sim/format.ts';
import { icon } from '../src/art/icon.ts';
import { portrait } from '../src/art/aura.ts';
import { arenaScene } from '../src/art/scene.ts';

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
    line: 'A warden asks for 妖丹, sitting with it gathers deeper, and a tower floor pays hours. Somebody who never fights stalls in the third realm.' },
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

const RUNS = playAll();

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
      <a href="#where"><b>包</b> Where to play</a>
      <a href="#loop"><b>環</b> How it is played</a>
      <a href="#opens"><b>開</b> What each realm opens</a>
      <a href="#habits"><b>勤</b> Playing vs waiting</a>
      <a href="#ladder"><b>階</b> The ladder</a>
      <a href="#cap"><b>上限</b> The cap</a>
      <a href="#qi"><b>氣</b> Qi</a>
      <a href="#realms"><b>境</b> The realms</a>
      <a href="#beasts"><b>狩</b> The beasts</a>
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

  <section class="sec" id="board">
    <h2><span class="h">狀</span> Where we are</h2>
    <p class="t">Three states and no fourth. <b class="cjk" style="color:var(--cyan)">成</b>
      closed means built, measured by a test, and written up below.
      <b class="cjk" style="color:var(--gold)">行</b> open means it exists and is still
      moving. <b class="cjk">待</b> planned means agreed and not started. "Mostly done" is
      open.</p>
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
    <p class="t">The first realm is deliberately bare: one screen, a bar, three boxes and a
      warden at the top of it. The second is where it blooms, and it blooms all at once on
      purpose — hunting, gear and the build are one idea. From the third it goes back to
      one thing at a time.</p>
    <div class="rows">${opensCards}</div>
    <div class="rule"><b>A system that arrives late arrives full.</b> The 道 points earned
      from the first layer are all waiting when the tree opens at the fourth realm, and
      every beast killed before the sixth is already counted when 錄 the record starts
      paying. Nothing is withheld and then thrown away; it is withheld and then handed
      over. A locked tab keeps its own character and says which realm opens it, because
      you cannot look forward to a tab you have never seen.</div>
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

  <section class="sec" id="record">
    <h2><span class="h">錄</span> The record</h2>
    <p class="t">狩 Hunt had a real problem. By the fifth realm it was fifteen buttons all
      reading 98%, and only the last one was worth pressing: every beast below your realm
      had fixed power, paid less material and dropped nothing you wanted. Thirty-six
      animals were drawn and twenty-seven of them stopped existing the moment you climbed
      past them.</p>
    <p class="t">So the kills already sitting in the save mean something. Every beast
      carries three marks:</p>
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
    <h3>示 And the game says why you are stuck</h3>
    <p class="t">From the third realm a warden will not fall without 妖丹 cores, and a
      player who has never opened 狩 Hunt meets that wall, loses a fight they cannot read,
      and has nothing anywhere telling them why. 修 Cultivate now carries one line,
      computed from the state, that names the thing actually blocking them — the material
      they are short of, the level they can already afford, the empty 訣 sequence — and
      takes them to the screen that fixes it. It says nothing at all the rest of the
      time.</p>
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
