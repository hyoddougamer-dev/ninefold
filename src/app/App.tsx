import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BEASTS, type Beast } from '../data/bestiary.ts';
import { realm as realmOf } from '../data/realms.ts';
import { currentWarden, fight, loot } from '../sim/combat.ts';
import { newState, power, type State } from '../sim/state.ts';
import { duration, num } from '../sim/format.ts';
import { load, save } from '../sim/save.ts';
import { advance, layersOpened } from '../sim/time.ts';
import { portrait } from '../art/aura.ts';
import { templateOf, type Item, type Slot } from '../data/gear.ts';
import { addToChest, chestLimit, equip as equipItem, fuse, unequip as unequipItem } from '../sim/chest.ts';
import { rollDrop } from '../sim/drops.ts';
import { affinity, alwaysDrops, canUnlock, daoFree, dropChanceBonus, dropsRankUp, fuseQuality, rarityLuck } from '../sim/dao.ts';
import { WARDENS } from '../data/bestiary.ts';
import { RARITIES, wornTotals } from '../data/gear.ts';
import { Bestiary } from './screens/Bestiary.tsx';
import { Dao } from './screens/Dao.tsx';
import { Gear } from './screens/Gear.tsx';
import { Hunt } from './screens/Hunt.tsx';
import { Cultivate } from './screens/Cultivate.tsx';
import { Help } from './ui/Help.tsx';
import { Svg } from './ui/Svg.tsx';
import { Arena, BEAT_MS, beatsIn, type Battle } from './ui/Arena.tsx';
import { RETURN } from './copy.ts';
import { haptics } from './haptics.ts';
import { isMuted, setMuted, sfx } from './sound.ts';

const TABS = [
  { key: 'cultivate', han: '修', label: 'Cultivate' },
  { key: 'hunt', han: '狩', label: 'Hunt' },
  { key: 'gear', han: '器', label: 'Gear' },
  { key: 'dao', han: '道', label: 'Path' },
  { key: 'bestiary', han: '錄', label: 'Bestiary' },
] as const;

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
  const [muted, setMutedState] = useState(isMuted);
  /** 突破 The breakthrough moment: the realm just left, held for its animation. */
  const [bloom, setBloom] = useState<number | null>(null);
  const loaded = useRef(false);
  const lastLayer = useRef(0);

  // 歸 The return. An idle game is played closed, so opening the app is first of all
  // receiving the hours that passed — and the player wants to see that before anything.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const r = load(now());
    setState(r.state);
    setReady(true);
    lastLayer.current = (r.state.realm - 1) * 9 + r.state.layer;
    // A first-ever run has no save and no hours away: that is who the help is for.
    if (r.secondsAway === 0 && r.state.realm === 1 && r.state.layer === 0 && r.state.qi < 5) {
      setHelp(true);
    }
    if (r.secondsAway > 120) {
      setHome({
        seconds: r.secondsAway, qi: r.qiEarned,
        layers: r.layersOpened, realms: r.realmsClimbed,
      });
    }
  }, []);

  // The clock. Time moves by timestamp, never by frame: this interval only asks what
  // time it is, and `advance` does the rest — so dropped frames lose no progress.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      setState((s) => {
        const next = advance(s, now());
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

  const startFight = useCallback((beast: Beast) => {
    sfx.tap();
    haptics.tap();
    setBattle((current) => {
      if (current) return current;   // one fight at a time
      // One seed for the fight and its drop, so the same kill always gives the same
      // item — closing the app and reopening it cannot re-roll a poor piece.
      const seed = Math.floor(now() * 1000) >>> 0;
      return {
        beast,
        outcome: fight(state, beast, seed),
        beat: 0,
        over: false,
        drop: rollDrop(beast, state.realm, seed ^ 0x9e3779b9, {
          chance: dropChanceBonus(state.unlocked),
          luck: rarityLuck(state.unlocked),
          always: alwaysDrops(state.unlocked),
        }),
      };
    });
  }, [state]);

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
    const { beast, outcome, drop } = battle;
    if (outcome.won) {
      setState((s) => {
        // 空囊 Empty Pouch lifts every drop a rank on its way into the chest.
        const lifted = drop && dropsRankUp(s.unlocked)
          ? { ...drop, rarity: RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(drop.rarity) + 1)] }
          : drop;
        const kept = lifted ? addToChest(s.chest, lifted, limitOf(s)) : null;
        return {
          ...s,
          wardenFell: beast.warden ? true : s.wardenFell,
          materials: s.materials + (beast.warden ? loot(beast) * 4 : loot(beast)),
          killed: { ...s.killed, [beast.key]: (s.killed[beast.key] ?? 0) + 1 },
          chest: kept ? [...kept] : s.chest,
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
      setTimeout(() => setBloom(null), 1400);
    } else {
      sfx.buy();
      haptics.tap();
    }
    setState(next);
  }, [state.realm]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.tap();
  }, [muted]);

  const onUnlock = useCallback((key: string) => {
    setState((s) => {
      const wardens = Object.entries(s.killed)
        .filter(([k, n]) => n > 0 && WARDENS.some((w) => w.key === k)).length;
      if (!canUnlock(key, s.unlocked, daoFree(layersOpened(s), wardens, s.unlocked))) return s;
      return { ...s, unlocked: [...s.unlocked, key] };
    });
    sfx.buy();
    haptics.strike();
  }, []);

  const r = realmOf(state.realm);
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
            set={climb}
            onFight={() => startFight(currentWarden(state))}
          />
        )}
        {tab === 'hunt' && <Hunt state={state} onFight={(key) => startFight(byKey[key])} />}
        {tab === 'gear' && (
          <Gear state={state} pulse={pulse} onEquip={onEquip} onUnequip={onUnequip} onFuse={onFuse} />
        )}
        {tab === 'dao' && <Dao state={state} onUnlock={onUnlock} />}
        {tab === 'bestiary' && <Bestiary state={state} />}
      </div>

      <div className="switches">
        <button onClick={() => setHelp(true)} aria-label="How to play">?</button>
        <button onClick={toggleMute} data-on={!muted} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} data-on={tab === t.key} onClick={() => setTab(t.key)}>
            <span className="g cjk">{t.han}</span>
            <span className="l">{t.label}</span>
          </button>
        ))}
      </nav>

      {battle && (
        <Arena
          battle={battle}
          realm={state.realm}
          pulse={pulse}
          chestFull={state.chest.length >= limitOf(state)}
          onClose={closeFight}
        />
      )}

      {bloom !== null && (
        <div className="bloom" style={{ color: realmOf(bloom).colour }}>
          <span className="ring" /><span className="ring" /><span className="ring" />
          <div className="mid">
            <span className="han" style={{ color: realmOf(bloom).colour }}>{realmOf(bloom).han}</span>
            <p>{realmOf(bloom).gains}</p>
          </div>
        </div>
      )}

      {help && <Help onClose={() => { setHelp(false); sfx.tap(); }} />}

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
    </div>
  );
}
