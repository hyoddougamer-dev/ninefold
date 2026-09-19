import { commonsOf, type Beast, wardenOf } from '../data/bestiary.ts';
import {
  FLOOR_LOOT, FLOOR_LOOT_GROWTH, HUNT_SHARE, LAYERS_PER_REALM, LEVELS_PER_REALM,
} from './balance.ts';
import { UPGRADE_INFO, power, tribulationPower, type State } from './state.ts';
import { beastWeakness } from './dao.ts';
import { sequenceOf, stanceOf } from './arts.ts';
import { pillBane } from './furnace.ts';

/**
 * 戰 Automatic combat, watched.
 *
 * It resolves on its own over a handful of rounds — the screen draws the bars falling —
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
 * cultivator standing at the realm's ceiling with 劍訣 near the level the realm allows
 * — not the one who spent nothing, not the one who optimised everything, but the one in
 * the middle. Cores, gear, the tree and the tower are the margin on top, and they are
 * what turns a coin-flip into a win.
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
 * as the cap does — at the ninth realm fifteen per cent of the cap is eight levels of
 * 劍訣, nearly five times the power — so the same warden would read as hopeless at 85%
 * of the cap and trivial at 100%. Two levels is two levels at every realm, so the last
 * stretch before a warden feels the same all the way up the mountain.
 */
export const REFERENCE_BELOW = 2;

/**
 * The same reading, taken anywhere — between realms, and above the ninth.
 *
 * The mountain stops at nine realms; 無盡塔 the tower does not, so it needs the reference
 * as a curve rather than as nine points. Feed it 4.5 and it gives what a cultivator
 * halfway through the fourth realm would hold; feed it 30 and it gives what a
 * twenty-first realm would hold, if there were one.
 */
export function referenceAt(realm: number): number {
  const r = Math.max(1, realm);
  const { gain } = UPGRADE_INFO.technique;
  return r * LAYERS_PER_REALM * gain ** Math.max(0, r * LEVELS_PER_REALM - REFERENCE_BELOW);
}

export function referencePower(realm: number): number {
  return referenceAt(Math.min(9, realm));
}

/**
 * The share of the reference each step of a realm occupies. The three commons of a
 * realm have to be an easy one, a middling one and a hard one — the first version
 * indexed by *realm* rather than by beast, and all three came out with the same power
 * and the same odds, which turns three distinct animals into three identical buttons.
 */
const STEPS = [0.45, 0.62, 0.84];

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
  return ref * STEPS[Math.max(0, i) % STEPS.length];
}

export interface Round {
  readonly playerHealth: number;   // 0..1
  readonly beastHealth: number;    // 0..1
  readonly playerDamage: number;
  readonly beastDamage: number;
  /** 訣 The arts that fired this round, in the order the sequence ran them. */
  readonly arts: readonly string[];
  /** True when the beast's blow was turned aside — the screen draws that differently. */
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
 * 氣運 How the qi runs today — one roll for each side, before a blow is thrown.
 *
 * Blow-by-blow noise averages away: ten blows of ±22% come out within 4% of the mean,
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
 * So it simply *fights* — twenty-five times, on spread seeds — and counts. Pure, cheap,
 * and it can never disagree with what the player is about to watch.
 */
export function odds(s: State, b: Beast, standing?: number): number {
  let won = 0;
  for (let i = 0; i < SAMPLES; i++) {
    if (fight(s, b, (i * 2654435761) >>> 0, standing).won) won++;
  }
  return Math.max(0.02, Math.min(0.98, won / SAMPLES));
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

export function currentWarden(s: State): Beast {
  return wardenOf(s.realm);
}
