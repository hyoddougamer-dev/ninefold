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

/**
 * 引 How to play — and now, only the part that cannot be shown.
 *
 * It used to be seven steps and three paragraphs, and it was written when the first
 * screen was the only teacher there was. It is not any more: 引 the guide walks a new
 * cultivator through buying, killing, spending what the kill paid, earning a mark and
 * breaking through, one step at a time, each one finished by doing it.
 *
 * So this keeps four facts and hands the rest over. Every one of the four is a *promise
 * about the game* rather than an instruction — things a player cannot find out by
 * pressing anything, and would otherwise have to discover by being burned:
 *
 *   that leaving does not cost them, which is the whole contract of an idle game;
 *   that staying is worth something, which is the other half of it;
 *   that losing a fight is free, or they will never take one;
 *   and where to look up a character, because that is the complaint this answers.
 *
 * Anything a first step can teach, a first step teaches.
 */
export const HELP = {
  title: '引 How to play',
  steps: [
    ['Qi gathers whether you are here or not',
      'With the phone shut, all night, at the full rate. Come back tomorrow and it is waiting. Nothing in this game is ever taken away for being away.'],
    ['Sitting with it open gathers faster',
      'Up to three times as fast after a few minutes, for about a quarter of an hour. It is a bonus for being there, never a penalty for leaving.'],
    ['Losing a fight costs nothing',
      'Not qi, not material, not a level. Every beast, every tower floor, every warden, every time. So try the ones you are not sure about.'],
    ['釋 says what every character means',
      'The button beside this one. Every symbol the game uses, in English, on one page — the upgrades, the marks, the ranks, the axes, the systems.'],
  ] as const,
  opens: 'Every realm opens something new, and nothing ever resets. The locked tabs say which realm opens them.',
  hunt: '',
  slow: '囊 You begin holding what your master left you. Spend it or let it carry you up the first layer: that trade is the whole game, and it is the first thing it asks you.',
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
  /** 境外 What every heaven opens, said once rather than nine times. */
  heavenRoom: (n: number) => `＋${n} levels of 劍訣 and 妖丹, for good`,

  /** 境外 The ladder above the ladder. */
  nextHeaven: (n: number) =>
    n === 1 ? 'One more crossing opens' : `${n} more crossings open`,
  /** The last heaven's own line already says there is no tenth name; this must not
   *  say it again on the same card. */
  lastHeaven: 'From here it comes back for ever, and always heavier than the one you '
    + 'put down.',

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
  poolFilling: (left: string) => `The pool fills in ${left}.`,
  capped: 'Full for this realm. Climb to hold more.',
  /** 境外 At the summit there is no realm left to climb, so the room comes from crossing. */
  cappedTop: 'Full for this heaven. Cross the tribulation to hold more.',

  /**
   * 凝丹 Condensing a core out of raw qi, for a cultivator with nothing to skin.
   *
   * It only ever appears when 材 material has run out, which is the one moment it is an
   * answer rather than a fifth box. The wording has to be honest about the exchange
   * rate — it is a bad deal and saying so is what points at 狩 Hunt.
   */
  condenseHead: 'No 材 material left',
  condense: 'You can force a 妖丹 out of raw qi instead. It works, and it is dear: '
    + 'this is qi that would have opened layers.',
  condensePrice: (qi: string, rungs: string) => `${qi} qi — ${rungs} rungs of the climb`,
  condenseHunt: 'A beast leaves material when it falls. That is the cheap way, and it is one tap away.',
  /** 境 How far this realm is out of. Nine is worth knowing on the first day. */
  ofNine: (n: number, of: number) => `realm ${n} of ${of}`,
  /** 境外 And the same question above the summit, where realms have run out. */
  ofHeavens: (n: number, of: number) => `heaven ${n} of ${of}`,
  cap: (held: number, cap: number) => `${held} of ${cap}`,
};

/**
 * 梯 The climb, said out loud.
 *
 * The drawing shows that the layers sit inside the realm. It cannot show what *fills*
 * them, and that was the actual gap: a player watching a bar rise had no way to learn
 * that the bar is one of nine, that filling all nine summons something, or that beating
 * that something is what moves the realm on.
 *
 * Three sentences, one fact each, and every one of them is a thing the player is about
 * to watch happen.
 */
/**
 * 收 The corner, folded into one button.
 *
 * Five bare characters floating over a screen that is already teaching characters is
 * five unanswered questions at once. Folded, they are one button; opened, every one of
 * them says in English what it is, which is the rule the rest of the game already
 * follows and the one place that had escaped it.
 */
export const MENU = {
  label: 'Menu',
  save: 'Your save',
  help: 'How to play',
  key: 'What the characters mean',
  stele: 'The stele',
};

/**
 * 境 What a realm is, on one page.
 *
 * Every line here answers a question a player actually asks, in the order they ask it,
 * and none of it is a new fact: the page is assembled from the same tables the game
 * plays by. It exists because the answer was scattered across five screens and a player
 * standing in the third realm could not find out what the third realm was.
 */
export const REALMCARD = {
  of: (n: number, all: number) => `realm ${n} of ${all}`,
  what: (layers: number) =>
    `A realm is ${layers} layers. Your qi fills them one at a time, and each one you `
    + 'open makes you gather a little faster for ever. The last of them is the warden: '
    + 'reach it and the beast walks out, and beating it is what opens the next realm. '
    + 'Whatever qi you have gathered comes with you.',
  hereHead: 'Where you are',
  layers: 'layers filled',
  day: 'days climbing',
  wardenHead: 'What stands at the end',
  warden: 'It has exactly the power of a cultivator who filled this realm and brought '
    + 'nothing else, so the levels get you to the door and everything else opens it. '
    + 'Losing costs you nothing at all.',
  gaveHead: 'What this realm opened',
  nextHead: 'What the next one is worth',
  opens: (list: string) => `Opens ${list}.`,
  opensNothing: 'Opens no new system. It is the top of the climb.',
  back: 'Back',
};

export const LADDER = {
  rule: (han: string, name: string) =>
    `Your qi fills one rung. Eight of them fill ${han} ${name}, and its warden is the `
    + 'ninth: beat it and the next realm opens, with whatever qi you have gathered '
    + 'coming with you.',
  /** Written on the row itself. Two rows of dashes with nothing naming them is a
   *  diagram of something, and the player is left to guess what. */
  realms: (n: number, of: number) => `境 realm ${n}/${of}`,
  layers: (n: number, of: number) => `層 layer ${n}/${of}`,
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

  /**
   * 續 The lines that keep 示 from ever going quiet. Everything above says what is
   * blocking you; these say what is worth doing when nothing is, which is most of the
   * time. A line that only speaks when you are stuck teaches a player that not being
   * stuck means there is nothing to do.
   */
  goHunt: (han: string, pct: number, left: number, mark: string) =>
    `${han} is within reach at ${pct}%. ${left} more ${left === 1 ? 'kill' : 'kills'} earns its ${mark} mark.`,
  canAfford: (han: string, name: string) => `You can afford another ${han} ${name} right now.`,
  reachFor: (han: string, wants: number, mine: number) =>
    `${han} stands at 力 ${Math.round(wants * 10) / 10}. You are at 力 ${Math.round(mine * 10) / 10}. `
    + `Every level and every layer closes that.`,
  opensSoon: (han: string, name: string, realmHan: string, realmName: string, gives: string) =>
    `${han} ${name} opens at ${realmHan} ${realmName}. ${gives}`,
  theTop: 'Fill the pool and the Dragon comes. Every mark makes you heavier, and so does it.',
};

/**
 * 釋 The key: what every character on the screen means.
 *
 * The characters are what 九境 looks like, and taking them off would leave a spreadsheet
 * about numbers going up. So they stay — and none of them is ever the only place a thing
 * is named. This page is the guarantee behind that: one tap from anywhere, every symbol
 * the game uses, in English, read out of the same tables the game itself reads.
 */
export const KEY = {
  title: '釋 The key',
  blurb: 'Every character the game uses, and what it means. The game keeps the characters '
    + 'because they are what it looks like — but nothing here is ever only a character.',

  heldHead: '數 What you hold',
  heldBlurb: 'The four things you can have. Two of them tick up on their own.',
  qi: 'Gathers on its own, awake or asleep. It fills the bar and buys upgrades.',
  power: 'How hard you hit and how much you can take. Beasts are measured in it too.',
  material: 'Falls off beasts and tower floors. Qi cannot buy it and waiting cannot earn it.',
  dao: 'One for every three layers climbed, two for every warden. Spent on the tree.',

  buysHead: '買 What you can buy',
  buysBlurb: 'Four upgrades. A realm holds six levels of each and not one more.',

  marksHead: '錄 The marks on every beast',
  marksBlurb: 'Every beast you kill is counted for ever, and the count pays.',
  mark: (at: number, pays: string) => `at ${at} ${at === 1 ? 'kill' : 'kills'} · ${pays}`,

  fightHead: '戰 Fighting',
  fightBlurb: 'The whole fight is settled the moment you press. Losing costs nothing, ever.',
  fight: 'Start it. You watch it play back, round by round.',
  stance: (n: number) => `Always on. You hold the stance of every realm you have reached, ${n} in all.`,
  art: 'Three in an order, one firing each round, then looping. A warden gives up its own.',
  collect: 'You won. Take the material, and whatever it left behind.',
  withdraw: 'You lost. Nothing is taken from you. Come back stronger.',

  ranksHead: '階 The five ranks of gear',
  ranksBlurb: 'The rank sets how much a piece is worth and how many lines it carries.',
  rank: (mult: number) => `x${mult} on every line`,

  axesHead: '軸 What gear can give',
  axesBlurb: 'Seven axes. A piece always grants a percentage, so an old piece stays good.',

  slotsHead: '位 The six places you wear it',
  slotsBlurb: 'One piece each. Wear several of one realm and the lineage pays on top.',

  pillsHead: '丹 The three lines of pills',
  pillsBlurb: 'Brewed in 爐 the furnace, from qi and material together. Kept for good.',

  systemsHead: '開 The systems, and the realm that opens each',
  systemsBlurb: 'Nothing resets, so every realm hands over something that was not there before.',
  opensAt: (han: string, name: string) => `opens at ${han} ${name}`,

  doingHead: '作 Words you will meet',
  doingBlurb: 'The rest of the characters that ask you to do something.',
  breakThrough: 'Take the next realm. Only you can press it, never the clock.',
  full: 'This upgrade is at its cap for this realm. Climb to hold more.',
  save: 'Your save, to copy out or paste back. It lives in this browser only.',
  stele: 'Everything you have done, counted: the deeds and the figures.',
  back: 'What gathered while the app was shut, paid in full.',

  close: 'Back to the game',
};

/**
 * 引 The five steps of the first session.
 *
 * Each one names a thing to do, says why it is worth doing, and is finished by the
 * player doing it — never by reading. Together they are the first realm's loop said out
 * loud once: buy, kill, spend what the kill gave you, keep killing the same animal
 * until the counting pays, climb.
 */
export const GUIDE = {
  step: (n: number, of: number) => `Step ${n} of ${of}`,
  /** 時 The same step, before the player can do it. It is the *next* one, not the one. */
  next: (n: number, of: number) => `Next \u00b7 ${n} of ${of}`,
  close: 'Put the guide away',
  /** 引 In the help panel, for anyone who put it away and wants it back. */
  reopen: 'Bring the guide back',
  reopenNote: 'You put 引 the guide away. It picks up wherever you are.',
  /**
   * 指 Short, because the arrow does the pointing — and each one has a second line for
   * the stretch before it can be done at all.
   *
   * Bruno: *"as coisas ficam stuck e nao saem e devem aparecer na altura que os players
   * tiverem prestes a desbloquear esse acontecimento."* The rat is twelve minutes away
   * at the start of the game, and for twelve minutes the card asked for it anyway. The
   * `waiting` line is what the card says instead: never "you cannot do this yet" on its
   * own, always "you cannot do this yet, and here is the thing that gets you there".
   */
  buy: {
    title: 'Spend what you were given',
    text: 'You start holding 800 qi. Buy the box the arrow points at. '
      + 'Qi you spend stops filling the bar, and that trade is the whole game.',
  },
  kill: {
    title: 'Go and kill something',
    text: 'Press the beast the arrow points at. '
      + 'The odds are honest, and losing costs you nothing at all.',
    waiting: '\u5c71\u9f20 the rat is still stronger than you, and the hunt screen says by how '
      + 'much. Buy power and the gap closes. The bar below is how close you are.',
  },
  core: {
    title: 'Spend what the beast left',
    text: '\u6750 Material buys \u5996\u4e39 Beast Cores, the one upgrade qi cannot. '
      + '+8% power, for good.',
    waiting: '\u5996\u4e39 costs 3 \u6750 material, and material only falls off things you kill. '
      + 'Three rats pay for the first one.',
  },
  mark: {
    title: 'Kill the same beast ten times',
    text: 'Ten kills of one animal earns its \u719f Known mark. '
      + 'Every drop in the game then pays more, permanently.',
    waiting: 'Nothing in reach is worth killing yet. Buy power, and the beasts come back '
      + 'into range.',
  },
  climb: {
    title: 'Beat the warden and break through',
    text: 'The realm is full and its warden is standing at the end of it. '
      + 'Beat it and \u7a81\u7834 opens.',
    waiting: 'Eight rungs fill the realm, and its warden walks out at the end of them. '
      + 'Every box you buy opens them faster. The bar below is the whole realm.',
  },
};

export const HUNT = {
  /** 出 When a beast of this realm walks out, for the rows that have not yet. */
  walksOut: (layer: number) => `layer ${layer}`,
  coming: 'Still to come in this realm',

  /** Shown under the power figure. Losing a hunt has no cost at all, and it must say so. */
  free: 'A loss costs you nothing.',
  odds: 'odds',
  /** 誠 What the right-hand figure means when the fight cannot be won yet: not a
   *  percentage, but how many times your own power the beast is. It is the one number
   *  that tells three unwinnable fights apart. */
  toReach: 'needed',
  reach: (n: number) => `${n} beasts within reach`,
  paysMaterial: '材 material, from the record',
  paysPower: '力 power, from the record',

  /**
   * 錄 The record. Old beasts have to be worth killing, or the screen is one button.
   *
   * The row used to read "0 / 10 toward 熟", which tells a player who does not read
   * Chinese that something is 10 away and nothing about what it is or what it gives.
   * Now it names the mark in English and says what it pays, on the row where the
   * killing happens.
   */
  toward: (kills: number, at: number, han: string, name: string, pays: string) =>
    (kills === 0
      ? `never hunted · ${at} ${at === 1 ? 'kill' : 'kills'} earns ${han} ${name}, ${pays}`
      : `${kills} / ${at} toward ${han} ${name} · ${pays}`),
  mastered: 'mastered · every mark earned',
  record: 'Every beast you kill is counted for ever, and the count pays. 見 Seen at one kill '
    + 'fills in the bestiary; 熟 Known at ten gives you more 材 material from everything in '
    + 'the game; 通 Mastered at a hundred gives you power. Both of those are permanent, and neither '
    + 'can be hurried by waiting. A beast you have finished with sinks to the bottom.',
};

/**
 * 圍 The drive.
 *
 * It has to say three things and no more: what it is, what it costs, and what it pays.
 * A player is spending qi they cannot get back, so the screen owes them the numbers
 * before the tap rather than a reassurance after it.
 */
export const DRIVE = {
  what: 'You have beaten this one ten times, so there is nothing left to find out. '
    + 'A drive settles the rest at once: the same material, the same record, the same '
    + 'drops. What the qi buys is the tapping.',
  free: 'Fighting it one at a time is still free, and always will be.',
  never: 'Not now',
  back: 'Back',
  kills: (n: number) => `${n} kills`,
  pays: (m: string) => `${m} \u6750 each`,
  willPay: (m: string) => `about ${m} \u6750`,
  took: (n: number) => `${n} kills, settled`,
  fell: 'drops fell',
  bestOf: (n: number) => (n === 1 ? 'the only one that fell' : `the best of ${n} that fell`),
  earned: (han: string, pays: string) => `${han} \u00b7 ${pays}`,
};

/**
 * 鑑 Reading a piece.
 *
 * The sheet has one job the chest never did: let a player *look* at something before
 * deciding. So every line of it is a fact about the object or about the trade, and none
 * of it is encouragement. "This is better" is not said anywhere — the two numbers at
 * the bottom say what would happen and the player decides what better means.
 */
export const ITEM = {
  /** 拆 The single melt, on the sheet where the piece can actually be looked at. */
  salvage: 'Melt it down',

  what: 'What it gives',
  against: (name: string) => `Against the ${name} you are wearing`,
  fromRealm: (n: number) => `realm ${n} make`,
  lines: (n: number) => (n === 1 ? '1 line' : `${n} lines`),
  refined: (level: number, gain: number, per: number) =>
    `\u7149 Refined ${level} ${level === 1 ? 'time' : 'times'}. Every line on it is `
    + `${gain}% higher than it rolled, and each refining adds another ${per}%.`,
  times: (x: number) => {
    const pct = (x - 1) * 100;
    if (Math.abs(pct) < 0.05) return 'no change';
    return `${pct > 0 ? '+' : ''}${Math.round(pct * 10) / 10}%`;
  },
  wear: 'Wear it',
  swap: 'Wear it instead',
  takeOff: 'Take it off',
  close: 'Back',
};

export const GEAR = {
  /**
   * 拆 Melting gear down.
   *
   * The bulk button has to state its own size before it is pressed, because there is no
   * undo and a player who taps it expecting one piece and loses thirty will not tap it
   * again. So the count and the qi are *on the button*, not near it.
   */
  upTo: (rank: string) => `${rank} and below`,
  salvage: (n: number) => (n === 1 ? 'Melt 1 piece' : `Melt ${n} pieces`),
  melting: 'Gear you will never wear is qi you have not collected. A piece is worth a share of a layer of the realm it was made in — so old junk stays old junk, however far you climb.',

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
    `The technique tree opens at ${han} ${name}. You have earned ${earned} 道 already, `
    + 'and every point is waiting for you. Nothing is being lost.',

  /** 半 The two halves of the 道 screen. They are different questions. */
  halfTree: 'Techniques',
  halfBuild: 'Stance & Arts',
  /** 點 What the dot on the 道 tab means, for the tooltip and the screen reader. */
  freePoints: (n: number) =>
    `${n} 道 ${n === 1 ? 'point' : 'points'} to spend`,

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
    // 數 The number is handed in rather than written here. It is LEVELS_PER_REALM, it has
    // been six for a long time, and a line that says "six" in prose is a copy of a
    // balance number that nothing will ever come back and correct.
    text: (n: number, extra: number) =>
      `${n} levels of each qi upgrade per realm, and this realm is full of one of them. `
      + 'The only way to hold more is to climb, so a full box is not a wall. It is the '
      + `next realm calling. 妖丹 is the exception: it runs ${extra} levels further, `
      + 'because it is bought with 材 material you went and killed something for.',
  },
  cores: {
    // 名 Not "Go and kill something": that is the title of 引 the guide's second step,
    // word for word, and two different cards with one name is the fastest way to make a
    // player think the game is repeating itself. This one is about the currency.
    title: '材 Material is the other currency',
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
  /** 圖鑑 What finishing a realm's four is worth, said where the four are listed. */
  pays: (n: number) => `${n} 道 when all four are 熟 Known`,
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
  /**
   * 見 The first time a beast falls, and only the first.
   *
   * It is the same card as the 見 Seen mark, because it is the same event. The qi leads,
   * because the qi is the part that moves the number the player has been watching all
   * day — which was the whole complaint: combat never touched it.
   */
  firstSight: (qi: string, han: string) =>
    `+${qi} qi for the first ${han} you ever killed, once and never again. `
    + 'Every beast in the game pays this the first time it falls.',
  chestFull: 'Chest is full. This one is lost.',
  /** 熟 Said at the moment it happens, because a permanent reward that passes in
   *  silence is one the player never learns to go looking for. */
  earned: (han: string, pays: string) => `${han} · ${pays}, for good`,
};
