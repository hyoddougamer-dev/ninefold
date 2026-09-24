import { mix, portrait } from './aura.ts';
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
      <rect x="${x.toFixed(1)}" y="${(y + eave).toFixed(1)}" width="${w.toFixed(1)}" height="${(tierH - eave).toFixed(1)}" fill="${mix(c, '#0D0B08', 0.62)}" opacity="0.95"/>
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

  /**
   * 無盡 The tiers that are not there yet, which is most of a tower called endless.
   *
   * 空 With no seals held the drawing was one dashed rectangle low in a tall empty box,
   * and the first thing a player ever sees of 塔 the tower is that. The floors above are
   * as real as the ones below: they are drawn as roofs in outline, fading upward, and
   * they are what the climb is for. They carry no number and never will, because the
   * tower does not end.
   */
  const ghosts = Array.from({ length: 4 }, (_, i) => {
    const y = ty - (i + 1) * tierH;
    if (y < 16) return '';
    const w = tw * (1 - (shown + 1 + i) * 0.055);
    const x = (W - w) / 2;
    const o = 0.2 * (1 - i / 4) ** 1.6;
    return `<path d="M${(x - w * 0.11).toFixed(1)} ${(y + eave).toFixed(1)} L${(x + w * 0.09).toFixed(1)} ${y.toFixed(1)} H${(x + w * 0.91).toFixed(1)} L${(x + w * 1.11).toFixed(1)} ${(y + eave).toFixed(1)}"
      fill="none" stroke="${top}" stroke-opacity="${o.toFixed(3)}" stroke-width="1"/>
      <path d="M${x.toFixed(1)} ${(y + eave).toFixed(1)} v${(tierH - eave).toFixed(1)} M${(x + w).toFixed(1)} ${(y + eave).toFixed(1)} v${(tierH - eave).toFixed(1)}"
      stroke="${top}" stroke-opacity="${(o * 0.7).toFixed(3)}" stroke-width="1"/>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="The tower, floor ${best}">
    <defs>
      <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${mix(top, '#0D0B08', 0.9)}"/>
        <stop offset="1" stop-color="#0D0B08"/>
      </linearGradient>
      <radialGradient id="tglow"><stop offset="0" stop-color="${top}" stop-opacity=".34"/>
        <stop offset="1" stop-color="${top}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#tsky)"/>
    <circle cx="${W / 2}" cy="${(ty + 8).toFixed(1)}" r="${(52 * breath).toFixed(1)}" fill="url(#tglow)"/>
    ${hidden > 0 ? `<text x="${W / 2}" y="${(ty - 7).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size="11" fill="${top}" opacity=".7">+${hidden * FLOORS_PER_REALM} floors below</text>` : ''}
    ${ghosts}
    <g transform="translate(0 0)">${out}</g>
    <rect y="${ground}" width="${W}" height="${H - ground}" fill="#0D0B08"/>
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
  const gold = '#D4AF56';
  const cx = W / 2;
  const belly = 118;

  const flames = Array.from({ length: 5 }, (_, i) => {
    const t = (i - 2) / 2;
    const h = (14 + 30 * heat) * (1 - Math.abs(t) * 0.42) * (i % 2 ? flick : 2 - flick);
    const x = cx + t * 22;
    return `<path d="M${x.toFixed(1)} ${belly + 36} q ${(-5 - 3 * heat).toFixed(1)} ${(-h * 0.55).toFixed(1)} 0 ${(-h).toFixed(1)} q ${(5 + 3 * heat).toFixed(1)} ${(h * 0.55).toFixed(1)} 0 ${h.toFixed(1)} Z" fill="${mix(gold, '#D2604E', 0.15 + 0.4 * t * t)}" opacity="${(0.32 + 0.5 * heat).toFixed(2)}"/>`;
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
        <stop offset="0" stop-color="${mix(r.colour, '#0D0B08', 0.45)}"/>
        <stop offset="1" stop-color="${mix(gold, '#0D0B08', 0.7 - 0.25 * heat)}"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${belly}" r="86" fill="url(#fglow)"/>
    ${smoke}
    <!-- the lid, lifted a little: a sealed cauldron reads as a pot, not as a furnace -->
    <path d="M${cx - 44} 78 h88 l-7 -9 h-74 Z" fill="${mix(r.colour, '#0D0B08', 0.35)}"/>
    <circle cx="${cx}" cy="66" r="5" fill="${r.colour}" opacity=".8"/>
    <!-- the belly -->
    <path d="M${cx - 48} 84 q0 58 48 58 q48 0 48 -58 Z" fill="url(#fbody)"/>
    <path d="M${cx - 48} 84 h96" stroke="${gold}" stroke-opacity="${(0.3 + 0.4 * heat).toFixed(2)}" stroke-width="2"/>
    <!-- the three legs, which is what makes a 鼎 a 鼎 -->
    <path d="M${cx - 30} 140 l-6 22 M${cx + 30} 140 l6 22 M${cx} 143 v20" stroke="${mix(r.colour, '#0D0B08', 0.45)}" stroke-width="7" stroke-linecap="round" fill="none"/>
    ${flames}
    <rect y="${H - 14}" width="${W}" height="14" fill="#0D0B08"/>
    <rect y="${H - 15}" width="${W}" height="1" fill="${gold}" opacity="${(0.2 + 0.4 * heat).toFixed(2)}"/>
  </svg>`;
}

/**
 * 雷池 The thunder pool, and the cultivator sitting in the middle of it.
 *
 * 圖 It used to be the basin alone, a flat trapezoid in the portrait's box, and that was
 * the worst trade on the whole screen: from the ninth realm's summit to the end of the
 * first three months, the player's own figure, the one picture that had grown with them
 * for fifty days, was taken off the screen and replaced by a shape. So she comes back,
 * seated on a stone in the middle of the pool, and the pool is drawn round her.
 *
 * It is still the bar. `filled` is the qi against the pool: the water spreads out from
 * the stone to the rim as it fills, the sky over her gathers as it fills, and only when
 * it is full do the bolts come down. Every 雷印 already held is a ring along the bottom,
 * so a cultivator with twelve marks is looking at twelve of them. `sky` is the colour of
 * the heaven she stands in, so crossing into the next one changes the weather.
 */
export function pool(
  filled: number, marks: number, pulse = 0,
  { who = null, sky }: { who?: string | null; sky?: string } = {},
): string {
  const W = 200;
  // Square, because it takes 氣象 the portrait's own box on the cultivate screen and a
  // letterboxed drawing there reads as a picture pasted into a frame.
  const H = 200;
  const c = realmOf(9).colour;
  const air = sky ?? c;
  const f = Math.max(0, Math.min(1, filled));
  const full = f >= 0.999;
  const breath = Math.sin(pulse * Math.PI * 2);
  const cx = W / 2;
  const py = 163;          // the middle of the pool
  const rx = 90, ry = 22;  // its rim, seen from above and in front

  // 雲 The weather. Two bands of cloud that drift on the pulse and darken as the pool
  // fills, so the sky says how close the Dragon is before any bolt does.
  const clouds = [0, 1, 2].map((i) => {
    const y = 20 + i * 13;
    const drift = Math.sin((pulse + i * 0.33) * Math.PI * 2) * 6;
    return `<ellipse cx="${(cx + (i - 1) * 42 + drift).toFixed(1)}" cy="${y}" rx="${56 - i * 6}" ry="${9 - i}"
      fill="${mix(air, '#0D0B08', 0.55)}" opacity="${(0.18 + 0.5 * f).toFixed(2)}"/>`;
  }).join('');

  // 雷 Before it is full, one flicker far off, fainter the emptier the pool. When it is
  // full, three bolts strike the rim either side of her. Never her: the tribulation is a
  // fight she chooses, not weather that happens to her.
  const bolt = (x: number, j: number, top: number, bottom: number, op: number, w: number) => {
    const mid = (top + bottom) / 2;
    return `<path d="M${x} ${top} L${x + j} ${mid - 4} L${x - j * 0.5} ${mid} L${x + j * 0.7} ${bottom}"
      fill="none" stroke="${mix(c, '#FFFFFF', 0.55)}" stroke-width="${w}" stroke-linecap="round"
      stroke-linejoin="round" opacity="${op.toFixed(2)}"/>`;
  };
  const bolts = full
    ? [[cx - 74, 7, 2.2], [cx + 70, -8, 2.2], [cx + 84, -4, 1.2]].map(([x, j, wd], i) =>
      bolt(x, j, 18 + i * 6, py - 4, (0.55 + 0.4 * Math.abs(breath)) * (i === 2 ? 0.6 : 1), wd)).join('')
    : f > 0.25 ? bolt(cx + 70, -6, 22, 58, (0.1 + 0.3 * f) * Math.max(0, breath), 1.1) : '';

  // 池 The water, spreading from the stone to the rim.
  const wrx = 30 + (rx - 34) * f;
  const wry = 7 + (ry - 9) * f;

  // 印 The marks, centred along the bottom. Past twelve they stop crowding.
  const shown = Math.min(12, marks);
  const rings = Array.from({ length: shown }, (_, i) =>
    `<circle cx="${(cx + (i - (shown - 1) / 2) * 13).toFixed(1)}" cy="${H - 8}" r="3.6" fill="none" stroke="${c}" stroke-opacity=".85" stroke-width="1.3"/>`,
  ).join('');

  // 修 Her, from the same function that draws her on every other realm, a little smaller
  // so the pool has room. Her aura comes with her.
  const figure = portrait({ realm: 9, pulse, who }).replace(
    '<svg viewBox="0 0 200 200" width="100%" height="100%"',
    '<svg viewBox="0 0 200 200" x="36" y="34" width="128" height="128"');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="The thunder pool, ${Math.round(f * 100)}% full, ${marks} marks">
    <defs>
      <radialGradient id="psky" cx=".5" cy=".1" r=".75">
        <stop offset="0" stop-color="${air}" stop-opacity="${(0.1 + 0.3 * f).toFixed(2)}"/>
        <stop offset="1" stop-color="${air}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="pwater">
        <stop offset="0" stop-color="${mix(c, '#FFFFFF', 0.55)}" stop-opacity=".95"/>
        <stop offset=".7" stop-color="${c}" stop-opacity=".55"/>
        <stop offset="1" stop-color="${c}" stop-opacity=".2"/>
      </radialGradient>
      <filter id="pcloud" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
      <radialGradient id="pglow"><stop offset="0" stop-color="${c}" stop-opacity="${(0.1 + 0.4 * f).toFixed(2)}"/>
        <stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#psky)"/>
    <g filter="url(#pcloud)">${clouds}</g>
    ${bolts}
    <ellipse cx="${cx}" cy="${py}" rx="${rx + 14}" ry="${ry + 16}" fill="url(#pglow)"/>
    <!-- the rim: cut stone, and the dark floor of an empty pool inside it -->
    <ellipse cx="${cx}" cy="${py + 2}" rx="${rx}" ry="${ry}" fill="${mix(c, '#0D0B08', 0.86)}"
      stroke="${mix(c, '#9C907C', 0.5)}" stroke-opacity=".55" stroke-width="1.6"/>
    <ellipse cx="${cx}" cy="${py}" rx="${wrx.toFixed(1)}" ry="${wry.toFixed(1)}" fill="url(#pwater)"
      opacity="${(0.35 + 0.6 * f).toFixed(2)}"/>
    ${f > 0.05 ? `<ellipse cx="${cx}" cy="${py}" rx="${(wrx * (0.7 + 0.1 * breath)).toFixed(1)}" ry="${(wry * (0.7 + 0.1 * breath)).toFixed(1)}"
      fill="none" stroke="${mix(c, '#FFFFFF', 0.7)}" stroke-opacity="${(0.25 + 0.3 * f).toFixed(2)}" stroke-width=".8"/>` : ''}
    <!-- the stone she sits on -->
    <ellipse cx="${cx}" cy="${py - 12}" rx="30" ry="7" fill="${mix(c, '#0D0B08', 0.7)}"
      stroke="${mix(c, '#FFFFFF', 0.3)}" stroke-opacity=".35" stroke-width="1"/>
    ${figure}
    ${rings}
  </svg>`;
}
