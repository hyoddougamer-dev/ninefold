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
    ['Sitting with it open gathers faster',
      'Up to three times as fast after a few minutes. Closing the app never costs you anything.'],
    ['Spend it on the upgrades',
      'Three to start with. They make qi come faster and make you stronger, and you never lose a level you bought. Qi you spend is qi that did not open a layer — that is the trade, all the way up.'],
    ['A realm only holds six levels of each',
      'When they are full, the only way to hold more is to climb. That is what a realm is for.'],
    ['Go and fight something',
      'Three beasts in 狩 Hunt from the first minute. They are too strong at first and the odds say so; come back when you are not. Losing costs nothing, ever.'],
    ['Fill the bar, then fight the warden',
      'One beast guards each realm. Tap 戰 and watch. If you lose, you lose nothing.'],
    ['突破 Break through',
      'You move up a realm and the light around you changes.'],
  ] as const,
  opens: 'Every realm opens something new: gear and the build at the second, 妖丹 cores at the third, the tree at the fourth, the tower at the fifth, and so on to the ninth. The locked tabs say which realm opens them.',
  hunt: '狩 Hunt is open from the start, and the first three beasts will beat you for the first couple of hours — the odds are on the button, so you can see them coming. Losing costs nothing. They drop 材 material, and material buys 妖丹 cores, which a warden will not fall without from the third realm.',
  slow: '囊 You begin holding what your master left you — enough for a first upgrade, and very nearly enough to open the first layer by itself. Spend it or let it carry you up: that trade is the whole game, and it is the first thing it asks you.',
  begin: 'Begin',
};

export const CULTIVATE = {
  spend: 'Spend your qi',
  wardenHead: "妖 The realm's warden",
  warden: 'Beat it to open the breakthrough. If you lose, you lose nothing. Come back stronger.',

  /** 渡劫 What the ninth realm says instead, now that it has somewhere to go. */
  tribulationHead: '劫 The tribulation',
  tribulation: 'The Dragon comes back harder every time. Cross it for a 雷印 mark. If you lose, you lose nothing.',
  marks: (n: number) => (n === 1 ? '1 mark' : `${n} marks`),
  toward: (power: string) => `力 ${power} is what the Dragon brings`,
  ceiling: (n: number, gain: string) =>
    `Each 雷印 mark multiplies your power and your qi by ${gain}, for good. You hold ${n}. `
    + 'There is no rebirth yet, so this is the ladder above the ladder.',

  /**
   * 入定 Being there.
   *
   * The wording matters more than most lines in this file. It must read as something
   * gained by staying, never as something lost by leaving, because leaving costs
   * nothing and the game has to keep saying so.
   */
  deep: 'Sitting with it deepens your gathering. It keeps rising for a few minutes.',
  deepFull: 'Fully settled. This is as deep as sitting with it goes.',

  /**
   * 雷池 The pool. It is the ninth realm's bar, and it refills.
   *
   * `lastLayers` is the honest half of it. The breakthrough into 渡劫 promises the pool,
   * and the pool is nine layers away: a player told about it at layer 1 goes looking for
   * something that is not there for another fortnight. So the ninth realm says what it is
   * doing while it is still climbing.
   */
  lastLayers: (n: number) =>
    `${n} more ${n === 1 ? 'layer' : 'layers'} and the bar becomes 雷池 the thunder pool.`,
  pool: 'The thunder pool holds two days of your gathering. Fill it and the Dragon comes.',
  poolFilling: (left: string) => `The pool fills in ${left}.`,
  capped: 'Full for this realm. Climb to hold more.',
  cap: (held: number, cap: number) => `${held} of ${cap}`,
};

/**
 * 碑 The stele.
 *
 * It says what was done and never what it is worth, because the deeds are worth nothing
 * — and the page has to say so out loud, or a player will spend a week hunting one on
 * the assumption that it pays.
 */
export const CHRONICLE = {
  title: 'The stele',
  standing: (day: number, realm: string) => `Day ${day} of the climb, standing in ${realm}.`,
  nearest: (han: string, name: string) => `Nearest: ${han} ${name} ·`,
  figures: 'Where you have got to',
  day: 'day', realm: 'realm', rungs: 'layers opened', power: 'power', rate: 'gathering',
  kills: 'beasts killed', seen: 'beasts met', mastered: '通 mastered', wardens: 'wardens down',
  floor: 'best floor', seals: '塔印 seals', pills: 'pills brewed', refine: 'deepest 煉器',
  dao: '道 spent', marks: '雷印 marks',
  rule: 'A deed pays nothing. Not qi, not power, not material. They are a record of what '
    + 'this cultivator did, and the record is the reward.',
  counted: (n: number) => `${n} deeds, all of them counted from the save itself. There is `
    + 'no list of what you have earned, so there is nothing to forge.',
};

export const TRIALS = {
  towerHead: '塔 The Endless Tower',
  tower: 'One floor, one beast. Win and the floor is yours for good. Lose and nothing happens.',
  floor: (n: number) => `Floor ${n}`,
  best: (n: number) => (n === 0 ? 'No floor taken yet' : `Best floor ${n}`),
  seals: (n: number) => `${n} 塔印 ${n === 1 ? 'seal' : 'seals'}`,
  sealWorth: (pct: string) => `Every nine floors is a seal. Seals give you ${pct} more material from everything.`,
  climb: 'Climb',
  pays: (mats: string, qi: string) => `pays ${mats} 材 · ${qi} qi`,
  /** The qi a floor pays, said in the unit that means something: your own time. */
  hours: (span: string) => `A floor pays ${span} of your own gathering, once. This is the one place where fighting moves the bar.`,

  furnaceHead: '爐 The Furnace',
  furnaceShut: (han: string, name: string) =>
    `The furnace is cold until ${han} ${name}. Qi has nowhere else to go after that, and `
    + 'this is where it goes.',
  furnace: 'Pills cost qi and 材 material together. What you brew is yours for good, and nothing here has a cap.',
  brew: 'Brew',
  held: (n: number) => (n === 1 ? '1 taken' : `${n} taken`),
  needMaterial: 'You need more 材 material. The tower pays it.',
  rule: 'No pill makes qi come faster. That is the one thing the furnace will not sell you, and it is why the climb still takes three months.',
};

/**
 * 示 The line that tells a stuck player why they are stuck.
 *
 * Every one of these names the thing to do and where to do it. None of them explains the
 * design, and none of them says "you should" — the game states the fact and the player
 * decides.
 */
export const ADVICE = {
  needMaterial: (short: number) =>
    `This warden will not fall without 妖丹 cores, and cores cost 材 material. `
    + `You are ${short.toLocaleString('en-GB')} short. Material comes from hunting.`,
  buyCores: (han: string) => `You can afford another ${han}. Cores are the one upgrade qi cannot buy, and a warden asks for them.`,
  buyTechnique: 'You can afford another 劍訣. Buy it and try the warden again.',
  waitTechnique: (cost: number) =>
    `The next 劍訣 costs ${cost.toLocaleString('en-GB')} qi. That is the wait.`,
  noStance: 'You are fighting with no 勢 stance. Pick one in 道 Path. It is free and it changes every round.',
  noSequence: 'Your 訣 sequence is empty, so every round fires nothing. Fill it in 道 Path.',
  /**
   * Both of these take the pill's name rather than printing 煉體丹, which is the *line*
   * and not a pill anybody can see: the screen sells 合道丹 at the seventh realm and
   * 渡劫丹 at the ninth. A line naming something that is nowhere on the list sends the
   * player looking for it.
   */
  brew: (han: string) => `The furnace will sell you a ${han}. It is power you keep for good.`,
  /** 立 The endgame's one decision, said out loud while the Dragon is standing. */
  brewForDragon: (han: string, pct: number) =>
    `The Dragon is at ${pct}%. A ${han} raises that, and the power stays with you afterwards.`,
  climbForMaterial: 'Everything else is at its cap. Climb the tower for material and qi.',
  floorWaiting: (floor: number) => `Floor ${floor} of the tower looks winnable. It pays hours of gathering, once.`,
  huntForMaterial: 'Everything else is at its cap. Hunt for 材 material, which is what 妖丹 cores cost.',
  cappedSoSpend: 'Nothing left to buy in this realm. The tower and the furnace are where qi goes now.',
  cappedSoClimb: 'Nothing left to buy in this realm. The tower is where the next thing comes from.',
  cappedSoClimbRealm: (han: string, name: string) =>
    `Nothing left to buy in this realm. ${han} ${name} opens the next thing to spend on.`,
};

export const HUNT = {
  /** Shown under the power figure. Losing a hunt has no cost at all, and it must say so. */
  free: 'A loss costs you nothing.',
  reach: (n: number) => `${n} beasts within reach`,

  /** 錄 The record. Old beasts have to be worth killing, or the screen is one button. */
  toward: (kills: number, at: number, han: string) =>
    (kills === 0 ? `never hunted` : `${kills} / ${at} toward ${han}`),
  mastered: 'mastered',
  record: 'Every beast carries three marks. 熟 at ten kills gives you more 材 material from '
    + 'everything; 通 at a hundred gives you power. A beast you have finished with sinks to '
    + 'the bottom of this list.',
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

  /**
   * 煉器 Refining. It has to say three things: what it costs, that it has no top, and
   * that the levels belong to the piece rather than to you — because choosing which
   * piece to pour a run's material into is the decision, and a decision you did not
   * know you were making is not one.
   */
  refineHead: '煉器 Refine',
  refine: 'Material makes a piece you already wear better, and there is no top level. '
    + 'The levels stay on the piece, so pick the one you mean to keep.',
  refineAt: (level: number, pct: number) =>
    (level === 0 ? 'not refined yet' : `煉 ${level} · every line on it +${pct}%`),
  setNeed: (n: number) => `${n} more ${n === 1 ? 'piece' : 'pieces'} of this realm`,
};

export const DAO = {
  /** 道 What the screen says while the tree is still shut. The points are banking. */
  shut: (earned: number, han: string, name: string) =>
    `道 The technique tree opens at ${han} ${name}. You have earned ${earned} 道 already, `
    + 'and every point is waiting for you. Nothing is being lost.',

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

/**
 * 新 The one-time cards.
 *
 * They are not introductions. 突破 the breakthrough already introduces whatever the realm
 * opened, in the one moment the game stops for — so these say **what to do with it**, on
 * the screen where it lives, at the moment it first becomes usable. Two cards saying the
 * same thing is the game talking over itself, and it read exactly like that on screen
 * before they were split.
 *
 * The titles carry no 漢字: the card draws the character in its own column, and a title
 * that repeats it reads as a stutter — which is exactly how it read in the screenshot
 * that caught it.
 */
export const NOTICE = {
  cap: {
    title: 'A realm only holds so much',
    text: 'Six levels of each upgrade, and this realm is full of one of them. The only way '
      + 'to hold more is to climb, so a full box is not a wall. It is the next realm calling.',
  },
  cores: {
    title: 'Go and kill something',
    text: '妖丹 is the one upgrade qi cannot buy: it costs 材 material, and material only '
      + 'falls off beasts. Until you have some, this realm\'s warden will not fall.',
  },
  tower: {
    title: 'Only the next floor is ever open',
    text: 'It never runs out, and losing costs nothing. The only question a floor asks is '
      + 'whether your build clears it. Sweep what is below you for material; the floors '
      + 'that can actually beat you are the ones that pay in qi.',
  },
  furnace: {
    // Not "start with a 煉體丹": 煉體 is the *line*, and the pill on the screen is named
    // for the realm brewing it — 合道丹 at the seventh, 大乘丹 at the eighth. A card
    // naming a pill that is nowhere on the list is a card sending the player looking.
    title: 'Start with the power pill',
    text: 'It is power you keep for good, and every pill after it costs a little more. Qi '
      + 'brewed is qi that did not open a layer, so this is a trade rather than a freebie.',
  },
  refine: {
    title: 'Pick the piece you mean to keep',
    text: 'The levels stay on the piece, not on you. A run\'s material poured into one '
      + 'sword is material that is not in the next sword you find.',
  },
  record: {
    title: 'Old beasts are worth going back for',
    text: 'Ten kills of one beast is a 熟 mark and a hundred is 通. Every beast below your '
      + 'realm still has marks in it, and the list puts the ones with something left on top.',
  },
  pool: {
    title: 'Fill the pool and the Dragon comes',
    text: 'It holds two days of your own gathering, and crossing empties it again. Qi spent '
      + 'in the furnace is qi that is not in the pool, which is the whole decision up here.',
  },
  read: 'Got it',
};

/**
 * 鎖 What a locked tab says.
 *
 * It names the realm rather than a number of days, because a realm is a thing the player
 * is already climbing toward and a day is not.
 */
/** 突破 The one moment the game stops for, and the word that ends it. */
export const BLOOM = {
  on: 'Go on',
};

export const LOCKED = {
  opensAt: (han: string, name: string, n: number) =>
    `This opens when you reach ${han} ${name}, the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][n - 1]} realm.`,
  back: 'Back',
};

export const UPDATE = {
  ready: 'A new version is ready.',
  take: 'Take it',
  later: 'Not now',
};

export const SAVE = {
  title: 'Your save',
  played: 'played for',
  reached: 'reached',
  gear: 'gear',
  why: 'Your save lives in this browser, on this phone. There is no account. Clear the browser data and it is gone. Keep a copy somewhere you will find it again.',
  copy: 'Copy the save',
  copied: 'Copied. Paste it into a note, a message to yourself, anywhere you keep things.',
  copyByHand: 'Copying was blocked, so here it is. Select all of it and copy by hand.',
  download: 'Download a file',
  downloaded: 'Saved as a file.',
  noDownload: 'This app is not allowed to hand you a file. Use Copy instead.',
  restoreOpen: 'Restore from a copy',
  restore: 'Restore this save',
  restored: (realm: number) => `Restored. You are back at realm ${realm}.`,
  pastePlaceholder: 'Paste a save here',
  spare: 'The game also keeps a spare copy of its own, and falls back to it if the main one is ever lost. That protects you from the game. Only your own copy protects you from the phone.',
  wipe: 'Start again',
  wipeSure: 'This erases everything, including the spare copy. Copy your save first if you might want it back.',
  wipeYes: 'Erase it all',
  wipeNo: 'Keep my save',
  close: 'Back to the game',
};

export const LOADOUT = {
  noStance: 'You have no stance yet. Reach realm 1 and 疾 Swift is yours.',
  pickStance: 'Pick one. It is always on, and it changes every round of every fight.',
  noArts: 'You hold no arts yet. Each warden you put down hands over its own.',
  emptySlot: 'empty, a wasted round',
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
