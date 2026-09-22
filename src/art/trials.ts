import { mix } from './aura.ts';
import { realm as realmOf } from '../data/realms.ts';
import { FLOORS_PER_REALM, seals } from '../sim/tower.ts';

/**
 * 塔 爐 雷池: the three places the late game happens in.
 *
 * 無盡塔 the tower, 丹爐 the furnace and 雷池 the thunder pool had no drawings at all.
 * The tower borrowed a beast's seal, the furnace borrowed a potion icon, and the pool
 * borrowed the qi bar. Three systems that take a cultivator two months to reach, and
 * every one of them arrived looking like something else.
 *
 * They are drawn the way 氣象 the portrait and 境 the arena already are: procedurally,
 * from the state, in the realm's own colour. That is the rule this file exists to keep:
 * **the drawing is a reading of the save, not a picture next to it.** The tower has as
 * many tiers as you have seals. The furnace burns as high as you have brewed. The pool
 * holds as much light as it holds qi. Nothing here is decoration that would look the
 * same on somebody else's phone.
 */

/** The realm a depth belongs to, so a floor is drawn in the colour of where it stands. */
function colourAt(floor: number): string {
  return realmOf(Math.max(1, Math.min(9, Math.ceil(floor / FLOORS_PER_REALM)))).colour;
}

/**
 * 塔 The Endless Tower, drawn as far up as you have climbed.
 *
 * One tier to a 塔印 seal, which is one tier to nine floors, so the silhouette *is* the
 * progress bar: a cultivator on floor 60 sees six roofs and a seventh half-built. The
 * top tier is always the one being fought, lit and slightly wider than it should be, and
 * the tiers below it fade toward the ground.
 *
 * It grows without end, so past nine tiers the drawing stops adding roofs and starts
 * compressing them: the tower keeps rising, the picture keeps fitting on a phone.
 */
export function tower(best: number, pulse = 0): string {
  const W = 200;
  const H = 160;
  const held = seals(best);
  const shown = Math.min(9, held);
  const hidden = held - shown;
  const climbing = ((best % FLOORS_PER_REALM) / FLOORS_PER_REALM);
  const top = colourAt(Math.max(1, best + 1));
  const breath = 1 + Math.sin(pulse * Math.PI * 2) * 0.01;

  const ground = H - 12;
  // The box never grows: the tiers thin out as they stack, which also reads as distance.
  const tierH = Math.min(19, (ground - 26) / (shown + 1));
  let out = '';

  // The finished tiers, widest at the bottom, each in the colour of the floors it holds.
  for (let i = 0; i < shown; i++) {
    const y = ground - (i + 1) * tierH;
    const w = (W * 0.62) * (1 - i * 0.055);
    const x = (W - w) / 2;
    const c = colourAt((hidden + i) * FLOORS_PER_REALM + 1);
    const o = 0.22 + 0.06 * i;
    const eave = tierH * 0.26;
    out += `<g>
      <path d="M${(x - w * 0.11).toFixed(1)} ${(y + eave).toFixed(1)} L${(x + w * 0.09).toFixed(1)} ${y.toFixed(1)} H${(x + w * 0.91).toFixed(1)} L${(x + w * 1.11).toFixed(1)} ${(y + eave).toFixed(1)} Z" fill="${c}" opacity="${(o + 0.16).toFixed(2)}"/>
      <rect x="${x.toFixed(1)}" y="${(y + eave).toFixed(1)}" width="${w.toFixed(1)}" height="${(tierH - eave).toFixed(1)}" fill="${mix(c, '#05060F', 0.62)}" opacity="0.95"/>
      <rect x="${(x + w * 0.42).toFixed(1)}" y="${(y + eave + tierH * 0.22).toFixed(1)}" width="${(w * 0.16).toFixed(1)}" height="${(tierH * 0.4).toFixed(1)}" fill="${c}" opacity="${(o + 0.3).toFixed(2)}"/>
    </g>`;
  }

  // The tier being fought: as tall as the floors already taken inside it.
  const ty = ground - (shown + 1) * tierH;
  const tw = (W * 0.62) * (1 - shown * 0.055);
  const tx = (W - tw) / 2;
  const eave = tierH * 0.26;
  const rise = Math.max(2, (tierH - eave) * climbing);
  out += `<rect x="${tx.toFixed(1)}" y="${(ty + tierH - rise).toFixed(1)}" width="${tw.toFixed(1)}" height="${rise.toFixed(1)}" fill="${top}" opacity="0.5"/>
    <rect x="${tx.toFixed(1)}" y="${(ty + eave).toFixed(1)}" width="${tw.toFixed(1)}" height="${(tierH - eave).toFixed(1)}" fill="none" stroke="${top}" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="3 3"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="The tower, floor ${best}">
    <defs>
      <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${mix(top, '#05060F', 0.9)}"/>
        <stop offset="1" stop-color="#05060F"/>
      </linearGradient>
      <radialGradient id="tglow"><stop offset="0" stop-color="${top}" stop-opacity=".34"/>
        <stop offset="1" stop-color="${top}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#tsky)"/>
    <circle cx="${W / 2}" cy="${(ty + 8).toFixed(1)}" r="${(52 * breath).toFixed(1)}" fill="url(#tglow)"/>
    ${hidden > 0 ? `<text x="${W / 2}" y="${(ty - 7).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size="11" fill="${top}" opacity=".7">+${hidden * FLOORS_PER_REALM} floors below</text>` : ''}
    <g transform="translate(0 0)">${out}</g>
    <rect y="${ground}" width="${W}" height="${H - ground}" fill="#05060F"/>
    <rect y="${ground - 1}" width="${W}" height="1" fill="${colourAt(1)}" opacity=".35"/>
  </svg>`;
}

/**
 * 爐 The furnace, burning as high as it has been fed.
 *
 * A cauldron on three legs with a fire under it, and the fire is the only part that
 * moves: it reads the pills already taken, so a furnace lit an hour ago is a candle and
 * one that has brewed four hundred is a forge. The smoke above it carries the colour of
 * the realm brewing, which is how the pill names are already coloured on the screen.
 */
export function furnace(realm: number, taken: number, pulse = 0): string {
  const W = 200;
  const H = 200;
  const r = realmOf(realm);
  // Fire grows with the log of what has been brewed: the first ten pills matter as much
  // as the next ninety, which is also how they are priced.
  const heat = Math.min(1, Math.log10(1 + taken) / 2.7);
  const flick = 1 + Math.sin(pulse * Math.PI * 2) * 0.07;
  const gold = '#FFCE6B';
  const cx = W / 2;
  const belly = 118;

  const flames = Array.from({ length: 5 }, (_, i) => {
    const t = (i - 2) / 2;
    const h = (14 + 30 * heat) * (1 - Math.abs(t) * 0.42) * (i % 2 ? flick : 2 - flick);
    const x = cx + t * 22;
    return `<path d="M${x.toFixed(1)} ${belly + 36} q ${(-5 - 3 * heat).toFixed(1)} ${(-h * 0.55).toFixed(1)} 0 ${(-h).toFixed(1)} q ${(5 + 3 * heat).toFixed(1)} ${(h * 0.55).toFixed(1)} 0 ${h.toFixed(1)} Z" fill="${mix(gold, '#FF5FC8', 0.15 + 0.4 * t * t)}" opacity="${(0.32 + 0.5 * heat).toFixed(2)}"/>`;
  }).join('');

  const smoke = Array.from({ length: 3 }, (_, i) => {
    const o = (0.05 + 0.16 * heat) * (1 - i * 0.26);
    return `<ellipse cx="${(cx + (i - 1) * 9).toFixed(1)}" cy="${(52 - i * 15).toFixed(1)}" rx="${(15 + i * 6).toFixed(1)}" ry="${(7 + i * 3).toFixed(1)}" fill="${r.colour}" opacity="${o.toFixed(2)}"/>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="The furnace, ${taken} pills brewed">
    <defs>
      <radialGradient id="fglow"><stop offset="0" stop-color="${gold}" stop-opacity="${(0.1 + 0.34 * heat).toFixed(2)}"/>
        <stop offset="1" stop-color="${gold}" stop-opacity="0"/></radialGradient>
      <linearGradient id="fbody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${mix(r.colour, '#05060F', 0.45)}"/>
        <stop offset="1" stop-color="${mix(gold, '#05060F', 0.7 - 0.25 * heat)}"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${belly}" r="86" fill="url(#fglow)"/>
    ${smoke}
    <!-- the lid, lifted a little: a sealed cauldron reads as a pot, not as a furnace -->
    <path d="M${cx - 44} 78 h88 l-7 -9 h-74 Z" fill="${mix(r.colour, '#05060F', 0.35)}"/>
    <circle cx="${cx}" cy="66" r="5" fill="${r.colour}" opacity=".8"/>
    <!-- the belly -->
    <path d="M${cx - 48} 84 q0 58 48 58 q48 0 48 -58 Z" fill="url(#fbody)"/>
    <path d="M${cx - 48} 84 h96" stroke="${gold}" stroke-opacity="${(0.3 + 0.4 * heat).toFixed(2)}" stroke-width="2"/>
    <!-- the three legs, which is what makes a 鼎 a 鼎 -->
    <path d="M${cx - 30} 140 l-6 22 M${cx + 30} 140 l6 22 M${cx} 143 v20" stroke="${mix(r.colour, '#05060F', 0.45)}" stroke-width="7" stroke-linecap="round" fill="none"/>
    ${flames}
    <rect y="${H - 14}" width="${W}" height="14" fill="#05060F"/>
    <rect y="${H - 15}" width="${W}" height="1" fill="${gold}" opacity="${(0.2 + 0.4 * heat).toFixed(2)}"/>
  </svg>`;
}

/**
 * 雷池 The thunder pool, and the marks already taken.
 *
 * A basin cut into stone, filling with light. `filled` is the qi against the pool, so
 * the drawing is the bar, and when it reaches one, the bolts come down and the Dragon
 * is standing. Every 雷印 already held is a ring around the rim, so a cultivator with
 * twelve marks is looking at twelve of them.
 */
export function pool(filled: number, marks: number, pulse = 0): string {
  const W = 200;
  // Square, because it takes 氣象 the portrait's own box on the cultivate screen and a
  // letterboxed drawing there reads as a picture pasted into a frame.
  const H = 200;
  const c = realmOf(9).colour;
  const f = Math.max(0, Math.min(1, filled));
  const full = f >= 0.999;
  const breath = Math.sin(pulse * Math.PI * 2);
  const rimY = 104;
  const deep = 60;
  const surface = rimY + (1 - f) * deep;

  // 雷 The bolts only come when the pool is full. Before that the sky is quiet, which is
  // the whole difference between "wait" and "now".
  const bolts = full ? Array.from({ length: 3 }, (_, i) => {
    const x = W / 2 + (i - 1) * 34;
    const j = 6 + i * 3;
    return `<path d="M${x} 14 l${j} 28 l-${j * 0.7} 4 l${j * 0.9} 24 l-${j * 1.5} -9 l${j * 0.5} -7 Z"
      fill="${c}" opacity="${(0.5 + 0.35 * Math.abs(breath)).toFixed(2)}"/>`;
  }).join('') : '';

  // Every mark is a ring on the rim. Past twelve they double up rather than crowd.
  const rings = Array.from({ length: Math.min(12, marks) }, (_, i) =>
    `<circle cx="${(22 + i * 14).toFixed(0)}" cy="${H - 13}" r="4" fill="none" stroke="${c}" stroke-opacity=".8" stroke-width="1.4"/>`,
  ).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="The thunder pool, ${Math.round(f * 100)}% full, ${marks} marks">
    <defs>
      <linearGradient id="pwater" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${mix(c, '#FFFFFF', 0.45)}" stop-opacity=".95"/>
        <stop offset="1" stop-color="${c}" stop-opacity=".35"/>
      </linearGradient>
      <radialGradient id="pglow"><stop offset="0" stop-color="${c}" stop-opacity="${(0.12 + 0.4 * f).toFixed(2)}"/>
        <stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
      <clipPath id="pbasin"><path d="M40 ${rimY} h120 l-14 ${deep} h-92 Z"/></clipPath>
    </defs>
    <circle cx="${W / 2}" cy="${rimY + 10}" r="${(70 + 10 * f).toFixed(1)}" fill="url(#pglow)"/>
    ${bolts}
    <!-- the basin: cut stone, not a bowl -->
    <path d="M40 ${rimY} h120 l-14 ${deep} h-92 Z" fill="${mix(c, '#05060F', 0.82)}"/>
    <g clip-path="url(#pbasin)">
      <rect x="30" y="${surface.toFixed(1)}" width="140" height="${deep + 4}" fill="url(#pwater)"/>
      ${f > 0.02 ? `<ellipse cx="${W / 2}" cy="${surface.toFixed(1)}" rx="66" ry="${(3 + 1.4 * breath).toFixed(1)}" fill="${mix(c, '#FFFFFF', 0.6)}" opacity=".7"/>` : ''}
    </g>
    <path d="M40 ${rimY} h120" stroke="${c}" stroke-opacity=".75" stroke-width="2"/>
    ${rings}
  </svg>`;
}
