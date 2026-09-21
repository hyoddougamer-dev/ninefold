/**
 * 勢 Stances and 訣 arts.
 *
 * The fight was the only system in the game with no decision in it: you picked a beast,
 * you watched, and everything was settled before you pressed anything. These are the
 * decision, and they are both made *outside* the fight — an idle game that needs you
 * present at the fight stops being one.
 *
 * Two halves that answer two different questions:
 *
 *   勢 **A stance** says what kind of fighter you are. One, always on, and it rewrites
 *     every round. You have the stance of every realm you have reached.
 *
 *   訣 **A sequence** says how that fighter fights. Three arts in an order, one firing
 *     each round and then looping. An art is the warden's own, so you hold the art of
 *     every warden you have put down.
 *
 * The order is the point. 鶴唳 takes power off the beast for the rest of the fight, so
 * it is worth more early; 狼噬 grows with every round already fought, so it is worth
 * more late. Two players with the same three arts in a different order are not playing
 * the same build.
 */

export type StanceKey =
  | 'swift' | 'guard' | 'fierce' | 'entangle' | 'endure'
  | 'steady' | 'reckless' | 'reverse' | 'mirror';

export interface Stance {
  readonly key: StanceKey;
  /** The realm you must have reached to stand in it. */
  readonly realm: number;
  readonly han: string;
  readonly name: string;
  readonly text: string;
  /** What kind of build it asks for, shown under the name. */
  readonly wants: string;
}

export const STANCES: readonly Stance[] = [
  { key: 'swift', realm: 1, han: '疾', name: 'Swift',
    text: 'You strike twice a round for 60% each, and your sequence runs twice as fast.',
    wants: 'a sequence that wants to come round again' },
  { key: 'guard', realm: 2, han: '守', name: 'Guard',
    text: 'You take 40% less and deal 25% less.',
    wants: '破 sunder, and fights you win slowly' },
  { key: 'fierce', realm: 3, han: '兇', name: 'Ferocious',
    text: 'You deal 50% more and take 50% more.',
    wants: '力 power, and fights that end early' },
  { key: 'entangle', realm: 4, han: '纏', name: 'Entangle',
    text: 'The beast loses 8% of its power every round.',
    wants: 'beasts above your weight' },
  { key: 'endure', realm: 5, han: '續', name: 'Endure',
    text: 'You recover 6% of your health every round.',
    wants: '氣 qi, and long fights' },
  { key: 'steady', realm: 6, han: '穩', name: 'Steady',
    text: 'Your blows never vary. No dice at all.',
    wants: 'a fight you should win, and do not want to lose to bad luck' },
  { key: 'reckless', realm: 7, han: '險', name: 'Reckless',
    text: 'Half your blows do nothing. The rest hit for triple.',
    wants: 'a gamble worth taking' },
  { key: 'reverse', realm: 8, han: '逆', name: 'Reverse',
    text: 'You deal 1% more for every 1% of health you have lost.',
    wants: 'surviving, not winning early' },
  { key: 'mirror', realm: 9, han: '鏡', name: 'Mirror',
    text: 'Your blow is never smaller than the one you took last round.',
    wants: 'beasts far above you' },
];

export const STANCE_BY_KEY: Readonly<Record<string, Stance>> =
  Object.fromEntries(STANCES.map((s) => [s.key, s]));

/** The stances a cultivator of this realm may stand in. */
export function stancesFor(realm: number): readonly Stance[] {
  return STANCES.filter((s) => s.realm <= realm);
}

export interface Art {
  readonly key: string;
  /** The warden that drops it, by realm. */
  readonly realm: number;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  readonly text: string;
}

export const ARTS: readonly Art[] = [
  { key: 'fox', realm: 1, han: '狐影', name: 'Fox Shadow', icon: 'fox-head',
    text: "The beast's blow this round misses you entirely." },
  { key: 'ape', realm: 2, han: '猿臂', name: 'Ape Arm', icon: 'monkey',
    text: 'This strike hits for 60% more.' },
  { key: 'crane', realm: 3, han: '鶴唳', name: 'Crane Cry', icon: 'heron',
    text: 'The beast loses a tenth of its power for the rest of the fight.' },
  { key: 'tiger', realm: 4, han: '虎嘯', name: 'Tiger Roar', icon: 'tiger-head',
    text: 'This strike lands twice.' },
  { key: 'turtle', realm: 5, han: '龜息', name: 'Turtle Breath', icon: 'turtle',
    text: 'You recover 12% of your health.' },
  { key: 'puppet', realm: 6, han: '傀儡', name: 'Puppet Thread', icon: 'golem-head',
    text: 'A quarter of the blow you took last round is dealt back.' },
  { key: 'wolf', realm: 7, han: '狼噬', name: 'Wolf Bite', icon: 'direwolf',
    text: 'This strike hits 12% harder for every round already fought.' },
  { key: 'serpent', realm: 8, han: '蛟騰', name: 'Serpent Rise', icon: 'sea-serpent',
    text: 'Triple damage, but only below half health.' },
  { key: 'dragon', realm: 9, han: '龍威', name: 'Dragon Might', icon: 'spiked-dragon-head',
    text: "This strike hits 35% harder, and the beast's blow this round misses." },
];

export const ART_BY_KEY: Readonly<Record<string, Art>> =
  Object.fromEntries(ARTS.map((a) => [a.key, a]));

/** How many arts fit in a sequence. Three is enough to order and few enough to hold. */
export const SEQUENCE_SLOTS = 3;

/** Which warden drops which art. Named rather than positional, so a reorder is safe. */
export const WARDEN_ART: Readonly<Record<string, string>> = {
  fox: 'fox', ape: 'ape', crane: 'crane', tiger: 'tiger', turtle: 'turtle',
  golem: 'puppet', direwolf: 'wolf', jiao: 'serpent', dragon: 'dragon',
};
