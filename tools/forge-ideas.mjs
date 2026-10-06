/**
 * 業 The three ideas for the workshop, side by side, for the testers to weigh before anything
 * past the walls is built (Bruno, 2026-10-06: the walls, the seal with its Breakthrough Pill,
 * and the Hundredfold sets, asked on the Discord with pictures). Every picture is a real
 * screen: the walls from the branch, the seal and the set sheet from the prototype, the
 * crucible from the interactive mockup. The first is built; the other two say "proposal".
 *
 *     SRC=<folder with the eight screenshots> node tools/forge-ideas.mjs
 *       → public/discord/promo/forge-ideas.webp and forge-mockup.webp
 *
 * The screenshots come from tools/shot-walls.mjs (walls-card, walls-elite), the prototype's
 * own shot script (seal-card, seal-recipe, set-sheet) and the forge mockup (set-out,
 * set-crucible, set-strip).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SRC = process.env.SRC ?? 'tmp-ideas';
const OUT = 'public/discord/promo';
mkdirSync(OUT, { recursive: true });
const img = (name) => data(`${SRC}/${name}.png`);

const COLS = [
  { seal: '壁', n: 1, name: 'Walls at the gate', tag: 'Built · in this update', built: true,
    top: 'walls-card', bottom: 'walls-elite',
    note: 'From the third realm the warden comes out far above its realm and loosens 30% a day. Waiting always gets you through. The last beast of each realm is an elite: far stronger, triple material.' },
  { seal: '封', n: 2, name: 'The seal and the pill', tag: 'Proposal',
    top: 'seal-card', bottom: 'seal-recipe',
    note: 'Realms 5 to 8: the gate stays sealed for 1 to 2 days, whatever your power. Wait it out, or carry a 破境 Breakthrough Pill from the workshop and go now.' },
  { seal: '百', n: 3, name: 'Hundredfold sets', tag: 'Proposal',
    top: 'set-out', bottom: 'set-crucible',
    note: 'Nine six-piece sets, one per realm, made only at the forge. You choose every line by what goes into the crucible, and each finished set leaves a bonus for good. Hard on purpose.' },
];

const css = fonts('業壁封百煉破境');
const html = `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1600px; height: 1040px; background: #15120e; color: #efe6d2; font-family: 'Cormorant Garamond', serif; padding: 36px 44px; }
  h1 { font: 700 42px Cinzel, serif; color: #D4AF56; letter-spacing: .04em; }
  h1 em { font: 600 42px 'Noto Serif SC', serif; font-style: normal; margin-right: 14px; }
  .sub { font: italic 600 24px 'Cormorant Garamond', serif; color: #c9b993; margin: 4px 0 22px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .col { display: grid; grid-template-rows: auto 430px 290px auto; gap: 10px; }
  .head { display: flex; align-items: center; gap: 12px; }
  .head .s { width: 48px; height: 48px; border: 2px solid #b8483a; border-radius: 6px; color: #e07a6a; display: grid; place-items: center;
             font: 600 30px 'Noto Serif SC', serif; flex: none; }
  .head b { font: 700 23px Cinzel, serif; color: #efe6d2; display: block; }
  .head i { font: italic 700 18px 'Cormorant Garamond', serif; color: #D4AF56; }
  .head i.built { color: #7fb495; }
  .cell { border: 1px solid #3a352b; border-radius: 12px; background: #1d1a15; overflow: hidden; display: grid; place-items: center; }
  .cell img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
  .note { font: 600 19px/1.32 'Cormorant Garamond', serif; color: #d8ccb0; }
</style>
<h1><em>業</em>Three ideas for the workshop</h1>
<p class="sub">Walls that ask something of you, and crafts that get you over them. One is built; two wait for your opinion.</p>
<div class="grid">${COLS.map((c) => `
  <div class="col">
    <div class="head"><span class="s">${c.seal}</span><span><b>${c.n} · ${c.name}</b><i class="${c.built ? 'built' : ''}">${c.tag}</i></span></div>
    <div class="cell"><img src="${img(c.top)}"></div>
    <div class="cell"><img src="${img(c.bottom)}"></div>
    <p class="note">${c.note}</p>
  </div>`).join('')}
</div>`;

const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ viewport: { width: 1600, height: 1040 } });
await tab.setContent(html);
await tab.evaluate(() => document.fonts.ready);
await tab.waitForTimeout(300);
await sharp(await tab.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 1040 } })).webp({ quality: 88 }).toFile(`${OUT}/forge-ideas.webp`);

// 百 The forge itself, for the discussion post: the set strip, what comes out, the crucible.
const two = `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1600px; background: #15120e; color: #efe6d2; padding: 34px 44px; font-family: 'Cormorant Garamond', serif; }
  h1 { font: 700 38px Cinzel, serif; color: #D4AF56; } h1 em { font: 600 38px 'Noto Serif SC', serif; font-style: normal; margin-right: 12px; }
  .sub { font: italic 600 22px 'Cormorant Garamond', serif; color: #c9b993; margin: 4px 0 20px; }
  .row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 18px; align-items: start; }
  .cell { border: 1px solid #3a352b; border-radius: 12px; background: #1d1a15; overflow: hidden; }
  .cell img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
</style>
<h1><em>百煉</em>A Hundredfold set, forged line by line</h1>
<p class="sub">A mockup of the proposal, drawn with the game's own art and numbers (the sixth realm, Fallen Star metal).</p>
<div class="row">
  <div class="cell"><img src="${img('set-strip')}"></div>
  <div class="cell"><img src="${img('set-crucible')}"></div>
  <div class="cell"><img src="${img('set-out')}"></div>
  <div class="cell"><img src="${img('set-sheet')}"></div>
</div>`;
await tab.setViewportSize({ width: 1600, height: 900 });
await tab.setContent(two);
await tab.evaluate(() => document.fonts.ready);
await tab.waitForTimeout(300);
const tall = await tab.evaluate(() => Math.ceil(document.body.scrollHeight));
await tab.setViewportSize({ width: 1600, height: tall });
await sharp(await tab.screenshot({ clip: { x: 0, y: 0, width: 1600, height: tall } })).webp({ quality: 88 }).toFile(`${OUT}/forge-mockup.webp`);
await browser.close();
console.log(`業 ${OUT}/forge-ideas.webp, ${OUT}/forge-mockup.webp`);
