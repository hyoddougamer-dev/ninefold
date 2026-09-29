/**
 * 市 Everything an itch.io page needs, in one folder: the game as the HTML5 zip itch plays
 * in the browser, the cover (630 by 500, itch's own size), a banner for the page, the
 * screenshots as PNG (itch does not take WebP), and the page's text.
 *
 *     npm run build && node tools/itch.mjs      → itch-kit/
 *
 * The zip is the built game without what only the main site needs: the Discord pictures,
 * the panel, the testers' page and the APK. The service worker stays: without it the game
 * asks for it and logs a 404 in every player's console. The game plays the same, and the
 * rankings still reach the same server.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'itch-kit';
if (!existsSync('dist/index.html')) throw new Error('Build first: npm run build');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/screenshots`, { recursive: true });

// 包 The game. -X keeps the zip the same from run to run.
execFileSync('zip', ['-q', '-r', '-X', `../${OUT}/ninefold-web.zip`, '.',
  '-x', 'discord/*', 'painel/*', 'testar/*', 'arena-lab.html', 'ninefold.apk', 'ninefold-android.zip'], { cwd: 'dist' });
execFileSync('unzip', ['-tq', `${OUT}/ninefold-web.zip`]);

// 圖 The screens, as PNG, in the order a stranger should meet them.
const SHOTS = ['cultivate', 'hunt', 'gear', 'path', 'tower', 'beasts', 'pc'];
for (const [i, s] of SHOTS.entries()) {
  if (existsSync(`public/discord/${s}.webp`)) await sharp(`public/discord/${s}.webp`).png().toFile(`${OUT}/screenshots/${i + 1}-${s}.png`);
}
await sharp('public/discord/promo/keyart.webp').png().toFile(`${OUT}/screenshots/0-keyart.png`);

const G = '#D4AF56';
const css = fonts('九境');
const cover = `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; } body { margin: 0; }
  .c { width: 630px; height: 500px; position: relative; overflow: hidden; background: #0D0B08; }
  .bg { position: absolute; inset: 0; background: url(${data('public/art/heaven/9.webp')}) center 35% / cover; filter: saturate(.9) brightness(.75); }
  .dragon { position: absolute; left: 50%; top: -10px; width: 470px; transform: translateX(-50%);
            -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 88%); mask-image: linear-gradient(180deg, #000 55%, transparent 88%);
            filter: drop-shadow(0 20px 30px rgba(0,0,0,.6)); }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,11,8,.1) 30%, rgba(13,11,8,.85) 64%, #0D0B08 80%); }
  .frame { position: absolute; inset: 14px; border: 1px solid rgba(212,175,86,.4); }
  .t { position: absolute; left: 0; right: 0; bottom: 42px; text-align: center; }
  .t .row { display: inline-flex; align-items: center; gap: 12px; }
  .t img { width: 50px; }
  .t b { font: 700 56px/1 Cinzel, serif; letter-spacing: .08em; color: #F3E8CF; text-shadow: 0 0 30px rgba(212,175,86,.3); }
  .t p { margin: 10px 0 0; font: italic 600 23px/1.2 'Cormorant Garamond', serif; color: #CDB67F; }
  </style><div class="c"><div class="bg"></div><img class="dragon" src="${data('public/art/cut/dragon.webp')}" alt="">
  <div class="shade"></div><div class="frame"></div>
  <div class="t"><div class="row"><img src="${data('public/brand/mark.webp')}" alt=""><b>NINEFOLD</b></div><p>An idle cultivation game, painted in ink</p></div></div>`;
const banner = `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; } body { margin: 0; }
  .b { width: 960px; height: 280px; position: relative; overflow: hidden; background: #0D0B08; }
  .bg { position: absolute; inset: -6px; background: url(${data('public/art/realm/5.webp')}) center 55% / cover; filter: saturate(.85) brightness(.7); }
  .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(13,11,8,.2), rgba(13,11,8,.75) 35%, rgba(13,11,8,.75) 65%, rgba(13,11,8,.2)); }
  .frame { position: absolute; inset: 12px; border: 1px solid rgba(212,175,86,.4); }
  .t { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .t .row { display: flex; align-items: center; gap: 14px; }
  .t img { width: 60px; }
  .t b { font: 700 64px/1 Cinzel, serif; letter-spacing: .1em; color: #F3E8CF; text-shadow: 0 0 30px rgba(212,175,86,.3); }
  .t span { margin-top: 12px; font: 600 14px/1 Cinzel, serif; letter-spacing: .32em; color: #8FB49B; }
  .t .h { color: ${G}; font-family: 'Noto Serif SC', serif; letter-spacing: .1em; }
  </style><div class="b"><div class="bg"></div><div class="shade"></div><div class="frame"></div>
  <div class="t"><div class="row"><img src="${data('public/brand/mark.webp')}" alt=""><b>NINEFOLD</b></div>
  <span><span class="h">九境</span> · AN IDLE CULTIVATION GAME · CLOSED TEST</span></div></div>`;

const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ deviceScaleFactor: 2 });
for (const [name, html, w, h] of [['cover', cover, 630, 500], ['banner', banner, 960, 280]]) {
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(200);
  const png = await tab.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  // The cover at itch's exact size; the banner at twice its size, for sharp screens.
  await (name === 'cover' ? sharp(png).resize(630, 500) : sharp(png)).png().toFile(`${OUT}/${name}.png`);
}
await browser.close();

writeFileSync(`${OUT}/page.txt`, `TITLE
Ninefold

SHORT DESCRIPTION (tagline)
An idle cultivation game, painted in ink. Nothing is ever taken away for being away.

DESCRIPTION
Nine realms stand between a mortal and the sky. You sit at the foot of the first.

Ninefold is an idle cultivation (xianxia) game. Qi gathers on its own, even with the game closed, and every choice is the same good problem: grow stronger now, or climb.

WHAT WAITS FOR YOU
- Nine realms and nine heavens, each with its own painted landscape
- 36 hand-painted beasts, a warden at the end of every realm, and Dragons above the summit
- Gear in five ranks and six schools: wear three pieces of two schools and you become one of fifteen classes
- A cave that grows while you sleep, a vault that opens every few hours, a tower with no top
- Its own music, a road full of strangers, and a new quarry every week
- Rankings where every climb is checked against real time on the server, so nobody edits their way up

ONE PROMISE ABOVE THE REST
Nothing is ever taken away for being away. Close it for a week and your cultivator is further along, never behind. And losing a fight costs nothing, ever.

CLOSED TEST
This is a closed test and it is free. Tell us what confused you, what annoyed you and what made you come back:
Discord: https://discord.gg/JFD9cTGscN
Play on the main site (keeps your save across devices with an email): https://hyoddougamer-dev.github.io/ninefold/

Made by one developer, 師 Shibaki.

GENRE
Simulation

TAGS (itch allows 10)
idle, incremental, xianxia, cultivation, fantasy, hand-drawn, singleplayer, mobile, relaxing, chinese

SETTINGS
Kind of project: HTML
Classification: Games
Release status: In development
Pricing: No payments
Upload: ninefold-web.zip, tick "This file will be played in the browser"
Embed options: Viewport 1024 x 768, tick "Mobile friendly" (orientation: portrait), tick "Fullscreen button"
Frame options: tick "Automatically start on page load" OFF (Click to launch is better for audio)
Cover image: cover.png (630 x 500)
Screenshots: the screenshots folder, keyart first
Theme: banner.png as the banner, background #0D0B08, text #EDE3D2, links #D4AF56
`);
console.log(`市 itch kit in ${OUT}/`);
