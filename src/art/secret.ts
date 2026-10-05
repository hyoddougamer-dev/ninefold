import { mix } from './aura.ts';
import { realm as realmOf } from '../data/realms.ts';
import type { RoomKind } from '../data/secret.ts';

/**
 * 秘境 The seven rooms, drawn as rooms.
 *
 * Bruno walked the whole thing and came out with the same sentence he has said about
 * the game twice now: *"o jogo é puramente quase só texto."* He was right about this
 * screen in particular. A run was a paragraph, a row of seals and two buttons with a
 * 26-pixel icon on each, and a secret realm that reads like a form is not a place you
 * walked into.
 *
 * 讀 The rule 塔 the tower set stands here too: **the drawing is a reading of the save,
 * not a picture next to it.** The vault is the colour of the realm you are standing in.
 * The arches recede one further for every room already behind you, so room six is
 * visibly deeper underground than room one. The light in the middle is the thing the
 * door is offering, and a gate is drawn as what a gate is: the way on, blocked, with
 * something awake in front of it.
 *
 * 面 Everything here is one wide panel, 320 by 132, drawn to be laid behind a card at
 * any width. Nothing in it is animated by JavaScript: the one moving part is a CSS
 * animation on the class the caller puts on the wrapper, because a run is walked on a
 * phone and a phone should not be running a paint loop to draw a wall.
 */

const W = 320;
const H = 132;
/** Where the floor of the chamber sits. */
const FLOOR = 104;

/** The light a room is lit by: the thing behind the door, in one colour. */
const LIGHT: Record<RoomKind | 'out', string> = {
  spring: '#7FB495',
  // 香 Incense burns violet: the one colour no other door in the vault is lit by.
  incense: '#A994D8',
  shrine: '#D4AF56',
  brazier: '#D07C4A',
  // 匣 The box is lit like old wood and lamp oil, warmer and duller than the shrine's gold.
  box: '#C9A266',
  // 跡 The trail is the challenger's own colour, rust, a step softer than a gate's.
  trail: '#C8835E',
  beast: '#D2604E',
  out: '#EDE3D2',
};

/**
 * 深 The arches, receding. One more of them for every room already walked, up to five,
 * so the picture gets deeper as the run does and the last room is a long way in.
 */
function arches(step: number, wall: string, lit: string): string {
  const n = Math.max(2, Math.min(5, 2 + Math.floor(step / 2)));
  let out = '';
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const w = 176 - k * 104;
    const top = 16 + k * 36;
    const x = W / 2 - w / 2;
    const fade = (0.9 - k * 0.55).toFixed(2);
    out += `<path d="M${x} ${FLOOR} L${x} ${top + 18} Q${W / 2} ${top - 14} ${x + w} ${top + 18} L${x + w} ${FLOOR}"
      fill="none" stroke="${i === n - 1 ? lit : wall}" stroke-opacity="${fade}" stroke-width="${(2.4 - k * 1.2).toFixed(1)}"/>`;
  }
  return out;
}

/**
 * 塵 Dust in the air of the room, seeded by which room it is.
 *
 * The same idea 境 the arena's motes are: without it the upper half of the panel is a
 * flat wash, and a flat wash is not a place. Seeded, so a room does not reshuffle its
 * own air every time React draws it.
 */
function dust(step: number, realm: number, c: string): string {
  let a = ((step + 1) * 7919 + realm * 104729) % 2147483647;
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let out = '';
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W;
    const y = 8 + rnd() * (FLOOR - 20);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rnd() * 1.1).toFixed(1)}" fill="${c}" opacity="${(0.1 + rnd() * 0.28).toFixed(2)}"/>`;
  }
  return out;
}

/** 泉 A spring: a pool with the light under it, and rings going out. */
function spring(c: string): string {
  return `<g>
    <ellipse cx="${W / 2}" cy="${FLOOR - 4}" rx="44" ry="13" fill="${c}" opacity=".22"/>
    <ellipse cx="${W / 2}" cy="${FLOOR - 4}" rx="30" ry="9" fill="${c}" opacity=".3"/>
    <ellipse cx="${W / 2}" cy="${FLOOR - 4}" rx="16" ry="5" fill="${c}" opacity=".55"/>
    <ellipse cx="${W / 2}" cy="${FLOOR - 4}" rx="44" ry="13" fill="none" stroke="${c}" stroke-opacity=".5"/>
    ${[0, 1, 2, 3, 4].map((i) => {
      const x = W / 2 - 26 + i * 13;
      const y = FLOOR - 16 - (i % 3) * 13;
      return `<circle cx="${x}" cy="${y}" r="${1.6 - (i % 3) * 0.3}" fill="${c}" opacity="${0.6 - (i % 3) * 0.15}"/>`;
    }).join('')}
  </g>`;
}

/** 龕 A shrine: a niche cut into the far wall, and a seal in it that has not gone out. */
function shrine(c: string): string {
  const x = W / 2 - 15;
  return `<g>
    <path d="M${x} ${FLOOR - 6} L${x} ${FLOOR - 36} Q${W / 2} ${FLOOR - 52} ${x + 30} ${FLOOR - 36} L${x + 30} ${FLOOR - 6} Z"
      fill="#0D0B08" stroke="${c}" stroke-opacity=".55"/>
    <circle cx="${W / 2}" cy="${FLOOR - 26}" r="9" fill="${c}" opacity=".18"/>
    <circle cx="${W / 2}" cy="${FLOOR - 26}" r="4.5" fill="${c}" opacity=".85"/>
    <rect x="${x - 7}" y="${FLOOR - 6}" width="44" height="6" rx="2" fill="${c}" opacity=".3"/>
  </g>`;
}

/** 爐 A brazier: a bowl on three legs with something still burning in it. */
function brazier(c: string): string {
  const cx = W / 2;
  const top = FLOOR - 34;
  return `<g>
    <path d="M${cx - 20} ${top} L${cx + 20} ${top} L${cx + 13} ${top + 15} L${cx - 13} ${top + 15} Z"
      fill="#17140F" stroke="${c}" stroke-opacity=".6"/>
    <path d="M${cx - 12} ${top + 15} L${cx - 16} ${FLOOR - 2} M${cx + 12} ${top + 15} L${cx + 16} ${FLOOR - 2} M${cx} ${top + 15} L${cx} ${FLOOR - 2}"
      stroke="${c}" stroke-opacity=".45" stroke-width="2"/>
    <path d="M${cx} ${top - 22} Q${cx + 11} ${top - 8} ${cx + 7} ${top - 1} Q${cx} ${top - 6} ${cx - 7} ${top - 1} Q${cx - 11} ${top - 8} ${cx} ${top - 22} Z"
      fill="${c}" opacity=".8"/>
    <ellipse cx="${cx}" cy="${top}" rx="20" ry="5" fill="${c}" opacity=".35"/>
  </g>`;
}

/**
 * 香 A censer: a bowl on a low foot, three sticks lit in it, and the smoke going up in
 * three slow curls. The smoke is the point: it is what says "this keeps going after you
 * have walked on".
 */
function incense(c: string): string {
  const cx = W / 2;
  const rim = FLOOR - 22;
  const sticks = [-8, 0, 8].map((dx, i) => {
    const top = rim - 22 - (i === 1 ? 4 : 0);
    return `<line x1="${cx + dx}" y1="${rim}" x2="${cx + dx}" y2="${top}" stroke="${c}" stroke-opacity=".7" stroke-width="1.4"/>
      <circle cx="${cx + dx}" cy="${top}" r="2" fill="#F4C66B" opacity=".95"/>
      <path d="M${cx + dx} ${top - 3} q 6 -8 0 -16 q -6 -8 0 -16 q 6 -8 1 -15" fill="none" stroke="${c}"
        stroke-opacity="${(0.55 - i * 0.08).toFixed(2)}" stroke-width="1.6" stroke-linecap="round"/>`;
  }).join('');
  return `<g>
    <ellipse cx="${cx}" cy="${FLOOR - 3}" rx="34" ry="6" fill="${c}" opacity=".18"/>
    ${sticks}
    <path d="M${cx - 24} ${rim} L${cx + 24} ${rim} L${cx + 18} ${rim + 12} L${cx - 18} ${rim + 12} Z"
      fill="#17140F" stroke="${c}" stroke-opacity=".6"/>
    <rect x="${cx - 26}" y="${rim - 3}" width="52" height="4" rx="2" fill="${c}" opacity=".55"/>
    <path d="M${cx - 10} ${rim + 12} L${cx - 13} ${FLOOR - 2} L${cx + 13} ${FLOOR - 2} L${cx + 10} ${rim + 12} Z"
      fill="#17140F" stroke="${c}" stroke-opacity=".4"/>
  </g>`;
}

/**
 * 匣 A craftsman's box: dark wood, the lid lifted a little, a brass catch, and a sprig of
 * the realm's herb standing out of it, so it reads as the workshop's and not as treasure.
 */
function box(c: string): string {
  const cx = W / 2;
  const top = FLOOR - 30;
  return `<g>
    <ellipse cx="${cx}" cy="${FLOOR - 2}" rx="40" ry="5" fill="${c}" opacity=".16"/>
    <path d="M${cx - 6} ${top - 2} Q${cx - 12} ${top - 18} ${cx - 4} ${top - 30} M${cx - 8} ${top - 14} Q${cx - 2} ${top - 18} ${cx + 2} ${top - 16}"
      fill="none" stroke="#7FB495" stroke-width="2" stroke-linecap="round" opacity=".9"/>
    <rect x="${cx - 30}" y="${top}" width="60" height="28" rx="2" fill="#120F0B" stroke="${c}" stroke-opacity=".7"/>
    <path d="M${cx - 32} ${top + 1} L${cx - 26} ${top - 9} L${cx + 28} ${top - 13} L${cx + 32} ${top - 2} Z"
      fill="#17140F" stroke="${c}" stroke-opacity=".7"/>
    <path d="M${cx + 14} ${top - 11} l 8 -5 l 4 6" fill="none" stroke="${c}" stroke-opacity=".7" stroke-width="1.6"/>
    <rect x="${cx - 4}" y="${top + 8}" width="8" height="10" rx="1" fill="${c}" opacity=".75"/>
    <line x1="${cx - 30}" y1="${top + 22}" x2="${cx + 30}" y2="${top + 22}" stroke="${c}" stroke-opacity=".25"/>
  </g>`;
}

/**
 * 跡 A trail: prints in the dust of the floor, going in under the last arch and smaller
 * as they go, with a dark drop beside two of them. Something hurt walked this way.
 */
function trail(c: string): string {
  const cx = W / 2;
  const prints = [0, 1, 2, 3, 4].map((i) => {
    const k = i / 4;
    const y = FLOOR - 4 - k * 30;
    const x = cx + (i % 2 ? 9 : -9) * (1 - k * 0.5);
    const r = 4.2 - k * 2;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * 0.8).toFixed(1)}" ry="${r.toFixed(1)}" fill="${c}" opacity="${(0.75 - k * 0.4).toFixed(2)}"/>
      ${[-1, 0, 1].map((t) => `<circle cx="${(x + t * r * 0.6).toFixed(1)}" cy="${(y - r * 1.3).toFixed(1)}" r="${(r * 0.28).toFixed(1)}" fill="${c}" opacity="${(0.7 - k * 0.4).toFixed(2)}"/>`).join('')}`;
  }).join('');
  return `<g>
    <ellipse cx="${cx}" cy="${FLOOR - 16}" rx="40" ry="20" fill="${c}" opacity=".08"/>
    ${prints}
    <circle cx="${cx + 18}" cy="${FLOOR - 9}" r="2" fill="#8E2F24" opacity=".85"/>
    <circle cx="${cx - 14}" cy="${FLOOR - 24}" r="1.5" fill="#8E2F24" opacity=".75"/>
  </g>`;
}

/**
 * 關 A gate: the way on, barred, and something awake in front of it.
 *
 * A guardian is not a room with a prize in it, so it is not drawn as one. Five bars
 * across the last arch and two eyes at the height of a standing thing, which is as much
 * of a beast as this panel should show: the fight itself belongs to 境 the arena, and
 * drawing the whole animal here would promise a picture the tap does not deliver.
 */
function gate(c: string): string {
  const cx = W / 2;
  return `<g>
    ${[0, 1, 2, 3, 4].map((i) => {
      const x = cx - 26 + i * 13;
      return `<line x1="${x}" y1="${FLOOR - 52}" x2="${x}" y2="${FLOOR}" stroke="${c}" stroke-opacity=".38" stroke-width="2.4"/>`;
    }).join('')}
    <ellipse cx="${cx}" cy="${FLOOR - 26}" rx="34" ry="26" fill="${c}" opacity=".1"/>
    <g>
      <ellipse cx="${cx - 9}" cy="${FLOOR - 30}" rx="4.6" ry="3" fill="${c}" opacity=".95"/>
      <ellipse cx="${cx + 9}" cy="${FLOOR - 30}" rx="4.6" ry="3" fill="${c}" opacity=".95"/>
      <ellipse cx="${cx - 9}" cy="${FLOOR - 30}" rx="9" ry="7" fill="${c}" opacity=".2"/>
      <ellipse cx="${cx + 9}" cy="${FLOOR - 30}" rx="9" ry="7" fill="${c}" opacity=".2"/>
    </g>
  </g>`;
}

/** 出 The way out: an arch with the sky behind it, seen from inside. */
function out(c: string): string {
  const cx = W / 2;
  return `<g>
    <path d="M${cx - 30} ${FLOOR} L${cx - 30} ${FLOOR - 44} Q${cx} ${FLOOR - 74} ${cx + 30} ${FLOOR - 44} L${cx + 30} ${FLOOR} Z"
      fill="${c}" opacity=".16"/>
    <path d="M${cx - 30} ${FLOOR} L${cx - 30} ${FLOOR - 44} Q${cx} ${FLOOR - 74} ${cx + 30} ${FLOOR - 44} L${cx + 30} ${FLOOR}"
      fill="none" stroke="${c}" stroke-opacity=".7" stroke-width="2"/>
    <rect x="${cx - 30}" y="${FLOOR - 4}" width="60" height="4" fill="${c}" opacity=".5"/>
  </g>`;
}

export interface ChamberOptions {
  /** What is in it. 'out' is the way back to the world, for the end of a run. */
  readonly kind: RoomKind | 'out';
  /** Which room this is, counted from zero. It is how deep the arches go. */
  readonly step: number;
  /** The realm the walker is standing in. The vault is its colour. */
  readonly realm: number;
}

export function chamber({ kind, step, realm }: ChamberOptions): string {
  const r = realmOf(Math.max(1, Math.min(9, realm)));
  const uid = `k${kind}${step}${r.n}`;
  const lit = LIGHT[kind];
  const wall = mix(r.colour, '#0D0B08', 0.62);
  const deep = mix(r.colour, '#0D0B08', 0.9);

  const middle = kind === 'spring' ? spring(lit)
    : kind === 'incense' ? incense(lit)
    : kind === 'shrine' ? shrine(lit)
      : kind === 'brazier' ? brazier(lit)
        : kind === 'box' ? box(lit)
          : kind === 'trail' ? trail(lit)
            : kind === 'out' ? out(lit) : gate(lit);

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
    <defs>
      <radialGradient id="glow${uid}" cx=".5" cy="${((FLOOR - 26) / H).toFixed(2)}" r=".62">
        <stop offset="0" stop-color="${lit}" stop-opacity=".5"/>
        <stop offset=".55" stop-color="${lit}" stop-opacity=".12"/>
        <stop offset="1" stop-color="${lit}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="floor${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${lit}" stop-opacity=".16"/>
        <stop offset="1" stop-color="${lit}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${deep}"/>
    <rect width="${W}" height="${H}" fill="url(#glow${uid})"/>
    ${arches(step, wall, lit)}
    ${middle}
    ${dust(step, r.n, lit)}
    <rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="url(#floor${uid})"/>
    <rect y="${FLOOR}" width="${W}" height="1" fill="${lit}" opacity=".45"/>
  </svg>`;
}
