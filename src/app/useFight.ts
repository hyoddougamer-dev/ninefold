import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { now } from './clock.ts';
import { stash } from '../sim/stash.ts';
import type { Beast } from '../data/bestiary.ts';
import { fight, takeKill } from '../sim/combat.ts';
import { canFightWarden, type State } from '../sim/state.ts';
import { fortuneOf } from '../sim/fortune.ts';
import { templateOf } from '../data/gear.ts';
import { equip as equipItem } from '../sim/chest.ts';
import { dropFor, noteFate, secondDropFor } from '../sim/fate.ts';
import { clearFloor, floorQi, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { beatChallenger, challengerKit, challengerOf, challengerPower, challengerSeed, standingTier, type Tier } from '../sim/platform.ts';
import { conquer, conquerTwice, demonDue, demonOf, demonPower, repel } from '../sim/seclusion.ts';
import { kitFor, kitWhere, spendOnWin, spendSeek, tookPart } from '../sim/crafts.ts';
import { splitKey } from '../data/crafts.ts';
import { marksOf } from '../sim/record.ts';
import { BEAT_MS, beatsIn, type Battle } from './ui/Arena.tsx';
import { MARKS } from '../sim/balance.ts';
import { haptics } from './haptics.ts';
import { sfx } from './sound.ts';
import { isOpen } from '../sim/unlocks.ts';

/**
 * 擊 The least time between two fights starting, in the app. The ranked server allows one
 * per MIN_FIGHT_SECONDS (1.2 s) before it counts kills as bought; this keeps clear of it.
 */
const PACE_MS = 1500;

/**
 * 戰 The fight, as the screen uses it: the battle on the stage, the fight that starts and
 * ends, the next one that goes straight on, and the auto-hunt that goes on while the game is
 * open. The sim settles every fight before its first blow; this hook only walks it.
 */
export function useFight(
  state: State,
  setState: Dispatch<SetStateAction<State>>,
  towerKit: boolean,
  tap: () => number,
  once: (id: number, effect: () => void) => void,
) {
  const [battle, setBattle] = useState<Battle | null>(null);
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
      const id = tap();
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

  return { battle, setBattle, startFight, faceDemon, challenge, climbTower, closeFight, skipFight, canAgain, fightAgain, canNext, climbNext, nextTier, auto, startAuto, stopAuto, autoNext, autoFrom, autoLeft };
}
