import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { realm as realmOf } from '../data/realms.ts';
import { currentWarden, fight, loot } from '../sim/combat.ts';
import { newState, power, type State, filledRealms,
} from '../sim/state.ts';
import { duration, num } from '../sim/format.ts';
import { keepSpare, load, save, untouched} from '../sim/save.ts';
import { advance, layersOpened } from '../sim/time.ts';
import { focusAt } from '../sim/balance.ts';
import { focusBonus } from '../sim/dao.ts';
import { portrait } from '../art/aura.ts';
import { templateOf, type Item, type Slot } from '../data/gear.ts';
import { addToChest, chestLimit, equip as equipItem, fuse, unequip as unequipItem } from '../sim/chest.ts';
import { rollDrop } from '../sim/drops.ts';
import { brew, clearFloor, floorQi, lootTaken, refine, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { pillFortune } from '../sim/furnace.ts';
import { marksOf } from '../sim/record.ts';
import type { Line } from '../data/alchemy.ts';
import { affinity, alwaysDrops, canUnlock, daoFree, dropChanceBonus, dropsRankUp, fuseQuality, rarityLuck } from '../sim/dao.ts';
import { WARDENS } from '../data/bestiary.ts';
import { RARITIES, wornTotals } from '../data/gear.ts';
import { Dao } from './screens/Dao.tsx';
import { Gear } from './screens/Gear.tsx';
import { Hunt } from './screens/Hunt.tsx';
import { Cultivate } from './screens/Cultivate.tsx';
import { Trials } from './screens/Trials.tsx';
import { Help } from './ui/Help.tsx';
import { Key } from './ui/Key.tsx';
import { Coach } from './ui/Coach.tsx';
import { Chronicle } from './screens/Chronicle.tsx';
import { SavePanel } from './ui/SavePanel.tsx';
import { Svg } from './ui/Svg.tsx';
import { Arena, BEAT_MS, beatsIn, type Battle } from './ui/Arena.tsx';
import { RETURN } from './copy.ts';
import { haptics } from './haptics.ts';
import { LEVELS, cycleSound, soundLevel, sfx } from './sound.ts';
import { takeUpdate, watchForUpdates } from './updates.ts';
import { nextNotice } from './notices.ts';
import { DISMISSED, guide } from './guide.ts';
import { isOpen, opensIn, systemInfo, type System } from '../sim/unlocks.ts';
import { realm as realmInfo } from '../data/realms.ts';
import { NOTICE } from './copy.ts';
import { BLOOM, LOCKED, UPDATE } from './copy.ts';

/**
 * 開 The tabs, and what opens them.
 *
 * A locked tab is shown rather than hidden, dimmed and with the realm that opens it,
 * because the whole point of a purely vertical game is that climbing hands you something
 * — and you cannot look forward to a tab you have never seen.
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
  return chestLimit(s.unlocked, capacity);
}

interface Homecoming {
  readonly seconds: number;
  readonly qi: number;
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
  // 釋 The key: what every character on the screen means.
  const [key, setKey] = useState(false);
  // 碑 The stele. A page you visit, not a loop you run, so it lives on the header rather
  // than taking a sixth place in a tab bar that has to fit on a phone.
  const [stele, setStele] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [sound, setSound] = useState(soundLevel);
  /** 突破 The breakthrough moment: the realm just left, held for its animation. */
  const [bloom, setBloom] = useState<number | null>(null);
  /** 鎖 A tab the realm has not opened yet, held for the panel that says so. */
  const [locked, setLocked] = useState<System | null>(null);
  const loaded = useRef(false);
  const lastLayer = useRef(0);
  /**
   * 入定 When this visit started, or null while the app is in the background.
   *
   * It is deliberately *not* in the save. Being away must never cost anything — that is
   * the promise — so this can only ever add, and a save that came back claiming a deep
   * meditation would be claiming hours nobody sat through.
   */
  const since = useRef<number | null>(null);
  const [focus, setFocus] = useState(1);

  // 歸 The return. An idle game is played closed, so opening the app is first of all
  // receiving the hours that passed — and the player wants to see that before anything.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const r = load(now());
    setState(r.state);
    setReady(true);
    lastLayer.current = (r.state.realm - 1) * 9 + r.state.layer;
    // A first-ever run has no save and no hours away: that is who the help is for. It
    // asks save.ts for what "has not begun" means rather than keeping its own idea of
    // it — the old one was "qi under five", which 囊 the opening purse made false, and
    // the help silently stopped appearing for new players.
    if (r.secondsAway === 0 && untouched(r.state)) setHelp(true);
    // The load came back whole, so this is a state worth keeping a spare of.
    keepSpare(r.state);

    if (r.secondsAway > 120) {
      setHome({
        seconds: r.secondsAway, qi: r.qiEarned,
        layers: r.layersOpened, realms: r.realmsClimbed,
      });
    }
  }, []);

  // 入定 The visit. It starts when the app comes to the front and ends when it leaves,
  // and nothing about it is remembered between visits.
  useEffect(() => {
    if (!ready) return;
    const enter = () => { since.current = now(); };
    const leave = () => { since.current = null; setFocus(1); };
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
  // time it is, and `advance` does the rest — so dropped frames lose no progress.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      // 道 神 the Spirit branch deepens the sitting; everything else leaves it at
      // FOCUS_MAX. It reads a ref rather than the state, because this interval is set up
      // once and would otherwise hold the tree the player had when it started.
      const deep = since.current === null ? 1
        : focusAt(now() - since.current, focusBonus(tree.current));
      setFocus(deep);
      setState((s) => {
        const next = advance(s, now(), false, deep);
        const layers = (next.realm - 1) * 9 + next.layer;
        if (layers > lastLayer.current) {
          lastLayer.current = layers;
          sfx.layer();
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
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => save(state), 4000);
    const onLeave = () => save(state);
    document.addEventListener('visibilitychange', onLeave);
    window.addEventListener('pagehide', onLeave);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onLeave);
      window.removeEventListener('pagehide', onLeave);
      save(state);
    };
  }, [state, ready]);

  const startFight = useCallback((beast: Beast, floor?: number) => {
    sfx.tap();
    haptics.tap();
    setBattle((current) => {
      if (current) return current;   // one fight at a time
      // One seed for the fight and its drop, so the same kill always gives the same
      // item — closing the app and reopening it cannot re-roll a poor piece.
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
          : rollDrop(beast, state.realm, seed ^ 0x9e3779b9, {
          chance: dropChanceBonus(state.unlocked),
          luck: rarityLuck(state.unlocked) * pillFortune(state.brewed),
          always: alwaysDrops(state.unlocked),
        }),
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
   * A round is two beats — the cultivator strikes, then the beast answers — so a blow
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
        const before = marksOf(s.killed[beast.key] ?? 0);
        if (marksOf((s.killed[beast.key] ?? 0) + 1) > before) sfx.mark();
        return {
          ...s,
          wardenFell: beast.warden ? true : s.wardenFell,
          materials: s.materials + lootTaken(s, loot(beast)),
          killed: { ...s.killed, [beast.key]: (s.killed[beast.key] ?? 0) + 1 },
          chest: kept ? [...kept.chest] : s.chest,
        };
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
      sfx.buy();
      haptics.strike();
      return next;
    });
  }, []);

  const onFuse = useCallback((template: string, rarity: string) => {
    setState((s) => {
      const next = fuse(s.chest, template, rarity as Item['rarity'], fuseQuality(s.unlocked));
      if (!next.made) return s;
      return { ...s, chest: [...next.chest] };
    });
    sfx.breakthrough();
    haptics.win();
  }, []);

  /** Breaking through is the one moment the game stops for. */
  const climb = useCallback((next: State) => {
    if (next.realm !== state.realm) {
      sfx.breakthrough();
      haptics.breakthrough();
      setBloom(next.realm);
      // A realm that handed something over waits to be read. One that only changed the
      // light does not — 1.4 seconds is right for a colour and wrong for three cards.
      if (opensIn(next.realm).length === 0) setTimeout(() => setBloom(null), 1400);
    } else {
      sfx.buy();
      haptics.tap();
    }
    setState(next);
  }, [state.realm]);

  const toggleMute = useCallback(() => {
    const next = cycleSound();
    setSound(next);
    if (LEVELS[next].volume > 0) sfx.tap();
  }, []);

  const onUnlock = useCallback((key: string) => {
    setState((s) => {
      const wardens = Object.entries(s.killed)
        .filter(([k, n]) => n > 0 && WARDENS.some((w) => w.key === k)).length;
      const free = daoFree(layersOpened(s), wardens, s.unlocked, filledRealms(s));
      if (!canUnlock(key, s.unlocked, free)) return s;
      return { ...s, unlocked: [...s.unlocked, key] };
    });
    sfx.buy();
    haptics.strike();
  }, []);

  // A new version of the page is a new version of the game. Nobody installs anything
  // again; they are told, and they choose when.
  useEffect(() => { watchForUpdates(() => setFresh(true)); }, []);

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
   * is waiting when they open it — and one they have read can never come back.
   */
  const notice = useMemo(
    // Never behind the 突破 bloom: that moment introduces what the realm opened, and a
    // card saying the same thing underneath it is the game talking over itself.
    //
    // 引 And never while the guide is running, which is the same rule one level up. The
    // guide and the cards both answer "what now", and in the first realm they answered
    // it about the *same thing* at the same moment: the guide's third step saying to go
    // and hunt for material, with a card underneath it saying to go and hunt for
    // material. Nothing is lost by waiting — a card keeps its turn until it is seen.
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
   *   the guide is still running at all — it ends for good after the fifth step;
   *   the step's target is on the tab being looked at, not one tap away;
   *   and nothing is covering the screen. A ring drawn on a button underneath the
   *   help sheet, the arena or the 突破 bloom points at something the player cannot
   *   reach, which is worse than pointing at nothing.
   */
  const step = guide(state);
  const covered = help || key || stele || saving || !!home || !!battle
    || locked !== null || bloom !== null;
  const coachAt = step && !covered && (step.tab ?? 'cultivate') === tab
    ? step.at
    : null;

  const byKey = useMemo(
    () => Object.fromEntries(BEASTS.map((b) => [b.key, b])) as Record<string, Beast>,
    [],
  );

  return (
    <div className="app">
      <div className="sheet" key={tab}>
        {tab === 'cultivate' && (
          <Cultivate
            state={state}
            pulse={pulse}
            focus={focus}
            set={climb}
            onFight={() => startFight(currentWarden(state))}
            onGo={(next) => { setTab(next); sfx.tap(); }}
          />
        )}
        {tab === 'hunt' && <Hunt state={state} onFight={(key) => startFight(byKey[key])} />}
        {tab === 'trials' && <Trials state={state} pulse={pulse} onFloor={climbTower} onBrew={onBrew} />}
        {tab === 'gear' && (
          <Gear
            state={state} pulse={pulse}
            onEquip={onEquip} onUnequip={onUnequip} onFuse={onFuse} onRefine={onRefine}
          />
        )}
        {tab === 'dao' && (
          <Dao state={state} onUnlock={onUnlock} onStance={onStance} onSequence={onSequence} />
        )}
      </div>

      <div className="switches">
        <button onClick={() => { setSaving(true); sfx.tap(); }} aria-label="Your save">存</button>
        <button onClick={() => setHelp(true)} aria-label="How to play">?</button>
        <button className="cjk" onClick={() => { setKey(true); sfx.tap(); }}
          aria-label="What the characters mean">釋</button>
        <button className="cjk" onClick={() => { setStele(true); sfx.tap(); }} aria-label="The stele">碑</button>
        <button onClick={toggleMute} data-on={LEVELS[sound].volume > 0} aria-label={LEVELS[sound].label}>
          {LEVELS[sound].icon}
        </button>
      </div>

      <nav className="tabs">
        {TABS.map((t) => {
          const shut = t.needs !== null && !isOpen(state.realm, t.needs);
          return (
            <button
              key={t.key}
              data-on={tab === t.key}
              data-shut={shut}
              onClick={() => (shut ? setLocked(t.needs) : setTab(t.key))}
            >
              {/* A locked tab keeps its own character and swaps its name for the realm
                  that opens it. Four identical padlocks in a row say nothing. */}
              <span className="g cjk">{t.han}</span>
              <span className="l">{shut ? realmInfo(systemInfo(t.needs!).realm).han : t.label}</span>
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

      {help && (
        <Help
          onClose={() => { setHelp(false); sfx.tap(); }}
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
          <Svg html={portrait({ realm: state.realm, pulse })} style={{ display: 'block', width: 150, height: 150 }} />
          <h2 style={{ color: r.colour }}>歸</h2>
          <p className="faint" style={{ margin: 0, fontSize: 14 }}>
            {RETURN.away(duration(home.seconds))}
          </p>
          <dl>
            <dt>{RETURN.qi}</dt>
            <dd style={{ color: r.colour }}>{num(home.qi)}</dd>
            {home.layers > 0 && (<><dt>{RETURN.layers}</dt><dd>{home.layers}</dd></>)}
            {home.realms > 0 && (<><dt>{RETURN.realms}</dt><dd style={{ color: 'var(--magenta)' }}>{home.realms}</dd></>)}
            <dt>{RETURN.power}</dt>
            <dd>{num(power(state))}</dd>
          </dl>
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
