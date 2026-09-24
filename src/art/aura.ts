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

export function portrait({ realm, pulse = 0, focus = false, who = null }: PortraitOptions): string {
  const r = realmOf(realm);
  const t = (r.n - 1) / 8;
  const S = 200;
  const uid = `r${r.n}`;
  const breath = 1 + Math.sin(pulse * Math.PI * 2) * 0.015;

  /**
   * 渡劫 The ninth, drawn as the eighth turning to light.
   *
   * 圖 The ninth painting lets the figure dissolve into the paper, and on the dark ground
   * of the game every cut of it comes out as a head and two scraps: the tribulation realm
   * looked like a torn page for as long as it had a painting. Until it is repainted, the
   * ninth realm shows the eighth figure, whole, with 散 the dissolve below eating into it
   * and a violet light coming up through the robe. It says what the realm is, a body
   * being unmade, and it never looks like a broken file.
   */
  const dissolving = who !== null && r.n === 9;
  const painted = who ? pictureOf('self', figureKey(who, dissolving ? 8 : r.n)) : null;
  /**
   * 淡 How much of the aura to draw once there is a painting inside it.
   *
   * 圖 It was tuned when the middle of this picture was a bright white pictogram that had
   * to compete with it. By the seventh realm it is two halos, beams, icicles and motes
   * in full cinnabar, and against a painted cultivator it simply ate her: the screenshot
   * is a red disc with somebody faintly inside it. The aura's job is to say how far up
   * the climb you are, and it still does that at half strength, because what it is
   * measured against is itself one realm ago.
   */
  const soft = painted ? 0.5 : 1;

  const layers = r.aura.map((name: string, i: number) => {
    const body = ICONS[name];
    if (!body) return '';
    const scale = (2.05 - i * 0.26) * breath;
    const side = S * scale;
    const off = (S - side) / 2;
    const op = (0.13 + 0.07 * i + 0.1 * t) * (focus ? 0.55 : 1) * soft;
    return `<g transform="translate(${off.toFixed(1)} ${off.toFixed(1)}) scale(${(side / 512).toFixed(4)})" fill="${r.colour}" opacity="${op.toFixed(2)}">${body}</g>`;
  }).join('');

  // 圓光 The halo is grouped and named so 動 the motion block can turn it, very slowly,
  // about the head it sits behind rather than about the middle of the picture.
  /**
   * 頭 Where the head is, which is not where it was.
   *
   * 圓光 A halo behind the chest is a plate, not a halo. The drawn figure sits low in its
   * box and the painting used to as well, because the file was a disc of paper two thirds
   * of which was not the person. 滲 the cut ends that: the file is now the figure, so she
   * stands taller in the same box and her head is a quarter of the way down it instead of
   * nearly half.
   */
  const head = painted ? S * 0.27 : S * 0.42;
  const halos = r.halos === 0 ? '' : `<g class="halo" style="transform-origin:${S / 2}px ${head.toFixed(1)}px">${
    Array.from({ length: r.halos }, (_, i) =>
      `<circle cx="${S / 2}" cy="${head.toFixed(1)}" r="${(S * (0.17 + i * 0.09) * breath).toFixed(1)}" fill="none" stroke="${r.colour}" stroke-width="${(1.5 - i * 0.4).toFixed(1)}" stroke-opacity="${((0.75 - i * 0.2) * (soft + 0.2)).toFixed(2)}" stroke-dasharray="${i % 2 ? '5 9' : '0'}"/>`,
    ).join('')}</g>`;

  const core = mix(r.colour, '#FFFFFF', 0.25 + 0.6 * t);
  const figure = ICONS.meditation ?? '';
  const fig = S * 0.46;
  const figOff = (S - fig) / 2;

  /**
   * 修 The cultivator, painted, when the player has said who they are and that figure has
   * a painting of this realm.
   *
   * 圖 Bruno, once the creatures were painted and he was not: *"continua estranho
   * principalmente o cultivador, fora de enquadramento artístico."* He was the last
   * pictogram on a screen full of brushwork.
   *
   * 相 Until they are asked, `who` is null and the shape is drawn, which is nobody in
   * particular and is what every screen has always shown. See data/figures.ts.
   *
   * 光 The aura is not in the painting and must not be. It is the thing that grows with
   * the climb, it breathes on a pulse the code owns, and it is read off the save. So the
   * painting replaces only the figure at the middle of it, and every ring, mote and halo
   * around it still comes from here. A realm with no file keeps the pictogram, which is
   * what every realm looked like before.
   */
  const image = painted
    ? `<image href="${painted}" x="${(S * 0.11).toFixed(1)}" y="${(S * 0.11).toFixed(1)}"
         width="${(S * 0.78).toFixed(1)}" height="${(S * 0.79).toFixed(1)}"
         preserveAspectRatio="xMidYMax meet"/>`
    : '';
  const body = painted && dissolving
    ? `<g filter="url(#dz${uid})" mask="url(#dm${uid})">${image}</g>`
    : painted
    ? image
    : `<g filter="url(#b${uid})" transform="translate(${figOff.toFixed(1)} ${(figOff + S * 0.04).toFixed(1)}) scale(${(fig / 512).toFixed(4)})" fill="${core}">${figure}</g>`;

  return `<svg viewBox="0 0 ${S} ${S}" width="100%" height="100%" role="img" aria-label="${r.name}, realm ${r.n}">
    <defs>
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
      ${dissolving ? `
      <!-- 散 the dissolve: the figure lifted toward the realm's own light, with fractal
           noise turning patches of her to white light, and the lap fading out below. -->
      <filter id="dz${uid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="9" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 3.2 -1.75" result="spots"/>
        <feComposite in="spots" in2="SourceAlpha" operator="in" result="inside"/>
        <feFlood flood-color="#F4EAFF" result="white"/>
        <feComposite in="white" in2="inside" operator="in" result="light"/>
        <feGaussianBlur in="light" stdDeviation="2.2" result="glow"/>
        <feColorMatrix in="SourceGraphic" type="matrix"
          values=".72 .16 .1 0 .12  .12 .66 .1 0 .08  .2 .14 .72 0 .16  0 0 0 1 0" result="lit"/>
        <feMerge><feMergeNode in="lit"/><feMergeNode in="glow"/></feMerge>
      </filter>
      <linearGradient id="dg${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset=".25" stop-color="#fff" stop-opacity="1"/>
        <stop offset="1" stop-color="#fff" stop-opacity=".45"/>
      </linearGradient>
      <mask id="dm${uid}"><rect width="${S}" height="${S}" fill="url(#dg${uid})"/></mask>` : ''}
      <filter id="b${uid}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="${(1.4 + 1.9 * t).toFixed(1)}" result="bl"/>
        <feMerge><feMergeNode in="bl"/><feMergeNode in="bl"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.5}" fill="url(#g${uid})"/>
    ${halos}
    <!-- The aura is masked by a radial gradient: scaled to 2x it hits the edge of the
         viewBox, and without the mask the icons show as hard cropped blocks instead of
         as glow. -->
    <g mask="url(#k${uid})">${layers}</g>
    ${body}
  </svg>`;
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
