import { pictureOf } from '../../data/pictures.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';

/** 符 Which family this emblem belongs to. Keys collide across them. */
export type Family = 'art' | 'card' | 'herb' | 'pill' | 'room';

/**
 * 符 A small thing in a row, painted if it has been painted and drawn if it has not.
 *
 * 缺 the audit's long tail: an art, a stance, an awakening card, a herb, a pill line, a
 * room of the vault. Sixty-one of them, all shown at twenty to thirty pixels beside a
 * name, and all still pictograms after everything else in the game was painted.
 *
 * 位 It occupies exactly the box the icon occupied, so a row that used it is the row it
 * always was and nothing around it moves when a painting lands. That is the whole point
 * of doing the wiring before the sheets come back: with no file this renders what it
 * rendered yesterday, and the day a file arrives it is simply there.
 *
 * 名 The key is prefixed by the family, because 狼噬 Wolf Bite is an art and 貪狼 Greedy
 * Wolf is a card and both are keyed `wolf`.
 */
export function Emblem({ family, subject, icon: iconName, size, alt }: {
  family: Family;
  subject: string;
  icon: string;
  size: number;
  alt: string;
}) {
  const painted = pictureOf('emblem', `${family}-${subject}`);
  if (!painted) return <Svg html={icon(iconName, size)} />;
  return (
    <img className="emblem" src={painted} alt={alt} width={size} height={size}
         loading="lazy" decoding="async" />
  );
}
