/**
 * 畫 Which things in the game have a painting, and which are still a silhouette.
 *
 * 繪 Proposal C: real pictures for the named creatures, the nine realms and the nine
 * heavens. The pictures themselves are files in `public/art/`, and this list is the only
 * thing the game knows about them. It is written by `npm run pictures`, which reads the
 * folder, so a painting that has been dropped in is in the game on the next build and a
 * painting that has not been made yet costs nothing at all.
 *
 * 退 The rule the whole system rests on: **a missing picture is not a hole.** Everything
 * that can be painted falls back to 印 the seal, which is the frame around the icon the
 * game already ships. So the art can arrive one file at a time, over months, and the
 * game is never half-drawn: it is drawn one way until it is drawn a better one.
 */

/** A painted thing, by the key it is known by in its own table. */
export type Painted = 'beast' | 'realm' | 'heaven' | 'cut' | 'self' | 'meet' | 'emblem';

/**
 * The keys that have a file, by kind. Written by the tool, never by hand.
 *
 * A file is `public/art/<kind>/<key>.webp`, 512 by 512 for a creature and 768 by 432
 * for a realm or a heaven. See tools/pictures.ts for the sizes and why they are those.
 *
 * 修 `self` is the cultivator, one painting per realm *per figure*, keyed `<who>-<n>` and
 * cut the same way as `cut`. It
 * stands inside the aura rather than replacing it: the rings, motes and halos are read
 * off the save and breathe on a pulse, and no painting can carry that.
 *
 * 符 `emblem` is everything the game draws as a symbol in a row: an art, a stance, an
 * awakening card, a herb, a pill line, a room of the vault. They are shown at twenty to
 * thirty pixels, so each is one object on paper rather than a scene, and each key is
 * prefixed by its family because they collide: 狼噬 Wolf Bite is an art and 貪狼 Greedy
 * Wolf is a card, and both are keyed `wolf`.
 *
 * 緣 `meet` is an encounter, one wide scene each, keeping its paper: it is a page out of
 * a traveller's notebook and it is shown as one, in a band across the top of the card.
 *
 * 剪 `cut` is the same creature with the paper keyed off it, at its own shape rather than
 * squared. 牌 the plate wears the paper, because at 46 pixels a pale disc with a painting
 * on it is a page out of a bestiary. 鬥 the arena wears the cut-out, because at full size
 * that same disc is a sticker.
 */
export const PICTURES: Readonly<Record<Painted, readonly string[]>> = {
  beast: [
    'ape',
    'bat',
    'beetle',
    'boar',
    'centipede',
    'crab',
    'crane',
    'direwolf',
    'dragon',
    'fox',
    'frog',
    'gargoyle',
    'goblin',
    'golem',
    'harpy',
    'hound',
    'jellyfish',
    'jiao',
    'lizard',
    'mantis',
    'minotaur',
    'ogre',
    'owl',
    'rat',
    'raven',
    'scorpion',
    'serpent',
    'skeleton',
    'squid',
    'tiger',
    'turtle',
    'unicorn',
    'vulture',
    'wolf',
    'worm',
    'wraith',
  ],
  realm: [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ],
  heaven: [],
  cut: [
    'ape',
    'bat',
    'beetle',
    'boar',
    'centipede',
    'crab',
    'crane',
    'direwolf',
    'dragon',
    'fox',
    'frog',
    'gargoyle',
    'goblin',
    'golem',
    'harpy',
    'hound',
    'jellyfish',
    'jiao',
    'lizard',
    'mantis',
    'minotaur',
    'ogre',
    'owl',
    'rat',
    'raven',
    'scorpion',
    'serpent',
    'skeleton',
    'squid',
    'tiger',
    'turtle',
    'unicorn',
    'vulture',
    'wolf',
    'worm',
    'wraith',
  ],
  self: [
    'man-1',
    'man-2',
    'man-3',
    'man-4',
    'man-5',
    'man-6',
    'man-7',
    'man-8',
    'man-9',
    'woman-1',
    'woman-2',
    'woman-3',
    'woman-4',
    'woman-5',
    'woman-6',
    'woman-7',
    'woman-8',
    'woman-9',
  ],
  meet: [
    'beggar',
    'brokensword',
    'crow',
    'drunk',
    'furnace',
    'merchant',
    'oldman',
    'pool',
    'stele',
    'swordsman',
  ],
  emblem: [],
};

/** Where a picture lives, if it exists. Null is the normal answer for now. */
export function pictureOf(kind: Painted, key: string): string | null {
  return PICTURES[kind].includes(key) ? `art/${kind}/${key}.webp` : null;
}

/** How much of the set is painted, for the tool and for 頁 the bible to report. */
export function painted(kind: Painted): number {
  return PICTURES[kind].length;
}
