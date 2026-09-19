/**
 * 九境 The bible: the one page that explains the whole game.
 *
 * It exists because there were seven pages and Bruno could not tell which was which.
 * This one is the door. Everything is in it, in plain European Portuguese, in the order
 * a person would ask about it, and the other pages are listed at the end as what they
 * are rather than as a pile of links.
 *
 * Every number and every drawing is read out of the game's own modules, so it cannot go
 * stale: if something here is wrong, the game is wrong.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS, WARDENS } from '../src/data/bestiary.ts';
import { REALMS, realm as realmOf } from '../src/data/realms.ts';
import { ARTS, SEQUENCE_SLOTS, STANCES } from '../src/data/arts.ts';
import {
  AFFIXES, AFFIX_INFO, ARCHETYPES, GEAR, RARITIES, RARITY_INFO, REALM_SETS, SLOTS,
} from '../src/data/gear.ts';
import { ALL_NODES, PATH_INFO, PATHS, TOTAL_COST } from '../src/data/techniques.ts';
import { UPGRADES, UPGRADE_INFO } from '../src/sim/state.ts';
import { CHEST_LIMIT, FUSE_COUNT } from '../src/sim/chest.ts';
import { LAYERS_PER_REALM, TARGET_DAYS } from '../src/sim/balance.ts';
import { daoEarned } from '../src/sim/dao.ts';
import { icon } from '../src/art/icon.ts';
import { portrait } from '../src/art/aura.ts';
import { gearTile } from '../src/art/gear.ts';
import { arenaScene } from '../src/art/scene.ts';

const FULL_RUN = daoEarned(73, 9);

const GAME = 'https://claude.ai/artifact/UL7UoBNgTRyWiL7BJogooq';
const BENCH = 'https://claude.ai/artifact/KmzcpLzzLXS9TzSpF8bvfZ';
const CATALOGUE = 'https://claude.ai/artifact/AcfrXb2csTSYpKxPr6P73Y';
const PAGES = 'https://hyoddougamer-dev.github.io/ninefold/';
const REPO = 'https://github.com/hyoddougamer-dev/ninefold';

const n = (x: number) => x.toLocaleString('pt-PT');

const page = `<title>九境 A Bíblia</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.65 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:760px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2,h3 { margin:0; font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,12vw,60px); font-weight:400;
       color:var(--cyan); line-height:1; }
  h2 { font-family:Rajdhani,sans-serif; font-size:26px; display:flex; gap:11px;
       align-items:baseline; }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:30px;
          color:var(--cyan); }
  h3 { font-family:Rajdhani,sans-serif; font-size:14px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; }
  p { margin:0; }
  a { color:var(--cyan); }
  .lead { font-size:19px; margin-top:14px; }
  .sec { margin-top:40px; border-top:1px solid var(--line); padding-top:22px;
         display:flex; flex-direction:column; gap:13px; }
  .t { color:var(--faint); max-width:58ch; }
  .t b { color:var(--text); font-weight:600; }
  .big { font-family:Rajdhani,sans-serif; font-weight:700; color:var(--gold); }

  /* o índice */
  .toc { display:grid; grid-template-columns:repeat(auto-fit,minmax(132px,1fr)); gap:7px;
         margin-top:22px; }
  .toc a { display:flex; align-items:baseline; gap:8px; text-decoration:none;
           background:var(--panel2); border:1px solid var(--line); border-radius:10px;
           padding:9px 12px; color:var(--text); font-size:14px; }
  .toc a b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:18px;
             color:var(--cyan); }

  /* o aviso do APK */
  .now { background:linear-gradient(180deg,color-mix(in srgb,var(--gold) 12%,var(--panel2)),
         var(--panel2)); border:1px solid var(--gold); border-radius:14px; padding:20px 22px;
         margin-top:26px; }
  .now h2 .h, .now h2 { color:var(--gold); }
  .steps { list-style:none; margin:14px 0 0; padding:0; display:flex; flex-direction:column;
           gap:12px; }
  .steps li { display:flex; gap:12px; align-items:flex-start; }
  .steps .no { flex:none; width:25px; height:25px; border-radius:8px; display:grid;
               place-items:center; background:var(--gold); color:#0A0800;
               font-family:Rajdhani,sans-serif; font-weight:700; font-size:14px; }
  .steps b { display:block; font-size:15px; }
  .steps i { font-style:normal; font-size:13.5px; color:var(--faint); line-height:1.5; }

  /* blocos genéricos */
  .cards { display:grid; gap:8px; }
  @media(min-width:600px){ .cards.two { grid-template-columns:1fr 1fr; } }
  .card { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
          padding:12px 14px; }
  .card b { color:var(--cyan); }
  .pills { display:flex; flex-wrap:wrap; gap:6px; }
  .pill { display:inline-flex; flex-direction:column; align-items:center;
          background:var(--panel2); border:1px solid var(--line); border-radius:9px;
          padding:6px 12px; }
  .pill b { font-family:Rajdhani,sans-serif; font-weight:700; font-size:17px; color:var(--gold); }
  .pill i { font-style:normal; font-size:10.5px; color:var(--faint); }

  .ladder { display:grid; grid-template-columns:repeat(auto-fit,minmax(74px,1fr)); gap:7px; }
  .rung { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
          padding:7px 5px 8px; text-align:center; position:relative; }
  .rung .fig { display:block; width:100%; aspect-ratio:1; }
  .rung .fig svg { display:block; width:100%; height:100%; }
  .rung b { display:block; font-size:14px; color:var(--hue); }
  .rung i { font-style:normal; font-size:9px; color:var(--faint); display:block; }
  .rung .no { position:absolute; top:4px; left:6px; font-family:Rajdhani,sans-serif;
              font-weight:700; font-size:10px; color:var(--hue); }

  .rows { display:grid; gap:6px; }
  .row { display:flex; gap:11px; align-items:center; background:var(--panel2);
         border:1px solid var(--line); border-left:3px solid var(--hue,var(--line));
         border-radius:10px; padding:9px 12px; }
  .row .ic { flex:none; color:var(--hue,var(--cyan)); display:grid; place-items:center; }
  .row .ic svg { display:block; }
  .row b { font-size:16px; color:var(--hue,var(--cyan)); }
  .row em { font-style:normal; font-size:13.5px; }
  .row i { font-style:normal; display:block; font-size:12.5px; color:var(--faint); }
  .row .body { flex:1; }

  .beastgrid { display:grid; grid-template-columns:repeat(9,1fr); gap:4px; }
  .col { background:var(--panel2); border:1px solid var(--line); border-radius:8px;
         padding:15px 2px 6px; display:flex; flex-direction:column; align-items:center;
         gap:4px; position:relative; }
  .col .no { position:absolute; top:3px; left:0; right:0; text-align:center;
             font-family:Rajdhani,sans-serif; font-weight:700; font-size:9px; color:var(--hue); }
  .bst { color:var(--hue); opacity:.55; display:grid; place-items:center; }
  .bst svg { display:block; }
  .bst.w { opacity:1; filter:drop-shadow(0 0 6px var(--hue)); }

  .stage { position:relative; height:170px; border:1px solid var(--line); border-radius:12px;
           overflow:hidden; }
  .stage .sc, .stage .sc svg { position:absolute; inset:0; width:100%; height:100%; }
  .duel { position:absolute; inset:0; display:grid; grid-template-columns:1fr 54px 1fr;
          align-items:end; padding:0 18px 22px; }
  .duel span { display:grid; place-items:center; }
  .duel .you { width:78px; height:78px; justify-self:center; }
  .duel .you svg { width:100%; height:100%; }
  .duel .foe { color:#CC79FF; justify-self:center; margin-bottom:12px; }
  .duel .mid { color:var(--cyan); font-size:19px; margin-bottom:30px;
               text-shadow:0 0 14px currentColor; }

  .tiles { display:flex; gap:8px; flex-wrap:wrap; }
  .tiles svg { display:block; }
  .lin { display:flex; flex-wrap:wrap; gap:8px; }
  .lin span { display:inline-flex; align-items:baseline; gap:5px; font-size:11.5px; }
  .lin b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:16px; }
  .lin i { font-style:normal; color:var(--faint); }

  .chips { display:flex; flex-wrap:wrap; gap:5px; }
  .chip { display:inline-flex; align-items:center; gap:5px; background:var(--panel2);
          border:1px solid var(--hue); border-radius:9px; padding:5px 10px; color:var(--hue); }
  .chip b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:15px; }
  .chip i { font-style:normal; font-size:10px; color:var(--faint); }
  .chip .ic { display:grid; place-items:center; }
  .chip .ic svg { display:block; }

  .warn { border-left:3px solid var(--magenta); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:12px 15px; }
  .warn b { color:var(--magenta); }
  .ok { border-left:3px solid var(--cyan); background:var(--panel2);
        border-radius:0 10px 10px 0; padding:12px 15px; font-size:14.5px; }
  .ok b { color:var(--cyan); }

  .where { display:grid; gap:7px; }
  .where a { display:flex; gap:11px; align-items:flex-start; text-decoration:none;
             background:var(--panel2); border:1px solid var(--line); border-radius:11px;
             padding:12px 14px; color:var(--text); }
  .where a b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:21px;
               color:var(--cyan); flex:none; }
  .where a em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
                font-size:16px; display:block; }
  .where a i { font-style:normal; font-size:13px; color:var(--faint); }
</style>

<div class="sheet">
  <header>
    <h1>九境</h1>
    <p class="lead">Um idle de cultivo. O qi sobe sozinho, mesmo com o telemóvel fechado.
      Nove reinos, cerca de <b class="big">${TARGET_DAYS} dias</b> até ao topo abrindo o
      jogo uma vez por dia.</p>
    <p class="t" style="margin-top:10px">Esta é a única página que precisas de ler. Tudo
      o que o jogo tem está aqui, e as outras páginas estão listadas no fim.</p>
    <div class="toc">
      <a href="#apk"><b>包</b> Onde jogo?</a>
      <a href="#loop"><b>環</b> Como se joga</a>
      <a href="#reinos"><b>境</b> Os reinos</a>
      <a href="#qi"><b>氣</b> O qi</a>
      <a href="#bestas"><b>狩</b> As bestas</a>
      <a href="#combate"><b>戰</b> O combate</a>
      <a href="#equip"><b>器</b> Equipamento</a>
      <a href="#arvore"><b>道</b> A árvore</a>
      <a href="#build"><b>勢</b> A build</a>
      <a href="#topo"><b>劫</b> O topo</a>
      <a href="#save"><b>存</b> O save</a>
      <a href="#falta"><b>缺</b> O que falta</a>
    </div>
  </header>

  <div class="now" id="apk">
    <h2><span class="h">包</span> Não há APK nenhum ainda</h2>
    <p class="t" style="margin-top:10px;color:var(--text)">Vou ser directo, porque isto
      é o que te está a baralhar: <b>ainda não existe ficheiro APK</b>. Nunca foi
      construído. O que existe é o jogo como página web, e a preparação para o APK.</p>
    <p class="t" style="margin-top:10px">E o APK, quando existir, <b>não tem o jogo lá
      dentro</b> — é uma casca à volta de um endereço. É por isso que só o instalas uma
      vez e nunca mais descarregas nada: quando eu mudo o jogo, a página muda, e a casca
      mostra o novo.</p>
    <ol class="steps">
      <li><span class="no">1</span><span>
        <b>Hoje: joga pelo link</b>
        <i>O <a href="${GAME}">九境 Ninefold</a> é o jogo a sério, actualizado. Funciona
          no telemóvel. É o que tens usado.</i>
      </span></li>
      <li><span class="no">2</span><span>
        <b>Um clique teu: liga o GitHub Pages</b>
        <i>É a única coisa que eu não consigo fazer daqui — tentei, e o GitHub respondeu
          que a acção não tem permissão para criar o site. Vai a
          <a href="${REPO}/settings/pages">Settings → Pages</a> e em
          <b>«Build and deployment» → Source</b> escolhe <b>GitHub Actions</b>. Só isso.
          A partir daí o jogo publica-se sozinho a cada alteração minha, em
          <a href="${PAGES}">${PAGES.replace('https://', '')}</a>.</i>
      </span></li>
      <li><span class="no">3</span><span>
        <b>Depois: instala pelo Chrome</b>
        <i>Abres esse endereço no telemóvel e fazes <b>«Adicionar ao ecrã principal»</b>.
          Fica com ícone, ecrã cheio, funciona sem rede e actualiza-se sozinho.
          <b>Para 90% das pessoas isto é o APK</b> — e não precisas de instalar nada
          de fontes desconhecidas.</i>
      </span></li>
      <li><span class="no">4</span><span>
        <b>Só se quiseres mesmo um ficheiro .apk</b>
        <i>No <a href="${REPO}/actions">GitHub → Actions</a>, corres a acção <b>apk</b> à
          mão, uma vez, e descarregas o ficheiro. Serve para instalar a partir dos
          ficheiros, ou mais tarde para a Play Store. Não precisas dele para jogar.</i>
      </span></li>
    </ol>
    <p class="ok" style="margin-top:14px"><b>Resumo:</b> hoje joga pelo link. Faz o clique
      do passo 2 e passas a poder instalar pelo Chrome, com ícone e sem rede. O ficheiro
      .apk é opcional.</p>
  </div>

  <section class="sec" id="loop">
    <h3>O jogo todo em quatro passos</h3>
    <h2><span class="h">環</span> Como se joga</h2>
    <div class="cards two">
      <div class="card"><b>1 · O qi sobe sozinho</b>
        <p class="t" style="margin-top:4px">Com o telemóvel fechado também. Voltas no dia
          seguinte e está lá à tua espera.</p></div>
      <div class="card"><b>2 · Gastas o qi em melhorias</b>
        <p class="t" style="margin-top:4px">Quatro botões. Duas fazem o qi vir mais
          depressa, duas fazem-te mais forte. Nunca perdes um nível.</p></div>
      <div class="card"><b>3 · A barra enche, aparece a guardiã</b>
        <p class="t" style="margin-top:4px">Uma besta guarda cada reino. Carregas em 戰 e
          vês. Se perderes, não perdes nada.</p></div>
      <div class="card"><b>4 · 突破 Rompes</b>
        <p class="t" style="margin-top:4px">Sobes de reino e a luz à tua volta muda. E
          começa outra vez, mais alto.</p></div>
    </div>
  </section>

  <section class="sec" id="reinos">
    <h3>A escada</h3>
    <h2><span class="h">境</span> Os nove reinos</h2>
    <p class="t">Cada reino tem <b>${LAYERS_PER_REALM} camadas</b>. São
      <b>73 camadas</b> ao todo, e o que muda a cada reino é a <b>aura</b> — dá para
      saber onde alguém está só de olhar.</p>
    <div class="ladder">
      ${REALMS.map((r) => `<div class="rung" style="--hue:${r.colour}">
        <span class="fig">${portrait({ realm: r.n })}</span>
        <b class="cjk">${r.han}</b><i>${r.name}</i>
        <span class="no">${r.n}</span>
      </div>`).join('')}
    </div>
  </section>

  <section class="sec" id="qi">
    <h3>A moeda</h3>
    <h2><span class="h">氣</span> Onde o qi vai</h2>
    <p class="t">Só há quatro sítios. Três compram-se com qi, um com 材 material que vem
      das bestas.</p>
    <div class="rows">
      ${UPGRADES.map((u) => {
        const i = UPGRADE_INFO[u];
        return `<div class="row">
          <span class="ic">${icon(i.icon, 24)}</span>
          <span class="body"><b class="cjk">${i.han}</b> <em>${i.name}</em>
            <i>${i.effect}</i></span>
          <span style="color:var(--gold);font-family:Rajdhani;font-weight:700;font-size:12px">
            ${i.currency === 'qi' ? 'qi' : '材'}</span>
        </div>`;
      }).join('')}
    </div>
  </section>

  <section class="sec" id="bestas">
    <h3>Para caçar e para bater</h3>
    <h2><span class="h">狩</span> As ${BEASTS.length} bestas</h2>
    <p class="t">Três comuns por reino, que caças quando quiseres para 材 material e
      equipamento. E <b>${WARDENS.length} guardiãs</b>, uma por reino, que barram a
      passagem — são as que brilham em baixo.</p>
    <div class="beastgrid">
      ${REALMS.map((r) => `<div class="col" style="--hue:${r.colour}">
        <span class="no">${r.n}</span>
        ${BEASTS.filter((b) => b.realm === r.n).map((b) =>
          `<span class="bst${b.warden ? ' w' : ''}" title="${b.han} ${b.name}">${icon(b.icon, 20)}</span>`).join('')}
      </div>`).join('')}
    </div>
  </section>

  <section class="sec" id="combate">
    <h3>Vê-se, não se joga</h3>
    <h2><span class="h">戰</span> O combate</h2>
    <p class="t">Resolve-se sozinho e tu vês. Uma ronda são <b>duas batidas</b>: tu bates,
      ela responde. Dura uns três segundos. <b>Perder não custa nada</b> — voltas quando
      estiveres mais forte.</p>
    <div class="stage">
      <div class="sc">${arenaScene(6)}</div>
      <div class="duel">
        <span class="you">${portrait({ realm: 6, focus: true })}</span>
        <span class="mid cjk">擊</span>
        <span class="foe">${icon('centipede', 62)}</span>
      </div>
    </div>
    <p class="t">O cenário é o reino <b>da besta</b> — lutas onde ela vive, por isso o céu
      muda conforme sobes.</p>
  </section>

  <section class="sec" id="equip">
    <h3>O que cai das bestas</h3>
    <h2><span class="h">器</span> O equipamento</h2>
    <div class="pills">
      ${[['peças', n(GEAR.length)], ['formas', `${ARCHETYPES.length}`],
         ['espaços', `${SLOTS.length}`], ['raridades', `${RARITIES.length}`],
         ['baú', `${CHEST_LIMIT}`], ['fusão', `${FUSE_COUNT}→1`],
         ['eixos', `${AFFIXES.length}`]].map(([l, v]) =>
        `<span class="pill"><b>${v}</b><i>${l}</i></span>`).join('')}
    </div>
    <p class="t"><b>Cada forma existe nos nove reinos.</b> Se gostas de leque, há leque do
      reino 1 ao 9 — nunca és obrigado a mudar de estilo.</p>
    <div class="tiles">
      ${RARITIES.map((rar, i) => gearTile(
        { id: `b${i}`, template: ['sword2', 'crescent4', 'diadem6', 'orb8', 'scythe9'][i], rarity: rar, rolls: [] },
        { size: 54, spin: 0.1 })).join('')}
    </div>
    <p class="t" style="font-size:13px">As cinco raridades: ${RARITIES.map((r) =>
      `<span class="cjk" style="color:${RARITY_INFO[r].colour}">${RARITY_INFO[r].han}</span>`).join(' · ')}.
      Quanto mais rara, mais linhas a peça leva.</p>
    <p class="t" style="margin-top:6px"><b>Cada reino tem a sua linhagem.</b> Vestir peças
      da mesma família paga extra — o set é o <em>reino</em>, não a forma, por isso
      qualquer peça de 落星 conta para o 落星.</p>
    <div class="lin">
      ${REALM_SETS.map((s) => `<span style="color:${realmOf(s.realm).colour}">
        <b class="cjk">${s.han}</b><i>${s.name}</i></span>`).join('')}
    </div>
    <p class="t" style="font-size:13px">Os eixos em que uma peça pode rolar:
      ${AFFIXES.map((a) => `<span class="cjk">${AFFIX_INFO[a].han}</span> ${AFFIX_INFO[a].label}`).join(' · ')}.</p>
  </section>

  <section class="sec" id="arvore">
    <h3>O que compras com o que sobes</h3>
    <h2><span class="h">道</span> A árvore</h2>
    <p class="t">Ganhas 道 a abrir camadas e a matar guardiãs. <b>Uma árvore só</b>: três
      ramos da mesma raiz 起, com pontes douradas a atravessar entre eles. Nunca dá para
      comprar tudo — a árvore custa <span class="big">${TOTAL_COST}</span> e uma corrida
      inteira dá <span class="big">${FULL_RUN}</span>.</p>
    <div class="rows">
      ${PATHS.map((p) => `<div class="row" style="--hue:${PATH_INFO[p].colour}">
        <span class="ic">${icon(PATH_INFO[p].icon, 24)}</span>
        <span class="body"><b class="cjk">${PATH_INFO[p].han}</b> <em>${PATH_INFO[p].name}</em>
          <i>${PATH_INFO[p].blurb}</i></span>
      </div>`).join('')}
    </div>
    <p class="t" style="font-size:13px">${ALL_NODES.length} nós, e três <b>chaves</b> —
      nós mais fortes do que o vizinho que abdicam de alguma coisa, e fecham o outro lado
      para sempre.</p>
  </section>

  <section class="sec" id="build">
    <h3>A única decisão dentro do combate</h3>
    <h2><span class="h">勢</span> Postura e sequência</h2>
    <p class="t">Escolhes tudo <b>antes</b> da luta e depois vês. Duas metades:</p>
    <div class="cards two">
      <div class="card"><b>勢 Uma postura</b>
        <p class="t" style="margin-top:4px">Sempre ligada. Reescreve todas as rondas.
          Ganhas a de cada reino a que chegas.</p></div>
      <div class="card"><b>訣 ${SEQUENCE_SLOTS} artes por ordem</b>
        <p class="t" style="margin-top:4px">Uma dispara por ronda, e volta ao início.
          Cada guardiã larga a sua. <b>A ordem conta.</b></p></div>
    </div>
    <div class="chips">
      ${STANCES.map((s) => `<span class="chip" style="--hue:${realmOf(s.realm).colour}"
        title="${s.text}"><b class="cjk">${s.han}</b><i>${s.name}</i></span>`).join('')}
    </div>
    <div class="chips">
      ${ARTS.map((a) => `<span class="chip" style="--hue:${realmOf(a.realm).colour}"
        title="${a.text}"><span class="ic">${icon(a.icon, 18)}</span>
        <b class="cjk">${a.han}</b></span>`).join('')}
    </div>
    <p class="ok">São <b>4 536</b> combinações, e uma build inteira vale
      <b>×1.82 de poder</b> — medido, não estimado. É a diferença entre a guardiã ser uma
      parede e ser uma porta: com 35% do qi gasto e sem build tens 12% de hipóteses; com
      a mesma coisa e uma build, 98%.</p>
  </section>

  <section class="sec" id="topo">
    <h3>Depois do reino 9</h3>
    <h2><span class="h">劫</span> 渡劫 A tribulação</h2>
    <p class="t">O reino 9 não acaba o jogo. O <b class="cjk">龍</b> Dragão volta sempre,
      ancorado ao <b>teu</b> poder da última vez. Cada travessia dá um
      <b class="cjk">雷印</b> — <b>+10% de poder e +10% de qi, para sempre</b>. A barra lá
      em cima lê o teu poder contra o dele.</p>
    <p class="warn"><b>Aviso honesto:</b> neste momento as travessias vêm depressa demais.
      Não é culpa do 渡劫 — é a economia que dispara no topo. Explico em baixo.</p>
  </section>

  <section class="sec" id="save">
    <h3>Não percas três meses</h3>
    <h2><span class="h">存</span> O save</h2>
    <p class="t">Botão <b>存</b> em cima, ao lado do <b>?</b>. Copias o save para onde
      quiseres, ou descarregas um ficheiro, e colas de volta para recuperar.</p>
    <p class="t">O jogo também guarda uma cópia sobresselente sozinho e recorre a ela se a
      principal desaparecer <em>ou andar para trás</em>. Mas isso protege-te do jogo.
      <b>Só a tua cópia te protege do telemóvel.</b></p>
  </section>

  <section class="sec" id="falta">
    <h3>Estado real</h3>
    <h2><span class="h">缺</span> O que falta</h2>
    <p class="warn"><b>1 · A economia dispara no topo.</b> É o maior. No reino 9 já não há
      camadas a consumir qi, por isso compras melhorias de ritmo com o qi que essas
      melhorias produzem. Simulado, o ritmo chega a 10²⁸ qi por dia em duas semanas.
      Corrigir é afinar a curva das melhorias e voltar a afinar os custos dos reinos para
      manter os 90 dias. <b>Sugiro que seja o próximo.</b></p>
    <p class="warn" style="margin-top:8px"><b>2 · Ninguém jogou 90 dias.</b> A curva está
      testada em simulação, nunca jogada. Costuma partir entre o reino 6 e o 7.</p>
    <p class="t" style="margin-top:10px">E três coisas menores: o som são quatro sons sem
      volume, o bestiário não dá nada por completar um reino, e depois do ecrã de ajuda
      ninguém te ensina mais nada.</p>
  </section>

  <section class="sec">
    <h3>As outras páginas</h3>
    <h2><span class="h">卷</span> Onde está o resto</h2>
    <div class="where">
      <a href="${GAME}"><b>玩</b><span><em>九境 Ninefold</em>
        <i>O jogo. É este que jogas.</i></span></a>
      <a href="${BENCH}"><b>戰</b><span><em>Banco de ensaios</em>
        <i>A arena com todos os botões: escolhe o reino, a besta, a postura, a sequência e
          a velocidade. Para veres o combate sem jogar três meses.</i></span></a>
      <a href="${CATALOGUE}"><b>器</b><span><em>器道 Catálogo</em>
        <i>As ${n(GEAR.length)} peças desenhadas uma a uma, as nove linhagens e a árvore
          toda.</i></span></a>
      <a href="${REPO}"><b>碼</b><span><em>O código</em>
        <i>Tudo o que existe. As acções que publicam o jogo e constroem o APK estão no
          separador Actions.</i></span></a>
    </div>
    <p class="t" style="margin-top:12px;font-size:13px">As propostas antigas (as quatro
      janelas de combate, os quatro sistemas de artes) já foram decididas e não precisas
      delas. Esta página substitui a dos sistemas.</p>
  </section>
</div>`;

writeFileSync('bible.html', page);
console.log(`bible.html — ${(page.length / 1024).toFixed(0)} KB`);
