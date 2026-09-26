import { ICONS } from './icons.generated.ts';
import { pictureOf } from '../data/pictures.ts';
import { figureKey } from '../data/figures.ts';
import { realm as realmOf } from '../data/realms.ts';

/**
 * 氣象 The cultivator's portrait.
 *
 * One figure, the same in every realm: what changes is the air around it. The auras
 * are stacked: a large faint icon behind, tighter and stronger ones in front, in the
 * realm's colour, with a glow that grows.
 *
 * Two rules the first attempt broke, now law:
 *
 *   1. The halo is drawn, not an icon. As an icon it read as a cog behind the head.
 *   2. The figure burns toward white as it climbs. Without that the aura swallowed the
 *      cultivator from the seventh realm on, which inverts the whole point of the image
 *     : the figure must stay the clearest thing however loud the aura gets.
 */

export function mix(a: string, b: string, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  const v = (s: string, i: number) => parseInt(s.slice(1 + i, 3 + i), 16);
  const c = (i: number) => Math.round(v(a, i) * (1 - t) + v(b, i) * t);
  return `#${[0, 2, 4].map((i) => c(i).toString(16).padStart(2, '0')).join('')}`;
}

export interface PortraitOptions {
  readonly realm: number;
  /** 0..1: a breathing pulse, so the figure is never quite still. */
  readonly pulse?: number;
  /** Dims everything but the figure, for combat. */
  readonly focus?: boolean;
  /** 相 Which figure the player chose, or null while the game has not asked. */
  readonly who?: string | null;
}

/**
 * 層 One piece of the picture: static markup, or a layer that moves.
 *
 * `anim` names the stylesheet class that moves it and `origin` is where it turns or
 * swells from, as a share of the picture. `over` puts it in front of the cultivator.
 */
interface Part {
  readonly svg: string;
  readonly anim?: string;
  readonly origin?: string;
  readonly over?: boolean;
  /** Fade toward the edge of the picture, for soft things that would end in a hard line. */
  readonly masked?: boolean;
  readonly delay?: string;
}

interface Built {
  readonly name: string;
  readonly defs: string;
  readonly parts: readonly Part[];
  readonly body: string;
  readonly mask: string;
}

function build({ realm, focus = false, who = null }: PortraitOptions): Built {
  const r = realmOf(realm);
  const t = (r.n - 1) / 8;
  const S = 200;
  const uid = `r${r.n}${who ?? ''}${focus ? 'f' : ''}`;

  /**
   * 渡劫 The ninth has its own painting again.
   *
   * 圖 The first ninth let the figure dissolve into the paper, and on the dark ground of
   * the game every cut of it came out as a head and two scraps, so for a while the ninth
   * realm drew the eighth figure dissolving into light instead. The ninth was repainted
   * whole on a leaf of its own, and it is simply the ninth again.
   */
  const painted = who ? pictureOf('self', figureKey(who, r.n)) : null;
  /**
   * 淡 How much of the aura to draw once there is a painting inside it.
   *
   * 圖 It was tuned when the middle of this picture was a bright white pictogram that had
   * to compete with it. Against a painted cultivator a full-strength aura simply ate her.
   * The aura's job is to say how far up the climb you are, and it still does that at half
   * strength, because what it is measured against is itself one realm ago.
   */
  const soft = painted ? 0.5 : 1;

  /**
   * 頭 Where the head is. The painting is the figure and nothing else, so she stands
   * taller in the box and her head is a quarter of the way down it; the drawn shape sits
   * lower.
   */
  const head = painted ? S * 0.27 : S * 0.42;

  const core = mix(r.colour, '#FFFFFF', 0.25 + 0.6 * t);
  const figure = ICONS.meditation ?? '';
  const fig = S * 0.46;
  const figOff = (S - fig) / 2;

  /**
   * 修 The cultivator, painted, when the player has said who they are and that figure has
   * a painting of this realm. Until they are asked, `who` is null and the shape is drawn.
   *
   * 光 The aura is not in the painting and must not be. It is the thing that grows with
   * the climb and it is read off the save, so the painting replaces only the figure at
   * the middle, and every ring, thread and blade around it still comes from here.
   */
  const body = painted
    ? `<image href="${painted}" x="${(S * 0.11).toFixed(1)}" y="${(S * 0.11).toFixed(1)}"
         width="${(S * 0.78).toFixed(1)}" height="${(S * 0.79).toFixed(1)}"
         preserveAspectRatio="xMidYMax meet"/>`
    : `<g filter="url(#b${uid})" transform="translate(${figOff.toFixed(1)} ${(figOff + S * 0.04).toFixed(1)}) scale(${(fig / 512).toFixed(4)})" fill="${core}">${figure}</g>`;

  const strength = soft * (focus ? 0.55 : 1);
  const aura = drawnAura(r.n, r.colour, S, painted, strength, uid, head);

  // 圓光 The halo, turning very slowly about the head it sits behind.
  const halo: Part[] = r.halos === 0 ? [] : [{
    anim: 'qa-halo', origin: `50% ${(head / S * 100).toFixed(1)}%`,
    svg: Array.from({ length: r.halos }, (_, i) =>
      `<circle cx="${S / 2}" cy="${head.toFixed(1)}" r="${(S * (0.17 + i * 0.09)).toFixed(1)}" fill="none" stroke="${r.colour}" stroke-width="${(1.5 - i * 0.4).toFixed(1)}" stroke-opacity="${((0.75 - i * 0.2) * (soft + 0.2)).toFixed(2)}" stroke-dasharray="${i % 2 ? '5 9' : '0'}"/>`,
    ).join(''),
  }];

  const defs = `
      <radialGradient id="g${uid}">
        <stop offset="0" stop-color="${r.colour}" stop-opacity="${((0.1 + 0.42 * t) * (focus ? 0.5 : 1) * soft).toFixed(2)}"/>
        <stop offset="1" stop-color="${r.colour}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="m${uid}">
        <stop offset="0" stop-color="#fff" stop-opacity="1"/>
        <stop offset=".62" stop-color="#fff" stop-opacity=".9"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <mask id="k${uid}"><rect width="${S}" height="${S}" fill="url(#m${uid})"/></mask>
      <filter id="b${uid}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="${(1.4 + 1.9 * t).toFixed(1)}" result="bl"/>
        <feMerge><feMergeNode in="bl"/><feMergeNode in="bl"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>${aura.defs}`;

  return {
    name: `${r.name}, realm ${r.n}`,
    defs,
    mask: `k${uid}`,
    body,
    parts: [
      { svg: `<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.5}" fill="url(#g${uid})"/>` },
      ...halo,
      ...aura.parts,
    ],
  };
}

/**
 * The portrait as one picture, still. What the tools, the bible and anything that edits
 * the markup as a string get: every part in place, nothing moving.
 */
export function portrait(o: PortraitOptions): string {
  const b = build(o);
  const draw = (p: Part) => (p.masked ? `<g mask="url(#${b.mask})">${p.svg}</g>` : p.svg);
  return `<svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label="${b.name}">
    <defs>${b.defs}</defs>
    ${b.parts.filter((p) => !p.over).map(draw).join('')}
    ${b.body}
    ${b.parts.filter((p) => p.over).map(draw).join('')}
  </svg>`;
}

/**
 * 動 The portrait as a stack of layers, for the game's own screens.
 *
 * 息 It used to be one SVG rebuilt from the breathing pulse five times a second, so
 * anything inside it that moved started again from nothing every 200ms: the halo that
 * was meant to turn once every two minutes never turned. And moving an element *inside*
 * an SVG costs a layout and a repaint of the whole picture on every frame, which the
 * first drawn aura measured at 60 layouts a second on the ninth realm.
 *
 * So each moving part is its own SVG, stacked, and the stylesheet moves the whole layer.
 * A layer that only turns, drifts or fades is the one kind of motion a browser hands to
 * the graphics chip, and the picture underneath is painted once. The markup changes only
 * when the realm or the face does, and the breathing lives on the wrapper in CSS.
 */
export function portraitLayers(o: PortraitOptions): string {
  const b = build(o);
  const svg = (inner: string, cls = '', style = '') =>
    `<svg viewBox="0 0 200 200" aria-hidden="true"${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''}>${inner}</svg>`;
  const draw = (p: Part) => (p.masked ? `<g mask="url(#${b.mask})">${p.svg}</g>` : p.svg);
  const layer = (p: Part) => (p.anim
    ? svg(draw(p), `qa-layer ${p.anim}`, [p.origin ? `transform-origin:${p.origin}` : '', p.delay ? `animation-delay:${p.delay}` : ''].filter(Boolean).join(';'))
    : '');
  const still = (over: boolean) => b.parts.filter((p) => !!p.over === over && !p.anim).map(draw).join('');
  return `<span class="qa-stack" role="img" aria-label="${b.name}">${
    svg(`<defs>${b.defs}</defs>${still(false)}`)}${
    b.parts.filter((p) => !p.over && p.anim).map(layer).join('')}${
    svg(`${b.body}${still(true)}`)}${
    b.parts.filter((p) => p.over && p.anim).map(layer).join('')}</span>`;
}

/**
 * 氣 The aura, drawn rather than borrowed.
 *
 * Bruno: *"preciso de mais sumo xianxia/wuxia, está muito desenquadrado os sons e
 * animações de auras."* The aura was four game-icons.net glyphs (a sun, rays, icicles, a
 * helix) blown up to twice the picture and blurred behind a painted cultivator. At the
 * seventh realm it read as two dark pillars, at the ninth as a scatter of squares. Clip
 * art behind brushwork.
 *
 * So it is drawn here, in the vocabulary of the genre, one thing added per realm so the
 * aura still says how far up the climb somebody is:
 *
 *   1 練氣  氣 threads of qi rising off the body
 *   2 築基  陣 a formation circle turning under the seat
 *   3 金丹  丹 the golden core, lit in the lower belly
 *   4 元嬰  塵 motes drawn in on slow orbits
 *   5 化神  相 the spirit body: the cultivator's own shape, larger, behind them
 *   6 煉虛  芒 brush-stroke rays from behind the head
 *   7 合體  劍 flying swords circling
 *   8 大乘  卦 the eight trigrams turning around them
 *   9 渡劫  雷 the tribulation's lightning
 */
function drawnAura(n: number, colour: string, S: number, painted: string | null, strength: number,
  id: string, head: number): { defs: string; parts: Part[] } {
  const c = colour;
  const light = mix(colour, '#FFFFFF', 0.45);
  const k = (x: number) => (x * strength).toFixed(2);
  const cx = S / 2;
  const parts: Part[] = [];
  const pc = (x: number, y: number) => `${(x / S * 100).toFixed(1)}% ${(y / S * 100).toFixed(1)}%`;

  // 相 5: the spirit body. The same painting, larger, in the realm's colour, breathing a
  // beat behind the body in front of it. First, so everything else is drawn over it.
  if (n >= 5 && painted) {
    parts.push({ anim: 'qa-ghost', origin: pc(cx, 180), masked: true,
      svg: `<g opacity="${k(0.3)}" filter="url(#qaGhost${id})"><image href="${painted}" x="${(S * 0.02).toFixed(1)}" y="${(S * -0.06).toFixed(1)}" width="${(S * 0.96).toFixed(1)}" height="${(S * 0.97).toFixed(1)}" preserveAspectRatio="xMidYMax meet"/></g>` });
  }

  // 芒 6: rays from behind the head, each a tapered brush stroke.
  if (n >= 6) {
    const rays = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      const len = i % 2 ? 58 : 76;
      const w = i % 2 ? 1.6 : 2.6;
      const x1 = cx + Math.cos(a) * 30, y1 = head + Math.sin(a) * 30;
      const x2 = cx + Math.cos(a) * len, y2 = head + Math.sin(a) * len;
      const px = -Math.sin(a) * w, py = Math.cos(a) * w;
      return `<path d="M${(x1 + px).toFixed(1)} ${(y1 + py).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${(x1 - px).toFixed(1)} ${(y1 - py).toFixed(1)} Z"/>`;
    }).join('');
    parts.push({ anim: 'qa-spin-slow', origin: pc(cx, head), masked: true,
      svg: `<g fill="${c}" opacity="${k(0.45)}">${rays}</g>` });
  }

  // 氣 1: threads of qi rising and thinning, two sets out of step so it never stops.
  const wisps = [
    'M66 168 C50 140 80 124 62 96 C50 76 70 62 58 36',
    'M134 166 C150 138 120 122 138 94 C150 74 130 60 142 34',
    'M84 150 C74 128 94 112 82 88 C74 70 88 56 80 30',
    'M116 150 C126 128 106 112 118 88 C126 70 112 56 120 30',
  ];
  const wispSet = (from: number) => `<g fill="none" stroke="${light}" stroke-linecap="round" filter="url(#qaSoft${id})">${wisps.slice(from, from + 2).map((d, i) =>
    `<path d="${d}" stroke-width="${(i === 0 ? 5 : 3.8).toFixed(1)}" stroke-opacity="${k(0.9)}" stroke-dasharray="52 400"/>`).join('')}</g>`;
  // In front, and lightened into what is under them rather than painted over it: the
  // painting fills the picture, and behind it they were never seen at all.
  parts.push({ anim: 'qa-rise', over: true, svg: `<g style="mix-blend-mode:screen">${wispSet(0)}</g>` });
  parts.push({ anim: 'qa-rise', over: true, delay: '-3.2s', svg: `<g style="mix-blend-mode:screen">${wispSet(2)}</g>` });

  // 塵 4: motes on slow orbits, two rings turning opposite ways.
  if (n >= 4) {
    const ring = (r: number, count: number, size: number) => Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r;
      return `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(108 + Math.sin(a) * r).toFixed(1)}" r="${size}" opacity="${(0.45 + ((i * 37) % 55) / 100).toFixed(2)}"/>`;
    }).join('');
    parts.push({ anim: 'qa-orbit', origin: pc(cx, 108), svg: `<g fill="${light}" opacity="${k(1.4)}">${ring(72, 7, 1.7)}</g>` });
    parts.push({ anim: 'qa-orbit-back', origin: pc(cx, 108), svg: `<g fill="${light}" opacity="${k(1.4)}">${ring(88, 9, 1.3)}</g>` });
  }

  // 劍 7: flying swords, circling, each pointed along its path.
  if (n >= 7) {
    const sword = `<g transform="scale(1.35)"><path d="M0 -13 L1.7 -9 L1.7 6 L-1.7 6 L-1.7 -9 Z"/><rect x="-4.2" y="6" width="8.4" height="1.6" rx=".6"/><rect x="-0.9" y="7.6" width="1.8" height="5.5"/></g>`;
    const count = n >= 9 ? 9 : 6;
    const swords = Array.from({ length: count }, (_, i) =>
      `<g transform="rotate(${((i / count) * 360).toFixed(1)}) translate(0 -84) rotate(90)">${sword}</g>`).join('');
    parts.push({ anim: 'qa-swords', origin: pc(cx, 108),
      svg: `<g transform="translate(${cx} 108)" filter="url(#qaGlow${id})" fill="${mix(colour, '#FFFFFF', 0.5)}" opacity="${k(1.25)}">${swords}</g>` });
  }

  // 卦 8: the eight trigrams, in the Later Heaven order, turning the other way.
  if (n >= 8) {
    const TRI = ['111', '011', '101', '001', '110', '010', '100', '000'];
    const tri = TRI.map((bits, i) => {
      const bars = [...bits].map((b, j) => b === '1'
        ? `<rect x="-6" y="${-5 + j * 4}" width="12" height="2.2"/>`
        : `<rect x="-6" y="${-5 + j * 4}" width="5" height="2.2"/><rect x="1" y="${-5 + j * 4}" width="5" height="2.2"/>`).join('');
      return `<g transform="rotate(${i * 45}) translate(0 -88)">${bars}</g>`;
    }).join('');
    parts.push({ anim: 'qa-spin-back', origin: pc(cx, 108),
      svg: `<g transform="translate(${cx} 108)" fill="${light}" opacity="${k(1.2)}"><circle r="96" fill="none" stroke="${light}" stroke-width=".8" stroke-opacity=".6"/>${tri}</g>` });
  }

  // 丹 3: the golden core, in front of the painting, lighting it from inside.
  if (n >= 3) {
    parts.push({ anim: 'qa-core', origin: pc(cx, 131), over: true,
      svg: `<g style="mix-blend-mode:screen"><circle cx="${cx}" cy="131" r="16" fill="url(#qaCore${id})" opacity="${k(0.9)}"/><circle cx="${cx}" cy="131" r="3.2" fill="#FFF3C4" opacity="${k(0.95)}"/></g>` });
  }

  // 陣 2: a formation circle on the ground, seen at a slant, turning. The slant is the
  // layer's own transform in the stylesheet, so the turning stays a flat rotation.
  if (n >= 2) {
    const ticks = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const r1 = 70, r2 = i % 3 === 0 ? 80 : 75;
      return `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(100 + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(100 + Math.sin(a) * r2).toFixed(1)}"/>`;
    }).join('');
    parts.push({ anim: 'qa-formation', over: true,
      svg: `<g fill="none" stroke="${light}" stroke-opacity="${k(1.1)}"><circle cx="${cx}" cy="100" r="84" stroke-width="2"/><circle cx="${cx}" cy="100" r="64" stroke-width="1.4" stroke-dasharray="6 5"/><g stroke-width="1.6">${ticks}</g></g>` });
  }

  // 雷 9: the tribulation. Two bolts that flash, out of step with each other.
  if (n >= 9) {
    const bolts = ['M28 0 L46 30 L36 34 L58 66 L48 70 L70 102', 'M176 0 L160 26 L170 30 L150 58 L160 62 L140 92'];
    bolts.forEach((d, i) => parts.push({ anim: 'qa-bolt', over: true, delay: `${(i * 2.3).toFixed(1)}s`,
      svg: `<path d="${d}" fill="none" stroke="#F4ECFF" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` }));
  }

  const defs = `
    <radialGradient id="qaCore${id}"><stop offset="0" stop-color="#FFE8A0" stop-opacity=".95"/><stop offset=".45" stop-color="#E7B84E" stop-opacity=".45"/><stop offset="1" stop-color="#E7B84E" stop-opacity="0"/></radialGradient>
    <filter id="qaSoft${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.7"/></filter>
    <filter id="qaGlow${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="qaGhost${id}" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="${c}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="3.2"/></filter>`;
  return { defs, parts };
}

/** A beast's seal: the animal inside a ring in its realm's colour. */
export function seal(iconName: string, colour: string, warden = false): string {
  const body = ICONS[iconName];
  if (!body) return '';
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
    <circle cx="50" cy="50" r="47" fill="none" stroke="${colour}" stroke-opacity="${warden ? 0.55 : 0.25}" stroke-width="${warden ? 1.6 : 1}"/>
    ${warden ? `<circle cx="50" cy="50" r="42" fill="none" stroke="${colour}" stroke-opacity=".3" stroke-width=".8" stroke-dasharray="3 4"/>` : ''}
    <circle cx="50" cy="50" r="38" fill="${colour}" fill-opacity="${warden ? 0.12 : 0.07}"/>
    <g transform="translate(26 26) scale(0.09375)" fill="${colour}">${body}</g>
  </svg>`;
}
