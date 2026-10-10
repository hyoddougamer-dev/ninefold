import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { capRefuses, fuseIn, limitFor, stash } from '../sim/stash.ts';
import { pictureOf } from '../data/pictures.ts';
import { heavenAt } from '../data/heavens.ts';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { realm as realmOf } from '../data/realms.ts';
import { currentWarden } from '../sim/combat.ts';
import { newState, type State,
} from '../sim/state.ts';
import { keepSpare, load, save, untouched} from '../sim/save.ts';
import { freePoints as freeOf } from '../sim/points.ts';
import { FOCUS_HOLD, LAYERS_PER_REALM } from '../sim/balance.ts';
import { begin, endOf, focusOf, isOver } from './sitting.ts';
import { now, payTo } from './clock.ts';
import { useSitting } from './useSitting.ts';
import { useSave } from './useSave.ts';
import { useCloud } from './useCloud.ts';
import { useOverlays } from './useOverlays.ts';
import { useOnce } from './useOnce.ts';
import { useFight } from './useFight.ts';
import { capstonesOpen, focusBonus } from '../sim/dao.ts';
import { templateOf, type Item, type Rarity, type Slot } from '../data/gear.ts';
import { equip as equipItem, unequip as unequipItem } from '../sim/chest.ts';
import { brew, refine } from '../sim/trials.ts';
import {
  carry, placeArray, setOrder, setTask, takeSeeking,
} from '../sim/crafts.ts';
import { Crafts } from './screens/Crafts.tsx';
import type { Away } from '../sim/save.ts';
import { AWAKEN, GEAR } from './copy.ts';
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
import { answerWithReceipt, meetingDue } from '../sim/meet.ts';
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
import { reincarnate } from '../sim/rebirth.ts';
import { retrade } from '../sim/retrade.ts';
import { Schools } from './ui/Schools.tsx';
import { Compare } from './ui/Compare.tsx';
import { Coach } from './ui/Coach.tsx';
import { SteleSheet } from './ui/SteleSheet.tsx';
import { TabBar } from './ui/TabBar.tsx';
import { HomeCard } from './ui/HomeCard.tsx';
import { TABS, type TabKey } from './tabs.ts';
import { SavePanel } from './ui/SavePanel.tsx';
import { Escape } from './ui/Escape.tsx';
import { Arena } from './ui/Arena.tsx';
import { JUICE, RANKS } from './copy.ts';
// 便 The quality-of-life batch B: bulk buttons, the next floor, wear it from the verdict.
import { QOL } from './copy.ts';
import { recall, keep, oneOf, useRemembered } from './prefs.ts';
import { RARITIES } from '../data/gear.ts';
import { brewMax } from '../sim/trials.ts';
import { wearBetter } from '../sim/inspect.ts';
import { fuseAllIn } from '../sim/stash.ts';

import { haptics } from './haptics.ts';
import { sfx } from './sound.ts';
import { moodFor, setMood, unlockMusic } from './music.ts';
import { MainSwitch } from './ui/MainSwitch.tsx';
import { Breakthrough } from './ui/Breakthrough.tsx';
import { LockedSystem } from './ui/LockedSystem.tsx';
import { NoticeCard, UpdateBar } from './ui/Notices.tsx';
import { takeUpdate, watchForUpdates } from './updates.ts';
import { nextNotice } from './notices.ts';
import { DISMISSED, guide } from './guide.ts';
import { isOpen, opensIn } from '../sim/unlocks.ts';
// ── 待 What is waiting, the keys and the sitting (quality of life, 2026-10-03) ──
import { heavyOf, ready as readyNow, readyByTab, type Place, type Waiting } from './ready.ts';
import { clearFresh, freshTabs, markFresh, newTabsOf } from './fresh.ts';
import { spendablePoints } from '../sim/points.ts';
import { fightDeps } from './memo.ts';
import { weekOf } from '../sim/week.ts';


/** 待 Where on its screen a row of the waiting list is, so taking it brings it into view. */
const READY_AT: Partial<Record<Waiting['key'], string>> = {
  beds: '.cave', demon: '.seclude', road: '.meet', breakthrough: '[data-coach="breakthrough"]',
  cross: '[data-ready="cross"]', vault: '.door.open', workshop: '.ctask', upgrades: '.chestfilter .ups',
  chestFull: '.melting', melt: '.melting',
};


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
  const [home, setHome] = useState<Homecoming | null>(null);
  const [pulse, setPulse] = useState(0);
  const [ready, setReady] = useState(false);
  const {
    help, setHelp, prologue, setPrologue, key, setKey, book, setBook, comparing, setComparing,
    cards, setCards, rebirth, setRebirth, stele, setStele, credits, setCredits, saving, setSaving,
    menu, setMenu, realmPage, setRealmPage, awakenShut, setAwakenShut, whom, setWhom,
    meetDone, setMeetDone, driving, setDriving, pileOpen, setPileOpen, inspect, setInspect,
    fresh, setFresh, bloom, setBloom, locked, setLocked, tally, setTally,
  } = useOverlays();
  const [born, setBorn] = useState(false);
  /** 拆 The rank the bulk melt reaches up to. It lives here so it survives a tab. */
  // 記 Remembered on the device: it used to reset to Common on every load ("Melt 0 pieces").
  const [meltUpTo, setMeltUpToRaw] = useState<Rarity>(() => recall('melt.upTo', 'common', oneOf(RARITIES)));
  const setMeltUpTo = useCallback((r: Rarity) => { setMeltUpToRaw(r); keep('melt.upTo', r); }, []);

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
  const { tap, once } = useOnce();
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
  const latest = useSave(born, state);

  const {
    ranks, setRanks, who, setWho, synced, setSynced, syncedAt, syncError,
    cloudPick, setCloudPick, title, place, push,
  } = useCloud(ready, latest);

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

  const {
    battle, startFight, faceDemon, challenge, climbTower, closeFight, skipFight,
    canAgain, fightAgain, canNext, climbNext, auto, startAuto, stopAuto, autoNext, autoFrom, autoLeft,
  } = useFight(state, setState, towerKit, tap, once);

  const onBrew = useCallback((line: Line, max = false) => {
    const id = tap();
    setState((s) => {
      // 盡 ×Max brews as many as can be paid for, each at its own price (brewMax).
      const next = max ? brewMax(s, line).state : brew(s, line);
      if (next === s) return s;
      once(id, () => { sfx.brew(); haptics.win(); });
      return next;
    });
  }, []);

  /** ▲ 著 Put on every ▲ piece in the chest at once. */
  const onWearAll = useCallback(() => {
    const id = tap();
    setState((s) => {
      const r = wearBetter(s);
      if (r.worn > 0) once(id, () => { float(QOL.gear.wore(r.worn), 'gold'); burst('gold', null, 12, 64); sfx.buy(); haptics.strike(); });
      return r.state;
    });
  }, []);

  /** 煉 Fuse every group of three until none is left. */
  const onFuseAll = useCallback(() => {
    const id = tap();
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
    const id = tap();
    setState((s) => {
      const next = refine(s, slot);
      if (next === s) return s;
      once(id, () => { float(JUICE.refined, 'gold'); burst('gold', null, 10, 56); sfx.buy(); haptics.strike(); });
      return next;
    });
  }, []);

  const onFuse = useCallback((template: string, rarity: string) => {
    const id = tap();
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
    const id = tap();
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
              const id = tap();
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

      <MainSwitch state={state} menu={menu} setMenu={setMenu} scrolled={scrolled} covered={covered} shade={shade}
        setSaving={setSaving} setHelp={setHelp} setKey={setKey} setStele={setStele} setCards={setCards}
        setRebirth={setRebirth} setCredits={setCredits} />

      <TabBar state={state} tab={tab} setTab={setTab} setLocked={setLocked} byTab={byTab} free={free}
        newTabs={newTabs} ranks={ranks} setRanks={setRanks} place={place} />

      {locked && <LockedSystem system={locked} onBack={() => setLocked(null)} />}

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

      {bloom !== null && <Breakthrough realm={bloom} onGo={goOpened} onDone={() => { setBloom(null); sfx.tap(); }} />}

      {notice && <NoticeCard notice={notice} onRead={() => readNotice(notice.key, notice.tab)} />}

      {fresh && <UpdateBar onTake={takeUpdate} onLater={() => setFresh(false)} />}

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
            const id = tap();
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
            const id = tap();
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

      {stele && <SteleSheet state={state} pulse={pulse} onBack={() => { setStele(false); sfx.tap(); }} />}

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
        <HomeCard state={state} pulse={pulse} home={home} waiting={waiting} goReady={goReady} colour={r.colour}
          onContinue={() => { setHome(null); sfx.tap(); }} />
      )}

      {/* 指 Last in the tree and inert to the touch: it draws over the game without ever
          taking the tap it is asking the player to make. */}
      <Coach at={coachAt} />
    </div>
  );
}
