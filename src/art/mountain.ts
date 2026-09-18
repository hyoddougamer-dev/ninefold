import { BANDS } from '../data/mountain.ts';
import { CINNABAR, GOLD, JADE, LACQUER, PHASE_LIGHT, mix, recede } from './palette.ts';
import { ridgeline, seeded } from './rng.ts';

/**
 * 九重山 The mountain, drawn as a 山水 hanging scroll.
 *
 * A landscape scroll already *is* a tall mountain read from the bottom up, and it solves
 * depth with haze instead of perspective — which is the one trick that lets nine planes
 * stack in a phone-shaped frame without turning into nine stripes.
 *
 * Three rules hold the picture together:
 *
 *   1. One mass, not nine bands. Every ridge is a plateau that narrows with altitude, so
 *      the planes nest into a single silhouette instead of stacking into a bar chart.
 *   2. Near is ink, far is light. A near ridge is almost the lacquer itself; a far one is
 *      most of the way to the sky. Contrast, not colour, carries distance.
 *   3. Colour arrives with altitude. The foot of the mountain is nearly monochrome and
 *      the peak is fully in its phase, so *climbing* is what puts colour in the world.
 *
 * Nothing is illustrated, so nothing can drift — which is what killed the last library.
 */

export interface Camp {
  /** 1..9 */
  readonly band: number;
  /** 0..1 across the width. */
  readonly at: number;
  readonly you?: boolean;
}

export interface MountainOptions {
  readonly frontier: number;
  readonly camps?: readonly Camp[];
  readonly width?: number;
  readonly bandHeight?: number;
  /** 0..1 of the collective offering against the next seal. */
  readonly offering?: number;
}

const f = (n: number) => n.toFixed(1);
const N = BANDS.length;

/** 0 at the foot, 1 at the peak. Everything in the picture is a function of this. */
const altitude = (n: number) => (n - 1) / (N - 1);

/** The haze a plane at this altitude sits behind. */
const fog = (n: number) => recede(PHASE_LIGHT[BANDS[n - 1].phase], 0.66 - 0.32 * altitude(n));

/** The body of a plane: near ridges are ink, far ridges are most of the way to the fog. */
function planeFill(n: number): string {
  const a = altitude(n);
  const ink = mix(LACQUER, PHASE_LIGHT[BANDS[n - 1].phase], 0.05 + 0.07 * a);
  return mix(ink, fog(n), a ** 1.05 * 0.86);
}

/**
 * The crest of one plane, as points across the frame.
 *
 * A mountain is not a dome. Each plane is the upper envelope of two to four *tents* —
 * a dominant summit plus subordinate shoulders — and fractal noise is added on top of
 * that, never in place of it. Taking the max of tents is what produces the notches
 * between peaks; a sum, or a gaussian, would smooth them back into the hill this
 * started out as.
 *
 * The dominant summit drifts off-centre by plane, because nine peaks stacked on one
 * axis read as a target, not as a range.
 */
function crestPoints(n: number, w: number, y0: number, bh: number): [number, number][] {
  const rnd = seeded(`crest:${n}`);
  const noise = ridgeline(rnd, 7, 0.5, 0.35, 0.35);
  const a = altitude(n);

  // The summit wanders, but never far enough to leave the mass.
  const cx = 0.5 + (rnd() - 0.5) * (0.34 - 0.2 * a);
  const half = 0.92 - 0.5 * a;
  const rise = bh * (0.9 + 0.72 * a);

  interface Tent { x: number; w: number; h: number }
  const tents: Tent[] = [{ x: cx, w: half, h: 1 }];
  const extra = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < extra; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    tents.push({
      x: cx + side * (0.22 + rnd() * 0.5) * half,
      w: half * (0.3 + rnd() * 0.45),
      h: 0.42 + rnd() * 0.4,
    });
  }

  const amp = bh * (0.28 - 0.12 * a);
  const pts: [number, number][] = [];
  for (let k = 0; k < noise.length; k++) {
    const t = k / (noise.length - 1);
    let elev = 0;
    for (const tent of tents) {
      const u = Math.abs(t - tent.x) / tent.w;
      // ^0.88 keeps the flank very slightly convex; a straight tent reads as origami.
      if (u < 1) elev = Math.max(elev, tent.h * Math.pow(1 - u, 0.88));
    }
    pts.push([t * w, y0 + bh * 0.46 - elev * rise + (noise[k] - 0.35) * amp]);
  }
  return pts;
}

/**
 * Light smoothing only. The curve control points sit a third of the way along, not at
 * the midpoint, because midpoint controls flatten every notch the tents just made.
 */
function pathThrough(pts: readonly [number, number][]): string {
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = (x1 - x0) / 3;
    d += ` C ${f(x0 + dx)} ${f(y0)} ${f(x1 - dx)} ${f(y1)} ${f(x1)} ${f(y1)}`;
  }
  return d;
}

/** 皴 Texture strokes down the face of a near plane. Rock, suggested rather than drawn. */
function texture(n: number, pts: readonly [number, number][], h: number): string {
  const a = altitude(n);
  if (a > 0.55) return '';                    // far planes are haze; texture would be noise
  const rnd = seeded(`cun:${n}`);
  const ink = mix(LACQUER, planeFill(n), 0.45);
  let o = '';
  for (let i = 3; i < pts.length - 3; i += 5) {
    if (rnd() > 0.62) continue;
    const [x, y] = pts[i];
    const len = 26 + rnd() * 74 * (1 - a);
    if (y + len > h) continue;
    o += `<path d="M ${f(x)} ${f(y + 3)} q ${f((rnd() - 0.5) * 7)} ${f(len / 2)} ${f((rnd() - 0.5) * 11)} ${f(len)}" fill="none" stroke="${ink}" stroke-width="${(0.8 + rnd() * 0.9).toFixed(1)}" stroke-opacity="${(0.16 + 0.22 * (1 - a)).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return o;
}

export function mountain(opts: MountainOptions): string {
  const w = opts.width ?? 420;
  const bh = opts.bandHeight ?? 150;
  const topPad = 120;
  const h = topPad + N * bh;
  const frontier = Math.max(1, Math.min(N, opts.frontier));
  const crestY = (n: number) => topPad + (N - n) * bh;

  // 天 The sky: lacquer at the foot, the peak's own phase at the top.
  let o =
    `<defs><linearGradient id="sky" x1="0" y1="1" x2="0" y2="0">` +
    `<stop offset="0" stop-color="${LACQUER}"/>` +
    `<stop offset=".42" stop-color="${mix(LACQUER, fog(5), 0.3)}"/>` +
    `<stop offset=".78" stop-color="${mix(LACQUER, fog(8), 0.55)}"/>` +
    `<stop offset="1" stop-color="${fog(9)}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;

  // 月 One cold disc behind the summit, to give the peak something to stand against.
  o += `<circle cx="${f(w * 0.68)}" cy="${f(topPad * 0.46)}" r="30" fill="${recede(PHASE_LIGHT.water, 0.28)}" fill-opacity=".5"/>`;

  // Farthest plane first, so every nearer ridge occludes the one behind it.
  const crests: Record<number, [number, number][]> = {};
  for (let n = N; n >= 1; n--) {
    const pts = crestPoints(n, w, crestY(n), bh);
    crests[n] = pts;
    const fill = planeFill(n);
    const a = altitude(n);

    // 霧 Mist banked against the foot of the plane behind, which is what separates them.
    o +=
      `<defs><linearGradient id="mist${n}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${fog(n)}" stop-opacity="0"/>` +
      `<stop offset=".6" stop-color="${fog(n)}" stop-opacity="${(0.3 + 0.35 * a).toFixed(2)}"/>` +
      `<stop offset="1" stop-color="${fog(n)}" stop-opacity="0"/></linearGradient></defs>` +
      `<rect x="0" y="${f(crestY(n) + bh * 0.1)}" width="${w}" height="${f(bh * 0.8)}" fill="url(#mist${n})"/>`;

    const d = pathThrough(pts);
    const foot = mix(fill, LACQUER, 0.42 - 0.3 * a);
    const lit = mix(fill, PHASE_LIGHT[BANDS[n - 1].phase], 0.12 + 0.1 * a);
    o +=
      `<defs><linearGradient id="face${n}" x1="0" y1="0" x2="0" y2="1" ` +
      `gradientUnits="userSpaceOnUse" y1="${f(crestY(n) - bh * 0.5)}" y2="${f(crestY(n) + bh * 1.35)}">` +
      `<stop offset="0" stop-color="${lit}"/>` +
      `<stop offset=".35" stop-color="${fill}"/>` +
      `<stop offset="1" stop-color="${foot}"/></linearGradient></defs>`;
    o += `<path d="${d} L ${f(w)} ${f(h)} L 0 ${f(h)} Z" fill="url(#face${n})"/>`;
    o += texture(n, pts, h);
    // 稜 A lit rim along the crest: the one bright line that says this is an edge.
    o += `<path d="${d}" fill="none" stroke="${mix(fill, PHASE_LIGHT[BANDS[n - 1].phase], 0.55)}" stroke-width="${(1.5 - a * 0.7).toFixed(2)}" stroke-opacity="${(0.55 - a * 0.25).toFixed(2)}"/>`;
  }

  // 徑 The path: one dashed route threading the crests, so the climb reads as a journey.
  const prn = seeded('route');
  let route = `M ${f(w * 0.5)} ${f(h - 6)}`;
  for (let n = 1; n <= N; n++) {
    const pts = crests[n];
    const i = Math.floor((0.3 + 0.4 * prn()) * (pts.length - 1));
    const [x, y] = pts[i];
    route += ` Q ${f(x + (prn() - 0.5) * 90)} ${f(y + bh * 0.6)} ${f(x)} ${f(y + 6)}`;
  }
  o += `<path d="${route}" fill="none" stroke="${JADE}" stroke-width="1.4" stroke-opacity=".3" stroke-dasharray="4 8" stroke-linecap="round"/>`;

  // 營 Camps, planted on the crest they belong to. Everyone climbs the same mountain,
  // so you can see exactly where the others decided to stop.
  for (const c of opts.camps ?? []) {
    if (c.band > frontier) continue;
    const pts = crests[c.band];
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(c.at * (pts.length - 1))));
    const [x, y] = pts[i];
    const col = c.you ? GOLD : JADE;
    o +=
      `<line x1="${f(x)}" y1="${f(y + 2)}" x2="${f(x)}" y2="${f(y - (c.you ? 15 : 8))}" stroke="${col}" stroke-width="${c.you ? 1.7 : 0.9}" stroke-opacity="${c.you ? 0.95 : 0.45}"/>` +
      `<circle cx="${f(x)}" cy="${f(y + 2)}" r="${c.you ? 3.2 : 1.7}" fill="${col}" fill-opacity="${c.you ? 1 : 0.55}"/>`;
    if (c.you) {
      o += `<circle cx="${f(x)}" cy="${f(y + 2)}" r="10" fill="none" stroke="${GOLD}" stroke-width="1" stroke-opacity=".45"/>`;
    }
  }

  // 封 The seal. It dims what is above the frontier and hatches it, but it does not
  // blank it — a wall you cannot see past is not a mountain you want to climb.
  if (frontier < N) {
    const yb = crestY(frontier) + bh * 0.3;
    o +=
      `<defs><linearGradient id="sealfade" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${LACQUER}" stop-opacity=".62"/>` +
      `<stop offset="1" stop-color="${LACQUER}" stop-opacity=".18"/></linearGradient></defs>` +
      `<rect x="0" y="0" width="${w}" height="${f(yb)}" fill="url(#sealfade)"/>`;
    for (let x = -yb; x < w + yb; x += 26) {
      o += `<line x1="${f(x)}" y1="${f(yb)}" x2="${f(x + yb)}" y2="0" stroke="${CINNABAR}" stroke-width=".6" stroke-opacity=".1"/>`;
    }
    const cy = Math.min(yb - 70, topPad + 60);
    const s = 27;
    o +=
      `<rect x="${f(w / 2 - s)}" y="${f(cy - s)}" width="${f(s * 2)}" height="${f(s * 2)}" rx="3" fill="${LACQUER}" fill-opacity=".5" stroke="${CINNABAR}" stroke-width="2.2" stroke-opacity=".92"/>` +
      `<text x="${f(w / 2)}" y="${f(cy + 14)}" font-size="38" text-anchor="middle" fill="${CINNABAR}" fill-opacity=".95" font-family="Noto Serif SC, serif">封</text>`;
    const bw = w * 0.46;
    const bx = (w - bw) / 2;
    const by = cy + s + 22;
    o +=
      `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="4" rx="2" fill="${CINNABAR}" fill-opacity=".25"/>` +
      `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw * Math.max(0, Math.min(1, opts.offering ?? 0)))}" height="4" rx="2" fill="${GOLD}" fill-opacity=".92"/>`;
  }

  // 名 The names, down the left margin, each in the phase of its own altitude.
  for (let n = 1; n <= N; n++) {
    const band = BANDS[n - 1];
    const sealed = n > frontier;
    const y = crestY(n) + 30;
    const col = sealed ? '#64756C' : PHASE_LIGHT[band.phase];
    [...band.han].forEach((ch, k) => {
      o += `<text x="15" y="${f(y + k * 20)}" font-size="17" fill="${col}" fill-opacity="${sealed ? 0.5 : 0.9}" font-family="Noto Serif SC, serif">${ch}</text>`;
    });
    o += `<text x="35" y="${f(y - 3)}" font-size="9" letter-spacing="1.5" fill="${col}" fill-opacity="${sealed ? 0.32 : 0.6}" font-family="ui-sans-serif, system-ui, sans-serif">${band.name.toUpperCase()}</text>`;
  }

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="九重山, the nine-tiered mountain">${o}</svg>`;
}
