import { mix } from './aura.ts';
import { realm as realmOf } from '../data/realms.ts';

/**
 * 境 The place a fight happens in.
 *
 * The first arena drew the two fighters on a translucent scrim with the hunt list
 * showing through, which reads as a dialog box over a list rather than as a fight. A
 * fight needs somewhere to be: a sky, a horizon, and a floor to stand on.
 *
 * The scene belongs to the **beast's** realm, not the cultivator's. You go to where the
 * thing lives. That also makes the climb visible: the ninth realm's sky is nothing like
 * the first's, without a single new drawing.
 *
 * Two rules, both learned by getting them wrong:
 *
 *   1. Every band must meet the next one exactly. A ridge that stops eight pixels short
 *      of the floor lets the lit bottom of the sky gradient through, and it reads as a
 *      bright bar painted across the screen.
 *   2. The skyline is seeded by the realm, so a realm's sky is always the same sky. A
 *      horizon that reshuffles on every fight is scenery you cannot recognise.
 */

const W = 320;
const H = 300;
/** Where the floor is, in the scene's own coordinates. */
export const FLOOR = 262;

/** A ridge of hills. Same seed, same hills, for as long as the realm exists. */
function ridge(seed: number, width: number, height: number, peaks: number): string {
  let a = seed * 2654435761 % 2147483647;
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pts = [`0,${height}`];
  for (let i = 0; i <= peaks; i++) {
    pts.push(`${((i / peaks) * width).toFixed(0)},${(height - (0.25 + rnd() * 0.75) * height).toFixed(0)}`);
  }
  pts.push(`${width},${height}`);
  return pts.join(' ');
}

/**
 * 塵 Motes of qi hanging in the upper air.
 *
 * Without them the top third of the sky is a flat wash, and a flat wash is not a place.
 * There are more of them the higher the realm, which is the same idea the aura already
 * uses: the air itself gets busier as you climb.
 */
function motes(realm: number, colour: string): string {
  let a = (realm * 97 + 13) * 2654435761 % 2147483647;
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const n = 6 + realm * 2;
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = 14 + rnd() * (FLOOR - 120);
    const r = 0.7 + rnd() * 1.5;
    const o = (0.12 + rnd() * 0.3).toFixed(2);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${colour}" opacity="${o}"/>`;
  }
  return out;
}

export function arenaScene(realm: number): string {
  const r = realmOf(realm);
  const uid = `s${r.n}`;
  const far = mix(r.colour, '#05060F', 0.78);
  const near = mix(r.colour, '#05060F', 0.88);

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
    <defs>
      <linearGradient id="sky${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${mix(r.colour, '#05060F', 0.95)}"/>
        <stop offset=".62" stop-color="${mix(r.colour, '#05060F', 0.7)}"/>
        <stop offset=".86" stop-color="${mix(r.colour, '#05060F', 0.34)}"/>
      </linearGradient>
      <linearGradient id="haze${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${r.colour}" stop-opacity="0"/>
        <stop offset="1" stop-color="${r.colour}" stop-opacity=".26"/>
      </linearGradient>
      <linearGradient id="edge${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${r.colour}" stop-opacity="0"/>
        <stop offset=".5" stop-color="${r.colour}" stop-opacity=".6"/>
        <stop offset="1" stop-color="${r.colour}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${FLOOR}" fill="url(#sky${uid})"/>
    ${motes(r.n, r.colour)}
    <polygon points="${ridge(r.n * 7 + 1, W, 150, 7)}" fill="${far}" transform="translate(0 ${FLOOR - 206})"/>
    <polygon points="${ridge(r.n * 23 + 5, W, 122, 6)}" fill="${near}" transform="translate(0 ${FLOOR - 122})"/>
    <rect y="${FLOOR - 28}" width="${W}" height="28" fill="url(#haze${uid})"/>
    <rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="#05060F"/>
    <rect y="${FLOOR - 2}" width="${W}" height="2" fill="url(#edge${uid})"/>
  </svg>`;
}
