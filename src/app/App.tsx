import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { capRefuses, fuseIn, limitFor, stash } from '../sim/stash.ts';
import { pictureOf } from '../data/pictures.ts';
import { heavenAt } from '../data/heavens.ts';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { realm as realmOf } from '../data/realms.ts';
import { currentWarden, fight, takeKill } from '../sim/combat.ts';
import { canFightWarden, newState, power, type State,
} from '../sim/state.ts';
import { duration, num } from '../sim/format.ts';
import { keepSpare, load, save, untouched} from '../sim/save.ts';
import { freePoints as freeOf } from '../sim/points.ts';
import { fortuneOf } from '../sim/fortune.ts';
import { FOCUS_HOLD, LAYERS_PER_REALM } from '../sim/balance.ts';
import { begin, endOf, focusOf, isOver } from './sitting.ts';
import { now, payTo } from './clock.ts';
import { useSitting } from './useSitting.ts';
import { capstonesOpen, focusBonus } from '../sim/dao.ts';
import { portraitLayers } from '../art/aura.ts';
import { templateOf, type Item, type Rarity, type Slot } from '../data/gear.ts';
import { equip as equipItem, unequip as unequipItem } from '../sim/chest.ts';
import { dropFor, noteFate, secondDropFor } from '../sim/fate.ts';
import { brew, clearFloor, floorQi, refine, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import {
  beatChallenger, challengerKit, challengerOf, challengerPower, challengerSeed, standingTier, type Tier,
} from '../sim/platform.ts';
import { conquer, conquerTwice, demonDue, demonOf, demonPower, repel } from '../sim/seclusion.ts';
import {
  carry, kitFor, kitWhere, placeArray, setOrder, setTask, spendOnWin, spendSeek, takeSeeking, tookPart,
} from '../sim/crafts.ts';
import { Crafts } from './screens/Crafts.tsx';
import { splitKey } from '../data/crafts.ts';
import type { Away } from '../sim/save.ts';
import { AWAKEN, GEAR } from './copy.ts';
import { marksOf } from '../sim/record.ts';
import type { Line } from '../data/alchemy.ts';
import { canUnlock } from '../sim/dao.ts';
import { swapFork } from '../sim/fork.ts';
import { salvage, salvageUpTo } from '../sim/salvage.ts';
import { assignTask, clearSet, renameSet, saveSet, setLocked as lockPiece, wearPieces, wearSet } from '../sim/sets.ts';
import { adoptFilters, forgetFilter, keepFilter, saveFilter } from '../sim/filters.ts';
import { Dao } from './screens/Dao.tsx';
import { Gear } from './screens/Gear.tsx';
import { Hunt } from './screens/Hunt.tsx';
import { Cultivate } from './screens/Cultivate.tsx';
import { Prologue } from './ui/Prologue.tsx';
import { CountUp } from './ui/CountUp.tsx';
import { CloudPick, Ranks } from './ui/Ranks.tsx';
import * as cloud from '../net/cloud.ts';
import { progressOf } from '../sim/echo.ts';
import { importSave } from '../sim/save.ts';
import { armJuice, burst, centreOf, float } from './juice.ts';
import { Trials } from './screens/Trials.tsx';
import { Help } from './ui/Help.tsx';
import { Key } from './ui/Key.tsx';
import { Credits } from './ui/Credits.tsx';
import { RealmCard } from './ui/RealmCard.tsx';
import { Awaken } from './ui/Awaken.tsx';
import { Figure } from './ui/Figure.tsx';
import { WHOM } from '../data/figures.ts';
import { cardDue as awakeningDue, cardOf, take as takeAwakening } from '../sim/awaken.ts';
import { answerWithReceipt, meetingDue, type Receipt } from '../sim/meet.ts';
import { harvest as harvestBed, plant as plantSeed } from '../sim/cave.ts';
import {
  enter as enterSecret, inside as insideSecret, leave as leaveSecret, openByKind, useKey,
} from '../sim/secret.ts';
import { Secret, Tally } from './ui/Secret.tsx';
import { Drive, PileSheet } from './ui/Drive.tsx';
import { holdDrops, settle as settlePile, settleDefault, settleStale } from '../sim/pile.ts';
import { ItemSheet } from './ui/ItemSheet.tsx';
import { Cards } from './ui/Cards.tsx';
import { Rebirth } from './ui/Rebirth.tsx';
import { canReincarnate, reincarnate } from '../sim/rebirth.ts';
import { retrade } from '../sim/retrade.ts';
import { Schools } from './ui/Schools.tsx';
import { Compare } from './ui/Compare.tsx';
import { Coach } from './ui/Coach.tsx';
import { Chronicle } from './screens/Chronicle.tsx';
import { SavePanel } from './ui/SavePanel.tsx';
import { Escape } from './ui/Escape.tsx';
import { Svg } from './ui/Svg.tsx';
import { Arena, BEAT_MS, beatsIn, type Battle } from './ui/Arena.tsx';
import { MARKS } from '../sim/balance.ts';
import { BRAND, BUILD, JUICE, RANKS, RETURN, TABS_COPY } from './copy.ts';
// 便 The quality-of-life batch B: bulk buttons, the next floor, wear it from the verdict.
import { QOL } from './copy.ts';
import { recall, keep, oneOf, useRemembered } from './prefs.ts';
import { RARITIES } from '../data/gear.ts';
import { brewMax } from '../sim/trials.ts';
import { wearBetter } from '../sim/inspect.ts';
import { fuseAllIn } from '../sim/stash.ts';

/** 版 Filled in by the build (vite.config.ts). */
declare const __BUILD__: string;
import { haptics } from './haptics.ts';
import { sfx } from './sound.ts';
import { moodFor, setMood, unlockMusic } from './music.ts';
import { Volumes } from './ui/Volume.tsx';
import { takeUpdate, watchForUpdates } from './updates.ts';
import { nextNotice } from './notices.ts';
import { DISMISSED, guide } from './guide.ts';
import { isOpen, opensIn, systemInfo, type System } from '../sim/unlocks.ts';
import { realm as realmInfo } from '../data/realms.ts';
import { NOTICE } from './copy.ts';
import { BLOOM, DAO, LOCKED, MENU, UPDATE } from './copy.ts';
// ── 待 What is waiting, the keys and the sitting (quality of life, 2026-10-03) ──
import { OPENED, READY } from './copy.ts';
import { heavyOf, ready as readyNow, readyByTab, type Place, type Waiting } from './ready.ts';
import { workshopLines } from './away.ts';
import { TAB_OF, clearFresh, freshTabs, markFresh, newTabsOf } from './fresh.ts';
import { spendablePoints } from '../sim/points.ts';
import { fightDeps } from './memo.ts';
import { weekOf } from '../sim/week.ts';

/**
 * 開 The tabs, and what opens them.
 *
 * A locked tab is shown rather than hidden, dimmed and with the realm that opens it,
 * because the whole point of a purely vertical game is that climbing hands you something
 *, and you cannot look forward to a tab you have never seen.
 */
const TABS = [
  { key: 'cultivate', han: '修', label: 'Cultivate', needs: null },
  { key: 'hunt', han: '狩', label: 'Hunt', needs: 'hunt' },
  { key: 'trials', han: '塔', label: 'Trials', needs: 'platform' },
  { key: 'gear', han: '器', label: 'Gear', needs: 'gear' },
  { key: 'crafts', han: '業', label: 'Crafts', needs: 'crafts' },
  { key: 'dao', han: '道', label: 'Path', needs: 'arts' },
] as const satisfies readonly { key: string; han: string; label: string; needs: System | null }[];

type TabKey = (typeof TABS)[number]['key'];

/** 待 Where on its screen a row of the waiting list is, so taking it brings it into view. */
const READY_AT: Partial<Record<Waiting['key'], string>> = {
  beds: '.cave', demon: '.seclude', road: '.meet', breakthrough: '[data-coach="breakthrough"]',
  cross: '[data-ready="cross"]', vault: '.door.open', workshop: '.ctask', upgrades: '.chestfilter .ups',
  chestFull: '.melting', melt: '.melting',
};

/**
 * 擊 The least time between two fights starting, in the app. The ranked server allows one
 * per MIN_FIGHT_SECONDS (1.2 s) before it counts kills as bought; this keeps clear of it.
 */
const PACE_MS = 1500;

/** 歸 What the homecoming card says: how long away, and what the time did. */
interface Homecoming {
  readonly seconds: number;
  readonly qi: number;
  /** 階 How much of the gathered qi the ladder took on the way, which is never a loss. */
  readonly climbed: number;
  readonly layers: number;
  readonly realms: number;
  readonly crafts: Away | null;
}

export function App() {
  const [tab, setTab] = useState<TabKey>('cultivate');
  /**
   * 頂 Whether the screen has been scrolled away from its top.
   *
   * The ≡ button floats in the top-right corner of a phone, and on a scrolled screen it
   * sat on whatever passed under it: a 13.4M price on 修, a recipe's count on 業. Once the
   * screen is scrolled, a solid strip comes in behind the button across the whole top,
   * so what scrolls up goes under a header, as in any app, and never half under a button.
   * At the top the strip is not drawn, because every screen's first row already keeps
   * clear of the corner.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { setScrolled(false); }, [tab]);
  const [state, setState] = useState<State>(() => newState(now()));
  const [battle, setBattle] = useState<Battle | null>(null);
  const [home, setHome] = useState<Homecoming | null>(null);
  const [pulse, setPulse] = useState(0);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(false);
  // 序 The prologue, which a brand new save opens on in place of the help sheet.
  const [prologue, setPrologue] = useState(false);
  // 釋 The key: what every character on the screen means.
  const [key, setKey] = useState(false);
  /** 譜 The page of which piece is which school, opened from the class on 器. */
  const [book, setBook] = useState(false);
  /** 較 The class comparison, opened from the class line on 器. */
  const [comparing, setComparing] = useState(false);
  /** 改 The cards already taken, where one can be traded. */
  const [cards, setCards] = useState(false);
  /** 轉世 The page of a new life, and whether this visit has just begun one. */
  const [rebirth, setRebirth] = useState(false);
  const [born, setBorn] = useState(false);
  // 碑 The stele. A page you visit, not a loop you run, so it lives on the header rather
  // than taking a sixth place in a tab bar that has to fit on a phone.
  const [stele, setStele] = useState(false);
  const [credits, setCredits] = useState(false);
  const [saving, setSaving] = useState(false);
  // 收 The corner. Shut by default, and shut again on every open: the game's own
  // screen is what a player came back for, not its settings.
  const [menu, setMenu] = useState(false);
  // 境 The page that says what this realm is, reached from the realm's own name.
  const [realmPage, setRealmPage] = useState(false);
  /**
   * 悟道 Whether the three cards are on the screen right now.
   *
   * Only this is state. *Whether a choice is owed* is derived from the save, so it
   * cannot be lost by a reload and nothing has to remember to raise it. This is the
   * one thing that has to be remembered: that the player put it aside for a minute.
   */
  const [awakenShut, setAwakenShut] = useState(false);
  const [whom, setWhom] = useState(false);
  // 圍 The beast whose drive sheet is open, if any.
  // 據 What the last meeting gave, shown once on 修 until it is read; never stored.
  const [meetDone, setMeetDone] = useState<Receipt | null>(null);
  const [driving, setDriving] = useState<Beast | null>(null);
  /** 圍 Whether the window for a drive's waiting pieces is open without a drive sheet behind it. */
  const [pileOpen, setPileOpen] = useState(false);
  // 鑑 The piece being looked at, and whether it is the one on the body.
  const [inspect, setInspect] = useState<{ item: Item; wearing: boolean } | null>(null);
  const [fresh, setFresh] = useState(false);
  /** 突破 The breakthrough moment: the realm just left, held for its animation. */
  const [bloom, setBloom] = useState<number | null>(null);
  /** 鎖 A tab the realm has not opened yet, held for the panel that says so. */
  const [locked, setLocked] = useState<System | null>(null);
  /** 拆 The rank the bulk melt reaches up to. It lives here so it survives a tab. */
  // 記 Remembered on the device: it used to reset to Common on every load ("Melt 0 pieces").
  const [meltUpTo, setMeltUpToRaw] = useState<Rarity>(() => recall('melt.upTo', 'common', oneOf(RARITIES)));
  const setMeltUpTo = useCallback((r: Rarity) => { setMeltUpToRaw(r); keep('melt.upTo', r); }, []);
  /**
   * 出 Whether the end of a run is on the screen.
   *
   * The tally itself is in the save, because it is a record of what the rooms already
   * paid. This is only whether the player has read it yet, which is a screen's worth of
   * state and not a save's: closing the app in room five and coming back tomorrow comes
   * back to the game, not to yesterday's receipt.
   */
  const [tally, setTally] = useState(false);

  /** 點 道 points earned, not yet spent, and with a node in reach to spend them on. The
      tab bar wears the count, and 示 the line of advice reads the same number. It wore
      the bare count once, and a full tree read 32 at the eighth realm. See sim/points.ts. */
  const free = spendablePoints(state);
  /** 悟道 Whether a breakthrough still owes this cultivator a card. Derived, always. */
  const owesCard = awakeningDue(state) !== null;
  /** 緣 Who is on the road, if anybody. Derived from the save, so it cannot be lost. */
  const meeting = meetingDue(state);
  const loaded = useRef(false);
  const lastLayer = useRef(0);
  /**
   * 一 A sound, a burst or a buzz decided inside a state updater, played once per tap.
   *
   * An updater has to be pure, and these were not: React runs one twice under StrictMode
   * and may run it again when a tick lands between the tap and the render, so a refine
   * could ring twice. The effect still has to be decided in there, because only there is
   * the state the tap really applied to. So each tap takes a number before it calls
   * setState, and whatever the updater asks to play is played once for that number.
   */
  const taps = useRef(0);
  const played = useRef(new Set<number>());
  const once = (id: number, effect: () => void) => {
    if (played.current.has(id)) return;
    played.current.add(id);
    if (played.current.size > 64) played.current.delete(played.current.values().next().value!);
    effect();
  };
  /**
   * 出 The run ended, so the tally goes up.
   *
   * It is watched rather than raised at the tap because there are three ways out of a
   * run and only one of them is a button: walking out, opening the seventh door, and
   * being put down by a guardian. All three end with the same fact in the save, which
   * is the walker standing outside, so that is what this reads.
   */
  const wasInside = useRef(false);
  useEffect(() => {
    const now = insideSecret(state);
    // Every ending raises it, the one where a guardian at room one took the whole run
    // included: that is the ending that most needs a sentence about what happened.
    if (wasInside.current && !now) setTally(true);
    wasInside.current = now;
  }, [state]);
  const { sitting, tree, focus, setFocus, satOut, setSatOut, sitLeft, setSitLeft } = useSitting(ready, state.unlocked, setState);
  const [opened, setOpened] = useState(false);
  const openedTimer = useRef(0);

  // 歸 The return. An idle game is played closed, so opening the app is first of all
  // receiving the hours that passed, and the player wants to see that before anything.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const r = load(now());
    setState(r.state);
    setReady(true);
    // 圍 A drive that ended with the game shut left its pieces in the save: the window shows them.
    if (r.state.pile.length > 0 && settleStale(r.state) === r.state) setPileOpen(true);
    lastLayer.current = (r.state.realm - 1) * LAYERS_PER_REALM + r.state.layer;
    // A first-ever run has no save and no hours away: that is who the help is for. It
    // asks save.ts for what "has not begun" means rather than keeping its own idea of
    // it: the old one was "qi under five", which 囊 the opening purse made false, and
    // the help silently stopped appearing for new players.
    // 序 It opens on the prologue now, which hands over to 相 and then the guide; the
    // help sheet is what the Menu opens.
    // 雲 Somebody arriving from a sign-in link has a cultivator already: no prologue.
    if (r.secondsAway === 0 && untouched(r.state) && !cloud.returningFromLink()) setPrologue(true);
    // The load came back whole, so this is a state worth keeping a spare of.
    keepSpare(r.state);

    if (r.secondsAway > 120) {
      setHome({
        seconds: r.secondsAway, qi: r.qiEarned, climbed: r.qiClimbed,
        layers: r.layersOpened, realms: r.realmsClimbed, crafts: r.crafts,
      });
    }
  }, []);

  // The clock. Time moves by timestamp, never by frame: this interval only asks what
  // time it is, and `advance` does the rest, so dropped frames lose no progress.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      // 道 神 the Spirit branch deepens the sitting; everything else leaves it at
      // FOCUS_MAX. It reads a ref rather than the state, because this interval is set up
      // once and would otherwise hold the tree the player had when it started.
      const sit = sitting.current;
      const deeper = focusBonus(tree.current);
      const at = now();
      setFocus(focusOf(sit, at, deeper));
      // 入定 Whether this visit's sitting has run out, which `focus` alone cannot say:
      // it reads 1 both before the sitting begins and after it ends, and those are two
      // very different things to put on a screen.
      setSatOut(!!sit && isOver(sit, at));
      setSitLeft(sit ? Math.max(0, Math.ceil(endOf(sit) - at)) : 0);
      setState((s) => {
        // 業 And the workshop, settled to the same instant. It reads its own clock.
        // 隱 Paid with the sitting this tick was handed, up to its end and ×1 after it.
        // 圍 And pieces nobody answered for in a day are answered the game's way.
        const next = settleStale(payTo(s, now(), sit, deeper));
        const layers = (next.realm - 1) * LAYERS_PER_REALM + next.layer;
        if (layers > lastLayer.current) {
          lastLayer.current = layers;
          sfx.layer();
          // 階 A rung opening is the one moment the bar is worth looking at, and it used
          // to pass with a sound and nothing to see. The flag is cleared on a timer
          // rather than by the animation, so a second rung inside half a second (which
          // a melt can do) replays it instead of being swallowed.
          setOpened(true);
          // 勁 And the bar that filled throws its light, with the layer's number over it.
          const n = next.layer;
          window.setTimeout(() => {
            const at = centreOf(document.querySelector('.bar[data-opened]'));
            if (!at) return;
            burst('jade', at, 16, 90);
            if (n > 0) float(JUICE.layer(n), 'jade', at);
          }, 0);
          window.clearTimeout(openedTimer.current);
          openedTimer.current = window.setTimeout(() => setOpened(false), 540);
        }
        return next;
      });
      setPulse((p) => (p + 0.02) % 1);
    }, 200);
    return () => clearInterval(id);
  }, [ready]);

  /**
   * Save, but never before loading.
   *
   * `ready` is not caution: without it this effect runs once with the empty initial
   * state and its cleanup writes that emptiness over the loaded save, wiping the run of
   * anyone who opens the app. It happened, and that is how it was found.
   */
  /**
   * 頻 And it has to be the interval that saves, not the cleanup.
   *
   * This effect used to depend on `[state, ready]`, and the clock changes the state five
   * times a second, so the interval was torn down and rebuilt before it could ever
   * fire, and every save in the game came from the *cleanup* instead. Measured in the
   * running app: **fifty writes in ten seconds**, 17 KB of JSON.stringify and synchronous
   * localStorage, for ever, on a phone. The code said every four seconds. It was doing it
   * twenty times more often than that.
   *
   * The state goes in a ref so the interval can read the latest one without the effect
   * depending on it. Leaving the app still saves at once, which is the case that matters.
   */
  const latest = useRef(state);
  latest.current = state;
  // 轉世 A new life is written at once, and the spare copy with it: the spare is the life
  // left behind until then, and a main copy lost before the next clean load would bring it back.
  useEffect(() => {
    if (!born) return;
    save(latest.current);
    keepSpare(latest.current);
  }, [born]);

  // ── 榜 The ranked server ────────────────────────────────────────────────
  // A player who has signed in is synced when the game opens, every five minutes, and
  // whenever the app is put away. Nothing here waits on the network to play: a sync that
  // fails is a sync that did not happen, and the game goes on exactly as it was.
  const [ranks, setRanks] = useState(false);
  const [who, setWho] = useState<cloud.Who | null>(null);
  const [synced, setSynced] = useState<cloud.Synced | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  // 拒 Why the last sync came back empty, if it did: a closed account and an unreachable
  // server used to read alike, as "Not synced yet", for a day (speculaether, 2026-10-04).
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cloudPick, setCloudPick] = useState<{ there: State; here: State } | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [place, setPlace] = useState<number | null>(null);
  const pushing = useRef(false);
  const push = useCallback(async (name?: string) => {
    if (pushing.current) return;
    pushing.current = true;
    try {
      const r = await cloud.sync(latest.current, name);
      if ('error' in r) {
        if (r.error !== 'too-soon') setSyncError(r.error);
      } else {
        setSyncError(null);
        setSynced(r); setSyncedAt(Date.now() / 1000);
        cloud.mine().then((m) => setTitle(m?.title ?? null)).catch(() => {});
        cloud.place().then(setPlace).catch(() => {});
      }
    } catch { setSyncError('offline'); /* the next one will do */ }
    pushing.current = false;
  }, []);
  useEffect(() => {
    if (!ready) return;
    // Read before anything else runs: the library takes the link out of the address as
    // soon as it has read it, and after that there is no telling it was ever there.
    const fromLink = cloud.returningFromLink();
    if (!cloud.remembered() && !fromLink) return;
    let live = true;
    (async () => {
      const w = await cloud.who().catch(() => null);
      if (!live || !w) return;
      setWho(w);
      // 雲 Arriving from an email link on a device that may not be the one the cultivator
      // grew up on: if the cloud holds one further along, ask which goes on.
      if (fromLink && !w.guest) {
        const got = await cloud.pull().catch(() => null);
        const there = got?.save ? importSave(JSON.stringify(got.save), now()).state : null;
        history.replaceState(null, '', location.pathname);
        if (there && progressOf(there) > progressOf(latest.current)) {
          setCloudPick({ there, here: latest.current });
          return;
        }
      }
      void push();
    })();
    return () => { live = false; };
  }, [ready, push]);
  useEffect(() => {
    if (!who) return;
    const id = setInterval(() => { void push(); }, 5 * 60 * 1000);
    const away = () => { if (document.visibilityState === 'hidden') void push(); };
    document.addEventListener('visibilitychange', away);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', away); };
  }, [who, push]);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => save(latest.current), 4000);
    const onLeave = () => save(latest.current);
    document.addEventListener('visibilitychange', onLeave);
    window.addEventListener('pagehide', onLeave);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onLeave);
      window.removeEventListener('pagehide', onLeave);
      save(latest.current);
    };
  }, [ready]);

  /**
   * 攜 塔 Whether what is carried goes up the tower. The climber's choice, made on the
   * floor's card and remembered on this device: a hundred floors a visit would otherwise
   * spend an hour's pill on each one, the low ones that needed nothing included.
   */
  const [towerKit, setTowerKit] = useRemembered('towerKit', false, (x): x is boolean => typeof x === 'boolean');

  /** 擊 When the last fight started, and a fight asked for before the pace allowed it. */
  const lastStart = useRef(0);
  const queued = useRef<{ beast: Beast; floor?: number; demon?: boolean; challenger?: Tier } | null>(null);
  const [tick, setTick] = useState(0);

  const startFight = useCallback((beast: Beast, floor?: number, demon?: boolean, challenger?: Tier) => {
    // 守 A warden is only ever reachable at the end of its own realm. The screens have
    // always declined to draw it anywhere else, and that is exactly the kind of guard
    // that a second screen forgets, so it is asked of the sim here, once.
    if (beast.warden && floor === undefined && !canFightWarden(state)) return;
    // 擊 Never faster than a hand. The ranked server reads any kill beyond one per
    // MIN_FIGHT_SECONDS as bought with qi, and a burst of them as a cheat; with a skip, R
    // and the auto-hunt a fight could otherwise start every few hundred milliseconds. A
    // fight asked for too soon is queued, and starts the moment the pace allows.
    // 擂 And only the challenger standing now, as with the warden: the sim is asked, once.
    if (challenger !== undefined && standingTier(state) !== challenger) return;
    if (Date.now() < lastStart.current + PACE_MS) {
      queued.current = { beast, floor, demon, challenger };
      setTick((t) => t + 1);
      return;
    }
    lastStart.current = Date.now();
    sfx.tap();
    haptics.tap();
    // 鍵 Whatever button started this keeps the focus, and a Space pressed to skip the
    // fight would press it again underneath. Nothing outside the arena holds a key now.
    (document.activeElement as HTMLElement | null)?.blur?.();
    setBattle((current) => {
      if (current) return current;   // one fight at a time
      // One seed for the fight and its drop, so the same kill always gives the same
      // item: closing the app and reopening it cannot re-roll a poor piece.
      const seed = Math.floor(now() * 1000) >>> 0;
      // 心魔 The demon stands on the cultivator's own power; a floor on its own; 擂 a
      // challenger on the cultivator's power at its edge, the week's temper read.
      const platform = challenger !== undefined;
      const standing = platform ? challengerPower(state, challenger)
        : demon ? demonPower(state) : floor === undefined ? undefined : floorPower(floor);
      // 業 What is carried goes into a warden, a heart demon or a challenger, and into a floor
      // when the climber has chosen it on the tower's card. Never a common.
      const where = kitWhere(state, beast, standing);
      const carried = where === 'tower'
        ? kitFor(state, beast, towerKit ? 'tower' : null)
        : kitFor(state, beast, where);
      // 尋 A sure drop waiting from a Seeking Sigil goes on a common of the hunt, and only
      // when it changes something: a piece that was falling anyway (造化, or a fate bar
      // come due) leaves the sure drop waiting for a beast that would have left nothing.
      const drops = !demon && !platform && floor === undefined && isOpen(state.realm, 'gear');
      const plain = drops ? dropFor(state, beast, seed ^ 0x9e3779b9, fortuneOf(state), state.layer) : null;
      const sought = drops && !plain && !beast.warden && state.crafts.seek > 0;
      return {
        id: seed,
        beast,
        floor,
        demon,
        challenger,
        kit: carried.spends ? carried.used : undefined,
        sought,
        qi: floor === undefined ? undefined : floorQi(state, floor),
        // 定 擂 A challenger is fought on the period's dice, and a trail taken in the vault
        // has it begin hurt: the same body meets the same fight all week.
        outcome: platform
          ? fight(state, beast, challengerSeed(state, challenger), standing, challengerKit(state, carried.kit))
          : fight(state, beast, seed, standing, carried.kit),
        beat: 0,
        over: false,
        // A tower floor pays in materials, not in gear. Gear comes from the world.
        //
        // 狩 And nothing drops before 器 opens. The first realm hunts a realm before it
        // can wear anything, so a piece falling there would go into a chest the player
        // cannot open, off a screen that cannot explain it.
        //
        // 緣 A win that fills this beast's bar leaves a piece for certain: dropFor reads
        // the bar, and closeFight moves it.
        drop: sought ? dropFor(state, beast, seed ^ 0x9e3779b9, { ...fortuneOf(state), always: true }, state.layer) : plain,
        // 造化 Creation turns the drop chance into a second piece from the same kill.
        extra: drops && !sought ? secondDropFor(state, beast, seed ^ 0x9e3779b9, fortuneOf(state), state.layer) : null,
      };
    });
  }, [state, towerKit]);

  /** 心魔 The demon behind the door, only when it is waiting. */
  const faceDemon = useCallback(() => {
    if (!demonDue(state)) return;
    startFight(demonOf(state), undefined, true);
  }, [state, startFight]);

  /** 擂 The challenger standing on the Platform, and only ever that one. */
  const challenge = useCallback((tier: Tier) => {
    if (standingTier(state) !== tier) return;
    startFight(challengerOf(state, tier), undefined, false, tier);
  }, [state, startFight]);

  /** 塔 The next floor of the tower, and only ever the next one. */
  const climbTower = useCallback((floor: number) => {
    if (floor !== standingFloor(state)) return;
    startFight(floorBeast(floor), floor);
  }, [state, startFight]);

  const onBrew = useCallback((line: Line, max = false) => {
    const id = ++taps.current;
    setState((s) => {
      // 盡 ×Max brews as many as can be paid for, each at its own price (brewMax).
      const next = max ? brewMax(s, line).state : brew(s, line);
      if (next === s) return s;
      once(id, () => { sfx.brew(); haptics.win(); });
      return next;
    });
  }, []);

  /**
   * The whole fight is already settled; this walks it one beat at a time.
   *
   * A round is two beats: the cultivator strikes, then the beast answers, so a blow
   * lands alone and you can see whose it was. The sound follows the same beat: the
   * swing on the strike, the wound a breath later.
   */
  useEffect(() => {
    if (!battle) return;
    if (battle.over) {
      if (battle.outcome.won) { sfx.win(); haptics.win(); } else { sfx.lose(); haptics.lose(); }
      return;
    }
    sfx.strike();
    haptics.strike();
    const hurt = setTimeout(() => { sfx.wound(); haptics.wound(); }, 80);
    const id = setTimeout(() => {
      setBattle((b) => {
        if (!b) return b;
        const next = b.beat + 1;
        return next >= beatsIn(b.outcome)
          ? { ...b, beat: beatsIn(b.outcome) - 1, over: true }
          : { ...b, beat: next };
      });
    }, BEAT_MS);
    return () => { clearTimeout(id); clearTimeout(hurt); };
  }, [battle]);

  const closeFight = useCallback((wear = false) => {
    if (!battle) return;
    const { beast, outcome, drop, extra, floor, demon, kit, sought, challenger } = battle;
    // 業 A won fight spends what took part in it; a lost one keeps it. Only when the reward
    // landed, though: a reward the sim refused (the week turned under a challenger) pays
    // nothing, so it spends nothing (spendOnWin).
    const spent = (s: State, next: State) => (outcome.won && kit ? spendOnWin(s, next, tookPart(kit, !!outcome.revived)) : next);
    // 鎖魂 Read off the hand that went in, not off whatever is carried now.
    const locked = !!kit?.sigil && splitKey(kit.sigil).key === 'sigil:soullock';
    if (challenger !== undefined) {
      // 擂 Down, its hours are paid and the next one steps up; standing, nothing happens at
      // all. Not a kill: no material, no drop, no mark on the record.
      if (outcome.won) setState((s) => spent(s, beatChallenger(s, challenger)));
    } else if (demon) {
      // 心魔 Down, the door opens and a 道 point lands; standing, it draws back for an
      // hour. Neither is a kill: the demon is never counted in the record.
      // 鎖魂 A Soul-Lock Sigil carried in makes the one that fell count twice.
      setState((s) => (outcome.won ? spent(s, locked ? conquerTwice(s) : conquer(s)) : repel(s)));
    } else if (outcome.won && floor !== undefined) {
      // 塔 A floor counts once. It pays material and hours of gathering, and spends what was
      // carried up to it, if the climber chose to carry it.
      sfx.floor();
      setState((s) => spent(s, clearFloor(s, floor)));
    } else if (outcome.won) {
      const id = ++taps.current;
      setState((s) => {
        // 錄 A mark earned is rare enough to be worth hearing.
        const kills = s.killed[beast.key] ?? 0;
        const before = marksOf(kills);
        if (marksOf(kills + 1) > before) once(id, sfx.mark);
        // 收 The count, the material, 見 the first-sight bounty and where the piece goes
        // (空囊 and a full chest's melt included) all come from the sim, so the harnesses
        // that measure this game see exactly what the player gets.
        const put = stash(noteFate(takeKill(s, beast), beast, drop), drop);
        let first = put.state;
        // 著 Wear it, from the verdict: the piece as it went in (空囊 applied), and only if
        // the chest kept it. The same swap the item sheet's button makes.
        if (wear && put.item && first.chest.some((x) => x.id === put.item!.id)) {
          const on = equipItem(first.worn, first.chest, put.item, templateOf(put.item).slot);
          first = { ...first, worn: on.worn, chest: [...on.chest] };
        }
        const taken = extra ? stash(first, extra).state : first;
        return spent(s, sought ? spendSeek(taken) : taken);
      });
    }
    setBattle(null);
    sfx.tap();
  }, [battle]);

  /**
   * 略 A fight is settled before its first blow (fight() above), so watching it is a
   * choice. A tap on the stage, or a key, jumps to the verdict; nothing is decided by it.
   */
  const skipFight = useCallback(() => {
    setBattle((b) => (b && !b.over ? { ...b, beat: beatsIn(b.outcome) - 1, over: true } : b));
  }, []);

  /**
   * 再 The same beast again, from the verdict.
   *
   * rekaris, on the Discord: *"I have to click on the fight, then move mouse on collect,
   * then move back to fight."* Three trips for one kill. The next fight cannot start inside
   * closeFight, because the state that credits this kill has not landed yet and the next
   * fight would be rolled on the old one. So it is remembered, and started by the effect
   * below once the kill is in the state.
   */
  const canAgain = !!battle && !battle.demon && battle.floor === undefined && battle.challenger === undefined
    && !(battle.beast.warden && battle.outcome.won);
  // 續 The verdict stays up until the pace allows the next fight, and the next fight
  // starts before the browser paints (a layout effect), so going again never flashes
  // the hunt list between two fights.
  const holding = useRef(false);
  const fightAgain = useCallback(() => {
    if (!battle?.over || holding.current) return;
    const wait = lastStart.current + PACE_MS - Date.now();
    if (wait > 0) {
      holding.current = true;
      setTimeout(() => { holding.current = false; againRef.current(); }, wait + 5);
      return;
    }
    queued.current = { beast: battle.beast };
    closeFight();
  }, [battle, closeFight]);
  const againRef = useRef(fightAgain);
  againRef.current = fightAgain;
  /**
   * 登 The next floor, from a won floor's verdict (key R). It is Again for the tower: the
   * floor is credited by closeFight, and the next one starts through the same queue and
   * the same pace, so nothing about a climb is faster than tapping 登 Climb each time. A
   * floor that was lost offers only the way out.
   */
  // 擂 For a challenger it is the next challenger, and only after a win: a plain Again would
  // be the same fight on the same dice.
  const nextTier = battle?.challenger !== undefined && battle.challenger < 2 ? (battle.challenger + 1) as Tier : null;
  const canNext = !!battle && !battle.demon && battle.outcome.won
    && (battle.floor !== undefined || nextTier !== null);
  const climbNext = useCallback(() => {
    if (!battle?.over || !battle.outcome.won || holding.current) return;
    if (battle.floor === undefined && nextTier === null) return;
    const wait = lastStart.current + PACE_MS - Date.now();
    if (wait > 0) {
      holding.current = true;
      setTimeout(() => { holding.current = false; nextRef.current(); }, wait + 5);
      return;
    }
    if (battle.floor !== undefined) {
      const f = battle.floor + 1;
      queued.current = { beast: floorBeast(f), floor: f };
    } else if (nextTier !== null) {
      queued.current = { beast: challengerOf(state, nextTier), challenger: nextTier };
    }
    closeFight();
  }, [battle, closeFight, nextTier, state]);
  const nextRef = useRef(climbNext);
  nextRef.current = climbNext;
  useLayoutEffect(() => {
    if (battle || !queued.current) return;
    const wait = lastStart.current + PACE_MS - Date.now();
    if (wait > 0) {
      const id = setTimeout(() => setTick((t) => t + 1), wait + 10);
      return () => clearTimeout(id);
    }
    const q = queued.current;
    queued.current = null;
    // 擂 A queued challenger is rebuilt off the state the win landed in, so it is fought on
    // that state's power and dice, and refused if it is no longer the one standing.
    if (q.challenger !== undefined) startFight(challengerOf(state, q.challenger), undefined, false, q.challenger);
    else startFight(q.beast, q.floor, q.demon);
  }, [battle, startFight, tick]);

  /**
   * 自 The auto-hunt: the same beast, again and again, while the game is open.
   *
   * Bruno: *"sinto que a hunt é um click infinito, e não me parece muito de idle."* It is
   * exactly the player pressing Again: every kill goes through closeFight and the sim, at
   * the hand's pace above, so the numbers, the harnesses and the ranked server see the
   * same game they always did. It never runs with the game hidden (a phone in a pocket is
   * not a hand on it), it stops on a loss, and a warden, a floor and the demon are never
   * fought on their own.
   */
  const [auto, setAuto] = useState<{ beast: Beast; kills: number; from: number } | null>(null);
  /**
   * 熟 The auto-hunt opens for a beast once it is Known: ten kills, this one included.
   * rekaris, on the Discord: keep it as a reward for having learned a beast. Ten and not
   * a hundred, so the first-realm hunt is not a hundred clicks again.
   */
  const autoLeft = battle ? Math.max(0, MARKS[1] - ((state.killed[battle.beast.key] ?? 0) + 1)) : 0;
  const startAuto = useCallback(() => {
    if (!battle || !canAgain || !battle.outcome.won || autoLeft > 0) return;
    setAuto({ beast: battle.beast, kills: 1, from: state.materials });
    fightAgain();
  }, [battle, canAgain, fightAgain, state.materials, autoLeft]);
  const stopAuto = useCallback(() => setAuto(null), []);
  useEffect(() => {
    if (!auto) return;
    const away = () => { if (document.visibilityState === 'hidden') setAuto(null); };
    document.addEventListener('visibilitychange', away);
    return () => document.removeEventListener('visibilitychange', away);
  }, [auto]);
  /** One more kill on the tally, when the auto-hunt takes a won fight and goes again. */
  const autoNext = useCallback(() => {
    setAuto((a) => (a ? { ...a, kills: a.kills + 1 } : a));
    fightAgain();
  }, [fightAgain]);
  /**
   * 自 Auto straight from a Known beast's row on 狩: the same auto-hunt, same rules (Known
   * only, stops on a loss or a hidden page, the hand's pace), started without first
   * fighting one by hand to reach a verdict. Three taps become one.
   */
  const autoFrom = useCallback((beast: Beast) => {
    if (battle || auto || beast.warden || (state.killed[beast.key] ?? 0) < MARKS[1]) return;
    setAuto({ beast, kills: 0, from: state.materials });
    startFight(beast);
  }, [battle, auto, state.killed, state.materials, startFight]);

  /** ▲ 著 Put on every ▲ piece in the chest at once. */
  const onWearAll = useCallback(() => {
    const id = ++taps.current;
    setState((s) => {
      const r = wearBetter(s);
      if (r.worn > 0) once(id, () => { float(QOL.gear.wore(r.worn), 'gold'); burst('gold', null, 12, 64); sfx.buy(); haptics.strike(); });
      return r.state;
    });
  }, []);

  /** 煉 Fuse every group of three until none is left. */
  const onFuseAll = useCallback(() => {
    const id = ++taps.current;
    setState((s) => {
      const r = fuseAllIn(s);
      if (r.state !== s) once(id, () => { float(QOL.gear.fused(r.made.length), 'gold'); burst('gold', null, 16, 80); sfx.breakthrough(); haptics.win(); });
      return r.state;
    });
  }, []);

  const onEquip = useCallback((item: Item) => {
    sfx.buy();
    haptics.tap();
    setState((s) => {
      const next = equipItem(s.worn, s.chest, item, templateOf(item).slot);
      return { ...s, worn: next.worn, chest: [...next.chest] };
    });
  }, []);

  const onUnequip = useCallback((slot: Slot) => {
    setState((s) => {
      const next = unequipItem(s.worn, s.chest, slot, limitFor(s));
      if (next.refused) return s;   // a full chest has nowhere to put it
      return { ...s, worn: next.worn, chest: [...next.chest] };
    });
    sfx.tap();
    haptics.tap();
  }, []);

  /** 煉器 Refining spends material on the place of a piece you are wearing; the level stays with the place. */
  const onRefine = useCallback((slot: Slot) => {
    const id = ++taps.current;
    setState((s) => {
      const next = refine(s, slot);
      if (next === s) return s;
      once(id, () => { float(JUICE.refined, 'gold'); burst('gold', null, 10, 56); sfx.buy(); haptics.strike(); });
      return next;
    });
  }, []);

  const onFuse = useCallback((template: string, rarity: string) => {
    const id = ++taps.current;
    setState((s) => {
      const next = fuseIn(s, template, rarity as Item['rarity']);
      if (!next.made) return s;
      once(id, () => { float(JUICE.fused, 'gold'); burst('gold', null, 16, 80); });
      return next.state;
    });
    sfx.breakthrough();
    haptics.win();
  }, []);

  /**
   * 手 Everything 修 the screen does, applied to the state the app is holding now.
   *
   * It used to take a finished state: the screen computed `buy(state, u)` from the props
   * of its last render and this put it over whatever the clock had done since. The bar
   * survived that, because every second of it is re-derived from the stamp in the save,
   * but anything else that landed inside the same fifth of a second did not. Now the
   * screen hands over the change and the change is applied to the current state, which
   * is the pattern every other handler in this file already used.
   */
  const climb = useCallback((make: (s: State) => State) => {
    setState((s) => make(s));
    sfx.buy();
    haptics.tap();
  }, []);

  /**
   * 突破 And the breakthrough is watched rather than announced.
   *
   * The realm is in the save, so the one moment the game stops for is read off the save
   * changing rather than off the tap that changed it. That is what lets the tap above
   * be a plain function of the state with nothing else riding on it.
   */
  const lastRealm = useRef(0);
  useEffect(() => {
    if (!ready) return;
    if (lastRealm.current === 0) { lastRealm.current = state.realm; return; }
    if (state.realm > lastRealm.current) {
      sfx.breakthrough();
      haptics.breakthrough();
      setBloom(state.realm);
      // A realm that handed something over waits to be read. One that only changed the
      // light does not. 1.4 seconds is right for a colour and wrong for three cards.
      if (opensIn(state.realm).length === 0) setTimeout(() => setBloom(null), 1400);
      // 新 And every tab it put something on wears a dot until it is opened.
      const tabs = newTabsOf(state.realm);
      setState((s) => markFresh(s, tabs));
    }
    lastRealm.current = state.realm;
  }, [state.realm, ready]);

  // 樂 The music starts on the first touch, the only moment a browser allows it, and
  // follows the player: the hunt, a big fight, the heavens, or cultivating.
  useEffect(() => {
    // Every tap, not the first one only: a finger going down is not a gesture a browser
    // will start sound from, and a start that was refused is tried again on the next.
    const go = () => unlockMusic();
    const kinds = ['pointerup', 'click', 'keydown'] as const;
    kinds.forEach((k) => window.addEventListener(k, go));
    return () => kinds.forEach((k) => window.removeEventListener(k, go));
  }, []);
  const fightKind = battle ? (battle.beast.warden || battle.demon ? 'boss' : 'beast') : null;
  const heavens = state.tribulation > 0;
  useEffect(() => { setMood(moodFor({ tab, fight: fightKind, heavens })); }, [tab, fightKind, heavens]);

  /** 拆 Melting one piece, from the sheet where it can be looked at first. */
  const onSalvage = useCallback((id: string) => {
    setState((s) => salvage(s, [id]));
    sfx.buy();
    haptics.strike();
  }, []);

  /** 拆 And the bulk form: everything at or below a rank, in one tap. */
  const onSalvageAll = useCallback((upTo: Rarity) => {
    setState((s) => salvageUpTo(s, upTo));
    burst('jade', null, 14, 70);
    sfx.buy();
    haptics.strike();
  }, []);

  const onUnlock = useCallback((key: string) => {
    const id = ++taps.current;
    setState((s) => {
      const free = freeOf(s);
      if (!canUnlock(key, s.unlocked, free, isOpen(s.realm, 'keystones'), capstonesOpen(s.realm))) return s;
      // 空囊 Not over a chest fuller than the node would let it be. The sheet says why.
      if (capRefuses(s, key) !== null) return s;
      once(id, () => { float(JUICE.learned, 'jade'); burst('jade', null, 14, 70); });
      return { ...s, unlocked: [...s.unlocked, key] };
    });
    sfx.buy();
    haptics.strike();
  }, []);

  // 岔 A held fork of the Path becomes its twin, once a day (sim/fork.ts).
  const onSwap = useCallback((key: string) => {
    setState((s) => swapFork(s, key, s.at, isOpen(s.realm, 'keystones')));
    sfx.buy();
    haptics.strike();
  }, []);

  // A new version of the page is a new version of the game. Nobody installs anything
  // again; they are told, and they choose when.
  useEffect(() => { watchForUpdates(() => setFresh(true)); }, []);
  // 勁 One listener for the whole game: a ripple under every press.
  useEffect(() => { armJuice(); }, []);

  const onStance = useCallback((key: string | null) => {
    setState((s) => ({ ...s, stance: key }));
    sfx.tap();
    haptics.tap();
  }, []);

  const onSequence = useCallback((keys: string[]) => {
    setState((s) => ({ ...s, sequence: keys }));
    sfx.tap();
    haptics.tap();
  }, []);

  /**
   * 新 The next one-time card, if there is one.
   *
   * It is computed rather than fired, so a card the player earned while the app was shut
   * is waiting when they open it, and one they have read can never come back.
   */
  const notice = useMemo(
    // Never behind the 突破 bloom: that moment introduces what the realm opened, and a
    // card saying the same thing underneath it is the game talking over itself.
    //
    // 引 And never while the guide is running, which is the same rule one level up. The
    // guide and the cards both answer "what now", and in the first realm they answered
    // it about the *same thing* at the same moment: the guide's third step saying to go
    // and hunt for material, with a card underneath it saying to go and hunt for
    // material. Nothing is lost by waiting: a card keeps its turn until it is seen.
    () => (ready && !battle && bloom === null && !guide(state) ? nextNotice(state) : null),
    [state, ready, battle, bloom],
  );

  const readNotice = useCallback((key: string, go?: 'hunt' | 'trials' | 'gear' | 'dao' | 'crafts') => {
    setState((s) => (s.seen.includes(key) ? s : { ...s, seen: [...s.seen, key] }));
    if (go) setTab(go);
    sfx.tap();
    haptics.tap();
  }, []);

  const r = realmOf(state.realm);

  /**
   * 指 What the guide is pointing at, right now, on this tab.
   *
   * Three conditions, and all three have to hold or the ring would be a lie:
   *
   *   the guide is still running at all. It ends for good after the fifth step;
   *   the step's target is on the tab being looked at, not one tap away;
   *   and nothing is covering the screen. A ring drawn on a button underneath the
   *   help sheet, the arena or the 突破 bloom points at something the player cannot
   *   reach, which is worse than pointing at nothing.
   */
  const step = guide(state);
  // 相 The question counts as covering: 指 the coach ring is fixed at z-index 60 and would
  // otherwise draw its arrow and its ring straight over the sheet asking it.
  const asking = ready && (whom || !state.seen.includes(WHOM)) && !battle && !help && !prologue && !ranks && !cloudPick;
  /** 收 What hides the corner Menu. The vault, the tally and the cards keep it, as they always did. */
  const shade = help || prologue || ranks || !!cloudPick || key || book || comparing || cards || rebirth || stele || credits || saving || realmPage || menu || !!driving || (pileOpen && state.pile.length > 0)
    || !!inspect || !!home || !!battle || asking
    || locked !== null || bloom !== null;
  /**
   * 悟道 Whether the three cards are on the screen. Never over 突破 the breakthrough: what
   * the realm opened is read first, then the cards, then the tab it opened.
   */
  const cardsUp = owesCard && !awakenShut && bloom === null;
  /**
   * 鍵 What covers the screen, for the keys and the ring. The vault, the tally and the
   * owed cards were missing from it, so 1 to 7 switched the tab underneath them and the
   * guide's ring was drawn on a screen nobody could see.
   */
  const covered = shade || insideSecret(state) || tally || cardsUp;

  // ── 待 What is waiting (quality of life, 2026-10-03) ─────────────────────────────
  // The fight reads and the chest's try-ons are worked out once per change rather than
  // five times a second: the clock moves the qi on every tick and that changes none of them.
  // 業 Not the pouch, which the workshop moves every few seconds: none of these reads it
  // (a tower floor and a common beast are never fought with a kit, and gear is power).
  const heavy = useMemo(() => heavyOf(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...fightDeps(state).filter((d) => d !== state.crafts.pouch), state.chest, state.tower, state.quarryWeek,
      weekOf(state.at)]);
  const waiting = useMemo(() => readyNow(state, heavy), [state, heavy]);
  const byTab = readyByTab(waiting);
  /** 新 The tabs a breakthrough put something on, until each is opened. */
  const newTabs = freshTabs(state);
  useEffect(() => { setState((s) => clearFresh(s, tab)); }, [tab]);
  /** 待 Take a row of the list: its tab, and on 修 the thing itself, brought into view. */
  const goReady = (w: Waiting) => {
    setHome(null);
    sfx.tap();
    if (w.key === 'card') { setAwakenShut(false); setTab('cultivate'); return; }
    setTab(w.tab);
    const at = READY_AT[w.key];
    if (at) {
      window.setTimeout(() => document.querySelector(at)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 90);
    }
  };
  /** 突破 Go to the tab a system just opened on. */
  const goOpened = (place: Place) => { setBloom(null); setTab(place); sfx.tap(); };
  // ── end 待 ──────────────────────────────────────────────────────────────────────
  // 指 On the step's own screen the ring goes on the thing to press. Anywhere else it
  // goes on the tab that leads there: "go and kill the rat" used to point at nothing at
  // all until the player guessed which tab the rat was on.
  const coachAt = !step || covered ? null
    : (step.tab ?? 'cultivate') === tab ? step.at
      : `tab-${step.tab ?? 'cultivate'}`;

  const byKey = useMemo(
    () => Object.fromEntries(BEASTS.map((b) => [b.key, b])) as Record<string, Beast>,
    [],
  );

  // 桌 On a computer the whole window is the realm the cultivator stands in: its own
  // painting, dimmed, behind everything. A phone never draws it (see .backdrop).
  const heavenNow = state.realm === 9 ? heavenAt(state.tribulation) : null;
  const backdrop = (heavenNow && pictureOf('heaven', String(heavenNow.n)))
    ?? pictureOf('realm', String(state.realm));

  /** 出口 What closing means right now: the window on top, or nothing. */
  const panelOut = saving ? () => { setSaving(false); sfx.tap(); }
    : key ? () => { setKey(false); sfx.tap(); }
    : book ? () => { setBook(false); sfx.tap(); }
    : comparing ? () => { setComparing(false); sfx.tap(); }
    : cards ? () => { setCards(false); sfx.tap(); }
    : rebirth ? () => { setRebirth(false); setBorn(false); sfx.tap(); }
    : help ? () => { setHelp(false); sfx.tap(); }
    : ranks ? () => { setRanks(false); sfx.tap(); }
    : inspect ? () => { setInspect(null); sfx.tap(); }
    : driving ? () => { setDriving(null); sfx.tap(); }
    : pileOpen && state.pile.length > 0 ? () => { setPileOpen(false); sfx.tap(); }
    : realmPage ? () => { setRealmPage(false); sfx.tap(); }
    // 碑 謝 The stele and the credits are menu panels like the rest, so they take the same
    // fixed cross and the same Esc. They were left out, and the stele is a long page.
    : stele ? () => { setStele(false); sfx.tap(); }
    : credits ? () => { setCredits(false); sfx.tap(); }
    : null;

  /**
   * 鍵 The keyboard, for whoever has one.
   *
   *   Enter or Space   in a fight: skip to the end; on the verdict: collect.
   *   R                on the verdict: collect and fight the same beast again.
   *   Esc              close the window on top, the menu, or the verdict.
   *   1 to 7           the tabs, in the order the rail shows them.
   *
   * Read from a ref so the listener is bound once and always sees this render.
   */
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return;
    const press = (sel: string) => document.querySelector<HTMLButtonElement>(sel)?.click();
    const go = e.key === 'Enter' || e.key === ' ';
    if (battle && auto) {
      if (go || e.key === 'Escape') { e.preventDefault(); stopAuto(); }
      return;
    }
    if (battle) {
      if (battle.over && (e.key === 'a' || e.key === 'A') && canAgain && battle.outcome.won) {
        e.preventDefault(); press('.verdict .vacts .auto');
        return;
      }
      if (!battle.over) {
        if (go || e.key === 'Escape') { e.preventDefault(); skipFight(); }
      } else if (go || e.key === 'Escape') {
        e.preventDefault(); press('.verdict .vacts .act');
      } else if ((e.key === 'r' || e.key === 'R') && (canAgain || canNext)) {
        e.preventDefault(); press('.verdict .vacts .again');
      }
      return;
    }
    // ── 鍵 The windows that had no keys (quality of life, 2026-10-03) ──────────────
    // A window opened from the Menu sits over all of these, so its own Esc comes first.
    if (!panelOut) {
      const esc = e.key === 'Escape';
      const enter = e.key === 'Enter';
      // 歸 The return card: Enter, Space or Esc carries on.
      if (home) {
        if (go || esc) { e.preventDefault(); setHome(null); sfx.tap(); }
        return;
      }
      if (bloom !== null) {
        if (go || esc) { e.preventDefault(); press('.bloom .act'); }
        return;
      }
      // 秘境 1, 2 and 3 take the doors in the order they stand, ← the first and → the
      // second. Nothing else: walking out ends a run, so it is never a key that could be
      // pressed by accident.
      if (insideSecret(state)) {
        const door = e.key === '1' || e.key === 'ArrowLeft' ? 0 : e.key === '2' || e.key === 'ArrowRight' ? 1
          : e.key === '3' ? 2 : -1;
        if (door >= 0) {
          e.preventDefault();
          document.querySelectorAll<HTMLButtonElement>('.secret .ways .way')[door]?.click();
        }
        return;
      }
      if (tally) {
        if (go || esc) { e.preventDefault(); press('.runend .endcard .act'); }
        return;
      }
      // 悟道 Esc is Later: the card waits, as it always does.
      if (cardsUp) {
        if (esc) { e.preventDefault(); press('.awaken .later'); }
        return;
      }
      // 相 Esc is Not yet.
      if (asking) {
        if (esc) { e.preventDefault(); press('.whom .later'); }
        return;
      }
      // 新 A note at the foot of the screen: Enter reads it, Esc puts it away. Only when
      // nothing else holds the focus, or Enter on a focused button would land here instead.
      const loose = !document.activeElement || document.activeElement === document.body;
      if (notice && !menu && loose && (enter || esc)) {
        e.preventDefault();
        if (enter) press('.notice button');
        else readNotice(notice.key);
        return;
      }
    }
    // ── end 鍵 ──────────────────────────────────────────────────────────────────────
    if (e.key === 'Escape') {
      const shut = panelOut ?? (menu ? () => setMenu(false) : locked !== null ? () => setLocked(null) : null);
      if (shut) { e.preventDefault(); shut(); }
      return;
    }
    if (/^[1-7]$/.test(e.key) && !covered) {
      const n = Number(e.key) - 1;
      if (n === TABS.length) { setRanks(true); sfx.tap(); return; }
      const t = TABS[n];
      if (!t) return;
      if (t.needs !== null && !isOpen(state.realm, t.needs)) setLocked(t.needs);
      else { setTab(t.key); sfx.tap(); }
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="app">
      {backdrop && <div className="backdrop" aria-hidden="true" style={{ backgroundImage: `url(${backdrop})` }} />}
      {/* 屏 The screen names itself in the DOM. A locked tab takes the tap and changes
          nothing, and 註 the tooltip harness was walking the previous screen a second
          time and reporting its characters under the wrong tab's name. */}
      <div className="sheet" key={tab} data-screen={tab}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}>
        {tab === 'cultivate' && (
          <Cultivate
            state={state}
            title={who ? title : null}
            pulse={pulse}
            focus={focus}
            satOut={satOut}
            sitLeft={sitLeft}
            // 坐 Exactly what coming back to the game does: a new sitting from now.
            onSitAgain={() => { sitting.current = begin(now()); setSatOut(false); setSitLeft(FOCUS_HOLD); sfx.tap(); }}
            waiting={waiting}
            onReady={goReady}
            opened={opened}
            set={climb}
            onFight={() => startFight(currentWarden(state))}
            onGo={(next) => { setTab(next); sfx.tap(); }}
            onRealm={() => { setRealmPage(true); sfx.tap(); }}
            owesCard={owesCard}
            onAwaken={() => { setAwakenShut(false); sfx.tap(); }}
            onCards={() => { setCards(true); sfx.tap(); }}
            onRebirth={() => { setRebirth(true); sfx.tap(); }}
            onPlant={(which, key) => { setState((s) => plantSeed(s, which, key)); sfx.buy(); }}
            onHarvest={(which) => { setState((s) => harvestBed(s, which)); sfx.floor(); }}
            onDemon={faceDemon}
            meeting={meeting}
            onMeet={(which) => {
              if (!meeting) return;
              // 據 The answer is pure and seeded, so working it out here gives the same state
              // the updater keeps; the receipt is only what the screen says about it.
              setState((s) => {
                const r = answerWithReceipt(s, meeting.key, which, (s.at ^ s.met.length * 2654435761) | 0);
                if (r.receipt) setMeetDone(r.receipt);
                return r.state;
              });
              sfx.buy();
            }}
            meetDone={meetDone}
            onMeetDone={() => setMeetDone(null)}
            onMeetSee={() => { setMeetDone(null); setTab('gear'); sfx.tap(); }}
          />
        )}
        {tab === 'hunt' && (
          <Hunt
            state={state}
            onFight={(key) => startFight(byKey[key])}
            onDrive={(key) => { setDriving(byKey[key]); sfx.tap(); }}
            onPile={() => { setPileOpen(true); sfx.tap(); }}
            onAuto={(key) => autoFrom(byKey[key])}
            onSecret={() => { setState((s) => enterSecret(s)); sfx.tap(); }}
            onKey={() => { setState((s) => enterSecret(useKey(s))); sfx.buy(); haptics.strike(); }}
          />
        )}
        {tab === 'trials' && <Trials state={state} onFloor={climbTower} onBrew={onBrew}
          onChallenge={challenge} onStance={onStance} towerKit={towerKit}
          onTowerKit={(on) => { setTowerKit(on); sfx.tap(); }} />}
        {tab === 'crafts' && (
          <Crafts state={state}
            onGo={(where) => { setTab(where); sfx.tap(); }}
            onTask={(key) => { setState((s) => setTask(s, key, now())); sfx.tap(); haptics.tap(); }}
            onOrder={(o) => { setState((s) => setOrder(s, o, now())); sfx.buy(); haptics.tap(); }}
            onCarry={(hand, key) => { setState((s) => carry(s, hand, key)); sfx.tap(); }}
            onUse={(key) => { setState((s) => takeSeeking(s, key)); sfx.buy(); }}
            onPlace={(key, on) => { setState((s) => placeArray(s, key, on)); sfx.buy(); }} />
        )}
        {tab === 'gear' && (
          <Gear
            state={state} pulse={pulse}
            upTo={meltUpTo} onUpTo={setMeltUpTo}
            onInspect={(item, wearing) => { setInspect({ item, wearing }); sfx.tap(); }}
            onFuse={onFuse} onRefine={onRefine} onSalvageAll={onSalvageAll}
            onSaveSet={(i, name) => { setState((s) => saveSet(s, i, name)); sfx.buy(); haptics.tap(); }}
            onWearSet={(i) => {
              const id = ++taps.current;
              setState((s) => {
                const r = wearSet(s, i);
                if (r.missing > 0) once(id, () => float(GEAR.setMissing(r.missing), 'gold'));
                return r.state;
              });
              sfx.buy(); haptics.strike();
            }}
            onClearSet={(i) => { setState((s) => clearSet(s, i)); sfx.tap(); }}
            onRenameSet={(i, name) => { setState((s) => renameSet(s, i, name)); sfx.tap(); }}
            onBook={() => { setBook(true); sfx.tap(); }}
            onCompare={() => { setComparing(true); sfx.tap(); }}
            onWearAll={onWearAll} onFuseAll={onFuseAll}
            onAssignTask={(t, i) => { setState((s) => assignTask(s, t, i)); sfx.tap(); haptics.tap(); }}
            onSaveFilter={(f) => { setState((s) => saveFilter(s, f)); sfx.tap(); }}
            onForgetFilter={(i) => { setState((s) => forgetFilter(s, i)); sfx.tap(); }}
            onKeepFilter={(i, on) => { setState((s) => keepFilter(s, i, on)); sfx.tap(); haptics.tap(); }}
            onAdoptFilters={(old) => setState((s) => adoptFilters(s, old))}
          />
        )}
        {tab === 'dao' && (
          <Dao state={state} onUnlock={onUnlock} onSwap={onSwap} onStance={onStance} onSequence={onSequence} />
        )}
      </div>

      {/* 收 One button, not five.
          Five bare characters floating over the corner of a screen that is already
          asking a new player to learn characters is five unanswered questions, and
          Bruno said so: *"fica muito confuso"*. They fold into one, and when it opens
          each one arrives with its name in English beside it, which is the same rule
          the upgrades follow, applied to the one place that had escaped it. */}
      <div className="topband" aria-hidden="true" data-on={scrolled && !covered} />
      <div className="switches" data-open={menu} hidden={shade && !menu}>
        <button className="mainswitch" data-on={menu} aria-expanded={menu}
          aria-label={MENU.label} onClick={() => { setMenu((m) => !m); sfx.tap(); }}>
          {menu ? '✕' : '≡'}
        </button>
        {menu && (
          <div className="switchmenu">
            {([
              ['存', MENU.save, () => setSaving(true)],
              ['?', MENU.help, () => setHelp(true)],
              ['釋', MENU.key, () => setKey(true)],
              ['碑', MENU.stele, () => setStele(true)],
              ['悟', MENU.cards, () => setCards(true)],
              // 轉世 Only once it has ever been possible: before the summit it is a word for nothing.
              ...((canReincarnate(state) || state.lives.length > 0)
                ? [['轉', MENU.rebirth, () => setRebirth(true)] as const] : []),
              ['謝', MENU.credits, () => setCredits(true)],
            ] as const).map(([han, label, go]) => (
              <button key={label} onClick={() => { setMenu(false); go(); sfx.tap(); }}>
                <b className="cjk">{han}</b><span>{label}</span>
              </button>
            ))}
            {/* 報 Out to the testers' Discord, where the build line below goes in the post. */}
            <a href={MENU.discord} target="_blank" rel="noopener noreferrer" onClick={() => { setMenu(false); sfx.tap(); }}>
              <b className="cjk">報</b><span>{MENU.report}</span>
            </a>
            {/* 量 Sound and music: a slider and a mute each (ui/Volume.tsx). */}
            <Volumes />
            <span className="build">{BUILD.label(typeof __BUILD__ === 'string' ? __BUILD__ : 'dev')}</span>
          </div>
        )}
      </div>
      {/* Anywhere else shuts it, which is what a menu that floats over a live game has
          to do or the player is left tapping the game through a list. */}
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}

      <nav className="tabs">
        {/* 門 The logo at the head of the PC rail, as Bruno chose it: the ensō and the
            lettering from the same painting. Hidden on a phone, where the rail is the
            bar along the bottom and the home screen already wears the icon. */}
        <div className="railbrand" aria-label={BRAND.name}>
          <img className="mark" src="./brand/mark.webp" width="240" height="249" alt="" />
          <img className="name" src="./brand/name.webp" width="640" height="100" alt={BRAND.name} />
          <span><b className="cjk">九境</b> {BRAND.line}</span>
        </div>
        {TABS.map((t, i) => {
          const shut = t.needs !== null && !isOpen(state.realm, t.needs);
          // 點 An unspent 道 point is money on the floor, and the screen it is spent on
          // is three taps and a scroll away. So the tab carries the count: the one place
          // a player looking at any other screen will see it.
          const owed = t.key === 'dao' && !shut && isOpen(state.realm, 'tree') ? free : 0;
          // 待 Something ready on this tab: a dot, and the sentences in its label. Not on the
          // tab being looked at, and not the 道 points, which wear their own count.
          const here = shut ? [] : (byTab[t.key] ?? []).filter((w) => w.key !== 'points');
          const dot = here.length > 0 && tab !== t.key;
          // 新 A tab the last breakthrough put something on, until it is opened.
          const isNew = !shut && tab !== t.key && newTabs.includes(t.key);
          const opened = isNew ? opensIn(state.realm).filter((x) => TAB_OF[x.key] === t.key).map((x) => x.name) : [];
          const says = [
            ...(dot ? here.map((w) => w.long) : []),
            ...(isNew ? [OPENED.tabNew(opened.join(', '))] : []),
            ...(owed > 0 ? [DAO.freePoints(owed)] : []),
          ];
          const label = says.length ? READY.tabSays(t.label, says.join(' ')) : undefined;
          return (
            <button
              key={t.key}
              data-on={tab === t.key}
              data-shut={shut}
              data-coach={`tab-${t.key}`}
              data-ready={dot || undefined}
              data-new={isNew || undefined}
              aria-label={label}
              title={label}
              onClick={() => (shut ? setLocked(t.needs) : setTab(t.key))}
            >
              {/* 鍵 The key that opens it, on a computer's rail. */}
              <kbd className="tabkey" aria-hidden="true">{i + 1}</kbd>
              {dot && <i className="readydot" aria-hidden="true" />}
              {isNew && <i className="newdot" aria-hidden="true"><b className="cjk">新</b> {OPENED.newWord}</i>}
              {/* A locked tab keeps its own character and swaps its name for the realm
                  that opens it. Four identical padlocks in a row say nothing.
                  譯 It says the realm's *number* and not its name. 化神 sat under 塔 on
                  every screen in the game, in Chinese and nothing else, which is the
                  complaint Bruno made in its purest form: a permanent label nobody who
                  does not read Chinese can read. The realm page still names it. */}
              <span className="g cjk">
                {t.han}
                {owed > 0 && <i className="owed" title={DAO.freePoints(owed)}>{owed}</i>}
              </span>
              <span className="l">{shut ? TABS_COPY.opensAt(systemInfo(t.needs!).realm) : t.label}</span>
              {/* 名 On the PC rail there is room for the name as well as the realm that
                  opens it, and three rows reading REALM 5, REALM 2, REALM 2 said nothing. */}
              {shut && <span className="ln">{t.label}</span>}
            </button>
          );
        })}
        {/* 榜 The rankings are a tab, not a line in the corner menu. Bruno: *"os rankings
            devem aparecer como destaque e não escondido no menu."* It opens the same
            panel the menu did, it is never locked, and once the player is on the board
            it carries their place, the way 道 carries its unspent points. */}
        <button className="ranktab" data-on={ranks} data-coach="tab-ranks"
          aria-label={place ? RANKS.tabPlace(place) : RANKS.tab}
          onClick={() => { setRanks(true); sfx.tap(); }}>
          <kbd className="tabkey" aria-hidden="true">{TABS.length + 1}</kbd>
          <span className="g cjk">
            榜
            {place !== null && <i className="owed rankplace">#{place}</i>}
          </span>
          <span className="l">{RANKS.tab}</span>
        </button>
      </nav>

      {locked && (
        <div className="shut" onClick={() => setLocked(null)}>
          <b className="cjk" style={{ color: realmInfo(systemInfo(locked).realm).colour }}>
            {systemInfo(locked).han}
          </b>
          <em>{systemInfo(locked).name}</em>
          <i>{systemInfo(locked).gives}</i>
          <p>{LOCKED.opensAt(
            realmInfo(systemInfo(locked).realm).han,
            realmInfo(systemInfo(locked).realm).name,
            systemInfo(locked).realm,
          )}</p>
          <button className="act" onClick={() => setLocked(null)}>續 <span>{LOCKED.back}</span></button>
        </div>
      )}

      {/**
        * 出口 One way out, drawn here rather than by each panel, so it is fixed to the
        * viewport and cannot scroll away. See ui/Escape.tsx for the measurement that
        * made it: every panel buried its exit at 91–98% of its own height, and 釋 the
        * key was 4419px tall.
        *
        * 戰 The arena is deliberately not in this list. It has 退 Withdraw, which is a
        * decision about a fight, and a cross beside it would read as a second, safer
        * way out of the same thing. 歸 the return card is one button and no scroll.
        */}
      {panelOut && <Escape onClose={panelOut} />}

      {/* 外 On a computer a window floats over the game, and a click beside it used to
          land on the game underneath: the hunt list, mid-fight. The veil takes that
          click and does what the window's own button would. A phone never draws it,
          because there every window covers the whole screen. */}
      {(battle || panelOut) && (
        <div className="veil" aria-hidden="true" onClick={() => {
          if (battle) {
            if (!battle.over) skipFight();
            else document.querySelector<HTMLButtonElement>('.verdict .vacts .act')?.click();
          } else panelOut?.();
        }} />
      )}

      {battle && (
        <Arena
          battle={battle}
          state={state}
          pulse={pulse}
          overflow={battle.outcome.won && battle.drop && state.chest.length >= limitFor(state)
            ? stash(state, battle.drop) : null}
          onClose={() => closeFight()}
          onAgain={canAgain ? fightAgain : undefined}
          onNext={canNext ? climbNext : undefined}
          onWearDrop={() => closeFight(true)}
          onSkip={skipFight}
          auto={auto && auto.beast.key === battle.beast.key && battle.floor === undefined && !battle.demon
            && battle.challenger === undefined
            ? { kills: auto.kills, gained: Math.max(0, state.materials - auto.from) } : null}
          onAuto={canAgain && battle.outcome.won && !auto && autoLeft === 0 ? startAuto : undefined}
          autoLeft={canAgain && battle.outcome.won && !auto ? autoLeft : 0}
          onAutoNext={autoNext}
          onStop={stopAuto}
        />
      )}

      {bloom !== null && (
        <div className="bloom" data-held={opensIn(bloom).length > 0}
             style={{ color: realmOf(bloom).colour }}>
          <span className="wash" />
          <span className="ring" /><span className="ring" /><span className="ring" />
          <div className="mid">
            <span className="han" style={{ color: realmOf(bloom).colour }}>{realmOf(bloom).han}</span>
            <p>{realmOf(bloom).gains}</p>
            {opensIn(bloom).length > 0 && (
              <>
                {/* 突破 Each row names the tab it is on and goes there. The cards wait until
                    this has been read (see cardsUp), and every tab named here wears 新 until
                    it is opened. */}
                <p className="openedhead">{OPENED.head}</p>
                <div className="opened">
                  {opensIn(bloom).map((sys) => {
                    const place = TAB_OF[sys.key];
                    const t = TABS.find((x) => x.key === place)!;
                    return (
                      <button key={sys.key} type="button" className="openedrow" onClick={() => goOpened(place)}>
                        <b className="cjk">{sys.han}</b>
                        <em>{sys.name}</em>
                        <i>{sys.gives}</i>
                        <u className="openedtab">{OPENED.where(t.han, t.label)}</u>
                      </button>
                    );
                  })}
                </div>
                <button className="act" onClick={() => { setBloom(null); sfx.tap(); }}>
                  續 <span>{BLOOM.on}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="notice">
          <b className="cjk">{notice.han}</b>
          <span>
            <em>{notice.title}</em>
            <i>{notice.text}</i>
          </span>
          <button onClick={() => readNotice(notice.key, notice.tab)}>{NOTICE.read}</button>
        </div>
      )}

      {fresh && (
        <div className="newver">
          <span>
            <b className="cjk">新</b>
            <i>{UPDATE.ready}</i>
          </span>
          <button onClick={takeUpdate}>{UPDATE.take}</button>
          <button className="later" onClick={() => setFresh(false)} aria-label={UPDATE.later}>✕</button>
        </div>
      )}

      {ranks && (
        <Ranks
          who={who}
          synced={synced}
          syncedAt={syncedAt}
          syncError={syncError}
          onEnter={async (w, name) => {
            setWho(w); sfx.mark();
            // 雲 An email account may already hold a cultivator from another device: look
            // before offering this one, and ask if the cloud's is further along.
            if (!w.guest) {
              const got = await cloud.pull().catch(() => null);
              const there = got?.save ? importSave(JSON.stringify(got.save), now()).state : null;
              if (there && progressOf(there) > progressOf(latest.current)) {
                setRanks(false);
                setCloudPick({ there, here: latest.current });
                return;
              }
            }
            void push(name || undefined);
          }}
          onSignOut={() => { void cloud.signOut(); setWho(null); setSynced(null); sfx.tap(); }}
          onClose={() => { setRanks(false); sfx.tap(); }}
        />
      )}
      {cloudPick && (
        <CloudPick
          there={RANKS.where(cloudPick.there.realm, cloudPick.there.layer)}
          here={RANKS.where(cloudPick.here.realm, cloudPick.here.layer)}
          onTake={() => {
            keepSpare(cloudPick.here);
            setState(cloudPick.there); save(cloudPick.there);
            setCloudPick(null); void push(); sfx.mark();
          }}
          onKeep={() => { keepSpare(cloudPick.there); setCloudPick(null); void push(); sfx.tap(); }}
        />
      )}
            {prologue && (
        <Prologue sky={pictureOf('realm', '1')} onDone={() => { setPrologue(false); sfx.tap(); }}
          onHaveOne={() => { setPrologue(false); setRanks(true); sfx.tap(); }} />
      )}
      {help && (
        <Help
          onClose={() => { setHelp(false); sfx.tap(); }}
          onWhom={() => { setWhom(true); setHelp(false); sfx.tap(); }}
          onReopenGuide={state.seen.includes(DISMISSED)
            ? () => {
              setState((s) => ({ ...s, seen: s.seen.filter((k) => k !== DISMISSED) }));
              setHelp(false);
              setTab('cultivate');
              sfx.tap();
            }
            : undefined}
        />
      )}
      {key && <Key onClose={() => { setKey(false); sfx.tap(); }} />}
      {book && <Schools state={state} onClose={() => { setBook(false); sfx.tap(); }} />}
      {/* 較 A tap on a row puts that outfit on through wearPieces, the path a loadout takes,
          so 承 refining moves with the place on the body as it does on the gear screen. */}
      {comparing && (
        <Compare state={state}
          onWear={(ids) => {
            const id = ++taps.current;
            setState((s) => {
              const r = wearPieces(s, ids);
              if (r.missing > 0) once(id, () => float(GEAR.setMissing(r.missing), 'gold'));
              return r.state;
            });
            sfx.buy(); haptics.strike();
          }}
          onClose={() => { setComparing(false); sfx.tap(); }} />
      )}
      {rebirth && (
        <Rebirth state={state} born={born}
          onClose={() => { setRebirth(false); setBorn(false); sfx.tap(); }}
          onReborn={() => {
            setState((s) => reincarnate(s, now()));
            setBorn(true);
            setTab('cultivate');
            burst('gold', null, 22, 150);
            sfx.breakthrough(); haptics.win();
          }} />
      )}
      {cards && (
        <Cards state={state} onClose={() => { setCards(false); sfx.tap(); }}
          onTrade={(i, key) => {
            const id = ++taps.current;
            setState((s) => {
              const r = retrade(s, i, key);
              if (!r.refused) once(id, () => { float(AWAKEN.hand.traded(cardOf(key)?.name ?? ''), 'gold'); sfx.buy(); haptics.strike(); });
              return r.state;
            });
          }} />
      )}

      {/* 相 Asked once, before anything else, and reopened from 助 the help sheet. It is
          shown while the answer is null, so a save that has never been asked asks, and a
          save that answered never sees it again unless it is sent for. */}
      {/* 序 Never over 助 the help sheet, which opens by itself on a first run: the
          screenshot of the two together had the help sheet's own ✕ floating over the
          question, which reads as a way out of the question. It waits its turn. */}
      {asking && (
        <Figure
          realm={state.realm}
          sky={pictureOf('realm', String(state.realm))}
          chosen={state.self}
          onPick={(who) => {
            setState((s) => ({ ...s, self: who, seen: s.seen.includes(WHOM) ? s.seen : [...s.seen, WHOM] }));
            setWhom(false);
            sfx.mark();
            haptics.tap();
          }}
          onClose={() => {
            // 影 Not yet is an answer too: the *asking* is what is remembered, not the
            // answer, so declining leaves 相 null and the shape on the screen and the
            // question does not come back on every load. `self` could not carry that
            // itself: validate() throws away anything that is not one of the two.
            setState((s) => (s.seen.includes(WHOM) ? s : { ...s, seen: [...s.seen, WHOM] }));
            setWhom(false);
            sfx.tap();
          }}
        />
      )}

      {/* 圍 A drive. The sim hands back the best piece that fell and leaves the chest
          alone on purpose: two hundred kills can roll forty pieces, and forty pieces
          poured into a chest that holds a dozen is a sorting job, not a reward. The
          app is what decides whether the one worth keeping fits. */}
      {driving && (
        <Drive
          state={state}
          beast={driving}
          seed={Math.floor(Math.random() * 0xffffffff)}
          onTake={(result) => {
            // 圍 What fell goes on the table (sim/pile.ts), and the player chooses; until they do the
            // save holds it, and a day later the game answers as it always did.
            setState(() => holdDrops(result.state, result));
            sfx.mark();
            haptics.tap();
          }}
          onSettle={(choice) => { setState((s) => settlePile(s, choice)); sfx.buy(); }}
          onGame={() => { setState((s) => settleDefault(s)); sfx.tap(); }}
          onClose={() => { setDriving(null); sfx.tap(); }}
        />
      )}

      {/* 圍 And pieces still waiting when no drive sheet is open: the game was shut when the drive
          ended, or the sheet was put away. They are in the save, so the window opens on them. */}
      {!driving && pileOpen && state.pile.length > 0 && (
        <PileSheet
          state={state}
          onSettle={(choice) => { setState((s) => settlePile(s, choice)); sfx.buy(); }}
          onGame={() => { setState((s) => settleDefault(s)); sfx.tap(); }}
          onClose={() => { setPileOpen(false); sfx.tap(); }}
        />
      )}

      {/* 鑑 Looking at a piece, which is now what a tap on one does. Wearing it is a
          button on the sheet: a blind tap that swapped your gear was the whole of
          Bruno's complaint about the inventory. */}
      {inspect && (
        <ItemSheet
          state={state}
          item={inspect.item}
          wearing={inspect.wearing}
          onWear={() => { onEquip(inspect.item); setInspect(null); }}
          onTakeOff={() => { onUnequip(templateOf(inspect.item).slot); setInspect(null); }}
          onSalvage={() => { onSalvage(inspect.item.id); setInspect(null); }}
          onLock={(on) => {
            setState((s) => lockPiece(s, inspect.item.id, on));
            setInspect({ ...inspect, item: on ? { ...inspect.item, locked: true } : (({ locked: _l, ...rest }) => rest)(inspect.item) });
            sfx.tap();
          }}
          onClose={() => { setInspect(null); sfx.tap(); }}
        />
      )}

      {realmPage && (
        <RealmCard state={state} onClose={() => { setRealmPage(false); sfx.tap(); }} />
      )}

      {/* 秘境 On the screen for as long as the walker is inside, which is a number in
          the save. Closing the app in room four comes back to room four. */}
      {insideSecret(state) && (
        <Secret
          state={state}
          onOpen={(door) => {
            setState((s) => openByKind(s, door, (s.at ^ (s.runs * 40503) ^ (s.runStep * 7)) | 0));
            sfx.strike();
          }}
          onLeave={() => { setState((s) => leaveSecret(s)); sfx.tap(); }}
        />
      )}

      {/* 出 What the run gave, in total, once it has ended. */}
      {tally && !insideSecret(state) && (
        <Tally state={state} onClose={() => { setTally(false); sfx.tap(); }} />
      )}

      {/* 悟道 Raised by the save rather than by an event: if a choice is owed and the
          player has not put it aside, the three cards are on the screen. */}
      {cardsUp && (
        <Awaken
          state={state}
          onTake={(key) => {
            setState((s) => ({ ...s, awakened: [...takeAwakening(s.realm, s.awakened, key, s.tribulation)] }));
            setAwakenShut(false);
            sfx.awaken();
          }}
          onClose={() => { setAwakenShut(true); sfx.tap(); }}
        />
      )}

      {stele && (
        <div className="stelepage">
          <Chronicle state={state} pulse={pulse} />
          <button className="act" style={{ marginTop: 18 }}
            onClick={() => { setStele(false); sfx.tap(); }}>
            續 <span>Back</span>
          </button>
        </div>
      )}

      {credits && <Credits onClose={() => { setCredits(false); sfx.tap(); }} />}

      {saving && (
        <SavePanel
          state={state}
          who={who}
          onRestore={(next) => { setState(next); save(next); keepSpare(next); }}
          onClose={() => { setSaving(false); sfx.tap(); }}
        />
      )}

      {home && (
        <div className="back">
          {/* 勁 The qi the hours gathered comes back in as light, and the numbers count up
              to what they are rather than simply being there. */}
          <Svg className="backfig" html={portraitLayers({ realm: state.realm, pulse, who: state.self })} style={{ display: 'block', width: 150, height: 150 }} />
          <h2 style={{ color: r.colour }}>歸</h2>
          <p className="faint" style={{ margin: 0, fontSize: 14 }}>
            {RETURN.away(duration(home.seconds))}
          </p>
          <dl>
            <dt>{RETURN.qi}</dt>
            <dd style={{ color: r.colour }}><CountUp to={home.qi} delay={250} /></dd>
            {home.layers > 0 && (<><dt>{RETURN.layers}</dt><dd><CountUp to={home.layers} ms={900} delay={450} /></dd></>)}
            {home.realms > 0 && (<><dt>{RETURN.realms}</dt><dd style={{ color: 'var(--cinnabar)' }}>{home.realms}</dd></>)}
            <dt>{RETURN.power}</dt>
            <dd>{num(power(state))}</dd>
          </dl>
          {/* 階 Said out loud, because the bar is lower than they left it and the qi
              that is missing from it is standing in the rungs above. */}
          {home.climbed > 0 && (
            <p className="faint" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
              {RETURN.spent(num(home.climbed))}
            </p>
          )}
          {/* 業 What the workshop did while nobody was watching it, and why it stood still
              when it did, including the nights it made nothing at all. */}
          {home.crafts && workshopLines(home.crafts).length > 0 && (
            <p className="backcraft">
              <b className="cjk">業</b> {workshopLines(home.crafts).join(' ')}
            </p>
          )}
          {/* 待 What is waiting now, each row a way straight to it. */}
          {waiting.length > 0 && (
            <div className="backwait">
              <h3>{READY.head}</h3>
              {waiting.map((w) => {
                const t = TABS.find((x) => x.key === w.tab)!;
                return (
                  <button key={w.key} type="button" className="backrow" onClick={() => goReady(w)}>
                    <b className="cjk">{w.han}</b>
                    <span>{w.long}</span>
                    <em>{READY.onTab(t.han, t.label)}</em>
                  </button>
                );
              })}
            </div>
          )}
          <button className="act" style={{ maxWidth: 240 }} onClick={() => { setHome(null); sfx.tap(); }}>
            續 <span>Continue</span>
          </button>
        </div>
      )}

      {/* 指 Last in the tree and inert to the touch: it draws over the game without ever
          taking the tap it is asking the player to make. */}
      <Coach at={coachAt} />
    </div>
  );
}
