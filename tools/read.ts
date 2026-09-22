/**
 * 診 Reading a cultivator, from the save they sent you.
 *
 * Every improvement this repository has made came from Bruno playing and saying what he
 * felt: *"não encontro o tree"*, *"a primeira hunt não dá nada"*, *"o qi resetar"*. That
 * is the best signal the project has and it runs through exactly one phone. The moment
 * anybody else plays, it stops: somebody plays for twenty minutes, stops, and nothing
 * comes back but silence.
 *
 * There is no account and no cloud and there should not be one. What there is, is 出 the
 * save the player already holds: the panel hands them the whole thing as text. So a
 * tester sends that text, and this reads the run out of it.
 *
 *     npm run read -- their-save.json
 *     pbpaste | npm run read
 *
 * The section that matters is **what they never touched**. "Reached the third realm on
 * day four and never once opened 道" is a sentence somebody can act on. "I played for a
 * bit and stopped" is not.
 *
 * It reads and prints. It never writes anything, and it never asks the network.
 */
import { readFileSync } from 'node:fs';
import { validate, power, rate, layersOpened, capOf, canBuy, UPGRADES, UPGRADE_INFO,
  filledRealms, type State } from '../src/sim/state.ts';
import { advance } from '../src/sim/time.ts';
import { duration, num } from '../src/sim/format.ts';
import { LAYERS, LAYERS_PER_REALM } from '../src/sim/balance.ts';
import { realm as realmOf } from '../src/data/realms.ts';
import { BEASTS, WARDENS, huntable } from '../src/data/bestiary.ts';
import { SLOTS } from '../src/data/gear.ts';
import { ALL_NODES } from '../src/data/techniques.ts';
import { STANCES } from '../src/data/arts.ts';
import { MARKS, recordTally } from '../src/sim/record.ts';
import { daoEarned, daoFree } from '../src/sim/dao.ts';
import { SYSTEMS, isOpen } from '../src/sim/unlocks.ts';
import { canDrive } from '../src/sim/hunt.ts';
import { playAll } from './habits.ts';

const DAY = 86_400;
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));

/** The text, from a file named on the command line or from whatever was piped in. */
function input(): string {
  const file = process.argv[2];
  if (file && file !== '-') return readFileSync(file, 'utf8');
  try {
    return readFileSync(0, 'utf8');
  } catch {
    console.error('診 Give it a save: `npm run read -- their-save.json`, or pipe one in.');
    process.exit(2);
  }
}

/**
 * A save is input here as much as it is in the game, so it goes through the same
 * `validate` and never through a second idea of what a save is.
 */
function readSave(text: string, now: number): State {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    console.error('診 That is not a save. It should start with { and end with }.');
    process.exit(2);
  }
  const o = (parsed ?? {}) as Record<string, unknown>;
  const inner = o.game === 'ninefold' && o.state ? o.state : o;
  return validate(inner, now);
}

const now = Math.floor(Date.now() / 1000);
const held = readSave(input(), now);
// 歸 What the game would pay them the moment they opened it, so the reading is of the
// run as it stands rather than of a save frozen at the last write.
const s = advance(held, now);

const rung = layersOpened(s);
const r = realmOf(s.realm);
const age = Math.max(0, (now - s.startedAt) / DAY);
const away = Math.max(0, now - held.at);

console.log('\n診 A cultivator, read from their save\n');

// ── where they are ─────────────────────────────────────────────────────────
console.log('  ' + pad('where', 16) + `${r.han} ${r.name}, realm ${s.realm} of 9 · layer ${s.layer + 1} of ${LAYERS_PER_REALM}` +
  ` · rung ${rung} of ${LAYERS - 1}`);
console.log('  ' + pad('how long', 16) + `${age.toFixed(1)} days since the first second` +
  (away > 600 ? `, last played ${duration(away)} ago` : ', playing now'));
console.log('  ' + pad('the rate', 16) + `${num(rate(s))} qi a second standing`);
console.log('  ' + pad('the power', 16) + `力 ${num(power(s))}`);
console.log('  ' + pad('in hand', 16) + `${num(s.qi)} qi · ${num(s.materials)} 材`);

// ── against the eight we model ─────────────────────────────────────────────
console.log('\n  比 against the cultivators we model\n');
const runs = playAll();
for (const run of runs) {
  const reachedHere = run.arrival[s.realm - 1] ?? null;
  if (reachedHere === null) continue;
  const gap = age - reachedHere;
  const days = (n: number) => (Math.round(n) === 1 ? '1 day' : `${n.toFixed(0)} days`);
  const word = Math.abs(gap) < 1 ? 'about level with'
    : gap > 0 ? `${days(gap)} behind` : `${days(-gap)} ahead of`;
  console.log(`     ${pad(run.habit.name, 16)}reached this realm on day ${reachedHere.toFixed(0).padStart(3)} :  ${word} them`);
}

// ── what they have used ────────────────────────────────────────────────────
console.log('\n  用 what they have used\n');
const bought = UPGRADES.reduce((n, u) => n + s.levels[u], 0);
const room = UPGRADES.reduce((n, u) => n + capOf(s, u), 0);
const kills = Object.values(s.killed).reduce((a, b) => a + b, 0);
const [seen, known, mastered] = recordTally(s.killed);
const wardensDown = WARDENS.filter((w) => (s.killed[w.key] ?? 0) > 0).length;
console.log(`     ${pad('修 upgrades', 18)}${bought} levels bought of ${room} this realm allows`);
console.log(`     ${pad('狩 hunting', 18)}${num(kills)} kills · 見 ${seen} · 熟 ${known} · 通 ${mastered} of ${BEASTS.length} · ${wardensDown} wardens down`);
console.log(`     ${pad('器 gear', 18)}${Object.keys(s.worn).length} of ${SLOTS.length} slots worn · ${s.chest.length} in the chest`);
console.log(`     ${pad('道 the tree', 18)}${s.unlocked.length} of ${ALL_NODES.length} nodes · ${daoFree(rung, wardensDown, s.unlocked, filledRealms(s))} 道 unspent of ${daoEarned(rung, wardensDown, filledRealms(s))} earned`);
console.log(`     ${pad('勢 the build', 18)}${s.stance ? `${s.stance} stance` : 'no stance'} · ${s.sequence.length} art${s.sequence.length === 1 ? '' : 's'} in the sequence`);
console.log(`     ${pad('塔 the tower', 18)}${s.tower === 0 ? 'never climbed' : `floor ${s.tower}`}`);
console.log(`     ${pad('爐 the furnace', 18)}${Object.values(s.brewed).reduce((a, b) => a + b, 0)} pills brewed`);
console.log(`     ${pad('劫 the tribulation', 18)}${s.tribulation} 雷印 marks`);

// ── 空 what they never touched ─────────────────────────────────────────────
//
// The one section worth writing this whole tool for. A system that is open to them and
// that they have never once used is either something they could not find or something
// they did not want, and both of those are worth knowing before the next change.
console.log('\n  空 what is open to them and never been touched\n');
const untouched: string[] = [];
const since = (key: Parameters<typeof isOpen>[1]) => {
  const info = SYSTEMS.find((x) => x.key === key)!;
  return `open since the ${realmOf(info.realm).han} ${realmOf(info.realm).name} realm`;
};
if (isOpen(s.realm, 'tree') && s.unlocked.length === 0) {
  untouched.push(`道 the tree: ${since('tree')}, not one node, ${daoFree(rung, wardensDown, s.unlocked, filledRealms(s))} 道 sitting unspent`);
}
if (isOpen(s.realm, 'arts') && !s.stance) {
  untouched.push(`勢 no stance taken: ${since('arts')}, ${STANCES.length} to choose from`);
}
if (isOpen(s.realm, 'gear') && Object.keys(s.worn).length === 0) {
  untouched.push(`器 nothing worn: ${since('gear')}, ${s.chest.length} pieces in the chest`);
}
if (isOpen(s.realm, 'tower') && s.tower === 0) {
  untouched.push(`塔 the tower never climbed: ${since('tower')}`);
}
if (isOpen(s.realm, 'furnace') && Object.values(s.brewed).every((n) => n === 0)) {
  untouched.push(`爐 nothing brewed: ${since('furnace')}`);
}
if (isOpen(s.realm, 'cores') && s.levels.cores === 0) {
  untouched.push(`妖丹 no cores bought: ${since('cores')}, and a warden will not fall without them`);
}
const drivable = BEASTS.filter((b) => canDrive(s, b)).length;
if (drivable > 0 && kills > 0) {
  untouched.push(`圍 the drive: ${drivable} beasts are 熟 Known and could be driven instead of tapped`);
}
if (isOpen(s.realm, 'record') && mastered === 0 && kills > MARKS[2]) {
  untouched.push(`錄 ${num(kills)} kills and not one beast 通 Mastered: the count is spread thin`);
}
console.log(untouched.length
  ? untouched.map((line) => `     ${line}`).join('\n')
  : '     nothing, every system open to them has been used at least once');

// ── 止 where it stopped, and whether anything was in the way ───────────────
console.log('\n  止 where it stopped\n');
const affordable = UPGRADES.filter((u) => canBuy(s, u) && (u !== 'cores' || isOpen(s.realm, 'cores')));
const beasts = huntable(s.realm, s.layer).length;
console.log(`     the last write was ${away > 60 ? `${duration(away)} ago` : 'just now'}, at ${r.han} ${r.name} layer ${s.layer + 1}`);
console.log(`     ${affordable.length === 0
  ? 'nothing was affordable on the home screen'
  : `${affordable.length} of the four boxes were lit: ${affordable.map((u) => UPGRADE_INFO[u].han).join(' ')}`}`);
console.log(`     ${beasts} beasts were within reach`);

/**
 * 判 One line at the end, because that is the line somebody actually reads.
 *
 * There are only two interesting shapes. Either the game had run out of things for
 * them. Nothing to buy, nothing to fight, and they left, or it had not, and they
 * left anyway, which is the harder and more useful finding. The untouched list is the
 * first place to look for why.
 */
console.log('\n  判 the one line\n');
const stuck = affordable.length === 0 && beasts === 0;
if (away < 600) {
  console.log('     still playing, so there is nothing to explain yet.');
} else if (stuck) {
  console.log('     they ran out: nothing affordable and nothing to fight when they stopped.');
} else if (untouched.length > 0) {
  console.log(`     nothing was in the way: ${affordable.length} boxes lit and ${beasts} beasts`
    + ` in reach, and they stopped anyway, with ${untouched.length} system${untouched.length === 1 ? '' : 's'}`
    + ' open and never once used. That list is where to look first.');
} else {
  console.log(`     nothing was in the way and nothing was unused. They stopped for a reason`
    + ' this save cannot show, so it is worth asking them.');
}
console.log('');
