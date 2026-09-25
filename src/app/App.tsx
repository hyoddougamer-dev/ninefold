import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pictureOf } from '../data/pictures.ts';
import { heavenAt } from '../data/heavens.ts';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { realm as realmOf } from '../data/realms.ts';
import { currentWarden, fight, takeKill } from '../sim/combat.ts';
import { canFightWarden, newState, power, type State,
} from '../sim/state.ts';
import { duration, num } from '../sim/format.ts';
import { keepSpare, load, save, untouched} from '../sim/save.ts';
import { advance } from '../sim/time.ts';
import { freePoints as freeOf } from '../sim/points.ts';
import { fortuneOf } from '../sim/fortune.ts';
import { FOCUS_HOLD, focusAt } from '../sim/balance.ts';
import { focusBonus } from '../sim/dao.ts';
import { portrait } from '../art/aura.ts';
import { templateOf, type Item, type Rarity, type Slot } from '../data/gear.ts';
import { addToChest, chestLimit, equip as equipItem, fuse, unequip as unequipItem } from '../sim/chest.ts';
import { rollDrop } from '../sim/drops.ts';
import { brew, clearFloor, floorQi, refine, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { marksOf } from '../sim/record.ts';
import type { Line } from '../data/alchemy.ts';
import { affinity, canUnlock, dropsRankUp, fuseQuality } from '../sim/dao.ts';
import { salvage, salvageUpTo } from '../sim/salvage.ts';
import { RARITIES, wornTotals } from '../data/gear.ts';
import { Dao } from './screens/Dao.tsx';
import { Gear } from './screens/Gear.tsx';
import { Hunt } from './screens/Hunt.tsx';
import { Cultivate } from './screens/Cultivate.tsx';
import { Prologue } from './ui/Prologue.tsx';
import { armJuice, burst, centreOf, float } from './juice.ts';
import { Trials } from './screens/Trials.tsx';
import { Help } from './ui/Help.tsx';
import { Key } from './ui/Key.tsx';
import { RealmCard } from './ui/RealmCard.tsx';
import { Awaken } from './ui/Awaken.tsx';
import { Figure } from './ui/Figure.tsx';
import { WHOM } from '../data/figures.ts';
import { cardDue as awakeningDue, take as takeAwakening } from '../sim/awaken.ts';
import { answer as answerMeeting, meetingDue } from '../sim/meet.ts';
import { harvest as harvestBed, plant as plantSeed } from '../sim/cave.ts';
import {
  enter as enterSecret, inside as insideSecret, leave as leaveSecret, open as openDoor,
} from '../sim/secret.ts';
import { Secret, Tally } from './ui/Secret.tsx';
import { Drive } from './ui/Drive.tsx';
import { ItemSheet } from './ui/ItemSheet.tsx';
import { Coach } from './ui/Coach.tsx';
import { Chronicle } from './screens/Chronicle.tsx';
import { SavePanel } from './ui/SavePanel.tsx';
import { Escape } from './ui/Escape.tsx';
import { Svg } from './ui/Svg.tsx';
import { Arena, BEAT_MS, beatsIn, type Battle } from './ui/Arena.tsx';
import { JUICE, RETURN, TABS_COPY } from './copy.ts';
import { haptics } from './haptics.ts';
import { LEVELS, cycleSound, soundLevel, sfx } from './sound.ts';
import { takeUpdate, watchForUpdates } from './updates.ts';
import { nextNotice } from './notices.ts';
import { DISMISSED, guide } from './guide.ts';
import { isOpen, opensIn, systemInfo, type System } from '../sim/unlocks.ts';
import { realm as realmInfo } from '../data/realms.ts';
import { NOTICE } from './copy.ts';
import { BLOOM, DAO, LOCKED, MENU, UPDATE } from './copy.ts';

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
  { key: 'trials', han: '塔', label: 'Trials', needs: 'tower' },
  { key: 'gear', han: '器', label: 'Gear', needs: 'gear' },
  { key: 'dao', han: '道', label: 'Path', needs: 'arts' },
] as const satisfies readonly { key: string; han: string; label: string; needs: System | null }[];

type TabKey = (typeof TABS)[number]['key'];

const now = () => Date.now() / 1000;

/** The chest's size for a given state, counting the tree and the 藏 rolls on gear. */
function limitOf(s: State): number {
  const capacity = wornTotals(s.worn, (slot) => affinity(s.unlocked, slot)).capacity;
  return chestLimit(s.unlocked, capacity, s.awakened);
}

interface Homecoming {
  readonly seconds: number;
  readonly qi: number;
  /** 階 How much of the gathered qi the ladder took on the way, which is never a loss. */
  readonly climbed: number;
  readonly layers: number;
  readonly realms: number;
}

export function App() {
  const [tab, setTab] = useState<TabKey>('cultivate');
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
  // 碑 The stele. A page you visit, not a loop you run, so it lives on the header rather
  // than taking a sixth place in a tab bar that has to fit on a phone.
  const [stele, setStele] = useState(false);
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
  const [driving, setDriving] = useState<Beast | null>(null);
  // 鑑 The piece being looked at, and whether it is the one on the body.
  const [inspect, setInspect] = useState<{ item: Item; wearing: boolean } | null>(null);
  const [fresh, setFresh] = useState(false);
  const [sound, setSound] = useState(soundLevel);
  /** 突破 The breakthrough moment: the realm just left, held for its animation. */
  const [bloom, setBloom] = useState<number | null>(null);
  /** 鎖 A tab the realm has not opened yet, held for the panel that says so. */
  const [locked, setLocked] = useState<System | null>(null);
  /** 拆 The rank the bulk melt reaches up to. It lives here so it survives a tab. */
  const [meltUpTo, setMeltUpTo] = useState<Rarity>('common');
  /**
   * 出 Whether the end of a run is on the screen.
   *
   * The tally itself is in the save, because it is a record of what the rooms already
   * paid. This is only whether the player has read it yet, which is a screen's worth of
   * state and not a save's: closing the app in room five and coming back tomorrow comes
   * back to the game, not to yesterday's receipt.
   */
  const [tally, setTally] = useState(false);

  /** 點 道 points earned and not yet spent. The tab bar wears the count, and 示 the
      line of advice reads the same number. See sim/points.ts. */
  const free = freeOf(state);
  /** 悟道 Whether a breakthrough still owes this cultivator a card. Derived, always. */
  const owesCard = awakeningDue(state) !== null;
  /** 緣 Who is on the road, if anybody. Derived from the save, so it cannot be lost. */
  const meeting = meetingDue(state);
  const loaded = useRef(false);
  const lastLayer = useRef(0);
  /**
   * 入定 When this visit started, or null while the app is in the background.
   *
   * It is deliberately *not* in the save. Being away must never cost anything. That is
   * the promise, so this can only ever add, and a save that came back claiming a deep
   * meditation would be claiming hours nobody sat through.
   */
  const since = useRef<number | null>(null);
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
  const [focus, setFocus] = useState(1);
  const [satOut, setSatOut] = useState(false);
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
    lastLayer.current = (r.state.realm - 1) * 9 + r.state.layer;
    // A first-ever run has no save and no hours away: that is who the help is for. It
    // asks save.ts for what "has not begun" means rather than keeping its own idea of
    // it: the old one was "qi under five", which 囊 the opening purse made false, and
    // the help silently stopped appearing for new players.
    // 序 It opens on the prologue now, which hands over to 相 and then the guide; the
    // help sheet is what the Menu opens.
    if (r.secondsAway === 0 && untouched(r.state)) setPrologue(true);
    // The load came back whole, so this is a state worth keeping a spare of.
    keepSpare(r.state);

    if (r.secondsAway > 120) {
      setHome({
        seconds: r.secondsAway, qi: r.qiEarned, climbed: r.qiClimbed,
        layers: r.layersOpened, realms: r.realmsClimbed,
      });
    }
  }, []);

  // 入定 The visit. It starts when the app comes to the front and ends when it leaves,
  // and nothing about it is remembered between visits.
  useEffect(() => {
    if (!ready) return;
    const enter = () => { since.current = now(); };
    const leave = () => { since.current = null; setFocus(1); setSatOut(false); };
    const onVisibility = () => (document.hidden ? leave() : enter());
    enter();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', leave);
    window.addEventListener('focus', enter);
    window.addEventListener('blur', leave);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('focus', enter);
      window.removeEventListener('blur', leave);
    };
  }, [ready]);

  // 道 The tree as the clock sees it, kept fresh for an interval that is only set up once.
  const tree = useRef<readonly string[]>(state.unlocked);
  useEffect(() => { tree.current = state.unlocked; }, [state.unlocked]);

  // The clock. Time moves by timestamp, never by frame: this interval only asks what
  // time it is, and `advance` does the rest, so dropped frames lose no progress.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      // 道 神 the Spirit branch deepens the sitting; everything else leaves it at
      // FOCUS_MAX. It reads a ref rather than the state, because this interval is set up
      // once and would otherwise hold the tree the player had when it started.
      const open = since.current === null ? 0 : now() - since.current;
      const deep = since.current === null ? 1 : focusAt(open, focusBonus(tree.current));
      setFocus(deep);
      // 入定 Whether this visit's sitting has run out, which `focus` alone cannot say:
      // it reads 1 both before the sitting begins and after it ends, and those are two
      // very different things to put on a screen.
      setSatOut(open >= FOCUS_HOLD);
      setState((s) => {
        const next = advance(s, now(), false, deep);
        const layers = (next.realm - 1) * 9 + next.layer;
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

  const startFight = useCallback((beast: Beast, floor?: number) => {
    // 守 A warden is only ever reachable at the end of its own realm. The screens have
    // always declined to draw it anywhere else, and that is exactly the kind of guard
    // that a second screen forgets, so it is asked of the sim here, once.
    if (beast.warden && floor === undefined && !canFightWarden(state)) return;
    sfx.tap();
    haptics.tap();
    setBattle((current) => {
      if (current) return current;   // one fight at a time
      // One seed for the fight and its drop, so the same kill always gives the same
      // item: closing the app and reopening it cannot re-roll a poor piece.
      const seed = Math.floor(now() * 1000) >>> 0;
      const standing = floor === undefined ? undefined : floorPower(floor);
      return {
        beast,
        floor,
        qi: floor === undefined ? undefined : floorQi(state, floor),
        outcome: fight(state, beast, seed, standing),
        beat: 0,
        over: false,
        // A tower floor pays in materials, not in gear. Gear comes from the world.
        //
        // 狩 And nothing drops before 器 opens. The first realm hunts a realm before it
        // can wear anything, so a piece falling there would go into a chest the player
        // cannot open, off a screen that cannot explain it.
        drop: floor !== undefined || !isOpen(state.realm, 'gear') ? null
          : rollDrop(beast, state.realm, seed ^ 0x9e3779b9, fortuneOf(state), state.layer),
      };
    });
  }, [state]);

  /** 塔 The next floor of the tower, and only ever the next one. */
  const climbTower = useCallback((floor: number) => {
    if (floor !== standingFloor(state)) return;
    startFight(floorBeast(floor), floor);
  }, [state, startFight]);

  const onBrew = useCallback((line: Line) => {
    setState((s) => {
      const next = brew(s, line);
      if (next === s) return s;
      sfx.brew();
      haptics.win();
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

  const closeFight = useCallback(() => {
    if (!battle) return;
    const { beast, outcome, drop, floor } = battle;
    if (outcome.won && floor !== undefined) {
      // 塔 A floor counts once. It pays material and hours of gathering.
      sfx.floor();
      setState((s) => clearFloor(s, floor));
    } else if (outcome.won) {
      setState((s) => {
        // 空囊 Empty Pouch lifts every drop a rank on its way into the chest.
        const lifted = drop && dropsRankUp(s.unlocked)
          ? { ...drop, rarity: RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(drop.rarity) + 1)] }
          : drop;
        const kept = lifted ? addToChest(s.chest, lifted, limitOf(s)) : null;
        // 錄 A mark earned is rare enough to be worth hearing.
        const kills = s.killed[beast.key] ?? 0;
        const before = marksOf(kills);
        if (marksOf(kills + 1) > before) sfx.mark();
        // 收 The count, the material and 見 the first-sight bounty all come from the
        // sim, so the harnesses that measure this game see exactly what the player gets.
        // The chest is the app's, because the drop above was rolled with the app's seed.
        return { ...takeKill(s, beast), chest: kept ? [...kept.chest] : s.chest };
      });
    }
    setBattle(null);
    sfx.tap();
  }, [battle]);

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
      const next = unequipItem(s.worn, s.chest, slot, limitOf(s));
      if (next.refused) return s;   // a full chest has nowhere to put it
      return { ...s, worn: next.worn, chest: [...next.chest] };
    });
    sfx.tap();
    haptics.tap();
  }, []);

  /** 煉器 Refining spends material on a piece you are already wearing. */
  const onRefine = useCallback((slot: Slot) => {
    setState((s) => {
      const next = refine(s, slot);
      if (next === s) return s;
      float(JUICE.refined, 'gold'); burst('gold', null, 10, 56);
      sfx.buy();
      haptics.strike();
      return next;
    });
  }, []);

  const onFuse = useCallback((template: string, rarity: string) => {
    setState((s) => {
      const next = fuse(s.chest, template, rarity as Item['rarity'], fuseQuality(s.unlocked));
      if (!next.made) return s;
      float(JUICE.fused, 'gold'); burst('gold', null, 16, 80);
      return { ...s, chest: [...next.chest] };
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
    }
    lastRealm.current = state.realm;
  }, [state.realm, ready]);

  const toggleMute = useCallback(() => {
    const next = cycleSound();
    setSound(next);
    if (LEVELS[next].volume > 0) sfx.tap();
  }, []);

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
    setState((s) => {
      const free = freeOf(s);
      if (!canUnlock(key, s.unlocked, free, isOpen(s.realm, 'keystones'))) return s;
      float(JUICE.learned, 'jade'); burst('jade', null, 14, 70);
      return { ...s, unlocked: [...s.unlocked, key] };
    });
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

  const readNotice = useCallback((key: string, go?: 'hunt' | 'trials' | 'gear' | 'dao') => {
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
  const asking = ready && (whom || !state.seen.includes(WHOM)) && !battle && !help && !prologue;
  const covered = help || prologue || key || stele || saving || realmPage || menu || !!driving
    || !!inspect || !!home || !!battle || asking
    || locked !== null || bloom !== null;
  const coachAt = step && !covered && (step.tab ?? 'cultivate') === tab
    ? step.at
    : null;

  const byKey = useMemo(
    () => Object.fromEntries(BEASTS.map((b) => [b.key, b])) as Record<string, Beast>,
    [],
  );

  // 桌 On a computer the whole window is the realm the cultivator stands in: its own
  // painting, dimmed, behind everything. A phone never draws it (see .backdrop).
  const heavenNow = state.realm === 9 ? heavenAt(state.tribulation) : null;
  const backdrop = (heavenNow && pictureOf('heaven', String(heavenNow.n)))
    ?? pictureOf('realm', String(state.realm));

  return (
    <div className="app">
      {backdrop && <div className="backdrop" aria-hidden="true" style={{ backgroundImage: `url(${backdrop})` }} />}
      {/* 屏 The screen names itself in the DOM. A locked tab takes the tap and changes
          nothing, and 註 the tooltip harness was walking the previous screen a second
          time and reporting its characters under the wrong tab's name. */}
      <div className="sheet" key={tab} data-screen={tab}>
        {tab === 'cultivate' && (
          <Cultivate
            state={state}
            pulse={pulse}
            focus={focus}
            satOut={satOut}
            opened={opened}
            set={climb}
            onFight={() => startFight(currentWarden(state))}
            onGo={(next) => { setTab(next); sfx.tap(); }}
            onRealm={() => { setRealmPage(true); sfx.tap(); }}
            owesCard={owesCard}
            onAwaken={() => { setAwakenShut(false); sfx.tap(); }}
            onPlant={(which, key) => { setState((s) => plantSeed(s, which, key)); sfx.buy(); }}
            onHarvest={(which) => { setState((s) => harvestBed(s, which)); sfx.floor(); }}
            meeting={meeting}
            onMeet={(which) => {
              if (!meeting) return;
              setState((s) => answerMeeting(s, meeting.key, which, (s.at ^ s.met.length * 2654435761) | 0));
              sfx.buy();
            }}
          />
        )}
        {tab === 'hunt' && (
          <Hunt
            state={state}
            onFight={(key) => startFight(byKey[key])}
            onDrive={(key) => { setDriving(byKey[key]); sfx.tap(); }}
            onSecret={() => { setState((s) => enterSecret(s)); sfx.tap(); }}
          />
        )}
        {tab === 'trials' && <Trials state={state} pulse={pulse} onFloor={climbTower} onBrew={onBrew} />}
        {tab === 'gear' && (
          <Gear
            state={state} pulse={pulse}
            upTo={meltUpTo} onUpTo={setMeltUpTo}
            onInspect={(item, wearing) => { setInspect({ item, wearing }); sfx.tap(); }}
            onFuse={onFuse} onRefine={onRefine} onSalvageAll={onSalvageAll}
          />
        )}
        {tab === 'dao' && (
          <Dao state={state} onUnlock={onUnlock} onStance={onStance} onSequence={onSequence} />
        )}
      </div>

      {/* 收 One button, not five.
          Five bare characters floating over the corner of a screen that is already
          asking a new player to learn characters is five unanswered questions, and
          Bruno said so: *"fica muito confuso"*. They fold into one, and when it opens
          each one arrives with its name in English beside it, which is the same rule
          the upgrades follow, applied to the one place that had escaped it. */}
      <div className="switches" data-open={menu} hidden={covered && !menu}>
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
            ] as const).map(([han, label, go]) => (
              <button key={label} onClick={() => { setMenu(false); go(); sfx.tap(); }}>
                <b className="cjk">{han}</b><span>{label}</span>
              </button>
            ))}
            <button onClick={toggleMute} data-on={LEVELS[sound].volume > 0}>
              <b>{LEVELS[sound].icon}</b><span>{LEVELS[sound].label}</span>
            </button>
          </div>
        )}
      </div>
      {/* Anywhere else shuts it, which is what a menu that floats over a live game has
          to do or the player is left tapping the game through a list. */}
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}

      <nav className="tabs">
        {TABS.map((t) => {
          const shut = t.needs !== null && !isOpen(state.realm, t.needs);
          // 點 An unspent 道 point is money on the floor, and the screen it is spent on
          // is three taps and a scroll away. So the tab carries the count: the one place
          // a player looking at any other screen will see it.
          const owed = t.key === 'dao' && !shut && isOpen(state.realm, 'tree') ? free : 0;
          return (
            <button
              key={t.key}
              data-on={tab === t.key}
              data-shut={shut}
              onClick={() => (shut ? setLocked(t.needs) : setTab(t.key))}
            >
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
            </button>
          );
        })}
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
      {(() => {
        const out = saving ? () => { setSaving(false); sfx.tap(); }
          : key ? () => { setKey(false); sfx.tap(); }
          : help ? () => { setHelp(false); sfx.tap(); }
          : inspect ? () => { setInspect(null); sfx.tap(); }
          : driving ? () => { setDriving(null); sfx.tap(); }
          : realmPage ? () => { setRealmPage(false); sfx.tap(); }
          : null;
        return out ? <Escape onClose={out} /> : null;
      })()}

      {battle && (
        <Arena
          battle={battle}
          state={state}
          pulse={pulse}
          chestFull={state.chest.length >= limitOf(state)}
          onClose={closeFight}
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
                <div className="opened">
                  {opensIn(bloom).map((sys) => (
                    <span key={sys.key}>
                      <b className="cjk">{sys.han}</b>
                      <em>{sys.name}</em>
                      <i>{sys.gives}</i>
                    </span>
                  ))}
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

      {prologue && (
        <Prologue sky={pictureOf('realm', '1')} onDone={() => { setPrologue(false); sfx.tap(); }} />
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
            setState((s) => {
              const lifted = result.best && dropsRankUp(s.unlocked)
                ? { ...result.best, rarity: RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(result.best.rarity) + 1)] }
                : result.best;
              const kept = lifted ? addToChest(s.chest, lifted, limitOf(s)) : null;
              return { ...result.state, chest: kept ? [...kept.chest] : s.chest };
            });
            sfx.mark();
            haptics.tap();
          }}
          onClose={() => { setDriving(null); sfx.tap(); }}
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
          onOpen={(which) => {
            setState((s) => openDoor(s, which, (s.at ^ (s.runs * 40503) ^ (s.runStep * 7)) | 0));
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
      {owesCard && !awakenShut && (
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

      {saving && (
        <SavePanel
          state={state}
          onRestore={(next) => { setState(next); save(next); keepSpare(next); }}
          onClose={() => { setSaving(false); sfx.tap(); }}
        />
      )}

      {home && (
        <div className="back">
          <Svg html={portrait({ realm: state.realm, pulse, who: state.self })} style={{ display: 'block', width: 150, height: 150 }} />
          <h2 style={{ color: r.colour }}>歸</h2>
          <p className="faint" style={{ margin: 0, fontSize: 14 }}>
            {RETURN.away(duration(home.seconds))}
          </p>
          <dl>
            <dt>{RETURN.qi}</dt>
            <dd style={{ color: r.colour }}>{num(home.qi)}</dd>
            {home.layers > 0 && (<><dt>{RETURN.layers}</dt><dd>{home.layers}</dd></>)}
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
