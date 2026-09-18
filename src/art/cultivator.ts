import { BANDS } from '../data/mountain.ts';
import { GOLD, LACQUER, PHASE_LIGHT, mix } from './palette.ts';
import { seeded } from './rng.ts';

/**
 * 修士 The cultivator, seated — described entirely by horizontal bars, with no outline.
 *
 * This is the one image a player looks at every day, and an outline is the one thing
 * that cannot be generated without eventually going wrong. So there is none: the figure
 * is a single stack of bars, crown to hem, whose widths come from one profile. The shape
 * cannot deform, and it cannot drift away from itself between screens.
 *
 * What took three attempts was the proportion, not the technique. A profile that merely
 * narrows and widens reads as a vase; a profile whose head is separate reads as a mask
 * on a cone. A seated person is about as wide as they are tall, has shoulders near three
 * times the width of the head, and spreads into a low wide lap. Those three facts are
 * the whole drawing.
 *
 * The body barely changes with altitude, on purpose. What changes is the air around it.
 */

const f = (n: number) => n.toFixed(1);

/** 形 Crown to hem, one stack. Half-width at each height. */
const PROFILE: readonly (readonly [number, number])[] = [
  [42, 4], [50, 11], [58, 14.5], [66, 15], [74, 12.5], [81, 6.5],   // head, and the neck
  [86, 11], [92, 37], [101, 42],                                     // shoulders, out of nowhere
  [118, 41], [136, 37], [152, 40],                                   // arms down, elbows out
  [168, 49], [182, 61], [196, 72], [208, 78],                        // the lap spreads
  [218, 76], [226, 65], [232, 48],
];

/**
 * 臂 The torso, inside the arms.
 *
 * A stack of solid centred bars is a filled silhouette with stripes on it — a lamp, not
 * a person. What makes it read as a body is the negative space: between the shoulders
 * and the lap each bar is cut into three, so the arms hang clear of the torso. This is
 * the only interior structure the figure has, and it is the one that was missing.
 */
const TORSO: readonly (readonly [number, number])[] = [
  [96, 22], [110, 21], [128, 19.5], [146, 21], [160, 26], [172, 34],
];

const ARM_TOP = TORSO[0][0];
const ARM_BOTTOM = TORSO[TORSO.length - 1][0];
/** The cut between arm and torso. Wide enough to survive a 200-pixel render. */
const ARM_GAP = 4.2;

const HEM = PROFILE[PROFILE.length - 1][0];
/** Where the barred stack begins. Everything above it is the head, drawn solid. */
const NECK = 84;

function interp(table: readonly (readonly [number, number])[], y: number): number {
  if (y <= table[0][0]) return table[0][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [y0, w0] = table[i];
    const [y1, w1] = table[i + 1];
    if (y >= y0 && y <= y1) {
      let u = (y - y0) / (y1 - y0);
      u = u * u * (3 - 2 * u);
      return w0 + (w1 - w0) * u;
    }
  }
  return table[table.length - 1][1];
}

/** Half-width at height y, smoothstepped so the stack never steps. */
function widthAt(y: number): number {
  return y > HEM ? 0 : interp(PROFILE, y);
}

const HEAD_Y = 64;
const CORE_Y = 168;

export interface CultivatorOptions {
  /** 1..9 — sets the phase colour and how much has gathered in the air. */
  readonly band: number;
  readonly size?: number;
  /** 0..1. Above zero the cultivator is over their footing and the air turns on them. */
  readonly strain?: number;
}

export function cultivator({ band, size = 240, strain = 0 }: CultivatorOptions): string {
  const n = Math.max(1, Math.min(BANDS.length, Math.round(band)));
  const light = PHASE_LIGHT[BANDS[n - 1].phase];
  const t = (n - 1) / (BANDS.length - 1);
  const rnd = seeded(`fig:${n}`);
  const uid = `f${n}`;

  let o =
    `<defs><radialGradient id="au${uid}"><stop offset="0" stop-color="${light}" stop-opacity="${(0.19 + 0.13 * t).toFixed(2)}"/>` +
    `<stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="100" cy="${CORE_Y - 12}" rx="${f(80 + 20 * t)}" ry="${f(86 + 16 * t)}" fill="url(#au${uid})"/>`;

  // 圓光 The halo, then a second one further out. Rank, read from across a room.
  if (n >= 3) o += `<circle cx="100" cy="${HEAD_Y}" r="${f(27 + 5 * t)}" fill="none" stroke="${light}" stroke-width="1.3" stroke-opacity=".8"/>`;
  if (n >= 7) o += `<circle cx="100" cy="${HEAD_Y}" r="${f(41 + 6 * t)}" fill="none" stroke="${light}" stroke-width=".8" stroke-opacity=".45"/>`;

  // 蓮 The seat opens once the mountain starts asking something of you.
  if (n >= 5) {
    ([[0, 9, 84], [-60, 6.5, 38], [60, 6.5, 38]] as const).forEach(([dx, ry, rx], k) => {
      o += `<ellipse cx="${f(100 + dx)}" cy="${f(HEM + 3 - k)}" rx="${rx}" ry="${ry}" fill="${light}" fill-opacity="${k ? 0.4 : 0.6}"/>`;
    });
  }

  // 塵 Motes. Qi in the air, and the simplest honest sign that the game is running.
  for (let i = 0; i < 10 + 6 * n; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = Math.pow(0.4 + rnd() * 0.6, 0.55);
    o += `<circle cx="${f(100 + Math.cos(a) * rad * (82 + 16 * t))}" cy="${f(CORE_Y - 14 - Math.sin(a) * rad * (84 + 12 * t) * 0.9)}" r="${(0.7 + rnd() * 1.4).toFixed(2)}" fill="${light}" fill-opacity="${(0.28 + rnd() * 0.48).toFixed(2)}"/>`;
  }

  // 環 An orbit ring, tilted, with nodes on it.
  if (n >= 6) {
    const rx = 86;
    const ry = 20;
    o += `<ellipse cx="100" cy="${CORE_Y + 24}" rx="${rx}" ry="${ry}" fill="none" stroke="${light}" stroke-width="1" stroke-opacity=".5"/>`;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      o += `<circle cx="${f(100 + Math.cos(a) * rx)}" cy="${f(CORE_Y + 24 + Math.sin(a) * ry)}" r="2.6" fill="${light}" fill-opacity=".8"/>`;
    }
  }

  // 芒 Spokes at the great vehicle, radiating from the seat rather than from the body.
  if (n >= 8) {
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      o += `<line x1="${f(100 + Math.cos(a) * 64)}" y1="${f(CORE_Y - 10 + Math.sin(a) * 56)}" x2="${f(100 + Math.cos(a) * 112)}" y2="${f(CORE_Y - 10 + Math.sin(a) * 98)}" stroke="${light}" stroke-width="${i % 2 ? 1 : 1.8}" stroke-opacity="${i % 2 ? 0.16 : 0.32}"/>`;
    }
  }

  // 身 The body itself. Bars, and the gaps between them.
  const bar = (x: number, y: number, width: number, th: number, op: number) =>
    `<rect x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(th)}" rx="${f(th / 2)}" fill="${light}" fill-opacity="${op.toFixed(2)}"/>`;

  for (let y = NECK; y <= HEM; y += 5.6) {
    const hw = widthAt(y);
    if (hw <= 0.8) continue;
    const u = (y - NECK) / (HEM - NECK);
    // Two places carry weight: the chest, and the lap the figure is sitting on.
    const weight = Math.max(0, 1 - Math.abs(u - 0.16) * 2.3) + Math.max(0, 1 - Math.abs(u - 0.84) * 2.8);
    const op = Math.max(0.24, Math.min(0.92, 0.32 + 0.48 * weight));
    const th = 2.4 + 1.6 * Math.min(1, weight);

    if (y >= ARM_TOP && y <= ARM_BOTTOM) {
      const tw = interp(TORSO, y);
      if (hw - tw > ARM_GAP + 2) {
        o += bar(100 - tw, y, tw * 2, th, op);                                  // torso
        o += bar(100 - hw, y, hw - tw - ARM_GAP, th, op * 0.82);                // near arm
        o += bar(100 + tw + ARM_GAP, y, hw - tw - ARM_GAP, th, op * 0.82);      // far arm
        continue;
      }
    }
    o += bar(100 - hw, y, hw * 2, th, op);
  }

  // 首 The head, and 髻 the topknot — the one solid form in the figure.
  //
  // A head made of the same bars as the body reads as a beehive: at the size this is
  // actually seen, stripes that small stop being a technique and become noise. One
  // filled shape against a barred body is the contrast that makes both legible, and it
  // still breaks no rule here — what is forbidden is an outline, not a fill.
  o +=
    `<ellipse cx="100" cy="${HEAD_Y}" rx="14.5" ry="16.5" fill="${light}" fill-opacity=".92"/>` +
    `<rect x="94" y="${f(HEAD_Y - 24)}" width="12" height="6" rx="3" fill="${light}" fill-opacity=".85"/>` +
    `<rect x="96.5" y="${f(HEAD_Y + 15)}" width="7" height="9" rx="3.5" fill="${light}" fill-opacity=".6"/>`;

  // 肩 The shoulder line: the one solid bar, and the only place the eye is told to land.
  const sw = widthAt(99);
  o += `<rect x="${f(100 - sw)}" y="97.5" width="${f(sw * 2)}" height="3.4" rx="1.7" fill="${light}" fill-opacity=".95"/>`;

  // 壓 Strain. Over your footing, the air stops being yours: the marks turn cinnabar and
  // lean inward. The warning is the picture, not a number in red.
  if (strain > 0) {
    const s = Math.min(1, strain);
    const danger = mix(light, '#C8442C', 0.85);
    for (let i = 0; i < Math.round(4 + 14 * s); i++) {
      const a = rnd() * Math.PI * 2;
      const r0 = 104 + rnd() * 24;
      const r1 = r0 - 15 - 10 * s;
      o += `<line x1="${f(100 + Math.cos(a) * r0)}" y1="${f(CORE_Y - 14 + Math.sin(a) * r0 * 0.9)}" x2="${f(100 + Math.cos(a) * r1)}" y2="${f(CORE_Y - 14 + Math.sin(a) * r1 * 0.9)}" stroke="${danger}" stroke-width="1.5" stroke-opacity="${(0.28 + 0.5 * s).toFixed(2)}" stroke-linecap="round"/>`;
    }
  }

  return `<svg viewBox="0 0 200 250" width="${size}" height="${Math.round((size * 250) / 200)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="the cultivator, seated">${o}</svg>`;
}

/** A seated mark for a list row — the same figure reduced to what survives at 26 pixels. */
export function figureMark(band: number, size = 28): string {
  const n = Math.max(1, Math.min(BANDS.length, Math.round(band)));
  const light = PHASE_LIGHT[BANDS[n - 1].phase];
  return (
    `<svg viewBox="0 0 40 40" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    (n >= 3 ? `<circle cx="20" cy="12" r="8.5" fill="none" stroke="${GOLD}" stroke-width=".8" stroke-opacity=".45"/>` : '') +
    `<circle cx="20" cy="12" r="4.4" fill="${light}" fill-opacity=".9"/>` +
    `<rect x="9" y="19" width="22" height="3" rx="1.5" fill="${light}" fill-opacity=".85"/>` +
    `<rect x="7" y="25" width="26" height="3" rx="1.5" fill="${light}" fill-opacity=".55"/>` +
    `<rect x="3" y="31" width="34" height="3.4" rx="1.7" fill="${mix(light, LACQUER, 0.25)}" fill-opacity=".6"/>` +
    `</svg>`
  );
}
