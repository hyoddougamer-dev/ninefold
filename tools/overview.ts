/**
 * The at-a-glance page: what the game is, in pictures and short lines.
 *
 * Bruno asked outright to stop writing long and technical, so there is no paragraph
 * here: every block is one large image and one line of at most a dozen words.
 *
 * The copy is the one thing in this repository that is not in English. It is written
 * for Bruno, in European Portuguese, not for the game.
 */
import { writeFileSync } from 'node:fs';
import { portrait, seal } from '../src/art/aura.ts';
import { icon } from '../src/art/icon.ts';
import { BEASTS, commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { REALMS, realm as realmOf } from '../src/data/realms.ts';
import { UPGRADE_INFO, UPGRADES } from '../src/sim/state.ts';

const ladder = REALMS.map((r) => `
  <figure class="step">
    <div class="frame">${portrait({ realm: r.n })}</div>
    <figcaption><b class="cjk" style="color:${r.colour}">${r.han}</b><i>${r.n}</i></figcaption>
  </figure>`).join('');

const wardens = REALMS.map((r) => {
  const g = wardenOf(r.n);
  return `<figure class="brow">
    <div class="selo">${seal(g.icon, r.colour, true)}</div>
    <figcaption><b class="cjk" style="color:${r.colour}">${g.han}</b><i>${g.name}</i></figcaption>
  </figure>`;
}).join('');

const hunt = REALMS.flatMap((r) => commonsOf(r.n)).map((b) => {
  const colour = realmOf(b.realm).colour;
  return `<figure class="mini"><div class="selo">${seal(b.icon, colour)}</div>
    <figcaption><b class="cjk" style="color:${colour}">${b.han}</b></figcaption></figure>`;
}).join('');

const spends = UPGRADES.map((m) => {
  const i = UPGRADE_INFO[m];
  return `<figure class="spend">
    <span class="ic">${icon(i.icon, 34)}</span>
    <figcaption><b class="cjk">${i.han}</b><i>${i.effect}</i></figcaption>
  </figure>`;
}).join('');

const DONE = [
  'O jogo abre e funciona no telemóvel',
  'A energia sobe sozinha, mesmo fechado',
  'Nove níveis, cada um com a sua luz',
  '36 bichos com desenho próprio',
  'Luta automática, que se vê acontecer',
  'O progresso fica guardado no telemóvel',
  'Três meses até ao topo, já contado',
];

const TODO = [
  'A aplicação para instalar (APK)',
  'Os bichos mexerem-se na luta',
  'Som e vibração',
  'Ecrã de ajuda dentro do jogo',
  'Mais coisas para gastar a energia',
  'Equipamento',
];

const page = `<title>九境 Num relance</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&family=Archivo:wght@400;500&display=swap">
<style>
  /* One world on purpose: this is the game's art, so it does not follow the system theme. */
  :root { --ground:#080A18; --panel:#111433; --line:#252A5C; --cyan:#5FDCFF;
          --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0; --gold:#FFCE6B;
          color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.6 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:760px; margin:0 auto; padding-block:40px 80px;
           padding-left:20px; padding-right:20px; }
  .cjk { font-family:'Noto Serif SC', serif; }

  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(38px,11vw,60px); margin:0;
       font-weight:400; color:var(--cyan); line-height:1.05; }
  .sub { color:var(--faint); font-size:17px; margin:8px 0 0; }

  section { margin-top:54px; }
  h2 { font-family:Rajdhani,sans-serif; font-size:27px; margin:0 0 6px; font-weight:600;
       letter-spacing:.01em; }
  .says { font-size:18px; color:var(--faint); margin:0 0 18px; max-width:44ch; }

  /* A ladder you scroll through with a thumb. */
  .strip { display:flex; gap:12px; overflow-x:auto; padding-bottom:8px;
          scroll-snap-type:x mandatory; }
  .strip > * { scroll-snap-align:start; flex:none; }
  .step { margin:0; width:132px; }
  .frame { width:132px; height:132px; border:1px solid var(--line); border-radius:12px;
            overflow:hidden; background:#0B0E22; }
  .frame svg { display:block; width:100%; height:100%; }
  .step figcaption { display:flex; align-items:baseline; justify-content:space-between;
                      margin-top:7px; }
  .step b { font-size:19px; }
  .step i { font-style:normal; font-family:Rajdhani,sans-serif; color:var(--faint); font-size:15px; }

  .brow { margin:0; width:108px; text-align:center; }
  .brow .selo { width:88px; height:88px; margin:0 auto; }
  .brow .selo svg { display:block; width:100%; height:100%; }
  .brow b { display:block; font-size:17px; margin-top:6px; }
  .brow i { font-style:normal; font-size:12px; color:var(--faint); }

  .swarm { display:grid; grid-template-columns:repeat(auto-fill,minmax(74px,1fr)); gap:10px; }
  .mini { margin:0; text-align:center; }
  .mini .selo { width:100%; aspect-ratio:1; }
  .mini .selo svg { display:block; width:100%; height:100%; }
  .mini b { display:block; font-size:13px; margin-top:3px; }

  .spends { display:grid; gap:11px; grid-template-columns:1fr; }
  @media(min-width:560px){ .spends { grid-template-columns:1fr 1fr; } }
  .spend { margin:0; background:var(--panel); border:1px solid var(--line);
           border-radius:12px; padding:14px 16px; display:flex; gap:14px; align-items:center; }
  .spend .ic { color:var(--cyan); display:grid; place-items:center; flex:none; }
  .spend .ic svg { display:block; }
  .spend b { display:block; font-size:19px; }
  .spend i { font-style:normal; font-size:14px; color:var(--faint); }

  .two { display:grid; gap:22px; }
  @media(min-width:620px){ .two { grid-template-columns:1fr 1fr; } }
  ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:9px; }
  li { display:flex; gap:11px; align-items:flex-start; font-size:16px; }
  li span { flex:none; font-family:Rajdhani,sans-serif; font-weight:700; }
  .yes li span { color:var(--cyan); }
  .no li span { color:var(--faint); }
  .no li { color:var(--faint); }

  .play { display:block; margin-top:20px; background:var(--cyan); color:var(--ground);
           text-align:center; padding:16px; border-radius:12px; font-size:19px;
           text-decoration:none; font-family:'Noto Serif SC',serif;
           box-shadow:0 0 30px rgba(95,220,255,.25); }
  .play span { font-family:Archivo,sans-serif; font-size:13px; letter-spacing:.14em;
                text-transform:uppercase; opacity:.7; margin-left:9px; }
</style>

<div class="sheet">
  <h1>九境</h1>
  <p class="sub">O que já existe, num relance.</p>

  <section>
    <h2>1 · O jogo</h2>
    <p class="says">Sentas-te e juntas energia. Ficas mais forte. Sobes de nível.</p>
  </section>

  <section>
    <h2>2 · A energia sobe sozinha</h2>
    <p class="says">Mesmo com o telemóvel fechado. Voltas amanhã e está tudo lá.</p>
  </section>

  <section>
    <h2>3 · Nove níveis</h2>
    <p class="says">A luz à tua volta muda em cada um. Arrasta para ver.</p>
    <div class="strip">${ladder}</div>
  </section>

  <section>
    <h2>4 · Um chefe em cada nível</h2>
    <p class="says">Vence-o para subires. Perder não te tira nada.</p>
    <div class="strip">${wardens}</div>
  </section>

  <section>
    <h2>5 · E ${BEASTS.length - 9} bichos para caçar</h2>
    <p class="says">Dão materiais. Os materiais tornam-te mais forte.</p>
    <div class="swarm">${hunt}</div>
  </section>

  <section>
    <h2>6 · Onde gasta a energia</h2>
    <p class="says">Quatro coisas. Todas te fazem subir mais depressa.</p>
    <div class="gastos">${spends}</div>
  </section>

  <section>
    <h2>7 · Onde estamos</h2>
    <div class="two">
      <div>
        <p class="says" style="margin-bottom:12px">Já feito</p>
        <ul class="yes">${DONE.map((x) => `<li><span>✓</span>${x}</li>`).join('')}</ul>
      </div>
      <div>
        <p class="says" style="margin-bottom:12px">Ainda falta</p>
        <ul class="no">${TODO.map((x) => `<li><span>○</span>${x}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section>
    <h2>8 · Experimente</h2>
    <p class="says">Abre no telemóvel. O teu progresso fica guardado.</p>
    <a class="play" href="https://claude.ai/artifact/UL7UoBNgTRyWiL7BJogooq">開 <span>Jogar</span></a>
  </section>
</div>`;

writeFileSync('overview.html', page);
console.log(`overview.html: ${(page.length / 1024).toFixed(0)} KB`);
