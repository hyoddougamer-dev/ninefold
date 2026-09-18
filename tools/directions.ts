/**
 * Five treatments of the same mountain.
 *
 * The first build's art was rejected for being inconsistent; the current one was
 * rejected for being *the same as the build before it* — same lacquer ground, same
 * jade, same generated geometry. So rather than argue a direction, this draws the
 * identical subject five ways and lets it be chosen by looking. The geometry is shared
 * and only the technique varies, which is the one way the comparison stays honest.
 */
import { writeFileSync } from 'node:fs';
import { ridgeline, seeded } from '../src/art/rng.ts';
import { BANDS } from '../src/data/mountain.ts';

const W = 300;
const H = 430;
const N = 9;
const BH = 40;
const TOP = 62;

const f = (n: number) => n.toFixed(1);
const crestY = (n: number) => TOP + (N - n) * BH;

/** The shared silhouette: tents plus noise, identical in every treatment. */
function crest(n: number): [number, number][] {
  const rnd = seeded(`pitch:${n}`);
  const noise = ridgeline(rnd, 6, 0.5, 0.35, 0.35);
  const a = (n - 1) / (N - 1);
  const cx = 0.5 + (rnd() - 0.5) * (0.34 - 0.2 * a);
  const half = 0.92 - 0.5 * a;
  const rise = BH * (0.95 + 0.8 * a);
  const tents = [{ x: cx, w: half, h: 1 }];
  for (let i = 0, k = 1 + Math.floor(rnd() * 3); i < k; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    tents.push({
      x: cx + side * (0.22 + rnd() * 0.5) * half,
      w: half * (0.3 + rnd() * 0.45),
      h: 0.42 + rnd() * 0.4,
    });
  }
  const amp = BH * (0.3 - 0.12 * a);
  return noise.map((v, k) => {
    const t = k / (noise.length - 1);
    let e = 0;
    for (const tent of tents) {
      const u = Math.abs(t - tent.x) / tent.w;
      if (u < 1) e = Math.max(e, tent.h * Math.pow(1 - u, 0.88));
    }
    return [t * W, crestY(n) + BH * 0.46 - e * rise + (v - 0.35) * amp] as [number, number];
  });
}

const CRESTS = Array.from({ length: N }, (_, i) => crest(i + 1));

function poly(pts: readonly [number, number][]): string {
  return pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
}

function filled(pts: readonly [number, number][], attrs: string): string {
  return `<polygon points="${poly(pts)} ${W},${H} 0,${H}" ${attrs}/>`;
}

function line(pts: readonly [number, number][], attrs: string): string {
  return `<polyline points="${poly(pts)}" fill="none" ${attrs}/>`;
}

function svg(bg: string, body: string, extra = ''): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="the same mountain, one treatment">${extra}<rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
}

const mix = (a: string, b: string, k: number) => {
  const v = (s: string, i: number) => parseInt(s.slice(1 + i, 3 + i), 16);
  const ch = (i: number) => Math.round(v(a, i) * (1 - k) + v(b, i) * k);
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`;
};

// ── 一 夜漆 lacquer — what is in the repo today ───────────────────────────────

function lacquer(): string {
  const PH: Record<string, string> = {
    wood: '#8FD9A0', fire: '#F0906A', earth: '#F2CE72', metal: '#DCE6EE', water: '#8FB4F0',
  };
  let o = `<defs><linearGradient id="lsky" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#060F0C"/><stop offset=".5" stop-color="#101E24"/>
    <stop offset="1" stop-color="#31414E"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#lsky)"/>`;
  for (let n = N; n >= 1; n--) {
    const a = (n - 1) / (N - 1);
    const c = mix(mix('#060F0C', PH[BANDS[n - 1].phase], 0.1), mix(PH[BANDS[n - 1].phase], '#060F0C', 0.6), a ** 1.05 * 0.86);
    o += filled(CRESTS[n - 1], `fill="${c}"`);
    o += line(CRESTS[n - 1], `stroke="${mix(c, PH[BANDS[n - 1].phase], 0.5)}" stroke-width=".9" stroke-opacity=".5"`);
  }
  return svg('#060F0C', o);
}

// ── 二 水墨 ink on paper ──────────────────────────────────────────────────────

function inkwash(): string {
  const PAPER = '#EFE9DB';
  const INK = '#1C1A17';
  let o = '';
  for (let n = N; n >= 1; n--) {
    const a = (n - 1) / (N - 1);
    // Distance is carried by how much ink is in the water, and by nothing else.
    o += filled(CRESTS[n - 1], `fill="${INK}" fill-opacity="${(0.08 + 0.42 * (1 - a) ** 1.4).toFixed(3)}"`);
    // 飛白 the dry-brush skips along the crest, which is what says brush and not vector.
    const rnd = seeded(`dry:${n}`);
    const pts = CRESTS[n - 1];
    for (let i = 1; i < pts.length; i += 2) {
      if (rnd() > 0.55) continue;
      const [x, y] = pts[i];
      o += `<rect x="${f(x)}" y="${f(y - 1)}" width="${f(1.5 + rnd() * 4)}" height="${f(0.8 + rnd() * 1.6)}" fill="${INK}" fill-opacity="${(0.25 + 0.45 * (1 - a)).toFixed(2)}"/>`;
    }
  }
  // 留白 The mist is not painted. It is the paper, left alone.
  for (let n = 2; n <= N; n += 2) {
    o += `<rect x="0" y="${f(crestY(n) + 12)}" width="${W}" height="16" fill="${PAPER}" fill-opacity=".72"/>`;
  }
  o += `<rect x="${W - 46}" y="${H - 52}" width="30" height="30" rx="1.5" fill="none" stroke="#B2402C" stroke-width="2.4"/>
    <text x="${W - 31}" y="${H - 30}" font-size="19" text-anchor="middle" fill="#B2402C" font-family="Noto Serif SC, serif">九</text>`;
  return svg(PAPER, o);
}

// ── 三 青綠 mineral colour on silk ────────────────────────────────────────────

function mineral(): string {
  const SILK = '#DCCCA6';
  const GOLD = '#A8782C';
  const MALACHITE = '#4A7F5E';
  const AZURITE = '#2E5C86';
  let o = `<circle cx="${W * 0.72}" cy="44" r="21" fill="${GOLD}" fill-opacity=".5"/>`;
  for (let n = N; n >= 1; n--) {
    const a = (n - 1) / (N - 1);
    // Mineral pigment does not blend: each plane is one flat colour, and depth comes
    // from the pigment itself getting bluer and paler as it recedes.
    // Five steps, not a ramp: ground malachite gives way to azurite, and only the two
    // furthest planes are thinned toward the silk.
    const step = Math.round(a * 4) / 4;
    const c = mix(mix(MALACHITE, AZURITE, step), SILK, Math.max(0, step - 0.5) * 0.7);
    o += filled(CRESTS[n - 1], `fill="${c}"`);
    o += line(CRESTS[n - 1], `stroke="${GOLD}" stroke-width="1.2" stroke-opacity="${(0.95 - a * 0.35).toFixed(2)}"`);
  }
  return svg(SILK, o);
}

// ── 四 像素 pixels ────────────────────────────────────────────────────────────

function pixels(): string {
  const CELL = 5;
  const SKY = '#2A2440';
  const RAMP = ['#F2D99C', '#D98E5A', '#B5604F', '#7A4459', '#4E3A5C', '#3A3358', '#584C7A', '#7E76A6', '#B7B2D4'];
  let o = '';
  for (let n = N; n >= 1; n--) {
    const pts = CRESTS[n - 1];
    const c = RAMP[n - 1];
    for (let x = 0; x < W; x += CELL) {
      const i = Math.min(pts.length - 1, Math.round((x / W) * (pts.length - 1)));
      const top = Math.round(pts[i][1] / CELL) * CELL;
      o += `<rect x="${x}" y="${top}" width="${CELL}" height="${H - top}" fill="${c}"/>`;
      // 網点 one dither row at the crest — the whole language of a 16-bit sky.
      if ((x / CELL) % 2 === 0) {
        o += `<rect x="${x}" y="${top - CELL}" width="${CELL}" height="${CELL}" fill="${c}" fill-opacity=".55"/>`;
      }
      o += `<rect x="${x}" y="${top}" width="${CELL}" height="${CELL}" fill="${mix(c, '#FFFFFF', 0.28)}"/>`;
    }
  }
  return svg(SKY, o);
}

// ── 五 木刻 woodblock ─────────────────────────────────────────────────────────

function woodblock(): string {
  const PAPER = '#E7DFCB';
  const INK = '#22201C';
  const RED = '#B23A2B';
  let o = `<circle cx="${W * 0.7}" cy="40" r="19" fill="${RED}"/>`;
  for (let n = N; n >= 1; n--) {
    const a = (n - 1) / (N - 1);
    const pts = CRESTS[n - 1];
    if (a > 0.66) {
      // Far planes are carved as outline only: in a woodcut, depth is line density.
      o += line(pts, `stroke="${INK}" stroke-width="1.1" stroke-opacity=".55"`);
    } else if (a > 0.3) {
      o += `<g>${line(pts, `stroke="${INK}" stroke-width="1.5"`)}`;
      const rnd = seeded(`hatch:${n}`);
      for (let i = 0; i < pts.length; i += 3) {
        const [x, y] = pts[i];
        o += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + (rnd() - 0.5) * 5)}" y2="${f(y + 10 + rnd() * 22)}" stroke="${INK}" stroke-width="1.1"/>`;
      }
      o += `</g>`;
    } else {
      // 見当 the red block, printed a hair off the key block — which is the whole tell
      // of a two-colour print, so it has to stay visible rather than hide under the ink.
      o += `<g transform="translate(-4,3.5)">${filled(pts, `fill="${RED}"`)}</g>`;
      o += filled(pts, `fill="${INK}" fill-opacity="${a < 0.12 ? '.93' : '.8'}"`);
      // 木目 the grain the block itself leaves behind.
      const g = seeded(`grain:${n}`);
      for (let i = 0; i < pts.length; i += 2) {
        const [x, y] = pts[i];
        o += `<line x1="${f(x)}" y1="${f(y + 4)}" x2="${f(x)}" y2="${f(y + 10 + g() * 30)}" stroke="${PAPER}" stroke-width="${(0.5 + g()).toFixed(1)}" stroke-opacity=".3"/>`;
      }
    }
  }
  return svg(PAPER, o);
}

// ── the page ──────────────────────────────────────────────────────────────────

interface Direction {
  readonly han: string;
  readonly name: string;
  readonly art: string;
  readonly what: string;
  readonly cost: string;
  readonly current?: boolean;
}

const DIRECTIONS: readonly Direction[] = [
  {
    han: '夜漆', name: 'Laca noturna', art: lacquer(), current: true,
    what: 'Fundo quase preto, jade e ouro, cor por fase 五行. Legível de noite, discreta, e é a que está no repositório agora.',
    cost: 'É a arte do projeto anterior. Foi por isto que você parou a conversa, e a razão é boa: não distingue este jogo daquele.',
  },
  {
    han: '水墨', name: 'Tinta sobre papel', art: inkwash(),
    what: 'Papel de arroz, tinta preta em lavagem, um selo vermelho. A distância é só quanta tinta há na água. A névoa não é pintada — é o papel deixado em paz.',
    cost: 'Tela clara num gênero que é sempre escuro: quase ninguém faz, e é o que mais se afasta do anterior. Exige disciplina — com tinta não há onde esconder um traço errado.',
  },
  {
    han: '青綠', name: 'Azul-verde sobre seda', art: mineral(),
    what: 'Pigmento mineral: malaquita e azurita chapadas sobre seda, contorno a ouro. É a pintura de paisagem imperial, a mais rica das cinco.',
    cost: 'Rica e cara de manter coerente: cor chapada não perdoa. Mas é a única que parece objeto valioso, o que combina com um jogo sobre subir.',
  },
  {
    han: '像素', name: 'Pixel 16-bit', art: pixels(),
    what: 'Grade de 5 px, rampa de nove cores, uma linha de dithering na crista. Outro meio, não outro estilo.',
    cost: 'Impossível derivar (a grade obriga), lê bem em tela pequena, e nostálgico. Mas foge do xianxia clássico e pode parecer um jogo diferente do que você descreveu.',
  },
  {
    han: '木刻', name: 'Xilogravura', art: woodblock(),
    what: 'Papel creme, duas tintas só — preta e vermelha — com o bloco vermelho impresso um fio fora de registro. A profundidade vem da densidade de linha, não da cor.',
    cost: 'Muito gráfico e muito distinto. Duas tintas limitam o que dá para dizer com cor, então o estado do jogo teria de ser dito por forma.',
  },
];

const bandRows = [...BANDS].reverse().map((b) => `
  <tr>
    <td class="han">${b.han}</td>
    <td>${b.name}</td>
    <td class="stat">${b.demands ? { body: '體 Corpo', qi: '氣 Qi', spirit: '神 Espírito', bone: '骨 Osso', intent: '意 Intento' }[b.demands] : '—'}</td>
    <td class="n">×${b.yield}</td>
    <td class="n">${b.pressure || '—'}</td>
  </tr>`).join('');

const cards = DIRECTIONS.map((d, i) => `
  <figure class="dir${d.current ? ' is-current' : ''}">
    <div class="plate">${d.art}</div>
    <figcaption>
      <p class="tag">Direção ${i + 1}${d.current ? ' · atual' : ''}</p>
      <h3><span class="han">${d.han}</span> ${d.name}</h3>
      <p>${d.what}</p>
      <p class="cost">${d.cost}</p>
    </figcaption>
  </figure>`).join('');

const page = `<title>九重山 Ninefold</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,500&family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&display=swap">
<style>
  :root {
    --ground: #F4F3F1;
    --raised: #FFFFFF;
    --ink: #17181A;
    --body: #3A3D42;
    --soft: #6E7379;
    --rule: #DEDDD9;
    --mark: #17181A;
    --warn: #8C3A2A;
    color-scheme: light;
  }
  :root:not([data-theme="light"]) { }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #131416;
      --raised: #1B1D20;
      --ink: #F0EFEC;
      --body: #B9BCC1;
      --soft: #85898F;
      --rule: #2C2F33;
      --mark: #F0EFEC;
      --warn: #E08163;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --ground: #131416;
    --raised: #1B1D20;
    --ink: #F0EFEC;
    --body: #B9BCC1;
    --soft: #85898F;
    --rule: #2C2F33;
    --mark: #F0EFEC;
    --warn: #E08163;
    color-scheme: dark;
  }

  * { box-sizing: border-box; }
  body {
    background: var(--ground); color: var(--body); margin: 0;
    font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
    font-size: 16px; line-height: 1.65;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding-block: 48px 90px; padding-left: 20px; padding-right: 20px; }
  .han { font-family: 'Noto Serif SC', serif; }

  h1, h2, h3 { color: var(--ink); text-wrap: balance; font-weight: 500; margin: 0; }
  h1 { font-family: 'Noto Serif SC', serif; font-size: clamp(38px, 11vw, 58px); line-height: 1.05; letter-spacing: .02em; }
  .latin { font-family: Newsreader, Georgia, serif; font-size: 19px; color: var(--soft);
           letter-spacing: .22em; text-transform: uppercase; margin-top: 10px; }
  h2 { font-family: Newsreader, Georgia, serif; font-size: 30px; line-height: 1.2; margin-top: 8px; }
  h3 { font-family: Newsreader, Georgia, serif; font-size: 21px; }
  p { margin: 0; }

  section { border-top: 1px solid var(--rule); padding-top: 34px; margin-top: 54px;
            display: flex; flex-direction: column; gap: 18px; }
  .kicker { font-size: 11.5px; letter-spacing: .2em; text-transform: uppercase;
            color: var(--soft); font-weight: 600; }
  .lede { font-family: Newsreader, Georgia, serif; font-size: 21px; line-height: 1.5; color: var(--ink); }

  .note { border-left: 2px solid var(--warn); padding: 4px 0 4px 16px; color: var(--body); }
  .note b { color: var(--ink); font-weight: 600; }

  table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
  th { text-align: left; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase;
       color: var(--soft); font-weight: 600; padding: 0 8px 8px 0; border-bottom: 1px solid var(--rule); }
  td { padding: 9px 8px 9px 0; border-bottom: 1px solid var(--rule); vertical-align: baseline; }
  td.han { font-size: 17px; color: var(--ink); width: 62px; }
  td.stat { color: var(--soft); font-size: 13.5px; white-space: nowrap; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink); white-space: nowrap; }
  .scrollx { overflow-x: auto; }

  .bet { background: var(--raised); border: 1px solid var(--rule); border-radius: 4px; padding: 20px; }
  .bet dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 9px 18px; font-size: 15px; }
  .bet dt { color: var(--soft); }
  .bet dd { margin: 0; color: var(--ink); font-variant-numeric: tabular-nums; }
  .verdict { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--rule);
             font-family: Newsreader, Georgia, serif; font-size: 20px; color: var(--ink); }

  .dirs { display: flex; flex-direction: column; gap: 46px; }
  .dir { margin: 0; display: grid; gap: 18px; }
  @media (min-width: 640px) { .dir { grid-template-columns: 240px 1fr; align-items: start; } }
  .plate { border: 1px solid var(--rule); border-radius: 3px; overflow: hidden; line-height: 0; }
  .plate svg { display: block; width: 100%; height: auto; }
  .dir figcaption { display: flex; flex-direction: column; gap: 10px; }
  .dir h3 .han { font-size: 24px; margin-right: 6px; }
  .tag { font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--soft); font-weight: 600; }
  .is-current .tag { color: var(--warn); }
  .cost { color: var(--soft); font-size: 14.5px; }

  .grid2 { display: grid; gap: 22px; }
  @media (min-width: 620px) { .grid2 { grid-template-columns: 1fr 1fr; } }
  .have h3, .want h3 { font-size: 17px; margin-bottom: 8px; }
  ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 15px; }

  .ask { background: var(--raised); border: 1px solid var(--rule); border-radius: 4px; padding: 24px; }
  .ask h2 { margin-bottom: 10px; }
</style>

<div class="wrap">
  <header>
    <h1>九重山</h1>
    <p class="latin">Ninefold</p>
    <p class="lede" style="margin-top:22px">Uma montanha só. Todo mundo sobe a mesma. A decisão de cada sessão é uma única pergunta: <em>até onde subo antes de fechar o app?</em></p>
  </header>

  <section>
    <p class="kicker">O jogo</p>
    <h2>Altitude é o progresso</h2>
    <p>Não há mapa com zonas nem níveis. Há uma montanha de nove faixas, e você acampa numa delas. Enquanto o app está fechado, o acampamento rende qi — quanto mais alto, mais rende.</p>
    <p>O que impede todo mundo de correr para o topo não é um portão. É que <b style="color:var(--ink)">a altitude pressiona</b>: ar rarefeito, frio, tempestade de espírito. Cada faixa cobra a pressão dela contra <em>um</em> atributo seu. Se o seu apoio não aguenta o tempo que você ficou fora, volta uma faixa — e perde o rendimento da noite, nunca o que já conquistou.</p>
    <p class="note"><b>Nenhum idle faz isso.</b> Em todos os outros, ficar ausente é seguro e chato. Aqui ficar ausente é uma aposta que você faz de olhos abertos, e é essa aposta que faz stats e build importarem.</p>
  </section>

  <section>
    <p class="kicker">A montanha</p>
    <h2>As nove faixas</h2>
    <p>Cada faixa tem a cor da sua fase 五行, um rendimento e uma pressão — e cobra um atributo diferente. Não existe build melhor: a própria montanha é o balanceamento, e ela muda conforme você sobe.</p>
    <div class="scrollx">
      <table>
        <thead><tr><th></th><th>Faixa</th><th>Cobra</th><th>Rende</th><th>Pressão/h</th></tr></thead>
        <tbody>${bandRows}</tbody>
      </table>
    </div>
  </section>

  <section>
    <p class="kicker">A mecânica central</p>
    <h2>A aposta</h2>
    <p>Um exemplo real, com os números que estão no código hoje. Você está no 焚崖 (faixa 4) e tem 意 Intento 14.</p>
    <div class="bet">
      <dl>
        <dt>Rende</dt><dd>×4,2 → 307 qi por hora</dd>
        <dt>Pressão</dt><dd>18 por hora, contra 意 Intento 14</dd>
        <dt>Apoio</dt><dd>14 × 40 ÷ 18 = <b>31,1 horas</b></dd>
      </dl>
      <p class="verdict">Dá para fechar o app e voltar amanhã. Não dá para passar o fim de semana.</p>
    </div>
    <p>Subir uma faixa quase dobra o rendimento e quase dobra a pressão. Então a pergunta nunca é “consigo chegar lá?” — é “ainda vou estar de pé quando eu voltar?”. Essa é a única decisão que a tela inicial pede.</p>
  </section>

  <section>
    <p class="kicker">Build</p>
    <h2>As cinco</h2>
    <p>體 Corpo, 氣 Qi, 神 Espírito, 骨 Osso, 意 Intento. O que faz disto uma build e não uma lista de números é que cada atributo é nomeado pelas <em>altitudes que o exigem</em>. Subir 骨 Osso não é “mais dano” — é poder dormir no 石胎 e no 天壺.</p>
    <p>Com os stats do exemplo: você segura a faixa 5 por uma noite, mas só a faixa 3 por um fim de semana inteiro. Quem joga todo dia consegue viver mais alto que quem abre uma vez por semana — com a mesma build.</p>
  </section>

  <section>
    <p class="kicker">Online, sem tempo real</p>
    <h2>O selo</h2>
    <p>Acima da fronteira a montanha está selada, para todo mundo. O selo só quebra com oferenda coletiva do servidor inteiro — e quando quebra, a faixa nova abre para quem deu dois milhões e para quem deu zero.</p>
    <p>Nada aqui roda num relógio: sem arena, sem raid, sem ninguém para quem você precise estar online. É a camada online mais leve que ainda muda o jogo — e é o que impede o jogador solo de virar um arredondamento perto das seitas grandes.</p>
  </section>

  <section>
    <p class="kicker">A decisão que está bloqueando</p>
    <h2>Arte: cinco direções</h2>
    <p>A mesma montanha, desenhada cinco vezes. A geometria é idêntica nas cinco — só a técnica muda — porque é a única forma de a comparação ser honesta.</p>
    <p class="note"><b>Assumindo o erro:</b> a direção 1 é o que está no repositório hoje, e é essencialmente a arte do projeto anterior — mesmo fundo laca, mesmo jade, mesma técnica. Você viu isso e tem razão. As outras quatro existem para sair dela.</p>
    <div class="dirs">${cards}</div>
  </section>

  <section>
    <p class="kicker">Estado</p>
    <h2>O que existe, o que falta</h2>
    <div class="grid2">
      <div class="have">
        <h3>Existe</h3>
        <ul>
          <li>As quatro telas, em React, rodando no celular</li>
          <li>A matemática do acampamento — rendimento, pressão, apoio</li>
          <li>Os dados das nove faixas e dos cinco atributos</li>
          <li>O gerador da montanha, por regras</li>
        </ul>
      </div>
      <div class="want">
        <h3>Falta</h3>
        <ul>
          <li>O tempo correr de verdade, e o save</li>
          <li>Os botões fazerem alguma coisa</li>
          <li>O APK e o servidor</li>
          <li>Feras, itens, técnicas — todo o conteúdo</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="ask">
    <p class="kicker">Duas perguntas</p>
    <h2>Preciso da sua cabeça</h2>
    <p><b style="color:var(--ink)">1. Qual direção de arte?</b> Escolha pelo número. Se nenhuma servir, diga o que incomoda em cada uma — isso é mais útil que uma sexta tentativa no escuro.</p>
    <p><b style="color:var(--ink)">2. Quanto tempo até o topo?</b> Quarenta dias, três meses, um ano? Toda a tabela de rendimento e pressão sai desse número, e é a decisão mais irreversível do jogo. Foi exatamente aí que a versão anterior quebrou.</p>
  </section>
</div>`;

writeFileSync('directions.html', page);
console.log(`directions.html — ${(page.length / 1024).toFixed(0)} KB`);
