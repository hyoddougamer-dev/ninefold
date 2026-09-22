/**
 * 文 An audit of the text the player reads.
 *
 * The first version of this tool scraped the built bundle and found 37 sentences out of
 * a game that has well over a hundred: regexes cannot reliably tell a sentence from a
 * CSS class in minified output. So the copy lives in one module instead, and this reads
 * that module plus the two data files that carry player-facing lines.
 *
 * What it counts is the handful of habits that make writing read as machine-written:
 *
 *   the em-dash used as a rhetorical beat, several to a screen
 *   sentences explaining why the game was designed this way rather than what to do
 *     (the bare phrase "the game" was in this list and had to come out: the game refers
 *     to itself perfectly legitimately, in "back to the game")
 *   three clauses in a row where one would land
 *   sentences long enough that the eye slides off them
 *
 * A flag is not automatically a fault. It is a line to go and read out loud.
 */
import { readFileSync } from 'node:fs';
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
    hit: (s: string) => /\b(that is (the point|why|what)|which is (the point|why)|it is what|by design|this version)\b/i.test(s),
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

/**
 * 頁 And the bible, which nobody had ever held to the same rule.
 *
 * Bruno: *"texto muito AIsh e com muitos travessões longos."* The game's own copy was
 * clean, because this tool has been auditing it. The page it never looked at was the one
 * I write, and that is where every one of the em-dashes actually was.
 *
 * The page is one template literal, so the prose is taken out of the built HTML instead
 * of out of the source: tags dropped, code dropped, what is left is the sentences a
 * reader actually meets.
 */
const html = (() => {
  try { return readFileSync(new URL('../bible.html', import.meta.url), 'utf8'); }
  catch { return null; }
})();

if (html) {
  const prose = html
    // 空 A cell holding nothing holds a dash, which is correct typography and not prose.
    // Counting those made the audit unable to ever reach zero, and an audit that cannot
    // reach zero stops being read.
    .replace(/<t[dh][^>]*>\s*—\s*<\/t[dh]>/g, '<td></td>')
    .replace(/<[a-z]+[^>]*>\s*—\s*<\/[a-z]+>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    // 塊 A block ends a sentence whether or not it ends in a full stop. Without this a
    // table of nine realms and a heading above it came back as one 400-character
    // "sentence", and a third of what the audit flagged for length was that, not prose.
    // It runs after the wholesale strips above, or it eats the </pre> they look for.
    .replace(/<\/(p|div|li|td|th|tr|h[1-6]|section|blockquote|dt|dd|figcaption|code|em|b|i)>/g, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ');
  const lines = prose.split(/(?<=[.!?])\s+/).map((x) => x.replace(/\s+/g, ' ').trim())
    .filter((x) => x.length > 30 && /[a-z]{4}/.test(x));
  const dashes = lines.filter((x) => x.includes('—'));
  const long = lines.filter((x) => x.length > 180);
  console.log(`頁 the bible: ${lines.length} sentences a reader meets.\n`);
  console.log(`  em-dash as a beat: ${dashes.length} (${Math.round(100 * dashes.length / lines.length)}%)`);
  console.log(`  a sentence over 180 characters: ${long.length}`);
  console.log(`  longest: ${[...lines].sort((a, b) => b.length - a.length)[0]?.slice(0, 160) ?? ''}\n`);
}
