/**
 * Uma página de uma olhada só: o que o jogo é, em desenhos e frases curtas.
 *
 * O Bruno pediu explicitamente para parar de escrever longo e técnico. Então aqui não
 * há parágrafo: cada bloco é uma imagem grande e uma linha de no máximo doze palavras.
 */
import { writeFileSync } from 'node:fs';
import { retrato, selo } from '../src/art/aura.ts';
import { icone } from '../src/art/icone.ts';
import { BESTAS, comunsDo, guardiaDo } from '../src/data/bestiario.ts';
import { REINOS, reino as reinoDe } from '../src/data/reinos.ts';
import { MELHORIA_INFO, MELHORIAS } from '../src/sim/estado.ts';

const escada = REINOS.map((r) => `
  <figure class="passo">
    <div class="quadro">${retrato({ reino: r.n })}</div>
    <figcaption><b class="cjk" style="color:${r.cor}">${r.han}</b><i>${r.n}</i></figcaption>
  </figure>`).join('');

const guardias = REINOS.map((r) => {
  const g = guardiaDo(r.n);
  return `<figure class="bicho">
    <div class="selo">${selo(g.icone, r.cor, true)}</div>
    <figcaption><b class="cjk" style="color:${r.cor}">${g.han}</b><i>${g.nome}</i></figcaption>
  </figure>`;
}).join('');

const caca = REINOS.flatMap((r) => comunsDo(r.n)).map((b) => {
  const cor = reinoDe(b.reino).cor;
  return `<figure class="mini"><div class="selo">${selo(b.icone, cor)}</div>
    <figcaption><b class="cjk" style="color:${cor}">${b.han}</b></figcaption></figure>`;
}).join('');

const gastos = MELHORIAS.map((m) => {
  const i = MELHORIA_INFO[m];
  return `<figure class="gasto">
    <span class="ic">${icone(i.icone, 34)}</span>
    <figcaption><b class="cjk">${i.han}</b><i>${i.efeito}</i></figcaption>
  </figure>`;
}).join('');

const PRONTO = [
  'O jogo abre e funciona no telemóvel',
  'A energia sobe sozinha, mesmo fechado',
  'Nove níveis, cada um com a sua luz',
  '36 bichos com desenho próprio',
  'Luta automática, que se vê acontecer',
  'O progresso fica guardado no telemóvel',
  'Três meses até ao topo, já contado',
];

const FALTA = [
  'A aplicação para instalar (APK)',
  'Os bichos mexerem-se na luta',
  'Som e vibração',
  'Ecrã de ajuda dentro do jogo',
  'Mais coisas para gastar a energia',
  'Equipamento',
];

const pagina = `<title>九境 Num relance</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&family=Archivo:wght@400;500&display=swap">
<style>
  /* Um mundo só, de propósito: é a arte do jogo, não segue o tema do sistema. */
  :root { --fundo:#080A18; --painel:#111433; --linha:#252A5C; --ciano:#5FDCFF;
          --magenta:#FF5FC8; --texto:#E7EAFF; --fraco:#8289C0; --ouro:#FFCE6B;
          color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--fundo); color:var(--texto);
         font:17px/1.6 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .folha { max-width:760px; margin:0 auto; padding-block:40px 80px;
           padding-left:20px; padding-right:20px; }
  .cjk { font-family:'Noto Serif SC', serif; }

  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(38px,11vw,60px); margin:0;
       font-weight:400; color:var(--ciano); line-height:1.05; }
  .sub { color:var(--fraco); font-size:17px; margin:8px 0 0; }

  section { margin-top:54px; }
  h2 { font-family:Rajdhani,sans-serif; font-size:27px; margin:0 0 6px; font-weight:600;
       letter-spacing:.01em; }
  .diz { font-size:18px; color:var(--fraco); margin:0 0 18px; max-width:44ch; }

  /* Uma escada que se percorre com o dedo. */
  .fila { display:flex; gap:12px; overflow-x:auto; padding-bottom:8px;
          scroll-snap-type:x mandatory; }
  .fila > * { scroll-snap-align:start; flex:none; }
  .passo { margin:0; width:132px; }
  .quadro { width:132px; height:132px; border:1px solid var(--linha); border-radius:12px;
            overflow:hidden; background:#0B0E22; }
  .quadro svg { display:block; width:100%; height:100%; }
  .passo figcaption { display:flex; align-items:baseline; justify-content:space-between;
                      margin-top:7px; }
  .passo b { font-size:19px; }
  .passo i { font-style:normal; font-family:Rajdhani,sans-serif; color:var(--fraco); font-size:15px; }

  .bicho { margin:0; width:108px; text-align:center; }
  .bicho .selo { width:88px; height:88px; margin:0 auto; }
  .bicho .selo svg { display:block; width:100%; height:100%; }
  .bicho b { display:block; font-size:17px; margin-top:6px; }
  .bicho i { font-style:normal; font-size:12px; color:var(--fraco); }

  .enxame { display:grid; grid-template-columns:repeat(auto-fill,minmax(74px,1fr)); gap:10px; }
  .mini { margin:0; text-align:center; }
  .mini .selo { width:100%; aspect-ratio:1; }
  .mini .selo svg { display:block; width:100%; height:100%; }
  .mini b { display:block; font-size:13px; margin-top:3px; }

  .gastos { display:grid; gap:11px; grid-template-columns:1fr; }
  @media(min-width:560px){ .gastos { grid-template-columns:1fr 1fr; } }
  .gasto { margin:0; background:var(--painel); border:1px solid var(--linha);
           border-radius:12px; padding:14px 16px; display:flex; gap:14px; align-items:center; }
  .gasto .ic { color:var(--ciano); display:grid; place-items:center; flex:none; }
  .gasto .ic svg { display:block; }
  .gasto b { display:block; font-size:19px; }
  .gasto i { font-style:normal; font-size:14px; color:var(--fraco); }

  .duas { display:grid; gap:22px; }
  @media(min-width:620px){ .duas { grid-template-columns:1fr 1fr; } }
  ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:9px; }
  li { display:flex; gap:11px; align-items:flex-start; font-size:16px; }
  li span { flex:none; font-family:Rajdhani,sans-serif; font-weight:700; }
  .ok li span { color:var(--ciano); }
  .nao li span { color:var(--fraco); }
  .nao li { color:var(--fraco); }

  .jogar { display:block; margin-top:20px; background:var(--ciano); color:var(--fundo);
           text-align:center; padding:16px; border-radius:12px; font-size:19px;
           text-decoration:none; font-family:'Noto Serif SC',serif;
           box-shadow:0 0 30px rgba(95,220,255,.25); }
  .jogar span { font-family:Archivo,sans-serif; font-size:13px; letter-spacing:.14em;
                text-transform:uppercase; opacity:.7; margin-left:9px; }
</style>

<div class="folha">
  <h1>九境</h1>
  <p class="sub">O que já existe, num relance.</p>

  <section>
    <h2>1 · O jogo</h2>
    <p class="diz">Você senta e junta energia. Fica mais forte. Sobe de nível.</p>
  </section>

  <section>
    <h2>2 · A energia sobe sozinha</h2>
    <p class="diz">Mesmo com o telemóvel fechado. Volta amanhã e está tudo lá.</p>
  </section>

  <section>
    <h2>3 · Nove níveis</h2>
    <p class="diz">A luz à sua volta muda em cada um. Arraste para ver.</p>
    <div class="fila">${escada}</div>
  </section>

  <section>
    <h2>4 · Um chefe em cada nível</h2>
    <p class="diz">Ganhe-lhe para subir. Perder não tira nada de si.</p>
    <div class="fila">${guardias}</div>
  </section>

  <section>
    <h2>5 · E ${BESTAS.length - 9} bichos para caçar</h2>
    <p class="diz">Dão materiais. Os materiais tornam-no mais forte.</p>
    <div class="enxame">${caca}</div>
  </section>

  <section>
    <h2>6 · Onde gasta a energia</h2>
    <p class="diz">Quatro coisas. Todas o fazem subir mais depressa.</p>
    <div class="gastos">${gastos}</div>
  </section>

  <section>
    <h2>7 · Onde estamos</h2>
    <div class="duas">
      <div>
        <p class="diz" style="margin-bottom:12px">Já feito</p>
        <ul class="ok">${PRONTO.map((x) => `<li><span>✓</span>${x}</li>`).join('')}</ul>
      </div>
      <div>
        <p class="diz" style="margin-bottom:12px">Ainda falta</p>
        <ul class="nao">${FALTA.map((x) => `<li><span>○</span>${x}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section>
    <h2>8 · Experimente</h2>
    <p class="diz">Abre no telemóvel. O seu progresso fica guardado.</p>
    <a class="jogar" href="https://claude.ai/artifact/UL7UoBNgTRyWiL7BJogooq">開 <span>Jogar</span></a>
  </section>
</div>`;

writeFileSync('simples.html', pagina);
console.log(`simples.html — ${(pagina.length / 1024).toFixed(0)} KB`);
