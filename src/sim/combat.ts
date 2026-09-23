import { commonsOf, type Beast, wardenOf } from '../data/bestiary.ts';
import {
  FLOOR_LOOT, FLOOR_LOOT_GROWTH, HUNT_SHARE, LAYERS_PER_REALM, LEVELS_PER_REALM,
  OLD_BEAST_FLOOR, SEEN_BOUNTY, WARDEN_TRIBUTE, ladderBetween,
} from './balance.ts';
import { UPGRADE_INFO, power, tribulationPower, type State } from './state.ts';
import { beastWeakness } from './dao.ts';
import { heavenAt } from '../data/heavens.ts';
import { sequenceOf, stanceOf } from './arts.ts';
import { pillBane } from './furnace.ts';
import { lootTaken } from './trials.ts';

/**
 * 戰 Automatic combat, watched.
 *
 * It resolves on its own over a handful of rounds: the screen draws the bars falling,
 * and the player chooses nothing. It is the only moment in the game that is not a bar
 * filling, and it is what gives technique, pills, method and cores a reason to exist.
 *
 * Losing costs nothing: you come back when you have more power. That is why the whole
 * result can be computed at once and only then animated.
 */

/**
 * 基準 The reference power at the top of a realm.
 *
 * Beasts have no curve of their own: they are tuned against *this*. The reference is a
 * cultivator standing at the realm's ceiling with 劍訣 *and* 妖丹 near the levels the
 * realm allows, not the one who spent nothing, not the one who optimised everything,
 * but the one in the middle. Gear, the tree, the arts and the furnace are the margin on
 * top, and they are what turns a coin flip into a win.
 *
 * The first version gave beasts an exponent of their own (1.42 per layer) and they ran
 * away from any possible player: at realm 4 the warden was worth twenty well-invested
 * cultivators. The second derived them from a share of all the qi ever earned, which
 * stopped being meaningful the moment upgrade prices started riding the mountain.
 * Deriving from the *cap* is the honest one: the cap is the ceiling on what a
 * cultivator of that realm can possibly hold, so the beasts follow it on their own and
 * nothing here needs touching when the curve moves.
 *
 * It sits a fixed *two levels* below the cap rather than a share of it. A share widens
 * as the cap does: at the ninth realm fifteen per cent of the cap is eight levels of
 * 劍訣, nearly five times the power, so the same warden would read as hopeless at 85%
 * of the cap and trivial at 100%. Two levels is two levels at every realm, so the last
 * stretch before a warden feels the same all the way up the mountain.
 *
 * **It counts 妖丹 cores, and that is the wall between playing and waiting.** Cores are
 * not bought with qi. They are bought with 材 material, and material only falls off
 * things you kill. So a warden cannot be walked past by somebody who has never opened
 * 狩 Hunt, however long they have been gathering.
 *
 * The wall arrives late on purpose. The first two realms ask for no cores at all, so a
 * new cultivator meets the 妖狐 and the 石猿 with qi alone and learns what a warden is
 * before learning that a warden is not enough. From the third realm the requirement
 * grows a realm at a time, measured, somebody who never fights anything stalls in the
 * fourth realm and stays there for ever.
 *
 * Nothing is taken from that cultivator for being away. The qi still gathers at full
 * rate with the phone closed, every second of it, because that is the promise the game
 * makes. What they are short of is not qi. It is a reason to have been there.
 */
export const REFERENCE_BELOW = 2;

/** How many realms are fought through before the wardens start asking for 妖丹 cores. */
export const CORES_FREE_REALMS = 2;

/**
 * The same reading, taken anywhere: between realms, and above the ninth.
 *
 * The mountain stops at nine realms; 無盡塔 the tower does not, so it needs the reference
 * as a curve rather than as nine points. Feed it 4.5 and it gives what a cultivator
 * halfway through the fourth realm would hold; feed it 30 and it gives what a
 * twenty-first realm would hold, if there were one.
 */
export function referenceAt(realm: number): number {
  const r = Math.max(1, realm);
  const levels = Math.max(0, r * LEVELS_PER_REALM - REFERENCE_BELOW);
  const cores = Math.max(0, (r - CORES_FREE_REALMS) * LEVELS_PER_REALM - REFERENCE_BELOW);
  return r * LAYERS_PER_REALM
    * UPGRADE_INFO.technique.gain ** levels
    * UPGRADE_INFO.cores.gain ** cores;
}

export function referencePower(realm: number): number {
  return referenceAt(Math.min(9, realm));
}

/**
 * The share of the reference each step of a realm occupies. The three commons of a
 * realm have to be an easy one, a middling one and a hard one: the first version
 * indexed by *realm* rather than by beast, and all three came out with the same power
 * and the same odds, which turns three distinct animals into three identical buttons.
 */
const STEPS = [0.45, 0.62, 0.84];

/**
 * 初 And the first realm is spaced against the player, not against its own summit.
 *
 * Every realm is entered weak, measured, a cultivator arrives at 25%, 23%, 16%, 11%,
 * 7% of the realm they are entering. The first is 5%, and it is the same pattern, not an
 * exception. What makes it different is that it is the only realm with **nothing else in
 * it**: from the second there is gear to find, a stance to pick, a record filling, a
 * tower, a tree. In the first there is a bar and three boxes, and if the beasts are out
 * of reach as well then there is nothing at all.
 *
 * At the standard spacing the first fight a player can win arrives **two hours and six
 * minutes** in, and the true odds before it are not small. They are 0.0%, flat, for the
 * whole of it. Combat in the first realm was a step, not a ramp: nothing, nothing,
 * nothing, then 66% and trivial forty minutes later.
 *
 * So the first realm's three commons are placed where the player actually stands while
 * climbing it. Measured, at this spacing:
 *
 *     山鼠 the rat     力  2.4    winnable at 12 minutes
 *     野犬 the hound   力  7.0    at 1.6 hours
 *     澤蛙 the frog    力 14.0    at 3.5 hours
 *     妖狐 the fox     力 29.7    at the cap, as every warden is
 *
 * Four fights across the first realm, the first of them inside the first sitting. The
 * warden is untouched: a warden is always a cultivator who has filled the realm's cap,
 * and that is the one number in the realm that should not move.
 */
const FIRST_STEPS = [0.12, 0.35, 0.70];

/**
 * 守 What a warden asks for, as a multiple of its realm's reference.
 *
 * It is not a number at all: a warden stands at exactly the power of a cultivator who
 * has filled the realm's cap and brought nothing else. So the fight is a coin flip for
 * a cultivator with the levels and nothing more, and the stance, the sequence, the gear,
 * the cores and the tree are what turn the coin over.
 *
 * That is the whole argument for 勢 and 訣 existing, stated as a number: the last levels
 * of 劍訣 get you to the door, and the build opens it.
 */
export const WARDEN_EDGE = UPGRADE_INFO.technique.gain ** REFERENCE_BELOW;

/** A beast's power, always as a fraction of its realm's reference. */
export function beastPower(b: Beast): number {
  const ref = referencePower(b.realm);
  if (b.warden) return ref * WARDEN_EDGE;
  const i = commonsOf(b.realm).findIndex((x) => x.key === b.key);
  const steps = b.realm === 1 ? FIRST_STEPS : STEPS;
  return ref * steps[Math.max(0, i) % steps.length];
}

export interface Round {
  readonly playerHealth: number;   // 0..1
  readonly beastHealth: number;    // 0..1
  readonly playerDamage: number;
  readonly beastDamage: number;
  /** 訣 The arts that fired this round, in the order the sequence ran them. */
  readonly arts: readonly string[];
  /** True when the beast's blow was turned aside: the screen draws that differently. */
  readonly missed: boolean;
}

export interface Outcome {
  readonly won: boolean;
  readonly rounds: readonly Round[];
  readonly playerPower: number;
  readonly beastPower: number;
}

/** Deterministic noise: the same fight at the same instant gives the same result. */
function dice(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The most rounds a fight may run, so a theoretical draw can never hang anything. */
export const ROUND_CAP = 24;

/**
 * 氣運 How the qi runs today: one roll for each side, before a blow is thrown.
 *
 * Blow-by-blow noise averages away. Ten blows of ±22% come out within 4% of the mean,
 * so whoever had more power won every single time and a fight was decided before it
 * started. The screen hid that behind a sigmoid over the power ratio, which cheerfully
 * promised 34% on fights the player would lose a hundred times out of a hundred.
 *
 * One roll per fight does not average away. It is what makes an underdog worth trying
 * and a favourite worth checking, and it is what the odds on screen are now counting.
 */
export const FORM = 0.2;

/**
 * 戰 The fight, settled in one go.
 *
 * A round is: the cultivator's sequence fires, the cultivator strikes, the beast
 * answers. The stance bends all three; the art on this round's slot bends one of them.
 * The whole thing is pure and seeded, so the same fight always plays out the same way
 * and the screen can replay it at leisure.
 *
 * Order inside a round matters to the player, and so it matters here: 鶴唳 shaves the
 * beast's power *before* the beast answers, which is why taking it early is worth more
 * than taking it late.
 */
export function fight(s: State, b: Beast, seed: number, standing?: number): Outcome {
  const stance = stanceOf(s);
  const sequence = sequenceOf(s);
  const pp = power(s);
  // A tower floor brings its own power; everywhere else the beast brings its own.
  const bp0 = standing === undefined ? effectiveBeastPower(s, b) : effectiveBeastPower(s, b, standing);

  let beastPower = bp0;      // 纏 and 鶴唳 shave this as the fight runs
  let ph = pp * 10;
  let bh = bp0 * 10;
  const ph0 = ph;
  const bh0 = bh;
  let took = 0;              // what the beast dealt last round, for 傀儡 and 鏡

  const d = dice(seed);
  const myForm = 1 - FORM + d() * FORM * 2;
  const itsForm = 1 - FORM + d() * FORM * 2;
  beastPower *= itsForm;

  // 疾 runs the sequence twice a round, so the cursor is its own counter rather than
  // the round number.
  const perRound = stance?.key === 'swift' ? 2 : 1;
  let cursor = 0;
  const rounds: Round[] = [];

  for (let i = 0; i < ROUND_CAP && ph > 0 && bh > 0; i++) {
    const fired: string[] = [];
    let mine = 0;
    let missed = false;
    let healed = 0;

    for (let k = 0; k < perRound; k++) {
      // The rotation is always SEQUENCE_SLOTS long. An empty slot is a wasted round, so
      // filling the sequence is always worth more than leaving it short.
      const art = sequence[cursor++ % sequence.length];
      // 疾 splits the round into two 60% strikes; everything else is one whole one.
      let blow = pp * myForm * (stance?.key === 'steady' ? 1 : 0.82 + d() * 0.46)
        * (stance?.key === 'swift' ? 0.6 : 1);

      if (stance) {
        if (stance.key === 'guard') blow *= 0.75;
        if (stance.key === 'fierce') blow *= 1.5;
        if (stance.key === 'reckless') blow = d() < 0.5 ? 0 : blow * 3;
        if (stance.key === 'reverse') blow *= 1 + (1 - ph / ph0);
        if (stance.key === 'mirror') blow = Math.max(blow, took);
      }

      if (art) {
        fired.push(art.key);
        switch (art.key) {
          case 'fox': missed = true; break;
          case 'ape': blow *= 1.6; break;
          case 'crane': beastPower *= 0.9; break;
          case 'tiger': blow *= 2; break;
          case 'turtle': healed += ph0 * 0.12; break;
          case 'puppet': blow += took * 0.25; break;
          case 'wolf': blow *= 1 + 0.12 * i; break;
          case 'serpent': if (ph / ph0 < 0.5) blow *= 3; break;
          case 'dragon': blow *= 1.35; missed = true; break;
        }
      }

      mine += blow;
    }

    if (stance?.key === 'entangle') beastPower *= 0.92;
    if (stance?.key === 'endure') healed += ph0 * 0.06;

    bh -= mine;

    let theirs = missed ? 0 : beastPower * (0.82 + d() * 0.46);
    if (stance?.key === 'guard') theirs *= 0.6;
    if (stance?.key === 'fierce') theirs *= 1.5;
    took = theirs;

    ph = Math.min(ph0, ph - theirs + healed);

    rounds.push({
      playerHealth: Math.max(0, ph / ph0),
      beastHealth: Math.max(0, bh / bh0),
      playerDamage: mine,
      beastDamage: theirs,
      arts: fired,
      missed,
    });
  }

  return { won: bh <= 0 || ph / ph0 > bh / bh0, rounds, playerPower: pp, beastPower: bp0 };
}

/**
 * How much material a beast drops, before the tower's seals sweeten it.
 *
 * It rides the tower's own curve at the depth the beast stands at, so hunting and
 * climbing stay in proportion for ever. The old reading was a small polynomial that had
 * nothing to do with anything: by the fifth realm a beast paid sixteen material against
 * a tower floor paying thirty-six thousand, so hunting for material was pointless the
 * day the tower opened.
 */
export function beastDepth(b: Beast): number {
  const i = commonsOf(b.realm).findIndex((x) => x.key === b.key);
  return (b.realm - 1) * LAYERS_PER_REALM + 3 + 2 * Math.max(0, i);
}

export function loot(b: Beast): number {
  const depth = b.warden ? b.realm * LAYERS_PER_REALM : beastDepth(b);
  const share = b.warden ? HUNT_SHARE * 4 : HUNT_SHARE;
  return Math.max(1, Math.round(FLOOR_LOOT * FLOOR_LOOT_GROWTH ** (depth - 1) * share));
}

/**
 * 收 Taking a kill: the one place a beast is written into a save.
 *
 * It lived in the app, which meant 見 the first-sight bounty was invisible to every
 * harness that measures this game: the five cultivators, the climb, the endgame, and
 * a reward the measuring never sees is a reward nobody can tell you is wrong. Anything
 * that changes the numbers belongs in `sim/`, and this is the thing that changes them.
 *
 * It does not touch the chest or the drop: gear is rolled with a seed and the caller
 * owns that. What it owns is the three facts every kill is worth: the count, the
 * material, and the bounty the count decides.
 */
export function takeKill(s: State, b: Beast): State {
  const kills = s.killed[b.key] ?? 0;
  return {
    ...s,
    wardenFell: b.warden ? true : s.wardenFell,
    qi: s.qi + (kills === 0 ? seenBounty(b) : 0),
    materials: s.materials + lootTaken(s, lootFrom(s, b)),
    killed: { ...s.killed, [b.key]: kills + 1 },
  };
}

/**
 * 見 The one-off qi a beast pays the first time it is killed, and never again.
 *
 * It rides the same depth the loot does, so it scales with the mountain on its own and
 * nothing here needs touching when the curve moves.
 *
 * It is a *share of a rung*, which is what makes it legible. "Half a layer" means
 * something to a player watching a bar fill; a flat number means nothing at the third
 * realm and everything at the first.
 */
export function seenBounty(b: Beast): number {
  // 守 No bounty for a warden, and the reason used to be 突破 rather than balance:
  // breaking through set the qi to nothing, so a warden paid on the kill handed over a
  // prize the next tap destroyed. 銀 That reason is gone: the breakthrough carries the
  // qi now, and the answer is still no, on the original grounds. A warden falls once
  // per realm, nine times in a lifetime, and what it pays is the realm. Bolting a qi
  // prize onto the one fight that already hands over a whole new mountain is paying
  // twice for the same moment.
  if (b.warden) return 0;
  return Math.max(1, Math.round(ladderBetween(beastDepth(b)) * (SEEN_BOUNTY / b.realm)));
}

/**
 * 舊 A beast's material as *this* cultivator meets it.
 *
 * `loot` is what the beast is worth on its own, which is a property of the beast and
 * belongs to the table. This is what it is worth to the person killing it, which is a
 * different question and the one the screen should be answering: a first-realm rat is
 * worth two material to a first-realm cultivator and rather more to a sixth-realm one,
 * because a sixth-realm cultivator skins it in a second.
 *
 * The floor rides the weakest common of the hunter's realm, so it moves with the
 * mountain on its own. It is only ever a floor: a beast already worth more than it
 * keeps its own number.
 */
export function lootFrom(s: State, b: Beast): number {
  const own = loot(b);
  // 守貢 A warden pays a tribute, not a harvest, and never takes the old-beast floor:
  // it is the gate, and a gate that pays for its own key is not a gate. See
  // WARDEN_TRIBUTE for the measurement that made this necessary.
  if (b.warden) return Math.max(1, Math.round(own * WARDEN_TRIBUTE));
  const mine = (Math.max(1, Math.min(9, s.realm)) - 1) * LAYERS_PER_REALM + 3;
  const floor = FLOOR_LOOT * FLOOR_LOOT_GROWTH ** (mine - 1) * HUNT_SHARE * OLD_BEAST_FLOOR;
  return Math.max(own, Math.round(floor));
}

/** How many fights the odds are read from. Enough to be steady, cheap enough to be free. */
const SAMPLES = 41;

/**
 * 算 An honest reading of the odds.
 *
 * It used to be a curve over the power ratio, which was fine while power was the only
 * thing that decided a fight. A stance that halves what you take and a sequence that
 * triples a strike do not show up in a power ratio at all, so the screen would have
 * promised 40% on a fight the build wins nine times in ten.
 *
 * So it simply *fights*: twenty-five times, on spread seeds, and counts. Pure, cheap,
 * and it can never disagree with what the player is about to watch.
 */
export function odds(s: State, b: Beast, standing?: number): number {
  return Math.max(0.02, Math.min(0.98, oddsRaw(s, b, standing)));
}

/**
 * The same reading without the floor under it.
 *
 * 誠 The floor exists because "0%" on a button invites nobody to press it, and a run of
 * bad seeds should not read as impossible. But it hides a real difference: a cultivator
 * looking at the first realm's three beasts saw 2%, 2% and 2%, when one of them was
 * twice their power and one was twelve times it. Three identical numbers on a screen
 * whose whole job is choosing which to fight.
 *
 * So the screen asks for the raw share, and when it is a flat zero it stops quoting a
 * percentage at all and says how far off the beast is instead. Nothing about the fight
 * changes; the screen stops rounding the answer up to something that sounds possible.
 */
export function oddsRaw(s: State, b: Beast, standing?: number): number {
  let won = 0;
  for (let i = 0; i < SAMPLES; i++) {
    if (fight(s, b, (i * 2654435761) >>> 0, standing).won) won++;
  }
  return won / SAMPLES;
}

/**
 * A beast's power as this cultivator meets it.
 *
 * 破甲 Sunder shaves it down, and 渡劫 raises the Dragon: after the ninth realm the same
 * beast comes back for every tribulation, harder each time. It is the only beast in the
 * game whose power depends on the cultivator facing it, and it is the reason the game
 * does not end at the top.
 */
export function effectiveBeastPower(s: State, b: Beast, standing?: number): number {
  const base = standing ?? beastPower(b);
  const trial = standing === undefined && b.key === 'dragon' && s.realm === 9;
  if (trial) {
    // 劫 The tribulation is lightning, not a beast. 破甲 and 破煞 thin what has blood in
    // it; neither has any hold on heaven, and if they did the endgame would be a pill
    // you swallow once rather than a ladder you climb.
    return tribulationPower(s, base);
  }
  return base * beastWeakness(s.unlocked) * pillBane(s.brewed);
}

/**
 * 守 What stands in front of this cultivator right now.
 *
 * Below the summit it is the realm's warden. Above it, it is the Dragon of the heaven
 * they have climbed into: the same fight, the same anchor, a different animal with a
 * different name and a different shape drawn beside it. Forty crossings against one
 * beast called 龍 was measured and it was grim.
 */
export function currentWarden(s: State): Beast {
  const heaven = heavenAt(s.tribulation);
  if (s.realm === 9 && heaven) {
    const dragon = wardenOf(9);
    return { ...dragon, han: heaven.dragon.han, name: heaven.dragon.name,
             icon: heaven.dragon.icon, plate: `heaven-${heaven.n}` };
  }
  return wardenOf(s.realm);
}
