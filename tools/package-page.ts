/**
 * Prepares the build for publishing as a page.
 *
 * The publisher wraps the file in an HTML skeleton of its own, so only the middle comes
 * out here — title, fonts, stylesheet, the root div and the script. The filenames carry
 * a hash that changes on every build, which is why they are read from dist rather than
 * written by hand.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const assets = readdirSync('dist/assets');
const css = assets.find((f) => f.endsWith('.css'));
const js = assets.find((f) => f.endsWith('.js'));
if (!css || !js) throw new Error('build has no css or js — run `npm run build` first');

const fonts = readFileSync('dist/index.html', 'utf8')
  .split('\n').filter((l) => l.includes('fonts.googleapis') || l.includes('fonts.gstatic'))
  .map((l) => l.trim()).join('\n');

writeFileSync('dist/page.html', `<title>九境 Ninefold</title>
${fonts}
<link rel="stylesheet" href="assets/${css}">
<div id="root"></div>
<script type="module" src="assets/${js}"></script>
`);

console.log(`dist/page.html ready — assets/${css}, assets/${js}`);
console.log(JSON.stringify({ [`assets/${css}`]: `dist/assets/${css}`, [`assets/${js}`]: `dist/assets/${js}` }));
