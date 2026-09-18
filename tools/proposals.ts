/**
 * Three visual proposals for a simple vertical-progression idle, drawn with real
 * licensed art instead of generated geometry.
 *
 * The art is game-icons.net (CC BY 3.0, 4,239 SVG icons, cloned from the project's own
 * repository). Every icon there is one white silhouette on a black square, which is
 * exactly the right raw material: strip the square, set the fill to currentColor, and
 * the same icon serves every palette. That is what makes three genuinely different
 * looks possible from one asset set — and what makes a fourth possible later without
 * redrawing anything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ICONS = '/home/user/game-icons/icons';

/** Strip the black backing square and hand the silhouette over to CSS colour. */
function icon(name: string): string {
  const path = execSync(`find ${ICONS} -name '${name}.svg' | head -1`).toString().trim();
  if (!path) throw new Error(`icon not found: ${name}`);
  return readFileSync(path, 'utf8')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/<path d="M0 0h512v512H0z"\s*\/>/, '')
    .replace(/fill="#fff"/g, '')
    .trim();
}

interface Realm {
  readonly han: string;
  readonly name: string;
  readonly icon: string;
}

/**
 * The canonical cultivation ladder. These nine are genre-standard — every xianxia
 * reader knows them in order, the way a player knows levels 1 to 9 — so they are the
 * one thing worth keeping from any previous attempt.
 */
const REALMS: readonly Realm[] = [
  { han: '練氣', name: 'Refino de Qi',     icon: 'meditation' },
  { han: '築基', name: 'Fundação',         icon: 'lotus' },
  { han: '金丹', name: 'Núcleo Dourado',   icon: 'dragon-orb' },
  { han: '元嬰', name: 'Alma Nascente',    icon: 'spiral-bloom' },
  { han: '化神', name: 'Transformação',    icon: 'yin-yang' },
  { han: '煉虛', name: 'Refino do Vazio',  icon: 'crystal-shrine' },
  { han: '合體', name: 'Unidade',          icon: 'pagoda' },
  { han: '大乘', name: 'Grande Veículo',   icon: 'beams-aura' },
  { han: '渡劫', name: 'Tribulação',       icon: 'lightning-helix' },
];

const TOOLS = [
  { han: '劍訣', icon: 'katana', lv: 14 },
  { han: '功法', icon: 'scroll-unfurled', lv: 9 },
  { han: '丹藥', icon: 'fire-gem', lv: 6 },
  { han: '妖丹', icon: 'tiger-head', lv: 3 },
];

const AT = 4;          // the player is in the fourth realm
const LAYER = 6;       // sixth of its nine layers
const PROGRESS = 0.62;

interface Theme {
  readonly id: string;
  readonly han: string;
  readonly name: string;
  readonly blurb: string;
  readonly trade: string;
  readonly t: Record<string, string>;
}

const THEMES: readonly Theme[] = [
  {
    id: 'gold', han: '金', name: 'Ouro sobre laca',
    blurb: 'Laca quase preta, folha de ouro, molduras finas. É o visual que o gênero espera — o mesmo registro de AFK Arena ou Idle Heroes, mas contido em vez de carregado.',
    trade: 'O mais seguro e o mais rápido de executar: os ícones já vêm prontos para ouro. Também é o mais parecido com o que já existe no mercado.',
    t: {
      bg: '#0E0B08', panel: '#181310', line: '#2E241C', accent: '#D8B15C',
      accent2: '#B8763A', text: '#EFE3CB', muted: '#907F63', locked: '#3D342A',
      font: "'Cinzel', Georgia, serif", radius: '3px', shadow: '0 0 0 1px #2E241C',
    },
  },
  {
    id: 'jade', han: '玉', name: 'Jade sobre papel',
    blurb: 'Papel quente, celadon e tinta, formas arredondadas e muito ar. Claro num gênero que é escuro por hábito — e nenhum idle de cultivo parece com isto.',
    trade: 'O mais distinto dos três e o mais fácil de ler no sol. Exige contenção: com tanto branco, qualquer elemento mal alinhado aparece.',
    t: {
      bg: '#F2EEE3', panel: '#FFFFFF', line: '#E2DCCE', accent: '#3F8468',
      accent2: '#B7603C', text: '#23302B', muted: '#7E8A82', locked: '#C8CDC5',
      font: "'Noto Serif SC', Georgia, serif", radius: '14px', shadow: '0 1px 2px rgba(35,48,43,.07), 0 6px 18px rgba(35,48,43,.05)',
    },
  },
  {
    id: 'neon', han: '霓', name: 'Neon noturno',
    blurb: 'Índigo profundo, ciano e magenta com brilho. Xianxia moderno, registro de Solo Leveling: a mesma escada, lida como interface de sistema.',
    trade: 'O que mais atrai jogador de anime hoje, e o mais fácil de exagerar. Se cada elemento brilhar, nada brilha.',
    t: {
      bg: '#080A18', panel: '#111433', line: '#252A5C', accent: '#5FDCFF',
      accent2: '#FF5FC8', text: '#E7EAFF', muted: '#7A80B8', locked: '#2C3268',
      font: "'Rajdhani', 'Archivo', sans-serif", radius: '6px', shadow: '0 0 22px rgba(95,220,255,.13)',
    },
  },
];

const symbols = [...new Set([...REALMS.map((r) => r.icon), ...TOOLS.map((t) => t.icon)])]
  .map((n) => `<symbol id="i-${n}" viewBox="0 0 512 512">${icon(n)}</symbol>`)
  .join('');

const use = (n: string, size: number) =>
  `<svg class="ic" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

function screen(th: Theme): string {
  const rows = REALMS.map((r, i) => {
    const n = i + 1;
    const state = n < AT ? 'done' : n === AT ? 'now' : 'locked';
    return `<li class="rung" data-state="${state}">
      <span class="rung-ic">${use(r.icon, state === 'now' ? 30 : 22)}</span>
      <span class="rung-txt">
        <b>${r.han}</b><i>${r.name}</i>
      </span>
      ${state === 'now'
        ? `<span class="rung-layer">${LAYER}<em>/9</em></span>`
        : state === 'done'
          ? `<span class="rung-done">✓</span>`
          : `<span class="rung-lock"></span>`}
    </li>`;
  }).reverse().join('');

  return `<div class="phone" data-th="${th.id}">
    <div class="hd">
      <span class="hd-realm">${use(REALMS[AT - 1].icon, 18)} <b>${REALMS[AT - 1].han}</b> <i>camada ${LAYER}</i></span>
      <span class="hd-day">dia 12</span>
    </div>

    <div class="qi">
      <span class="qi-n">1,24<em>M</em></span>
      <span class="qi-r">+842 qi / s</span>
      <div class="bar"><i style="width:${PROGRESS * 100}%"></i></div>
    </div>

    <ol class="ladder">${rows}</ol>

    <div class="tools">
      ${TOOLS.map((t) => `<span class="tool">${use(t.icon, 26)}<b>${t.han}</b><i>${t.lv}</i></span>`).join('')}
    </div>

    <button class="cta">突破 <span>Romper</span></button>
  </div>`;
}

const cards = THEMES.map((th, i) => `
  <article class="prop">
    <div class="prop-hd">
      <p class="tag">Proposta ${i + 1}</p>
      <h3><span class="cjk">${th.han}</span> ${th.name}</h3>
    </div>
    ${screen(th)}
    <div class="prop-txt">
      <p>${th.blurb}</p>
      <p class="trade">${th.trade}</p>
    </div>
  </article>`).join('');

const themeCss = THEMES.map((th) => {
  const v = Object.entries(th.t).map(([k, x]) => `--${k}:${x}`).join(';');
  return `.phone[data-th="${th.id}"]{${v}}`;
}).join('\n');

const page = `<title>Três Propostas Visuais</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Cinzel:wght@400;600&family=Newsreader:opsz,wght@6..72,300;6..72,500&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@500;600;700&display=swap">
<style>
  :root {
    --ground:#F5F4F1; --raised:#FFF; --ink:#16181B; --body:#3B3E43; --soft:#71757B;
    --rule:#DFDEDA; --flag:#8C3A2A;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground:#121315; --raised:#1A1C1F; --ink:#F1F0ED; --body:#BABDC2; --soft:#888C92;
      --rule:#2B2E32; --flag:#E08163; color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --ground:#121315; --raised:#1A1C1F; --ink:#F1F0ED; --body:#BABDC2; --soft:#888C92;
    --rule:#2B2E32; --flag:#E08163; color-scheme: dark;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--body);
       font-family:Archivo,ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.62}
  .wrap{max-width:1040px;margin:0 auto;padding-block:46px 84px;padding-left:20px;padding-right:20px}
  .cjk{font-family:'Noto Serif SC',serif}
  h1,h2,h3{color:var(--ink);font-weight:500;margin:0;text-wrap:balance}
  h1{font-family:Newsreader,Georgia,serif;font-size:clamp(32px,7vw,46px);line-height:1.1}
  h2{font-family:Newsreader,Georgia,serif;font-size:27px;margin-bottom:4px}
  h3{font-family:Newsreader,Georgia,serif;font-size:21px}
  p{margin:0}
  .lede{font-family:Newsreader,Georgia,serif;font-size:20px;line-height:1.5;color:var(--ink);margin-top:14px}
  section{border-top:1px solid var(--rule);padding-top:30px;margin-top:46px;
          display:flex;flex-direction:column;gap:16px}
  .kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--soft);font-weight:600}
  .note{border-left:2px solid var(--flag);padding:2px 0 2px 15px}
  .note b{color:var(--ink);font-weight:600}
  ul.plain{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px}

  .props{display:grid;gap:40px}
  @media(min-width:900px){.props{grid-template-columns:repeat(3,1fr);gap:26px}}
  .prop{display:flex;flex-direction:column;gap:14px}
  .tag{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--soft);font-weight:600}
  .prop-txt{display:flex;flex-direction:column;gap:9px;font-size:14.5px}
  .trade{color:var(--soft)}

  /* ── the phone ──────────────────────────────────────────────────────────── */
  ${themeCss}
  .phone{
    background:var(--bg);color:var(--text);border-radius:18px;padding:16px 15px 18px;
    display:flex;flex-direction:column;gap:13px;font-family:var(--font);
    border:1px solid var(--line);max-width:330px;width:100%;margin-inline:auto;
  }
  .ic{fill:currentColor;display:block}

  .hd{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted)}
  .hd-realm{display:flex;align-items:center;gap:6px;color:var(--accent)}
  .hd-realm b{font-family:'Noto Serif SC',serif;font-size:15px}
  .hd-realm i{font-style:normal;color:var(--muted);font-size:11.5px}

  .qi{display:flex;flex-direction:column;gap:6px;align-items:center;padding:6px 0 2px}
  .qi-n{font-size:34px;line-height:1;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:.01em}
  .qi-n em{font-style:normal;font-size:19px;color:var(--accent);margin-left:2px}
  .qi-r{font-size:12.5px;color:var(--accent);font-variant-numeric:tabular-nums}
  .bar{width:100%;height:5px;border-radius:99px;background:var(--locked);overflow:hidden;margin-top:4px}
  .bar i{display:block;height:100%;border-radius:99px;background:var(--accent);box-shadow:var(--shadow)}

  .ladder{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
  .rung{display:flex;align-items:center;gap:10px;padding:6px 9px;border-radius:var(--radius);
        color:var(--muted)}
  .rung-ic{display:grid;place-items:center;width:30px;flex:none}
  .rung-txt{flex:1;display:flex;align-items:baseline;gap:7px;min-width:0}
  .rung-txt b{font-family:'Noto Serif SC',serif;font-size:14px;font-weight:600}
  .rung-txt i{font-style:normal;font-size:11px;color:var(--muted);overflow:hidden;
              text-overflow:ellipsis;white-space:nowrap}
  .rung[data-state="done"]{color:var(--accent2)}
  .rung[data-state="done"] .rung-txt i{opacity:.75}
  .rung[data-state="locked"]{color:var(--locked)}
  .rung[data-state="locked"] .rung-txt i{color:var(--locked)}
  .rung[data-state="now"]{background:var(--panel);color:var(--accent);
                          box-shadow:var(--shadow);padding-block:9px}
  .rung[data-state="now"] .rung-txt b{font-size:16px}
  .rung[data-state="now"] .rung-txt i{color:var(--text);opacity:.8}
  .rung-layer{font-size:15px;color:var(--accent);font-variant-numeric:tabular-nums}
  .rung-layer em{font-style:normal;font-size:10.5px;color:var(--muted)}
  .rung-done{font-size:12px}
  .rung-lock{width:5px;height:5px;border-radius:99px;background:var(--locked)}

  .tools{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:2px}
  .tool{background:var(--panel);border-radius:var(--radius);padding:9px 4px 7px;
        display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--accent);
        box-shadow:var(--shadow)}
  .tool b{font-family:'Noto Serif SC',serif;font-size:10.5px;color:var(--text);font-weight:400}
  .tool i{font-style:normal;font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}

  .cta{font:inherit;font-size:17px;padding:13px;border-radius:var(--radius);cursor:pointer;
       background:var(--accent);color:var(--bg);border:0;letter-spacing:.04em;
       font-family:'Noto Serif SC',serif}
  .cta span{font-family:Archivo,sans-serif;font-size:12.5px;letter-spacing:.14em;
            text-transform:uppercase;opacity:.72;margin-left:7px}
  .phone[data-th="jade"] .cta{color:#FFF}
  .phone[data-th="neon"] .cta{color:#080A18;box-shadow:0 0 26px rgba(95,220,255,.3)}
</style>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${symbols}</defs></svg>

<div class="wrap">
  <header>
    <p class="kicker">Idle de cultivo · progressão vertical</p>
    <h1>Três propostas visuais</h1>
    <p class="lede">A mesma tela, três mundos. Arte de verdade desta vez — 4.239 ícones vetoriais licenciados, não geometria que eu inventei.</p>
  </header>

  <section>
    <p class="kicker">O jogo, agora simples</p>
    <h2>Número sobe, você sobe de reino</h2>
    <p>Fora a ideia da montanha, da pressão e da aposta. O que ficou é o idle clássico, e só:</p>
    <ul class="plain">
      <li>O qi acumula sozinho, inclusive com o app fechado.</li>
      <li>Nove reinos, nove camadas cada. A barra enche, você <b class="cjk">突破</b> rompe, e a taxa multiplica.</li>
      <li>O qi é gasto em quatro coisas: técnica de espada, método, pílulas e núcleos de feras. Cada uma multiplica a taxa.</li>
      <li>Sem penalidade, sem perder progresso, sem nada correndo contra você.</li>
    </ul>
    <p>A escada dos nove reinos é a tela principal, e é literalmente vertical. Os nomes dos reinos são os canônicos do gênero — todo leitor de xianxia sabe a ordem de cor, como se sabe nível 1 a 9.</p>
  </section>

  <section>
    <p class="kicker">De onde vem a arte</p>
    <h2>game-icons.net</h2>
    <p>4.239 ícones vetoriais, licença Creative Commons BY 3.0 — uso comercial liberado, basta creditar os autores. Já clonei o repositório: <b class="cjk">打坐</b> meditação, lótus, yin-yang, pagode, orbe de dragão, santuário de cristal, cabeça de tigre, hélice de raio.</p>
    <p>Cada ícone é uma silhueta branca sobre quadrado preto. Removendo o quadrado, a silhueta aceita qualquer cor — é por isso que as três propostas abaixo usam <em>os mesmos arquivos</em> e não se parecem em nada. E é por isso que uma quarta proposta não custa redesenhar nada.</p>
    <p class="note"><b>O que não achei:</b> arte de personagem anime gratuita com licença confiável. Existem sprites de hanfu para visual novel no itch.io, mas a licença varia pacote a pacote e a qualidade é irregular. Se o jogo precisa de retrato de personagem ilustrado, isso é a única parte que provavelmente se compra ou se encomenda.</p>
  </section>

  <section>
    <p class="kicker">Escolha por número</p>
    <h2>As três</h2>
    <div class="props">${cards}</div>
  </section>

  <section>
    <p class="kicker">Créditos obrigatórios</p>
    <h2>A licença, em uma linha</h2>
    <p>CC BY 3.0 pede crédito aos autores dos ícones usados — Lorc, Delapouite, Caro Asercion e outros — numa tela de créditos do app. Não pede nada além disso: pode vender, pode modificar, pode recolorir. Alguns autores do mesmo acervo liberam em CC0, sem exigir crédito.</p>
  </section>
</div>`;

writeFileSync('proposals.html', page);
console.log(`proposals.html — ${(page.length / 1024).toFixed(0)} KB, ${THEMES.length} themes`);
