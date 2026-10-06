/**
 * 文 Everything the player reads.
 *
 * It lives in one file for two reasons. The first is that text scattered across six
 * screens cannot be reviewed. You cannot see that two screens call the same thing by
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

import { ART_BEND, CRAFT_FEED_LEVEL, CRAFT_MARKS, CRAFT_MARK_FASTER, CRAFT_MARK_SUB, CRAFT_MARK_TWICE, CRAFT_MASTERY_BAND, CRAFT_MASTERY_SPEED, FIND_TOP, FUSE_BEND, FUSE_TOP, LUCK_BEND, OPENING_PURSE, QI_KNEE_FIRST, QI_KNEE_GROWTH, QI_ROOF_FIRST, QI_ROOF_TOP, SUNDER_BEND, UPGRADE_NUMBERS, VARIANCE, LUCK_ROLL_TOP } from '../sim/balance.ts';
import { pct as percent } from '../sim/format.ts';
import type { Effect } from '../data/awakening.ts';
import type { Worth } from '../sim/cardworth.ts';
import { RARITY_INFO } from '../data/gear.ts';

/** 式 A balance constant as a formula prints it: 0.35, never 0.35000000000000009. */
const trim = (x: number) => String(Math.round(x * 1000) / 1000);

/**
 * 引 How to play, and now only the part that cannot be shown.
 *
 * It used to be seven steps and three paragraphs, and it was written when the first
 * screen was the only teacher there was. It is not any more: 引 the guide walks a new
 * cultivator through buying, killing, spending what the kill paid, earning a mark and
 * breaking through, one step at a time, each one finished by doing it.
 *
 * So this keeps four facts and hands the rest over. Every one of the four is a *promise
 * about the game* rather than an instruction: things a player cannot find out by
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
      'Up to three times as fast after a few minutes (more with 神 the Spirit branch), for half an hour. Coming back to the game starts a new sitting, and so does 坐 Sit again on 修 Cultivate. It is a bonus for being there, never a penalty for leaving.'],
    ['Losing a fight costs nothing',
      'Not qi, not material, not a level. Every beast, every tower floor, every warden, every time. So try the ones you are not sure about.'],
    // 指 It said "the button beside this one" from before the corner folded into one
    // Menu button. There has been no button beside it since, so it names the way there.
    ['釋 says what every character means',
      'Open ≡ Menu and pick "What the characters mean". Any character with a dotted line under it also says its name when you tap it.'],
  ] as const,
  /** 印 The seal beside each promise, in order. Each title says what its character means. */
  seals: ['氣', '坐', '敗', '釋'] as const,
  opens: 'Every realm opens something new, and nothing ever resets. The locked tabs say which realm opens them.',
  hunt: '',
  slow: '囊 Your master left you some qi. Spend it on upgrades, or let it fill the bar and open the first layer. Choosing between the two is the whole game.',
  begin: 'Back to the climb',
};

/**
 * 序 The prologue: what a brand new player sees before anything else.
 *
 * Bruno: *"o início do how to play é péssimo."* It opened on four numbered paragraphs
 * of rules over a black screen. Now the first thing is the game's name over the first
 * realm's painting and one sentence of what this is, then the whole climb in three
 * pictures, then who is climbing, then the game with 引 the guide pointing at the first
 * thing to press. Nothing here is a rule the guide will not teach by doing.
 */
export const PROLOGUE = {
  name: 'Ninefold',
  line: 'Nine realms stand between a mortal and the sky. You sit at the foot of the first.',
  begin: 'Begin',
  howOver: 'The climb',
  howTitle: 'How the climb works',
  rows: [
    ['氣', 'Qi gathers on its own',
      'Even with the game shut, all night. Come back and it is waiting for you.'],
    ['層', 'Fill the bar to open a layer',
      'Nine layers make a realm. Or spend the qi to grow stronger instead: choosing is the game.'],
    ['狩', 'Hunt, and lose nothing',
      'Beasts drop 材 material, the other currency. A lost fight costs nothing at all.'],
  ] as const,
  next: 'Next',
  /** Read by a screen reader on the dots under the pages. */
  page: (n: number, of: number) => `Page ${n} of ${of}`,
};

/** 勁 The words that rise from a press. Short: they are read in the second they are up. */
export const JUICE = {
  layer: (n: number) => `層 layer ${n}`,
  refined: '煉 refined',
  fused: '合 fused',
  learned: '道 learned',
};

/** 層 The layer a cultivator is on, from the layers opened in the realm: the climb bar's number. */
export const standing = (opened: number): number => Math.min(9, Math.max(0, Math.floor(opened)) + 1);

/**
 * 榜 The rankings, and the one sign-in the game asks for.
 *
 * It asks for as little as it can: a name, and then either nothing (a guest, on this
 * device) or an email (the same cultivator on every device). No password, ever: the link
 * in the email is the password. And it says, before anything is asked, why the boards
 * can be trusted, because a board full of cheaters is worse than no board.
 */
export const RANKS = {
  title: '榜 Rankings',
  menu: 'Rankings',
  /** 榜 The tab on the bar. Short, because six of them share a 320px phone. */
  tab: 'Ranks',
  tabPlace: (n: number) => `Rankings, you are number ${n} on the Heaven List`,
  boards: {
    week: { han: '期榜', name: 'This Week', what: 'Layers climbed since Monday. Everybody starts the week level.' },
    climb: { han: '天榜', name: 'Heaven List', what: 'The furthest climb. Thunder marks count past the summit.' },
    tower: { han: '塔榜', name: 'The Tower', what: 'The highest floor of the Endless Tower.' },
  },
  joinHead: 'Join the rankings',
  joinWhy: 'Every climb on the boards is checked against real time on the server, so nobody can edit or clock their way up. Nothing about your own game changes.',
  namePrompt: 'The name the boards show',
  guest: 'Enter as a guest',
  guestNote: 'Ranked on this device. Add an email later to keep it on every device.',
  or: 'or',
  emailPrompt: 'Your email',
  sendLink: 'Send me a sign-in link',
  send: 'Send',
  linkNote: 'For a cultivator you already have on another device, or to keep this one everywhere. No password: the link is the key.',
  linkSent: (email: string) => `An email is on its way to ${email}. Open its link on this device to sign in.`,
  codePrompt: 'Or a six-digit code, if the email has one',
  codeGo: 'Enter',
  codeBad: 'That code did not work. Check the newest email, or send another.',
  keepHead: 'Keep this cultivator everywhere',
  keepNote: 'Add an email and the same cultivator opens on any device you sign in on.',
  signedAs: (email: string) => `Signed in as ${email}`,
  guestAs: 'Playing as a guest on this device',
  signOut: 'Sign out',
  rename: 'Change name',
  save: 'Save',
  you: 'you',
  empty: 'Nobody here yet. The first to climb is the first on the board.',
  loading: 'Reading the boards…',
  offline: 'The boards cannot be reached right now. Your game goes on as it was.',
  status: {
    verified: (ago: string) => `Your climb is ranked, checked ${ago} ago.`,
    waiting: (h: string) => `Your climb is ahead of real time by ${h}. It will be ranked as the hours pass.`,
    behind: 'This device has an older copy than the one ranked. Nothing is lost.',
    refused: 'Something in this save could not have happened. It is not ranked.',
    /** 疑 Not an accusation. rekaris saw the old line ("faster than anybody honest") after
     *  melting with Auto before the melting allowance existed: the speed was the game's. */
    suspect: 'Your climb went faster than the game expects, so it is off the boards until we take a look. Your game is not touched, and this is not a strike.',
    never: 'Not synced yet. The game tries every five minutes while it is open.',
    /** 拒 The server answered, but not with a verdict. Never left at "Not synced yet". */
    unreached: 'The ranked server could not take this save just now. Your game goes on as it was, and it tries again every five minutes.',
    closed: 'This account is off the boards after saves the server could not accept. Your game is not touched. If you think that is a mistake, tell us in 報-bugs on the Discord and we will look.',
  },
  /** 名 Under the name box, when what is typed is not a name the boards can show. */
  nameRule: 'Letters, numbers and CJK only, and not a title or a 修士 name.',
  nameErrors: {
    taken: 'That name is taken.',
    length: 'Two to twenty letters.',
    characters: 'Letters, numbers and spaces only.',
    reserved: 'The titles and the 修士 names are not for taking.',
    offline: 'That could not be saved just now.',
  },
  /** 盾 Always under the boards, because a player who wonders whether they are fair should not have to ask. */
  fairHead: '盾 Fair play',
  fair: 'Your save is sealed on this device, and every climb on these boards was checked by the server against real time. A save changed by hand still plays, but it is never ranked.',
  /** 改 Only on a phone whose save was changed outside the game. Nothing is taken away. */
  edited: 'This save was changed outside the game. It still plays here, but the boards only ever count what the server can verify.',
  titlesHead: '冠 Titles',
  titles: 'The first on the Heaven List wears 天下第一 First Under Heaven. The week\'s top 1, 10 and 100 wear 期首, 期十 or 期百 for the week after.',
  cloudHead: 'A cultivator in the cloud',
  cloudFound: (there: string, here: string) => `The cloud holds a cultivator at ${there}. This device has one at ${here}.`,
  cloudTake: 'Continue from the cloud',
  cloudKeep: 'Keep this one',
  cloudNote: 'The one not chosen is kept as the spare copy, so it can still be restored from the Menu.',
  /**
   * 層 Where a cultivator stands, said the way the climb bar says it: the layer being
   * worked on, which is one more than the layers opened. The board and the cloud's
   * question said the count opened, so a player on layer 5 read 4/9 there and 5/9 in
   * the game (the Discord, 2026-10-04). `opened` is State.layer, 0 to 8.
   */
  where: (realm: number, opened: number) => `realm ${realm}, layer ${standing(opened)}`,
  climbCell: (climb: number, marks: number) => marks > 0 ? `summit · 雷 ${marks}`
    : `realm ${Math.floor(climb / 9) + 1} · layer ${standing(climb % 9)}/9`,
  gainCell: (n: number) => `+${n} layers`,
  towerCell: (n: number) => `floor ${n}`,
  haveOne: 'I already have a cultivator',
  /** 譯 Every title in English beside its characters, on the board and on 修. */
  titleNames: {
    '天下第一': 'First Under Heaven',
    '期首': 'First of the Week',
    '期十': 'Top Ten of the Week',
    '期百': 'Top Hundred of the Week',
  } as Record<string, string>,
  back: 'Back to the climb',
  delete: 'Delete my ranked account',
  deleteSure: 'This removes your name, your place on the boards and the cloud copy from the server. The game on this device is not touched. If the anti-cheat struck this account, a fingerprint of the email keeps the strikes.',
  deleteYes: 'Delete it',
  deleteNo: 'Keep it',
  privacy: 'Privacy',
};

/**
 * 崩 What a crash says, instead of a white page. It is the one screen that has to work
 * when nothing else does, so it says the only two things that matter: the save is safe,
 * and here is how to take a copy of it before trying again.
 */
export const CRASH = {
  title: 'Something broke',
  body: 'The game hit an error it could not recover from. Your save is safe on this device.',
  reload: 'Open the game again',
  copy: 'Copy my save first',
  copied: 'Copied. Keep it somewhere safe.',
};

/** 版 Which build this is, at the foot of the Menu, for a tester reporting a bug. */
export const BUILD = {
  label: (id: string) => `Build ${id}`,
};

export const TABS_COPY = {
  /** 鎖 A tab this cultivator has not reached, named by the realm's number. */
  opensAt: (realm: number) => `realm ${realm}`,
};

export const CULTIVATE = {
  /**
   * 譯 The two words that were a character and nothing else.
   *
   * 譯 npm run han reads the built game the way somebody who does not read Chinese
   * reads it, and these two came back bare: 滿 on a box at its ceiling, and 材 as the
   * tag under a price where the other currency's tag already said "qi" in English.
   * The characters stay where they are named; these are the places nothing named them.
   */
  fullWord: 'full',
  materialWord: 'material',
  spend: 'Spend your qi',
  /** 盡 One tap buys one, or as many as can be paid for. */
  buyMode: 'How many one tap buys',
  buyOne: '×1',
  buyMax: 'Max',
  lot: (n: number) => `×${n}`,
  wardenHead: "妖 The realm's warden",
  warden: 'Beat it to open the breakthrough. If you lose, you lose nothing. Come back stronger.',

  /** 渡劫 What the ninth realm says instead, now that it has somewhere to go. */
  /** 劫 The heading names the crossing still to come, and the line under the realm's name
   *  the ones already made, so "2" and "3" never sit on one screen unexplained. */
  tribulationNext: (n: number) => `劫 Tribulation ${n} · the next crossing`,
  crossed: (n: number) => (n === 1 ? '1 tribulation crossed' : `${n} tribulations crossed`),
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

  /**
   * 待 What an unaffordable row says, and it is two different sentences.
   *
   * A rung of the ladder takes your qi the moment it can afford it, so the rung you
   * stand on is the most qi you can ever hold. Below that, waiting works. Above it,
   * waiting does nothing at all and only the climb will do, which is a fact the screen
   * owed the player rather than leaving them to watch a price never arrive.
   */
  soon: (when: string) => `in ${when}`,
  /**
   * 詞 "Layer", never "rung".
   *
   * The ladder on this screen says "layer 4/9" and the sentences around it said "rung",
   * so a new player met two words for one thing on the first screen of the game. The
   * screen's word wins.
   */
  afterRungs: (n: number) => (n === 1 ? 'after the next layer' : `after ${n} more layers`),
  overRung: 'Some prices are more than this layer\'s bar can hold. They come within reach as you open more layers.',

  // 言 It ended "There is no rebirth yet", which is a note about the roadmap and not a
  // fact about the game. A player reads "yet" as a promise.
  ceiling: (n: number, gain: string) =>
    `Each 雷印 mark multiplies your power and your qi by ${gain}, for good. You hold ${n}.`,

  /**
   * 入定 Being there.
   *
   * The wording matters more than most lines in this file. It must read as something
   * gained by staying, never as something lost by leaving, because leaving costs
   * nothing and the game has to keep saying so.
   */
  deepFull: 'Fully settled. This is as deep as sitting with it goes.',
  /**
   * 氣 Why the number moves, said on the screen where it moves.
   *
   * Bruno: *"verifiquei que o qi per sec está sempre a alterar. Não faz muito sentido,
   * não deveria ser um valor fixo consoante stats?"* He is right, and the game agreed
   * with him without telling him: the **standing** rate is fixed by the layers opened
   * and what has been bought, and the only thing that moves is 入定 the sitting, which
   * climbs to ×3 over three minutes and ends after FOCUS_HOLD. The screen showed the two of
   * them multiplied together as one number and named neither.
   *
   * So the standing rate leads and the sitting rides alongside it, which is the same
   * rule every other pair of numbers in this game follows.
   */
  standing: (n: string) => `${n} standing`,
  // 入定 The sitting's own lines (how long is left, what starts the next) are in SIT below.

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
  /**
   * 渡劫 What the crossing costs, said before the tap rather than discovered after it.
   *
   * Crossing spends 雷池 the whole pool, which at the summit is the whole bar, and the
   * button said only "Cross the tribulation". A player pressed it and watched the number
   * they had spent two days filling go to nothing, with the screen silent about it. That
   * is the same fault 拆 the melt had, and this repository already decided how it ends:
   * **the trade is stated before the tap, not explained after it.**
   */
  crossPrice: (qi: string) => `It spends 雷池 the pool, ${qi} qi. The pool starts filling again at once.`,
  capped: 'Full for this realm. Climb to hold more.',
  /** 境外 At the summit there is no realm left to climb, so the room comes from crossing. */
  cappedTop: 'Full for this heaven. Cross the tribulation to hold more.',

  /**
   * 凝丹 Condensing a core out of raw qi, for a cultivator with nothing to skin.
   *
   * It only ever appears when 材 material has run out, which is the one moment it is an
   * answer rather than a fifth box. The wording has to be honest about the exchange
   * rate. It is a bad deal, and saying so is what points at 狩 Hunt.
   */
  condenseHead: 'Not enough 材 material',
  condense: 'You can force a 妖丹 out of raw qi instead. It works, and it is dear: '
    + 'this is qi that would have opened layers.',
  condensePrice: (qi: string, rungs: string) => `${qi} qi · the price of ${rungs} layers`,
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
/** 門 The head of the PC rail: the logo, and the line under it. */
export const BRAND = {
  name: 'Ninefold',
  line: 'An idle cultivation game',
};

export const MENU = {
  label: 'Menu',
  save: 'Your save',
  help: 'How to play',
  key: 'What the characters mean',
  stele: 'The stele',
  credits: 'Credits',
  cards: 'Your Enlightenment cards',
  report: 'Report a bug',
  /** 量 The two sliders in the menu, each with a mute. */
  sound: 'Sound',
  music: 'Music',
  mute: (what: string) => `Mute the ${what.toLowerCase()}`,
  unmute: (what: string) => `Turn the ${what.toLowerCase()} back on`,
  volumeOf: (what: string) => `${what} volume`,
  off: 'off',
  /** 報 The testers' Discord, where a bug gets one post in 報-bugs. A permanent invite. */
  discord: 'https://discord.gg/JFD9cTGscN',
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
  warden: 'It is as strong as a cultivator who bought every level this realm holds. '
    + 'Levels alone bring you level with it. Gear, the 道 path, your stance and your arts tip the fight.',
  gaveHead: 'What this realm opened',
  /** 來 What the realm has not handed over yet, and the layer that brings it. */
  comingHead: 'Still to come in this realm',
  comingAt: (layer: number) => `layer ${layer}`,
  comingKind: {
    beast: 'walks out',
    stance: 'a stance to fight in',
    gear: 'starts dropping',
    warden: 'stands at the end',
  } as const,
  /** 階 What the climb asks for, which the screen never used to say at all. */
  paceHead: 'What the climb costs from here',
  paceRung: 'this layer',
  paceRealm: 'the nine of them',
  paceNext: (han: string, name: string, times: string) =>
    `${han} ${name} asks for about ${times} times this realm.`,
  paceAt: (time: string) => `about ${time} at the rate you gather at now`,
  paceNote: 'Counted at your standing rate, so 入定 sitting with it gets you there sooner. '
    + 'Every level and every layer makes the rate higher, so the real wait is shorter '
    + 'than the number above.',
  nextHead: 'What the next one is worth',
  opens: (list: string) => `Opens ${list}.`,
  opensNothing: 'Opens no new system. It is the top of the climb.',
  back: 'Back',
};

export const PACE = {
  rungLeft: (qi: string, time: string) => `${qi} qi to go · about ${time}`,
  /** 守 The ninth rung is the warden, not qi: no countdown to it, only who stands there. */
  wardenWaits: (han: string, name: string) => `No more qi to climb here. The warden ${han} ${name} is waiting for you`,
  breakOpen: 'No more qi to climb here, and the warden is down. 突破 Break through when you are ready',
  /** 囊 The first rung waits for the first purchase, and the qi it waits with is owed. */
  held: 'The first layer waits until you spend your qi. Nothing is lost while it waits',
};

export const LADDER = {
  /** 短 Two short sentences where there was one long one. It is the first thing a new
   *  cultivator reads, and 境 and 層 beside it answer for themselves. */
  rule: (han: string, name: string) =>
    `Your qi fills the bar, and a full bar opens a layer. At layer 9 the warden of ${han} ${name} comes out.`,
  ruleAfter: 'Beat it and the next realm opens. Your qi comes with you.',
  /** Written on the row itself. Two rows of dashes with nothing naming them is a
   *  diagram of something, and the player is left to guess what. */
  /** 註 The character is drawn by the widget as a tappable 註 Term, so these carry the
   *  words alone. See ui/Ladder.tsx. */
  realms: (n: number, of: number) => `realm ${n}/${of}`,
  layers: (n: number, of: number) => `layer ${n}/${of}`,
};

/**
 * 碑 The stele.
 *
 * It says what was done and never what it is worth, because the deeds are worth nothing
 * and the page has to say so out loud, or a player will spend a week hunting one on
 * the assumption that it pays.
 */
export const CHRONICLE = {
  title: 'The stele',
  standing: (day: number, realm: string) => `Day ${day} of the climb, standing in ${realm}.`,
  nearest: (han: string, name: string) => `Nearest: ${han} ${name} ·`,
  figures: 'Where you have got to',
  day: 'day', realm: 'realm',
  realmNamed: (name: string) => `realm · ${name}`,
  rungs: 'layers opened', power: 'power', rate: 'gathering',
  kills: 'beasts killed', seen: 'beasts met', mastered: '通 mastered', wardens: 'wardens down',
  floor: 'best floor', seals: '塔印 seals', pills: 'alchemy pills brewed', refine: 'deepest refine',
  dao: '道 Path points spent', marks: '雷印 marks', met: 'people met in meetings',
  rule: 'A deed pays nothing at all. It is a record of what this cultivator did, and the record is the reward.',
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
  /**
   * 吸 What every floor pays in qi: a fixed sum read off the floor, and the same for everyone
   * whenever it falls (rekaris and speculaether, 2026-10-05). `bonus` is the Celestial
   * Master's share when that class is worn, as "150%".
   */
  fixed: (bonus?: string) =>
    `Every floor pays a fixed sum of qi. It is the same for everyone, whenever the floor falls: what you wear, how fast you gather and your realm never change it${bonus ? `. As Celestial Master you are paid ${bonus} more` : ''}.`,
  /**
   * 吸 What this floor's qi is worth to you today, in your own time, and how the sums climb.
   * The time is only a reading: it shrinks as you grow, and the sum does not.
   */
  rises: (span: string, summit: number, most: string) =>
    `Today that is ${span} of your gathering. Each floor above this one pays more, up to floor ${summit}. From there every floor pays ${most} qi.`,
  /**
   * 吸 The same, on a floor that pays only the least: every floor up to `until` pays it, so
   * the floors swept the day the tower opens are worth opening it for.
   */
  least: (span: string, until: number, summit: number, most: string) =>
    `Today that is ${span} of your gathering. Every floor up to ${until} pays this much, and each floor above that pays more, up to floor ${summit}. From there every floor pays ${most} qi.`,
  /**
   * 塔 Past the Dragon's floor (rekaris, 2026-10-05: "The Tower difficulty needs to be
   * higher"). `pct` is TOWER_PAST_DRAGON as "4%", `dragon` the Dragon's floor.
   */
  pastDragon: (pct: string, dragon: number) =>
    `Past floor ${dragon}, the Dragon's, each floor is a step ${pct} steeper than below it, and pays ${pct} more material for it.`,
  /** 吸 The same, standing at or above the summit floor, where every floor pays the most. */
  summit: (span: string, summit: number) =>
    `Today that is ${span} of your gathering. From floor ${summit} up every floor pays this much, and no floor pays more.`,
  /** 吸 What a floor far below pays, where a count of seconds would read as a glitch. */
  little: 'less than a minute',
  /**
   * 攜 The pills and sigils carried, and whether they go up the tower (2026-10-05). The
   * climber chooses, because every floor won spends what took part in it.
   */
  kitOn: (names: string) => `Carried up the tower with you: ${names}. A won floor spends whichever took part; a lost one keeps both.`,
  kitOff: (names: string) => `Carried: ${names}. Left below unless you choose Take up.`,
  kitSwitch: 'Take what you carry up the tower',
  kitLeave: 'Leave',
  kitTake: 'Take up',
  kitNone: 'Carried: nothing yet. Pills and sigils can go up the tower too: carry one from 業 Crafts.',

  /** 塔 The tower before its realm, under 擂台 the Platform that opens the screen. */
  towerShut: (han: string, name: string) =>
    `The tower opens at ${han} ${name}: one floor, one beast, no top, and every floor pays.`,
  furnaceHead: '爐 The Furnace',
  furnaceShut: (han: string, name: string) =>
    `The furnace opens at ${han} ${name}. It turns qi and 材 material into pills that make you stronger for good.`,
  furnace: 'Pills cost qi and 材 material together. What you brew is yours for good, and nothing here has a cap.',
  held: (n: number) => (n === 1 ? '1 taken' : `${n} taken`),
  needMaterial: 'You need more 材 material. The tower pays it.',
  /** 爐 The other half, which only the material half used to say. */
  needQi: 'A price in red is more qi than you hold. Qi gathers on its own, so these come back within reach.',
  rule: 'No pill makes qi come faster. That is the one thing the furnace will not sell.',
};

/**
 * 示 The line that tells a stuck player why they are stuck.
 *
 * Every one of these names the thing to do and where to do it. None of them explains the
 * design, and none of them says "you should". The game states the fact and the player
 * decides.
 */
export const ADVICE = {
  /**
   * 道 The one thing in the game that costs nothing and is always an improvement.
   *
   * Measured: on **100% of visits where a cultivator held unspent points**, 示 the line
   * pointed somewhere else, every time at 狩 the hunt. A player can be carrying twelve
   * of them, which is most of a branch, while the game tells them to go and tap a bat.
   * Bruno was carrying eleven. So this goes first, before everything, and it goes away
   * the moment they are spent.
   */
  /**
   * 悟道 Above even the points, because a card is the one thing the climb will not hand
   * over later. The offer waits for ever and nothing else moves until it is taken.
   */
  awaken: 'A breakthrough owes you a 悟道. Three cards, and taking one closes the other two.',
  /** 秘境 A door standing open. It waits, so this is a reminder and not a deadline. */
  doorOpen: 'The door to 秘境 is open, in 狩 Hunt. It waits for you.',
  /** 洞天 A ripe bed is free, it is one tap, and it is gone the moment it is taken. */
  ripe: (n: number) => n === 1
    ? 'A bed in 洞天 the cave is ripe. Take it, and put something else in.'
    : `${n} beds in 洞天 the cave are ripe. Take them, and put something else in.`,
  freePoints: (n: number) =>
    `You have ${n} 道 ${n === 1 ? 'point' : 'points'} unspent. They cost nothing and they never expire, `
    + `and every one of them is a permanent upgrade sitting in 道 the Path.`,
  /**
   * 煉器 The uncapped sink, named when material is piling up with nowhere else to go.
   * Before this moved to the second realm there was nowhere else for it to go at all.
   */
  /**
   * 數 It says how many levels the material actually buys, because "piling up" is a
   * feeling and a number is a fact. With 材 100 and a level costing 12 the old line
   * claimed material was piling up, which was not true and was the right advice anyway.
   */
  refine: (han: string, levels: number) =>
    `Your 材 will take ${han} ${levels} ${levels === 1 ? 'level' : 'levels'} further in 器 Gear. `
    + `Refining has no cap, and the levels stay with the place on your body.`,
  refineCapped: 'Your 妖丹 cores are full for this realm. Material has one place left worth putting it: 煉器 refining, in 器 Gear.',
  needMaterial: (short: number) =>
    `This warden will not fall without 妖丹 cores, and cores cost 材 material. `
    + `You are ${short.toLocaleString('en-GB')} short. Material comes from hunting.`,
  buyCores: (han: string) => `You can afford another ${han}. Cores are the one upgrade priced in 材 material, and a warden asks for them.`,
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
  floorWaiting: (floor: number, qi: string) =>
    `Floor ${floor} of the tower looks winnable. It pays material and ${qi} qi once, and that sum is the same for everyone.`,
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
  // 譯 The beast and the mark by name as well as by character: a line that said only
  // 山鼠 and 見 named its two subjects in a script most players cannot read.
  goHunt: (han: string, name: string, pct: number, left: number, mark: string, markName: string) =>
    `${han} ${name} is within reach at ${pct}%. ${left} more ${left === 1 ? 'kill earns' : 'kills earn'} `
    + `its ${mark} ${markName} mark.`,
  canAfford: (han: string, name: string) => `You can afford another ${han} ${name} right now.`,
  reachFor: (han: string, name: string, wants: number, mine: number) =>
    `${han} ${name} stands at 力 ${Math.round(wants * 10) / 10}. You are at 力 ${Math.round(mine * 10) / 10}. `
    + `Every level and every layer closes that.`,
  opensSoon: (han: string, name: string, realmHan: string, realmName: string, gives: string) =>
    `${han} ${name} opens at ${realmHan} ${realmName}. ${gives}`,
  theTop: 'Fill the pool and the Dragon comes. Every mark makes you heavier, and so does it.',
};

/**
 * 釋 The key: what every character on the screen means.
 *
 * The characters are what 九境 looks like, and taking them off would leave a spreadsheet
 * about numbers going up. So they stay, and none of them is ever the only place a thing
 * is named. This page is the guarantee behind that: one tap from anywhere, every symbol
 * the game uses, in English, read out of the same tables the game itself reads.
 */
export const KEY = {
  title: '釋 The key',
  blurb: 'Every character the game uses, and what it means. Nothing is ever only a character.',

  heldHead: '數 What you hold',
  heldBlurb: 'The four things you can have. Two of them tick up on their own.',
  qi: 'Gathers on its own, awake or asleep. It fills the bar and buys upgrades.',
  power: 'How hard you hit and how much you can take. Beasts are measured in it too.',
  material: 'Falls off beasts and tower floors. Qi cannot buy it and waiting cannot earn it.',
  dao: 'One for every three layers climbed, two for every warden. Spent on the tree.',

  buysHead: '買 What you can buy',
  buysBlurb: 'Four upgrades. A realm holds so many levels of each; 妖丹 runs further, because you go and kill for it.',

  marksHead: '錄 The marks on every beast',
  marksBlurb: 'Every beast you kill is counted for ever, and the count pays.',
  mark: (at: number, pays: string) => `at ${at} ${at === 1 ? 'kill' : 'kills'} · ${pays}`,
  /** 精 絕 The deep marks pay the beast that earned them, and a little of every beast. */
  deep: (at: number, material: number, drop: number, everywhere: number) =>
    `at ${at.toLocaleString('en')} kills of one beast · +${Math.round(material * 100)}% 材 material and +${Math.round(drop * 100)} points of drop chance from that beast, `
    + `and +${Number((everywhere * 100).toFixed(1))}% 材 material from every beast`,
  /** 緣 The bond, for the key and the tooltip. */
  bond: (full: number) => `Every win over a beast fills its bond. The ${full}th win leaves a piece for certain, `
    + 'a rank above the best that beast has given you, and the bond starts again.',

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
  axesBlurb: 'Eight axes. Every line but 藏 is a percentage, so an old piece stays good.',

  slotsHead: '位 The six places you wear it',
  slotsBlurb: 'One piece each. Wear several of one realm and the lineage pays on top.',

  pillsHead: '丹 The three lines of pills',
  pillsBlurb: 'Brewed in 爐 the furnace, from qi and material together. Kept for good.',

  pathsHead: '三 The three paths of the tree',
  pathsBlurb: 'Every node in 道 the tree belongs to one of them, and the colour on the node is the path.',
  meeting: 'Somebody on the road, every few hours. One choice, and walking on is always free. Nothing is taken that you did not offer.',
  week: 'A mark that moves every Monday. A beast worth double 材 material, a herb worth planting, a room of 秘境 worth reaching. It never touches the rate you gather at.',
  systemsHead: '開 The systems, and the realm that opens each',
  craftsHead: '業 The crafts',
  craftsBlurb: 'Seven crafts that level from 1 to 99 in the workshop. Three gather, four make. One task at a time, and it keeps working for twelve hours after you leave.',
  craftCap: (han: string, name: string) => `A craft. Its ninety-ninth level is called ${han} ${name}.`,
  craftRank: (at: number) => `A craft's rank from level ${at}.`,
  craftTop: (name: string) => `What level 99 of ${name} is called.`,
  workshop: 'Where the seven crafts are worked, one task at a time.',
  craftTotal: 'Your seven craft levels added up: 7 when every craft is new, 693 when all seven stand at 99. Every level in any craft adds one, so it grows with whatever you work.',
  pouch: 'Everything the workshop gathers and makes.',
  familiar: 'How many times a recipe has been made. Five marks, each one an edge on that recipe, and a recipe made 2,000 times makes its whole craft a little faster.',
  carried: 'An elixir and a sigil taken into the next warden, heart demon or vault gate. Spent only on a win.',
  seek: 'A Seeking Sigil or incense used: the next beast you beat by hand on the hunt that would have left nothing leaves a piece.',
  systemsBlurb: 'Nothing resets, so every realm hands over something that was not there before.',
  opensAt: (han: string, name: string, sooner?: string) => `opens at ${han} ${name}${sooner ? `, or at ${sooner}` : ''}`,

  doingHead: '作 Words you will meet',
  doingBlurb: 'The rest of the characters that ask you to do something.',
  breakThrough: 'Take the next realm. Only you can press it, never the clock.',
  /**
   * 註 The words a player meets in the middle of a sentence, so the sentence can stop
   * explaining itself. Every one of these was previously spelled out in prose on the
   * screen it appeared on, which is how the hunt screen reached 553 words.
   */
  melt: 'Break a piece down into qi. Worth a share of a layer of the realm it was made in.',
  drive: 'Buy many kills of a beast you already know, instead of tapping for each one.',
  condense: 'Force a 妖丹 out of raw qi when you have no 材 material left. It is dear.',
  sitting: 'Sitting with the app open deepens your gathering, up to three times, or more with 神 the Spirit branch. It ends after half an hour.',
  realmWord: 'One of the nine. Each is nine layers, and holds more of every upgrade than the last.',
  layerWord: 'One step of a realm. Your qi fills it and it opens by itself. The next one costs more.',
  full: 'This upgrade is at its cap for this realm. Climb to hold more.',
  save: 'Your save, to copy out or paste back. It lives in this browser only.',
  stele: 'Everything you have done, counted: the deeds and the figures.',
  report: 'Opens the testers\' Discord. One problem per post, with the build line from the foot of the menu.',
  back: 'What gathered while the app was shut, paid in full.',

  close: 'Back to the game',
};

/**
 * 引 The five steps of the first session.
 *
 * Each one names a thing to do, says why it is worth doing, and is finished by the
 * player doing it, never by reading. Together they are the first realm's loop said out
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
   * 指 Short, because the arrow does the pointing, and each one has a second line for
   * the stretch before it can be done at all.
   *
   * Bruno: *"as coisas ficam stuck e nao saem e devem aparecer na altura que os players
   * tiverem prestes a desbloquear esse acontecimento."* The rat was twelve minutes away
   * at the start of the game, and for twelve minutes the card asked for it anyway. The
   * `waiting` line is what the card says instead: never "you cannot do this yet" on its
   * own, always "you cannot do this yet, and here is the thing that gets you there".
   */
  buy: {
    title: 'Spend what you were given',
    text: `You start holding ${OPENING_PURSE} qi. Buy the box the arrow points at. `
      + 'Qi you spend stops filling the bar, and that trade is the whole game.',
  },
  kill: {
    title: 'Win your first fight',
    text: 'Press the rat the arrow points at. You are stronger than it already, '
      + 'the first kill of every beast pays qi, and losing never costs anything.',
    waiting: '\u5c71\u9f20 the rat is still stronger than you, and the hunt screen says by how '
      + 'much. Buy power and the gap closes.',
  },
  core: {
    title: 'Spend what the beast left',
    text: '\u6750 Material buys \u5996\u4e39 Beast Cores, the one upgrade priced in material. '
      + `+${percent(UPGRADE_NUMBERS.cores.gain - 1)} power, for good.`,
    waiting: `\u5996\u4e39 costs ${UPGRADE_NUMBERS.cores.share} \u6750 material, and material only falls off things you kill. `
      + 'Three rats pay for the first one.',
  },
  mark: {
    title: 'Kill the same beast ten times',
    text: 'Ten kills of one animal earns its \u719f Known mark. '
      + 'Every drop in the game then pays more, permanently.',
    waiting: 'Nothing in reach is worth killing yet. Buy power, and the beasts come back '
      + 'into range.',
  },
  /** 二 The second realm opens three systems at once; the guide walks one at a time. */
  chapter: (n: number, of: number) => `Realm 2 \u00b7 step ${n} of ${of}`,
  chapterNext: (n: number, of: number) => `Realm 2 \u00b7 next ${n} of ${of}`,
  wear: {
    title: 'Put on what fell',
    text: '\u5668 Gear falls off beasts from the second realm. Tap the piece in your chest to wear it.',
    waiting: 'Beasts from this realm drop gear, about one kill in five. Hunt, and the first piece goes on.',
  },
  path: {
    title: 'Take your first \u9053 node',
    text: 'Every three layers pay a \u9053 point. Open \u9053 the Path, pick a node that is lit, and learn it.',
    waiting: 'Every three layers you open pay a \u9053 point. The first one is close.',
  },
  stance: {
    title: 'Choose how you fight',
    text: '\u52e2 A stance changes every fight you take. Open \u9053 the Path, then Stance & Arts, and pick one.',
  },
  climb: {
    title: 'Beat the warden and break through',
    text: 'The realm is full and its warden is standing at the end of it. '
      + 'Beat it and \u7a81\u7834 opens.',
    waiting: 'Eight layers fill the realm, and its warden walks out at the ninth. '
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
  toReach: 'stronger',
  /**
   * 誠 How many beasts, and how many of them can be beaten now.
   *
   * It said "3 beasts within reach" on the first screen of the game, over three rows
   * that each said the beast was two to fourteen times stronger. None of them was in
   * reach. The count is every beast in the list; the second half is the honest one.
   */
  reach: (n: number, beatable: number) =>
    beatable === n ? `${n} ${n === 1 ? 'beast' : 'beasts'} to hunt`
      : `${n} ${n === 1 ? 'beast' : 'beasts'} to hunt · ${beatable} you can beat now`,
  /** 圍 The word under the drive button, which was an icon and nothing else. */
  driveTag: 'drive',
  /**
   * 完 The beasts with nothing left in them.
   *
   * Measured across a whole climb: by the ninth realm the hunt screen offered 25 beasts,
   * and 13 of them had every mark earned. Twenty-five cards, all reading 98%, half of
   * them finished, which is the exact screen this game's notes said it feared. They are
   * folded away now rather than deleted, because a beast you finished is a thing you did
   * and the record is the page that remembers it.
   */
  finished: (n: number) => (n === 1 ? '1 finished' : `${n} finished`),
  finishedWhy: 'Every mark earned. They still drop 材 material, and 圍 the drive is the way to take it without tapping.',
  showFinished: 'Show them',
  hideFinished: 'Fold them away',
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
  /**
   * 短 And then it was said twenty-five times on one screen.
   *
   * Naming the mark and what it pays was right when a row was the only place either
   * could be learned. It is not the only place any more, because the mark characters under
   * this list are 註 tappable and answer for themselves, and repeated down twenty-five rows
   * the same clause was a quarter of the words on the screen. The row keeps the count
   * and the name. What it pays is one tap away, once, instead of twenty-five times.
   */
  toward: (kills: number, at: number, name: string) =>
    (kills === 0 ? `not yet hunted · ${at} for ${name}` : `${kills} / ${at} toward ${name}`),
  mastered: 'every mark earned',
  /** 精 絕 Past 通, the two deep marks, one beast at a time. See DEEP_MARKS. */
  deepToward: (kills: number, at: number, name: string) => `${kills.toLocaleString('en')} / ${at.toLocaleString('en')} toward ${name}`,
  /** 物 What a beast leaves, said once on its row. */
  leaves: 'Leaves',
  /** 緣 The bond on the row: how far, and what the full one promises. */
  bond: (n: number, full: number, rank: string) => `${n} / ${full} · then a piece for certain, ${rank} or better`,
  /**
   * 短 Eleven words where there were seventy-one.
   *
   * The three marks each carried their own sentence here, explaining what 見, 熟 and 通
   * mean, and every one of those three is a 註 tappable character on this very screen
   * and on every row in the list. The screen was its own glossary because there was
   * nowhere smaller to put one. Now there is.
   */
  record: 'Every kill is counted, for ever, and the count pays.',
  /** 序 How the list is ordered, chosen by the player and kept on the device. */
  orderBy: 'Order the beasts by',
  order: { mark: 'Next mark', strong: 'Strongest', material: 'Most material' } as const,
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
  /** 時 The price, in the unit it is charged in: minutes of the cultivator's own gathering. */
  price: 'Each kill costs fifteen seconds of your own gathering.',
  priceOld: 'A beast from an earlier realm pays a quarter of what yours do, so each kill of it costs a quarter of that.',
  /** Under the number on each size: what it costs in qi, said as time. */
  cost: (time: string) => `qi \u00b7 ${time}`,
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
 * of it is encouragement. "This is better" is not said anywhere. The two numbers at
 * the bottom say what would happen and the player decides what better means.
 */
export const ITEM = {
  /** 拆 The single melt, on the sheet where the piece can actually be looked at. */
  salvage: 'Melt it down',

  what: 'What it gives',
  against: (name: string) => `Against the ${name} you are wearing`,
  fromSet: (set: string, n: number) => `${set} set, realm ${n}`,
  lines: (n: number) => (n === 1 ? '1 line' : `${n} lines`),
  /** \u627f The refining is the place's, so the sheet names the place, worn piece or not. */
  refined: (place: string, level: number, gain: number, per: number) =>
    `\u7149 The ${place.toLowerCase()} place on your body is refined ${level} ${level === 1 ? 'time' : 'times'}. `
    + `Every line on what you wear there is ${gain}% higher, and each refining adds another ${per}%.`,
  times: (x: number) => {
    const pct = (x - 1) * 100;
    if (Math.abs(pct) < 0.05) return 'no change';
    return `${pct > 0 ? '+' : ''}${Math.round(pct * 10) / 10}%`;
  },
  /**
   * 判 The first thing the sheet says, before any number. Bruno chose this on the 器
   * mockup: *"1, 2 e 3"*. The percentages are still there, folded, for anyone who wants
   * to check the word against them.
   */
  verdict: {
    up: 'An upgrade',
    trade: 'A trade',
    same: 'The same as yours',
    down: 'Weaker than yours',
    worn: 'What it does for you',
  } as Record<'up' | 'trade' | 'same' | 'down' | 'worn', string>,
  size: {
    none: 'no change',
    little: 'a little',
    clear: 'clearly',
    lot: 'a lot',
    huge: 'hugely',
  } as Record<'none' | 'little' | 'clear' | 'lot' | 'huge', string>,
  power: 'Power',
  qi: 'Qi',
  versus: (v: 'up' | 'trade' | 'same' | 'down', name: string | null, classGoes = false,
    fight: 'wins' | 'loses' | null = null) => {
    if (!name) return 'Nothing is worn there yet, so all of it is gain.';
    if (fight === 'wins') return `It wins the fight below more often than the ${name} you wear.`;
    if (fight === 'loses') return `It loses the fight below more often than the ${name} you wear.`;
    if (v === 'trade' && classGoes) return `Stronger than the ${name} you wear, but it changes your class.`;
    if (v === 'up') return `Better than the ${name} you wear.`;
    if (v === 'trade') return `It gains on one side and loses on the other, against the ${name} you wear.`;
    if (v === 'same') return `It does what the ${name} you wear already does.`;
    return `The ${name} you wear is better.`;
  },
  wornSays: 'Against the same place left empty.',
  /** 鎖 Keeping a piece on purpose. */
  lock: 'Lock',
  unlock: 'Unlock',
  lockedSays: 'Locked: it is never melted, never fused, and a full chest leaves it alone.',
  /** 套 Why Unlock is shut on a piece a loadout names. */
  inLoadout: (names: readonly string[]) => `In loadout ${names.join(', ')}: take it out of the loadout first. Save that loadout again without it, or forget the loadout.`,
  detail: 'Every effect, in detail',
  /** 頂 Why the 氣 line reads bigger than what it does. */
  qiCeiling: 'Qi from gear bends toward a ceiling, so this adds less than it reads.',
  rankOf: 'Its rank, of five',
  /** 戰 What the piece changes in a fight, said as odds rather than as a percentage. */
  fight: 'In a fight',
  fightAgainst: (name: string, floor?: number) => (floor !== undefined
    ? `The tower's floor ${floor}, the next one up:`
    : `Against the ${name}, the nearest fight you are not sure of:`),
  withWithout: 'without it, and with it',
  /** 源 Who left it, and where its metal comes from. */
  leftBy: (from: string | undefined, beast: string | null) => {
    if (from === 'secret') return 'Found in the secret realm.';
    if (from === 'road') return 'A gift from someone met on the road.';
    // 業 A forged piece says what it is and what it will never be.
    if (from === 'forge') return 'Forged by your own hand. It is finished: it cannot be fused, and it melts back into its metal.';
    return beast ? `Left by the ${beast}.` : null;
  },
  /**
   * 質 A piece a fusion made, in place of who left it: its quality against a usual roll of
   * its rank, and at Heaven that it will not be fused again (sim/chest.ts fusesAt).
   */
  /** 質 Every piece's quality, on its sheet: a found one rolls in a band, a fused one says so above. */
  quality: (rank: string, quality: number) =>
    `Quality ×${quality.toFixed(2)}: its main line against a usual ${rank} roll of its realm. A drop rolls ×${(1 - VARIANCE).toFixed(2)} to ×${(1 + VARIANCE + LUCK_ROLL_TOP).toFixed(2)}.`,
  fusedFrom: (rank: string, quality: number, top: number, heaven: boolean) =>
    `Made by a fusion, at ×${quality.toFixed(2)} of a usual ${rank} roll (a fusion stops at ×${top}).`
    + (heaven ? ' A fused Heaven piece is never fused again.' : ''),
  /** 解 What each line that moves a number does, in a sentence. */
  axisSays: {
    power: 'Power decides every fight. More of it, and the beasts above you fall sooner.',
    rate: 'Qi a second, while you are away too. What gear adds bends toward a ceiling that rises as you climb.',
    capacity: 'More places in the chest.',
    luck: 'Rarer gear from every drop, and better rolls on what drops. It bends, so the first of it counts the most.',
    find: `Beasts leave a piece more often, by up to ${Math.round(FIND_TOP * 100)} points and never past it. `
      + `With 造化 Creation every beast drops already, so it becomes the chance of a second piece.`,
    sunder: 'Beasts count as weaker against you. Never the Dragon of the tribulation.',
    refine: 'A fusion keeps more of its quality.',
    art: 'The arts in your sequence strike harder when they fire, and 龜息 heals more. Not against the Dragon of the tribulation.',
  } as Record<string, string>,
  wear: 'Wear it',
  swap: 'Wear it instead',
  anyway: 'Wear it anyway',
  takeOff: 'Take it off',
  close: 'Back',
};

/**
 * 悟道 The three cards at a breakthrough.
 *
 * It says what the choice costs before it says what it gives, because the cost is the
 * point: two of these three are gone for good the moment one is taken.
 */
/**
 * 相 The one question the game asks before it starts.
 *
 * It is asked once, it changes no number, and it can be answered again at any time from
 * the help sheet. The game never answers it by itself: until it is answered the screen
 * draws 影 the shape, which is nobody in particular.
 */
export const FIGURE = {
  over: 'Before the first breath',
  title: '相',
  sub: 'Who is climbing?',
  lead: 'This is the face on every screen from here to the ninth realm. It changes nothing '
    + 'about the climb and you can change it whenever you like.',
  later: 'Not yet',
  change: 'Who is climbing',
  /** 釋 What the character means, for the key and the tooltip. */
  what: 'Who you are. A face and a name, nothing the numbers read. Ask again from the help sheet at any time.',
};

export const AWAKEN = {
  over: 'A realm behind you',
  /**
   * 境外 And the same screen above the ninth realm, where what is behind you is a heaven
   * rather than a realm. It is the one sentence on the card that knows the difference,
   * because the cultivator standing in 聖人 has not been in a realm for seven weeks and
   * a card telling them they stand in 化神 would be the screen forgetting where they are.
   */
  overHeaven: 'A heaven behind you',
  sub: (han: string, name: string) => `You stand in ${han} ${name}. Something settles.`,
  lead: 'Take one of the three. The other two close, and what you take is yours for the rest of the climb.',
  take: 'Take this one',
  later: 'Decide later',
  /**
   * 改 Your cards, and trading one. rekaris, on the Discord: *"I would much rather be able
   * to change my past choices when tweaking/changing builds rather than being locked into
   * previous poor decision."*
   */
  hand: {
    title: 'Your Enlightenment cards',
    blurb: 'Every card you have taken, oldest first. Any of them can be traded for one of the other two it came with. It costs your own qi: half a day of gathering for the newest card, and half a day more for each card further back.',
    none: 'No cards yet. The first one comes with the second realm.',
    line: (n: number) => (n === 1 ? '悟道 Enlightenment · your card · change it' : `悟道 Enlightenment · your ${n} cards · change one`),
    fromRealm: (han: string, name: string) => `From ${han} ${name}`,
    fromHeaven: (han: string, name: string) => `From the heaven ${han} ${name}`,
    change: 'Change',
    keep: 'Keep it',
    cost: (days: string, qi: string) => `${days} of your qi · ${qi}`,
    trade: 'Trade for this',
    sure: (qi: string) => `Tap again to pay ${qi} qi`,
    traded: (name: string) => `${name} is yours now`,
    why: {
      qi: 'Not enough qi in the bar yet.',
      dao: 'Its 道 points are already spent in the tree. Take a node back first.',
      chest: 'Its chest places are full. Make room in the chest first.',
      card: 'That card cannot be taken here.',
    } as Record<'qi' | 'dao' | 'chest' | 'card', string>,
    close: 'Close',
  },
  /** 修 The card the home screen keeps up until the choice is made. */
  waiting: 'A 悟道 awakening is owed you. Three cards, and one of them is yours.',
  /** 釋 What the character means, for the key and the tooltip. */
  what: 'Three cards at every breakthrough and at every heaven, and you keep one. Taking it closes the other two. Seventeen choices across a climb, so no two cultivators end up the same.',
  /**
   * 數 What the card does, in numbers. rekaris, on the Discord, of 福星 Lucky Star:
   * *"Whats this supposed to do? Is it cryptic on purpose?"* This is the line that answers
   * the question, read off the player's own fortune (see sim/cardworth.ts).
   */
  effect: (e: Effect, w: Worth): string => {
    const share = (x: number) => `${Math.round(x * 100)}%`;
    if (w.kind === 'luck') return `Gear of ${RARITY_INFO[w.from].han} ${RARITY_INFO[w.from].name} rank${w.from === 'heaven' ? '' : ' or better'}: ${share(w.before)} of your drops now, ${share(w.after)} with this.`;
    if (w.kind === 'drop') return `A beast drops a piece on ${share(w.before)} of kills now, ${share(w.after)} with this.`;
    if (w.kind === 'second') return w.after === w.before ? 'A second piece is as likely as it can be already.'
      : `With 造化 Creation every kill drops a piece, and ${share(w.before)} of kills drop a second now, ${share(w.after)} with this.`;
    if (w.kind === 'chest') return w.after === w.before ? 'Your chest is capped by the tree, so this adds no room.'
      : `Your chest holds ${w.before} pieces now, ${w.after} with this.`;
    switch (e.kind) {
      case 'material': return `+${share(e.percent)} 材 material from every beast, for good.`;
      case 'salvage': return `Melting pays +${share(e.percent)}: more qi, or more 材 material once the allowance is spent.`;
      case 'refine': return `煉器 Refining costs ${share(e.percent)} less 材 material, at every level.`;
      case 'dao': return `+${e.points} 道 Path points, yours now.`;
      case 'pill': return `Every pill costs ${share(e.percent)} less 材 material.`;
      case 'tower': return `Every 塔 tower floor pays +${share(e.percent)} 材 material.`;
      default: return '';
    }
  },
};

/**
 * 緣 Somebody on the road.
 *
 * The cost is on the button that charges it and the gift is beside it, because a choice
 * whose price is hidden is a guess. The one thing left unnamed is a piece of gear: to
 * name it would be to name the roll.
 */
export const MEET = {
  costs: (what: string) => `costs ${what}`,
  something: 'something falls out of it',
  nothing: 'nothing happens',
  /** 緣 A boon on the button: what stays, in words. */
  stays: (what: string) => `stays with you: ${what}`,
  /** 歸 Somebody coming back, and what they remember. */
  remembers: (name: string, said: string) => `歸 Back from the road: ${name}. You chose “${said}”.`,
  /** 心 Somebody who only finds one kind of heart. */
  drawn: (kind: 'kind' | 'hard') => (kind === 'kind'
    ? '心 Found you because of how kindly you have walked.'
    : '心 Found you because of how hard you have walked.'),
  /**
   * 據 What an answer gave, said once it is given. rekaris (2026-10-03) fed a crow and
   * could not tell what came of it: the card just vanished.
   */
  done: {
    head: '據 What came of it',
    youChose: (label: string) => `You chose “${label}”.`,
    gave: 'It gave you',
    paid: (what: string) => `You gave ${what}.`,
    piece: (name: string, rank: string) => `${rank} ${name}, in your chest now`,
    pieceMelted: (name: string, rank: string, pays: string) =>
      `${rank} ${name}. Your chest was full and held better, so it melted into ${pays}.`,
    pieceMadeRoom: (name: string, rank: string, old: string, pays: string) =>
      `${rank} ${name}, in your chest now. It was full, so your weakest piece, the ${old}, melted into ${pays}.`,
    /** 熔 The piece that went was one no kept filter shows, so it was not always the weakest. */
    pieceMadeRoomUnkept: (name: string, rank: string, old: string, pays: string) =>
      `${rank} ${name}, in your chest now. It was full, so the ${old}, which no kept filter shows, melted into ${pays}.`,
    see: '器 See it in Gear',
    ok: 'Continue',
  },
};

/**
 * 緣 The road, on 碑 the stele: the heart, the things that stay, and everybody met.
 *
 * 心 The heart is shown as a scale and never as a score. The buttons never say which way
 * an answer leans, so a player finds out who they have been by reading this page, not by
 * aiming for a number.
 */
export const ROAD = {
  head: '緣 Meetings and the road',
  heart: '心 The heart',
  kind: '仁 Kind',
  hard: '狠 Hard',
  path: {
    kind: 'You walk the kind road. The people who find the kind have started to find you.',
    hard: 'You walk the hard road. The people who find the hard have started to find you.',
    even: 'Your heart has not settled yet. Neither road has noticed you.',
  },
  boonsHead: '留 What stayed with you',
  noBoons: 'Nothing yet. Five people on the road leave something that stays.',
  metHead: (n: number, of: number) => `遇 Everybody met · ${n} of ${of}`,
  none: 'Nobody yet. The road starts at the second realm.',
  youChose: (label: string) => `You chose “${label}”.`,
  /** 據 And for an answer that gave a piece, the stele says so: the piece itself is in the chest. */
  leftPiece: 'It left you a piece of gear.',
  toCome: (n: number) => (n === 1
    ? '歸 One of them may yet come back.'
    : `歸 ${n} of them may yet come back.`),
  older: 'Met before the road kept answers.',
  all: (n: number) => `Show all ${n}`,
  fewer: 'Show only the latest',
};

/**
 * 洞天 The cave, which is the only thing in the game that grows while the app is shut.
 *
 * The copy says what it costs and what it pays in the two currencies a player already
 * holds, and it says out loud that nothing is lost by being late, because that is the
 * promise that makes a twelve-hour herb a decision instead of a risk.
 */
/**
 * 期 The week, and the three marks it leaves on three screens.
 *
 * 譯 Each of them leads with a character and says the English beside it, because no
 * character is ever the only place a thing is named. They all say how long is left,
 * because a mark that expires and does not say when is a mark a player learns to
 * distrust.
 *
 * And every one of them says what it pays in the unit the screen it stands on already
 * uses: material on 狩 the hunt, qi in 洞天 the cave, a door in 秘境 the vault.
 */
export const WEEK = {
  /** The banner at the top of 狩 the hunt. */
  quarryHead: '本週之獸 The week\u2019s quarry',
  quarry: (name: string) => `${name}, worth double 材 material all week.`,
  /** 首 The once-a-week qi, while it is still owed. */
  bounty: (qi: string) => `first kill pays ${qi} qi`,
  bountyTaken: 'the week\u2019s qi is taken',
  /** How long is left, where the sentence around it has already named the week. */
  left: (when: string) => `${when} left`,
  /**
   * 譯 And the same countdown on the chip, which names the week itself.
   *
   * The chip is one character and a time, and 譯 the harness was right to fail it: on 狩
   * a hunt row, 期 with "6d 12h left" beside it is a character with no English anywhere
   * near it. Every other place the mark appears sits inside a card that has already said
   * the word, and this one does not, so it says it.
   */
  tagLeft: (when: string) => `${when} left of the week`,
  /** The tag on the quarry\u2019s own row, and on the herb, and on the door. */
  tag: '期',
  /** 草 The mark in the cave. */
  season: (name: string) => `${name} is in season: a bed of it pays half again.`,
  /** 室 The mark in the vault. */
  blessed: (n: number, of: number) => `Room ${n} of ${of} pays double this week.`,
  /**
   * 示 The line the advice gives when the week is pointing at something worth doing. The
   * qi is a fixed sum read off the realm (2026-10-05): what is worn for the kill never moves it.
   */
  advise: (name: string, qi: string) => `${name} is this week\u2019s quarry: double material, and the first kill pays ${qi} qi, a fixed sum for your realm and the same for everyone in it.`,
};

export const CAVE = {
  head: '洞天 The cave',
  says: 'Three beds. 材 Material goes into the ground and comes up as 氣 qi, on its own, while the app is shut.',
  empty: 'Nothing planted',
  plant: 'Plant something',
  close: 'Not now',
  take: (qi: string) => `Take it · ${qi} qi`,
  ripeIn: (left: string) => `Ripe in ${left}`,
  after: (hours: number) => `after ${hours}h`,
  /**
   * 明 What a bed is going to be worth, said before the material is spent.
   *
   * Bruno: *"a farming também devia ser mais coerente e perceber o tipo de ganhos"*. The
   * screen asked for material, named an hour count, and then said nothing at all about
   * what came back until the bed was ripe, which makes the one decision the cave exists
   * for (short herb often against long herb overnight) a decision made blind.
   *
   * So a seed says three things now: what it costs, what it pays, and what that is an
   * hour. The rate is the one that settles it, because the whole design of the beds is
   * that the longer herb is the better rate and the shorter one only wins if you are
   * really coming back.
   */
  yields: (qi: string) => `ripens into ${qi} qi`,
  perHour: (qi: string) => `${qi} an hour`,
  worth: (qi: string) => `${qi} qi`,
  /**
   * 時 And when the value is settled, which is not when it is planted.
   *
   * A bed pays in minutes of the planter's own standing gathering, read at the moment
   * it is taken. A breakthrough while it grows makes it worth more, and nothing makes
   * it worth less. Saying so turns a number that seems to wobble into a rule.
   */
  settles: 'A bed pays at the rate you gather at when you take it, so a breakthrough while it grows makes it worth more. The season it was sown in stays with it.',
  law: 'A ripe bed waits for you for ever. Nothing here rots and nothing is lost by being late.',
  /** 釋 What the character means, for the key and the tooltip. */
  what: 'Three beds you own. Plant 材 material and it ripens into qi over real hours. A ripe bed waits for you for ever. The only thing a long wait costs is the bed it stands in.',
};

/**
 * 秘境 The run with a beginning and an end.
 *
 * The copy's one job is saying out loud that nothing is carried. A player who thinks
 * they are holding a run's worth of loot plays it as though they are, and the whole
 * point of banking every room on the spot is that there is nothing to lose.
 */
export const SECRET = {
  /**
   * 泉 The spring, said above the doors of a room: what it holds and what this room's
   * share of it is, in the unit that means something, your own time.
   */
  springFirst: (filled: string, full: boolean, holds: string, room: string) =>
    `Filled for ${filled}${full ? ', the most it holds' : ' of the day it can hold'}: ${holds} of your gathering across the rooms, more in the deeper ones. This room: ${room}.`,
  springLeft: (holds: string, room: string) =>
    `The spring holds ${holds} of your gathering for the rooms still ahead, more in the deeper ones. This room: ${room}.`,
  springEmpty: 'The spring is dry: it fills again while the door is shut, a day at most. Every door here still opens.',
  /** 泉 On the card outside the door. */
  springDoor: (holds: string, full: boolean) =>
    `The spring holds ${holds} of your gathering${full ? ', the most it can' : ' and fills while the door is shut'}.`,
  /** The short word on each door, so the three ways read as now, later, or something else. */
  tags: { spring: 'Now', incense: 'Later', shrine: 'Path', brazier: 'Gear', box: 'Workshop', trail: 'Platform' } as Record<string, string>,
  drink: (qi: string, span: string) => `+${qi} qi \u00b7 ${span} of your gathering`,
  burn: (pct: string, span: string, qi: string) => `+${pct} gathering for ${span} \u00b7 ${qi} qi in all`,
  /** 香 Why a room offers no incense: the burner holds a day at most, so nothing is wasted. */
  burnerFull: (left: string) => `香 The burner is full (${left} of incense waiting), so this room offers none. Nothing is wasted.`,
  boxHolds: (bits: string) => bits,
  boxEmpty: 'Nothing the workshop can keep: the pouch is full of it.',
  trailSays: 'One trail at a time, spent by the next challenger you beat.',
  /** 龕 A shrine's and a brazier's line: what the third door gives, and that the room is spent for it. */
  shrineGives: (n: number) => `+${n} 道 \u00b7 the room is spent`,
  brazierGives: 'a piece of gear \u00b7 the room is spent',
  /** 鑰 The key under a shut door, and why one held may have to wait for tomorrow. */
  useKey: (n: number) => `Use a Realm Key to open it now (${n} held, one a day)`,
  keyTomorrow: 'A Realm Key has opened the door today already. The next one works tomorrow.',
  head: 'The secret realm',
  ready: (rooms: number) => `The door is open. ${rooms} rooms, and every other one is a gate.`,
  shut: (left: string) => `The door opens again in ${left}. It will wait for you.`,
  over: (n: number, of: number) => `Room ${n} of ${of}`,
  /**
   * 誠 It says which realm the guardian is from, because the first gate is your own and
   * the last two are the realm above. Saying "a realm above you" at every gate was a
   * sentence the screen could not back up, and the first one it said it at was wrong.
   */
  beast: (power: string, pct: number, above: boolean) =>
    `力 ${power}, ${above ? 'a realm above you' : 'the strongest thing this realm has'}. ${pct}% to put it down.`,
  apiece: 'a piece of gear',
  law: 'Take one and the room is spent. Everything you take is yours the moment you take it, and the rooms you do not reach stay in the spring for next time. A beast that puts you down ends the run and takes nothing back.',
  out: 'Walk out and keep everything',
  /**
   * 記 The running total, on the screen while the run is still being walked.
   *
   * Bruno walked all seven rooms and came out to nothing he could point at: *"no fim
   * mostrar o loot e ganhos totais"*. The qi went into a bar that was already moving
   * and the 道 point into a badge on a tab, so a run that paid four times over read as
   * a run that paid nothing. It is counted from the first room rather than only at the
   * end, because the question a walker is answering at every gate is whether what they
   * are holding is worth the next one.
   */
  sofar: 'Taken so far',
  nothing: 'Nothing yet',
  /** 出 The end of a run, which is three different endings and says which. */
  endWalked: 'You walked out',
  endDone: 'You walked the whole thing',
  endBeaten: 'A guardian put you down',
  endBeatenSays: 'The run ends here. Everything below was banked the moment you took it, and none of it goes back.',
  endSays: 'Every room was paid the moment you took it. The spring starts filling again now, a day at most.',
  /** 記 Where each of a run's takings came from, by room. */
  roomsList: (steps: readonly number[]) => {
    const n = steps.map((x) => x + 1);
    if (n.length === 1) return `room ${n[0]}`;
    return `rooms ${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
  },
  tallyDrunk: (rooms: string) => `qi, drunk from the spring in ${rooms}`,
  tallyBurn: (span: string, rooms: string) => `香 incense on your gathering for ${span}, burned in ${rooms}. It burns while you are away.`,
  tallyBox: (rest: string, rooms: string) => `${rest} from ${rooms}, in the workshop\u2019s pouch`,
  tallyTrail: '跡 a challenger\u2019s trail: the next one on 擂台 the Platform begins a tenth down.',
  tallyRooms: (n: number, of: number) => `${n} of ${of} rooms`,
  tallyGates: (n: number) => `${n} ${n === 1 ? 'guardian' : 'guardians'} put down`,
  tallyQi: 'qi',
  tallyDao: '道 points',
  tallyGear: (n: number) => (n === 1 ? '1 piece of gear' : `${n} pieces of gear`),
  tallyNone: 'This run gave you nothing. The gate at room one is beaten with power, not with patience.',
  again: (left: string) => `The door opens again in ${left}.`,
  back: 'Back',
  /** 釋 What the character means, for the key and the tooltip. */
  // 數 It said "seven rooms", and the door at the summit says eleven. The count grows
  // with the realm, so the sentence does not name one.
  what: 'A row of rooms. Every other room is a gate: one strong beast, and you beat it to go on. The rooms between share the spring, which fills while the door is shut: drink your share now, burn it as incense for more later, or spend it on the third door. Nothing is carried, so a beast that puts you down ends the run and takes nothing back.',
  /** 釋 The vault's own words, for the key and the tooltip. */
  springWhat: 'The vault\u2019s spring fills while its door is shut, four minutes of your gathering an hour and a day at most. The rooms share it, the deeper ones more.',
  incenseWhat: 'A room\u2019s share of the spring, burned slowly: half as much again, as +30% to your standing gathering while it burns, open or shut. One burner; the next stick waits behind.',
  boxWhat: 'A craftsman\u2019s box: herbs and ore of your realm for the workshop, from a room of the vault. No experience comes with it.',
  trailWhat: 'A challenger\u2019s trail, found in the vault: the next challenger on 擂台 the Platform begins its fight a tenth down.',
};

/**
 * 香 Incense from the vault, said on 修 beside 入定 the sitting: what it adds and how long
 * it has left. It is the first thing in the game that moves the rate for a while, so the
 * screen says for how long, every moment it burns.
 */
export const INCENSE = {
  chip: (pct: string) => `+${pct}`,
  now: (rate: string) => `${rate} qi / s now (香 included)`,
  line: (pct: string, left: string) => `Incense +${pct} \u00b7 ${left} left`,
  says: 'From the secret realm. It burns on while you are away, and the next stick you light waits behind this one.',
};

/**
 * 擂台 The Platform: three challengers a week, on 塔 Trials under the tower, and the
 * arena's word on each fight. Every line that could be read as a cost says that a loss
 * costs nothing, and the card and the verdict both say the dice are set for the week.
 */
export const PLATFORM = {
  head: 'The Platform',
  period: (left: string) => `Three challengers this week \u00b7 new ones in ${left}, or when you break through`,
  allDown: (left: string) => `All three are down this week. New ones come in ${left}, or when you break through.`,
  /** 性 The week's temper, and what it does unanswered. */
  temper: (says: string, edge: string) => `this week: it stands \u00d7${edge} again against anybody ${says}.`,
  temperSays: {
    armoured: 'who cannot break its shell',
    nimble: 'it can outpace',
    mending: 'who lets it heal',
    frenzied: 'who cannot weather it',
  } as Record<string, string>,
  answeredBy: (list: string) => `Answered by ${list}.`,
  youAnswer: 'You answer it as you stand.',
  ordinal: ['First', 'Second', 'Third'] as const,
  edge: (x: string) => `\u00d7${x} your power`,
  beaten: 'beaten this week',
  paid: (qi: string) => `${qi} paid`,
  pays: (qi: string) => `pays ${qi} qi`,
  /**
   * 吸 What every challenger pays: a fixed sum read off the realm, the same for everyone in
   * it whenever it falls (rekaris, 2026-10-05), as the tower's floors are (TRIALS.fixed).
   * `bonus` is 金剛 the Vajra's share when that class is worn, as "50%".
   */
  fixed: (realm: string, bonus?: string) =>
    `Each challenger pays a fixed sum of qi read off your realm, ${realm}. It is the same for everyone in the realm, whenever it falls: what you wear and how fast you gather never change it${bonus ? `. As 金剛 Vajra you are paid ${bonus} more` : ''}.`,
  /** 吸 What the one standing is worth today, in the cultivator's own time: only a reading. */
  today: (span: string) => `Today the one standing is worth ${span} of your gathering.`,
  waits: 'comes up when the one before it falls',
  waitsShort: 'waits',
  standsAt: (power: string) => `力 ${power}`,
  inStance: (name: string) => `in ${name}`,
  asYouStand: (pct: string) => `${pct} as you stand`,
  odds: 'odds',
  toReach: 'to reach',
  standIn: (name: string) => `Stand in ${name}`,
  challenge: 'Challenge',
  trail: '跡 You hold a trail from the vault: this challenger begins a tenth down.',
  law: 'Losing costs nothing, and it waits for you all week. The dice are set for the week: the same body meets the same fight, so change your stance, your arts or what you carry and it is a new one. Never on Auto, never driven.',
  /** 鬥 The arena's word on a challenger. */
  who: (ordinal: string) => `${ordinal} challenger`,
  won: (ordinal: string) => `The ${ordinal.toLowerCase()} challenger steps down from the platform.`,
  lost: 'It holds the platform. Losing costs nothing, and it will be there all week.',
  /** 吸 Beside a win's qi: where the sum came from, so it never reads as a share of the rate. */
  fixedChip: 'fixed for your realm',
  count: (n: number) => `${['None', 'One', 'Two', 'Three'][n] ?? n} of three this week`,
  next: (ordinal: string, name: string, edge: string, qi: string) =>
    `The ${ordinal.toLowerCase()}, ${name}, stands at \u00d7${edge} your power and pays ${qi} qi. It waits until the week turns.`,
  done: 'All three are down. New ones come when the week turns, or when you break through.',
  dice: 'The dice are set for the week: pressing again with nothing changed is the same fight. Change your stance, your arts or what you carry, and it is a new one.',
  nextButton: (ordinal: string) => `The ${ordinal.toLowerCase()}`,
  answeredLine: (temper: string, by: string) => `${temper}, answered by ${by}.`,
  unansweredLine: (temper: string) => `${temper}, unanswered: it stood \u00d71.3 again.`,
  what: 'The Platform, on 塔 Trials from the fourth realm: three challengers a week, measured against your own power. A win pays a fixed sum of qi read off your realm, the same for everyone in it, once each a week; a loss costs nothing. The dice are set for the week, so the way past a loss is to change something.',
  temperWhat: 'The week\u2019s temper on 擂台 the Platform: unanswered, a challenger stands \u00d71.3 again. A stance or one art in your sequence answers it.',
};

export const GEAR = {
  /**
   * 總 The two numbers at the top of the screen.
   *
   * It used to be seven chips adding the lines up, and the 氣 one read +333.9% on a body
   * whose gear lifted qi by a fifth. These say what the sim does with everything worn.
   */
  powerFrom: 'Power from your gear',
  qiFrom: 'Qi from your gear',
  powerSays: (x: number) => (x >= 1.95
    ? `You hit about ${Math.round(x)} times as hard.`
    : `You hit ${Math.round((x - 1) * 100)}% harder.`),
  qiSays: 'Qi from gear has a ceiling, and it rises as you climb. Power has none.',
  nothingWorn: 'Nothing worn yet. Beasts drop gear, and what you wear makes you hit harder.',
  otherEffects: 'Other effects of your gear',
  /** 譯 The rest of the axes, each with its English beside it. */
  other: {
    luck: 'Rarer drops',
    find: 'Beasts drop more often',
    sunder: 'Beasts are weaker',
    capacity: 'Chest places',
    refine: 'Fusion quality',
    art: 'Arts strike harder',
  } as Record<string, string>,
  /** 拾 A drop chance is added in points, so it reads as points. */
  points: (x: number) => `+${Math.round(x * 10) / 10} pts`,
  /**
   * 彎 What the pieces add up to, beside what it does. A tester read ×1.35 under a body
   * whose pieces said +200% and could not tell which was true (2026-10-04). Both are:
   * the sum goes in, the bend comes out, and the line under them says so.
   */
  sum: (x: number) => `+${Math.round(x)}%`,
  bends: (top: number) => `On the left, what your pieces add up to. On the right, what it does: these lines bend, so each % adds a little less than the one before. The qi bend moves up with every layer you open, so each realm's own pieces still count, and an old body slowly reads a little less. Drop chance is added in points, never past ${top}. Power never bends.`,
  /**
   * 註 What a line's character says when it is tapped, on 器 and in 釋 the key. rekaris, on
   * the Discord (2026-10-04), asked what each line does and where it stops, and was told the
   * note would say. So each note is the same four things in the same order: what the line
   * does, its cap where it has one, how it bends said by example, and then the formula, set
   * apart in the note's last line for whoever wants it. The examples are worked out by the
   * sim's own bends (glossary.ts), and the formulas print balance.ts, never a copy of it.
   */
  line: {
    power: () => 'Power decides every fight. More of it, and the beasts above you fall sooner.\n'
      + 'It has no cap and it never bends: every % counts in full.',
    rate: (first: string, top: string, small: string, big: string) => 'Qi a second, while you are away too.\n'
      + `Gear and the 道 Path tree together bend toward a ceiling of ${first} on the first layer, rising to ${top} at the summit. `
      + `The bend moves up as you climb, so each realm's own pieces still count: in the fifth realm +100% gives ${small}, +300% ${big}.`,
    luck: (small: string, big: string) => 'Rarer gear from every drop, and better rolls on what drops.\n'
      + `No cap, but it bends: +100% gives ${small}, +300% only ${big}.`,
    find: (top: number, base: string, pts: string, after: string) =>
      'How often a beast leaves a piece. It is added in points to the beast\u2019s own chance.\n'
      + `Never past ${top} points. +100% on your pieces is ${pts} points: a beast\u2019s ${base} becomes ${after}.\n`
      + 'With 造化 Creation every beast drops already, so it is the chance of a second piece.',
    sunder: (small: string, big: string) => 'Beasts count as weaker against you. Never the Dragon of the tribulation.\n'
      + `No cap, but it bends hard: +100% takes ${small} off a beast, +300% only ${big}.`,
    art: (small: string, big: string) => 'Your arts strike harder when they fire, and 龜息 Turtle Breath heals more.\n'
      + `No cap, but it bends: +100% gives ${small}, +300% only ${big}. Never against the Dragon.`,
    refine: (top: number, small: string, big: string) => 'A fusion keeps more of the quality of the three pieces it eats.\n'
      + `It bends: +100% gives ${small}, +300% only ${big}, with no cap of its own. `
      + `It multiplies the average quality of the three pieces, and the piece made stops at ×${top} its rank\u2019s usual roll, `
      + `so a line past ×${top} still lifts three low rolls up to that ceiling.`,
    capacity: () => 'More places in the chest. A flat count, added in full.',
  },
  /** 式 The formula under each note. s is what the pieces add up to, the left column. */
  math: {
    power: 'power × (1 + s/100)',
    rate: `qi × (T + (R − T) × g / (k + g)), g = s/100, T the tree's own lift, k = ${trim(QI_KNEE_FIRST)} × ${trim(QI_KNEE_GROWTH)}^(layers/9), R = ${trim(QI_ROOF_FIRST)} + ${trim(QI_ROOF_TOP - QI_ROOF_FIRST)} × layers/80`,
    luck: `rare odds × (1 + ${trim(LUCK_BEND)} · ln(1 + s/100))`,
    find: `chance + ${trim(FIND_TOP * 100)} × (1 − 1 / (1 + s/100)) points`,
    sunder: `beast × 1 / (1 + ${trim(SUNDER_BEND)} · ln(1 + s/100))`,
    art: `art × (1 + ${trim(ART_BEND)} · ln(1 + s/100))`,
    refine: `quality × (1 + ${trim(FUSE_BEND)} · ln(1 + s/100)), at most ×${trim(FUSE_TOP)}`,
    capacity: 'chest + s',
  } as Record<string, string>,
  /** 拾 The player's own drop chance, said on 器 under the note's worked example. */
  findYours: (pts: string, beast: string, before: string, after: string) =>
    `Yours: +${pts} points, so the ${beast}\u2019s ${before} becomes ${after}.`,
  /** 式 How the formula line is introduced, so it reads as optional. */
  mathHead: 'The formula, s being your pieces\u2019 total in %:',
  /** 篩 The chest's filters. */
  all: 'All',
  betterOnly: 'Better',
  /** ▲ What the mark on a tile means, said once under the grid. */
  legend: 'better than what you wear in that place, and at least as good on every line it has. Shown first.',
  /**
   * 拆 Melting gear down.
   *
   * The bulk button has to state its own size before it is pressed, because there is no
   * undo and a player who taps it expecting one piece and loses thirty will not tap it
   * again. So the count and the qi are *on the button*, not near it.
   */
  upTo: (rank: string) => `${rank} and below`,
  salvage: (n: number) => (n === 1 ? 'Melt 1 piece' : `Melt ${n} pieces`),
  /**
   * 買 What the qi does the moment it arrives, said before the tap.
   *
   * The ladder takes qi as soon as it can afford a rung, so a melt worth more than the
   * rung you are standing on makes the big number *fall*. That is the climb happening,
   * not a loss, and it has to be on the button rather than left to be worked out.
   */
  opens: (n: number) => (n === 1 ? 'opens 1 layer straight away' : `opens ${n} layers straight away`),
  banks: 'goes into the bar',
  melting: 'Gear you will not wear is qi you have not collected.',
  /** 拆 The melting allowance, said where it bites. See MELT_FILL. */
  /** 套 Loadouts: whole bodies of gear, remembered and put back on in one tap. */
  loadoutHead: '套 Loadouts',
  loadouts: 'Save what you wear and put it all back on in one tap. Saving locks the pieces, so nothing melts them.',
  loadoutSave: 'Save what you wear',
  loadoutSaveShort: 'Save',
  loadoutWorn: 'Wearing it',
  loadoutPieces: (n: number) => (n === 1 ? '1 piece · tap to wear' : `${n} pieces · tap to wear`),
  loadoutWear: (name: string) => `Wear ${name}`,
  loadoutOn: (name: string) => `${name}, worn now`,
  loadoutResave: (name: string) => `Save what you wear as ${name}`,
  loadoutForget: (name: string) => `Forget ${name}`,
  loadoutRename: (name: string) => `Rename ${name}`,
  loadoutNameField: 'Loadout name',
  loadoutDefault: (n: number) => `Loadout ${n}`,
  setMissing: (n: number) => (n === 1 ? '1 piece of that loadout is gone' : `${n} pieces of that loadout are gone`),
  /**
   * 套 A loadout given a task (speculaether and rekaris, on the Discord): the game reads it
   * for that task and leaves what is worn on the body.
   */
  tasksSay: 'Give a loadout a task and the game reads it for that task, without changing what you wear.',
  taskName: { fuse: 'Fuse', melt: 'Melt', refine: 'Refine' } as Record<'fuse' | 'melt' | 'refine', string>,
  taskHan: { fuse: '煉', melt: '拆', refine: '煉器' } as Record<'fuse' | 'melt' | 'refine', string>,
  taskGive: (name: string, task: string) => `Use ${name} for ${task}`,
  taskTake: (name: string, task: string) => `${name} is used for ${task}. Tap to use what you wear instead`,
  taskVerb: { fuse: 'fusing', melt: 'melting', refine: 'refining' } as Record<'fuse' | 'melt' | 'refine', string>,
  /** 套 On the control itself: which body its numbers come from. */
  taskFuse: (name: string) => `Fusing reads loadout ${name}: its 煉 fusion line, not what you wear.`,
  taskMelt: (name: string) => `Melting reads loadout ${name}: its class, not what you wear.`,
  taskRefine: (name: string) => `Refining reads loadout ${name}: its class sets the price, not what you wear.`,
  /** 質 A tile's quality, said once under the chest and in each tile's own note. */
  qualityNote: 'quality: how its main line compares with a usual roll of its rank',
  qualityLegend: 'on a tile is its quality: how its main line compares with a usual roll of its rank. '
    + `A drop rolls ×${(1 - VARIANCE).toFixed(2)} to ×${(1 + VARIANCE + LUCK_ROLL_TOP).toFixed(2)}; a fusion can make more.`,
  lockedWord: 'locked',
  anySchool: 'Any school',
  allowance: (qi: string) => `Melting can pay ${qi} more qi right now, and the rest melts into 材 material. `
    + 'It refills as you gather, open or shut.',
  /** The rest of it, for the player who wants it, behind a tap rather than in the way. */
  meltingWhy: 'A piece is worth a share of a layer of the realm it was made in. Old junk stays old junk.',

  /** The whole sentence, for 文 the prose check. The screen builds it from the two halves
   *  around a tappable character. */
  best: (han: string, name: string) => `Your best piece is ${han} ${name} rank, and the ring round your portrait shows it.`,
  bestLead: 'Your best piece is',
  bestTail: 'rank, and the ring round your portrait shows it.',
  fuse: '煉 Fuse: three make one',
  empty: 'Empty. Beasts drop gear, and wardens always do.',
  howTo: 'Tap a piece to see what it would do. Tap a worn one to take it off.',
  drops: (realm: number) => `Beasts here drop gear up to realm ${realm}.`,
  better: 'Worth more than what you are wearing',
  sets: 'Wear pieces of one realm together and the set pays you extra.',

  /**
   * 煉器 Refining. It has to say three things: what it costs, that it has no top, and
   * that the levels belong to the place on the body rather than to the piece, because
   * choosing which place to pour a run's material into is the decision, and a decision
   * you did not know you were making is not one. 承 Since 2026-10-06 that is all there is
   * to it: no trade between two pieces to explain, and nothing a melt can take.
   */
  refineHead: '煉器 Refine',
  refine: 'Material makes what you wear better, with no top level. The levels belong to the '
    + 'place on your body and not to the piece. Whatever you wear there has them. Taking a piece '
    + 'off, melting it or fusing it never takes them away.',
  refineAt: (level: number, pct: number) =>
    (level === 0 ? 'not refined yet' : `煉 ${level} · every line on it +${pct}%`),
  setNeed: (n: number) => `${n} more ${n === 1 ? 'piece' : 'pieces'} of this realm`,
};

/**
 * 職 The classes, in the player's words. What each one *does* is in sim/schools.ts and
 * its sizes in sim/balance.ts; these sentences are read off those numbers so they cannot
 * drift apart. See data/schools.ts for why a class comes from what you wear.
 */
const pct = (x: number) => `${Math.round(Math.abs(1 - x) * 100)}%`;
export const CLASS = {
  head: 'Class',
  none: 'No class yet. Wear three pieces of one school to wake it.',
  step: (tier: number) => (tier >= 2 ? 'at its full' : 'awake'),
  toFull: (n: number, school: string) => `${n} more ${school} ${n === 1 ? 'piece' : 'pieces'} for the full`,
  toWake: (n: number, school: string) => `${n} more ${school} ${n === 1 ? 'piece' : 'pieces'} wakes it`,
  pairOf: (a: string, b: string, gives: string) => `And ${a} and ${b} are both awake: ${gives}`,
  /** 列 What each school gives, at its first step and at its full. */
  school: {
    // 劍 A multiplier on all of your power, gear and levels included, never added to the gear's
    // own percentage: rekaris read "+20%" as added (2026-10-05), and it is not.
    sword: (w: number, f: number) => `All your power ×${w}, or ×${f} at the full, on top of everything else.`,
    // 氣滿 The full school also lifts the ceiling on qi from gear (QI_FULL_ROOF); rekaris
    // found it unsaid (2026-10-06).
    qi: (w: number, f: number, roof: number) => `The four upgrades cost ${pct(w)} less, or ${pct(f)} at the full. At the full, the ceiling on qi from gear also stands ×${roof} higher.`,
    fortune: (w: number, f: number, amp: number, full: number) => `Your 運 rarer gear and 拾 drop chance lines count ×${amp}, or ×${full} at the full. A bond fills in ${w} wins, or ${f} at the full.`,
    body: (amp: number, full: number) => `Your 破 beasts weaker lines count ×${amp}, or ×${full} at the full.`,
    artificer: (w: number, f: number, amp: number, full: number) => `Refining costs ${pct(w)} less, or ${pct(f)} at the full. Your 煉 fusion quality and 藏 chest slots lines count ×${amp}, or ×${full} at the full.`,
    arts: (w: number, f: number) => `The arts in your sequence strike ${pct(w)} harder, or ${pct(f)} at the full.`,
  },
  /** 今 What a school gives at the step it is at now, which is what the ribbon says. */
  schoolAt: {
    sword: (x: number) => `All your power ×${x}.`,
    qi: (x: number, roof: number) => `The four upgrades cost ${pct(x)} less.${roof ? ` The ceiling on qi from gear stands ×${roof} higher.` : ''}`,
    fortune: (bond: number, amp: number) => `A bond fills in ${bond} wins. Your 運 rarer gear and 拾 drop chance lines count ×${amp}.`,
    body: (amp: number) => `Your 破 beasts weaker lines count ×${amp}.`,
    artificer: (x: number, amp: number) => `Refining costs ${pct(x)} less. Your 煉 fusion quality and 藏 chest slots lines count ×${amp}.`,
    arts: (x: number) => `The arts in your sequence strike ${pct(x)} harder.`,
  },
  /** 合 What each of the fifteen pairs adds to its two schools' first steps. */
  pair: {
    swordimmortal: (x: number) => `The tower's floors count ${pct(x)} weaker.`,
    wanderer: (x: number) => `Drives cost ${pct(x)} less.`,
    wargod: (x: number) => `Wardens count ${pct(x)} weaker.`,
    swordsmith: (x: number) => `${pct(x)} more 材 material from kills and floors.`,
    seeker: (x: number) => `Springs in the secret realm give ${pct(x)} more qi.`,
    vajra: (x: number) => `First sights, the week's quarry and the Platform pay ${pct(x)} more qi.`,
    alchemist: (x: number) => `Pills cost ${pct(x)} less.`,
    huntking: (x: number) => `Beasts leave a piece ${Math.round(x * 100)} points more often.`,
    treasuresmith: (x: number) => `Melting pays ${pct(x)} more, and its allowance refills ${pct(x)} faster.`,
    armourer: (x: number) => `The chest holds ${x} more.`,
    swordsaint: (x: number) => `The 渡劫 tribulation's Dragon counts ${pct(x)} weaker every time it comes back, so your marks come sooner.`,
    celestial: (x: number) => `Tower floors pay ${pct(x)} more qi.`,
    diviner: (x: number) => `Meetings on the road pay ${pct(x)} more.`,
    arhat: (x: number) => `You recover ${Math.round(x * 100)}% of your health every round of a fight.`,
    formation: (x: number) => `Ripe beds in the cave pay ${pct(x)} more qi.`,
  } as Record<string, (x: number) => string>,
  /** 鑑 On the item sheet. */
  pieceOf: (school: string) => `${/^[AEIOU]/.test(school) ? 'An' : 'A'} ${school} piece.`,
  becomes: (name: string) => `Wearing it makes you a ${name}.`,
  loses: (name: string) => `Wearing it ends your ${name}.`,
  instead: (will: string, was: string) => `Wearing it makes you a ${will} instead of a ${was}.`,
  toItsFull: (school: string) => `Wearing it brings your ${school} school to its full.`,
  offItsFull: (school: string) => `Wearing it takes your ${school} school off its full.`,
  keyHead: '職 Classes',
  keyBlurb: 'Every piece belongs to a school by the line it leads with. Three pieces of one school wake it, five bring it to its full, and three of each of two schools make one of fifteen named classes.',
  /**
   * 譜 Which piece is which school. Raziel Morgenstern, on the Discord: *"I have no idea
   * which name is what class, apart from learning it by heart."*
   */
  book: {
    open: 'Which piece is which school',
    title: 'Which piece is which school',
    blurb: 'The school goes with the shape, never the metal: every Sword is a Sword piece, from the first realm to the ninth. Three pieces of one school wake it, five bring it to its full.',
    leads: (lines: string) => `Leads with ${lines}`,
    wearing: (n: number) => (n === 0 ? 'none worn' : `${n} worn`),
    worn: 'worn',
    none: (slot: string) => `No ${slot.toLowerCase()}`,
    anySchool: 'Every school',
    anyPlace: 'Every place',
    schoolsFilter: 'Show one school',
    placesFilter: 'Show one place',
    pairsHead: '合 The fifteen classes',
    pairsBlurb: 'Three pieces of each of two schools wake both, and the class where they meet adds its own perk.',
    close: 'Close',
  },
  /**
   * 較 Compare classes. rekaris, on the Discord: nobody can tell which class is stronger
   * without building every set by hand. The sheet builds them from the chest instead.
   */
  compare: {
    open: 'Compare classes',
    title: 'Compare classes',
    blurb: 'The strongest outfit your pieces can make for every class, from your chest and what you wear. Tap one to put it on. Refining stays with the place on the body, as it always does.',
    none: 'Your pieces cannot make a class yet. Five of one school bring it to its full. Three and three of two schools make one of the fifteen classes.',
    head: 'Class',
    power: 'Power',
    floor: 'Floor',
    qi: 'Qi/s',
    /** 塔 What the floor column counts. */
    floorSays: (next: number) => `Floor is the highest floor of 塔 the tower this outfit beats now, from floor ${next} up. Losing a fight costs nothing.`,
    shut: 'The tower is not open yet, so only power and qi are compared.',
    noFloor: 'none',
    reading: 'reading',
    best: 'The best in each column is in gold.',
    full: (school: string) => `${school} at its full`,
    pairOf: (a: string, b: string) => `${a} and ${b}`,
    now: 'Worn now',
    noClass: 'No class',
    worn: 'worn',
    wear: (name: string) => `Put on the strongest ${name} outfit`,
    close: 'Close',
  },
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

  tree: 'All three branches grow from 起, and the gold bridges cross between them. Tap a node to read it.',
  /** 數 It read "6 free · 0/6", and nothing said what the second pair was. */
  purse: (spent: number, earned: number) => ` to spend · ${spent} of ${earned} spent`,
  /**
   * 短 The point is that you cannot have it all. It used to say a climb earns about 42,
   * a number fifteen times wrong by 2026-10-03 (the vault's shrines had no cap). What
   * keeps a tree from holding everything is the forks, so it says that instead.
   */
  short: (cost: number) =>
    `${cost} 道 would buy every node, but each fork closes one side for good.`,
  taken: (n: number, total: number) => `${n} of ${total} taken`,
  keystone: 'Stronger than the node beside it, and it takes something away.',
  /**
   * 樞 Why a keystone is dark in the second realm.
   *
   * The tree opens two realms before its keystones do, so the three that take something
   * away are drawn but not buyable, and the card has to say which realm, the same way
   * every locked tab in the game does. A dark node with no reason on it is the bug that
   * made the tree unfindable in the first place.
   */
  keystoneShut: (han: string, name: string) =>
    `樞 The keystones open in ${han} ${name}. You can see them from here, and they are ` +
    'meant to be seen: a fork you know is coming is a climb with a plan in it.',
  /** 極 Why a branch's last node is dark before CAPSTONE_REALM, the fifth. */
  capstoneShut: (han: string, name: string) =>
    `極 The last node of each branch opens in ${han} ${name}. Points you save until then wait for it.`,
  /**
   * 空囊 Why a node that caps the chest cannot be learned yet. Buying it over a fuller
   * chest would leave the chest over its own limit, so it waits, and the sheet says what
   * the player can do about it rather than only that it is shut.
   */
  overCap: (held: number, cap: number) =>
    `藏 Your chest holds ${held} pieces; this caps it at ${cap}. Melt or fuse some first.`,
  overCapButton: 'Chest full',
  closes: (han: string, name: string) => `Take this and ${han} ${name} closes. Once one of the two is yours, you can swap it for the other once a day.`,
  /** 岔 On a held fork: which side was not taken. */
  chose: (han: string, name: string) => `You hold this side of the fork. The other is ${han} ${name}.`,
  closed: (han: string) => `Closed. You took ${han} instead.`,
  /**
   * 岔 Swapping a held fork for its twin, once a day (speculaether, 2026-10-05). `wait` is
   * how long until the next swap, as "5h 12m".
   */
  swap: (han: string, name: string) => `岔 Swap for ${han} ${name}`,
  swapSays: 'A fork you hold can be swapped for the other side once a day. The points stay spent, and nothing else on the Path changes.',
  swapWait: (wait: string) => `The next swap is in ${wait}.`,
  swapShut: 'The other side is a keystone, and the keystones are not open yet.',
  swapFull: (held: number, cap: number) => `空囊 Empty Pouch holds ${cap} pieces and your chest holds ${held}. Melt or fuse some first.`,
  learned: 'learned',
  costs: (n: number) => `costs ${n} 道`,
};

/**
 * 新 The one-time cards.
 *
 * They are not introductions. 突破 the breakthrough already introduces whatever the realm
 * opened, in the one moment the game stops for, so these say **what to do with it**, on
 * the screen where it lives, at the moment it first becomes usable. Two cards saying the
 * same thing is the game talking over itself, and it read exactly like that on screen
 * before they were split.
 *
 * The titles carry no 漢字: the card draws the character in its own column, and a title
 * that repeats it reads as a stutter, which is exactly how it read in the screenshot
 * that caught it.
 */
/**
 * 出口 The way out of any panel. One word, because it is an aria-label and nothing else:
 * the button itself is a cross, which every phone on earth has already taught its owner.
 */
export const ESCAPE = { label: 'Close this and go back' };

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
    // 名 Not the title of 引 the guide's fight step, which it once was word for word:
    // two different cards with one name is the fastest way to make a player think the
    // game is repeating itself. This one is about the currency.
    title: '材 Material is the other currency',
    text: '妖丹 is the one upgrade priced in 材 material, and material only '
      + 'falls off beasts. Until you have some, this realm\'s warden will not fall.',
  },
  platform: {
    title: '擂台 Three challengers a week',
    text: 'On 塔 Trials. They stand against your own power, so the build wins them, not the number. '
      + 'A win pays a fixed sum of qi, the same for everyone in your realm; a loss costs nothing, and the dice are set for the week.',
  },
  tower: {
    title: 'Only the next floor is ever open',
    text: 'It never runs out, and losing costs nothing. Sweep the low floors for material. '
      + 'The ones that can beat you are the ones that pay in qi.',
  },
  furnace: {
    // Not "start with a 煉體丹": 煉體 is the *line*, and the pill on the screen is named
    // for the realm brewing it: 合道丹 at the seventh, 大乘丹 at the eighth. A card
    // naming a pill that is nowhere on the list is a card sending the player looking.
    title: 'Start with the power pill',
    text: 'It is power you keep for good, and every pill after it costs a little more. Qi '
      + 'brewed is qi that did not open a layer, so this is a trade rather than a freebie.',
  },
  refine: {
    // 承 rekaris, on the Discord (2026-10-02): the old card said the levels stay on the
    // piece, and swapping a sword kept them. The levels belong to the place on the body
    // (State.refined, since 2026-10-06), so the card says that.
    title: 'Refining is never thrown away',
    text: 'The levels belong to the place on your body and not to the piece. Whatever you wear '
      + 'there has them. Taking a piece off, melting it or fusing it never takes them. Pour '
      + 'material in freely: an upgrade never wastes it.',
  },
  workshop: {
    title: 'The workshop is open',
    text: 'Seven crafts that level from 1 to 99, on the 業 tab. Set it on one thing and it keeps '
      + `working for twelve hours after you leave. Alchemy opens at realm 5 or Herb Gathering ${CRAFT_FEED_LEVEL}, `
      + `Sigils at 6 or Vein Delving ${CRAFT_FEED_LEVEL}, Arrays at 7 or Forging ${CRAFT_FEED_LEVEL}.`,
  },
  record: {
    title: 'Old beasts are worth going back for',
    text: 'Ten kills of one beast is a 熟 mark and a hundred is 通. Old beasts still have '
      + 'marks in them, and the list puts those on top.',
  },
  pool: {
    title: 'Fill the pool and the Dragon comes',
    text: 'It holds two days of gathering at the summit, upgrades at their cap and nothing worn, and '
      + 'only your marks make it bigger: qi gear fills it faster. Crossing empties it again. Qi spent '
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
  /** 存 Not signed in to anything: the save is this browser's alone. It used to say "There
   *  is no account", beside a 榜 Ranks screen offering one. */
  why: 'Your save lives in this browser, on this phone, and clearing the browser data clears it. Sign in with your email under 榜 Ranks and a copy is kept in the cloud. The email brings a link and a six-digit code, and the code works in the Android app too. Or keep a copy of your own somewhere you will find it again.',
  /** 雲 A ranked guest: there is a cloud copy, but only this device holds the key to it. */
  whyGuest: 'You are ranked as a guest, so a copy is kept in the cloud. Only this device can open it, so clearing the browser data loses it. Add your email under 榜 Ranks to keep it on every device, or keep a copy of your own.',
  /** 雲 Signed in with an email: the cloud copy opens anywhere they sign in. */
  whyEmail: (email: string) => `You are signed in as ${email}, so a copy of your save is kept in the cloud and opens on any device you sign in on. A file of your own is still the one copy nobody else holds.`,
  /** 雲 Signed in before, and the account not read yet. */
  whyCloud: 'Your save lives on this phone, and a copy is kept in the cloud while you are signed in to the rankings. A file of your own is still the one copy nobody else holds.',
  copy: 'Copy the save',
  copied: 'Copied. Paste it into a note, a message to yourself, anywhere you keep things. It is sealed: it reads as noise, and it restores exactly as it was.',
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
  noStance: 'You hold no stance yet. The first one, 疾 Swift, comes when 勢 stances open.',
  pickStance: 'Pick one. It is always on, and it changes every round of every fight.',
  noArts: 'You hold no arts yet. Each warden you put down hands over its own.',
  emptySlot: 'empty, a wasted round',
  rotation: 'One art fires each round, in this order, then it starts again. An empty slot fires nothing, so a full sequence is always worth more.',
};

/**
 * 謝 Who made what. Honest about the tools: the music and the test art were made with AI,
 * and a player asking should find that said plainly here rather than in a thread
 * somewhere. The art line says it is test art, because the final art is to be made.
 */
export const CREDITS = {
  title: '謝 Credits',
  lead: 'Ninefold is made by one developer, 師 Shibaki.',
  rows: [
    ['設', 'Design, systems and balance', '師 Shibaki'],
    ['樂', 'Music', 'Made with Suno, for this game.'],
    ['畫', 'Illustrations', 'Test art, made with AI tools, then chosen, edited and cut for the game by 師 Shibaki. The final art is planned to be made for the game.'],
    ['字', 'Lettering', 'Cinzel, Cormorant Garamond and Noto Serif SC, under the SIL Open Font License.'],
    ['器', 'Built with', 'React, Vite and Capacitor. The rankings run on Supabase.'],
  ] as const,
  iconsHead: 'Icons',
  thanksHead: 'Thanks',
  thanks: 'To everyone in the closed test, and to the Dao of the Endless Sky community, who waited.',
  back: 'Back to the game',
};

export const BESTIARY = {
  /** 圖鑑 What finishing a realm's beasts is worth, said where they are listed. */
  pays: (n: number) => `${n} 道 when every beast of the realm, its warden aside, is 熟 Known`,
  credits: 'Art credits',
  icons: (authors: string) =>
    `Icons from game-icons.net, Creative Commons BY 3.0. Authors: ${authors}.`,
  /** 職 For a screen reader: the schools of the three pieces a beast leaves. */
  leavesSchools: (schools: readonly string[]) => `Leaves ${schools.join(', ')} pieces`,
};

export const RETURN = {
  away: (span: string) => `You were away ${span}.`,
  qi: 'qi gathered',
  /**
   * 階 Where the gathered qi went, when it did not stay in the bar.
   *
   * A layer opens the instant its price is met and the qi is taken, so a cultivator who
   * leaves with a nearly full bar comes back to a bar that is nearly empty again and a
   * rung or two further up. The number they had been watching is *smaller* than when
   * they left. Nothing was taken, and until this line the screen never said so.
   *
   * 詞 It says "went into the climb" and not "of it went into the climb", because a rung
   * is paid with whatever is in the bar: some of it was gathered while they were away
   * and some of it was already standing there. The first draft said "of it" and read as
   * an arithmetic error on the same card, 425M of 205M.
   */
  spent: (qi: string) => `${qi} went into the climb while you were away`,
  layers: 'layers opened',
  realms: 'realms climbed',
  power: 'power now',
};

/**
 * 譯 The words the two unit characters stand for, printed beside them wherever a number
 * wears one. 力 and 材 are on more numbers than anything else in the game, and they were
 * the characters players kept asking about (rekaris, on the Discord, 2026-10-01).
 */
export const UNIT = { power: 'power', material: 'material' };

/**
 * 拆 What a melt pays, said the same way everywhere: qi while the melting allowance holds
 * it, 材 material past it, or both.
 */
export const meltPays = (qi: string, mats: string, hasQi: boolean, hasMats: boolean) =>
  hasQi && hasMats ? `${qi} qi and ${mats} 材 material` : hasMats ? `${mats} 材 material` : `${qi} qi`;

export const ARENA = {
  /** 造化 A second piece from the same kill. */
  secondPiece: (name: string, rank: string) => `Creation: a second piece, ${rank} ${name}`,
  /**
   * 見 The first time a beast falls, and only the first.
   *
   * It is the same card as the 見 Seen mark, because it is the same event. The qi leads,
   * because the qi is the part that moves the number the player has been watching all
   * day, which was the whole complaint: combat never touched it.
   */
  firstSight: (qi: string, han: string) =>
    `+${qi} qi for the first ${han} you ever killed, once and never again. `
    + 'Every beast but a warden pays this the first time it falls.',
  /** 藏 A full chest keeps the better piece and melts the other into qi. Never lost. */
  chestFullNew: (pays: string) => `The chest is full and holds better. This one melts into ${pays}.`,
  chestFullOld: (name: string, pays: string) => `The chest is full, so your weakest piece, the ${name}, melts into ${pays} to make room.`,
  /** 熔 The piece that went was one no kept filter shows, so it was not always the weakest. */
  chestFullUnkept: (name: string, pays: string) => `The chest is full, so the ${name}, which no kept filter shows, melts into ${pays} to make room.`,
  /** 期 The week's quarry, the first kill of the week. */
  weekHead: 'The week\u2019s quarry',
  week: (qi: string) => `+${qi} qi for the first one this week. Every one this week pays double 材 material.`,
  missed: 'turned aside',
  collect: 'Collect',
  withdraw: 'Withdraw',
  /** 再 The same beast again, from the verdict. One button where there used to be three
   *  trips across the screen: rekaris, on the Discord, 2026-10-01. */
  again: 'Again',
  floor: (n: number) => `Floor ${n}`,
  /** 鍵 The keys, printed on the buttons they press, and only where there is a keyboard. */
  keyCollect: 'Enter',
  keyAgain: 'R',
  /** 自 The auto-hunt, started from a won verdict and run while the game is open. */
  auto: 'Auto',
  keyAuto: 'A',
  autoOn: (name: string) => `Hunting the ${name} on its own`,
  autoTally: (kills: number, mats: string) => `${kills} ${kills === 1 ? 'kill' : 'kills'} · +${mats} 材 material`,
  stop: 'Stop',
  autoIn: (left: number, name: string) => `Auto opens once the ${name} is Known: ${left} more ${left === 1 ? 'kill' : 'kills'}.`,
  /** 略 A fight is settled the moment it starts; watching it is a choice. */
  skip: 'Tap to see how it ends',
  /** 熟 Said at the moment it happens, because a permanent reward that passes in
   *  silence is one the player never learns to go looking for. */
  earned: (han: string, pays: string) => `${han} · ${pays}, for good`,
};

/**
 * 閉關 Seclusion, on 修 the cultivate screen, and 心魔 the heart demon behind the door.
 * The loss line is said on the card and again in the arena, because a fight you are told
 * you will probably lose has to say twice that losing it costs nothing.
 */
export const SECLUSION = {
  head: '閉關 Seclusion',
  plain: 'Seclusion',
  open: 'Shut the door for eight hours and your 心魔 heart demon comes: yourself, a little stronger, without your stance or your arts.',
  shut: 'Shut the door',
  waiting: (left: string) => `The door is shut. Your heart demon comes in ${left}.`,
  shutNote: 'Nothing stops while the door is shut. Hunt, climb, or close the game.',
  due: 'Your heart demon is waiting.',
  dueNote: 'It is you, a fifth stronger, with none of what you know. A loss costs nothing: it draws back for an hour.',
  face: 'Face it',
  odds: (pct: number) => `${pct}% odds`,
  tally: (n: number, of: number) => `${n} of ${of} put down`,
  pays: (n: number) => `+${n} 道 point`,
  rest: (realm: number) =>
    `The next demon waits for the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][realm - 1]} realm.`,
  done: 'All nine demons are down. Your heart is still.',
  /** 鬥 The arena's last word on the demon. */
  won: { han: '心魔破', text: 'Your heart demon is down. What it held is yours.' },
  lost: { han: '心魔退', text: 'It draws back into you, and comes again in an hour. Nothing was lost.' },
};

/**
 * 業 The workshop: seven crafts, and everything the screen says about them.
 *
 * It has to say four things a player needs before they will trust a thing that runs while
 * the app is shut: what is being made, what it costs, how long it keeps going without
 * them, and that nothing is lost for coming back late. Every one of those is here.
 */
export const CRAFTS = {
  tab: 'Crafts',
  head: '業 The workshop',
  total: (n: number) => `Total ${n}/693`,
  totalLabel: 'Total level',
  /** The same, on a screen too narrow for two words. */
  totalShort: 'Total',
  // 篩 The recipe filters, for a craft with more recipes than a screen holds.
  findHint: 'Find a recipe',
  filters: { all: 'All', ready: 'Ready now', next: 'Coming next' } as Record<'all' | 'ready' | 'next', string>,
  nothingShown: 'Nothing here right now. Try All, or gather what the recipes ask for.',
  nothingYet: 'Nothing here right now. Gather what the recipes ask for.',
  nothingFound: (words: string) => `No recipe in this craft matches “${words}”.`,
  /** 作 On a craft's tile, in place of its rank, while it is the one working. */
  tileWorking: 'working',
  later: (n: number) => `${n} more ${n === 1 ? 'opens' : 'open'} further up the craft.`,
  says: 'One task at a time. It repeats on its own, and keeps working for twelve hours after you leave. Nothing it makes is ever lost.',
  idle: 'The workshop is standing still. Choose something below and set it going.',
  making: (name: string) => `Making ${name}`,
  every: (time: string, xp: string) => `one every ${time} · +${xp} xp`,
  waitingRemains: (n: number, of: number) => `Waiting to know this beast: ${n} of ${of} killed. Hunt it, and the workshop takes up the knife.`,
  waitingNeeds: (what: string) => `Waiting for ${what}.`,
  waitingChest: 'Your chest is full. Make room and the forge carries on.',
  stop: 'Stop',
  start: 'Start',
  away: (hours: number) => `Works ${hours} hours after you leave`,
  level: (n: number) => `level ${n}`,
  xpTo: (have: string, left: string, next: number) => `${have} xp · ${left} to level ${next}`,
  xpTop: (have: string) => `${have} xp · the top of the craft`,
  /** 開 On a shut craft's tile, and the full line under it: its realm, or its feeder's level. */
  opens: (realm: number, feeder?: { name: string; level: number }) =>
    (feeder ? `Realm ${realm} or ${feeder.name} ${feeder.level}` : `Opens at realm ${realm}`),
  opensLong: (han: string, name: string, realm: number, feeder?: { name: string; level: number }) =>
    `${han} ${name} opens at realm ${realm}${feeder ? `, or at ${feeder.name} ${feeder.level}` : ''}. What you gather before then waits for it.`,
  /** 覽 Over the recipes of a craft that is not open yet, shown so a climb can be planned. */
  preview: (name: string) => `A look ahead: what ${name} makes once it opens. Each recipe also waits for its own level and realm.`,
  tool: (name: string, pct: number) => `${name}, ${pct}% faster`,
  noTool: (tool: string) => `No ${tool.toLowerCase()} yet. The forge makes one.`,
  why: {
    level: (n: number) => `Level ${n}`,
    realm: (n: number) => `Realm ${n}`,
    tool: 'Held',
    shut: 'Not open',
  },
  needs: 'Needs',
  remains: (n: number, of: number) => `${n}/${of} killed`,
  /** 物 The note on a thing's icon in a recipe: which craft makes it. */
  madeBy: (han: string, skill: string, recipe: string) => `Made in ${han} ${skill}: ${recipe}.`,
  goMake: (recipe: string) => `Go to ${recipe}`,
  /**
   * 職 A forged piece's school, drawn on its picture as the seal the tiles in 器 carry.
   * rekaris, on the Discord: a forged piece could not be held up against a hunted one.
   */
  schoolName: (school: string) => `${school} school`,
  schoolNote: (school: string, han: string, line: string, says: string) =>
    `Leads with ${han} ${line}: a ${school} piece, the same as one a beast leaves.\n`
    + `Three worn wake the school, five make it full. ${says}`,
  quality: 'Quality',
  familiar: (marks: number) => `習 familiarity ${'\u25cf'.repeat(marks)}${'\u25cb'.repeat(5 - marks)}`,
  /**
   * 習 What each familiarity mark gives, said where the dots are. rekaris, on the Discord
   * (2026-10-03): *"does it do anything? Doesn't seem to speed up the craft or anything?"*
   * It did, and the dots never said which. Since the same day every mark gives something
   * on every recipe: where its own gift would do nothing, a recipe that makes a thing for
   * the pouch gets another chance of two, and gear, a tool or an array gets faster (see
   * CRAFT_MARK_SUB). `doubles` is whether a make can come out twice at all.
   */
  familiarNote: (made: number, graded: boolean, fewer: number, doubles: boolean, craft: string, mastery: number,
    marks: readonly number[] = CRAFT_MARKS) => {
    const pct = (x: number) => Math.round(x * 100);
    const instead = doubles
      ? `another 1 in ${Math.round(1 / CRAFT_MARK_SUB)} comes out twice`
      : `another ${pct(CRAFT_MARK_SUB)}% faster`;
    const gives = [
      `${pct(CRAFT_MARK_FASTER)}% faster`,
      // A piece of gear, a tool or an array is made once: it gets faster instead.
      doubles ? `1 make in ${Math.round(1 / CRAFT_MARK_TWICE)} comes out twice` : `${pct(CRAFT_MARK_SUB)}% faster again (it is made one at a time)`,
      // 丹符 A pill or a sigil is a heavy make (CRAFT_KIT_WORK), and its third mark takes that many off.
      fewer > 1 ? `${fewer.toLocaleString('en')} fewer of the first thing it needs` : fewer === 1 ? 'one less of the first thing it needs' : instead,
      graded ? 'better odds of a high rank' : instead,
      graded ? 'never comes out Common' : instead,
    ];
    const next = marks.find((m) => made < m);
    const top = marks[marks.length - 1].toLocaleString('en');
    return `Made ${made.toLocaleString('en')} times. ${next ? `${(next - made).toLocaleString('en')} more for the next mark.` : 'Every mark earned.'}\n`
      + marks.map((m, i) => `${made >= m ? '\u25cf' : '\u25cb'} ${m.toLocaleString('en')}: ${gives[i]}`).join('\n')
      + (graded ? '\nEvery mark also lifts the rank a little.' : '')
      // 熟 No stop since 2026-10-05 (CRAFT_MASTERY_BAND): every recipe mastered adds, more slowly.
      + `\nEvery ${craft} recipe made ${top} times makes all of ${craft} faster: ${pct(CRAFT_MASTERY_SPEED)}% each for the first ${CRAFT_MASTERY_BAND}, `
      + `half that for each of the next ${CRAFT_MASTERY_BAND}, and half again for every ${CRAFT_MASTERY_BAND} after. ${Number((mastery * 100).toFixed(1))}% now.`;
  },
  makes: (n: number) => `${n} made`,
  pouch: '儲物袋 The pouch',
  pouchEmpty: 'Nothing yet. What the workshop gathers and makes lands here.',
  kinds: (n: number) => `${n} kinds`,
  pouchTap: 'tap one to see what it does',
  // 類 The pouch's shelves: English first, the character beside it.
  kindName: { herb: 'Herbs', ore: 'Ores', part: 'Beast parts', metal: 'Metals', elixir: 'Elixirs', sigil: 'Sigils', array: 'Arrays' } as Record<string, string>,
  kindHan: { herb: '藥', ore: '礦', part: '解', metal: '鑄', elixir: '丹', sigil: '符', array: '陣' } as Record<string, string>,
  // 版 The workshop and the pouch are two views on a phone and side by side on a wide screen.
  viewWork: 'Workshop',
  viewPouch: (n: number) => `Pouch · ${n}`,
  carryHead: '攜 Carried into the next hard fight',
  carrySays: 'An elixir and a sigil go into your next warden, heart demon, vault gate or Platform challenger, and up the tower when you take them on its card. A win spends whichever took part; a loss keeps both. Never the tribulation’s Dragon.',
  carryElixir: 'Elixir',
  carrySigil: 'Sigil',
  carryNone: 'Nothing',
  carry: 'Carry',
  uncarry: 'Put back',
  use: 'Use',
  place: 'Place in the floor',
  lift: 'Lift out',
  seek: (n: number) => `尋 ${n} sure ${n === 1 ? 'drop' : 'drops'} waiting on the hunt`,
  arraysHead: (placed: number, slots: number) => `陣 The cave floor · ${placed} of ${slots} places`,
  arraysNone: 'No array cut yet.',
  arraysMore: (level: number) => `Another place at Arrays ${level}.`,
  /**
   * 深 An array's depth, on its line in the floor and in the recipe list. speculaether, on
   * the Discord (2026-10-05): a second copy of an array did nothing. Every
   * CRAFT_ARRAY_DEPTH_EVERY copies now deepen it a step.
   */
  arrayDepth: (depth: number, steps: number, toNext: number) => depth >= steps
    ? `深 Depth ${depth} of ${steps}, as deep as it goes`
    : `深 Depth ${depth} of ${steps} · ${toNext} more to the next`,
  arrayDepthNote: (every: number, steps: number, top: number, cut: number) =>
    `Every ${every} copies of the same array you cut deepen it one step, up to ${steps}. `
    + `Each step adds ${Math.round((top - 1) / steps * 100)}% to what it does, so at full depth it does ×${top}. `
    + `Copies are kept and never spent. You have cut ${cut.toLocaleString('en')}.`,
  close: 'Close',
  forgedRule: 'A forged piece is the one you chose. It cannot be fused, and melting it gives its metal back, never qi.',
  gearShown: (realm: number) => `Showing the gear of realms ${Math.max(1, realm - 1)} to ${realm}.`,
  gearOf: (realm: number) => `Showing the gear of realm ${realm}.`,
  /** 鑄 The row of realms above the forge's gear list. */
  tiers: 'Which realm',
  tierNow: 'Now',
  furnace: (pct: number) => `Every Alchemy level takes 0.2% off the pill furnace's material: ${pct}% now.`,
  /** 歸 The homecoming line. */
  // 攜 What the arena says about a kit carried in, so a loss is seen to have cost nothing.
  kitIn: (names: string) => `Carried in: ${names}`,
  kitSpent: (names: string) => `Carried in and spent: ${names}.`,
  kitKept: (names: string) => `Carried in and kept: ${names}. Losing costs nothing.`,
  /** 九轉 A win that never needed the pill it carried keeps it. */
  kitUnneeded: (names: string) => `Never needed, so kept: ${names}.`,
  seekKept: 'A sure drop still waits for your next win.',
  // 歸 The homecoming lines moved to WORKSHOP_AWAY below, which says why it stood still too.
};

/* ── 待 What is waiting for you, and the batch that reads it ─────────────────────────
 *
 * Quality of life, 2026-10-03. Two audits played a check-in at every stage of the climb
 * and counted thirty to fifty taps, most of them spent finding what was ready rather
 * than taking it. Everything below is read off the save (see app/ready.ts): nothing here
 * is stored, and no line in it may read as a loss, because nothing is ever lost.
 */

export const READY = {
  /** 歸 The heading of the list on the return card. */
  head: '待 Waiting for you',
  /** 修 The strip at the top of Cultivate. */
  strip: 'Ready now',
  /** The tab a row is taken on, said at the end of the row. */
  onTab: (han: string, label: string) => `${han} ${label} \u203a`,
  /** 點 A tab's own label when something on it is ready, for the screen reader and the pointer. */
  tabSays: (label: string, what: string) => `${label}: ${what}`,
  material: '材 material',
  card: { short: 'Choose a card', long: 'A breakthrough card is waiting for you to choose it.' },
  breakthrough: { short: 'Break through', long: 'The warden is down. The next realm is open to you.' },
  cross: { short: 'Cross', long: 'The Dragon is down. The tribulation is ready to be crossed.' },
  demon: { short: 'Heart demon', long: 'Your heart demon waits behind the door.' },
  road: { short: 'On the road', long: (name: string) => `${name} is waiting for you on the road.` },
  beds: {
    short: (n: number) => `Cave: ${n} ripe`,
    long: (n: number) => (n === 1 ? 'A cave bed is ripe.' : `${n} cave beds are ripe.`),
  },
  vault: { short: 'Vault open', long: 'The vault door is open.' },
  points: {
    short: (n: number) => `Path: ${n} to spend`,
    long: (n: number) => `${n} Path ${n === 1 ? 'point' : 'points'} to spend.`,
  },
  workshop: {
    shortIdle: 'Workshop: no task',
    shortWaits: 'Workshop waits',
    idle: 'The workshop has no task. Pick one and it works while you are away.',
    needs: (what: string) => `The workshop is waiting for ${what}.`,
    chest: 'The forge is waiting for room in your chest.',
    remains: (beast: string) => `The workshop is waiting to know the ${beast}.`,
  },
  quarry: {
    short: 'Week\u2019s quarry',
    long: (name: string, left: string) => `The week\u2019s quarry, the ${name}, still pays its first-kill qi. ${left} left.`,
  },
  floor: {
    short: (f: number) => `Tower floor ${f}`,
    long: (f: number, pct: number) => `Tower floor ${f} is ${pct}% to win.`,
  },
  upgrades: {
    short: (n: number) => `${n} better ${n === 1 ? 'piece' : 'pieces'}`,
    long: (n: number) => `${n} ${n === 1 ? 'piece' : 'pieces'} in your chest would be an upgrade.`,
  },
  chestFull: { short: 'Chest full', long: 'Your chest is full. Wear or melt a piece to make room.' },
  melt: { short: 'Melting pays qi', long: 'Your melting allowance is full, so melting pays its whole worth in qi.' },
};

/**
 * 業 What the workshop did while nobody watched, said whole.
 *
 * It said only what was made, and only when something was. A night spent waiting for ore
 * said nothing; thirty hours away said "made 12,126" and never that it had rested for the
 * last eighteen. Each line says what happened as what it is: a rest or a wait, never a loss.
 */
export const WORKSHOP_AWAY = {
  made: (n: number, name: string) => `The workshop made ${n.toLocaleString('en')} \u00d7 ${name}.`,
  level: (skill: string, from: number, to: number) => `${skill} ${from} \u2192 ${to}.`,
  rested: (span: string, hours: number) => `Then it rested for ${span}: it works ${hours} hours after each visit.`,
  waitedAfter: (span: string, what: string) => `Then it waited ${span} for ${what}.`,
  waited: (span: string, what: string, name: string) => `It waited ${span} for ${what} to make ${name}.`,
  roomAfter: (span: string) => `Then it waited ${span} for room in your chest.`,
  room: (span: string) => `It waited ${span} for room in your chest.`,
  know: (span: string, beast: string) => `It waited ${span} to know the ${beast}.`,
  doneAfter: (span: string) => `Then it stood ready for a new task for ${span}.`,
  done: (span: string) => `Its last task was done, and it stood ready for a new one for ${span}.`,
  none: (span: string, hours: number) => `It had no task for ${span}. Set one and it works ${hours} hours after you leave.`,
};

/** 業 The one tap that sets a waiting workshop going again, on the Crafts screen. */
export const WORKSHOP_FIX = {
  gather: (what: string) => `Gather ${what}`,
  gatherNote: (name: string) => `This changes the task. Set ${name} again once there is enough.`,
  hunt: 'Hunt for 材 material',
  huntBeast: (beast: string) => `Hunt the ${beast}`,
  room: 'Make room in the chest',
  again: (name: string) => `Make ${name} again`,
  goTo: (name: string) => `Find ${name}`,
};

/** 突破 What a realm hands over, said before the cards, and each one a way in. */
export const OPENED = {
  head: 'Opened in this realm',
  /** The tab a system lives on, at the end of its row. */
  where: (han: string, label: string) => `${han} ${label} \u203a`,
  /** And on the tab itself until it is opened. */
  tabNew: (names: string) => `New here: ${names}.`,
  newWord: 'New',
};

/**
 * 鍵 The keys, said once in How to play, on a device with a pointer.
 *
 * rekaris asked for Esc in the arena, and every window after it learned the same keys. A
 * key nobody is told about is a key nobody presses.
 */
export const KEYS = {
  head: '鍵 Keys',
  rows: [
    ['1 to 7', 'The tabs, in the order the bar shows them.'],
    ['Space or Enter', 'In a fight, skip to the end. At the verdict, collect.'],
    ['R', 'At the verdict, collect and fight the same beast again.'],
    ['A', 'At the verdict, start the auto-hunt on a beast you know.'],
    ['Esc', 'Close whatever is on top. On the cards it means Later, on the question Not yet.'],
    ['Enter', 'Close the return card or a note.'],
    ['1 or 2, \u2190 or \u2192', 'In the vault, take the left or the right door.'],
  ] as const,
};

/** 道 A node of the tree as a button: what the screen reader says, and what a key opens. */
export const NODE = {
  label: (name: string, han: string, status: 'have' | 'open' | 'full' | 'poor' | 'locked' | 'shut', cost: number) =>
    `${name} ${han}, ${{
      have: 'learned',
      open: `can be learned for ${cost} 道`,
      full: 'your chest holds more than it would allow',
      poor: `costs ${cost} 道, more than you hold`,
      locked: 'not reachable yet',
      shut: 'closed by the node beside it',
    }[status]}`,
};

/**
 * 入定 The sitting, said so a player always knows which part of it they are in.
 *
 * rekaris, on the Discord: *"what constitutes 'check again'? ... I reload the page and it
 * starts again ... the player knows exactly when they start meditating, when it ends and
 * when to check back."* It begins when the game comes on screen and ends half an hour
 * later (a quarter of an hour until 2026-10-03). Coming back to the game starts a new
 * one, and so does 坐 Sit again, which is exactly what a reload did, without the reload.
 */
export const SIT = {
  chip: (x: string, left: string) => `Sitting \u00d7${x} \u00b7 ${left} left`,
  rising: 'It deepens for three minutes, then holds until the half hour is up.',
  over: (n: string) =>
    `That sitting has passed, so you gather at your standing ${n} a second. Nothing was taken: the sitting was extra.`,
  how: 'A new sitting starts whenever you come back to the game, or now:',
  again: 'Sit again',
};

// \u2500\u2500 \u4fbf Quality of life, batch B (2026-10-03) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
/**
 * \u4fbf The bulk buttons and remembered choices from the quality-of-life call. Every one is
 * the single tap in a loop (see src/sim), so the copy only has to say what it will do
 * before it is pressed and what it leaves alone. Kept in one block so it reads, and
 * merges, as one piece.
 */
export const QOL = {
  cave: {
    takeReplant: 'Take all and plant again',
    takeAll: 'Take all',
    /** Under the two take buttons: what is ripe and what it pays. */
    ripe: (n: number, qi: string) => `${n} ripe \u00b7 ${qi} qi`,
    replantSays: 'Each ripe bed is sown again with the same herb. If you cannot pay for that seed, the herb in season goes in, or the bed stays empty.',
    plantEmpty: (n: number) => (n === 1 ? 'Plant in the empty bed' : `Plant in all ${n} empty beds`),
    /** Over the seed list when one herb is going into every empty bed. */
    pickForAll: (n: number) => `Choose one herb for ${n === 1 ? 'the empty bed' : `all ${n} empty beds`}.`,
  },
  gear: {
    wearAll: 'Wear all upgrades',
    wearAllSays: 'Puts on every \u25b2 piece, the biggest gain first. A \u25b2 piece is at least as good on every line you wear now. Locked pieces, loadout pieces and any that would change your class stay put.',
    wore: (n: number) => `Put on ${n} ${n === 1 ? 'piece' : 'pieces'}`,
    fuseAll: 'Fuse all groups',
    fuseAllSays: 'Three into one, again and again, until no three match. At Heaven it fuses only pieces you found, so nothing it makes is fused again. Locked and forged pieces are never fused. Your refining stays where it is.',
    /**
     * 天 Heaven into Heaven (rekaris, on the Discord, 2026-10-04): three found Heaven pieces
     * make one, with the fusion quality on top. The line over the Heaven rows, and each
     * row's own words, with the quality it will come out at.
     */
    heavenSays: `天 Heaven into Heaven: three you found make one, with your fusion quality on top, ×${trim(FUSE_TOP)} at most. A fused piece is never fused again.`,
    heavenRow: (name: string, count: number, quality: number) => `${name} · ${count} found · comes out ×${quality.toFixed(2)}`,
    fused: (n: number) => `Fused ${n} ${n === 1 ? 'time' : 'times'}`,
    /** \u627f On the item sheet, when the piece's lines are read with the place's levels on. */
    carried: (n: number) => `Read as worn, with this place's ${n} refining ${n === 1 ? 'level' : 'levels'}: they belong to the place, so any piece you wear here has them.`,
    /** \u7be9 The chest's third filter: by lines. */
    lines: 'Lines',
    anyLine: 'Any line',
    linesSays: 'A piece shows only if it has every line you pick.',
    none: 'Nothing in the chest matches this filter.',
    /** \u5b58 Saved filters, up to eight, kept with the cultivator. */
    saveFilter: 'Save this filter',
    filterName: 'Name this filter',
    filterDefault: (n: number) => `Filter ${n}`,
    keepIt: 'Keep',
    cancel: 'Not now',
    forget: 'Forget',
    forgetOne: (name: string) => `Forget the filter ${name}`,
    /**
     * 鎖 A kept filter: a full chest melts what it shows last, and only for a better piece it
     * shows (rekaris, on the Discord).
     */
    keepWord: 'Keep',
    keptWord: 'Kept',
    keepOne: (name: string) => `Keep what ${name} shows: a full chest melts it last`,
    unkeepOne: (name: string) => `Stop keeping what ${name} shows`,
    keptSays: 'A full chest melts the worst piece no kept filter shows. A piece a kept filter shows only ever makes room for a better one a kept filter shows.',
    keepWhy: 'Mark a filter Keep and a full chest melts what it shows last.',
    filtersFull: (n: number) => `${n} filters are kept, the most there is room for. Forget one to keep another.`,
    /** \u9396 The chest's first row: only the pieces kept on purpose. */
    lockedOnly: 'Locked',
    savedHead: 'Saved filters',
  },
  /** \u5668 A piece's slot, in English, beside its name wherever a beast's drops are listed. */
  slotted: (name: string, slot: string) => (name.toLowerCase().includes(slot.toLowerCase()) ? name : `${name} \u00b7 ${slot}`),
  arena: {
    better: 'Better than what you wear',
    wearIt: 'Wear it',
    wornNow: 'Worn',
    nextFloor: 'Next floor',
    keyNext: 'R',
  },
  drive: {
    again: 'Drive again',
    most: 'As many as your qi pays for',
    mostCap: (n: number) => `up to ${n} at once`,
    againSays: (n: number, qi: string) => `${n} kills for ${qi} qi, at today's price.`,
  },
  hunt: {
    auto: 'Auto',
    autoSays: (name: string) => `Hunt the ${name} on its own, until you stop it or a fight is lost`,
    /** 篩 The hunt list's filter, by the piece a beast leaves. */
    leavesLabel: 'Leaves',
    byPlace: 'Show beasts that leave a piece for this place',
    bySchool: 'Show beasts that leave a piece of this school',
    anyPlace: 'Any piece',
    anySchool: 'Any school',
    leaveThat: (n: number, of: number) => `${n} of the ${of} beasts you can hunt leave that.`,
    noneLeave: 'No beast you can hunt leaves that yet. Tap Any piece or Any school to see them all.',
  },
  seclusion: {
    shutsAgain: 'When a demon falls and this realm still has one left, the door shuts again by itself.',
    shutAgain: 'The door has shut again by itself. The next one comes in eight hours.',
  },
  buy: {
    all: 'Buy all',
    allSays: (n: number) => `${n} ${n === 1 ? 'level' : 'levels'}, cheapest first`,
    bought: (n: number) => `${n} ${n === 1 ? 'level' : 'levels'}`,
  },
};
