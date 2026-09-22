/**
 * 緣 Somebody on the road.
 *
 * Bruno: *"é tudo muito superficial e vazio."* Nine realms, thirty-six beasts and a
 * Dragon at the top, and nothing in any of it had ever spoken. This is the cheapest
 * thing in the game that makes it somewhere rather than something, and it is not
 * economy: the amounts are small on purpose and half the endings are nothing at all.
 *
 * 律 The rules it keeps, which are the game's own.
 *
 *   取 Nothing is ever taken that was not offered. Every cost sits on the choice that
 *     pays it, and walking on is free, always, on every meeting.
 *   待 It never blocks and it never expires. A meeting waits on the screen until it is
 *     answered, and closing the app does not lose it.
 *   定 It is chosen, not rolled. Which meeting comes next is a function of the save, so
 *     two cultivators with the same history meet the same people, and 演 the harness
 *     can walk it.
 */

/** What an answer does. Costs are stated on the pick, never hidden behind it. */
export type Outcome =
  /** Qi, counted in minutes of this cultivator's own standing gathering. */
  | { kind: 'qi'; minutes: number }
  /** Material, as a share of what a beast of this realm pays. */
  | { kind: 'material'; share: number }
  | { kind: 'dao'; points: number }
  /** A piece of gear, rolled from this realm's table at the given rank or better. */
  | { kind: 'item'; luck: number }
  /** Nothing happens, and the line says so plainly. */
  | { kind: 'nothing' };

export interface Pick {
  /** What the button says. */
  readonly label: string;
  /** 材 What pressing it costs, in beasts of this realm. Never hidden. */
  readonly costMaterial?: number;
  /**
   * 氣 What pressing it costs, in minutes of this cultivator's own gathering.
   *
   * Minutes and not a share of the rung, which is what it was first: a rung is a whole
   * layer of the climb and grows exponentially, so "six tenths of a rung" read as
   * 23.8M qi at the fourth realm to a cultivator holding two hundred thousand. Minutes
   * are the same size at every realm, which is the only scale a meeting should use.
   */
  readonly costQi?: number;
  readonly outcome: Outcome;
  /** The line afterwards. */
  readonly then: string;
}

export interface Meeting {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  /** The realm this one can first be met in. */
  readonly realm: number;
  readonly line: string;
  readonly picks: readonly [Pick, Pick];
}

export const MEETINGS: readonly Meeting[] = [
  {
    key: 'oldman', han: '老者', name: 'An old man on the mountain road', icon: 'tied-scroll',
    realm: 2,
    line: 'He is selling one thing and he will not say what it is. He wants 材 material for it.',
    picks: [
      { label: 'Buy it', costMaterial: 8,
        outcome: { kind: 'item', luck: 1.6 },
        then: 'He hands it over without looking up, and is gone before you turn round.' },
      { label: 'Walk on', outcome: { kind: 'nothing' },
        then: 'He does not seem to mind. He was not really looking at you.' },
    ],
  },
  {
    key: 'brokensword', han: '斷劍', name: 'A broken sword in the road', icon: 'ancient-sword',
    realm: 2,
    line: 'Snapped a hand above the guard. Somebody carried it a long way before they dropped it.',
    picks: [
      { label: 'Melt it down', outcome: { kind: 'qi', minutes: 25 },
        then: 'It goes quietly. Whatever was in it comes into you.' },
      { label: 'Leave it standing', outcome: { kind: 'dao', points: 1 },
        then: 'You set it upright in the dirt. Something in you settles at the sight of it.' },
    ],
  },
  {
    key: 'beggar', han: '乞兒', name: 'A child begging at a shrine', icon: 'incense',
    realm: 2,
    line: 'There is nothing in the bowl. The shrine behind has not been swept in years.',
    picks: [
      { label: 'Give what you have', costMaterial: 5,
        outcome: { kind: 'dao', points: 1 },
        then: 'The bowl fills. The child says nothing, and you walk on lighter than you came.' },
      { label: 'Sweep the shrine', outcome: { kind: 'material', share: 3 },
        then: 'Under the dust there is an offering nobody came back for.' },
    ],
  },
  {
    key: 'merchant', han: '行商', name: 'A merchant with a covered cart', icon: 'wax-seal',
    realm: 3,
    line: 'He deals in what falls off beasts and he is a long way from anywhere that buys it.',
    picks: [
      { label: 'Sell him your spare', costMaterial: 12,
        outcome: { kind: 'qi', minutes: 90 },
        then: 'He pays in spirit stones, which is to say in qi, which is to say honestly.' },
      { label: 'Ask what he has seen', outcome: { kind: 'nothing' },
        then: 'Beasts on the north road. He is telling you so you will go and thin them.' },
    ],
  },
  {
    key: 'drunk', han: '醉道', name: 'A drunk cultivator under a tree', icon: 'round-potion',
    realm: 3,
    line: 'He is at least two realms above you and he cannot stand up.',
    picks: [
      { label: 'Sit with him a while', outcome: { kind: 'dao', points: 2 },
        then: 'He talks for an hour about nothing. Some of the nothing was not nothing.' },
      { label: 'Take the gourd', costQi: 40,
        outcome: { kind: 'item', luck: 2.2 },
        then: 'It is not wine. It has not been wine for a very long time.' },
    ],
  },
  {
    key: 'crow', han: '老鴉', name: 'A crow that will not leave', icon: 'raven',
    realm: 3,
    line: 'It has followed you for a mile and it is carrying something in its beak.',
    picks: [
      { label: 'Feed it', costMaterial: 6,
        outcome: { kind: 'item', luck: 1.4 },
        then: 'It drops what it was carrying, takes what you offered, and goes.' },
      { label: 'Ignore it', outcome: { kind: 'nothing' },
        then: 'It follows you another mile and then it does not.' },
    ],
  },
  {
    key: 'stele', han: '殘碑', name: 'A broken stele', icon: 'crystal-shrine',
    realm: 4,
    line: 'Half a name and half a method, cut into stone by somebody who ran out of time.',
    picks: [
      { label: 'Read what is left', outcome: { kind: 'dao', points: 2 },
        then: 'The half that survives is the half that mattered. It usually is.' },
      { label: 'Break it up for the jade', outcome: { kind: 'qi', minutes: 60 },
        then: 'There was jade in it. There was also somebody’s name.' },
    ],
  },
  {
    key: 'furnace', han: '棄爐', name: 'An abandoned furnace', icon: 'cauldron',
    realm: 4,
    line: 'Cold for years, and there is something still sealed in the bottom of it.',
    picks: [
      { label: 'Light it again', costQi: 60,
        outcome: { kind: 'material', share: 14 },
        then: 'It takes most of a day to get hot. What was sealed in it was worth the day.' },
      { label: 'Leave it cold', outcome: { kind: 'nothing' },
        then: 'Whatever is down there has waited this long.' },
    ],
  },
  {
    key: 'swordsman', han: '劍客', name: 'A swordsman who wants a bout', icon: 'katana',
    realm: 5,
    line: 'No stakes, he says. He has said that to a lot of people on this road.',
    picks: [
      { label: 'Cross blades', outcome: { kind: 'dao', points: 3 },
        then: 'You lose. You learn more in the losing than he does in the winning.' },
      { label: 'Decline', outcome: { kind: 'nothing' },
        then: 'He bows, which is worse than if he had laughed.' },
    ],
  },
  {
    key: 'pool', han: '靈池', name: 'A pool with nothing living in it', icon: 'icicles-aura',
    realm: 5,
    line: 'The water is clear and very cold and the qi above it stands still.',
    picks: [
      { label: 'Sit in it', outcome: { kind: 'qi', minutes: 120 },
        then: 'An hour in the cold and the qi comes in through the skin rather than the breath.' },
      { label: 'Fill a flask', outcome: { kind: 'material', share: 10 },
        then: 'It keeps. It is the sort of thing an alchemist would take in trade.' },
    ],
  },
];

const BY_KEY: Readonly<Record<string, Meeting>> =
  Object.fromEntries(MEETINGS.map((m) => [m.key, m]));

export function meetingOf(key: string): Meeting | undefined {
  return BY_KEY[key];
}

/**
 * A save is input. A key that names nobody is not a meeting, nobody is met twice, and
 * the list cannot be longer than the number of people who exist.
 *
 * It lives here rather than in sim/meet.ts because state.ts has to reach it, and
 * sim/meet.ts reads a State: the two would import each other. Same reason dao.ts takes
 * a list of keys and never a cultivator.
 */
export function validMet(raw: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of Array.isArray(raw) ? raw : []) {
    if (out.length >= MEETINGS.length) break;
    if (typeof k !== 'string' || seen.has(k) || !BY_KEY[k]) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Every 道 point every meeting in the game could ever hand over, added up. */
export const MEET_POINT_CEILING = MEETINGS.reduce((n, m) =>
  n + Math.max(...m.picks.map((p) => (p.outcome.kind === 'dao' ? p.outcome.points : 0))), 0);
