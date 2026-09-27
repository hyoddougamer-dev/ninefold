import { HEART_PATH } from '../sim/balance.ts';

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
  /** 緣 Something that stays: a small, permanent gift. See BOONS below. */
  | { kind: 'boon'; boon: Boon }
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
  /**
   * 心 Which way the answer leans: 1 kind, -1 hard, nothing for neither. It is never
   * shown on the button. The heart is what the road makes of you, not a score you aim.
   */
  readonly heart?: 1 | -1;
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
  /**
   * 歸 Somebody coming back. Only met by a cultivator who met `key` and answered it with
   * `pick`, so what you did then decides who finds you later.
   */
  readonly after?: { readonly key: string; readonly pick: 0 | 1 };
  /** 心 Only met by a heart that has leaned this far this way. See HEART_PATH. */
  readonly heart?: 1 | -1;
  /** 境外 Above the summit: how many 雷印 thunder marks before this one is on the road. */
  readonly marks?: number;
}

/**
 * 緣 The things that stay. One meeting gives each, so each is paid once in a lifetime:
 * a finite gift, and none of them touches the qi rate. How big each is lives in
 * balance.ts (BOON_*).
 */
export type Boon = 'familiar' | 'swordsoul' | 'token' | 'lotus' | 'blood';

export const BOON_INFO: Readonly<Record<Boon, { han: string; name: string; what: string }>> = {
  familiar:  { han: '鴉', name: 'Two crows', what: 'beasts leave a piece a little more often' },
  swordsoul: { han: '劍魂', name: 'A sword soul', what: 'a little more power' },
  token:     { han: '商印', name: 'The merchant’s token', what: 'drives cost less' },
  lotus:     { han: '蓮', name: 'A lotus seed', what: 'you mend a little every round of a fight' },
  blood:     { han: '血', name: 'A blood method', what: 'beasts count a little weaker, never the Dragon' },
};

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
      { label: 'Melt it down', outcome: { kind: 'qi', minutes: 25 }, heart: -1,
        then: 'It goes quietly. Whatever was in it comes into you.' },
      { label: 'Leave it standing', outcome: { kind: 'dao', points: 1 }, heart: 1,
        then: 'You set it upright in the dirt. Something in you settles at the sight of it.' },
    ],
  },
  {
    key: 'beggar', han: '乞兒', name: 'A child begging at a shrine', icon: 'incense',
    realm: 2,
    line: 'There is nothing in the bowl. The shrine behind has not been swept in years.',
    picks: [
      { label: 'Give what you have', costMaterial: 5, heart: 1,
        outcome: { kind: 'dao', points: 1 },
        then: 'The bowl fills. The child says nothing, and you walk on lighter than you came.' },
      { label: 'Sweep the shrine', outcome: { kind: 'material', share: 3 }, heart: -1,
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
      { label: 'Sit with him a while', outcome: { kind: 'dao', points: 2 }, heart: 1,
        then: 'He talks for an hour about nothing. Some of the nothing was not nothing.' },
      { label: 'Take the gourd', costQi: 40, heart: -1,
        outcome: { kind: 'item', luck: 2.2 },
        then: 'It is not wine. It has not been wine for a very long time.' },
    ],
  },
  {
    key: 'crow', han: '老鴉', name: 'A crow that will not leave', icon: 'raven',
    realm: 3,
    line: 'It has followed you for a mile and it is carrying something in its beak.',
    picks: [
      { label: 'Feed it', costMaterial: 6, heart: 1,
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
      { label: 'Read what is left', outcome: { kind: 'dao', points: 2 }, heart: 1,
        then: 'The half that survives is the half that mattered. It usually is.' },
      { label: 'Break it up for the jade', outcome: { kind: 'qi', minutes: 60 }, heart: -1,
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

  // ── 緣起 The road remembers ──────────────────────────────────────────────────────
  // Everything below was written on 27 September, when Bruno asked for more on the road
  // and for things that are different. Three things are new: people come back and
  // remember what you did (`after`), the heart leans with every answer and some people
  // only find one kind of cultivator (`heart`), and five of them leave something that
  // stays (a boon).

  {
    key: 'ferryman', han: '擺渡', name: 'A ferryman who takes no money', icon: 'drakkar-dragon',
    realm: 5,
    line: 'He takes a story instead. He has heard most of them, and he says so.',
    picks: [
      { label: 'Tell him yours', outcome: { kind: 'qi', minutes: 90 },
        then: 'He listens to the end. On the far bank the qi is thicker, as if the river had been holding it back.' },
      { label: 'Swim across', outcome: { kind: 'qi', minutes: 60 },
        then: 'You arrive cold, and the cold has done something to your breathing that stays.' },
    ],
  },
  {
    key: 'tomb', han: '古墓', name: 'An open tomb', icon: 'horned-skull',
    realm: 6,
    line: 'The seal is broken, and it was broken from the inside.',
    picks: [
      { label: 'Go down', costQi: 60, heart: -1,
        outcome: { kind: 'item', luck: 2.6 },
        then: 'Whoever left did not take everything. You do.' },
      { label: 'Seal it again', outcome: { kind: 'dao', points: 2 }, heart: 1,
        then: 'It takes an afternoon. Something on the other side of the stone is grateful.' },
    ],
  },
  {
    key: 'orchard', han: '桃林', name: 'A peach orchard out of season', icon: 'olive',
    realm: 6,
    line: 'The fruit is ripe in the wrong month and nobody is guarding it.',
    picks: [
      { label: 'Eat one', outcome: { kind: 'qi', minutes: 150 },
        then: 'It tastes of a year you have not lived yet.' },
      { label: 'Leave them for whoever planted them', outcome: { kind: 'dao', points: 1 }, heart: 1,
        then: 'Nobody thanks you. The orchard is quieter as you leave it.' },
    ],
  },
  {
    key: 'disciple', han: '小道', name: 'The child from the shrine, grown', icon: 'kimono',
    realm: 6, after: { key: 'beggar', pick: 0 },
    line: 'She wears a sect’s robe now, and she has been asking every traveller on this road about you.',
    picks: [
      { label: 'Accept what she brought', outcome: { kind: 'item', luck: 2.4 },
        then: 'She says it is not repayment. It is, and you both know it.' },
      { label: 'Tell her to keep it', outcome: { kind: 'dao', points: 2 }, heart: 1,
        then: 'She bows the way her sect bows. She will not forget this either.' },
    ],
  },
  {
    key: 'keeper', han: '廟祝', name: 'The keeper of a shrine you swept', icon: 'incense',
    realm: 6, after: { key: 'beggar', pick: 1 },
    line: 'He knows what was under the dust, and who took it. He is not angry. He would like it back.',
    picks: [
      { label: 'Pay it back', costMaterial: 10, heart: 1,
        outcome: { kind: 'dao', points: 2 },
        then: 'He lights a stick of incense with your name on it.' },
      { label: 'Say it was never there', outcome: { kind: 'nothing' }, heart: -1,
        then: 'He nods, as if that were an answer. The shrine behind him goes unswept again.' },
    ],
  },
  {
    key: 'crows', han: '雙鴉', name: 'Two crows now', icon: 'raven',
    realm: 6, after: { key: 'crow', pick: 0 },
    line: 'The crow you fed has come back with its mate, and they seem to have decided about you.',
    picks: [
      { label: 'Let them stay', outcome: { kind: 'boon', boon: 'familiar' }, heart: 1,
        then: 'They take turns on your shoulder. Beasts drop things near crows, it turns out.' },
      { label: 'Send them off', outcome: { kind: 'nothing' },
        then: 'They go without fuss. They are not offended. Crows keep a long ledger.' },
    ],
  },
  {
    key: 'monk', han: '行僧', name: 'A monk who walks with no shoes', icon: 'barefoot',
    realm: 6, heart: 1,
    line: 'He has heard about you from people you helped. He says it is rarer than you would think.',
    picks: [
      { label: 'Walk with him a day', outcome: { kind: 'boon', boon: 'lotus' },
        then: 'At the end of it he gives you a seed and tells you to keep it against your ribs.' },
      { label: 'Give him your sandals', outcome: { kind: 'dao', points: 2 }, heart: 1,
        then: 'He puts them on and laughs. Neither of you needed them much.' },
    ],
  },
  {
    key: 'swordsoul', han: '劍魂', name: 'The sword you left standing', icon: 'floating-ghost',
    realm: 7, after: { key: 'brokensword', pick: 1 },
    line: 'It is still upright in the dirt, and its owner is standing beside it, a little see-through.',
    picks: [
      { label: 'Bow to him', outcome: { kind: 'boon', boon: 'swordsoul' }, heart: 1,
        then: 'He bows back and steps into you. Your own sword hand is surer after.' },
      { label: 'Ask his name', outcome: { kind: 'dao', points: 2 },
        then: 'He tells you, and then he is gone. You say it once aloud, for him.' },
    ],
  },
  {
    key: 'smith', han: '鑄師', name: 'A smith asking after a sword', icon: 'ring-mould',
    realm: 7, after: { key: 'brokensword', pick: 0 },
    line: 'He forged it for his son. He asks whether anybody on this road has seen it.',
    picks: [
      { label: 'Tell him the truth', outcome: { kind: 'dao', points: 1 }, heart: 1,
        then: 'He is quiet a long time. Then he thanks you, which is harder to hear than anger.' },
      { label: 'Say nothing', outcome: { kind: 'nothing' }, heart: -1,
        then: 'He asks the next traveller. You are already a long way off.' },
    ],
  },
  {
    key: 'demon', han: '魔修', name: 'A demonic cultivator who likes you', icon: 'warlock-hood',
    realm: 7, heart: -1,
    line: 'He says you have the right look about the eyes, and he means it as a compliment.',
    picks: [
      { label: 'Learn his method', outcome: { kind: 'boon', boon: 'blood' }, heart: -1,
        then: 'It works. Beasts smell it on you now, and they hesitate.' },
      { label: 'Turn him away', outcome: { kind: 'dao', points: 1 }, heart: 1,
        then: 'He shrugs. There is always somebody else on this road.' },
    ],
  },
  {
    key: 'tradesman', han: '老商', name: 'The merchant, much richer', icon: 'wax-seal',
    realm: 7, after: { key: 'merchant', pick: 0 },
    line: 'He did well on what you sold him cheap, and he is the kind of man who remembers that.',
    picks: [
      { label: 'Take his token', outcome: { kind: 'boon', boon: 'token' },
        then: 'Show it to anybody in the trade and they will give you a better price.' },
      { label: 'Take the coin', outcome: { kind: 'qi', minutes: 150 },
        then: 'Spirit stones, counted twice in front of you. Old habits.' },
    ],
  },
  {
    key: 'bridge', han: '斷橋', name: 'A toll-keeper with no bridge', icon: 'gold-nuggets',
    realm: 7,
    line: 'The bridge fell years ago. He still takes the toll, and he is very serious about it.',
    picks: [
      { label: 'Pay the toll', costMaterial: 15, heart: 1,
        outcome: { kind: 'dao', points: 2 },
        then: 'He shows you a ford that nobody else knows about. It was what the toll was for.' },
      { label: 'Push past him', outcome: { kind: 'qi', minutes: 90 }, heart: -1,
        then: 'He does not stop you. The spirit stones in his purse do not stop you either.' },
    ],
  },
  {
    key: 'rematch', han: '再戰', name: 'The swordsman, again', icon: 'katana',
    realm: 8, after: { key: 'swordsman', pick: 0 },
    line: 'He has not stopped thinking about the bout on the fifth realm’s road. Neither, he suspects, have you.',
    picks: [
      { label: 'Cross blades again', outcome: { kind: 'dao', points: 3 },
        then: 'You win this time. He laughs as if he had.' },
      { label: 'Ask for his second sword', outcome: { kind: 'item', luck: 2.8 },
        then: 'He hands it over. He says it never liked him.' },
    ],
  },
  {
    key: 'sober', han: '醒道', name: 'The drunk, sober', icon: 'round-potion',
    realm: 8, after: { key: 'drunk', pick: 1 },
    line: 'He would like his gourd back. He is five realms above you and entirely sober.',
    picks: [
      { label: 'Give it back', costMaterial: 20, heart: 1,
        outcome: { kind: 'dao', points: 3 },
        then: 'He weighs it, finds it lighter, and says nothing about that. He teaches you something instead.' },
      { label: 'Keep it', outcome: { kind: 'nothing' }, heart: -1,
        then: 'He laughs, which is the most frightening thing he could have done. Then he leaves you with it.' },
    ],
  },
  {
    key: 'teacher', han: '師傅', name: 'The drunk, remembering an hour', icon: 'meditation',
    realm: 8, after: { key: 'drunk', pick: 0 },
    line: 'He is sober now, and he remembers the only person who sat with him under that tree.',
    picks: [
      { label: 'Ask for a lesson', outcome: { kind: 'dao', points: 3 },
        then: 'It lasts a week. You will be unpacking it for years.' },
      { label: 'Share a drink with him', outcome: { kind: 'qi', minutes: 180 },
        then: 'It is wine this time. Mostly.' },
    ],
  },
  {
    key: 'mirror', han: '心鏡', name: 'A mirror in the snow', icon: 'crystal-ball',
    realm: 8,
    line: 'It shows you as you would be if every answer on this road had gone the other way.',
    picks: [
      { label: 'Look for a while', outcome: { kind: 'dao', points: 2 },
        then: 'The one in the glass looks back just as long. Neither of you says which is better off.' },
      { label: 'Break it', outcome: { kind: 'qi', minutes: 200 }, heart: -1,
        then: 'The pieces are cold and full of qi. None of them show you anything now.' },
    ],
  },
  {
    key: 'hermit', han: '隱者', name: 'A hermit below the summit', icon: 'spell-book',
    realm: 9,
    line: 'He came this far, looked up at the last realm, and decided this was far enough.',
    picks: [
      { label: 'Ask him why', outcome: { kind: 'dao', points: 3 }, heart: 1,
        then: 'His answer is short and you do not like it. It stays with you anyway.' },
      { label: 'Buy his manual', costMaterial: 30,
        outcome: { kind: 'item', luck: 3.2 },
        then: 'He sells it gladly. He says he was done with it.' },
    ],
  },
  {
    key: 'rival', han: '宿敵', name: 'Another cultivator racing for the top', icon: 'boot-prints',
    realm: 9,
    line: 'She is a day behind you on the last road, and she knows it.',
    picks: [
      { label: 'Wait for her', outcome: { kind: 'dao', points: 2 }, heart: 1,
        then: 'You climb the last stretch together. It is easier than climbing it first.' },
      { label: 'Break the path behind you', outcome: { kind: 'material', share: 20 }, heart: -1,
        then: 'The stones you pull loose are worth something. She will take the long way round.' },
    ],
  },
  {
    key: 'immortal', han: '散仙', name: 'A loose immortal', icon: 'cloud-ring',
    realm: 9, marks: 3,
    line: 'He crossed long ago and never went any higher. He likes it here, he says.',
    picks: [
      { label: 'Ask about the next heaven', outcome: { kind: 'dao', points: 3 },
        then: 'He tells you what he remembers of it. It is mostly weather.' },
      { label: 'Trade for his robe', costMaterial: 40,
        outcome: { kind: 'item', luck: 3.6 },
        then: 'It was his teacher’s. He is glad to see it walk again.' },
    ],
  },
  {
    key: 'weaver', han: '仙娥', name: 'A celestial weaver', icon: 'fairy-wings',
    realm: 9, marks: 9,
    line: 'She is weaving cloud into cloth and she is short of thread.',
    picks: [
      { label: 'Offer her thread', costMaterial: 50,
        outcome: { kind: 'item', luck: 4 },
        then: 'What she makes with it is yours. She says so as if it were obvious.' },
      { label: 'Watch her work', outcome: { kind: 'dao', points: 3 },
        then: 'A pattern in it looks like your road. She does not say whether that is an accident.' },
    ],
  },
  {
    key: 'oldmanagain', han: '老者', name: 'The old man from the mountain road', icon: 'tied-scroll',
    realm: 9, marks: 15, after: { key: 'oldman', pick: 0 },
    line: 'He is sitting on a cloud, selling the same one thing. He says you have grown into it.',
    picks: [
      { label: 'Buy it again', costMaterial: 60,
        outcome: { kind: 'item', luck: 4.5 },
        then: 'It is the same thing. It was always going to be.' },
      { label: 'Ask him what it was', outcome: { kind: 'dao', points: 4 }, heart: 1,
        then: 'He tells you. You laugh for a whole day.' },
    ],
  },
  {
    key: 'thunderchild', han: '雷童', name: 'A child made of thunder', icon: 'lightning-helix',
    realm: 9, marks: 24,
    line: 'It wants to know why you keep coming back when the sky keeps saying no.',
    picks: [
      { label: 'Tell it', outcome: { kind: 'dao', points: 3 }, heart: 1,
        then: 'It listens, and the next storm is a little kinder.' },
      { label: 'Frighten it off', outcome: { kind: 'qi', minutes: 360 }, heart: -1,
        then: 'It goes, and it leaves the charge it was carrying behind.' },
    ],
  },
];

const BY_KEY: Readonly<Record<string, Meeting>> =
  Object.fromEntries(MEETINGS.map((m) => [m.key, m]));

/** 緣 Which of the two answers was given to each meeting, by key. */
export type Chose = Readonly<Record<string, 0 | 1>>;

/** 心 Where the heart leans: every answer's lean, added up. Derived, never stored. */
export function heartOf(met: readonly string[], chose: Chose): number {
  let n = 0;
  for (const k of met) {
    const c = chose[k];
    if (c === undefined) continue;
    n += BY_KEY[k]?.picks[c].heart ?? 0;
  }
  return n;
}

/** 緣 Whether this meeting can be on the road for a cultivator with this history. */
export function roadOpen(m: Meeting, realm: number, marks: number, met: readonly string[], chose: Chose): boolean {
  if (m.realm > realm || (m.marks ?? 0) > marks) return false;
  if (m.after && (!met.includes(m.after.key) || chose[m.after.key] !== m.after.pick)) return false;
  if (m.heart) {
    const h = heartOf(met, chose);
    if (m.heart > 0 ? h < HEART_PATH : h > -HEART_PATH) return false;
  }
  return true;
}

/**
 * 緣 The things the road has left that stay, from the answers given. Cached on the
 * answers object, because power() and the drop table ask on every fight and the answers
 * only change when somebody on the road is answered.
 */
const BOONS_CACHE = new WeakMap<object, ReadonlySet<Boon>>();
export function boonsOf(met: readonly string[], chose: Chose): ReadonlySet<Boon> {
  const hit = BOONS_CACHE.get(chose);
  if (hit) return hit;
  const found = readBoons(met, chose);
  BOONS_CACHE.set(chose, found);
  return found;
}

/** 緣 Whether the road has left this one thing, for a save that may predate the answers. */
export function hasBoon(s: { readonly met?: readonly string[]; readonly chose?: Chose }, b: Boon): boolean {
  return !!s.chose && boonsOf(s.met ?? [], s.chose).has(b);
}

function readBoons(met: readonly string[], chose: Chose): ReadonlySet<Boon> {
  const out = new Set<Boon>();
  for (const k of met) {
    const c = chose[k];
    const o = c === undefined ? null : BY_KEY[k]?.picks[c].outcome;
    if (o && o.kind === 'boon') out.add(o.boon);
  }
  return out;
}

/**
 * 緣 The road as a save may claim it: every key a meeting, nobody twice, each one open to
 * the cultivator at the point in the list where it was met (its realm, its marks, the
 * answer it follows, the heart it needs), and an answer only for a meeting that was met.
 * A save is input, and a return claimed without its first meeting is not kept.
 */
export function validRoad(
  rawMet: unknown, rawChose: unknown, realm: number, marks: number,
): { met: string[]; chose: Record<string, 0 | 1> } {
  const src = (rawChose && typeof rawChose === 'object' ? rawChose : {}) as Record<string, unknown>;
  const met: string[] = [];
  const chose: Record<string, 0 | 1> = {};
  for (const k of Array.isArray(rawMet) ? rawMet : []) {
    if (met.length >= MEETINGS.length) break;
    if (typeof k !== 'string' || met.includes(k)) continue;
    const m = BY_KEY[k];
    if (!m || !roadOpen(m, realm, marks, met, chose)) continue;
    met.push(k);
    const c = src[k];
    if (c === 0 || c === 1) chose[k] = c;
  }
  return { met, chose };
}

export function meetingOf(key: string): Meeting | undefined {
  return BY_KEY[key];
}

/**
 * The keys alone, for a caller with no realm or answers to hand (tests, old tools).
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
