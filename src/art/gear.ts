import { ICONS } from './icons.generated.ts';
import {
  RARITY_INFO, SLOT_INFO, realmSet, templateOf, type Item, type Rarity, type Slot,
} from '../data/gear.ts';
import { realm as realmOf } from '../data/realms.ts';

/**
 * 器 The gear tile.
 *
 * ART's one rule applies here more than anywhere: **a thing is an object plus a rank**.
 * The same sword at 凡 Common and at 天 Heaven is one drawing in two frames: the object
 * never changes, and everything that says *this one is rare* happens in the frame and
 * in the light around it. That is what lets a chest of twenty items be read at a glance
 * without reading a single word, and it is why a new item costs no new artwork.
 *
 * The five steps are fixed and each one adds exactly one thing:
 *
 *   凡 0  a plain frame
 *   靈 1  + an outer glow
 *   玄 2  + corner ticks
 *   地 3  + a broken ring, turning
 *   天 4  + a corona, and motes inside the frame
 */

const f = (n: number) => n.toFixed(1);

export interface TileOptions {
  readonly size?: number;
  /** Drawn faint and dashed when the slot is empty. */
  readonly slot?: Slot;
  /** 0..1: turns the 地 ring and drifts the 天 motes. */
  readonly spin?: number;
}

function frame(S: number, colour: string, glow: number, spin: number, uid: string): string {
  // A still picture (the bible, the catalogue) may ask for a turn; the game never does.
  const rot = (t: number) => (t ? ` transform="rotate(${f(t * 360)} ${S / 2} ${S / 2})"` : '');
  const r = 9;
  let o = '';

  if (glow >= 1) {
    o += `<defs><radialGradient id="g${uid}">` +
      `<stop offset=".35" stop-color="${colour}" stop-opacity="${(0.05 + glow * 0.055).toFixed(2)}"/>` +
      `<stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="${S}" height="${S}" rx="${r}" fill="url(#g${uid})"/>`;
  }

  o += `<rect x=".8" y=".8" width="${S - 1.6}" height="${S - 1.6}" rx="${r}" fill="none" ` +
    `stroke="${colour}" stroke-width="${glow >= 3 ? 1.5 : 1}" stroke-opacity="${(0.45 + glow * 0.13).toFixed(2)}"/>`;

  // 玄 corner ticks: the cheapest mark that reads as "this one is better".
  if (glow >= 2) {
    const k = S * 0.19;
    for (const [x, y, dx, dy] of [[3, 3, 1, 1], [S - 3, 3, -1, 1], [3, S - 3, 1, -1], [S - 3, S - 3, -1, -1]]) {
      o += `<path d="M ${f(x)} ${f(y + dy * k)} L ${f(x)} ${f(y)} L ${f(x + dx * k)} ${f(y)}" ` +
        `fill="none" stroke="${colour}" stroke-width="1.4" stroke-opacity=".9" stroke-linecap="round"/>`;
    }
  }

  // 地 a broken ring, turning slowly behind the object.
  if (glow >= 3) {
    // 轉 The turn is the stylesheet's (.gspin), not the markup's. Written into the markup
    // it changed on every tick, and a chest of sixty Earth pieces rewrote half a megabyte
    // of SVG five times a second: forty per cent of the main thread, on a desktop.
    o += `<g class="gspin"${rot(spin)}><circle cx="${S / 2}" cy="${S / 2}" r="${f(S * 0.41)}" fill="none" stroke="${colour}" ` +
      `stroke-width="1" stroke-opacity=".55" stroke-dasharray="${f(S * 0.1)} ${f(S * 0.07)}"/></g>`;
  }

  // 天 a corona, and motes drifting inside the frame.
  if (glow >= 4) {
    o += `<g class="gspin"${rot(spin)}>`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = S * 0.44;
      const r1 = S * (i % 2 ? 0.5 : 0.54);
      o += `<line x1="${f(S / 2 + Math.cos(a) * r0)}" y1="${f(S / 2 + Math.sin(a) * r0)}" ` +
        `x2="${f(S / 2 + Math.cos(a) * r1)}" y2="${f(S / 2 + Math.sin(a) * r1)}" ` +
        `stroke="${colour}" stroke-width="${i % 2 ? 0.8 : 1.3}" stroke-opacity="${i % 2 ? 0.35 : 0.6}"/>`;
    }
    o += `</g><g class="gspin gback"${rot(-2 * spin)}>`;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rad = S * 0.3;
      o += `<circle cx="${f(S / 2 + Math.cos(a) * rad)}" cy="${f(S / 2 + Math.sin(a) * rad * 0.8)}" ` +
        `r="${f(S * 0.022)}" fill="${colour}" fill-opacity=".8"/>`;
    }
    o += '</g>';
  }

  return o;
}

/**
 * 材 The nine materials, one per lineage.
 *
 * Bruno: *"cada item deve ter o seu icone e ser diferente"*. The object used to be
 * filled in its rank's colour, so a Frostsilver sword and a Starfall sword were the same
 * gold shape. Now the object is painted in what its lineage is made of, lit from the top
 * left, with the one mark that material carries; the rank keeps the frame and the light
 * around it, which is where it always was. Mid-tones sit in the ink palette on purpose:
 * nothing here emits light except the four materials that are meant to glow.
 */
interface Material { readonly hi: string; readonly mid: string; readonly lo: string; readonly mark: string; readonly glow?: string }
export const MATERIALS: Readonly<Record<number, Material>> = {
  1: { hi: '#D2D5DA', mid: '#8E939A', lo: '#474B52', mark: 'none' },                    // 凡鐵 iron
  2: { hi: '#FBF3E2', mid: '#D8CBAA', lo: '#8F8062', mark: 'cracks' },                  // 枯骨 bone
  3: { hi: '#EDBE7C', mid: '#B07D42', lo: '#5E3C1C', mark: 'verdigris' },               // 古銅 bronze
  4: { hi: '#FFFFFF', mid: '#BCD7E6', lo: '#5E8397', mark: 'frost', glow: '#CFEAFF' },   // 霜銀 frost silver
  5: { hi: '#D2F5E2', mid: '#6DB894', lo: '#245E45', mark: 'jade', glow: '#8FE0B8' },    // 碧玉 jade
  6: { hi: '#FFE2A8', mid: '#E6983F', lo: '#7E3412', mark: 'ember', glow: '#FFB35C' },   // 落星 star metal
  7: { hi: '#E4EAFF', mid: '#8C9EDB', lo: '#353F78', mark: 'script', glow: '#B8C8FF' },  // 雷紋 thunder steel
  8: { hi: '#F29A84', mid: '#B43F37', lo: '#4E1210', mark: 'scales', glow: '#FF7A5C' },  // 龍骸 dragon scale
  9: { hi: '#FFFFFF', mid: '#E7DDF0', lo: '#9A84B2', mark: 'husk', glow: '#F4E9FF' },    // 仙蛻 immortal husk
};

/** The one mark each material carries, drawn in the icon's own 512 space and masked to it. */
function materialMark(mark: string, uid: string): string {
  switch (mark) {
    case 'cracks': return '<path d="M120 80 L200 190 L170 260 L260 350 M300 90 L280 170 L340 230 M160 380 L230 420" stroke="#6E6048" stroke-width="10" fill="none" opacity=".55"/>';
    case 'verdigris': return [[150, 150, 55], [330, 210, 40], [220, 360, 60], [380, 380, 30]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4F9C80" opacity=".6"/>`).join('');
    case 'frost': return [[140, 120], [360, 160], [250, 300], [170, 390], [390, 400]]
      .map(([x, y]) => `<path d="M${x - 26} ${y}H${x + 26}M${x} ${y - 26}V${y + 26}M${x - 18} ${y - 18}L${x + 18} ${y + 18}M${x + 18} ${y - 18}L${x - 18} ${y + 18}" stroke="#FFFFFF" stroke-width="6" opacity=".8"/>`).join('');
    case 'jade': return '<ellipse cx="200" cy="170" rx="150" ry="70" fill="#FFFFFF" opacity=".22" transform="rotate(-30 200 170)"/>';
    case 'ember': return [[170, 160], [330, 260], [240, 380], [390, 150]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#FFF1C9" opacity=".85"/>`).join('');
    case 'script': return '<path d="M110 140h60v40h-40v40h70M260 120v90h50M330 260h60v50h-50M150 330h80v40M300 380h70" stroke="#E9EEFF" stroke-width="9" fill="none" opacity=".7"/>';
    case 'scales': return `<pattern id="sc${uid}" width="56" height="40" patternUnits="userSpaceOnUse"><path d="M0 40A28 28 0 0 1 56 40" fill="none" stroke="#3A0B08" stroke-width="7" opacity=".7"/></pattern><rect width="512" height="512" fill="url(#sc${uid})"/>`;
    case 'husk': return '<rect width="512" height="512" fill="#FFFFFF" opacity=".18"/>';
    default: return '';
  }
}

export function gearTile(item: Item | undefined, opts: TileOptions = {}): string {
  const S = opts.size ?? 54;
  const spin = opts.spin ?? 0;

  if (!item) {
    const slot = opts.slot;
    const body = slot ? ICONS[SLOT_INFO[slot].empty] : undefined;
    const inner = S * 0.46;
    const off = (S - inner) / 2;
    return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" aria-hidden="true">` +
      `<rect x=".8" y=".8" width="${S - 1.6}" height="${S - 1.6}" rx="9" fill="none" ` +
      `stroke="#3A3226" stroke-width="1" stroke-dasharray="4 3"/>` +
      (body ? `<g transform="translate(${f(off)} ${f(off)}) scale(${(inner / 512).toFixed(4)})" fill="#3A3226">${body}</g>` : '') +
      `</svg>`;
  }

  const tpl = templateOf(item);
  const rar = RARITY_INFO[item.rarity];
  const body = ICONS[tpl.icon] ?? '';
  const uid = `${item.rarity}${Math.round(S)}`;
  const inner = S * (rar.glow >= 3 ? 0.46 : 0.52);
  const off = (S - inner) / 2;

  // 系 The lineage mark, bottom left: one glyph in the realm's own colour, opposite the
  // rank's glyph. They are two different questions, *where is it from* and *how good
  // is it*, so they get two different corners and never have to share a colour.
  const rs = realmSet(tpl.realm);
  const rc = realmOf(tpl.realm).colour;

  // 材 The object, in its lineage's material. The ids carry the shape and the size so two
  // tiles on one screen can never borrow each other's gradient or mask.
  const m = MATERIALS[tpl.realm] ?? MATERIALS[1];
  const mid = `${tpl.key}${Math.round(S)}`;
  const object =
    `<defs><linearGradient id="mg${mid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${m.hi}"/><stop offset=".5" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.lo}"/></linearGradient>` +
    `<mask id="mm${mid}"><g fill="#fff">${body}</g></mask>` +
    (m.glow ? `<radialGradient id="mh${mid}"><stop offset="0" stop-color="${m.glow}" stop-opacity=".38"/><stop offset="1" stop-color="${m.glow}" stop-opacity="0"/></radialGradient>` : '') +
    `</defs>` +
    (m.glow ? `<circle cx="${S / 2}" cy="${S / 2}" r="${f(inner * 0.62)}" fill="url(#mh${mid})"/>` : '') +
    `<g transform="translate(${f(off)} ${f(off)}) scale(${(inner / 512).toFixed(4)})">` +
    `<g fill="url(#mg${mid})">${body}</g><g mask="url(#mm${mid})">${materialMark(m.mark, mid)}</g></g>`;

  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" ` +
    `aria-label="${tpl.name}, ${rar.name}, ${rs.name} set">` +
    frame(S, rar.colour, rar.glow, spin, uid) +
    object +
    `<text x="4" y="${S - 3.5}" font-size="${f(S * 0.18)}" ` +
    `fill="${rc}" fill-opacity=".85" font-family="'Noto Serif SC',serif">${rs.han.slice(0, 1)}</text>` +
    `<text x="${S - 4}" y="${S - 3.5}" text-anchor="end" font-size="${f(S * 0.18)}" ` +
    `fill="${rar.colour}" fill-opacity=".9" font-family="'Noto Serif SC',serif">${rar.han}</text>` +
    `</svg>`;
}

/**
 * 相 The rim a worn set puts on the cultivator.
 *
 * It is the whole reason to want a 天 Heaven piece beyond its percentage: what you found
 * shows on your body, without anyone opening a menu.
 */
export function wornRim(rarity: Rarity | null, S: number): string {
  if (!rarity) return '';
  const rar = RARITY_INFO[rarity];
  if (rar.glow === 0) return '';
  let o = `<circle cx="${S / 2}" cy="${S / 2}" r="${f(S * 0.46)}" fill="none" stroke="${rar.colour}" ` +
    `stroke-width="${(0.6 + rar.glow * 0.35).toFixed(1)}" stroke-opacity="${(0.2 + rar.glow * 0.13).toFixed(2)}"/>`;
  if (rar.glow >= 3) {
    o += `<circle cx="${S / 2}" cy="${S / 2}" r="${f(S * 0.49)}" fill="none" stroke="${rar.colour}" ` +
      `stroke-width=".8" stroke-opacity=".3" stroke-dasharray="${f(S * 0.05)} ${f(S * 0.04)}"/>`;
  }
  return o;
}
