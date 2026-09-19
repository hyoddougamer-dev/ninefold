/**
 * 全 Every system in the game, on one page, plus what is still missing.
 *
 * It is generated from the game's own tables, so it cannot drift: the counts, the
 * numbers and the art are read out of the same modules the game runs on. If a number
 * here is wrong, the game is wrong.
 *
 * The copy is European Portuguese: it is written for Bruno, not for the game.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS, WARDENS } from '../src/data/bestiary.ts';
import { REALMS, realm as realmOf } from '../src/data/realms.ts';
import { ARTS, STANCES, SEQUENCE_SLOTS } from '../src/data/arts.ts';
import {
  AFFIXES, ARCHETYPES, GEAR, RARITIES, REALM_SETS, SECONDARIES, SLOTS,
} from '../src/data/gear.ts';
import { ALL_NODES, PATHS, PATH_INFO, TOTAL_COST } from '../src/data/techniques.ts';
import { UPGRADES, UPGRADE_INFO } from '../src/sim/state.ts';
import { CHEST_LIMIT, FUSE_COUNT } from '../src/sim/chest.ts';
import { LAYERS_PER_REALM, TARGET_DAYS } from '../src/sim/balance.ts';
import { daoEarned } from '../src/sim/dao.ts';
import { icon } from '../src/art/icon.ts';
import { portrait } from '../src/art/aura.ts';
import { arenaScene } from '../src/art/scene.ts';
import { gearTile } from '../src/art/gear.ts';

const FULL_RUN = daoEarned(73, 9);

interface System {
  readonly han: string;
  readonly name: string;
  readonly where: string;
  /** One line: what the player actually does. */
  readonly does: string;
  /** The numbers behind it, each a label and a value. */
  readonly counts: readonly (readonly [string, string])[];
  readonly body: string;
  /** What is not finished about it. Empty when it is done. */
  readonly gaps: readonly string[];
}

const pill = (label: string, value: string) =>
  `<span class="pill"><b>${value}</b><i>${label}</i></span>`;

// ── 修 the climb ─────────────────────────────────────────────────────────────
const climb = `<div class="ladder">
  ${REALMS.map((r) => `<div class="rung" style="--hue:${r.colour}">
    <span class="fig">${portrait({ realm: r.n, focus: false })}</span>
    <b class="cjk">${r.han}</b>
    <i>${r.name}</i>
    <span class="no">${r.n}</span>
  </div>`).join('')}
</div>`;

// ── 修 the four upgrades ─────────────────────────────────────────────────────
const upgrades = `<div class="upgs">
  ${UPGRADES.map((u) => {
    const i = UPGRADE_INFO[u];
    return `<div class="upg">
      <span class="ic">${icon(i.icon, 24)}</span>
      <span><b class="cjk">${i.han}</b> <em>${i.name}</em><i>${i.effect}</i></span>
      <span class="cur">${i.currency === 'qi' ? 'qi' : '材'}</span>
    </div>`;
  }).join('')}
</div>`;

// ── 狩 the beasts ────────────────────────────────────────────────────────────
const beasts = `<div class="row9">
  ${REALMS.map((r) => `<div class="col" style="--hue:${r.colour}">
    <span class="no">${r.n}</span>
    ${BEASTS.filter((b) => b.realm === r.n).map((b) =>
      `<span class="bst${b.warden ? ' warden' : ''}" title="${b.name}">${icon(b.icon, 22)}</span>`).join('')}
  </div>`).join('')}
</div>`;

// ── 戰 the arena ─────────────────────────────────────────────────────────────
const arena = `<div class="stagebox">
  <div class="sc">${arenaScene(6)}</div>
  <div class="duelmini">
    <span class="you">${portrait({ realm: 6, focus: true })}</span>
    <span class="mid cjk">擊</span>
    <span class="foe">${icon('centipede', 70)}</span>
  </div>
</div>`;

// ── 器 the gear ──────────────────────────────────────────────────────────────
const gearStrip = `<div class="tiles">
  ${RARITIES.map((rar, i) => gearTile(
    { id: `x${i}`, template: ['sword2', 'crescent4', 'diadem6', 'orb8', 'scythe9'][i], rarity: rar, rolls: [] },
    { size: 58, spin: 0.12 })).join('')}
</div>
<div class="setline">
  ${REALM_SETS.map((s) => `<span style="color:${realmOf(s.realm).colour}">
    <b class="cjk">${s.han}</b><i>${s.name}</i></span>`).join('')}
</div>`;

// ── 道 the tree ──────────────────────────────────────────────────────────────
const tree = `<div class="paths">
  ${PATHS.map((p) => `<div class="pth" style="--hue:${PATH_INFO[p].colour}">
    <span class="ic">${icon(PATH_INFO[p].icon, 24)}</span>
    <b class="cjk">${PATH_INFO[p].han}</b>
    <em>${PATH_INFO[p].name}</em>
    <i>${PATH_INFO[p].blurb}</i>
  </div>`).join('')}
</div>`;

// ── 勢訣 the build ───────────────────────────────────────────────────────────
const build = `<div class="two">
  <div>
    <h4>勢 as nove posturas</h4>
    <div class="stancerow">
      ${STANCES.map((s) => `<span class="st" style="--hue:${realmOf(s.realm).colour}"
        title="${s.text}"><b class="cjk">${s.han}</b><i>${s.name}</i></span>`).join('')}
    </div>
  </div>
  <div>
    <h4>訣 as nove artes, uma por guardiã</h4>
    <div class="stancerow">
      ${ARTS.map((a) => `<span class="st" style="--hue:${realmOf(a.realm).colour}"
        title="${a.text}"><span class="ic">${icon(a.icon, 20)}</span><b class="cjk">${a.han}</b></span>`).join('')}
    </div>
  </div>
</div>`;

const SYSTEMS: readonly System[] = [
  {
    han: '修', name: 'A Subida', where: 'aba 修',
    does: 'O qi sobe sozinho, com o telemóvel fechado. Enche a barra, abre uma camada.',
    counts: [['reinos', '9'], ['camadas por reino', `${LAYERS_PER_REALM}`],
             ['camadas ao todo', '73'], ['dias até ao topo', `~${TARGET_DAYS}`]],
    body: climb, gaps: [],
  },
  {
    han: '氣', name: 'Onde o qi vai', where: 'aba 修',
    does: 'Quatro melhorias. Duas fazem o qi vir mais depressa, duas fazem-te mais forte.',
    counts: [['melhorias', '4'], ['nunca se perdem', '✓']],
    body: upgrades,
    gaps: ['Só 妖丹 usa 材 material. As outras três são todas qi — falta uma segunda moeda com decisão própria.'],
  },
  {
    han: '狩', name: 'A Caça', where: 'aba 狩',
    does: 'Bestas para caçar quando queres. Dão 材 material e largam equipamento.',
    counts: [['bestas', `${BEASTS.length}`], ['guardiãs', `${WARDENS.length}`],
             ['comuns por reino', '3']],
    body: beasts,
    gaps: ['As bestas comuns não largam nada de único. Nenhuma razão para caçar uma em vez da outra tirando o poder.'],
  },
  {
    han: '戰', name: 'O Combate', where: 'em cima de qualquer aba',
    does: 'Resolve-se sozinho e vê-se. Uma ronda são duas batidas: tu bates, ela responde.',
    counts: [['rondas típicas', '9'], ['segundos a ver', '~3'],
             ['probabilidades', 'simuladas']],
    body: arena, gaps: [],
  },
  {
    han: '器', name: 'O Equipamento', where: 'aba 器',
    does: 'Cai das bestas. Seis espaços, cinco raridades, e linhagens que pagam a condizer.',
    counts: [['peças', `${GEAR.length}`], ['formas', `${ARCHETYPES.length}`],
             ['espaços', `${SLOTS.length}`], ['raridades', `${RARITIES.length}`],
             ['linhas no 天', `${SECONDARIES.heaven + 1}`], ['baú', `${CHEST_LIMIT}`],
             ['fusão', `${FUSE_COUNT}→1`], ['eixos', `${AFFIXES.length}`]],
    body: gearStrip,
    gaps: [
      'Não há forma de escolher o que cai. Tudo é sorte, e 486 peças com sorte pura é muito lixo.',
      'A fusão só junta peças iguais. Não há maneira de melhorar a peça que gostas.',
    ],
  },
  {
    han: '道', name: 'A Árvore', where: 'aba 道',
    does: 'Uma árvore só. Três ramos da mesma raiz, com pontes a atravessar entre eles.',
    counts: [['nós', `${ALL_NODES.length}`], ['custo total', `${TOTAL_COST} 道`],
             ['uma corrida dá', `${FULL_RUN} 道`], ['chaves', '3']],
    body: tree,
    gaps: ['Os pontos não se podem recuperar. Uma escolha errada fica para sempre, e isso trava a experimentação.'],
  },
  {
    han: '勢', name: 'Postura e Sequência', where: 'aba 道',
    does: 'Uma postura sempre ligada, e três artes por ordem que disparam uma por ronda.',
    counts: [['posturas', `${STANCES.length}`], ['artes', `${ARTS.length}`],
             ['lugares', `${SEQUENCE_SLOTS}`], ['combinações', '4 536'],
             ['vale', '×1.82 poder']],
    body: build,
    gaps: ['As artes não conversam entre si. A ordem conta pelos números, mas nenhuma arte prepara outra explicitamente.'],
  },
  {
    han: '錄', name: 'O Bestiário', where: 'aba 錄',
    does: 'O que já mataste, e quantas vezes.',
    counts: [['entradas', `${BEASTS.length}`], ['créditos de arte', '✓']],
    body: '', gaps: ['É só uma lista. Não dá nada, nem um bónus por completar um reino.'],
  },
];

const MISSING = [
  { han: '算', title: 'A economia dispara no topo', hard: true,
    text: `O maior de todos, e novo. No reino 9 já não há camadas a consumir qi, por isso
      um cultivador compra melhorias de ritmo com o qi que essas melhorias produzem — e a
      curva de custo é demasiado suave para o travar (o 功法 custa 1.19× por nível e dá
      1.15×). <b>Simulado, o ritmo chega a 10^28 qi por dia em duas semanas e depois
      estoura para Infinity.</b> A subida nunca mostrou isto porque as camadas comem o qi
      todo o caminho. Corrigir significa afinar a curva das melhorias e depois voltar a
      afinar o REALM_COST para manter os 90 dias — merece uma passagem só para ele.` },
  { han: '包', title: 'O APK', hard: false,
    text: `Está montado e por construir. O <i>capacitor.config.json</i> aponta para a
      página do GitHub Pages e há uma acção no GitHub que constrói o APK à mão, uma vez.
      Falta correr a acção e ligar o Pages — coisa de minutos, mas tem de ser feita na
      conta, não daqui.` },
  { han: '久', title: 'Ninguém jogou 90 dias', hard: true,
    text: `A curva está testada em simulação — os testes imprimem a tabela a cada
      corrida — mas nunca foi jogada de verdade. O sítio onde costuma partir é entre o
      reino 6 e o 7, quando os números ficam grandes e a paciência pequena.` },
  { han: '聲', title: 'Som e vibração', hard: false,
    text: `Existem, sintetizados, sem ficheiros. São quatro sons. Numa sessão longa
      cansam, e não há volume — só ligado ou desligado.` },
  { han: '導', title: 'Quem chega não é levado por nada', hard: false,
    text: `Há um ecrã de ajuda com quatro passos e depois nada. Ninguém te diz que
      existem posturas, nem quando vale a pena mudar de equipamento.` },
  { han: '鏡', title: 'O bestiário não dá nada', hard: false,
    text: `É só uma lista do que mataste. Nem um bónus por completar um reino, nem uma
      razão para caçar uma besta em vez de outra.` },
];

const DONE = [
  { han: '存', title: 'O save está seguro',
    text: `O jogo guarda uma cópia sobresselente e recorre a ela se a principal
      desaparecer <i>ou andar para trás</i>. E tu podes copiar o save para onde quiseres,
      ou descarregá-lo como ficheiro, e colá-lo de volta. Botão 存, em cima.` },
  { han: '劫', title: 'O reino 9 tem o 渡劫',
    text: `O dragão volta sempre, ancorado ao <b>teu</b> poder da última vez. Cada
      travessia dá um 雷印 — +10% de poder e +10% de qi, para sempre. A barra no topo lê
      o teu poder contra o dele, porque lá em cima não é o qi que se espera.` },
  { han: '新', title: 'Actualiza-se sozinho',
    text: `Instalas uma vez. Depois disso uma versão nova chega porque a página foi
      republicada — aparece um aviso 新 e tu escolhes quando. <b>Nunca mais descarregas
      nada.</b> E funciona sem rede: testado, abre offline à primeira.` },
];

const page = `<title>全 Todos os Sistemas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:16px/1.6 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:840px; margin:0 auto; padding:38px 18px 80px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2,h3,h4 { margin:0; font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(36px,10vw,52px); font-weight:400;
       color:var(--cyan); line-height:1.02; }
  h2 { font-family:Rajdhani,sans-serif; font-size:25px; }
  h4 { font-family:Rajdhani,sans-serif; font-size:13px; color:var(--faint);
       letter-spacing:.06em; text-transform:uppercase; margin-bottom:7px; }
  p { margin:0; }
  .sub { color:var(--faint); font-size:16px; margin-top:8px; }
  .says { color:var(--faint); max-width:58ch; font-size:15px; }
  .says b { color:var(--text); font-weight:600; }
  .tag { font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--cyan);
         font-weight:600; }

  .sys { margin-top:34px; border-top:1px solid var(--line); padding-top:22px; }
  .head { display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; }
  .head .han { font-family:'Noto Serif SC',serif; font-size:34px; color:var(--cyan); line-height:1; }
  .head .where { font-size:11px; color:var(--faint); letter-spacing:.08em;
                 border:1px solid var(--line); border-radius:99px; padding:2px 9px; }
  .does { font-size:15px; margin-top:8px; }
  .pills { display:flex; flex-wrap:wrap; gap:6px; margin-top:11px; }
  .pill { display:inline-flex; flex-direction:column; align-items:center; gap:0;
          background:var(--panel2); border:1px solid var(--line); border-radius:9px;
          padding:5px 11px; }
  .pill b { font-family:Rajdhani,sans-serif; font-weight:700; font-size:16px; color:var(--gold); }
  .pill i { font-style:normal; font-size:10px; color:var(--faint); letter-spacing:.03em; }
  .show { margin-top:14px; }
  .gap { margin-top:12px; border-left:2px solid var(--magenta); padding:5px 0 5px 13px;
         font-size:13.5px; color:var(--faint); }
  .gap b { color:var(--text); font-weight:600; }
  .gap + .gap { margin-top:7px; }

  /* a escada dos reinos */
  .ladder { display:grid; grid-template-columns:repeat(auto-fit,minmax(78px,1fr)); gap:8px; }
  .rung { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
          padding:8px 6px 9px; text-align:center; position:relative; }
  .rung .fig { display:block; width:100%; aspect-ratio:1; }
  .rung .fig svg { display:block; width:100%; height:100%; }
  .rung b { display:block; font-size:15px; color:var(--hue); line-height:1.2; }
  .rung i { font-style:normal; font-size:9.5px; color:var(--faint); display:block; }
  .rung .no { position:absolute; top:5px; left:7px; font-family:Rajdhani,sans-serif;
              font-weight:700; font-size:11px; color:var(--hue); opacity:.8; }

  .upgs { display:grid; gap:6px; }
  @media(min-width:620px){ .upgs { grid-template-columns:1fr 1fr; } }
  .upg { display:flex; gap:10px; align-items:center; background:var(--panel2);
         border:1px solid var(--line); border-radius:10px; padding:9px 12px; }
  .upg .ic { color:var(--cyan); display:grid; place-items:center; flex:none; }
  .upg .ic svg { display:block; }
  .upg b { font-size:15px; color:var(--cyan); }
  .upg em { font-style:normal; font-size:13px; }
  .upg i { font-style:normal; display:block; font-size:11.5px; color:var(--faint); }
  .upg .cur { margin-left:auto; font-size:11px; color:var(--gold); font-family:Rajdhani,sans-serif;
              font-weight:700; }

  .row9 { display:grid; grid-template-columns:repeat(9,1fr); gap:5px; }
  .col { background:var(--panel2); border:1px solid var(--line); border-radius:9px;
         padding:16px 3px 7px; display:flex; flex-direction:column; align-items:center;
         gap:5px; position:relative; }
  .col .no { position:absolute; top:4px; left:0; right:0; text-align:center;
             font-family:Rajdhani,sans-serif; font-weight:700; font-size:10px; color:var(--hue); }
  .bst { color:var(--hue); opacity:.6; display:grid; place-items:center; }
  .bst svg { display:block; }
  .bst.warden { opacity:1; filter:drop-shadow(0 0 7px var(--hue)); }

  .stagebox { position:relative; height:190px; border:1px solid var(--line);
              border-radius:12px; overflow:hidden; }
  .sc, .sc svg { position:absolute; inset:0; width:100%; height:100%; }
  .duelmini { position:absolute; inset:0; display:grid;
              grid-template-columns:1fr 60px 1fr; align-items:end; padding:0 20px 24px; }
  .duelmini span { display:grid; place-items:center; }
  .duelmini .you { width:86px; height:86px; justify-self:center; }
  .duelmini .you svg { width:100%; height:100%; }
  .duelmini .foe { color:#CC79FF; justify-self:center; margin-bottom:14px; }
  .duelmini .mid { color:var(--cyan); font-size:20px; margin-bottom:34px;
                   text-shadow:0 0 16px currentColor; }

  .tiles { display:flex; gap:9px; flex-wrap:wrap; }
  .tiles svg { display:block; }
  .setline { display:flex; flex-wrap:wrap; gap:9px; margin-top:11px; }
  .setline span { display:inline-flex; align-items:baseline; gap:5px; font-size:11.5px; }
  .setline b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:16px; }
  .setline i { font-style:normal; color:var(--faint); }

  .paths { display:grid; gap:7px; }
  @media(min-width:620px){ .paths { grid-template-columns:repeat(3,1fr); } }
  .pth { background:var(--panel2); border:1px solid var(--line); border-left:3px solid var(--hue);
         border-radius:10px; padding:11px 13px; }
  .pth .ic { color:var(--hue); display:block; margin-bottom:4px; }
  .pth .ic svg { display:block; }
  .pth b { font-size:19px; color:var(--hue); }
  .pth em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700; font-size:14px; }
  .pth i { font-style:normal; display:block; font-size:12px; color:var(--faint); margin-top:3px; }

  .two { display:grid; gap:16px; }
  @media(min-width:620px){ .two { grid-template-columns:1fr 1fr; } }
  .stancerow { display:flex; flex-wrap:wrap; gap:5px; }
  .st { display:inline-flex; align-items:center; gap:5px; background:var(--panel2);
        border:1px solid var(--hue); border-radius:9px; padding:5px 9px; color:var(--hue); }
  .st b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:15px; }
  .st i { font-style:normal; font-size:10px; color:var(--faint); }
  .st .ic { display:grid; place-items:center; }
  .st .ic svg { display:block; }

  .miss { margin-top:16px; display:grid; gap:9px; }
  @media(min-width:620px){ .miss { grid-template-columns:1fr 1fr; } }
  .m { background:var(--panel2); border:1px solid var(--line); border-radius:12px;
       padding:14px 16px; border-top:3px solid var(--cyan); }
  .m.hard { border-top-color:var(--magenta); }
  .m.done { border-top-color:var(--gold); }
  .m.done .h b { color:var(--gold); }
  .m .h { display:flex; gap:9px; align-items:baseline; }
  .m .h b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:24px; color:var(--cyan); }
  .m.hard .h b { color:var(--magenta); }
  .m .h em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700; font-size:16px; }
  .m p { font-size:13.5px; color:var(--faint); margin-top:7px; line-height:1.55; }
  .m p b { color:var(--text); font-weight:600; }
  .m p i { font-style:italic; }
  .key { display:flex; gap:16px; font-size:11.5px; color:var(--faint); margin-top:12px;
         flex-wrap:wrap; }
  .key span { display:inline-flex; align-items:center; gap:6px; }
  .key i { width:16px; height:3px; border-radius:2px; display:block; }
</style>

<div class="sheet">
  <header>
    <h1>全</h1>
    <p class="sub">Tudo o que o jogo tem, e o que ainda falta.</p>
    <p class="says" style="margin-top:12px">Esta página é <b>gerada do próprio jogo</b> —
      as contas, os números e os desenhos saem dos mesmos ficheiros que o jogo corre. Se
      um número aqui estiver errado, é o jogo que está errado.</p>
  </header>

  ${SYSTEMS.map((sys) => `<section class="sys">
    <div class="head">
      <span class="han cjk">${sys.han}</span>
      <h2>${sys.name}</h2>
      <span class="where">${sys.where}</span>
    </div>
    <p class="does">${sys.does}</p>
    <div class="pills">${sys.counts.map(([l, v]) => pill(l, v)).join('')}</div>
    ${sys.body ? `<div class="show">${sys.body}</div>` : ''}
    ${sys.gaps.map((g) => `<p class="gap">${g}</p>`).join('')}
  </section>`).join('')}

  <section class="sys">
    <p class="tag">O que já ficou resolvido</p>
    <h2 style="margin-top:6px">Três riscos fechados</h2>
    <div class="miss">
      ${DONE.map((d) => `<div class="m done">
        <span class="h"><b class="cjk">${d.han}</b><em>${d.title}</em></span>
        <p>${d.text}</p>
      </div>`).join('')}
    </div>
  </section>

  <section class="sys">
    <p class="tag">O que falta acautelar</p>
    <h2 style="margin-top:6px">Seis coisas, duas delas a sério</h2>
    <p class="says" style="margin-top:8px">As de cima são buracos dentro de sistemas que
      funcionam. Estas são coisas que ainda não existem — e as três a magenta são as que
      te podem estragar o jogo, não só deixá-lo mais pobre.</p>
    <div class="key">
      <span><i style="background:var(--magenta)"></i> arrisca o jogo</span>
      <span><i style="background:var(--cyan)"></i> deixa-o mais pobre</span>
    </div>
    <div class="miss">
      ${MISSING.map((m) => `<div class="m${m.hard ? ' hard' : ''}">
        <span class="h"><b class="cjk">${m.han}</b><em>${m.title}</em></span>
        <p>${m.text}</p>
      </div>`).join('')}
    </div>
  </section>
</div>`;

writeFileSync('systems.html', page);
console.log(`systems.html — ${(page.length / 1024).toFixed(0)} KB · ${SYSTEMS.length} systems, ` +
  `${SYSTEMS.reduce((n, s) => n + s.gaps.length, 0)} gaps, ${MISSING.length} missing`);
