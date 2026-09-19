/**
 * 文 Everything the player reads.
 *
 * It lives in one file for two reasons. The first is that text scattered across six
 * screens cannot be reviewed — you cannot see that two screens call the same thing by
 * two different names until they are side by side. The second is that this is the file
 * a translation would replace.
 *
 * The rules it is written to, after a pass that found the first draft explaining itself
 * instead of explaining the game:
 *
 *   1. **Say what the player does, and what happens.** Not why it was designed so. The
 *      halo is "a halo behind your head", not "the first sign read from across a room".
 *   2. **One fact per sentence.** Five facts strung on middots is a paragraph the eye
 *      slides off.
 *   3. **No em-dash as a dramatic beat.** It was in a third of the lines and it is the
 *      loudest tell that nobody sat and read this out loud.
 *   4. **Same word for the same thing, everywhere.** The four buttons are *upgrades* on
 *      every screen that mentions them.
 *   5. **Numbers with the unit the screen shows.** 道 costs 道, qi is qi a second.
 */

export const HELP = {
  title: '引 How to play',
  steps: [
    ['Qi gathers on its own',
      'It keeps going with the phone closed. Come back tomorrow and it is waiting for you.'],
    ['Spend it on the four upgrades',
      'Two make qi come faster, two make you stronger. You never lose a level you bought.'],
    ['Fill the bar, then fight the warden',
      'One beast guards each realm. Tap 戰 and watch. If you lose, you lose nothing.'],
    ['突破 Break through',
      'You move up a realm and the light around you changes.'],
  ] as const,
  hunt: '狩 Hunt has beasts you can fight any time. They drop 材 material, and material buys 妖丹 cores.',
  slow: 'The first hour is slow. Realm 1 gathers 1 qi a second. Buy 丹藥 pills and 功法 method as soon as you can afford them.',
  begin: 'Begin',
};

export const CULTIVATE = {
  spend: 'Spend your qi',
  warden: 'Beat it to open the breakthrough. If you lose, you lose nothing. Come back stronger.',
  ceiling: 'Realm 9 is as far as the climb goes for now. Your qi keeps gathering. Nothing above it has been built yet.',
};

export const HUNT = {
  /** Shown under the power figure. Losing a hunt has no cost at all, and it must say so. */
  free: 'A loss costs you nothing.',
  reach: (n: number) => `${n} beasts within reach`,
};

export const GEAR = {
  best: (han: string) => `Your best piece is ${han}. That is the rim you are wearing.`,
  fuse: '煉 Fuse: three make one',
  empty: 'Empty. Beasts drop gear, and wardens always do.',
  howTo: 'Tap a piece to wear it. Tap a worn slot to take it off.',
  lines: (spirit: number, heaven: number) =>
    `靈 pieces carry ${spirit} lines, 天 pieces carry ${heaven}.`,
  drops: (realm: number) => `Beasts here drop gear up to realm ${realm}.`,
  better: 'Worth more than what you are wearing',
  sets: 'Wear pieces of one realm together and the set pays you extra.',
  setNeed: (n: number) => `${n} more ${n === 1 ? 'piece' : 'pieces'} of this realm`,
};

export const DAO = {
  tree: 'All three branches grow from 起. The gold bridges cross between them, so you can climb one branch and step into the next.',
  short: (cost: number, earned: number) =>
    `You cannot buy all of it. The tree costs ${cost} 道 and a full climb earns about ${earned}.`,
  taken: (n: number, total: number) => `${n} of ${total} taken`,
  keystone: 'A keystone. Stronger than the node beside it, and it takes something away.',
  closes: (han: string, name: string) => `Take this and ${han} ${name} closes for good.`,
  closed: (han: string) => `Closed. You took ${han} instead.`,
  learned: 'learned',
  costs: (n: number) => `costs ${n} 道`,
};

export const LOADOUT = {
  noStance: 'You have no stance yet. Reach realm 1 and 疾 Swift is yours.',
  pickStance: 'Pick one. It is always on, and it changes every round of every fight.',
  noArts: 'You hold no arts yet. Each warden you put down hands over its own.',
  emptySlot: 'empty — a wasted round',
  rotation: 'One art fires each round, in this order, then it starts again. An empty slot fires nothing, so a full sequence is always worth more.',
};

export const BESTIARY = {
  credits: 'Art credits',
  icons: (authors: string) =>
    `Icons from game-icons.net, Creative Commons BY 3.0. Authors: ${authors}.`,
};

export const RETURN = {
  away: (span: string) => `You were away ${span}.`,
  qi: 'qi gathered',
  layers: 'layers opened',
  realms: 'realms climbed',
  power: 'power now',
};

export const ARENA = {
  chestFull: 'Chest is full. This one is lost.',
};
