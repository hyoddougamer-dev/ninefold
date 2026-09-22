import { ICONS } from './icons.generated.ts';
import { mix } from './aura.ts';

/**
 * 牌 The plate: one frame, and whatever is inside it.
 *
 * This is 印 proposal A and 繪 proposal C in one object, because they are the same
 * object. A painting needs a frame or it is a photograph floating in a dark app, and a
 * silhouette needs a frame or it is clip art. So the frame is the thing the game draws,
 * and what sits inside it is a picture when there is one and the icon when there is not.
 *
 * 階 The frame carries a tier, the way 器 the gear frames already do: a ring, then an
 * orbit, then spokes, then a corona. For a beast that is how deep it is; for a realm it
 * is the realm itself. The player learns one visual language and it means the same thing
 * everywhere.
 */
export interface PlateOptions {
  /** 0 to 3. How much ceremony the frame carries. */
  readonly tier?: number;
  readonly size?: number;
  /** Dims everything but the subject, the way 境 the arena does for a fight. */
  readonly focus?: boolean;
}

/** The frame on its own, as markup that can sit under a picture or over one. */
export function plateFrame(colour: string, opts: PlateOptions = {}): string {
  const tier = Math.max(0, Math.min(3, opts.tier ?? 1));
  const size = opts.size ?? 96;
  const uid = `pl${colour.slice(1)}${tier}${Math.round(size)}`;
  const orbit = tier >= 1 ? `<circle cx="50" cy="50" r="43" fill="none" stroke="${colour}"
      stroke-opacity=".34" stroke-width=".8" stroke-dasharray="3 5"/>` : '';
  const spokes = tier >= 2 ? Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const r0 = 47; const r1 = i % 2 ? 50 : 52;
    return `<line x1="${(50 + Math.cos(a) * r0).toFixed(1)}" y1="${(50 + Math.sin(a) * r0).toFixed(1)}"`
      + ` x2="${(50 + Math.cos(a) * r1).toFixed(1)}" y2="${(50 + Math.sin(a) * r1).toFixed(1)}"`
      + ` stroke="${colour}" stroke-opacity="${i % 2 ? 0.3 : 0.6}" stroke-width="${i % 2 ? 0.7 : 1.1}"/>`;
  }).join('') : '';
  const corona = tier >= 3 ? `<circle cx="50" cy="50" r="49" fill="none" stroke="${colour}"
      stroke-opacity=".7" stroke-width="1.4"/>` : '';
  return `<svg viewBox="-4 -4 108 108" width="${size}" height="${size}" aria-hidden="true">
    <defs><radialGradient id="g${uid}"><stop offset=".3" stop-color="${colour}" stop-opacity=".26"/>
      <stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="50" cy="50" r="50" fill="url(#g${uid})"/>
    <circle cx="50" cy="50" r="38" fill="${mix(colour, '#05060F', 0.55)}"/>
    <circle cx="50" cy="50" r="47" fill="none" stroke="${colour}" stroke-opacity=".5" stroke-width="1.2"/>
    ${orbit}${spokes}${corona}
  </svg>`;
}

/**
 * 影 The silhouette that stands in until there is a painting.
 *
 * It is the same icon the game has always drawn, inside the same frame the painting will
 * sit in, so the day a picture arrives nothing around it moves.
 */
export function plateIcon(iconName: string, colour: string, opts: PlateOptions = {}): string {
  const body = ICONS[iconName] ?? '';
  const size = opts.size ?? 96;
  return `<svg viewBox="-4 -4 108 108" width="${size}" height="${size}" aria-hidden="true">
    <g transform="translate(26 26) scale(0.09375)" fill="${colour}">${body}</g>
  </svg>`;
}
