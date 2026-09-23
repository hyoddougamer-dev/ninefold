/**
 * 畫 Read `public/art/` and tell the game which paintings exist.
 *
 * 繪 Proposal C arrives one file at a time. This is what makes that possible: it scans
 * the folder, writes the list into src/data/pictures.ts, and prints what is still a
 * silhouette. Nothing else in the game knows or cares where a picture came from, so the
 * pictures can be generated, bought, or taken out of a museum's public domain, and they
 * can arrive over months without the game ever being half-drawn.
 *
 *     public/art/beast/<key>.webp     512 x 512   one creature, framed by the game
 *     public/art/realm/<n>.webp       768 x 432   a place, behind a card
 *     public/art/heaven/<n>.webp      768 x 432   the same, above the ninth realm
 *     public/art/cut/<key>.webp       up to 720   the creature with the paper keyed off
 *     public/art/self/<who>-<n>.webp  up to 720   that cultivator at that realm, the same way
 *     public/art/meet/<key>.webp      640 x 856   an encounter, a scene keeping its paper
 *     public/art/emblem/<key>.webp    320 square   one object on paper, shown small in a row
 *
 * 量 Why those sizes. A creature is drawn inside a circle at 94 to 140 pixels on a
 * phone, so 512 is twice what the densest screen needs and it survives being looked at
 * on a tablet. A backdrop is a wide band. WebP at quality 80 puts a creature at 30 to
 * 60 KB, which is the whole reason it is WebP: 45 creatures is then under three
 * megabytes, downloaded one realm at a time rather than all at once.
 *
 * Run with `npm run pictures`.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { BEASTS, HEAVEN_PLATES } from '../src/data/bestiary.ts';
import { REALMS } from '../src/data/realms.ts';
import { HEAVENS } from '../src/data/heavens.ts';
import { FIGURES, figureKey } from '../src/data/figures.ts';
import { MEETINGS } from '../src/data/meetings.ts';
import { ARTS } from '../src/data/arts.ts';
import { ALL_CARDS } from '../src/data/awakening.ts';
import { HERBS } from '../src/data/herbs.ts';
import { PILL_LINES } from '../src/data/alchemy.ts';
import { ROOM_INFO } from '../src/data/secret.ts';
import type { Painted } from '../src/data/pictures.ts';

const ROOT = 'public/art';
const KINDS: readonly Painted[] = ['beast', 'realm', 'heaven', 'cut', 'self', 'meet', 'emblem'];

/** What each kind is allowed to be named, so a stray file cannot enter the game. */
const KEYS: Record<Painted, readonly string[]> = {
  // 境外 The nine heavens' Dragons file their paintings beside the bestiary's, because
  // they are fought the same way and shown in the same frame. They are not beasts.
  beast: [...BEASTS.map((b) => b.key), ...HEAVEN_PLATES],
  realm: REALMS.map((r) => String(r.n)),
  heaven: HEAVENS.map((h) => String(h.n)),
  cut: [...BEASTS.map((b) => b.key), ...HEAVEN_PLATES],
  self: FIGURES.flatMap((f) => REALMS.map((r) => figureKey(f.key, r.n))),
  meet: MEETINGS.map((m) => m.key),
  emblem: [
    ...ARTS.map((a) => `art-${a.key}`),
    ...ALL_CARDS.map((c) => `card-${c.key}`),
    ...HERBS.map((h) => `herb-${h.key}`),
    ...Object.keys(PILL_LINES).map((k) => `pill-${k}`),
    ...Object.keys(ROOM_INFO).map((k) => `room-${k}`),
  ],
};

const found: Record<Painted, string[]> =
  { beast: [], realm: [], heaven: [], cut: [], self: [], meet: [], emblem: [] };
const strays: string[] = [];

for (const kind of KINDS) {
  const dir = `${ROOT}/${kind}`;
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.webp')) continue;
    const key = file.slice(0, -5);
    if (KEYS[kind].includes(key)) found[kind].push(key);
    else strays.push(`${kind}/${file}`);
  }
}

const list = (xs: readonly string[]) => (xs.length === 0 ? '[]'
  : `[\n${xs.map((x) => `    '${x}',`).join('\n')}\n  ]`);

const src = readFileSync('src/data/pictures.ts', 'utf8');
const next = src.replace(
  /export const PICTURES: Readonly<Record<Painted, readonly string\[\]>> = \{[\s\S]*?\n\};/,
  `export const PICTURES: Readonly<Record<Painted, readonly string[]>> = {\n`
  + `  beast: ${list(found.beast)},\n`
  + `  realm: ${list(found.realm)},\n`
  + `  heaven: ${list(found.heaven)},\n`
  + `  cut: ${list(found.cut)},\n`
  + `  self: ${list(found.self)},\n`
  + `  meet: ${list(found.meet)},\n`
  + `  emblem: ${list(found.emblem)},\n};`,
);
writeFileSync('src/data/pictures.ts', next);

console.log('\n畫 the paintings\n');
for (const kind of KINDS) {
  const have = found[kind].length;
  const all = KEYS[kind].length;
  console.log(`  ${kind.padEnd(7)} ${String(have).padStart(3)} of ${all}`
    + (have === all ? '  ✓ painted' : `  · ${all - have} still a silhouette`));
}
if (strays.length > 0) {
  console.log(`\n  ${strays.length} file(s) named after nothing in the game, and ignored:`);
  for (const s of strays.slice(0, 8)) console.log(`    ${s}`);
}
const missing = KINDS.flatMap((k) => KEYS[k].filter((x) => !found[k].includes(x)).map((x) => `${k}/${x}`));
if (missing.length > 0 && process.argv.includes('--missing')) {
  console.log('\n  still to paint:');
  for (const m of missing) console.log(`    public/art/${m}.webp`);
}
console.log(missing.length === 0
  ? '\n畫 every creature, every realm and every heaven is painted.\n'
  : `\n  ${missing.length} to go. A missing picture is not a hole: the frame keeps the `
    + 'silhouette until the file lands.\n');
