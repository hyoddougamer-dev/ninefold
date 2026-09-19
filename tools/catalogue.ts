/**
 * 器道 The catalogue and the tree, on one page.
 *
 * Every tile is drawn by the game's own art code and every number comes from the game's
 * own tables, so nothing here can flatter a system that does not hold up.
 *
 * The copy is European Portuguese: it is written for Bruno, not for the game.
 */
import { writeFileSync } from 'node:fs';
import { gearTile } from '../src/art/gear.ts';
import { icon } from '../src/art/icon.ts';
import {
  AFFIXES, AFFIX_INFO, GEAR, RARITY_INFO, SECONDARIES, SLOTS, SLOT_INFO,
  baseValue, type Rarity,
} from '../src/data/gear.ts';
import { PATHS, PATH_INFO, TOTAL_COST, nodesOf } from '../src/data/techniques.ts';
import { affinity, daoEarned, extraChestSlots, powerMultiplier, rateMultiplier } from '../src/sim/dao.ts';
import { realm as realmOf } from '../src/data/realms.ts';

const FULL_RUN = daoEarned(73, 9);

/** Rarity by realm, so the grid shows all five frames and reads as the drop table does. */
const rarityForRealm = (realm: number): Rarity =>
  realm <= 2 ? 'common' : realm <= 4 ? 'spirit' : realm <= 6 ? 'mystic' : realm <= 8 ? 'earth' : 'heaven';

const catalogue = SLOTS.map((slot) => {
  const info = SLOT_INFO[slot];
  const pieces = GEAR.filter((g) => g.slot === slot).sort((a, b) => a.realm - b.realm);
  return `<section class="slot">
    <div class="slothead">
      <span class="ic">${icon(info.empty, 28)}</span>
      <h3><span class="cjk">${info.han}</span> ${info.name}</h3>
      <span class="axes">${[...new Set(pieces.map((x) => x.affix))]
        .map((a) => `<span class="cjk">${AFFIX_INFO[a].han}</span>`).join('')}</span>
      <span class="count">${pieces.length}</span>
    </div>
    <div class="grid">
      ${pieces.map((g) => {
        const rarity = rarityForRealm(g.realm);
        const rar = RARITY_INFO[rarity];
        const affix = AFFIX_INFO[g.affix];
        const value = baseValue(g, rarity, g.affix);
        return `<figure class="piece">
          ${gearTile({ id: g.key, template: g.key, rarity, rolls: [] }, { size: 68, spin: 0.12 })}
          <figcaption>
            <b class="cjk" style="color:${rar.colour}">${g.han}</b>
            <i>${g.name}</i>
            <span class="axis"><span class="cjk">${affix.han}</span> +${value}${affix.unit === '%' ? '%' : ''}</span>
            <span style="color:${realmOf(g.realm).colour}">reino ${g.realm}</span>
          </figcaption>
        </figure>`;
      }).join('')}
    </div>
  </section>`;
}).join('');

const tree = PATHS.map((path) => {
  const info = PATH_INFO[path];
  const nodes = nodesOf(path);
  const keys = nodes.map((x) => x.key);
  const gains = [
    powerMultiplier(keys) > 1 ? `力 ×${powerMultiplier(keys).toFixed(2)}` : '',
    rateMultiplier(keys) > 1 ? `氣 ×${rateMultiplier(keys).toFixed(2)}` : '',
    extraChestSlots(keys) ? `baú +${extraChestSlots(keys)}` : '',
  ].filter(Boolean).join(' · ');

  return `<div class="branch" style="--hue:${info.colour}">
    <div class="bhead">
      <span class="ic">${icon(info.icon, 30)}</span>
      <span>
        <b class="cjk">${info.han}</b> <em>${info.name}</em>
        <i>${info.blurb}</i>
      </span>
    </div>
    <ol class="nodes">
      ${nodes.map((x) => `<li>
        <span class="cost">${x.cost}</span>
        <span class="body">
          <b class="cjk">${x.han}</b> <em>${x.name}</em>
          <i>${x.text}</i>
        </span>
      </li>`).join('')}
    </ol>
    <p class="gains">Inteiro: ${gains} · custa 20 道</p>
  </div>`;
}).join('');

const affinityRows = SLOTS.map((slot) => {
  const cells = PATHS.map((p) => {
    const a = affinity(nodesOf(p).map((x) => x.key), slot);
    return `<td class="n" style="color:${a > 1 ? PATH_INFO[p].colour : 'var(--faint)'}">${a > 1 ? `×${a.toFixed(2)}` : '—'}</td>`;
  }).join('');
  return `<tr><td><span class="cjk">${SLOT_INFO[slot].han}</span> ${SLOT_INFO[slot].name}</td>${cells}</tr>`;
}).join('');

const page = `<title>器道 Equipamento e Árvore</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.6 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:920px; margin:0 auto; padding-block:42px 84px;
           padding-left:20px; padding-right:20px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2,h3 { margin:0; color:var(--text); font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,11vw,58px); font-weight:400;
       color:var(--cyan); line-height:1.02; }
  h2 { font-family:Rajdhani,sans-serif; font-size:28px; }
  h3 { font-family:Rajdhani,sans-serif; font-size:20px; }
  p { margin:0; }
  .sub { color:var(--faint); font-size:18px; margin-top:8px; }
  .says { color:var(--faint); max-width:52ch; }
  .tag { font-size:11px; letter-spacing:.22em; text-transform:uppercase;
         color:var(--cyan); font-weight:600; }
  .part { margin-top:54px; border-top:1px solid var(--line); padding-top:30px;
          display:flex; flex-direction:column; gap:16px; }

  /* catálogo */
  .slot { display:flex; flex-direction:column; gap:12px; margin-top:26px; }
  .slothead { display:flex; align-items:center; gap:11px; }
  .slothead .ic { color:var(--cyan); display:grid; place-items:center; }
  .slothead .ic svg { display:block; }
  .slothead .count { margin-left:auto; font-family:Rajdhani,sans-serif; font-weight:700;
                     color:var(--faint); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(88px,1fr)); gap:12px; }
  .piece { margin:0; display:flex; flex-direction:column; align-items:center; gap:5px; }
  .piece svg { display:block; }
  .piece figcaption { text-align:center; line-height:1.3; }
  .piece b { display:block; font-size:15px; }
  .piece i { font-style:normal; font-size:10.5px; color:var(--faint); display:block; }
  .piece span { font-size:9.5px; letter-spacing:.06em; }
  .piece .axis { display:block; font-size:11px; color:var(--gold); font-family:Rajdhani,sans-serif;
                 font-weight:700; margin-top:1px; }
  .piece .axis .cjk { font-family:'Noto Serif SC',serif; font-weight:400; margin-right:2px; }
  .slothead .axes { margin-left:10px; font-size:15px; color:var(--faint); letter-spacing:.14em; }

  /* árvore */
  .tree { display:grid; gap:20px; }
  @media(min-width:760px){ .tree { grid-template-columns:repeat(3,1fr); } }
  .branch { background:var(--panel2); border:1px solid var(--line); border-radius:14px;
            padding:16px; display:flex; flex-direction:column; gap:12px; }
  .bhead { display:flex; gap:12px; align-items:flex-start; }
  .bhead .ic { color:var(--hue); flex:none; display:grid; place-items:center; }
  .bhead .ic svg { display:block; }
  .bhead b { font-size:22px; color:var(--hue); }
  .bhead em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700; font-size:17px; }
  .bhead i { font-style:normal; display:block; font-size:12.5px; color:var(--faint); margin-top:2px; }
  .nodes { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0; }
  .nodes li { display:flex; gap:11px; align-items:flex-start; padding:8px 0;
              border-left:1px solid var(--line); margin-left:13px; padding-left:16px;
              position:relative; }
  .nodes li:first-child { border-top-left-radius:6px; }
  .nodes li::before { content:''; position:absolute; left:-4px; top:14px; width:7px; height:7px;
                      border-radius:50%; background:var(--hue); }
  .nodes .cost { flex:none; font-family:Rajdhani,sans-serif; font-weight:700; font-size:13px;
                 color:var(--hue); width:14px; text-align:right; opacity:.85; }
  .nodes b { font-size:16px; }
  .nodes em { font-style:normal; font-size:13px; color:var(--faint); }
  .nodes i { font-style:normal; display:block; font-size:12.5px; color:var(--text); opacity:.8; }
  .gains { font-size:13px; color:var(--hue); font-family:Rajdhani,sans-serif; font-weight:600;
           border-top:1px solid var(--line); padding-top:10px; }

  table { width:100%; border-collapse:collapse; font-size:15px; }
  th { text-align:right; font-size:11px; letter-spacing:.14em; text-transform:uppercase;
       color:var(--faint); font-weight:600; padding:0 6px 8px; border-bottom:1px solid var(--line); }
  th:first-child { text-align:left; }
  td { padding:9px 6px; border-bottom:1px solid var(--line); }
  td.n { text-align:right; font-family:Rajdhani,sans-serif; font-weight:600; }

  .note { border-left:2px solid var(--magenta); padding:6px 0 6px 16px; color:var(--faint); }
  .axisgrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(104px,1fr)); gap:9px; }
  .ax { background:var(--panel); border:1px solid var(--line); border-radius:10px;
        padding:10px 12px; }
  .ax b { font-size:20px; color:var(--cyan); display:block; }
  .ax i { font-style:normal; font-size:12px; color:var(--faint); }
  .note b { color:var(--text); font-weight:600; }
  .big { font-family:Rajdhani,sans-serif; font-weight:700; font-size:21px; color:var(--gold); }
</style>

<div class="sheet">
  <header>
    <h1>器道</h1>
    <p class="sub">As 54 peças, e a árvore de técnicas.</p>
  </header>

  <div class="part">
    <p class="tag">A pergunta</p>
    <h2>Deve o equipamento ser trancado por classe?</h2>
    <p class="says"><b style="color:var(--text)">Não — e a árvore é a razão.</b></p>
    <p class="says">Num jogo em que o equipamento cai ao calhas, trancar por classe
      transforma cinco quedas em seis em lixo. O jogador é castigado pelos dados do
      próprio jogo, e a melhor peça que já viu fica a apodrecer no baú.</p>
    <p class="says">Em vez disso, cada caminho dá <b style="color:var(--text)">afinidade</b>:
      o 鋒 Edge faz as armas contarem 40% mais, o 明心 Clear Mind faz o mesmo às coroas.
      Tudo continua vestível por toda a gente — o que o caminho muda é <em>quais as peças
      que te fazem sorrir quando caem</em>.</p>
    <div class="scrollx">
      <table>
        <thead><tr><th>Espaço</th>${PATHS.map((p) => `<th style="color:${PATH_INFO[p].colour}">${PATH_INFO[p].han} ${PATH_INFO[p].name}</th>`).join('')}</tr></thead>
        <tbody>${affinityRows}</tbody>
      </table>
    </div>
    <p class="note"><b>Se mais tarde quiseres travar mesmo alguma coisa</b>, o sítio certo
      não é o equipamento — é uma peça lendária por caminho, que só o caminho pode usar.
      Uma peça trancada é um objectivo; cinquenta e quatro peças trancadas são um imposto.</p>
  </div>

  <div class="part">
    <p class="tag">道 A árvore</p>
    <h2>Três caminhos, oito nós cada</h2>
    <p class="says">Uma corrida inteira ganha <span class="big">${FULL_RUN} 道</span> —
      e comprar a árvore toda custa <span class="big">${TOTAL_COST}</span>. Nunca chega,
      e é essa a ideia: uma árvore que se acaba é uma lista de tarefas, não uma escolha.</p>
    <p class="says">Um caminho inteiro custa 20. Dá para terminar um e levar 22 para outro —
      ou espalhar por três e não terminar nenhum.</p>
    <p class="says" style="font-size:15px">Os pontos vêm da própria subida: um por cada
      três camadas abertas, dois por cada guardiã que cai.</p>
    <div class="tree">${tree}</div>
  </div>

  <div class="part">
    <p class="tag">Os sete eixos</p>
    <h2>Em que é que uma peça pode rolar</h2>
    <p class="says">São os mesmos eixos que a árvore mexe — é isso que faz uma build ser
      uma build: um nó de 運 e uma linha de 運 num anel puxam a mesma alavanca.</p>
    <div class="axisgrid">
      ${AFFIXES.map((a) => `<div class="ax">
        <b class="cjk">${AFFIX_INFO[a].han}</b>
        <i>${AFFIX_INFO[a].label}</i>
      </div>`).join('')}
    </div>
    <p class="says">Quantas linhas leva cada nível:
      ${Object.entries(SECONDARIES).map(([r, n]) =>
        `<span class="cjk" style="color:${RARITY_INFO[r as Rarity].colour}">${RARITY_INFO[r as Rarity].han}</span> ${n + 1}`).join(' · ')}.
      A primeira é a da peça; as outras são sorteadas, e nunca há o mesmo eixo duas vezes.</p>
  </div>

  <div class="part">
    <p class="tag">器 O catálogo</p>
    <h2>As 54 peças</h2>
    <p class="says">Nove por espaço, uma por reino. Nenhuma partilha desenho com outra —
      há um teste a garanti-lo. A moldura mostra a raridade típica do reino de cada peça,
      para se verem os cinco níveis, e o número dourado é a linha principal dessa peça
      nesse nível.</p>
    <p class="says">Repara nos símbolos ao lado do nome de cada espaço: são os eixos que
      esse espaço oferece ao longo dos nove reinos. Nenhum espaço serve um caminho só.</p>
    ${catalogue}
  </div>
</div>`;

writeFileSync('catalogue.html', page);
console.log(`catalogue.html — ${(page.length / 1024).toFixed(0)} KB`);
