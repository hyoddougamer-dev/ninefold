import { ICONS } from './icons.generated.ts';
import {
  RARITY_INFO, SLOT_INFO, realmSet, templateOf, type Item, type Rarity, type Slot,
} from '../data/gear.ts';
import { realm as realmOf } from '../data/realms.ts';

/**
 * 器 The gear tile.
 *
 * ART's one rule applies here more than anywhere: **a thing is an object plus a rank**.
 * The same sword at 凡 Common and at 天 Heaven is one drawing in two frames — the object
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
  /** 0..1 — turns the 地 ring and drifts the 天 motes. */
  readonly spin?: number;
}

function frame(S: number, colour: string, glow: number, spin: number, uid: string): string {
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
    o += `<circle cx="${S / 2}" cy="${S / 2}" r="${f(S * 0.41)}" fill="none" stroke="${colour}" ` +
      `stroke-width="1" stroke-opacity=".55" stroke-dasharray="${f(S * 0.1)} ${f(S * 0.07)}" ` +
      `transform="rotate(${f(spin * 360)} ${S / 2} ${S / 2})"/>`;
  }

  // 天 a corona, and motes drifting inside the frame.
  if (glow >= 4) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + spin * Math.PI * 2;
      const r0 = S * 0.44;
      const r1 = S * (i % 2 ? 0.5 : 0.54);
      o += `<line x1="${f(S / 2 + Math.cos(a) * r0)}" y1="${f(S / 2 + Math.sin(a) * r0)}" ` +
        `x2="${f(S / 2 + Math.cos(a) * r1)}" y2="${f(S / 2 + Math.sin(a) * r1)}" ` +
        `stroke="${colour}" stroke-width="${i % 2 ? 0.8 : 1.3}" stroke-opacity="${i % 2 ? 0.35 : 0.6}"/>`;
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - spin * Math.PI * 4;
      const rad = S * 0.3;
      o += `<circle cx="${f(S / 2 + Math.cos(a) * rad)}" cy="${f(S / 2 + Math.sin(a) * rad * 0.8)}" ` +
        `r="${f(S * 0.022)}" fill="${colour}" fill-opacity=".8"/>`;
    }
  }

  return o;
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
      `stroke="#252A5C" stroke-width="1" stroke-dasharray="4 3"/>` +
      (body ? `<g transform="translate(${f(off)} ${f(off)}) scale(${(inner / 512).toFixed(4)})" fill="#2C3268">${body}</g>` : '') +
      `</svg>`;
  }

  const tpl = templateOf(item);
  const rar = RARITY_INFO[item.rarity];
  const body = ICONS[tpl.icon] ?? '';
  const uid = `${item.rarity}${Math.round(S)}`;
  const inner = S * (rar.glow >= 3 ? 0.46 : 0.52);
  const off = (S - inner) / 2;

  // 系 The lineage mark, bottom left: one glyph in the realm's own colour, opposite the
  // rank's glyph. Two different questions — *where is it from* and *how good is it* —
  // so they get two different corners and never have to share a colour.
  const rs = realmSet(tpl.realm);
  const rc = realmOf(tpl.realm).colour;

  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" ` +
    `aria-label="${tpl.name}, ${rar.name}, ${rs.name} set">` +
    frame(S, rar.colour, rar.glow, spin, uid) +
    `<g transform="translate(${f(off)} ${f(off)}) scale(${(inner / 512).toFixed(4)})" fill="${rar.colour}">${body}</g>` +
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
