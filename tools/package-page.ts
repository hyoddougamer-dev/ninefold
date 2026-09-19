/**
 * Prepares a build for publishing as a page.
 *
 * The publisher wraps the file in an HTML skeleton of its own, so only the middle comes
 * out here — title, fonts, stylesheet, the root div and the script.
 *
 * The asset names carry a hash that changes on every build, and since the arena lab was
 * added there is more than one bundle in `dist/assets`. So the refs are read out of the
 * entry's own built HTML rather than guessed by scanning the directory: the wrong pair
 * would publish a page that silently loads the other app.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ENTRIES = {
  game: { html: 'dist/index.html', out: 'dist/page.html', title: '九境 Ninefold' },
  lab: { html: 'dist/arena-lab.html', out: 'dist/lab.html', title: '戰 Arena — banco de ensaios' },
} as const;

const which = (process.argv[2] ?? 'game') as keyof typeof ENTRIES;
const entry = ENTRIES[which];
if (!entry) throw new Error(`unknown entry "${which}" — one of ${Object.keys(ENTRIES).join(', ')}`);

const built = readFileSync(entry.html, 'utf8');

const css = built.match(/href="[^"]*?(assets\/[^"]+\.css)"/)?.[1];
const js = built.match(/src="[^"]*?(assets\/[^"]+\.js)"/)?.[1];
if (!css || !js) throw new Error(`${entry.html} has no css or js — run \`npm run build\` first`);

const fonts = built.split('\n')
  .filter((l) => l.includes('fonts.googleapis') || l.includes('fonts.gstatic'))
  .map((l) => l.trim()).join('\n');

writeFileSync(entry.out, `<title>${entry.title}</title>
${fonts}
<link rel="stylesheet" href="${css}">
<div id="root"></div>
<script type="module" src="${js}"></script>
`);

/**
 * Every built asset goes up, not just the entry's two.
 *
 * With a second entry rollup splits the shared code into its own chunk, which the entry
 * script imports by a relative path the HTML never mentions. Publishing only what the
 * HTML names ships a page whose first import 404s.
 */
const files = Object.fromEntries(
  readdirSync('dist/assets').map((f) => [`assets/${f}`, `dist/assets/${f}`]),
);

console.log(`${entry.out} ready — ${css}, ${js} (+${Object.keys(files).length - 2} shared)`);
console.log(JSON.stringify(files));
