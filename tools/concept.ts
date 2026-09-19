/**
 * 九境 The cultivator through nine realms, and the nine that guard them.
 *
 * Bruno picked the neon direction and asked for the thing that actually sells a
 * cultivation game: a figure whose *aura* escalates visibly as it climbs. This builds
 * that from the same licensed icon set — one seated silhouette, with aura elements
 * layered behind it and a hue that walks cyan → violet → magenta up the ladder.
 *
 * The point is that a realm is legible at a glance, from the aura alone, with no text.
 * That is the reward for breaking through, and it is the thing a player screenshots.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ICONS = '/home/user/game-icons/icons';

function mixHex(a: string, b: string, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  const v = (s: string, i: number) => parseInt(s.slice(1 + i, 3 + i), 16);
  const ch = (i: number) => Math.round(v(a, i) * (1 - t) + v(b, i) * t);
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`;
}

function icon(name: string): string {
  const p = execSync(`find ${ICONS} -name '${name}.svg' | head -1`).toString().trim();
  if (!p) throw new Error(`missing icon: ${name}`);
  return readFileSync(p, 'utf8')
    .replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')
    .replace(/<path d="M0 0h512v512H0z"\s*\/>/, '')
    .replace(/fill="#fff"/g, '')
    .trim();
}

interface Realm {
  readonly n: number;
  readonly han: string;
  readonly name: string;
  readonly hue: string;
  /** Aura icons layered behind the figure, outermost first. */
  readonly aura: readonly string[];
  /** Clean rings drawn behind the figure — a halo reads better drawn than as an icon. */
  readonly halos: number;
  /** What arrives at this realm, in one clause. */
  readonly gains: string;
  readonly beast: { readonly han: string; readonly name: string; readonly icon: string };
}

const REALMS: readonly Realm[] = [
  { n: 1, han: '練氣', name: 'Refino de Qi', hue: '#5FDCFF', aura: [], halos: 0,
    gains: 'nada ainda — só a respiração',
    beast: { han: '妖狐', name: 'Raposa espiritual', icon: 'fox-head' } },
  { n: 2, han: '築基', name: 'Fundação', hue: '#5FC4FF', aura: ['aura'], halos: 0,
    gains: 'o primeiro brilho, fraco e constante',
    beast: { han: '青蛇', name: 'Serpente verde', icon: 'snake' } },
  { n: 3, han: '金丹', name: 'Núcleo Dourado', hue: '#77AEFF', aura: ['aura'], halos: 1,
    gains: '圓光 o halo — o primeiro sinal que se lê de longe',
    beast: { han: '仙鶴', name: 'Grou imortal', icon: 'crane' } },
  { n: 4, han: '元嬰', name: 'Alma Nascente', hue: '#9B9BFF', aura: ['aura', 'sparkles'], halos: 1,
    gains: '塵 motes de qi soltos no ar',
    beast: { han: '雷虎', name: 'Tigre do trovão', icon: 'tiger-head' } },
  { n: 5, han: '化神', name: 'Transformação', hue: '#B587FF', aura: ['rear-aura', 'sparkles'], halos: 1,
    gains: 'a aura ganha corpo atrás do cultivador',
    beast: { han: '玄武', name: 'Tartaruga negra', icon: 'turtle' } },
  { n: 6, han: '煉虛', name: 'Refino do Vazio', hue: '#CC79FF', aura: ['beams-aura', 'rear-aura', 'sparkles'], halos: 1,
    gains: '芒 feixes irradiando do assento',
    beast: { han: '蜈蚣', name: 'Centopeia de ferro', icon: 'centipede' } },
  { n: 7, han: '合體', name: 'Unidade', hue: '#E571F0', aura: ['beams-aura', 'icicles-aura', 'sparkles'], halos: 2,
    gains: 'segundo halo e lâminas de qi em volta',
    beast: { han: '魔狼', name: 'Lobo demoníaco', icon: 'direwolf' } },
  { n: 8, han: '大乘', name: 'Grande Veículo', hue: '#FF63CE', aura: ['rolling-energy', 'beams-aura', 'rear-aura', 'sparkles'], halos: 2,
    gains: 'a energia começa a girar sozinha',
    beast: { han: '蛟', name: 'Dragão-serpente', icon: 'sea-serpent' } },
  { n: 9, han: '渡劫', name: 'Tribulação', hue: '#FF5AA6', aura: ['lightning-helix', 'rolling-energy', 'beams-aura', 'sparkles'], halos: 3,
    gains: '九雷 os nove raios, e o teto do jogo',
    beast: { han: '龍', name: 'Dragão', icon: 'spiked-dragon-head' } },
];

const NEEDED = [...new Set([
  'meditation',
  ...REALMS.flatMap((r) => r.aura),
  ...REALMS.map((r) => r.beast.icon),
])];

const symbols = NEEDED.map((n) => `<symbol id="i-${n}" viewBox="0 0 512 512">${icon(n)}</symbol>`).join('');

/** One realm portrait: glow, aura stack, then the seated figure in front of all of it. */
function portrait(r: Realm): string {
  const S = 190;
  const t = (r.n - 1) / 8;
  const layers = r.aura.map((a, i) => {
    // Outermost aura element is largest and faintest; each one inward tightens and lifts.
    const scale = 2.05 - i * 0.26;
    const size = S * scale;
    const off = (S - size) / 2;
    return `<use href="#i-${a}" x="${off.toFixed(1)}" y="${off.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${r.hue}" opacity="${(0.13 + 0.07 * i + 0.1 * t).toFixed(2)}"/>`;
  }).join('');

  const halos = Array.from({ length: r.halos }, (_, i) =>
    `<circle cx="${S / 2}" cy="${S * 0.42}" r="${(S * (0.17 + i * 0.09)).toFixed(1)}" fill="none" stroke="${r.hue}" stroke-width="${(1.5 - i * 0.4).toFixed(1)}" stroke-opacity="${(0.75 - i * 0.2).toFixed(2)}"/>`,
  ).join('');

  // The figure burns toward white as it climbs, so it stays the brightest thing in the
  // frame no matter how loud the aura behind it gets. The first version let the aura
  // swallow the cultivator by the seventh realm, which inverts the whole point.
  const core = mixHex(r.hue, '#FFFFFF', 0.25 + 0.6 * t);

  return `<svg viewBox="0 0 ${S} ${S}" class="portrait" role="img" aria-label="${r.name}, realm ${r.n}">
    <defs>
      <radialGradient id="g${r.n}">
        <stop offset="0" stop-color="${r.hue}" stop-opacity="${(0.1 + 0.42 * t).toFixed(2)}"/>
        <stop offset="1" stop-color="${r.hue}" stop-opacity="0"/>
      </radialGradient>
      <filter id="b${r.n}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="${(1.4 + 1.9 * t).toFixed(1)}" result="bl"/>
        <feMerge><feMergeNode in="bl"/><feMergeNode in="bl"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="${S}" height="${S}" fill="#0B0E22"/>
    <circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.5}" fill="url(#g${r.n})"/>
    ${halos}
    ${layers}
    <g filter="url(#b${r.n})">
      <use href="#i-meditation" x="${S * 0.27}" y="${S * 0.27}" width="${S * 0.46}" height="${S * 0.46}" fill="${core}"/>
    </g>
    <text x="10" y="${S - 10}" font-size="15" fill="${r.hue}" opacity=".85" font-family="'Noto Serif SC',serif">${r.han}</text>
    <text x="${S - 10}" y="${S - 10}" text-anchor="end" font-size="13" fill="${r.hue}" opacity=".5" font-family="Rajdhani,sans-serif">${r.n}</text>
  </svg>`;
}

function beastCard(r: Realm): string {
  return `<figure class="beast" style="--hue:${r.hue}">
    <div class="beast-ic">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="${r.hue}" stroke-opacity=".28" stroke-width="1"/>
        <circle cx="50" cy="50" r="38" fill="${r.hue}" fill-opacity=".07"/>
        <use href="#i-${r.beast.icon}" x="24" y="24" width="52" height="52" fill="${r.hue}"/>
      </svg>
    </div>
    <figcaption>
      <b class="cjk">${r.beast.han}</b>
      <i>${r.beast.name}</i>
      <span>reino ${r.n} · <span class="cjk">${r.han}</span></span>
    </figcaption>
  </figure>`;
}

const ladder = REALMS.map((r) => `
  <article class="realm">
    ${portrait(r)}
    <div class="realm-txt">
      <h3><span class="cjk" style="color:${r.hue}">${r.han}</span> ${r.name}</h3>
      <p>${r.gains}</p>
    </div>
  </article>`).join('');

const beasts = REALMS.map(beastCard).join('');

const page = `<title>Nove Auras, Nove Bestas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@500;600;700&family=Archivo:wght@400;500&display=swap">
<style>
  /* This page commits to one world on purpose: it *is* the neon direction, so it paints
     every colour explicitly and does not follow the viewer's theme. */
  :root{
    --bg:#070A18; --panel:#0E1230; --line:#242A5E; --cyan:#5FDCFF; --mag:#FF5FC8;
    --text:#E7EAFF; --muted:#8289C0; color-scheme: dark;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
       font-family:Archivo,ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.62}
  .wrap{max-width:900px;margin:0 auto;padding-block:44px 84px;padding-left:20px;padding-right:20px}
  .cjk{font-family:'Noto Serif SC',serif}
  h1,h2,h3{margin:0;color:var(--text);font-weight:600;text-wrap:balance}
  h1{font-family:Rajdhani,sans-serif;font-size:clamp(34px,8vw,52px);line-height:1.05;letter-spacing:.01em}
  h2{font-family:Rajdhani,sans-serif;font-size:28px;letter-spacing:.01em}
  h3{font-family:Rajdhani,sans-serif;font-size:19px;font-weight:600}
  p{margin:0}
  .kicker{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--cyan);font-weight:600}
  .lede{font-size:19px;line-height:1.55;color:var(--muted);margin-top:12px;max-width:62ch}
  section{border-top:1px solid var(--line);padding-top:30px;margin-top:48px;
          display:flex;flex-direction:column;gap:18px}

  .ladder{display:grid;gap:18px;grid-template-columns:repeat(2,1fr)}
  @media(min-width:660px){.ladder{grid-template-columns:repeat(3,1fr)}}
  .realm{display:flex;flex-direction:column;gap:10px;margin:0}
  .portrait{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--line)}
  .realm-txt{display:flex;flex-direction:column;gap:2px}
  .realm-txt h3 .cjk{margin-right:6px;font-size:21px}
  .realm-txt p{font-size:13px;color:var(--muted);line-height:1.45}

  .beasts{display:grid;gap:14px;grid-template-columns:repeat(2,1fr)}
  @media(min-width:560px){.beasts{grid-template-columns:repeat(3,1fr)}}
  .beast{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;
         padding:12px;display:flex;align-items:center;gap:11px}
  .beast-ic{flex:none;width:54px}
  .beast-ic svg{display:block;width:100%;height:auto}
  .beast figcaption{display:flex;flex-direction:column;min-width:0}
  .beast b{font-size:16px;color:var(--hue);font-weight:400}
  .beast i{font-style:normal;font-size:12.5px;color:var(--text)}
  .beast span{font-size:10.5px;color:var(--muted);letter-spacing:.04em}

  .loop{display:grid;gap:12px}
  @media(min-width:620px){.loop{grid-template-columns:repeat(2,1fr)}}
  .step{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:15px 16px;
        display:flex;flex-direction:column;gap:5px}
  .step b{font-family:Rajdhani,sans-serif;font-size:16px;color:var(--cyan);letter-spacing:.02em}
  .step p{font-size:14px;color:var(--muted)}
  .step em{font-style:normal;color:var(--text)}

  .open{border-left:2px solid var(--mag);padding:4px 0 4px 16px;display:flex;flex-direction:column;gap:10px}
  .open b{color:var(--mag);font-family:Rajdhani,sans-serif;font-size:17px}
  .open p{color:var(--muted);font-size:15px}
  .open p em{font-style:normal;color:var(--text)}
</style>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${symbols}</defs></svg>

<div class="wrap">
  <header>
    <p class="kicker">Conceito base · v1</p>
    <h1>Nove auras,<br>nove bestas</h1>
    <p class="lede">Um reino tem de ser legível só pela aura, sem ler uma palavra. É essa a recompensa por romper — e é o que o jogador tira print e manda pros amigos.</p>
  </header>

  <section>
    <p class="kicker">A progressão, vista</p>
    <h2>O cultivador pelos nove reinos</h2>
    <p class="lede" style="margin:0">A figura é sempre a mesma pessoa. O que muda é o ar à volta dela — e a cor, que caminha do ciano ao magenta conforme sobe.</p>
    <div class="ladder">${ladder}</div>
  </section>

  <section>
    <p class="kicker">O guardião de cada reino</p>
    <h2>As nove bestas</h2>
    <p class="lede" style="margin:0">Uma besta por reino. Para romper, você a enfrenta — é o único momento do jogo que não é barra enchendo, e é o que dá motivo para existir equipamento e técnica.</p>
    <div class="beasts">${beasts}</div>
  </section>

  <section>
    <p class="kicker">O laço</p>
    <h2>O que o jogo é, em quatro passos</h2>
    <div class="loop">
      <div class="step"><b>1 · Acumula</b><p>O qi sobe sozinho, com o app aberto ou fechado. Você não precisa estar lá.</p></div>
      <div class="step"><b>2 · Gasta</b><p>Em <em>técnica</em>, <em>método</em>, <em>pílulas</em> e <em>núcleos de fera</em>. Tudo multiplica a taxa. Nada se perde.</p></div>
      <div class="step"><b>3 · Enfrenta</b><p>Cheia a barra do reino, a besta guardiã aparece. Perdeu? Acumula mais e volta. Sem punição.</p></div>
      <div class="step"><b>4 · Rompe</b><p>A aura muda, a cor muda, a taxa multiplica. Um evento visível a cada reino, não só um número maior.</p></div>
    </div>
  </section>

  <section>
    <p class="kicker">Ainda não decidido</p>
    <h2>O que falta combinar</h2>
    <div class="open">
      <p><b>1 · A besta é combate ou cheque?</b> Ela some sozinha se o seu poder for maior, ou você escolhe alguma coisa — usar pílula, disparar técnica, recuar?</p>
      <p><b>2 · Caça livre existe?</b> Só as nove guardiãs, ou também bestas comuns que você caça para material?</p>
      <p><b>3 · Renasce no topo?</b> Chegar no nono reino é o fim, ou você <em class="cjk">轉世</em> renasce com bônus permanente e sobe de novo mais rápido?</p>
      <p><b>4 · Quanto tempo até o topo?</b> Quarenta dias, três meses, um ano? É a decisão mais irreversível — toda a curva sai dela.</p>
    </div>
  </section>

  <section>
    <p class="kicker">Arte</p>
    <h2>De onde vem</h2>
    <p style="color:var(--muted);font-size:15px">Tudo nesta página é game-icons.net, CC BY 3.0, uso comercial liberado com crédito aos autores. A figura sentada é <span class="cjk">打坐</span> <em style="color:var(--text);font-style:normal">meditation</em>, de Lorc; as auras e as bestas vêm do mesmo acervo. A aura é montada em camadas — ícone grande e fraco atrás, menores e mais fortes à frente — com brilho e cor por reino. É por isso que nove reinos diferentes não custaram nove desenhos.</p>
  </section>
</div>`;

writeFileSync('concept.html', page);
console.log(`concept.html — ${(page.length / 1024).toFixed(0)} KB, ${NEEDED.length} icons`);
