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
  AFFIXES, AFFIX_INFO, ARCHETYPES, GEAR, RARITY_INFO, REALM_SETS, SECONDARIES,
  SET_STEPS, SLOTS, SLOT_INFO, archetypesOf, baseValue, ladderOf, type Affix, type Rarity,
} from '../src/data/gear.ts';
import {
  LINKS, PATHS, PATH_INFO, ROOT, TOTAL_COST, nodesOf, type Node, type Path,
} from '../src/data/techniques.ts';
import { affinity, daoEarned, extraChestSlots, powerMultiplier, rateMultiplier } from '../src/sim/dao.ts';
import { realm as realmOf } from '../src/data/realms.ts';

const FULL_RUN = daoEarned(73, 9);

/** Rarity by realm, so the grid shows all five frames and reads as the drop table does. */
const rarityForRealm = (realm: number): Rarity =>
  realm <= 2 ? 'common' : realm <= 4 ? 'spirit' : realm <= 6 ? 'mystic' : realm <= 8 ? 'earth' : 'heaven';

const catalogue = SLOTS.map((slot) => {
  const info = SLOT_INFO[slot];
  const shapes = archetypesOf(slot);
  return `<section class="slot">
    <div class="slothead">
      <span class="ic">${icon(info.empty, 28)}</span>
      <h3><span class="cjk">${info.han}</span> ${info.name}</h3>
      <span class="axes">${[...new Set(shapes.map((x) => x.affix))]
        .map((a) => `<span class="cjk">${AFFIX_INFO[a].han}</span>`).join('')}</span>
      <span class="count">${shapes.length} × 9</span>
    </div>
    <div class="scrollx"><div class="ladders">
      <div class="lhead"><span></span>${REALM_SETS.map((rs) =>
        `<span style="color:${realmOf(rs.realm).colour}" title="${rs.name}">` +
        `<b class="cjk">${rs.han}</b>${rs.realm}</span>`).join('')}</div>
      ${shapes.map((arch) => {
        const affix = AFFIX_INFO[arch.affix];
        return `<div class="ladder">
          <div class="shape">
            <span class="ic">${icon(arch.icon, 22)}</span>
            <span>
              <b class="cjk">${arch.han}</b> <em>${arch.name}</em>
              <i><span class="cjk">${affix.han}</span> ${affix.label}</i>
            </span>
          </div>
          ${ladderOf(arch.key).map((g) => {
            const rarity = rarityForRealm(g.realm);
            const value = baseValue(g, rarity, g.affix);
            return `<figure class="piece" title="${g.han} ${g.name}">
              ${gearTile({ id: g.key, template: g.key, rarity, rolls: [] }, { size: 52, spin: 0.1 })}
              <figcaption>
                <b class="cjk" style="color:${RARITY_INFO[rarity].colour}">${g.han}</b>
                <span class="axis">+${value}${affix.unit === '%' ? '%' : ''}</span>
              </figcaption>
            </figure>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div></div>
  </section>`;
}).join('');


/* 系 The nine lineages: what a realm's gear is called, and what wearing it together pays. */
const lineages = REALM_SETS.map((rs) => {
  const hue = realmOf(rs.realm).colour;
  const steps = SET_STEPS.map((n) => {
    const step = rs.steps.find((x) => x.pieces === n)!;
    const gains = Object.entries(step.effects).map(([a, v]) =>
      `<span class="cjk">${AFFIX_INFO[a as Affix].han}</span> +${v}${
        AFFIX_INFO[a as Affix].unit === '%' ? '%' : ''}`).join(' · ');
    return `<li><b>${n}</b> <span>${gains}</span></li>`;
  }).join('');

  return `<div class="lin" style="--hue:${hue}">
    <div class="linhead">
      <b class="cjk">${rs.han}</b>
      <span>
        <em>${rs.name}</em>
        <i>reino ${rs.realm} · ${rs.axes.map((a) =>
          `<span class="cjk">${AFFIX_INFO[a].han}</span> ${AFFIX_INFO[a].label}`).join(' · ')}</i>
      </span>
    </div>
    <p class="lore">${rs.lore}</p>
    <ol class="steps">${steps}</ol>
  </div>`;
}).join('');

/* 道 The tree, drawn on one canvas, in the layout the game's own 道 screen uses. */
const R = 15;
const GAP = 62;
const FORK = 19;
const COLS: Record<Path, number> = { sword: 84, spirit: 250, fortune: 416 };
const CW = 500;
const TOP = 26;

interface Placed { node: Node; x: number; y: number }

const PLACED: Placed[] = (() => {
  const out: Placed[] = [{ node: ROOT, x: COLS.spirit, y: TOP }];
  for (const path of PATHS) {
    const byTier = new Map<number, Node[]>();
    for (const node of nodesOf(path)) {
      if (!byTier.has(node.tier)) byTier.set(node.tier, []);
      byTier.get(node.tier)!.push(node);
    }
    for (const [tier, row] of byTier) {
      const y = TOP + 52 + tier * GAP;
      if (row.length === 1) out.push({ node: row[0], x: COLS[path], y });
      else row.forEach((node, i) => out.push({ node, x: COLS[path] + (i === 0 ? -FORK : FORK), y }));
    }
  }
  return out;
})();

const CH = Math.max(...PLACED.map((p) => p.y)) + R + 16;
const AT = new Map(PLACED.map((p) => [p.node.key, p]));
const hueOf = (node: Node) => (node.key === ROOT.key ? '#E7EAFF' : PATH_INFO[node.path].colour);

const edges = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [from, tos] of Object.entries(LINKS)) {
    for (const to of tos) {
      const id = [from, to].sort().join('|');
      if (seen.has(id)) continue;
      seen.add(id);
      const a = AT.get(from);
      const b = AT.get(to);
      if (!a || !b) continue;
      const bridge = a.node.path !== b.node.path && a.node.key !== ROOT.key && b.node.key !== ROOT.key;
      const stone = a.node.keystone || b.node.keystone;
      out.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${
        bridge ? 'var(--gold)' : 'var(--line)'}" stroke-width="${bridge ? 1.6 : 2}"${
        bridge ? ' stroke-dasharray="3 4"' : stone ? ' stroke-dasharray="5 4"' : ''} />`);
    }
  }
  return out.join('');
})();

/** A fork puts two nodes on one line, so their names are staggered rather than stacked. */
const FORKED = new Set(PLACED.filter(({ node }) =>
  PLACED.some((o) => o.node !== node && o.y === PLACED.find((q) => q.node === node)!.y
    && o.node.path === node.path)).map((p) => p.node.key));

const dots = PLACED.map(({ node, x, y }) => {
  const hue = hueOf(node);
  const r = node.key === ROOT.key ? R + 3 : node.keystone ? R + 1 : R;
  const two = node.han.length > 1;
  const drop = FORKED.has(node.key) && node.keystone ? r + 25 : r + 12;
  return `<g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="var(--panel2)" stroke="${hue}"
      stroke-width="${node.keystone || node.key === ROOT.key ? 2.2 : 1.4}"
      ${node.keystone ? 'stroke-dasharray="4 3"' : ''} />
    <text x="${x}" y="${y + (two ? 5 : 6)}" text-anchor="middle" font-size="${two ? 12 : 17}"
      fill="${hue}" font-family="'Noto Serif SC',serif">${node.han}</text>
    <text x="${x}" y="${y + drop}" text-anchor="middle" font-size="9.5" fill="var(--faint)"
      font-family="Archivo,sans-serif">${node.name}</text>
  </g>`;
}).join('');

const canvas = `<div class="scrollx"><svg class="canvas" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">
  ${edges}${dots}
</svg></div>`;

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
      ${nodes.map((x) => `<li${x.keystone ? ' class="stone"' : ''}>
        <span class="cost">${x.cost}</span>
        <span class="body">
          <b class="cjk">${x.han}</b> <em>${x.name}</em>
          <i>${x.text}</i>
        </span>
      </li>`).join('')}
    </ol>
    <p class="gains">Um ramo até ao fim: ${gains} · 20 道 (+1 pela raiz 起)</p>
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
  .scrollx { overflow-x:auto; }
  .slot { display:flex; flex-direction:column; gap:12px; margin-top:32px; }
  .slothead { display:flex; align-items:center; gap:11px; }
  .slothead .ic { color:var(--cyan); display:grid; place-items:center; }
  .slothead .ic svg { display:block; }
  .slothead .count { margin-left:auto; font-family:Rajdhani,sans-serif; font-weight:700;
                     color:var(--faint); }
  .slothead .axes { margin-left:10px; font-size:15px; color:var(--faint); letter-spacing:.14em; }

  /* as nove linhagens */
  .lins { display:grid; gap:12px; }
  @media(min-width:640px){ .lins { grid-template-columns:repeat(3,1fr); } }
  .lin { background:var(--panel2); border:1px solid var(--line); border-left:3px solid var(--hue);
         border-radius:12px; padding:13px 15px; }
  .linhead { display:flex; gap:10px; align-items:flex-start; }
  .linhead b { font-size:26px; color:var(--hue); line-height:1.1; white-space:nowrap; }
  .linhead em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
                font-size:18px; display:block; }
  .linhead i { font-style:normal; font-size:11.5px; color:var(--faint); letter-spacing:.04em; }
  .lore { font-size:13px; color:var(--text); opacity:.78; margin:8px 0 10px; line-height:1.45; }
  .lin .steps { list-style:none; margin:0; padding:0; display:flex; flex-direction:column;
                gap:4px; border-top:1px solid var(--line); padding-top:9px; }
  .lin .steps li { display:flex; gap:9px; align-items:baseline; font-size:12.5px; }
  .lin .steps b { font-family:Rajdhani,sans-serif; color:var(--hue); width:12px; }
  .lin .steps span { color:var(--gold); font-family:Rajdhani,sans-serif; font-weight:600; }
  .lin .steps .cjk { font-family:'Noto Serif SC',serif; font-weight:400; color:var(--faint);
                     margin-right:1px; }

  /* uma escada por forma: a mesma peça, do reino 1 ao 9 */
  .ladders { display:flex; flex-direction:column; gap:4px; min-width:660px; }
  .lhead, .ladder { display:grid; grid-template-columns:154px repeat(9,1fr); gap:6px;
                    align-items:center; }
  .lhead span { text-align:center; font-family:Rajdhani,sans-serif; font-weight:700;
                font-size:11px; letter-spacing:.08em; }
  .lhead b { font-family:'Noto Serif SC',serif; font-weight:400; margin-right:3px; }
  .ladder { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
            padding:7px 9px; }
  .shape { display:flex; gap:8px; align-items:flex-start; }
  .shape .ic { color:var(--cyan); flex:none; display:grid; place-items:center; margin-top:2px; }
  .shape .ic svg { display:block; }
  .shape b { font-size:16px; }
  .shape em { font-style:normal; font-size:12.5px; color:var(--text); }
  .shape i { font-style:normal; display:block; font-size:10.5px; color:var(--faint); }
  .shape i .cjk { margin-right:3px; }
  .piece { margin:0; display:flex; flex-direction:column; align-items:center; gap:3px; }
  .piece svg { display:block; }
  .piece figcaption { text-align:center; line-height:1.25; }
  .piece b { display:block; font-size:13px; }
  .piece .axis { display:block; font-size:10.5px; color:var(--gold);
                 font-family:Rajdhani,sans-serif; font-weight:700; }

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
  .nodes li.stone::before { background:var(--ground); border:2px solid var(--hue); left:-6px;
                            width:9px; height:9px; }
  .nodes li.stone b { color:var(--hue); }
  .canvas { display:block; margin:6px auto; max-width:100%; height:auto; }

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
    <p class="sub">As ${GEAR.length} peças, e a árvore de técnicas.</p>
  </header>

  <div class="part">
    <p class="tag">A pergunta</p>
    <h2>Deve o equipamento ser trancado por classe?</h2>
    <p class="says"><b style="color:var(--text)">Não, e a árvore é a razão.</b></p>
    <p class="says">Num jogo em que o equipamento cai ao calhas, trancar por classe
      transforma cinco quedas em seis em lixo. O jogador é castigado pelos dados do
      próprio jogo, e a melhor peça que já viu fica a apodrecer no baú.</p>
    <p class="says">Em vez disso, cada caminho dá <b style="color:var(--text)">afinidade</b>:
      o 鋒 Edge faz as armas contarem 40% mais, o 明心 Clear Mind faz o mesmo às coroas.
      Tudo continua vestível por toda a gente. O que o caminho muda é <em>quais as peças
      que te fazem sorrir quando caem</em>.</p>
    <div class="scrollx">
      <table>
        <thead><tr><th>Espaço</th>${PATHS.map((p) => `<th style="color:${PATH_INFO[p].colour}">${PATH_INFO[p].han} ${PATH_INFO[p].name}</th>`).join('')}</tr></thead>
        <tbody>${affinityRows}</tbody>
      </table>
    </div>
    <p class="note"><b>Se mais tarde quiseres travar mesmo alguma coisa</b>, o sítio certo
      não é o equipamento. É uma peça lendária por caminho, que só o caminho pode usar.
      Uma peça trancada é um objectivo; cinquenta e quatro peças trancadas são um imposto.</p>
  </div>

  <div class="part">
    <p class="tag">系 As linhagens</p>
    <h2>Nove famílias, uma por reino</h2>
    <p class="says">"Iron Sword" e "Heaven Scythe" diziam um material e um nível. É uma
      coluna de folha de cálculo, não um sítio num mundo. Cada reino tem agora a sua
      <b style="color:var(--text)">linhagem</b>: o 落星 é o metal de uma estrela que caiu,
      o 龍骸 é talhado do que um dragão deixou, o 仙蛻 é a pele de que um imortal saiu.</p>
    <p class="says">E uma linhagem não é só um nome. Vestir várias peças da mesma família
      paga, por isso um baú de quedas soltas passa a ser uma pergunta:
      <em>seis peças do quinto reino a condizer, ou seis do sétimo desirmanadas?</em></p>
    <div class="lins">${lineages}</div>
    <p class="note">O set é o <b>reino</b>, não a forma. Qualquer peça de 落星 conta para
      o 落星, seja leque ou lamelar. É isso que torna um set alcançável: seis quedas de
      um reino, e não seis quedas da mesma espada.</p>
  </div>

  <div class="part">
    <p class="tag">道 A árvore</p>
    <h2>Uma árvore só</h2>
    <p class="says">Não são três árvores lado a lado. É uma. Todos os ramos nascem da
      mesma raiz <b class="cjk" style="color:var(--text)">起</b>, e há
      <b style="color:var(--gold)">pontes</b> (a tracejado dourado) que atravessam entre
      ramos vizinhos em duas alturas. Dá para subir o 劍 até ao meio, atravessar para o
      神, e descer pelo 運.</p>
    <p class="says">O 神 fica no meio, por isso toca nos outros dois; o 劍 e o 運 nunca se
      tocam directamente. Ir de um ao outro custa uma passagem pelo meio, e é isso que
      torna o centro um sítio que vale a pena ocupar.</p>
    ${canvas}
    <p class="says">Uma corrida inteira ganha <span class="big">${FULL_RUN} 道</span>,
      e comprar a árvore toda custa <span class="big">${TOTAL_COST}</span>. Nunca chega,
      e é essa a ideia: uma árvore que se acaba é uma lista de tarefas, não uma escolha.</p>
    <p class="says">Um ramo inteiro custa 21 (a raiz incluída). Dá para terminar um e levar
      21 para outro, ou espalhar por três e não terminar nenhum.</p>
    <p class="says" style="font-size:15px">Os pontos vêm da própria subida: um por cada
      três camadas abertas, dois por cada guardiã que cai. Os nós a tracejado são
      <b style="color:var(--text)">chaves</b>: mais fortes do que o nó ao lado, e cada uma
      abdica de alguma coisa. Só se pode levar um dos dois.</p>
    <div class="tree">${tree}</div>
  </div>

  <div class="part">
    <p class="tag">Os sete eixos</p>
    <h2>Em que é que uma peça pode rolar</h2>
    <p class="says">São os mesmos eixos que a árvore mexe. É isso que faz uma build ser
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
    <h2>As ${GEAR.length} peças</h2>
    <p class="says">${ARCHETYPES.length} formas, nove por cada espaço, e cada forma
      existe <em>nos nove reinos</em>. É a liberdade que pediste: quem quer andar de leque
      não é obrigado a trocar para espada no reino 4 porque o leque acabou. A forma é a
      escolha; o reino é só a altura a que se encontra.</p>
    <p class="says">Cada linha é uma escada: a mesma forma, do reino 1 ao 9. Cada peça
      traz dois sinais: em baixo à esquerda o glifo da <b style="color:var(--text)">linhagem</b>
      (凡 枯 古 霜 碧 落 雷 龍 仙, na cor do reino), em baixo à direita o da
      <b style="color:var(--text)">raridade</b>. São duas perguntas diferentes, de onde
      vem e quão boa é, por isso têm dois cantos e nunca partilham a cor.</p>
    <p class="says">Repara nos símbolos ao lado do nome de cada espaço: são os eixos que
      esse espaço oferece. Nenhum espaço serve um caminho só, e nenhuma forma partilha
      desenho com outra. Há um teste a garanti-lo.</p>
    ${catalogue}
  </div>
</div>`;

writeFileSync('catalogue.html', page);
console.log(`catalogue.html · ${(page.length / 1024).toFixed(0)} KB`);
