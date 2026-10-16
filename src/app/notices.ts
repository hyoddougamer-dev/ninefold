import { UPGRADES, atTribulation, capOf, type State } from '../sim/state.ts';
import { canBrew, canRefine, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { odds } from '../sim/combat.ts';
import { BEASTS } from '../data/bestiary.ts';
import { MARKS } from '../sim/record.ts';
import { SLOTS } from '../data/gear.ts';
import { isOpen } from '../sim/unlocks.ts';
import { CORE_CAP_EXTRA, LEVELS_PER_REALM, SEAL_DAYS } from '../sim/balance.ts';
import { NOTICE } from './copy.ts';
import { platformOpen } from '../sim/platform.ts';
import { LAST_WEEK, SEASON_START } from '../sim/season.ts';
import { freshTabs } from './fresh.ts';

/**
 * 終 The instant the closed test ends, in the device's own time: "Sunday 25 October, 21:00" in
 * Brazil, "Monday 26 October, 09:00" in Tokyo. English words, the player's clock.
 */
export function endsHere(): string {
  // Spelled out from the device's own clock rather than through toLocaleString: what an
  // engine's locale data prints for 'en-GB' is its own business ("Sunday, 25 October" on
  // some, "24:00" on others), and this one line must read the same on every phone.
  const d = new Date(SEASON_START * 1000);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

/**
 * 新 The cards that arrive once.
 *
 * 示 the advice line answers "why am I stuck". This answers the other half: "what is
 * this thing that just appeared". The realm cap, 無盡塔 the tower, 丹爐 the furnace and
 * 雷池 the thunder pool all turn up in a game that had never mentioned them, and a
 * player meeting a screen with no idea what it is for will use it wrong or not at all.
 *
 * Three rules, so this never becomes a tutorial:
 *
 *   1. **It fires when the thing is true, not when the game starts.** Nobody reads a
 *      card about the furnace before there is a furnace.
 *   2. **It fires once, ever.** The key goes in the save and never comes out.
 *   3. **It never blocks.** The card sits at the foot of the screen and the game carries
 *      on behind it.
 */
export interface Notice {
  readonly key: string;
  readonly han: string;
  readonly title: string;
  readonly text: string;
  /** Is this true yet? */
  readonly when: (s: State) => boolean;
  /** Where to send the player, if there is somewhere. */
  readonly tab?: 'hunt' | 'trials' | 'gear' | 'dao' | 'crafts';
}

/** 封 The seal's card, read off SEAL_DAYS: the sealed realms, and the shortest and longest seal. */
function sealText(): string {
  const sealed = SEAL_DAYS.map((d, i) => ({ d, realm: i + 1 })).filter((x) => x.d > 0);
  const days = sealed.map((x) => x.d);
  return NOTICE.seal.text(sealed[0].realm, sealed[sealed.length - 1].realm, Math.min(...days), Math.max(...days));
}

export const NOTICES: readonly Notice[] = [
  {
    // 終 The closed test's last week: from 19 October until the switch, never before and never
    // after, read off the game's own clock. First in the list, because it is the one card that
    // stops being true. Once read it is in `seen`, and the save it is in retires at the switch.
    key: 'lastweek', han: '終', title: NOTICE.lastWeek.title, text: NOTICE.lastWeek.text(endsHere()),
    when: (s) => s.at >= LAST_WEEK && s.at < SEASON_START,
  },
  {
    key: 'cap', han: '上限', title: NOTICE.cap.title, text: NOTICE.cap.text(LEVELS_PER_REALM, CORE_CAP_EXTRA),
    when: (s) => UPGRADES.some((u) => s.levels[u] >= capOf(s, u)),
  },
  {
    key: 'cores', han: '妖丹', title: NOTICE.cores.title, text: NOTICE.cores.text, tab: 'hunt',
    // 材 When there is material in your pocket, not when the realm opens. 妖丹 is on
    // sale from the first realm now, and a card explaining what material buys is worth
    // reading the moment you have some, and worth nothing at all before that.
    when: (s) => isOpen(s.realm, 'cores') && s.materials > 0 && s.levels.cores === 0,
  },
  {
    key: 'tower', han: '塔', title: NOTICE.tower.title, text: NOTICE.tower.text, tab: 'trials',
    when: (s) => isOpen(s.realm, 'tower') && s.tower === 0
      && odds(s, floorBeast(standingFloor(s)), floorPower(standingFloor(s))) > 0.6,
  },
  {
    // 擂台 The Platform opens a realm before the tower, on the screen the tower will share.
    key: 'platform', han: '擂台', title: NOTICE.platform.title, text: NOTICE.platform.text, tab: 'trials',
    when: (s) => platformOpen(s) && (s.bouts ?? 0) === 0,
  },
  {
    key: 'furnace', han: '爐', title: NOTICE.furnace.title, text: NOTICE.furnace.text, tab: 'trials',
    when: (s) => canBrew(s, 'body'),
  },
  {
    key: 'refine', han: '煉器', title: NOTICE.refine.title, text: NOTICE.refine.text, tab: 'gear',
    when: (s) => SLOTS.some((slot) => canRefine(s, slot)),
  },
  {
    key: 'record', han: '錄', title: NOTICE.record.title, text: NOTICE.record.text, tab: 'hunt',
    when: (s) => isOpen(s.realm, 'record') && BEASTS.some((b) => (s.killed[b.key] ?? 0) >= MARKS[1]),
  },
  {
    // 業 Once, for everybody the workshop is open to: whoever reaches the second realm,
    // and whoever was already past it the day it arrived, who never saw it open.
    key: 'workshop', han: '業', title: NOTICE.workshop.title, text: NOTICE.workshop.text, tab: 'crafts',
    when: (s) => isOpen(s.realm, 'crafts'),
  },
  {
    // 封 Once, the moment the first sealed realm is reached: long before its warden comes out,
    // so the seal is never the surprise it was at layer 9.
    key: 'seal', han: '封', title: NOTICE.seal.title, text: sealText(),
    when: (s) => (SEAL_DAYS[s.realm - 1] ?? 0) > 0,
  },
  {
    key: 'pool', han: '雷池', title: NOTICE.pool.title, text: NOTICE.pool.text,
    when: (s) => s.realm === 9 && (atTribulation(s) || s.layer >= 8),
  },
];

/**
 * The next card to show, or nothing, which is the usual answer.
 *
 * 新 A card about a tab waits while that tab still wears its 新 dot, and comes up when the tab
 * is first opened, which is where it is about. Arriving in the second realm was the realm's
 * card, the 悟道 choice, the guide and then a card for the old beasts, the workshop and
 * refining, all in the same minute and all before a piece of gear had been seen (audit,
 * 2026-10-16). The dot already says where to look; the card says what it is, once there.
 */
export function nextNotice(s: State): Notice | null {
  const fresh = freshTabs(s);
  return NOTICES.find((n) => !s.seen.includes(n.key) && !(n.tab && fresh.includes(n.tab)) && n.when(s)) ?? null;
}
