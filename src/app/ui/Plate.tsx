import { pictureOf, type Painted } from '../../data/pictures.ts';
import { plateFrame, plateIcon } from '../../art/plate.ts';
import { Svg } from './Svg.tsx';

/**
 * 牌 A thing in the game, framed, with a painting in it if one exists.
 *
 * 繪 Proposal C, and the one rule it rests on: **a missing picture is not a hole.** The
 * frame is drawn, the picture is a file, and when there is no file the icon the game has
 * always shipped stands in its place inside the same frame. So the art can arrive one
 * creature at a time over months and the game is never half-drawn.
 *
 * 載 The picture is lazy and it is never in the way: it is loaded only when it scrolls
 * near, it is decoded off the main thread, and if it fails to load the frame simply keeps
 * the silhouette it already had. A phone on a bad connection plays the game it always
 * played.
 */
export function Plate({ kind, subject, icon, colour, tier = 1, size = 96, alt }: {
  kind: Painted;
  /** The key in its own table: a beast's key, a realm's number, a heaven's number. */
  subject: string;
  /** The icon that stands in until there is a painting. */
  icon: string;
  colour: string;
  tier?: number;
  size?: number;
  alt: string;
}) {
  // 剪 The cut-out first, where there is one. The squared painting had to be clipped to a
  // circle to sit in the frame, and a circle clips whatever is widest: on 巨蟹 the giant
  // crab it took both claws off. A creature with the paper keyed off it is *contained*
  // inside the ring instead, so nothing is ever cut, and the same file is what stands in
  // 鬥 the arena. The squared painting is still the fallback, and 印 the seal is still
  // the fallback for that.
  const cut = kind === 'beast' ? pictureOf('cut', subject) : null;
  const src = pictureOf(kind, subject);
  return (
    <span className="plate" style={{ width: size, height: size, ['--hue' as string]: colour }}>
      <Svg className="ring" html={plateFrame(colour, { tier, size })} />
      {cut
        ? <img className="cut" src={cut} alt={alt} loading="lazy" decoding="async" />
        : src
          ? (
            <img className="pic" src={src} alt={alt} width={size} height={size}
                 loading="lazy" decoding="async" />
          )
          : <Svg className="sil" html={plateIcon(icon, colour, { size })} />}
    </span>
  );
}
