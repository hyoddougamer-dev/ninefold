/**
 * 畫 The same two subjects in six looks the game could wear, for the testers to choose
 * between (Bruno, 2026-10-05: the art is AI-made because commissioned art is out of
 * reach for now, and the players should say whether the look matters and what they
 * would rather have). Everything here is drawn from what the game already holds: the
 * paintings, the game-icons.net silhouettes on the gear tiles, the Chinese characters,
 * and Lucide's open icons for comparison. No style is shown better than it would be.
 *
 *     node tools/artstyles.mjs            → public/discord/promo/art-styles.webp
 *
 * Needs lucide-static somewhere node can find it (LUCIDE=<its icons folder>).
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/promo';
const LUCIDE = process.env.LUCIDE ?? 'node_modules/lucide-static/icons';
mkdirSync(OUT, { recursive: true });

const icons = JSON.parse(execFileSync('npx', ['tsx', '-e', `
  import { ICONS } from './src/art/icons.generated.ts';
  console.log(JSON.stringify({ fox: ICONS['fox-head'], tower: ICONS['pagoda'] }));`], { encoding: 'utf8' }));
const lucide = (name) => readFileSync(`${LUCIDE}/${name}.svg`, 'utf8')
  .replace(/width="24"/, 'width="150"').replace(/height="24"/, 'height="150"').replace(/stroke-width="2"/, 'stroke-width="1.5"');

/** 點 Pixel art made honestly small: the painting at 36 and 56 pixels, sixteen colours, blown up square. */
async function pixel(file, w, h, crop) {
  const small = await sharp(file).extract(crop).resize(w, h, { kernel: 'nearest' })
    .png({ palette: true, colors: 16, dither: 0 }).toBuffer();
  const big = await sharp(small).resize(w * 6, h * 6, { kernel: 'nearest' }).webp({ lossless: true }).toBuffer();
  return `data:image/webp;base64,${big.toString('base64')}`;
}
const foxMeta = await sharp('public/art/beast/fox.webp').metadata();
const realmMeta = await sharp('public/art/realm/5.webp').metadata();
const side = Math.min(foxMeta.width, foxMeta.height);
const foxCrop = { left: Math.round((foxMeta.width - side) / 2), top: Math.round((foxMeta.height - side) / 2), width: side, height: side };
const rside = Math.min(realmMeta.width, realmMeta.height);
const realmCrop = { left: Math.round((realmMeta.width - rside) / 2), top: 0, width: rside, height: rside };
const pixFox = await pixel('public/art/beast/fox.webp', 36, 36, foxCrop);
const pixTower = await pixel('public/art/realm/5.webp', 40, 40, realmCrop);

const ink = (body) => `<svg viewBox="0 0 512 512" width="170" height="170">
  <defs><filter id="brush" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7"/>
    <feDisplacementMap in="SourceGraphic" scale="14"/>
  </filter></defs>
  <g filter="url(#brush)" fill="#1b1712">${body}</g></svg>`;
const solid = (body) => `<svg viewBox="0 0 512 512" width="150" height="150" fill="#D4AF56">${body}</svg>`;

const COLS = [
  { key: 'A', name: 'Painted', who: 'today, made with AI', note: 'Rich and moody. Made with AI, which some of you may not like.',
    fox: `<img src="${data('public/art/beast/fox.webp')}" class="paint">`,
    tower: `<img src="${data('public/art/realm/5.webp')}" class="paint">` },
  { key: 'B', name: 'Line icons', who: 'Lucide, free', note: 'Clean and free, but made for apps: no fox or pagoda, so a cat and a castle.',
    fox: `<div class="lucide">${lucide('cat')}</div>`, tower: `<div class="lucide">${lucide('castle')}</div>` },
  { key: 'C', name: 'Game icons', who: 'game-icons.net, free', note: 'Already on our gear tiles. Free and credited, and seen in many games.',
    fox: solid(icons.fox), tower: solid(icons.tower) },
  { key: 'D', name: 'Ink brush', who: 'drawn in code', note: 'Our own, from the same shapes, in ink on paper. Simpler than a painting.',
    fox: `<div class="paper">${ink(icons.fox)}<i>狐</i></div>`, tower: `<div class="paper">${ink(icons.tower)}<i>塔</i></div>` },
  { key: 'E', name: 'Pixel art', who: 'shown from our paintings', note: 'Cheap to keep consistent. Real pixel art would be drawn by hand.',
    fox: `<img src="${pixFox}" class="pix">`, tower: `<img src="${pixTower}" class="pix">` },
  { key: 'F', name: 'Characters only', who: 'calligraphy in a seal', note: 'Elegant and honest, but harder to read if you do not know them.',
    fox: `<div class="seal"><b>狐</b><span>Spirit Fox</span></div>`, tower: `<div class="seal"><b>塔</b><span>The Tower</span></div>` },
];

const css = fonts('狐塔畫');
const html = `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1600px; height: 980px; background: #15120e; color: #efe6d2; font-family: 'Cormorant Garamond', serif; padding: 40px 44px; }
  h1 { font: 700 44px Cinzel, serif; color: #D4AF56; letter-spacing: .04em; }
  h1 em { font: 600 44px 'Noto Serif SC', serif; font-style: normal; margin-right: 14px; }
  .sub { font: italic 600 25px 'Cormorant Garamond', serif; color: #c9b993; margin: 6px 0 26px; }
  .grid { display: grid; grid-template-columns: 110px repeat(6, 1fr); gap: 12px; }
  .row { display: contents; }
  .lab { font: 700 18px Cinzel, serif; color: #a89b80; align-self: center; letter-spacing: .08em; }
  .head { text-align: center; }
  .head b { display: block; font: 700 21px Cinzel, serif; color: #efe6d2; }
  .head b span { color: #D4AF56; margin-right: 8px; }
  .head i { font: italic 600 18px 'Cormorant Garamond', serif; color: #a89b80; }
  .cell { height: 210px; border: 1px solid #3a352b; border-radius: 10px; background: #1d1a15; display: grid; place-items: center; overflow: hidden; }
  .paint { width: 100%; height: 100%; object-fit: cover; }
  .pix { width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
  .lucide { color: #D4AF56; display: grid; place-items: center; }
  .paper { position: relative; width: 100%; height: 100%; background: #e9dfc8; display: grid; place-items: center; }
  .paper i { position: absolute; right: 10px; bottom: 8px; width: 34px; height: 34px; background: #b8483a; color: #f4e9d4;
             font: 600 22px 'Noto Serif SC', serif; font-style: normal; display: grid; place-items: center; border-radius: 3px; }
  .seal { display: grid; place-items: center; gap: 6px; }
  .seal b { width: 120px; height: 120px; border: 3px solid #b8483a; border-radius: 6px; color: #e07a6a; display: grid; place-items: center;
            font: 600 76px 'Noto Serif SC', serif; }
  .seal span { font: italic 600 18px 'Cormorant Garamond', serif; color: #a89b80; }
  .note { font: 600 17.5px/1.3 'Cormorant Garamond', serif; color: #cfc3a6; text-align: center; padding: 0 6px; }
</style>
<h1><em>畫</em>Which look should Ninefold wear?</h1>
<p class="sub">The same Spirit Fox and the same Tower, six ways. Tell us which you would play, and why.</p>
<div class="grid">
  <div></div>${COLS.map((c) => `<div class="head"><b><span>${c.key}</span>${c.name}</b><i>${c.who}</i></div>`).join('')}
  <div class="lab">BEAST</div>${COLS.map((c) => `<div class="cell">${c.fox}</div>`).join('')}
  <div class="lab">TOWER</div>${COLS.map((c) => `<div class="cell">${c.tower}</div>`).join('')}
  <div></div>${COLS.map((c) => `<p class="note">${c.note}</p>`).join('')}
</div>`;

const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ viewport: { width: 1600, height: 980 } });
await tab.setContent(html);
await tab.evaluate(() => document.fonts.ready);
await tab.waitForTimeout(300);
const png = await tab.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 980 } });
await sharp(png).webp({ quality: 88 }).toFile(`${OUT}/art-styles.webp`);
await browser.close();
console.log(`畫 ${OUT}/art-styles.webp`);
