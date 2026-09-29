/**
 * 別 Pieces for outside the game's own server: the farewell banner for the old Dao of
 * the Endless Sky community, and a portrait poster for Reddit and anywhere a feed shows
 * a picture before a word. Same hand as tools/banners.mjs and tools/promo.mjs (their fonts,
 * the cards' frame, the game's own paintings, cut figures and a real screen).
 *
 *     node tools/social.mjs      → public/discord/social/<name>.webp
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/social';
mkdirSync(OUT, { recursive: true });

const G = '#D4AF56';
const corners = (inset, len) => ['left top', 'right top', 'left bottom', 'right bottom'].map((c) => {
  const [x, y] = c.split(' ');
  return `linear-gradient(${G}cc, ${G}cc) ${x} ${inset}px ${y} ${inset}px / ${len}px 2px no-repeat,
          linear-gradient(${G}cc, ${G}cc) ${x} ${inset}px ${y} ${inset}px / 2px ${len}px no-repeat`;
}).join(',');

const BASE = `* { box-sizing: border-box; } body { margin: 0; background: #0D0B08; color: #EDE3D2; }
  .cn { font-family: 'Noto Serif SC', serif; }
  .frame { position: absolute; inset: 22px; border: 1px solid rgba(212,175,86,.38); pointer-events: none; background: ${corners(9, 34)}; }
  .seal { display: grid; place-items: center; border: 2px solid ${G}; border-radius: 6px;
          background: radial-gradient(circle at 50% 40%, rgba(212,175,86,.16), rgba(212,175,86,.03) 70%);
          box-shadow: inset 0 0 0 6px rgba(13,11,8,.9), inset 0 0 0 7px rgba(212,175,86,.45), 0 0 50px rgba(212,175,86,.14);
          font-family: 'Noto Serif SC', serif; font-weight: 600; color: #E2C26A; text-shadow: 0 0 24px rgba(212,175,86,.35); }`;

/** 別 The farewell to the old server: a cultivator at rest under the heavens, gold on ink. */
function farewell(css) {
  return `<!doctype html><meta charset="utf-8"><style>${css}${BASE}
  .b { width: 1200px; height: 500px; position: relative; overflow: hidden; }
  .bg { position: absolute; inset: -8px; background: url(${data('public/art/heaven/3.webp')}) center 45% / cover; filter: saturate(.85) brightness(.72); }
  .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(13,11,8,.96) 0%, rgba(13,11,8,.86) 40%, rgba(13,11,8,.25) 72%, rgba(13,11,8,.55) 100%),
           linear-gradient(0deg, rgba(13,11,8,.75) 0%, transparent 40%); }
  .fig { position: absolute; right: 80px; bottom: 26px; height: 420px; filter: drop-shadow(0 20px 30px rgba(0,0,0,.6)) drop-shadow(0 0 40px rgba(212,175,86,.15)); }
  .seal { position: absolute; left: 70px; top: 50%; transform: translateY(-50%); width: 150px; height: 150px; font-size: 94px; }
  .text { position: absolute; left: 258px; top: 50%; transform: translateY(-50%); width: 560px; }
  .over { font: 600 16px/1 Cinzel, serif; letter-spacing: .3em; text-transform: uppercase; color: #8FB49B; }
  h1 { margin: 16px 0 12px; font: 700 46px/1.08 Cinzel, serif; color: #F3E8CF; text-shadow: 0 2px 0 rgba(0,0,0,.5), 0 0 30px rgba(212,175,86,.18); }
  .rule { width: 130px; height: 1px; background: linear-gradient(90deg, ${G}, transparent); margin-bottom: 14px; }
  .sub { font: italic 600 27px/1.3 'Cormorant Garamond', serif; color: #CDB67F; }
  .brand { position: absolute; right: 48px; top: 40px; display: flex; align-items: center; gap: 10px; opacity: .92; }
  .brand img.m { width: 40px; } .brand img.n { width: 124px; }
  </style><div class="b"><div class="bg"></div><div class="shade"></div>
    <img class="fig" src="${data('public/art/self/woman-9.webp')}" alt="">
    <div class="frame"></div><div class="seal">別</div>
    <div class="text"><div class="over">Dao of the Endless Sky</div><h1>Farewell,<br>and thank you</h1><div class="rule"></div>
      <div class="sub">Every step you took with us counted. The road goes on in Ninefold.</div></div>
    <div class="brand"><img class="m" src="${data('public/brand/mark.webp')}" alt=""><img class="n" src="${data('public/brand/name.webp')}" alt=""></div>
  </div>`;
}

/** 招 The Reddit poster: portrait, because a phone's feed is where most people will meet it. */
function poster(css) {
  const pts = [['境', 'Nine realms', 'and nine heavens above them'], ['獸', '36 hand-painted beasts', 'a warden at the end of every realm'],
    ['職', 'Fifteen classes', 'you become one by what you wear'], ['榜', 'Fair rankings', 'every climb checked against real time']];
  return `<!doctype html><meta charset="utf-8"><style>${css}${BASE}
  .p { width: 1080px; height: 1350px; position: relative; overflow: hidden; }
  .bg { position: absolute; inset: 0 0 auto 0; height: 900px; background: url(${data('public/art/heaven/9.webp')}) center 40% / cover; filter: saturate(.9) brightness(.8); }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,11,8,.3) 0%, rgba(13,11,8,.08) 22%, rgba(13,11,8,.72) 42%, rgba(13,11,8,.94) 50%, #0D0B08 58%); }
  .dragon { position: absolute; left: -30px; top: 20px; width: 700px;
           -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent 92%); mask-image: linear-gradient(180deg, #000 62%, transparent 92%); filter: drop-shadow(0 30px 40px rgba(0,0,0,.6)) drop-shadow(0 0 60px rgba(212,175,86,.18)); }
  .phone { position: absolute; right: 64px; top: 120px; width: 290px; border-radius: 36px; border: 9px solid #2A2621; overflow: hidden;
           box-shadow: 0 0 0 1px rgba(212,175,86,.45), 0 30px 60px rgba(0,0,0,.65); transform: rotate(4deg); }
  .phone img { display: block; width: 100%; }
  .head { position: absolute; left: 80px; right: 80px; top: 640px; }
  .mark { display: flex; align-items: center; gap: 18px; }
  .mark img { width: 74px; }
  .mark .name { font: 700 72px/1 Cinzel, serif; letter-spacing: .08em; color: #F3E8CF; text-shadow: 0 0 40px rgba(212,175,86,.25); }
  .tag { margin: 12px 0 0; font: italic 600 36px/1.2 'Cormorant Garamond', serif; color: #CDB67F; }
  .hook { margin: 26px 0 0; padding: 18px 22px; border-left: 3px solid ${G}; background: rgba(212,175,86,.07);
          font: 600 29px/1.3 'Cormorant Garamond', serif; color: #F3E8CF; }
  .pts { position: absolute; left: 80px; right: 80px; top: 1010px; display: grid; grid-template-columns: 1fr 1fr; gap: 22px 36px; }
  .pt { display: flex; gap: 16px; align-items: center; }
  .pt .seal { width: 64px; height: 64px; font-size: 36px; flex: none; box-shadow: inset 0 0 0 4px rgba(13,11,8,.9), inset 0 0 0 5px rgba(212,175,86,.45); }
  .pt b { display: block; font: 700 23px/1.15 Cinzel, serif; color: #F3E8CF; }
  .pt span { font: italic 600 21px/1.2 'Cormorant Garamond', serif; color: #A99F8C; }
  .cta { position: absolute; left: 80px; right: 80px; bottom: 58px; display: flex; justify-content: space-between; align-items: center;
         padding: 18px 26px; border: 2px solid ${G}; box-shadow: inset 0 0 0 5px #0D0B08, inset 0 0 0 6px rgba(212,175,86,.45); }
  .cta b { font: 700 26px/1 Cinzel, serif; letter-spacing: .14em; color: #F3E8CF; }
  .cta span { font: 600 17px/1 Cinzel, serif; letter-spacing: .22em; color: #8FB49B; }
  </style><div class="p"><div class="bg"></div><div class="shade"></div>
    <img class="dragon" src="${data('public/art/cut/dragon.webp')}" alt="">
    <div class="phone"><img src="${data('public/discord/cultivate.webp')}" alt=""></div>
    <div class="frame"></div>
    <div class="head">
      <div class="mark"><img src="${data('public/brand/mark.webp')}" alt=""><div class="name">NINEFOLD</div></div>
      <p class="tag">An idle cultivation game, painted in ink.</p>
      <p class="hook">Close it for a week and you come back further along. Nothing is ever taken away for being away, and losing a fight costs nothing.</p>
    </div>
    <div class="pts">${pts.map(([h, t, s]) => `<div class="pt"><div class="seal">${h}</div><div><b>${t}</b><span>${s}</span></div></div>`).join('')}</div>
    <div class="cta"><b>CLOSED TEST · OPEN NOW</b><span>FREE · BROWSER · ANDROID</span></div>
  </div>`;
}

const css = fonts('別境獸職榜');
const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage();
for (const [name, html, w, h] of [['farewell', farewell(css), 1200, 500], ['poster', poster(css), 1080, 1350]]) {
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(200);
  const spill = await tab.evaluate(([W, H]) => [...document.querySelectorAll('.text, .head, .pts, .cta, .hook')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.right > W - 20 || r.bottom > H - 20; }).length, [w, h]);
  if (spill) throw new Error(`${name}: ${spill} blocks run past the frame`);
  const png = await tab.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  await sharp(png).webp({ quality: 88 }).toFile(`${OUT}/${name}.webp`);
  await sharp(png).png().toFile(`${OUT}/${name}.png`);
  console.log(`  ${name}`);
}
await browser.close();
console.log(`別 farewell and poster in ${OUT}.`);
