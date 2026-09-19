/**
 * 器 The gear system, presented.
 *
 * Every figure on this page is rendered by the game's own code with the game's own
 * numbers — the tiles come from art/gear.ts, the set values from data/gear.ts, and the
 * drop odds from sim/drops.ts. Nothing here is a mock-up, so nothing here can flatter a
 * system that does not hold up.
 *
 * The copy is European Portuguese: it is written for Bruno, not for the game.
 */
import { writeFileSync } from 'node:fs';
import { portrait } from '../src/art/aura.ts';
import { gearTile, wornRim } from '../src/art/gear.ts';
import { icon } from '../src/art/icon.ts';
import {
  GEAR, RARITIES, RARITY_INFO, SLOTS, SLOT_INFO,
  baseValue, setBonus, TEMPLATE_BY_KEY, type Item, type Rarity, type Slot, type Worn,
} from '../src/data/gear.ts';
import { commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { rarityOdds } from '../src/sim/drops.ts';
import { realm as realmOf } from '../src/data/realms.ts';

const mk = (template: string, rarity: Rarity): Item => {
  const tpl = TEMPLATE_BY_KEY[template];
  return {
    id: `${template}-${rarity}`,
    template,
    rarity,
    rolls: [{ affix: tpl.affix, value: baseValue(tpl, rarity, tpl.affix) }],
  };
};

/** The best template in each slot, so a set reads as that rank's ceiling. */
const BEST: Record<Slot, string> = Object.fromEntries(SLOTS.map((s) => {
  const best = GEAR.filter((g) => g.slot === s).sort((a, b) => b.realm - a.realm)[0];
  return [s, best.key];
})) as Record<Slot, string>;

const fullSet = (rarity: Rarity): Worn =>
  Object.fromEntries(SLOTS.map((s) => [s, mk(BEST[s], rarity)])) as Worn;

// ── 1 · the same object, five ranks ──────────────────────────────────────────

const ladder = RARITIES.map((rarity) => {
  const it = mk('moonblade', rarity);
  const info = RARITY_INFO[rarity];
  return `<figure class="rank">
    <div class="tile">${gearTile(it, { size: 86, spin: 0.12 })}</div>
    <figcaption>
      <b class="cjk" style="color:${info.colour}">${info.han}</b>
      <i>${info.name}</i>
      <span class="mono" style="color:${info.colour}">+${it.rolls[0].value}%</span>
    </figcaption>
  </figure>`;
}).join('');

// ── 2 · the ring, with a worn set ────────────────────────────────────────────

const WORN: Worn = {
  weapon: mk('spiritspear', 'heaven'),
  robe: mk('scalerobe', 'earth'),
  crown: mk('jadepin', 'mystic'),
  talisman: mk('prayerbeads', 'spirit'),
  boots: mk('ironboots', 'common'),
};

const ringSlots = SLOTS.map((s, i) => {
  const a = (i / SLOTS.length) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + Math.cos(a) * 38;
  const y = 50 + Math.sin(a) * 38;
  return `<div class="orb" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%">
    ${gearTile(WORN[s], { size: 54, slot: s, spin: 0.12 })}
  </div>`;
}).join('');

// ── 3 · what a set is worth ──────────────────────────────────────────────────

const setRows = RARITIES.map((rarity) => {
  const b = setBonus(fullSet(rarity));
  const info = RARITY_INFO[rarity];
  return `<tr>
    <td class="cjk" style="color:${info.colour}">${info.han}</td>
    <td>${info.name}</td>
    <td class="n" style="color:var(--cyan)">×${b.power.toFixed(2)}</td>
    <td class="n" style="color:var(--gold)">×${b.rate.toFixed(2)}</td>
  </tr>`;
}).join('');

// ── 4 · where it falls from ──────────────────────────────────────────────────

const dropRows = [1, 5, 9].flatMap((r) => [commonsOf(r)[0], wardenOf(r)].map((b) => {
  const odds = rarityOdds(b);
  const col = realmOf(b.realm).colour;
  return `<tr>
    <td><span class="cjk" style="color:${col}">${b.han}</span>
        <i>${b.warden ? 'guardiã' : 'comum'} · reino ${b.realm}</i></td>
    ${RARITIES.map((x) => `<td class="n" style="color:${RARITY_INFO[x].colour};opacity:${odds[x] < 0.05 ? 0.55 : 1}">${(100 * odds[x]).toFixed(1)}</td>`).join('')}
  </tr>`;
})).join('');

// ── 5 · the aura you wear ────────────────────────────────────────────────────

function withRim(rarity: Rarity | null): string {
  const S = 200;
  return `<svg viewBox="0 0 ${S} ${S}" class="fig">
    <g>${portrait({ realm: 6 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>
    ${wornRim(rarity, S)}
  </svg>`;
}

const rims = ([null, 'spirit', 'earth', 'heaven'] as const).map((rarity) => {
  const info = rarity ? RARITY_INFO[rarity] : null;
  return `<figure class="rim">
    ${withRim(rarity)}
    <figcaption>
      <b class="cjk" style="${info ? `color:${info.colour}` : 'color:var(--faint)'}">${info ? info.han : '—'}</b>
      <i>${info ? info.name : 'sem equipamento'}</i>
    </figcaption>
  </figure>`;
}).join('');

// ── 6 · the six slots named ──────────────────────────────────────────────────

const slotRows = SLOTS.map((s) => {
  const info = SLOT_INFO[s];
  const items = GEAR.filter((g) => g.slot === s);
  return `<div class="slotrow">
    <span class="ic">${icon(info.empty, 26)}</span>
    <span class="txt"><b class="cjk">${info.han}</b> <i>${items.length} peças</i></span>
    <span class="ex">${items.map((g) => g.han).join(' · ')}</span>
  </div>`;
}).join('');

const page = `<title>器 O Equipamento</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --line:#252A5C; --cyan:#5FDCFF;
          --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0; --gold:#FFCE6B;
          color-scheme: dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.62 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:780px; margin:0 auto; padding-block:42px 84px;
           padding-left:20px; padding-right:20px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  .mono { font-variant-numeric:tabular-nums; font-family:Rajdhani,sans-serif; font-weight:600; }
  h1,h2 { margin:0; color:var(--text); font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,11vw,58px); font-weight:400;
       color:var(--cyan); line-height:1.02; }
  h2 { font-family:Rajdhani,sans-serif; font-size:27px; }
  p { margin:0; }
  .sub { color:var(--faint); font-size:18px; margin-top:8px; }
  .says { color:var(--faint); font-size:17px; max-width:50ch; }
  section { margin-top:52px; display:flex; flex-direction:column; gap:16px;
            border-top:1px solid var(--line); padding-top:28px; }
  .tag { font-size:11px; letter-spacing:.22em; text-transform:uppercase;
         color:var(--cyan); font-weight:600; }

  /* 1 */
  .ladder { display:grid; grid-template-columns:repeat(auto-fit,minmax(96px,1fr)); gap:12px; }
  .rank { margin:0; display:flex; flex-direction:column; align-items:center; gap:8px; }
  .rank .tile svg { display:block; }
  .rank figcaption { text-align:center; display:flex; flex-direction:column; gap:1px; }
  .rank b { font-size:20px; }
  .rank i { font-style:normal; font-size:11px; color:var(--faint); }
  .rank span { font-size:14px; }

  /* 2 */
  .wheel { position:relative; aspect-ratio:1; max-width:330px; margin:0 auto; width:100%; }
  .wheel .core { position:absolute; inset:22%; }
  .wheel .core svg { display:block; width:100%; height:100%; }
  .wheel .halo { position:absolute; inset:12%; border-radius:50%; border:1px dashed var(--line); }
  .orb { position:absolute; transform:translate(-50%,-50%); }
  .orb svg { display:block; }

  /* 3 & 4 */
  .scrollx { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:15px; }
  th { text-align:right; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase;
       color:var(--faint); font-weight:600; padding:0 6px 8px; border-bottom:1px solid var(--line); }
  th:first-child { text-align:left; }
  td { padding:9px 6px; border-bottom:1px solid var(--line); vertical-align:baseline; }
  td.cjk { font-size:19px; width:34px; }
  td.n { text-align:right; font-variant-numeric:tabular-nums; font-family:Rajdhani,sans-serif;
         font-weight:600; white-space:nowrap; }
  td i { font-style:normal; display:block; font-size:11px; color:var(--faint); }

  /* 5 */
  .rims { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:14px; }
  .rim { margin:0; display:flex; flex-direction:column; align-items:center; gap:6px; }
  .rim .fig { display:block; width:100%; height:auto; background:#0B0E22;
              border-radius:12px; border:1px solid var(--line); }
  .rim figcaption { text-align:center; }
  .rim b { font-size:19px; display:block; }
  .rim i { font-style:normal; font-size:11.5px; color:var(--faint); }

  /* 6 */
  .slotrow { display:flex; align-items:center; gap:13px; background:var(--panel);
             border:1px solid var(--line); border-radius:10px; padding:11px 14px; }
  .slotrow .ic { color:var(--cyan); flex:none; display:grid; place-items:center; }
  .slotrow .ic svg { display:block; }
  .slotrow .txt { flex:none; width:96px; }
  .slotrow b { font-size:19px; }
  .slotrow i { font-style:normal; font-size:11px; color:var(--faint); display:block; }
  .slotrow .ex { font-family:'Noto Serif SC',serif; font-size:14px; color:var(--faint); }

  .note { border-left:2px solid var(--magenta); padding:4px 0 4px 16px; color:var(--faint);
          font-size:16px; }
  .note b { color:var(--text); font-weight:600; }
</style>

<div class="sheet">
  <header>
    <h1>器</h1>
    <p class="sub">O equipamento, as raridades e a aura que se veste.</p>
  </header>

  <section>
    <p class="tag">1 · Cinco raridades</p>
    <h2>O mesmo objecto, cinco vezes</h2>
    <p class="says">É a mesma espada nas cinco. O que muda é a moldura e a luz à volta —
      nunca o desenho. Por isso um baú com vinte peças lê-se num relance, e uma peça nova
      não custa desenho nenhum.</p>
    <div class="ladder">${ladder}</div>
    <p class="says" style="font-size:15px">凡 moldura simples · 靈 ganha brilho ·
      玄 ganha cantos · 地 ganha um anel partido, a girar · 天 ganha coroa e partículas.</p>
  </section>

  <section>
    <p class="tag">2 · Seis espaços</p>
    <h2>O anel</h2>
    <p class="says">O equipamento orbita o cultivador. Um espaço vazio fica a tracejado —
      tem de se ver que está vazio tão depressa como se vê o que está cheio.</p>
    <div class="wheel">
      <div class="halo"></div>
      <div class="core">${portrait({ realm: 6 })}</div>
      ${ringSlots}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">${slotRows}</div>
  </section>

  <section>
    <p class="tag">3 · Quanto vale</p>
    <h2>Um fato completo</h2>
    <p class="says">Cada peça dá <b style="color:var(--text)">percentagem</b>, não um número
      fixo. Um número fixo morre: no reino 5 o teu poder já anda nos 400.000, e uma espada
      de +4.200 não se nota. A percentagem multiplica-se com tudo o resto, por isso uma boa
      espada encontrada no reino 3 ainda é boa no reino 9.</p>
    <div class="scrollx">
      <table>
        <thead><tr><th></th><th style="text-align:left">Raridade</th><th>力 Poder</th><th>氣 Qi</th></tr></thead>
        <tbody>${setRows}</tbody>
      </table>
    </div>
  </section>

  <section>
    <p class="tag">4 · De onde cai</p>
    <h2>As probabilidades</h2>
    <p class="says">Uma besta comum larga alguma coisa em 18% das mortes. Uma guardiã
      larga <b style="color:var(--text)">sempre</b> — só morre uma vez. E quanto mais alto o
      reino, melhores as probabilidades.</p>
    <div class="scrollx">
      <table>
        <thead><tr><th style="text-align:left">Besta</th>
          ${RARITIES.map((r) => `<th style="color:${RARITY_INFO[r].colour}">${RARITY_INFO[r].han} %</th>`).join('')}
        </tr></thead>
        <tbody>${dropRows}</tbody>
      </table>
    </div>
    <p class="note"><b>A mesma morte dá sempre a mesma peça.</b> Não dá para fechar o jogo
      e voltar a abrir à espera de melhor sorte — e não foi preciso guardar nada para o
      impedir.</p>
  </section>

  <section>
    <p class="tag">5 · A aura que se veste</p>
    <h2>O que encontras vê-se</h2>
    <p class="says">A peça mais rara que tens vestida põe um aro à volta do cultivador.
      É a razão para quereres uma peça 天 para além da percentagem: o que encontraste
      aparece no teu corpo, sem ninguém abrir um menu.</p>
    <div class="rims">${rims}</div>
  </section>

  <section>
    <p class="tag">6 · Onde encaixa</p>
    <h2>Isto não substitui as quatro caixas</h2>
    <p class="says">劍訣 técnica e 妖丹 núcleos continuam a ser onde gastas o qi.
      O equipamento é o que <b style="color:var(--text)">cai</b> — não se compra, encontra-se.
      É a única coisa no jogo que te dá uma surpresa em vez de um preço.</p>
    <p class="says">Falta decidir: se peças repetidas se fundem para subir de raridade
      (isso é o crafting), e se há um limite de espaço no baú.</p>
  </section>
</div>`;

writeFileSync('gear-system.html', page);
console.log(`gear-system.html — ${(page.length / 1024).toFixed(0)} KB`);
