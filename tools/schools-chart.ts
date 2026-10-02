/**
 * 譜 Which piece is which school, as one picture, and the fifteen classes as another.
 *
 * Raziel Morgenstern, on the Discord (2026-10-02): *"is this possible to have a list of
 * which gear is what school? ... I have no idea which name is what class, apart from
 * learning it by heart."* The school goes with the shape of a piece and never its metal,
 * so the whole answer is fifty-four shapes under six seals.
 *
 * Every tile is drawn by the game's own gearTile, every sentence is the game's own
 * (schoolSays and pairSays, read off balance.ts), so the picture cannot promise what the
 * game does not pay. When a shape or a perk changes, run this again.
 *
 *     npx tsx tools/schools-chart.ts   → public/discord/schools-chart.webp, public/discord/pairs-chart.webp
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { gearTile } from '../src/art/gear.ts';
import { AFFIX_INFO, ARCHETYPES, SLOTS, SLOT_INFO, type Item } from '../src/data/gear.ts';
import { PAIRS, SCHOOLS, SCHOOL_INFO, schoolOfAxis, type School } from '../src/data/schools.ts';
import { SCHOOL_FULL, SCHOOL_WAKES } from '../src/sim/balance.ts';
import { pairSays, schoolSays } from '../src/app/classes.ts';
import { data, fonts } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const W = 1200;
/** 雷紋 Thunderscript, the seventh realm's metal: it glows, and reads on the dark. */
const REALM = 7;
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

const tile = (key: string, affix: string) => gearTile({
  id: key, template: `${key}${REALM}`, rarity: 'earth', rolls: [{ affix, value: 1 }],
} as unknown as Item, { size: 76 });

const shapes = (sc: School) => SLOTS.flatMap((slot) =>
  ARCHETYPES.filter((a) => a.slot === slot && schoolOfAxis(a.affix) === sc));

const G = 'rgba(212,175,86,.8)';
const bracket = (x: string, y: string) =>
  `linear-gradient(${G},${G}) ${x} ${y} / 26px 2px no-repeat, linear-gradient(${G},${G}) ${x} ${y} / 2px 26px no-repeat`;

const shell = (css: string, body: string) => `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; } body { margin: 0; background: #0D0B08; }
  .page { width: ${W}px; position: relative; padding: 56px 56px 48px; color: #E9DFC6;
          background: radial-gradient(1200px 500px at 50% -10%, rgba(212,175,86,.10), transparent 70%), #0D0B08; }
  .frame { position: absolute; inset: 18px; border: 1px solid rgba(212,175,86,.36); pointer-events: none;
           background: ${bracket('left 8px', 'top 8px')}, ${bracket('right 8px', 'top 8px')},
                       ${bracket('left 8px', 'bottom 8px')}, ${bracket('right 8px', 'bottom 8px')}; }
  header { display: flex; align-items: center; gap: 26px; margin-bottom: 26px; }
  .bigseal { width: 104px; height: 104px; flex: none; display: grid; place-items: center; border: 2px solid #D4AF56;
             border-radius: 6px; font: 600 64px/1 'Noto Serif SC', serif; color: #E2C26A;
             box-shadow: inset 0 0 0 5px #0D0B08, inset 0 0 0 6px rgba(212,175,86,.45), 0 0 40px rgba(212,175,86,.14); }
  .over { font: 600 14px/1 Cinzel, serif; letter-spacing: .3em; text-transform: uppercase; color: #8FB49B; }
  h1 { margin: 10px 0 8px; font: 700 40px/1.05 Cinzel, serif; color: #F3E8CF; letter-spacing: .02em; }
  .sub { font: italic 600 23px/1.3 'Cormorant Garamond', serif; color: #CDB67F; }
  .brand { position: absolute; right: 56px; top: 50px; display: flex; align-items: center; gap: 8px; opacity: .9; }
  .brand .m { width: 32px; } .brand .n { width: 100px; }
  .hz { font-family: 'Noto Serif SC', serif; }
  .foot { margin-top: 22px; text-align: center; font: italic 600 19px/1.3 'Cormorant Garamond', serif; color: #A8987A; }
  </style><div class="page"><div class="frame"></div>
  <div class="brand"><img class="m" src="${data('public/brand/mark.webp')}" alt=""><img class="n" src="${data('public/brand/name.webp')}" alt=""></div>
  ${body}</div>`;

function schoolsPage(css: string): string {
  const rows = SCHOOLS.map((sc) => {
    const s = SCHOOL_INFO[sc];
    const leads = s.axes.map((a) => `<span class="hz">${AFFIX_INFO[a].han}</span> ${AFFIX_INFO[a].label}`).join(' or ');
    const list = shapes(sc);
    const missing = SLOTS.filter((slot) => !list.some((a) => a.slot === slot));
    return `<section style="--c:${s.colour}">
      <div class="who">
        <div class="seal hz">${s.seal}</div>
        <div><div class="name"><span class="hz">${s.han}</span> ${s.name}</div>
        <div class="leads">Leads with ${leads}</div></div>
        <p class="says">${schoolSays(sc)}</p>
      </div>
      <div class="shapes">${list.map((a) => `<figure>${tile(a.key, a.affix)}
        <figcaption>${a.name}<small>${SLOT_INFO[a.slot].name}</small></figcaption></figure>`).join('')}
        ${missing.map((slot) => `<figure class="none"><div class="gap">none</div>
        <figcaption>No ${SLOT_INFO[slot].name.toLowerCase()}<small>${SLOT_INFO[slot].name}</small></figcaption></figure>`).join('')}
      </div></section>`;
  }).join('');
  return shell(css + `
    section { display: grid; grid-template-columns: 330px 1fr; gap: 26px; padding: 20px 22px; margin-top: 14px;
              border: 1px solid rgba(212,175,86,.16); border-left: 3px solid var(--c); border-radius: 6px;
              background: linear-gradient(90deg, color-mix(in srgb, var(--c) 9%, transparent), rgba(255,255,255,.012) 40%); }
    .who { display: grid; grid-template-columns: 62px 1fr; gap: 4px 14px; align-content: start; }
    .seal { width: 58px; height: 58px; display: grid; place-items: center; border: 2px solid var(--c); border-radius: 5px;
            font-size: 36px; color: var(--c); box-shadow: inset 0 0 0 4px #0D0B08, inset 0 0 0 5px color-mix(in srgb, var(--c) 50%, transparent); }
    .name { font: 700 21px/1.15 Cinzel, serif; color: #F3E8CF; margin-top: 4px; }
    .name .hz { color: var(--c); font-size: 20px; margin-right: 2px; }
    .leads { font: 600 14px/1.3 Cinzel, serif; letter-spacing: .04em; color: #A8987A; margin-top: 5px; }
    .leads .hz { color: var(--c); }
    .says { grid-column: 1 / -1; margin: 12px 0 0; font: italic 600 19px/1.3 'Cormorant Garamond', serif; color: #E3D3A8; }
    .shapes { display: grid; grid-template-columns: repeat(8, 1fr); gap: 12px 8px; align-content: start; }
    figure { margin: 0; display: grid; justify-items: center; gap: 6px; }
    figure svg { display: block; filter: drop-shadow(0 4px 10px rgba(0,0,0,.5)); }
    figcaption { font: 600 13px/1.15 Cinzel, serif; text-align: center; color: #EDE2C6; }
    figcaption small { display: block; margin-top: 3px; font: italic 600 13px/1 'Cormorant Garamond', serif; color: #8F8166; letter-spacing: .02em; }
    .gap { width: 76px; height: 76px; display: grid; place-items: center; border: 1px dashed #3A3226; border-radius: 9px;
           font: italic 600 15px/1 'Cormorant Garamond', serif; color: #5B5040; }
    .none figcaption { color: #6E6350; }
  `, `<header><div class="bigseal">譜</div><div>
      <div class="over"><span class="hz" style="color:#D4AF56">器</span> Gear · the six schools</div>
      <h1>Which Piece Is Which School</h1>
      <div class="sub">The school goes with the shape, never the metal: every Sword is a Sword piece, from the first realm to the ninth.
        ${WORD[SCHOOL_WAKES][0].toUpperCase()}${WORD[SCHOOL_WAKES].slice(1)} pieces of one school wake it, ${WORD[SCHOOL_FULL]} bring it to its full.</div></div></header>
    ${rows}
    <div class="foot">Every piece shows its school's seal in its top corner, and the chest filters by school.</div>`);
}

function classesPage(css: string): string {
  // 合 The fifteen as a table: a school down the side, a school across the top, the class
  // where they meet. Only the upper half is filled, because Sword and Qi is Qi and Sword.
  const cell = (a: School, b: School) => {
    const p = PAIRS.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!p) return '<td class="x"></td>';
    return `<td style="--a:${SCHOOL_INFO[p.a].colour};--b:${SCHOOL_INFO[p.b].colour}">
      <div class="ph hz">${p.han}</div><div class="pn">${p.name}</div><div class="ps">${pairSays(p.key)}</div></td>`;
  };
  const head = (sc: School) => `<span class="hz" style="color:${SCHOOL_INFO[sc].colour}">${SCHOOL_INFO[sc].seal}</span> ${SCHOOL_INFO[sc].short}`;
  const rows = SCHOOLS.slice(0, -1).map((a, i) => `<tr><th class="side">${head(a)}</th>${
    SCHOOLS.slice(1).map((b, j) => (j >= i ? cell(a, b) : '<td class="x"></td>')).join('')}</tr>`).join('');
  return shell(css + `
    table { width: 100%; border-collapse: separate; border-spacing: 8px; table-layout: fixed; margin-top: 6px; }
    th { font: 700 16px/1.1 Cinzel, serif; color: #E9DFC6; padding: 4px; }
    th .hz { font-size: 22px; margin-right: 4px; }
    th.side { width: 120px; text-align: right; }
    td { vertical-align: top; padding: 12px 12px 14px; border-radius: 6px; height: 150px;
         border: 1px solid rgba(212,175,86,.18);
         background: linear-gradient(135deg, color-mix(in srgb, var(--a) 16%, transparent), color-mix(in srgb, var(--b) 16%, transparent)), #15120D; }
    td.x { background: none; border: none; }
    .ph { font-size: 22px; color: #E2C26A; }
    .pn { font: 700 15px/1.1 Cinzel, serif; color: #F3E8CF; margin-top: 4px; }
    .ps { font: italic 600 16px/1.22 'Cormorant Garamond', serif; color: #D9C99E; margin-top: 7px; }
  `, `<header><div class="bigseal">合</div><div>
      <div class="over"><span class="hz" style="color:#D4AF56">職</span> Classes · two schools at once</div>
      <h1>The Fifteen Classes</h1>
      <div class="sub">Wear ${WORD[SCHOOL_WAKES]} pieces of each of two schools: both schools wake, and the class where they meet adds its own perk.</div></div></header>
    <table><tr><th></th>${SCHOOLS.slice(1).map((b) => `<th>${head(b)}</th>`).join('')}</tr>${rows}</table>
    <div class="foot">Changing class is changing clothes, and it costs nothing.</div>`);
}

const han = [...SCHOOLS.flatMap((s) => [...SCHOOL_INFO[s].han, SCHOOL_INFO[s].seal]),
  ...PAIRS.flatMap((p) => [...p.han]), ...Object.values(AFFIX_INFO).map((a) => a.han), '譜合器職'].join('');
const css = fonts(han);
const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ viewport: { width: W, height: 800 }, deviceScaleFactor: 2 });
for (const [name, html] of [['schools-chart', schoolsPage(css)], ['pairs-chart', classesPage(css)]] as const) {
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(200);
  const h = await tab.evaluate(() => document.querySelector('.page')!.getBoundingClientRect().height);
  const png = await tab.screenshot({ clip: { x: 0, y: 0, width: W, height: Math.ceil(h) }, fullPage: true });
  await sharp(png).webp({ quality: 88 }).toFile(`public/discord/${name}.webp`);
  console.log(`  ${name}.webp ${W}×${Math.ceil(h)}`);
}
await browser.close();
