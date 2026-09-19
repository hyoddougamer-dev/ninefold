/**
 * 文 An audit of the text the player reads.
 *
 * The first version of this tool scraped the built bundle and found 37 sentences out of
 * a game that has well over a hundred — regexes cannot reliably tell a sentence from a
 * CSS class in minified output. So the copy lives in one module instead, and this reads
 * that module plus the two data files that carry player-facing lines.
 *
 * What it counts is the handful of habits that make writing read as machine-written:
 *
 *   the em-dash used as a rhetorical beat, several to a screen
 *   sentences explaining why the game was designed this way rather than what to do
 *   three clauses in a row where one would land
 *   sentences long enough that the eye slides off them
 *
 * A flag is not automatically a fault. It is a line to go and read out loud.
 */
import * as COPY from '../src/app/copy.ts';
import { AFFIX_INFO, REALM_SETS } from '../src/data/gear.ts';
import { REALMS } from '../src/data/realms.ts';
import { ALL_NODES, PATH_INFO } from '../src/data/techniques.ts';
import { blowLine, verdictLine } from '../src/app/ui/blows.ts';

/** Every string the modules hold, whatever shape they hold it in. */
function harvest(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'function' && value.length === 0) harvest((value as () => unknown)(), out);
  else if (Array.isArray(value)) for (const v of value) harvest(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) harvest(v, out);
  return out;
}

const lines = [
  ...harvest(COPY),
  // Functions that take arguments cannot be harvested blind, so they are called here.
  COPY.HUNT.reach(5),
  COPY.GEAR.best('地'), COPY.GEAR.lines(2, 5), COPY.GEAR.drops(6), COPY.GEAR.setNeed(2),
  COPY.DAO.short(70, 42), COPY.DAO.taken(7, 28), COPY.DAO.closes('捨甲', 'Forsake Armour'),
  COPY.DAO.closed('重甲'), COPY.DAO.costs(3),
  COPY.BESTIARY.icons('lorc, delapouite'),
  COPY.RETURN.away('3h 20m'),
  ...REALMS.map((r) => r.gains),
  ...ALL_NODES.map((n) => n.text),
  ...REALM_SETS.map((s) => s.lore),
  ...Object.values(AFFIX_INFO).map((a) => a.label),
  ...Object.values(PATH_INFO).map((p) => p.blurb),
  ...[0, 1, 2, 3].flatMap((i) => [blowLine('player', i).text, blowLine('beast', i).text]),
  verdictLine(true, false).text, verdictLine(true, true).text, verdictLine(false, false).text,
];

const unique = [...new Set(lines.filter((s) => /\s/.test(s)))];

const TELLS = [
  { name: 'em-dash as a beat', hit: (s: string) => s.includes('—') },
  { name: 'three clauses in a row', hit: (s: string) => /\w+, \w[^,]*, and \w/.test(s) },
  {
    // The unit is the *sentence*, not the string: three short sentences in one line are
    // fine, and counting the whole line flags them for no reason.
    name: 'a sentence over 95 characters',
    hit: (s: string) => s.split(/(?<=[.!?])\s+/).some((x) => x.length > 95),
  },
  {
    name: 'explains the design, not the game',
    hit: (s: string) => /\b(that is (the point|why|what)|which is (the point|why)|it is what|by design|this version|the game)\b/i.test(s),
  },
];

console.log(`\n文 ${unique.length} lines reach the player.\n`);

let flagged = 0;
for (const tell of TELLS) {
  const found = unique.filter(tell.hit);
  flagged += found.length;
  console.log(`  ${tell.name}: ${found.length}`);
  for (const s of found) console.log(`     ${s}`);
}

const sentences = unique.flatMap((s) => s.split(/(?<=[.!?])\s+/));
const longest = [...sentences].sort((a, b) => b.length - a.length).slice(0, 3);
const mean = sentences.reduce((n, s) => n + s.length, 0) / sentences.length;
console.log(`\n  ${sentences.length} sentences, ${mean.toFixed(0)} characters on average.`);
console.log(`  longest three:`);
for (const s of longest) console.log(`     ${s.length}  ${s}`);

console.log(`\n  flagged: ${flagged} of ${unique.length}\n`);
