/**
 * 深 The pictures under the question about deeper hunts: how a depth works, and the three
 * traits with what answers each. Drawn for players who have never read the design, so
 * every picture says one thing in large type, with the game's own figures.
 * Same hand as tools/banners.mjs (its fonts, its frame, its seal).
 *
 *     node tools/deep-art.mjs   → public/discord/promo/deep-ladder.webp, deep-traits.webp
 *
 * A proposal, not the game yet: both pictures say so.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';

const G = 'rgba(212, 175, 86, .8)';
const bracket = (x, y) => `linear-gradient(${G}, ${G}) ${x} ${y} / 30px 2px no-repeat, linear-gradient(${G}, ${G}) ${x} ${y} / 2px 30px no-repeat`;
const BASE = `
  * { box-sizing: border-box; } body { margin: 0; background: #0D0B08; }
  .c { position: relative; overflow: hidden; background: #0D0B08; }
  .bg { position: absolute; inset: -8px; background: url(${data('public/art/realm/7.webp')}) center 40% / cover; filter: saturate(.8) brightness(.28); }
  .frame { position: absolute; inset: 20px; border: 1px solid rgba(212,175,86,.38);
    background: ${bracket('left 8px', 'top 8px')}, ${bracket('right 8px', 'top 8px')}, ${bracket('left 8px', 'bottom 8px')}, ${bracket('right 8px', 'bottom 8px')}; }
  .in { position: absolute; inset: 56px 64px; }
  .over { font: 600 15px/1 Cinzel, serif; letter-spacing: .3em; text-transform: uppercase; color: #8FB49B; }
  .over b { font-family: 'Noto Serif SC', serif; color: #D4AF56; font-weight: 600; letter-spacing: .1em; }
  h1 { margin: 12px 0 6px; font: 700 44px/1.06 Cinzel, serif; color: #F3E8CF; }
  .sub { font: italic 600 24px/1.25 'Cormorant Garamond', serif; color: #CDB67F; }
  .tag { position: absolute; right: 64px; top: 58px; font: 600 13px Cinzel, serif; letter-spacing: .18em; color: #E2C26A;
         border: 1px solid rgba(212,175,86,.55); border-radius: 99px; padding: 7px 14px; text-transform: uppercase; }
  .cn { font-family: 'Noto Serif SC', serif; }
  .t { font: 16px/1.4 system-ui, sans-serif; color: #D8CCB2; }
`;

// 梯 One beast, four depths: the figure grows, the pay grows, and from the third it shows what it is.
const ladder = () => {
  const rungs = [
    ['0', 'the beast you know', '×1', '材 ×1.0', ''],
    ['1', 'twice its power', '×2', '材 ×1.2', ''],
    ['2', 'twice again', '×4', '材 ×1.4', ''],
    ['3', 'and now it shows what it is', '×8', '材 ×1.6', '堅 Armoured'],
  ];
  const fig = data('public/art/cut/gargoyle.webp');
  return `<div class="c" style="width:1200px;height:820px"><div class="bg"></div><div class="frame"></div>
  <div class="tag">A proposal · not in the game yet</div>
  <div class="in">
    <div class="over"><b>深</b> Deeper hunts · how it works</div>
    <h1>Win, and it goes deeper</h1>
    <div class="sub">The same beast, a step further down, for better gear and more material.</div>
    <div style="display:flex;gap:16px;align-items:flex-end;margin-top:34px">
      ${rungs.map(([d, say, pow, mat, trait], i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:10px">
          <img src="${fig}" style="height:${120 + i * 46}px;width:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6)) ${i === 3 ? 'drop-shadow(0 0 18px rgba(212,96,78,.55))' : ''}">
          <div style="width:100%;text-align:center;padding:14px 10px;border:1px solid rgba(212,175,86,${0.3 + i * 0.15});border-radius:10px;background:rgba(23,19,14,.92)">
            <div style="font:700 22px Cinzel,serif;color:#F3E8CF"><span class="cn" style="color:#7FA8D9">深</span> Depth ${d}</div>
            <div class="t" style="margin-top:4px;color:#B9AA8C">${say}</div>
            <div style="display:flex;justify-content:center;gap:12px;margin-top:8px;font:600 17px system-ui;color:#E2C26A">
              <span>力 ${pow}</span><span>${mat}</span></div>
            ${trait ? `<div style="margin-top:8px;font:600 15px system-ui;color:#E07A63"><span class="cn">堅</span> ${trait.split(' ')[1]}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px">
      ${[['Better drops', 'Gear falls a little more often and ranks a little higher at every depth.'],
         ['Never qi', 'Depth pays 材 material and gear only, so the climb through the realms keeps its pace.'],
         ['Losing costs nothing', 'A lost fight keeps every depth you have won. Try again when you are stronger.']]
        .map(([h, t]) => `<div style="padding:12px 14px;border:1px solid rgba(143,180,155,.4);border-radius:10px;background:rgba(143,180,155,.07)">
          <div style="font:700 17px Cinzel,serif;color:#DCE8DF">${h}</div><div class="t" style="margin-top:4px;font-size:15px">${t}</div></div>`).join('')}
    </div>
  </div></div>`;
};

// 性 Three traits, three answers, each with the figure that carries it.
const traits = () => {
  const T = [
    ['堅', 'Armoured', 'gargoyle', 'Gargoyle', '體', 'Body pieces', 'Wear 3 Body pieces to halve it, 5 to clear it.'],
    ['幽', 'Spectral', 'skeleton', 'Bone General', '法', 'Arts pieces', 'Wear 3 Arts pieces to halve it, 5 to clear it.'],
    ['猛', 'Savage', 'minotaur', 'Bull Demon', '守', 'Guard stance', 'Fight it standing in Guard and it counts as itself.'],
  ];
  return `<div class="c" style="width:1200px;height:800px"><div class="bg"></div><div class="frame"></div>
  <div class="tag">A proposal · not in the game yet</div>
  <div class="in">
    <div class="over"><b>深</b> Deeper hunts · what to build</div>
    <h1>Deep beasts have a trait</h1>
    <div class="sub">From depth 3, a beast counts eight times its power until you answer it.</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px">
      ${T.map(([h, name, fig, beast, ah, answer, how]) => `
        <div style="display:flex;flex-direction:column;align-items:center;padding:18px 16px 20px;border:1px solid rgba(212,175,86,.35);border-radius:12px;background:rgba(23,19,14,.92)">
          <img src="${data(`public/art/cut/${fig}.webp`)}" style="height:190px;width:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))">
          <div class="t" style="margin-top:6px;color:#9C8E74">${beast}</div>
          <div style="margin-top:8px;font:700 26px Cinzel,serif;color:#E07A63"><span class="cn">${h}</span> ${name}</div>
          <div style="font:600 30px Cinzel,serif;color:#CDB67F;margin:6px 0">↓</div>
          <div style="font:700 22px Cinzel,serif;color:#7FC4A0"><span class="cn">${ah}</span> ${answer}</div>
          <div class="t" style="text-align:center;margin-top:8px">${how}</div>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:center;gap:12px;margin-top:22px;font:600 18px system-ui">
      <span style="padding:9px 16px;border-radius:99px;border:1px solid #E07A63;color:#E07A63">Not answered · ×8</span>
      <span style="padding:9px 16px;border-radius:99px;border:1px solid #E2C26A;color:#E2C26A">Half answered · ×2.8</span>
      <span style="padding:9px 16px;border-radius:99px;border:1px solid #7FC4A0;color:#7FC4A0">Answered · ×1</span>
    </div>
    <div class="t" style="text-align:center;margin-top:14px;color:#B9AA8C">Your 套 loadouts make the swap one tap. Pair classes answer half of their schools' traits.</div>
  </div></div>`;
};

const css = fonts('深堅幽猛體法守材力套');
const browser = await chromium.launch({ executablePath: CHROME });
for (const [name, w, h, html] of [['deep-ladder', 1200, 820, ladder], ['deep-traits', 1200, 800, traits]]) {
  const tab = await browser.newPage({ viewport: { width: w, height: h } });
  await tab.setContent(`<!doctype html><meta charset="utf-8"><style>${css}${BASE}</style>${html()}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(250);
  const png = await tab.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  await sharp(png).webp({ quality: 88 }).toFile(`public/discord/promo/${name}.webp`);
  console.log(`深 ${name}`);
  await tab.close();
}
await browser.close();
