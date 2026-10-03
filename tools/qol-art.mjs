/**
 * 便 The picture under the call for quality-of-life ideas: what the testers already asked
 * for and already have, so the ask reads as "this works" rather than "please write to us".
 * Same hand as tools/banners.mjs (its fonts, its frame, its seal), one canvas.
 *
 *     node tools/qol-art.mjs   → public/discord/promo/qol-asked.webp
 *
 * Every tile is a thing in the game today, named the way the game names it.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/promo/qol-asked.webp';

const DONE = [
  ['買', 'Max', 'Buy every level you can afford in one tap.'],
  ['再', 'Again', 'Fight the same beast again straight from the verdict.'],
  ['自', 'Auto', 'The hunt keeps going while the game is open.'],
  ['套', 'Loadouts', 'Save what you wear and put it all back on in one tap.'],
  ['鎖', 'Lock', 'A locked piece is never melted and never fused.'],
  ['序', 'Sort the hunt', 'Next mark, strongest, or most material first.'],
  ['篩', 'School filter', 'See only the gear of the school you build.'],
  ['鍵', 'Keys on PC', 'Enter collects, Esc closes, A starts Auto.'],
  ['源', 'Where it comes from', 'Tap any material to go to its source.'],
];

const G = 'rgba(212, 175, 86, .8)';
const bracket = (x, y) => `linear-gradient(${G}, ${G}) ${x} ${y} / 30px 2px no-repeat, linear-gradient(${G}, ${G}) ${x} ${y} / 2px 30px no-repeat`;

const html = (css) => `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; } body { margin: 0; background: #0D0B08; }
  .c { width: 1200px; height: 700px; position: relative; overflow: hidden; background: #0D0B08; }
  .bg { position: absolute; inset: -8px; background: url(${data('public/art/realm/4.webp')}) center 40% / cover; filter: saturate(.8) brightness(.32); }
  .frame { position: absolute; inset: 20px; border: 1px solid rgba(212,175,86,.38);
    background: ${bracket('left 8px', 'top 8px')}, ${bracket('right 8px', 'top 8px')}, ${bracket('left 8px', 'bottom 8px')}, ${bracket('right 8px', 'bottom 8px')}; }
  .in { position: absolute; inset: 62px 64px; }
  .over { font: 600 15px/1 Cinzel, serif; letter-spacing: .32em; text-transform: uppercase; color: #8FB49B; }
  .over b { font-family: 'Noto Serif SC', serif; color: #D4AF56; font-weight: 600; letter-spacing: .1em; }
  h1 { margin: 14px 0 8px; font: 700 46px/1.06 Cinzel, serif; color: #F3E8CF; text-shadow: 0 0 30px rgba(212,175,86,.18); }
  .sub { font: italic 600 25px/1.25 'Cormorant Garamond', serif; color: #CDB67F; margin-bottom: 30px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .t { display: flex; gap: 16px; align-items: center; padding: 16px; border: 1px solid rgba(212,175,86,.32); border-radius: 10px;
       background: linear-gradient(180deg, rgba(23,19,14,.92), rgba(16,13,10,.92)); }
  .s { flex: none; width: 62px; height: 62px; display: grid; place-items: center; border: 2px solid #D4AF56; border-radius: 5px;
       box-shadow: inset 0 0 0 4px rgba(13,11,8,.9), inset 0 0 0 5px rgba(212,175,86,.45);
       font: 600 34px/1 'Noto Serif SC', serif; color: #E2C26A; background: rgba(212,175,86,.08); }
  .n { font: 700 19px/1.15 Cinzel, serif; color: #F3E8CF; }
  .l { font: 15px/1.35 system-ui, sans-serif; color: #B9AA8C; margin-top: 5px; }
  .ask { margin-top: 30px; padding: 20px 24px; border: 1px solid rgba(143,180,155,.45); border-radius: 10px; background: rgba(143,180,155,.08);
         font: 600 22px/1.35 'Cormorant Garamond', serif; font-style: italic; color: #DCE8DF; text-align: center; }
  .ask b { font-style: normal; font-family: Cinzel, serif; color: #E2C26A; font-size: 20px; letter-spacing: .04em; }
  </style>
  <div class="c"><div class="bg"></div><div class="frame"></div><div class="in">
    <div class="over"><b>便</b> Quality of life · from your posts</div>
    <h1>You Asked. It Is In.</h1>
    <div class="sub">Most of these began as a message from one of you.</div>
    <div class="grid">${DONE.map(([s, n, l]) => `<div class="t"><div class="s">${s}</div><div><div class="n">${n}</div><div class="l">${l}</div></div></div>`).join('')}</div>
    <div class="ask"><b>What is next?</b> Every tap, scroll and wait you would cut. Tell us in 議-ideas.</div>
  </div></div>`;

const css = fonts(DONE.map((d) => d[0]).join('') + '便議');
const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ viewport: { width: 1200, height: 700 } });
await tab.setContent(html(css));
await tab.evaluate(() => document.fonts.ready);
await tab.waitForTimeout(200);
const png = await tab.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 700 } });
await sharp(png).webp({ quality: 88 }).toFile(OUT);
await browser.close();
console.log(`便 ${OUT}`);
