/**
 * 墨 The ink direction: what 九境 looks like if it stops being neon.
 *
 * Bruno, on the first prompt kit: *"não me dá muito intuito de xianxia/wuxia e demasiado
 * neon, sem puxar pelos players."* He is right, and the fault is older than the prompts.
 * The game is cyan to magenta on blue-black, which is a science fiction palette wearing
 * Chinese characters. A cultivation story is not lit by neon. It is ink on silk, gold
 * leaf, cinnabar on a seal, jade, and a great deal of empty paper.
 *
 * So this page is the whole direction, drawn: the palette, the materials, the frame, and
 * the game's own screens rebuilt in it, beside what they look like today. Every drawing
 * on it is generated here, from the game's own tables, so nothing on this page is a
 * promise that the code cannot keep.
 *
 * Run with `npm run ink`. It writes ink.html.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS, commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { REALMS } from '../src/data/realms.ts';
import { ICONS } from '../src/art/icons.generated.ts';
import { icon } from '../src/art/icon.ts';
import { mix } from '../src/art/aura.ts';
import { PLATE_CSS, liftArt, writePlates } from './lift.ts';

/**
 * 色 The nine realms, re-dyed.
 *
 * The ramp still does its one job, which is that a realm must be readable from its
 * colour alone. What changes is where it walks. Cyan to magenta is a gas discharge tube.
 * This walks the road a cultivation story actually walks: **jade, then gold, then
 * cinnabar, then imperial violet.** Green is the first breath and the body; gold is the
 * core; red is the furnace and the tribulation; violet is what is left after all of it.
 */
export const INK: readonly { n: number; han: string; name: string; colour: string; stuff: string }[] = [
  { n: 1, han: '練氣', name: 'Qi Refining', colour: '#5E8C76', stuff: 'jade' },
  { n: 2, han: '築基', name: 'Foundation', colour: '#7BA382', stuff: 'celadon' },
  { n: 3, han: '金丹', name: 'Golden Core', colour: '#A89B5C', stuff: 'old bronze' },
  { n: 4, han: '元嬰', name: 'Nascent Soul', colour: '#C8A951', stuff: 'gold leaf' },
  { n: 5, han: '化神', name: 'Spirit Severing', colour: '#D89B4A', stuff: 'amber' },
  { n: 6, han: '煉虛', name: 'Void Refining', colour: '#C9713F', stuff: 'copper' },
  { n: 7, han: '合體', name: 'Unity', colour: '#B4332C', stuff: 'cinnabar' },
  { n: 8, han: '大乘', name: 'Great Vehicle', colour: '#8E2B4B', stuff: 'plum' },
  { n: 9, han: '渡劫', name: 'Tribulation', colour: '#6B3A7A', stuff: 'imperial violet' },
];
export const inkOf = (n: number) => INK[Math.max(0, Math.min(8, n - 1))];

/** 紙 Aged paper, as a filter the whole page can dip a drawing into. */
const PAPER_DEFS = `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="4" seed="3" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope=".16"/></feComponentTransfer>
  </filter>
  <filter id="bleed" x="-25%" y="-25%" width="150%" height="150%">
    <feTurbulence type="fractalNoise" baseFrequency=".013 .028" numOctaves="4" seed="11" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="9" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation=".5"/>
  </filter>
  <filter id="wash" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency=".02 .04" numOctaves="3" seed="5" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="16" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="2.2"/>
  </filter>`;

/**
 * 圓相 The ensō: a circle drawn in one breath, left open where the brush lifted.
 *
 * This is the frame. It is the oldest mark in the tradition the game is set in, it is a
 * circle so it crops a picture the way 牌 the plate already does, and it is drawn rather
 * than downloaded, so it still costs nothing and still reads the save: the sweep is
 * thicker and the opening smaller the deeper the thing inside it is.
 */
function enso(colour: string, tier: number, size: number, seed = 1): string {
  const uid = `e${Math.round(size)}${tier}${seed}${colour.slice(1)}`;
  const gap = 34 - tier * 8;                     // the brush lifts, and lifts less when deeper
  const from = -100 + seed * 7;
  const to = from + 360 - gap;
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
  };
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs>
      <linearGradient id="s${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${colour}" stop-opacity=".95"/>
        <stop offset=".55" stop-color="${colour}" stop-opacity=".7"/>
        <stop offset="1" stop-color="${colour}" stop-opacity=".25"/>
      </linearGradient>
      <filter id="b${uid}" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="${seed}" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="2.4"/>
      </filter>
    </defs>
    <path d="M ${pt(from, 41)} A 41 41 0 1 1 ${pt(to, 41)}"
      fill="none" stroke="url(#s${uid})" stroke-width="${3.4 + tier * 1.1}"
      stroke-linecap="round" filter="url(#b${uid})"/>
  </svg>`;
}

/** 印 A seal, stamped: cinnabar block, the character cut out of it. */
function stamp(char: string, size = 54, colour = '#B4332C'): string {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><filter id="st${char.charCodeAt(0)}" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/>
    </filter></defs>
    <g filter="url(#st${char.charCodeAt(0)})">
      <rect x="6" y="6" width="88" height="88" rx="7" fill="${colour}"/>
      <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
        font-family="'Noto Serif SC',serif" font-size="58" fill="#EDE3D2">${char}</text>
    </g>
  </svg>`;
}

/**
 * 山水 Ink mountains: three washes, wet edges, mist between them, and a great deal of
 * nothing.
 *
 * 遠 The rule that makes it read as depth rather than as mud: **the far ridge is lighter
 * than the sky and the near one is almost black.** That is how distance works in ink and
 * it is the opposite of how a gradient sky works, which is why the first draft of this
 * function came out flat: every ridge was darker than the one behind it and the whole
 * thing collapsed into one shape.
 */
function mountains(w: number, h: number, colour: string, seed = 3): string {
  let a = seed * 2654435761 % 2147483647;
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // 溢 The skirt: every ridge runs well below the frame, because 墨 the bleed filter
  // displaces the whole shape and a polygon that stops exactly at the bottom edge comes
  // back with daylight under it. The first draft left a row of specks along the floor.
  const skirt = h + 24;
  const ridge = (base: number, height: number, peaks: number) => {
    const pts = [`0,${skirt}`, `0,${base}`];
    for (let i = 0; i <= peaks; i++) {
      pts.push(`${((i / peaks) * w).toFixed(0)},${(base - (0.28 + rnd() * 0.72) * height).toFixed(0)}`);
    }
    pts.push(`${w},${base}`, `${w},${skirt}`);
    return pts.join(' ');
  };
  const far = mix(colour, '#EDE3D2', 0.42);      // lit by the mist, the palest thing here
  const mid = mix(colour, '#0E0D12', 0.52);
  const near = '#0A090D';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
    <defs>${PAPER_DEFS}
      <linearGradient id="sk${seed}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#100E14"/>
        <stop offset=".55" stop-color="${mix(colour, '#100E14', 0.66)}"/>
        <stop offset="1" stop-color="${mix(colour, '#EDE3D2', 0.72)}"/>
      </linearGradient>
      <linearGradient id="ms${seed}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#EDE3D2" stop-opacity="0"/>
        <stop offset=".5" stop-color="#EDE3D2" stop-opacity=".3"/>
        <stop offset="1" stop-color="#EDE3D2" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sk${seed})"/>
    <!-- 月 A pale disc, because a sky with nothing in it is a gradient. -->
    <circle cx="${(w * 0.24).toFixed(0)}" cy="${(h * 0.24).toFixed(0)}" r="${(h * 0.11).toFixed(0)}"
      fill="#EDE3D2" opacity=".13"/>
    <g filter="url(#wash)" opacity=".85">
      <polygon points="${ridge(h * 0.74, h * 0.34, 5)}" fill="${far}" opacity=".5"/>
    </g>
    <rect y="${(h * 0.62).toFixed(0)}" width="${w}" height="${(h * 0.22).toFixed(0)}" fill="url(#ms${seed})"/>
    <g filter="url(#wash)" opacity=".92">
      <polygon points="${ridge(h * 0.88, h * 0.44, 4)}" fill="${mid}"/>
    </g>
    <g filter="url(#bleed)">
      <polygon points="${ridge(h * 1.02, h * 0.42, 3)}" fill="${near}"/>
    </g>
    <rect width="${w}" height="${h}" filter="url(#grain)" opacity=".55"/>
  </svg>`;
}

/** 獸 A creature in the ink direction: the ensō, the wash behind it, the silhouette in ink. */
function inkPlate(iconName: string, colour: string, tier: number, size = 104, seed = 1): string {
  const body = ICONS[iconName] ?? '';
  const uid = `ip${iconName}${tier}`;
  return `<span class="ip" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <defs>
        <radialGradient id="w${uid}"><stop offset=".1" stop-color="${mix(colour, '#0E0D12', 0.35)}"/>
          <stop offset="1" stop-color="#0E0D12" stop-opacity="0"/></radialGradient>
        ${PAPER_DEFS}
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#w${uid})"/>
      <g filter="url(#bleed)" transform="translate(24 24) scale(0.1016)"
         fill="${mix(colour, '#EDE3D2', 0.25)}" opacity=".92">${body}</g>
      <circle cx="50" cy="50" r="44" fill="none" filter="url(#grain)" opacity=".35"/>
    </svg>
    <span class="ring">${enso(colour, tier, size, seed)}</span>
  </span>`;
}

/* ── the screens, both ways ─────────────────────────────────────────────── */

const six = REALMS[5];
const sixInk = inkOf(6);
const three = commonsOf(6);

const huntNow = `
  <div class="scr now">
    <div class="body">
      ${three.map((b) => `<div class="row" style="--hue:${six.colour}">
        <span class="s" style="color:${six.colour}">${icon(b.icon, 34)}</span>
        <span><b>${b.han}</b><i>${b.name}</i></span><em>98%</em></div>`).join('')}
    </div>
  </div>`;

const huntInk = `
  <div class="scr ink">
    <div class="top">${mountains(320, 96, sixInk.colour, 9)}
      <span class="ttl cjk">狩</span></div>
    <div class="body">
      ${three.map((b, i) => `<div class="row" style="--hue:${sixInk.colour}">
        <span class="s">${inkPlate(b.icon, sixInk.colour, i === 2 ? 2 : 1, 46, i + 2)}</span>
        <span><b>${b.han}</b><i>${b.name}</i></span><em>98%</em></div>`).join('')}
    </div>
  </div>`;

const realmCard = (n: number) => {
  const r = inkOf(n);
  return `<figure class="rcard">
    <span class="bg">${mountains(300, 150, r.colour, n * 3 + 1)}</span>
    <span class="seal">${stamp(r.han[0], 44)}</span>
    <figcaption><b class="cjk">${r.han}</b><i>${r.name}</i>
      <em>${r.stuff}</em></figcaption>
  </figure>`;
};

const swatches = INK.map((r) => `
  <figure class="sw">
    <span class="chip" style="background:${r.colour}"></span>
    <figcaption><b class="cjk">${r.han}</b><i>${r.name}</i><em>${r.colour} · ${r.stuff}</em></figcaption>
  </figure>`).join('');

const oldSwatches = REALMS.map((r) => `
  <figure class="sw">
    <span class="chip" style="background:${r.colour}"></span>
    <figcaption><b class="cjk">${r.han}</b><i>${r.name}</i><em>${r.colour}</em></figcaption>
  </figure>`).join('');

/* ── the prompts, rewritten ─────────────────────────────────────────────── */

export const STYLE = `Style: classical Chinese ink painting on aged silk. Wet brush, visible
strokes, ink bleeding into the fibre, large areas of empty paper. Muted
mineral pigment only: jade green, gold leaf, cinnabar red, bone white,
soot black. No neon, no glow, no rim light, no lens flare, no science
fiction, no cyberpunk. Nothing emits light except a lantern or the moon.
Composition in the Song dynasty manner: the subject small against a great
deal of empty space, mist swallowing the middle distance. It should look
like a plate from a bestiary somebody believed in six hundred years ago.
No text, no letters, no characters, no seal, no watermark, no border.`;

const beastPrompt = (b: typeof BEASTS[number]) => {
  const r = inkOf(b.realm);
  const what = b.warden
    ? `${b.name}, the guardian of its mountain: ancient, enormous, unbothered, `
      + 'seen from below through mist so that its full size is never shown at once.'
    : `${b.name}, a wild spirit-beast, caught mid-turn as it notices a traveller.`;
  return `${what}
Painted in ink with ${r.stuff} as the only colour in the picture (${r.colour}),
used sparingly, on a warm dark ground.
${STYLE}`;
};

const logoPrompt = `An emblem for a Chinese cultivation game, in the manner of a carved
seal and an ink brush. A single ensō, a circle painted in one brush stroke
and left open where the brush lifted, in worn gold leaf on a deep ink ground.
Inside the circle, very small and centred, the silhouette of a seated figure
in meditation, painted in soot black with a dry brush. Around the outside of
the circle, nine small cinnabar red dots evenly spaced, like the nine marks of
a seal. Aged silk texture, mineral pigment, no gradients, no glow, no neon, no
3D, no bevel. Flat, painted, austere, symmetrical, with generous empty margin.
Square 1:1. No text, no letters, no Chinese characters, no watermark.`;

const page = `<meta charset="utf-8">
<title>九境 Ninefold · 墨 the ink direction</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root {
    /* 今 what the game is today */
    --now-ground:#080A18; --now-panel:#111433; --now-line:#252A5C;
    --now-cyan:#5FDCFF; --now-magenta:#FF5FC8; --now-text:#E7EAFF; --now-faint:#8289C0;
    /* 墨 what this page proposes */
    --ground:#0E0D12; --panel:#17151C; --panel2:#131117; --line:#2E2A33;
    --ink:#0B0A0E; --paper:#EDE3D2; --text:#DCD2C2; --faint:#8C8478;
    --gold:#C8A951; --cinnabar:#B4332C; --jade:#5E8C76;
    color-scheme:dark;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.7 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:900px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,12vw,60px); font-weight:400;
       color:var(--gold); line-height:1; margin:0; }
  h2 { font-family:Rajdhani,sans-serif; font-size:26px; margin:0; display:flex; gap:11px;
       align-items:baseline; color:var(--paper); }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:30px; color:var(--gold); }
  h3 { font-family:Rajdhani,sans-serif; font-size:13px; color:var(--faint); margin:0;
       letter-spacing:.12em; text-transform:uppercase; }
  p { margin:0; }
  .lead { font-size:19px; margin-top:14px; color:var(--faint); }
  .sec { margin-top:40px; border-top:1px solid var(--line); padding-top:22px;
         display:flex; flex-direction:column; gap:14px; }
  .t { color:var(--faint); max-width:64ch; }
  .t b { color:var(--paper); font-weight:600; }
  .rule { border-left:3px solid var(--gold); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; color:var(--faint); }
  .rule b { color:var(--gold); }
  .two { display:grid; gap:14px; }
  @media(min-width:700px){ .two { grid-template-columns:1fr 1fr; } }
  .box { background:var(--panel2); border:1px solid var(--line); border-radius:4px;
         padding:14px; }
  .box .lab { font-size:11px; letter-spacing:.16em; text-transform:uppercase;
              color:var(--faint); font-family:Archivo,sans-serif; font-weight:600;
              display:block; margin-bottom:10px; }
  .swatches { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:9px; }
  .sw { margin:0; }
  .sw .chip { display:block; height:44px; border-radius:3px; }
  .sw figcaption { margin-top:6px; }
  .sw b { display:block; font-family:'Noto Serif SC',serif; font-weight:400; font-size:15px; }
  .sw i { display:block; font-style:normal; font-size:11px; color:var(--faint); }
  .sw em { display:block; font-style:normal; font-size:9.5px; color:var(--faint); opacity:.7;
           font-family:'Roboto Mono',monospace; }
  .ip { position:relative; display:inline-grid; place-items:center; flex:none; }
  .ip > svg, .ip .ring { position:absolute; inset:0; }
  .ip .ring svg { width:100%; height:100%; display:block; }
  .scr { border:1px solid var(--line); border-radius:4px; overflow:hidden; }
  .scr.now { background:var(--now-panel); border-color:var(--now-line); }
  .scr.ink { background:var(--panel); }
  .scr .top { position:relative; height:96px; }
  .scr .top svg { display:block; }
  .scr .top .ttl { position:absolute; left:14px; bottom:8px; font-size:30px;
                   color:var(--paper); text-shadow:0 2px 14px #000; }
  .scr .body { padding:12px; }
  .scr .row { display:flex; align-items:center; gap:12px; padding:9px 11px; margin-bottom:8px;
              border-radius:3px; }
  .scr.now .row { background:var(--now-ground); border:1px solid var(--now-line); }
  .scr.ink .row { background:var(--panel2); border:1px solid var(--line); }
  .scr .row .s { flex:none; display:grid; place-items:center; width:46px; height:46px; }
  .scr .row .s svg { display:block; }
  .scr .row b { font-size:16px; font-weight:400; color:var(--hue);
                font-family:'Noto Serif SC',serif; }
  .scr .row i { display:block; font-style:normal; font-size:12.5px; }
  .scr.now .row i { color:var(--now-faint); }
  .scr.ink .row i { color:var(--faint); }
  .scr .row em { margin-left:auto; font-style:normal; font-family:Rajdhani,sans-serif;
                 font-weight:700; }
  .scr.now .row em { color:var(--now-cyan); }
  .scr.ink .row em { color:var(--gold); }
  .rcards { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); }
  .rcard { margin:0; position:relative; border:1px solid var(--line); border-radius:4px;
           overflow:hidden; background:var(--panel2); }
  .rcard .bg { display:block; height:150px; }
  .rcard .bg svg { display:block; width:100%; height:100%; }
  .rcard .seal { position:absolute; right:10px; top:10px; }
  .rcard .seal svg { display:block; }
  .rcard figcaption { padding:10px 13px 12px; }
  .rcard b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:19px; color:var(--paper); }
  .rcard i { font-style:normal; font-size:13px; color:var(--faint); margin-left:8px; }
  .rcard em { display:block; font-style:normal; font-size:11px; color:var(--gold);
              letter-spacing:.1em; text-transform:uppercase; margin-top:4px; }
  .beasts { display:flex; flex-wrap:wrap; gap:16px; }
  .beasts figure { margin:0; text-align:center; }
  .beasts figcaption { margin-top:7px; font-size:12px; color:var(--faint); }
  .beasts figcaption b { display:block; font-family:'Noto Serif SC',serif; font-weight:400;
                         font-size:15px; color:var(--hue); }
  pre { background:var(--panel2); border:1px solid var(--line); border-radius:4px;
        padding:14px; overflow-x:auto; font-family:'Roboto Mono',monospace; font-size:12px;
        line-height:1.7; color:var(--text); white-space:pre-wrap; margin:0; }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:8px; color:var(--faint); vertical-align:top; }
  td b { color:var(--paper); font-weight:600; }
  code { font-family:'Roboto Mono',monospace; font-size:12.5px; color:var(--gold); }
  a { color:var(--gold); }
  ${PLATE_CSS}
</style>

<div class="sheet">
  <header>
    <h1>墨</h1>
    <p class="lead"><b style="color:var(--paper)">The ink direction.</b> What 九境 looks
      like if it stops being lit by neon and starts being painted. Every drawing on this
      page is generated from the game's own tables, so none of it is a promise the code
      cannot keep.</p>
    <p class="t" style="margin-top:12px">Bruno, on the first prompt kit: <i>"não me dá
      muito intuito de xianxia/wuxia e demasiado neon."</i> The fault is older than the
      prompts. The game is cyan to magenta on blue-black, which is a science fiction
      palette wearing Chinese characters. A cultivation story is not lit by neon: it is
      ink on silk, gold leaf, cinnabar on a seal, jade, and a great deal of empty paper.</p>
  </header>

  <section class="sec">
    <h2><span class="h">色</span> The nine realms, re-dyed</h2>
    <p class="t">The ramp keeps its one job, which is that a realm must be readable from
      its colour alone without reading a word. What changes is the road it walks.
      <b>Jade, then gold, then cinnabar, then imperial violet</b>: green is the first
      breath and the body, gold is the core, red is the furnace and the tribulation, and
      violet is what is left after all of it. Every one of these is a pigment somebody
      ground.</p>
    <div class="two">
      <div class="box"><span class="lab">Now: a gas discharge tube</span>
        <div class="swatches">${oldSwatches}</div></div>
      <div class="box"><span class="lab">墨 Ink: minerals</span>
        <div class="swatches">${swatches}</div></div>
    </div>
  </section>

  <section class="sec">
    <h2><span class="h">圓相</span> The frame is a brush stroke</h2>
    <p class="t">The ensō is a circle painted in one breath and left open where the brush
      lifted. It is the oldest mark in the tradition this game is set in, it crops a
      picture to a circle the way the game's frame already does, and it is drawn rather
      than downloaded. It still reads the save: the sweep is heavier and the opening
      smaller the deeper the thing inside it.</p>
    <div class="box">
      <div class="beasts">
        ${three.map((b, i) => `<figure style="--hue:${sixInk.colour}">
          ${inkPlate(b.icon, sixInk.colour, i + 1, 118, i + 3)}
          <figcaption><b>${b.han}</b>${b.name}</figcaption></figure>`).join('')}
        <figure style="--hue:${inkOf(9).colour}">
          ${inkPlate(wardenOf(9).icon, inkOf(9).colour, 3, 118, 8)}
          <figcaption><b>${wardenOf(9).han}</b>${wardenOf(9).name}</figcaption></figure>
      </div>
    </div>
    <div class="rule"><b>And the silhouette is dipped in ink rather than lit from
      behind.</b> The same 120 icons the game already ships, displaced by a turbulence
      filter so the edge breaks the way a wet brush breaks, in bone white rather than in
      a colour that glows. Nothing was downloaded to make these.</div>
  </section>

  <section class="sec">
    <h2><span class="h">狩</span> The same screen, both ways</h2>
    <div class="two">
      <div class="box"><span class="lab">Now</span>${huntNow}</div>
      <div class="box"><span class="lab">墨 Ink</span>${huntInk}</div>
    </div>
    <p class="t">The list is the same list. What changed is that it happens somewhere: a
      wash of the realm's own mountains above it, the rows on warm dark paper instead of
      blue, and gold instead of cyan for the one number that matters.</p>
  </section>

  <section class="sec">
    <h2><span class="h">境</span> The realms, as places</h2>
    <p class="t">Ink mountains, three washes deep, with the realm's own pigment in the
      middle distance and a cinnabar seal stamped in the corner. All of it generated: the
      ridges are seeded by the realm, so a realm's mountains are always its own.</p>
    <div class="rcards">
      ${realmCard(1)}${realmCard(4)}${realmCard(7)}${realmCard(9)}
    </div>
  </section>

  <section class="sec">
    <h2><span class="h">印</span> The seal, and the logo</h2>
    <p class="t">A cinnabar seal is the most recognisable object in this whole tradition
      and the game already has the shape of one. Stamped in a corner it does what a logo
      does, and it costs one function.</p>
    <div class="box">
      <div class="beasts">
        ${['九', '境', '道', '氣'].map((c) => `<figure>
          ${stamp(c, 76)}<figcaption>${c}</figcaption></figure>`).join('')}
      </div>
    </div>
    <h3>標 And the prompt for the mark itself</h3>
    <pre>${logoPrompt}</pre>
  </section>

  <section class="sec">
    <h2><span class="h">詞</span> The prompts, rewritten</h2>
    <p class="t">The old style block asked for a near-black void, rim light and a single
      strong hue, which is a description of neon. This one asks for silk, mineral pigment
      and empty space, and it says out loud what the pictures are supposed to feel like:
      <b>a plate from a bestiary somebody believed in six hundred years ago.</b></p>
    <h3>同 The style block every prompt carries</h3>
    <pre>${STYLE}</pre>
    <h3>獸 And a creature, with it</h3>
    <pre>${beastPrompt(wardenOf(6))}</pre>
    <pre>${beastPrompt(commonsOf(2)[0])}</pre>
    <div class="rule"><b>What changed, line by line.</b> Out: near-black void, rim light,
      dramatic lighting, one strong hue, digital art. In: aged silk, wet brush, ink
      bleeding into the fibre, mineral pigment, mist, Song dynasty composition, and the
      instruction that nothing emits light except a lantern or the moon. The list of
      refusals grew too: no neon, no glow, no cyberpunk, no science fiction.</div>
  </section>

  <section class="sec">
    <h2><span class="h">工</span> What it would take in the code</h2>
    <table>
      <tr><th>Change</th><th>Where</th><th>Size of it</th></tr>
      <tr><td><b>The nine realm colours</b></td><td><code>src/data/realms.ts</code></td>
        <td>Nine hex values. Everything in the game reads the realm's colour from there,
          so the whole app re-dyes itself from one edit.</td></tr>
      <tr><td><b>The five UI colours</b></td><td><code>src/app/theme.css</code></td>
        <td>Ground, panel, line, text, faint. An afternoon, plus a pass over every screen
          to find the places that hard-coded cyan.</td></tr>
      <tr><td><b>The frame</b></td><td><code>src/art/plate.ts</code></td>
        <td>The ensō replaces the ring. One function, already written on this page.</td></tr>
      <tr><td><b>The scenery</b></td><td><code>src/art/scene.ts</code></td>
        <td>Ink washes replace the gradient sky. The shape of the code is the same.</td></tr>
      <tr><td><b>The paper</b></td><td><code>src/app/theme.css</code></td>
        <td>One turbulence filter over the ground, at very low opacity. It is the single
          cheapest thing on this list and it is most of what makes a screen feel
          painted.</td></tr>
    </table>
    <div class="rule"><b>The honest warning.</b> Cyan reads as 氣 qi to anybody who has
      played an idle game, and gold on dark reads as expensive. This direction is more
      beautiful and it is less legible at a glance: a jade and a celadon realm are closer
      together than a cyan and a blue one. If we go, the fix is to lean harder on the
      characters and the seals for identity, which is the tradition's own answer.</div>
  </section>

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Written by <code>npm run ink</code>. Every drawing generated from the game's own
      tables and its own icon set. Icons from game-icons.net under CC BY 3.0.</p>
  </footer>
</div>
`;

const lifted = liftArt(page, 'ink-plates');
writeFileSync('ink.html', lifted.page);
const kb = Math.round(writePlates('ink-plates', lifted.plates) / 1024);
console.log(`ink.html · ${Math.round(lifted.page.length / 1024)} KB · ${lifted.plates.size} drawings · ${kb} KB beside it`);
