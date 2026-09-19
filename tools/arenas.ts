/**
 * 戰 Four combat windows, side by side and running.
 *
 * The one in the game is two figures stacked on a see-through scrim with the hunt list
 * showing through — which reads as a dialog over a list, not as a fight. These four are
 * different answers to the same question, and each one gives up something different.
 *
 * Every one of them is drawn by the game's own art code and fed by the game's own
 * combat sim, so what is on this page is what the game can actually do.
 *
 * The copy is European Portuguese: it is written for Bruno, not for the game.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS } from '../src/data/bestiary.ts';
import { realm as realmOf } from '../src/data/realms.ts';
import { beastPower, fight } from '../src/sim/combat.ts';
import { newState, power, type State } from '../src/sim/state.ts';
import { mix, portrait } from '../src/art/aura.ts';
import { ICONS } from '../src/art/icons.generated.ts';

const REALM = 6;
const r = realmOf(REALM);
const beast = BEASTS.find((b) => b.key === 'centipede')!;
const br = realmOf(beast.realm);

/** An even match, found rather than guessed — a blowout shows nothing. */
const at = (technique: number): State =>
  ({ ...newState(0), realm: REALM, layer: 8, levels: { technique, method: 0, pills: 0, cores: 0 } });
let hero = at(0);
for (let t = 0; t <= 120; t++) {
  if (Math.abs(power(at(t)) - beastPower(beast)) < Math.abs(power(hero) - beastPower(beast))) hero = at(t);
}
const outcome = fight(hero, beast, 20260919);

/** The fight as beats: two to a round, the cultivator first. */
const BEATS = outcome.rounds.flatMap((round, i) => {
  const before = i > 0 ? outcome.rounds[i - 1] : { playerHealth: 1, beastHealth: 1 };
  return [
    { by: 'p', dmg: round.playerDamage, hp: before.playerHealth, hb: round.beastHealth },
    { by: 'b', dmg: round.beastDamage, hp: round.playerHealth, hb: round.beastHealth },
  ];
});

const num = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`);

const HERO = portrait({ realm: REALM, focus: true });
const BODY = ICONS[beast.icon] ?? '';

/** The beast as a bare drawing, no ring — the ring is the old window's idea. */
const creature = (size: number, colour: string, opacity = 1) =>
  `<svg viewBox="0 0 512 512" width="${size}" height="${size}" aria-hidden="true">` +
  `<g fill="${colour}" opacity="${opacity}">${BODY}</g></svg>`;

/** A ridge of hills, generated so it is never the same twice down the page. */
function ridge(seed: number, w: number, h: number, peaks: number): string {
  let a = seed;
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pts: string[] = [`0,${h}`];
  for (let i = 0; i <= peaks; i++) {
    const x = (i / peaks) * w;
    const y = h - (0.25 + rnd() * 0.75) * h;
    pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
  }
  pts.push(`${w},${h}`);
  return pts.join(' ');
}

// ── A ─ 對 The Facing ──────────────────────────────────────────────────────────
const facing = `<div class="win a" data-demo="a">
  <div class="scene">
    <svg class="sky" viewBox="0 0 320 300" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="skya" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#05060F"/>
          <stop offset=".62" stop-color="${mix(r.colour, '#05060F', 0.7)}"/>
          <stop offset=".86" stop-color="${mix(r.colour, '#05060F', 0.34)}"/>
        </linearGradient>
        <linearGradient id="flra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${r.colour}" stop-opacity="0"/>
          <stop offset="1" stop-color="${r.colour}" stop-opacity=".26"/>
        </linearGradient>
        <linearGradient id="edga" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${r.colour}" stop-opacity="0"/>
          <stop offset=".5" stop-color="${r.colour}" stop-opacity=".6"/>
          <stop offset="1" stop-color="${r.colour}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="320" height="262" fill="url(#skya)"/>
      <polygon points="${ridge(7, 320, 150, 7)}" fill="${mix(r.colour, '#05060F', 0.78)}" transform="translate(0 56)"/>
      <polygon points="${ridge(23, 320, 122, 6)}" fill="${mix(r.colour, '#05060F', 0.88)}" transform="translate(0 140)"/>
      <!-- The floor: one lit edge, faded at both ends, and dark below it — so the
           fighters have something to stand on instead of hanging in a gradient. -->
      <rect y="262" width="320" height="38" fill="#05060F"/>
      <rect y="234" width="320" height="28" fill="url(#flra)"/>
      <rect y="260" width="320" height="2" fill="url(#edga)"/>
    </svg>
    <div class="duel">
      <div class="fighter hero"><div class="art">${HERO}</div></div>
      <div class="gap"><i class="streak"></i><b class="mark"></b></div>
      <div class="fighter foe"><div class="art">${creature(84, br.colour)}</div></div>
    </div>
  </div>
  <div class="feet">
    <div class="who">
      <span class="nm"><b class="cjk" style="color:${r.colour}">${r.han}</b> 力 ${num(outcome.playerPower)}</span>
      <span class="bar"><i class="hp p"></i></span>
    </div>
    <div class="who r">
      <span class="nm"><b class="cjk" style="color:${br.colour}">${beast.han}</b> 力 ${num(beastPower(beast))}</span>
      <span class="bar"><i class="hp b"></i></span>
    </div>
  </div>
</div>`;

// ── B ─ 境 Into the Realm ──────────────────────────────────────────────────────
const realmWindow = `<div class="win b" data-demo="b">
  <svg class="land" viewBox="0 0 320 480" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="skyb" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#05060F"/>
        <stop offset=".5" stop-color="${mix(r.colour, '#05060F', 0.8)}"/>
        <stop offset=".78" stop-color="${mix(r.colour, '#05060F', 0.34)}"/>
        <stop offset="1" stop-color="${mix(r.colour, '#05060F', 0.62)}"/>
      </linearGradient>
      <radialGradient id="glowb" cx=".5" cy="1" r=".75">
        <stop offset="0" stop-color="${r.colour}" stop-opacity=".55"/>
        <stop offset="1" stop-color="${r.colour}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="edgb" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${r.colour}" stop-opacity="0"/>
        <stop offset=".5" stop-color="${r.colour}" stop-opacity=".55"/>
        <stop offset="1" stop-color="${r.colour}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="320" height="480" fill="url(#skyb)"/>
    <ellipse cx="160" cy="366" rx="190" ry="86" fill="url(#glowb)"/>
    <polygon points="${ridge(3, 320, 128, 8)}" fill="${mix(r.colour, '#05060F', 0.74)}" transform="translate(0 240)"/>
    <polygon points="${ridge(11, 320, 104, 6)}" fill="${mix(r.colour, '#05060F', 0.86)}" transform="translate(0 292)"/>
    <!-- The near ridge has to reach the floor exactly. Left eight pixels short, the lit
         bottom of the sky gradient showed through as a bright bar across the window. -->
    <polygon points="${ridge(29, 320, 108, 5)}" fill="#07091A" transform="translate(0 330)"/>
    <rect y="438" width="320" height="42" fill="#05060F"/>
  </svg>
  <div class="mist"></div>
  <div class="looming"><div class="art">${creature(178, br.colour)}</div></div>
  <div class="small"><div class="art">${HERO}</div></div>
  <div class="tell">
    <span class="cjk" style="color:${br.colour}">${beast.han}</span>
    <em>${beast.name}</em>
  </div>
</div>`;

// ── C ─ 卷 The Scroll ─────────────────────────────────────────────────────────
const scroll = `<div class="win c" data-demo="c">
  <div class="heads">
    <div class="head">
      <span class="ring">
        <svg class="gauge" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="none"
          stroke="var(--line)" stroke-width="2.5"/><circle class="arc p" cx="24" cy="24" r="21" fill="none"
          stroke="var(--cyan)" stroke-width="2.5" stroke-linecap="round"
          transform="rotate(-90 24 24)"/></svg>
        <span class="art">${HERO}</span>
      </span>
      <b class="cjk" style="color:${r.colour}">${r.han}</b>
    </div>
    <span class="vs cjk">鬥</span>
    <div class="head r">
      <span class="ring">
        <svg class="gauge" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="none"
          stroke="var(--line)" stroke-width="2.5"/><circle class="arc b" cx="24" cy="24" r="21" fill="none"
          stroke="var(--magenta)" stroke-width="2.5" stroke-linecap="round"
          transform="rotate(-90 24 24)"/></svg>
        <span class="art">${creature(26, br.colour)}</span>
      </span>
      <b class="cjk" style="color:${br.colour}">${beast.han}</b>
    </div>
  </div>
  <div class="paper"><div class="lines"></div></div>
</div>`;

// ── D ─ 陣 The Formation ──────────────────────────────────────────────────────
const formation = `<div class="win d" data-demo="d">
  <div class="circle">
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="150" cy="150" r="128" fill="none" stroke="#252A5C" stroke-width="7"/>
      <!-- The left half is yours and the right half is the beast's. Both are drawn from
           the bottom upward, so the ring reads as two lives meeting at the floor. -->
      <path class="arc p" d="M 150 278 A 128 128 0 0 1 150 22" fill="none"
        stroke="var(--cyan)" stroke-width="7" stroke-linecap="round"/>
      <path class="arc b" d="M 150 278 A 128 128 0 0 0 150 22" fill="none"
        stroke="var(--magenta)" stroke-width="7" stroke-linecap="round"/>
      <circle cx="150" cy="150" r="112" fill="none" stroke="${r.colour}" stroke-opacity=".16" stroke-width="1"/>
      <g class="spin" style="transform-origin:150px 150px">
        ${[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return `<circle cx="${(150 + Math.cos(a) * 112).toFixed(1)}" cy="${(150 + Math.sin(a) * 112).toFixed(1)}" r="2.4" fill="${r.colour}" opacity=".5"/>`;
        }).join('')}
      </g>
      <line class="chord" x1="60" y1="150" x2="240" y2="150" stroke="${r.colour}" stroke-width="2"/>
    </svg>
    <div class="inner hero"><div class="art">${HERO}</div></div>
    <div class="inner foe"><div class="art">${creature(68, br.colour)}</div></div>
    <div class="middle"><span class="beatmark cjk"></span></div>
  </div>
  <div class="tags">
    <span><b class="cjk" style="color:${r.colour}">${r.han}</b> 力 ${num(outcome.playerPower)}</span>
    <span class="r"><b class="cjk" style="color:${br.colour}">${beast.han}</b> 力 ${num(beastPower(beast))}</span>
  </div>
</div>`;

const PROPOSALS = [
  {
    key: 'a', han: '對', name: 'O Frente a Frente',
    idea: 'Dois lutadores num sítio, virados um para o outro.',
    text: `O que falta à janela de agora é <b>espaço entre os dois</b>. Aqui há chão, há
      horizonte, e há um vão no meio onde o golpe acontece — o ecrã inteiro abana quando
      a pancada é pesada. As barras de vida descem para junto dos pés, pequenas, porque
      não são elas o espectáculo.`,
    gives: 'Ganha confronto. Perde o espaço vertical grande para cada figura.',
    html: facing,
  },
  {
    key: 'b', han: '境', name: 'Dentro do Reino',
    idea: 'O ecrã todo vira o sítio onde estás. A besta é maior do que tu.',
    text: `Sem lista por trás, sem caixa: montanhas, névoa e chão, na cor do reino. A
      besta ocupa o cimo e tu estás pequeno em baixo — a escala diz sozinha o que uma
      barra diria. <b>Não há barras nenhumas</b>: a besta desfaz-se à medida que perde,
      e a tua aura apaga-se quando levas. Só o número do golpe aparece.`,
    gives: 'A mais imersiva, e a mais dramática. Perde a leitura exacta da vida.',
    html: realmWindow,
  },
  {
    key: 'c', han: '卷', name: 'O Rolo',
    idea: 'A luta lê-se, como uma página de um romance wuxia.',
    text: `Os dois ficam pequenos no topo, com a vida num anel à volta da cara. O corpo
      da janela é um rolo que <b>escreve uma linha por golpe</b> — a mais recente em
      baixo, as antigas a desvanecer para cima. É a opção mais barata de fazer e a que
      mais parece o género.`,
    gives: 'Muita personalidade e texto para ler. Menos acção para ver.',
    html: scroll,
  },
  {
    key: 'd', han: '陣', name: 'O Círculo',
    idea: 'Um objecto só: o anel é o combate todo.',
    text: `O anel é a vida dos dois — a tua metade cresce de um lado, a da besta do
      outro, e encontram-se onde uma está a ganhar. Cada golpe risca uma corda através
      do círculo. É a linguagem que o jogo já tem (o anel do equipamento, as auréolas,
      a órbita da aura) levada ao combate.`,
    gives: 'Gráfica, limpa, muito legível de relance. Menos «mundo».',
    html: formation,
  },
];

const page = `<title>戰 Quatro Janelas de Combate</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; --hue:${r.colour}; --foe:${br.colour}; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.6 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:760px; margin:0 auto; padding-block:40px 80px;
           padding-left:18px; padding-right:18px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2 { margin:0; font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(38px,11vw,54px); font-weight:400;
       color:var(--cyan); line-height:1.02; }
  h2 { font-family:Rajdhani,sans-serif; font-size:27px; }
  p { margin:0; }
  .sub { color:var(--faint); font-size:17px; margin-top:8px; }
  .says { color:var(--faint); max-width:52ch; font-size:15.5px; }
  .says b { color:var(--text); font-weight:600; }
  .tag { font-size:11px; letter-spacing:.22em; text-transform:uppercase;
         color:var(--cyan); font-weight:600; }

  .prop { margin-top:46px; border-top:1px solid var(--line); padding-top:26px;
          display:grid; gap:16px; }
  @media(min-width:680px){ .prop { grid-template-columns:1fr 340px; align-items:start; } }
  .prop > .said { display:flex; flex-direction:column; gap:11px; }
  .title { display:flex; gap:12px; align-items:baseline; }
  .title .han { font-family:'Noto Serif SC',serif; font-size:40px; color:var(--cyan);
                line-height:1; }
  .idea { font-size:15px; color:var(--text); }
  .gives { font-size:13px; color:var(--gold); font-family:Rajdhani,sans-serif;
           font-weight:600; border-left:2px solid var(--gold); padding-left:11px; }

  /* the phone the window lives in */
  .phone { width:100%; max-width:340px; margin:0 auto; border:1px solid var(--line);
           border-radius:22px; overflow:hidden; background:#05060F;
           box-shadow:0 20px 60px rgba(0,0,0,.6); }
  .win { position:relative; height:480px; overflow:hidden; background:#05060F; }
  .win .art svg { display:block; width:100%; height:100%; }
  .dmg { position:absolute; font-family:Rajdhani,sans-serif; font-weight:700;
         font-size:23px; text-shadow:0 2px 12px #000; pointer-events:none;
         animation:rise .95s ease-out forwards; }
  @keyframes rise {
    0% { transform:translate(-50%,0); opacity:0; }
    15% { opacity:1; }
    100% { transform:translate(-50%,-52px); opacity:0; }
  }

  /* ── A 對 ── */
  .a .scene { position:absolute; inset:0 0 92px; }
  .a .sky { position:absolute; inset:0; width:100%; height:100%; }
  /* Both fighters stand on the floor line, which sits 52px up from the scene's foot.
     They need different offsets because the drawings sit differently in their boxes:
     the cultivator's feet are well inside theirs, the centipede's reach the edge. */
  .a .duel { position:absolute; inset:0; display:grid; grid-template-columns:1fr 76px 1fr;
             align-items:end; padding:0 8px 14px; }
  .a .fighter { display:grid; place-items:center; }
  .a .hero .art { width:132px; height:132px; }
  .a .foe .art { width:96px; height:96px; display:grid; place-items:center; margin-bottom:30px;
                 filter:drop-shadow(0 0 16px color-mix(in srgb,var(--foe) 55%,transparent)); }
  .a .gap { position:relative; height:120px; margin-bottom:24px; }
  .a .streak { position:absolute; left:-30px; right:-30px; top:46%; height:2px; opacity:0;
               background:linear-gradient(90deg,transparent,currentColor,transparent); }
  .a .mark { position:absolute; left:50%; top:46%; translate:-50% -50%; opacity:0;
             font-family:'Noto Serif SC',serif; font-size:22px; font-weight:400;
             text-shadow:0 0 18px currentColor; }
  .a[data-by='p'] .gap { color:var(--hue); }
  .a[data-by='b'] .gap { color:var(--foe); }
  .a .feet { position:absolute; left:0; right:0; bottom:0; height:92px; padding:14px 16px;
             display:grid; grid-template-columns:1fr 1fr; gap:10px 18px; align-content:center;
             background:linear-gradient(180deg,transparent,#05060F 42%); }
  .a .who { display:flex; flex-direction:column; gap:6px; }
  .a .who.r { text-align:right; }
  .a .nm { font-size:12px; color:var(--faint); font-family:Rajdhani,sans-serif; font-weight:600; }
  .a .nm b { font-size:15px; margin-right:5px; font-weight:400; }
  .a .bar { height:5px; border-radius:99px; background:var(--line); overflow:hidden; }
  .a .who.r .bar { display:flex; justify-content:flex-end; }
  .a .hp { display:block; height:100%; border-radius:99px; transition:width .3s ease-out; }
  .a .hp.p { background:var(--cyan); width:100%; }
  .a .hp.b { background:var(--magenta); width:100%; }
  .a[data-shake='1'] .scene { animation:shake .22s ease-out; }
  @keyframes shake {
    0%,100% { transform:translate(0,0); }
    25% { transform:translate(-4px,2px); }
    60% { transform:translate(3px,-1px); }
  }
  .a[data-by='p'] .hero .art { animation:lungeR .3s ease-out; }
  .a[data-by='b'] .foe .art { animation:lungeL .3s ease-out; }
  @keyframes lungeR { 0%,100%{transform:translateX(0)} 35%{transform:translateX(16px) scale(1.05)} }
  @keyframes lungeL { 0%,100%{transform:translateX(0)} 35%{transform:translateX(-16px) scale(1.05)} }

  /* ── B 境 ── */
  .b .land { position:absolute; inset:0; width:100%; height:100%; }
  /* Haze over the near ground, brightest where the cultivator stands. It sits above the
     dark band rather than on its edge — as a hard edge it read as a painted bar. */
  /* The haze must run to the bottom of the window. Ending its box above the floor cut
     the gradient off while it was still bright, which drew a hard bar across the screen. */
  .b .mist { position:absolute; left:0; right:0; bottom:0; height:210px; pointer-events:none;
             background:radial-gradient(48% 62% at 50% 74%, color-mix(in srgb,var(--hue) 20%,transparent), transparent 74%); }
  .b .looming { position:absolute; left:50%; top:74px; translate:-50% 0;
                filter:drop-shadow(0 0 34px color-mix(in srgb,var(--foe) 45%,transparent));
                transition:opacity .4s ease-out, filter .4s ease-out; }
  /* The seated figure's legs sit a fifth of the way up its own box, so it needs to be
     lifted or the horizon runs through its waist. */
  .b .small { position:absolute; left:50%; bottom:32px; translate:-50% 0;
              width:96px; height:96px; transition:opacity .4s; }
  .b .tell { position:absolute; left:0; right:0; top:16px; text-align:center; }
  .b .tell span { font-size:26px; display:block; line-height:1.1; }
  .b .tell em { font-style:normal; font-size:11px; letter-spacing:.2em; color:var(--faint);
                text-transform:uppercase; }
  .b[data-by='p'] .looming { animation:reel .34s ease-out; }
  .b[data-by='b'] .small { animation:reelSmall .34s ease-out; }
  @keyframes reel { 0%,100%{transform:translateY(0) rotate(0)} 30%{transform:translateY(10px) rotate(-3deg)} }
  @keyframes reelSmall { 0%,100%{transform:scale(1)} 30%{transform:scale(.93)} }

  /* ── C 卷 ── */
  .c { display:flex; flex-direction:column; }
  .c .heads { display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
              gap:10px; padding:16px 18px 12px; }
  .c .head { display:flex; align-items:center; gap:9px; }
  .c .head.r { flex-direction:row-reverse; }
  .c .ring { position:relative; width:48px; height:48px; flex:none; display:grid;
             place-items:center; }
  .c .gauge { position:absolute; inset:0; width:48px; height:48px; }
  .c .ring .art { width:26px; height:26px; display:grid; place-items:center; }
  .c .ring .art svg { width:26px; height:26px; }
  .c .arc { stroke-dasharray:131.9; stroke-dashoffset:0; transition:stroke-dashoffset .3s ease-out; }
  .c .head b { font-size:19px; }
  .c .vs { color:var(--faint); font-size:15px; }
  .c .paper { flex:1; margin:0 14px 14px; border-radius:12px; overflow:hidden; position:relative;
              background:linear-gradient(180deg,#0A0C1E,#0C0F26);
              border:1px solid var(--line); }
  .c .paper::before { content:''; position:absolute; inset:0; pointer-events:none;
                      background:linear-gradient(180deg,#0A0C1E 0%,transparent 26%); z-index:2; }
  .c .lines { position:absolute; left:0; right:0; bottom:0; padding:14px 16px 16px;
              display:flex; flex-direction:column; gap:11px; }
  .c .ln { display:flex; gap:10px; align-items:baseline; animation:write .4s ease-out both; }
  .c .ln .say { flex:1; font-size:13.5px; line-height:1.45; }
  .c .ln .say i { font-style:normal; display:block; font-size:11px; color:var(--faint); }
  .c .ln .n { font-family:Rajdhani,sans-serif; font-weight:700; font-size:15px; }
  @keyframes write { from { opacity:0; transform:translateY(9px); } to { opacity:1; transform:none; } }

  /* ── D 陣 ── */
  .d { display:grid; place-items:center; }
  .d .circle { position:relative; width:300px; height:300px; }
  .d .circle > svg { width:300px; height:300px; display:block; }
  .d .arc { stroke-dasharray:402.1; stroke-dashoffset:0; transition:stroke-dashoffset .35s ease-out; }
  .d .spin { animation:turn 26s linear infinite; }
  @keyframes turn { to { transform:rotate(360deg); } }
  .d .chord { opacity:0; }
  .d[data-by='p'] .chord { animation:cut .34s ease-out; stroke:var(--hue); }
  .d[data-by='b'] .chord { animation:cut .34s ease-out; stroke:var(--foe); }
  @keyframes cut { 0%{opacity:0;transform:scaleX(.1)} 30%{opacity:1;transform:scaleX(1)} 100%{opacity:0} }
  .d .inner { position:absolute; top:50%; translate:0 -50%; display:grid; place-items:center; }
  .d .inner.hero { left:14px; width:96px; height:96px; }
  .d .inner.foe { right:18px; width:76px; height:76px;
                  filter:drop-shadow(0 0 14px color-mix(in srgb,var(--foe) 50%,transparent)); }
  .d .middle { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
  .d .beatmark { font-family:'Noto Serif SC',serif; font-size:26px; opacity:0;
                 text-shadow:0 0 20px currentColor; }
  .d[data-by='p'] .beatmark { color:var(--hue); animation:pop .34s ease-out; }
  .d[data-by='b'] .beatmark { color:var(--foe); animation:pop .34s ease-out; }
  @keyframes pop { 0%{opacity:0;transform:scale(.5)} 30%{opacity:.95;transform:scale(1)} 100%{opacity:0;transform:scale(1.5)} }
  .d .tags { position:absolute; left:0; right:0; bottom:22px; display:flex;
             justify-content:space-between; padding:0 22px; font-size:12px;
             color:var(--faint); font-family:Rajdhani,sans-serif; font-weight:600; }
  .d .tags b { font-size:16px; margin-right:5px; font-weight:400; }
  .d[data-by='p'] .inner.foe { animation:knock .3s ease-out; }
  .d[data-by='b'] .inner.hero { animation:knock .3s ease-out; }
  @keyframes knock { 0%,100%{transform:translateX(0)} 30%{transform:translateX(7px)} 60%{transform:translateX(-4px)} }

  .end { margin-top:52px; border-top:1px solid var(--line); padding-top:26px; }
</style>

<div class="sheet">
  <header>
    <h1>戰</h1>
    <p class="sub">Quatro janelas de combate. Todas a correr a mesma luta.</p>
    <p class="says" style="margin-top:14px">A de agora são duas figuras empilhadas por
      cima da lista de caça com transparência — lê-se como uma caixa de diálogo sobre uma
      lista, não como uma luta. Estas quatro são respostas diferentes à mesma pergunta, e
      cada uma abdica de coisa diferente. Diz-me qual (ou quais partes de quais).</p>
  </header>

  ${PROPOSALS.map((p, i) => `<section class="prop">
    <div class="said">
      <p class="tag">Proposta ${i + 1}</p>
      <div class="title">
        <span class="han cjk">${p.han}</span>
        <h2>${p.name}</h2>
      </div>
      <p class="idea">${p.idea}</p>
      <p class="says">${p.text}</p>
      <p class="gives">${p.gives}</p>
    </div>
    <div class="phone">${p.html}</div>
  </section>`).join('')}

  <div class="end">
    <p class="says">Todas elas usam o desenho do cultivador e da besta que o jogo já tem,
      e a luta que estás a ver é a que o simulador dá de verdade —
      ${r.han} reino ${REALM} contra ${beast.han}, ${outcome.rounds.length} rondas.</p>
  </div>
</div>

<script>
/* The same fight, played into whichever window asked for it. */
const BEATS = ${JSON.stringify(BEATS.map((x) => ({ ...x, n: num(x.dmg) })))};
const HERO_HAN = ${JSON.stringify(r.han)};
const FOE_HAN = ${JSON.stringify(beast.han)};
const FOE_NAME = ${JSON.stringify(beast.name)};
/* Two registers: what you do, and what it does back. A line that says the body sways
   while *you* are the one swinging reads as a bug, because it is one. */
const MINE = [
  ['劍光掠過', 'you strike — the blade light passes'],
  ['一步踏出', 'you strike — one step forward'],
  ['氣勢壓下', 'you strike — the pressure comes down'],
  ['掌風如雷', 'you strike — the palm wind like thunder'],
];
const THEIRS = [
  ['爪牙撲來', 'it answers — claws come on'],
  ['硬接一記', 'it answers — the blow is taken'],
  ['身形一晃', 'it answers — your body sways'],
  ['毒尾橫掃', 'it answers — the tail sweeps across'],
];

const DELAY = 480;

function play(el) {
  const demo = el.dataset.demo;
  let i = 0;
  const lines = el.querySelector('.lines');

  function beat() {
    const b = BEATS[i % BEATS.length];
    const fresh = i % BEATS.length === 0;
    el.dataset.by = b.by;
    el.dataset.shake = b.dmg > 4e5 ? '1' : '0';

    // Health, however this window happens to show it.
    const hp = fresh ? 1 : b.hp;
    const hb = fresh ? 1 : b.hb;
    el.querySelectorAll('.hp.p').forEach((x) => { x.style.width = (hp * 100) + '%'; });
    el.querySelectorAll('.hp.b').forEach((x) => { x.style.width = (hb * 100) + '%'; });
    // Both windows that draw health as an arc drain it the same way: the whole stroke
    // is one life, and the dash offset is how much of it is gone.
    const LEN = demo === 'd' ? 402.1 : 131.9;
    el.querySelectorAll('.arc.p').forEach((x) => { x.style.strokeDashoffset = LEN * (1 - hp); });
    el.querySelectorAll('.arc.b').forEach((x) => { x.style.strokeDashoffset = LEN * (1 - hb); });

    // 境 has no bars: the beast dissolves, the cultivator dims.
    const looming = el.querySelector('.looming');
    if (looming) looming.style.opacity = (0.28 + 0.72 * hb).toFixed(2);
    const small = el.querySelector('.small');
    if (small) small.style.opacity = (0.35 + 0.65 * hp).toFixed(2);

    // The mark thrown between them.
    const mark = el.querySelector('.mark');
    if (mark) {
      mark.textContent = b.by === 'p' ? '擊' : '反';
      mark.style.animation = 'none'; void mark.offsetWidth;
      mark.style.animation = 'pop .34s ease-out';
    }
    const streak = el.querySelector('.streak');
    if (streak) {
      streak.style.animation = 'none'; void streak.offsetWidth;
      streak.style.animation = 'cut .3s ease-out';
    }
    const bm = el.querySelector('.beatmark');
    if (bm) bm.textContent = b.by === 'p' ? '擊' : '反';

    // The floating number, wherever this window puts it.
    if (demo !== 'c') {
      const hit = document.createElement('span');
      hit.className = 'dmg';
      hit.textContent = '−' + b.n;
      const onFoe = b.by === 'p';
      hit.style.color = onFoe ? 'var(--cyan)' : 'var(--magenta)';
      // The number lands on whoever took it, not in the middle of the sky.
      if (demo === 'a') { hit.style.left = onFoe ? '77%' : '23%'; hit.style.top = '52%'; }
      if (demo === 'b') { hit.style.left = '50%'; hit.style.top = onFoe ? '34%' : '70%'; }
      if (demo === 'd') { hit.style.left = onFoe ? '74%' : '26%'; hit.style.top = '40%'; }
      el.appendChild(hit);
      setTimeout(() => hit.remove(), 950);
    }

    // 卷 writes the blow instead of showing it.
    if (lines) {
      if (fresh) lines.innerHTML = '';
      const pool = b.by === 'p' ? MINE : THEIRS;
      const say = pool[Math.floor(i / 2) % pool.length];
      const ln = document.createElement('div');
      ln.className = 'ln';
      ln.innerHTML = '<span class="say"><span class="cjk">' + say[0] + '</span>' +
        '<i>' + say[1] + '</i></span>' +
        '<span class="n" style="color:' + (b.by === 'p' ? 'var(--cyan)' : 'var(--magenta)') + '">−' + b.n + '</span>';
      lines.appendChild(ln);
      while (lines.children.length > 5) lines.removeChild(lines.firstChild);
    }

    i++;
    setTimeout(beat, i % BEATS.length === 0 ? DELAY * 3 : DELAY);
  }
  beat();
}

document.querySelectorAll('.win').forEach((el, i) => setTimeout(() => play(el), i * 160));
</script>`;

writeFileSync('arena.html', page);
console.log(`arena.html — ${(page.length / 1024).toFixed(0)} KB · ${outcome.rounds.length} rounds, ${BEATS.length} beats`);
