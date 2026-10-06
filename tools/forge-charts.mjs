/**
 * 圖 The pictures that carry the workshop proposal on the Discord: what we measured, what
 * changes, and every one of the nine Hundredfold sets in full. Bruno, 2026-10-06: more
 * pictures, charts and data about what is changing, the whole set and its bonuses mirrored,
 * and never one set that is the only one that matters.
 *
 *     SETS=<sets.json> LINES=<folder of forgeline-*.json> node tools/forge-charts.mjs
 *       → public/discord/promo/forge-{pace,need,wall,sets,starfall,timeline,crucible}.webp
 *
 * sets.json comes from tools/forge-sets-data.ts. The forgeline files are the forge level,
 * day by day, of the harness crafter of each habit played on to day 180 (the prototype's
 * tools/forgeline.ts). The day counts in PACE and NEED were measured with tools/need.ts,
 * tools/walls.ts and the prototype's tools/alltogether.ts on 2026-10-06.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/promo';
mkdirSync(OUT, { recursive: true });
const SETS = JSON.parse(readFileSync(process.env.SETS ?? 'tmp-sets.json', 'utf8'));
const LINE = (n) => JSON.parse(readFileSync(`${process.env.LINES ?? 'tmp-lines'}/forgeline-${n}.json`, 'utf8'));

/* ── the palette: three series, validated for the dark surface (dataviz validate_palette) ── */
const C = { today: '#3987e5', without: '#d95926', with: '#199e70' };
const INK = '#efe6d2', SOFT = '#c9b993', FAINT = '#8f8574', GRID = '#3a352b', SURF = '#1d1a15', GOLD = '#D4AF56';

/* ── measured ── */
const PACE = [
  { who: 'Active', today: 45.8, without: 49.3, with: 45.5 },
  { who: 'Casual', today: 64.7, without: 66.3, with: 61.7 },
  { who: 'Once a day', today: 70, without: 77, with: 72 },
  { who: 'Never fights', today: 121, without: 121, with: 111 },
];
const NEED = [
  { what: 'Gear and refining', active: 16, casual: 15 },
  { what: 'The tower', active: 5.5, casual: 0 },
  { what: '道 The Path', active: 3.5, casual: 7.6 },
  { what: 'Stance and arts', active: 2.5, casual: 2.6 },
  { what: '業 Workshop, today', active: 1.5, casual: 3 },
  { what: '業 Workshop, proposed', active: 3.8, casual: 4.6, hi: true },
];
const WALL = [1, 1, 4, 10, 18, 28, 44, 72, 1];
const HOLD = [0, 0, 0, 0, 1, 1.25, 1.5, 2, 0];

const css = fonts('業壁封百煉破境譜凡鐵枯骨古銅霜銀碧玉落星雷紋龍骸仙蛻狩霸秘心緣瓶塔擂器靈力法運拾藏氣');
const page = (w, body) => `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; margin: 0; }
  body { width: ${w}px; background: #15120e; color: ${INK}; font-family: 'Cormorant Garamond', serif; padding: 34px 44px 38px; }
  h1 { font: 700 38px Cinzel, serif; color: ${GOLD}; letter-spacing: .03em; }
  h1 em { font: 600 38px 'Noto Serif SC', serif; font-style: normal; margin-right: 12px; }
  .sub { font: italic 600 22px 'Cormorant Garamond', serif; color: ${SOFT}; margin: 4px 0 20px; max-width: 1400px; }
  .src { font: 600 16px 'Cormorant Garamond', serif; color: ${FAINT}; margin-top: 14px; }
  .legend { display: flex; gap: 22px; font: 600 19px 'Cormorant Garamond', serif; color: ${SOFT}; margin: 0 0 8px; flex-wrap: wrap; }
  .legend i { display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-right: 8px; vertical-align: -1px; }
  svg text { font-family: 'Cormorant Garamond', serif; font-weight: 600; }
  .cjk { font-family: 'Noto Serif SC', serif; }
</style>${body}`;
const legend = (items) => `<div class="legend">${items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`;

/* ── 1 · pace: grouped horizontal bars, one row per habit ── */
function pace() {
  const W = 1500, rowH = 112, top = 10, left = 190, right = 120, max = 130;
  const x = (v) => left + (v / max) * (W - left - right);
  const bars = PACE.map((p, i) => {
    const y0 = top + i * rowH;
    return [['today', C.today], ['without', C.without], ['with', C.with]].map(([k, c], j) => {
      const y = y0 + j * 30; const v = p[k];
      return `<rect x="${left}" y="${y}" width="${x(v) - left}" height="24" rx="4" fill="${c}"/>
        <text x="${x(v) + 10}" y="${y + 19}" font-size="21" fill="${INK}">${v} days</text>`;
    }).join('') + `<text x="${left - 16}" y="${y0 + 52}" font-size="25" fill="${INK}" text-anchor="end">${p.who}</text>`;
  }).join('');
  const ticks = [0, 30, 60, 90, 120].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${top + PACE.length * rowH - 10}" stroke="${GRID}"/>
    <text x="${x(t)}" y="${top + PACE.length * rowH + 14}" font-size="18" fill="${FAINT}" text-anchor="middle">${t}</text>`).join('');
  return page(1600, `<h1><em>壁</em>The day each player reaches the ninth realm</h1>
    <p class="sub">The same four players, played by the game's own rules in the simulator. With the workshop, everyone climbs at today's pace; without it, the walls cost 3 to 7 days. Whoever only waits loses nothing.</p>
    ${legend([[C.today, 'Today'], [C.without, 'With the walls and the seal, workshop ignored'], [C.with, 'With the walls and the seal, workshop used']])}
    <svg width="${W}" height="${top + PACE.length * rowH + 30}">${ticks}${bars}</svg>
    <p class="src">Days to the ninth realm, measured with tools/need.ts, tools/walls.ts and the prototype (2026-10-06). Shorter is faster.</p>`);
}

/* ── 2 · need: what each system is worth, days lost without it ── */
function need() {
  const W = 1500, rowH = 78, left = 330, right = 110, max = 17;
  const x = (v) => left + (v / max) * (W - left - right);
  const rows = NEED.map((n, i) => {
    const y = 8 + i * rowH;
    return `${n.hi ? `<rect x="0" y="${y - 6}" width="${W}" height="${rowH - 6}" rx="8" fill="#2a2418"/>` : ''}
      <text x="${left - 16}" y="${y + 36}" font-size="24" fill="${n.hi ? GOLD : INK}" text-anchor="end">${n.what}</text>
      <rect x="${left}" y="${y + 4}" width="${Math.max(3, x(n.active) - left)}" height="24" rx="4" fill="${C.today}"/>
      <text x="${Math.max(left + 3, x(n.active)) + 10}" y="${y + 23}" font-size="20" fill="${INK}">${n.active}</text>
      <rect x="${left}" y="${y + 34}" width="${Math.max(3, x(n.casual) - left)}" height="24" rx="4" fill="${C.with}"/>
      <text x="${Math.max(left + 3, x(n.casual)) + 10}" y="${y + 53}" font-size="20" fill="${INK}">${n.casual}</text>`;
  }).join('');
  const ticks = [0, 4, 8, 12, 16].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${NEED.length * rowH}" stroke="${GRID}"/>
    <text x="${x(t)}" y="${NEED.length * rowH + 18}" font-size="18" fill="${FAINT}" text-anchor="middle">${t}</text>`).join('');
  return page(1600, `<h1><em>需</em>What each system is worth today</h1>
    <p class="sub">I took one system away at a time and counted how many days later the same player reaches the ninth realm. Gear decides the climb. Today the workshop is worth a day or three; with the proposals it is worth four or five. The furnace counts from the ninth realm on, and that is on purpose.</p>
    ${legend([[C.today, 'Active player'], [C.with, 'Casual player']])}
    <svg width="${W}" height="${NEED.length * rowH + 30}">${ticks}${rows}</svg>
    <p class="src">Days lost without each system, measured with tools/need.ts (2026-10-06).</p>`);
}

/* ── 3 · the wall: how far above itself a warden stands, day by day at the gate ── */
function wall() {
  const W = 1500, H = 470, left = 90, right = 230, top = 16, bottom = 50, days = 13;
  const x = (d) => left + (d / days) * (W - left - right);
  const y = (m) => top + (1 - Math.log(m) / Math.log(80)) * (H - top - bottom);
  const ramp = ['#f0d48a', '#e2bb5c', '#cf9f3c', '#b7812a', '#97621f', '#764716'];
  const lines = [3, 4, 5, 6, 7, 8].map((r, i) => {
    const pts = []; for (let d = 0; d <= days; d += 0.1) pts.push([x(d), y(Math.max(1, WALL[r - 1] * 0.7 ** d))]);
    const lastFree = Math.log(WALL[r - 1]) / -Math.log(0.7);
    return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${ramp[i]}" stroke-width="3"/>
      <text x="${x(0) - 10}" y="${y(WALL[r - 1]) + 7}" font-size="20" fill="${INK}" text-anchor="end">×${WALL[r - 1]}</text>
      <rect x="${W - right + 58}" y="${top + 26 + i * 34}" width="16" height="16" rx="3" fill="${ramp[i]}"/>
      <text x="${W - right + 82}" y="${top + 40 + i * 34}" font-size="19" fill="${INK}">realm ${r}: ${lastFree.toFixed(1)} days</text>`;
  }).join('');
  const grid = [1, 2, 5, 10, 20, 50].map((m) => `<line x1="${left}" x2="${W - right}" y1="${y(m)}" y2="${y(m)}" stroke="${GRID}"/>
    <text x="${W - right + 8}" y="${y(m) + 6}" font-size="17" fill="${FAINT}">×${m}</text>`).join('')
    + [0, 2, 4, 6, 8, 10, 12].map((d) => `<text x="${x(d)}" y="${H - 18}" font-size="18" fill="${FAINT}" text-anchor="middle">day ${d}</text>`).join('')
    + `<text x="${W - right + 58}" y="${top + 10}" font-size="18" fill="${FAINT}">back to its old strength in</text>`;
  // the seal and the pill, for the sixth realm
  const sealW = x(HOLD[5]) - x(0);
  return page(1600, `<h1><em>瓶</em>The bottleneck: a wall that always opens</h1>
    <p class="sub">How far above its old strength a warden stands, by the days since it came to the gate. Every day it loosens by 30%, so waiting always opens it. The workshop gets you through sooner: a Breakthrough Pill counts as 2 days (3.5 at Heaven rank), and an elixir or a sigil as 1 day each.</p>
    <svg width="${W}" height="${H}">${grid}
      <rect x="${x(0)}" y="${top}" width="${sealW}" height="${H - top - bottom}" fill="#d4af56" opacity=".09"/>
      <text x="${x(0) + 8}" y="${top + 24}" font-size="19" fill="${GOLD}">封 sealed (realm 6)</text>
      ${lines}
      <line x1="${x(3.9)}" x2="${x(3.9)}" y1="${top}" y2="${H - bottom}" stroke="${C.with}" stroke-width="2" stroke-dasharray="6 5"/>
      <rect x="${x(3.9) + 4}" y="${H - bottom - 56}" width="262" height="52" rx="6" fill="#15120e" opacity=".92"/>
      <text x="${x(3.9) + 8}" y="${H - bottom - 34}" font-size="19" fill="${INK}">a pill and a sigil carried in:</text>
      <text x="${x(3.9) + 8}" y="${H - bottom - 12}" font-size="19" fill="${INK}">3.9 days on the clock at once</text>
    </svg>
    <p class="src">Warden power over the old reference, REALM_WALL × 0.7 per day, never under ×1. Realms 1, 2 and the ninth have no bottleneck; the Dragon is unchanged.</p>`);
}

/* ── 4 · the nine sets, each whole ── */
function sets() {
  const card = (s) => `<div class="set" style="--c:${s.colour}">
    <div class="sh"><span class="seal cjk">${s.han}</span><span><b>${s.name}</b><i>Realm ${s.realm} · ${s.axes.join(' & ')}</i></span></div>
    <div class="tiles">${s.tiles.map((t) => t.tile).join('')}</div>
    <div class="row"><em>Lineage, worn</em><span>${s.steps.map((x) => `<b>${x.pieces}</b> ${x.says}`).join('<br>')}</span></div>
    <div class="row codex"><em class="cjk">譜 ${s.codex.han}</em><span>${s.codex.ranks.map((r) => `<b class="${r.rank}">${r.rank[0].toUpperCase() + r.rank.slice(1)}</b> ${r.says}`).join('<br>')}</span></div>
    <div class="row lv"><em>Forging</em><span>${s.levels.mystic} · ${s.levels.earth} · ${s.levels.heaven} &nbsp;·&nbsp; ${s.elite ? `parts of the ${s.elite} (elite)` : `parts of the ${s.warden} (warden)`}</span></div>
  </div>`;
  return page(1600, `<h1><em>百煉</em>Nine Hundredfold sets, one for every realm</h1>
    <p class="sub">Each set is six places, forged from its realm's metal. Worn, it gives its lineage bonus and the Hundredfold steps. Finished once, it leaves a 譜 codex bonus for good, each on a different part of the game, so every set keeps counting after you outgrow it.</p>
    <style>
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      .set { background: ${SURF}; border: 1px solid ${GRID}; border-top: 3px solid var(--c); border-radius: 12px; padding: 12px 14px; }
      .sh { display: flex; gap: 10px; align-items: center; }
      .seal { min-width: 58px; height: 44px; padding: 0 6px; border: 2px solid var(--c); color: var(--c); border-radius: 6px; display: grid; place-items: center; font-size: 21px; flex: none; white-space: nowrap; }
      .sh b { font: 700 20px Cinzel, serif; display: block; }
      .sh i { font: italic 600 16px 'Cormorant Garamond', serif; color: ${SOFT}; }
      .tiles { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin: 10px 0 6px; }
      .tiles svg { width: 100%; height: auto; display: block; }
      .row { display: grid; grid-template-columns: 96px 1fr; gap: 8px; font: 600 15.5px/1.3 'Cormorant Garamond', serif; color: ${INK}; margin-top: 6px; }
      .row em { font-style: normal; color: ${FAINT}; font-size: 14.5px; }
      .row b { color: ${GOLD}; margin-right: 4px; }
      .codex em { color: ${GOLD}; }
      .codex b.mystic { color: #b07fd0; } .codex b.earth { color: #d6b25a; } .codex b.heaven { color: #e1873c; }
      .lv span { color: ${SOFT}; }
    </style>
    <div class="grid">${SETS.sets.map(card).join('')}</div>
    <p class="src">Forging levels to start, for Earth and for Heaven (Heaven also asks five pieces of that set already made). Lineage numbers are the game's own; codex bonuses are the proposal's.</p>`);
}

/* ── 5 · one set in full ── */
function starfall() {
  const s = SETS.sets[5];
  const piece = (p) => `<div class="pc"><div class="ph">${p.tile}<span><b>${p.name}</b><i>${p.slot} · Heaven</i></span></div>
    ${p.lines.map((l, i) => `<div class="ln ${i ? '' : 'p'}"><span><span class="cjk">${l.han}</span> ${l.label}</span><em>+${l.v}${l.unit === 'flat' ? '' : '%'}</em></div>`).join('')}</div>`;
  return page(1600, `<h1><em>落星</em>One set in full: Hundredfold Fallen Star</h1>
    <p class="sub">A Sword build at Heaven rank: six pieces, every line chosen at the crucible with two portions of its material. Then every layer the set adds on top.</p>
    <style>
      .wrap { display: grid; grid-template-columns: 1.55fr 1fr; gap: 20px; }
      .pcs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .pc { background: ${SURF}; border: 1px solid ${GRID}; border-radius: 12px; padding: 10px; }
      .ph { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
      .ph svg { width: 54px; height: 54px; flex: none; }
      .ph b { font: 700 17px 'Cormorant Garamond', serif; display: block; line-height: 1.1; }
      .ph i { font: italic 600 15px 'Cormorant Garamond', serif; color: #e1873c; }
      .ln { display: flex; justify-content: space-between; font: 600 16px 'Cormorant Garamond', serif; padding: 2px 6px; border-radius: 6px; background: #241f18; margin-top: 3px; }
      .ln em { font-style: normal; color: #7fb495; } .ln.p em { color: ${GOLD}; }
      .layers { display: grid; gap: 12px; align-content: start; }
      .ly { background: ${SURF}; border: 1px solid ${GRID}; border-left: 3px solid var(--c, ${GOLD}); border-radius: 10px; padding: 10px 14px; font: 600 17px/1.35 'Cormorant Garamond', serif; }
      .ly h3 { font: 700 18px Cinzel, serif; color: var(--c, ${GOLD}); margin-bottom: 4px; }
      .ly b { color: ${GOLD}; margin-right: 6px; }
      .tot { display: flex; flex-wrap: wrap; gap: 6px 14px; }
    </style>
    <div class="wrap"><div class="pcs">${SETS.full.map(piece).join('')}</div>
    <div class="layers">
      <div class="ly"><h3>The six together</h3><div class="tot">${SETS.totals.map((t) => `<span><span class="cjk">${t.han}</span> +${t.v}% ${t.label}</span>`).join('')}</div></div>
      <div class="ly" style="--c:${s.colour}"><h3>落星 Lineage, worn</h3>${s.steps.map((x) => `<div><b>${x.pieces}</b>${x.says}</div>`).join('')}</div>
      <div class="ly"><h3>百煉 Hundredfold, worn</h3><div><b>2</b>elixirs and sigils you carry work a quarter harder</div><div><b>4</b>each one carried breaks a day more of a bottleneck</div><div><b>6</b>this set's codex bonus counts double while worn</div></div>
      <div class="ly"><h3>譜 Codex, for good</h3>${s.codex.ranks.map((r) => `<div><b>${r.rank[0].toUpperCase() + r.rank.slice(1)}</b>${r.says}</div>`).join('')}</div>
      <div class="ly" style="--c:#e1873c"><h3>器靈 Artifact Spirit</h3><div>All six at Heaven: a light of your own and a title on the rankings. Looks only.</div></div>
    </div></div>
    <p class="src">Line values are the game's own for a sixth-realm Heaven piece (baseValue, SECONDARY_SHARE). Forging ${s.levels.mystic} to start, ${s.levels.earth} for Earth, ${s.levels.heaven} and five pieces made for Heaven.</p>`);
}

/* ── 6 · when: the forge level a crafter reaches, and the sets it opens ── */
function timeline() {
  const W = 1500, H = 560, left = 80, right = 270, top = 14, bottom = 50, days = 180;
  const x = (d) => left + (d / days) * (W - left - right);
  const y = (l) => top + (1 - l / 100) * (H - top - bottom);
  const who = [['active', C.today, 'Active crafter'], ['casual', C.with, 'Casual crafter'], ['once_a_day', C.without, 'Once-a-day crafter']];
  const lines = who.map(([k, c]) => {
    const lv = LINE(k).lv; const pts = lv.map((v, d) => (v == null ? null : `${x(d)},${y(v)}`)).filter(Boolean);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="3"/>`;
  }).join('');
  const bands = SETS.sets.map((s) => `<line x1="${left}" x2="${W - right}" y1="${y(s.levels.mystic)}" y2="${y(s.levels.mystic)}" stroke="${s.colour}" stroke-width="1.5" stroke-dasharray="5 6" opacity=".9"/>
    <text x="${W - right + 10}" y="${y(s.levels.mystic) + 6}" font-size="18" fill="${INK}"><tspan class="cjk" fill="${s.colour}">${s.han}</tspan> ${s.name} · ${s.levels.mystic}</text>`).join('');
  const ax = [0, 30, 60, 90, 120, 150, 180].map((d) => `<text x="${x(d)}" y="${H - 18}" font-size="18" fill="${FAINT}" text-anchor="middle">day ${d}</text>`).join('')
    + [0, 25, 50, 75, 99].map((l) => `<text x="${left - 12}" y="${y(l) + 6}" font-size="17" fill="${FAINT}" text-anchor="end">${l}</text>`).join('');
  return page(1600, `<h1><em>鑄</em>When each set opens: the forge over half a year</h1>
    <p class="sub">The Forging level of the simulator's crafter, playing on past the ninth realm, against the level each set starts at. The first sets open in days, the middle ones in weeks, and the last two are the long road: no player in my test reaches them in six months.</p>
    ${legend(who.map(([, c, t]) => [c, t]))}
    <svg width="${W}" height="${H}">${ax}${bands}${lines}</svg>
    <p class="src">Dashed lines: the Forging level each set starts at. Earth asks 8 more, Heaven 20 more and five pieces made. Measured with the prototype's tools/forgeline.ts, the crafter levelling all seven crafts at once; one who forges first gets there sooner.</p>`);
}

/* ── 7 · the crucible: materials, the lines they give, and the three portions ── */
function crucible() {
  const mats = [
    ['craft-ore-cinnabar', '丹砂', 'Cinnabar', '力', 'power', [55.3, 65, 74.8]],
    ['craft-herb-fern', '蕨', "The realm's herb", '氣', 'qi per second', [55.3, 65, 74.8]],
    ['craft-ore-starfall', '落星', 'Starfall ore', '運', 'rarer gear', [38.7, 45.5, 52.3]],
    ['craft-ore-gold', '金', 'Gold ore', '拾', 'drop chance', [12.2, 14.3, 16.4]],
    ['beast:worm', '霸', "The elite's parts", '破', 'beasts weaker', [9.9, 11.7, 13.5]],
    ['craft-ore-jade', '玉', 'Jade', '煉', 'fusion quality', [16.6, 19.5, 22.4]],
    ['craft-ore-thunderore', '雷石', 'Thunder ore', '法', 'arts stronger', [33.2, 39, 44.8]],
    ['craft-ore-stone', '石', 'Stone', '藏', 'chest places', [4, 5, 6]],
  ];
  const src = (k) => (k.startsWith('beast:') ? `public/art/beast/${k.slice(6)}.webp` : `public/art/emblem/${k}.webp`);
  return page(1600, `<h1><em>爐</em>The crucible: every line comes from a material</h1>
    <p class="sub">Each line on a forged piece is one material you choose. One, two or three portions put it at the bottom, middle or top of its rank's band. The ingots do the same for the main line. Shown: a sixth-realm main line at Heaven rank.</p>
    <style>
      .mats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
      .m { background: ${SURF}; border: 1px solid ${GRID}; border-radius: 12px; padding: 12px; display: grid; grid-template-columns: 64px 1fr; gap: 10px; align-items: center; }
      .m img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
      .m b { font: 700 19px 'Cormorant Garamond', serif; display: block; }
      .m i { font: italic 600 17px 'Cormorant Garamond', serif; color: ${GOLD}; display: block; }
      .por { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .por span { background: #241f18; border-radius: 6px; padding: 4px 6px; text-align: center; font: 600 16px 'Cormorant Garamond', serif; color: ${SOFT}; }
      .por span em { display: block; font-style: normal; color: #7fb495; font-size: 18px; }
    </style>
    <div class="mats">${mats.map(([k, han, name, ah, label, v]) => `<div class="m"><img src="${data(src(k))}"><span><b><span class="cjk">${han}</span> ${name}</b><i><span class="cjk">${ah}</span> ${label}</i></span>
      <div class="por">${['1 portion', '2 portions', '3 portions'].map((t, i) => `<span>${t}<em>+${v[i]}${label === 'chest places' ? '' : '%'}</em></span>`).join('')}</div></div>`).join('')}</div>
    <p class="src">A secondary line is 0.6 of these (SECONDARY_SHARE). A portion is six of the material in the sixth realm; the elite's parts are the one material you have to fight for.</p>`);
}

const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const [name, html] of [['pace', pace()], ['need', need()], ['wall', wall()], ['sets', sets()], ['starfall', starfall()], ['timeline', timeline()], ['crucible', crucible()]]) {
  await tab.setViewportSize({ width: 1600, height: 900 });
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(250);
  const tall = await tab.evaluate(() => Math.ceil(document.body.scrollHeight));
  await tab.setViewportSize({ width: 1600, height: tall });
  await sharp(await tab.screenshot({ clip: { x: 0, y: 0, width: 1600, height: tall } })).webp({ quality: 88 }).toFile(`${OUT}/forge-${name}.webp`);
  console.log(`圖 ${OUT}/forge-${name}.webp (${tall}px)`);
}
await browser.close();
