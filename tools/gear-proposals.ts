/**
 * Three ways to lay out the same paperdoll, on the same phone, with the same gear.
 *
 * Only the layout changes: identical slots, identical bag, identical numbers. That is
 * the one way the comparison stays honest — as with the art directions, whichever looks
 * best must be winning on its layout and not on better contents.
 */
import { writeFileSync } from 'node:fs';
import { portrait } from '../src/art/aura.ts';
import { icon } from '../src/art/icon.ts';
import {
  AFFIX_INFO, RARITY_INFO, SLOTS, SLOT_INFO,
  TEMPLATE_BY_KEY, type Item, type Rarity, type Slot,
} from '../src/data/gear.ts';
import { realm as realmOf } from '../src/data/realms.ts';

const REALM = 5;
const R = realmOf(REALM);

const item = (template: string, rarity: Rarity, value: number): Item =>
  ({ id: `${template}-${rarity}`, template, rarity, value });

/** Four of six slots filled: an empty slot has to look as deliberate as a full one. */
const WORN: Partial<Record<Slot, Item>> = {
  weapon: item('spiritspear', 'mystic', 4200),
  robe: item('scalerobe', 'spirit', 2.4),
  crown: item('jadepin', 'earth', 5.1),
  talisman: item('prayerbeads', 'common', 1.2),
};

const BAG: readonly Item[] = [
  item('moonblade', 'heaven', 9800),
  item('greycloak', 'earth', 3100),
  item('ironboots', 'spirit', 1400),
  item('plainring', 'mystic', 2200),
  item('woodcharm', 'common', 0.8),
  item('clothrobe', 'common', 0.6),
  item('ironsword', 'spirit', 900),
  item('gempendant', 'mystic', 2600),
  item('strawboots', 'common', 0.4),
  item('bonecrown', 'earth', 4400),
];

const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(1));

function line(it: Item): string {
  const tpl = TEMPLATE_BY_KEY[it.template];
  return `${AFFIX_INFO[tpl.affix].han} +${fmt(it.value)}`;
}

/** One gear tile: the object on a rarity frame. The frame carries the rank, never the object. */
function tile(it: Item | undefined, slot: Slot, size: number): string {
  const info = SLOT_INFO[slot];
  if (!it) {
    return `<div class="tile" data-empty="true" style="--w:${size}px">
      <span class="ic">${icon(info.empty, Math.round(size * 0.46))}</span>
      <em>${info.han}</em>
    </div>`;
  }
  const tpl = TEMPLATE_BY_KEY[it.template];
  const rar = RARITY_INFO[it.rarity];
  return `<div class="tile" style="--w:${size}px;--rar:${rar.colour}">
    <span class="ic">${icon(tpl.icon, Math.round(size * 0.52))}</span>
    <em>${rar.han}</em>
  </div>`;
}

function bagGrid(): string {
  return BAG.map((it) => {
    const tpl = TEMPLATE_BY_KEY[it.template];
    const rar = RARITY_INFO[it.rarity];
    return `<div class="bagit" style="--rar:${rar.colour}">
      <span class="ic">${icon(tpl.icon, 26)}</span>
      <b>${rar.han}</b>
    </div>`;
  }).join('');
}

const totals = () => {
  let power = 0;
  let rate = 0;
  for (const it of Object.values(WORN)) {
    if (!it) continue;
    if (TEMPLATE_BY_KEY[it.template].affix === 'power') power += it.value;
    else rate += it.value;
  }
  return { power, rate };
};

const T = totals();

const header = `<div class="ghead">
  <span><span class="cjk" style="color:${R.colour}">${R.han}</span> <i>${R.name}</i></span>
  <span class="mono"><b style="color:${R.colour}">力 +${fmt(T.power)}</b> <b style="color:var(--gold)">氣 +${fmt(T.rate)}</b></span>
</div>`;

// ── A · classic paperdoll: figure centred, three slots each side ──────────────

const LEFT: readonly Slot[] = ['weapon', 'robe', 'boots'];
const RIGHT: readonly Slot[] = ['crown', 'talisman', 'ring'];

const screenA = `<div class="phone">
  ${header}
  <div class="doll">
    <div class="col">${LEFT.map((s) => tile(WORN[s], s, 54)).join('')}</div>
    <div class="fig">${portrait({ realm: REALM })}</div>
    <div class="col">${RIGHT.map((s) => tile(WORN[s], s, 54)).join('')}</div>
  </div>
  <div class="bhead"><span>藏 Chest</span><span class="mono">${BAG.length} / 40</span></div>
  <div class="bag">${bagGrid()}</div>
</div>`;

// ── B · compact list: every slot named, every stat readable ───────────────────

const rows = SLOTS.map((s) => {
  const it = WORN[s];
  const tpl = it ? TEMPLATE_BY_KEY[it.template] : null;
  const rar = it ? RARITY_INFO[it.rarity] : null;
  return `<div class="srow"${it ? '' : ' data-empty="true"'}>
    ${tile(it, s, 42)}
    <span class="txt">
      <b class="cjk" style="${rar ? `color:${rar.colour}` : ''}">${tpl ? tpl.han : SLOT_INFO[s].han}</b>
      <i>${tpl ? tpl.name : `${SLOT_INFO[s].name} — empty`}</i>
    </span>
    <span class="val mono">${it ? line(it) : '—'}</span>
  </div>`;
}).join('');

const screenB = `<div class="phone">
  ${header}
  <div class="srows">${rows}</div>
  <div class="bhead"><span>藏 Chest</span><span class="mono">${BAG.length} / 40</span></div>
  <div class="bag">${bagGrid()}</div>
</div>`;

// ── C · the ring: slots orbiting the aura, the way the art already orbits ─────

const ring = SLOTS.map((s, i) => {
  const a = (i / SLOTS.length) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + Math.cos(a) * 39;
  const y = 50 + Math.sin(a) * 39;
  return `<div class="orb" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%">${tile(WORN[s], s, 50)}</div>`;
}).join('');

const screenC = `<div class="phone">
  ${header}
  <div class="wheel">
    <div class="halo"></div>
    <div class="core">${portrait({ realm: REALM })}</div>
    ${ring}
  </div>
  <div class="bhead"><span>藏 Chest</span><span class="mono">${BAG.length} / 40</span></div>
  <div class="bag">${bagGrid()}</div>
</div>`;

const PROPOSALS = [
  { han: '偶', name: 'Classic paperdoll', screen: screenA,
    good: 'Instantly readable, and the one every RPG player already knows. The figure is the hero of the screen and the aura does the work.',
    bad: 'The slot tiles are small at phone width, and the names do not fit — you have to tap a slot to learn what is in it.' },
  { han: '列', name: 'Compact list', screen: screenB,
    good: 'Every slot is named and every bonus is legible without tapping anything. Easiest to use with one thumb, and the easiest to grow when items get more stats.',
    bad: 'It is a menu, not a picture. The cultivator disappears, and with it the reason the art exists.' },
  { han: '環', name: 'The ring', screen: screenC,
    good: 'On-theme: the art already puts an orbit ring around the cultivator at realm 6, so the gear orbits the same way. The most distinctive of the three.',
    bad: 'Six slots is the limit — a seventh crowds the circle. Also the hardest to keep tidy on very small screens.' },
];

const cards = PROPOSALS.map((p, i) => `
  <article class="prop">
    <div class="phead">
      <p class="tag">Proposal ${i + 1}</p>
      <h3><span class="cjk">${p.han}</span> ${p.name}</h3>
    </div>
    ${p.screen}
    <div class="ptxt">
      <p><b>Good:</b> ${p.good}</p>
      <p class="bad"><b>Costs:</b> ${p.bad}</p>
    </div>
  </article>`).join('');

const page = `<title>Paperdoll Proposals</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:16px/1.6 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:1060px; margin:0 auto; padding-block:42px 80px;
           padding-left:20px; padding-right:20px; }
  .cjk { font-family:'Noto Serif SC', serif; }
  .mono { font-variant-numeric: tabular-nums; }
  h1,h2,h3 { margin:0; color:var(--text); font-weight:600; text-wrap:balance; }
  h1 { font-family:Rajdhani,sans-serif; font-size:clamp(32px,7vw,46px); line-height:1.06; }
  h3 { font-family:Rajdhani,sans-serif; font-size:21px; }
  p { margin:0; }
  .lede { color:var(--faint); font-size:18px; margin-top:10px; max-width:58ch; }
  .tag { font-size:10.5px; letter-spacing:.18em; text-transform:uppercase;
         color:var(--faint); font-weight:600; }
  section { border-top:1px solid var(--line); padding-top:28px; margin-top:44px;
            display:flex; flex-direction:column; gap:16px; }

  .props { display:grid; gap:40px; }
  @media(min-width:940px){ .props { grid-template-columns:repeat(3,1fr); gap:24px; } }
  .prop { display:flex; flex-direction:column; gap:13px; }
  .ptxt { display:flex; flex-direction:column; gap:8px; font-size:14px; }
  .ptxt b { color:var(--cyan); font-weight:600; }
  .bad { color:var(--faint); }
  .bad b { color:var(--magenta); }

  /* ── the phone ────────────────────────────────────────────────────────── */
  .phone { background:var(--ground); border:1px solid var(--line); border-radius:18px;
           padding:14px; display:flex; flex-direction:column; gap:12px;
           max-width:330px; width:100%; margin-inline:auto; }

  .ghead { display:flex; align-items:baseline; justify-content:space-between; font-size:12.5px; }
  .ghead .cjk { font-size:17px; }
  .ghead i { font-style:normal; color:var(--faint); font-size:11.5px; }
  .ghead b { font-family:Rajdhani,sans-serif; font-size:13.5px; margin-left:7px; }

  .tile { width:var(--w); height:var(--w); border-radius:9px; position:relative;
          border:1px solid var(--rar, var(--line)); background:var(--panel);
          display:grid; place-items:center; color:var(--rar, var(--faint)); flex:none; }
  .tile[data-empty='true'] { border-style:dashed; background:var(--panel2); opacity:.55; }
  .tile .ic svg { display:block; }
  .tile em { position:absolute; bottom:2px; right:4px; font-style:normal;
             font-family:'Noto Serif SC',serif; font-size:9.5px; opacity:.85; }

  /* A */
  .doll { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; }
  .doll .col { display:flex; flex-direction:column; gap:8px; }
  .doll .fig { aspect-ratio:1; }
  .doll .fig svg { display:block; width:100%; height:100%; }

  /* B */
  .srows { display:flex; flex-direction:column; gap:6px; }
  .srow { display:flex; align-items:center; gap:10px; background:var(--panel);
          border:1px solid var(--line); border-radius:9px; padding:6px 9px 6px 6px; }
  .srow[data-empty='true'] { background:var(--panel2); }
  .srow .txt { flex:1; min-width:0; }
  .srow b { display:block; font-size:14.5px; font-weight:400; }
  .srow i { font-style:normal; font-size:10.5px; color:var(--faint); }
  .srow .val { font-family:Rajdhani,sans-serif; font-size:13.5px; color:var(--gold); white-space:nowrap; }

  /* C */
  .wheel { position:relative; aspect-ratio:1; }
  .wheel .core { position:absolute; inset:21%; }
  .wheel .core svg { display:block; width:100%; height:100%; }
  .wheel .halo { position:absolute; inset:11%; border-radius:50%;
                 border:1px dashed var(--line); }
  .orb { position:absolute; transform:translate(-50%,-50%); }

  .bhead { display:flex; justify-content:space-between; font-size:11px; letter-spacing:.16em;
           text-transform:uppercase; color:var(--faint); margin-top:2px; }
  .bhead .cjk { letter-spacing:0; }
  .bag { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .bagit { aspect-ratio:1; border-radius:8px; border:1px solid var(--rar);
           background:var(--panel); display:grid; place-items:center; position:relative;
           color:var(--rar); }
  .bagit .ic svg { display:block; }
  .bagit b { position:absolute; bottom:1px; right:3px; font-family:'Noto Serif SC',serif;
             font-size:9px; font-weight:400; opacity:.85; }
</style>

<div class="sheet">
  <header>
    <p class="tag">Gear · inventory · chest</p>
    <h1>Three paperdolls</h1>
    <p class="lede">The same six slots, the same chest, the same numbers — laid out three
      ways. Only the layout differs, so whichever wins is winning on its layout.</p>
  </header>

  <section>
    <p class="tag">What is being laid out</p>
    <h2 style="font-family:Rajdhani,sans-serif;font-size:26px">Six slots, five ranks</h2>
    <p style="color:var(--faint);font-size:15px">
      劍 weapon · 袍 robe · 冠 crown · 靴 boots · 珮 talisman · 戒 ring. Rank is carried by
      the frame colour, never by the object, so a chest reads at a glance:
      ${Object.values(RARITY_INFO).map((r) => `<span class="cjk" style="color:${r.colour}">${r.han}</span> ${r.name}`).join(' · ')}.
    </p>
  </section>

  <section>
    <p class="tag">Pick by number</p>
    <div class="props">${cards}</div>
  </section>
</div>`;

writeFileSync('gear.html', page);
console.log(`gear.html — ${(page.length / 1024).toFixed(0)} KB`);
