import { commonsOf, type Beast, wardenOf } from '../data/bestiary.ts';
import {
  ART_NUMBERS, BLOW_LOW, BLOW_SPREAD, COMMON_DEPTH_FIRST, COMMON_DEPTH_STEP, COMMON_STEPS,
  CORES_FREE_REALMS, FIRST_STEPS, FORM, HEALTH_PER_POWER, HUNT_SHARE, LAYERS_PER_REALM,
  LEVELS_PER_REALM, ODDS_CEILING, ODDS_FLOOR, OLD_BEAST_FLOOR, QUARRY_BOUNTY, QUARRY_LOOT,
  REFERENCE_BELOW, ROUND_CAP, SEEN_BOUNTY, STANCE_NUMBERS, WARDEN_LOOT, WARDEN_TRIBUTE,
  floorPay, ladderBetween,
} from './balance.ts';
import { UPGRADE_INFO, crossTribulation, power, tribulationPower, type State } from './state.ts';
import { beastWeakness } from './dao.ts';
import { heavenAt } from '../data/heavens.ts';
import { sequenceOf, stanceOf } from './arts.ts';
import { pillBane } from './furnace.ts';
import { lootTaken } from './trials.ts';
import { isQuarry, quarryOwed, weekOf } from './week.ts';
import {
  classArts, classBounty, classForm, classMend, classTower, classWarden, gearArt, gearSunder,
} from './schools.ts';
import { BOON_BLOOD, BOON_LOTUS } from './balance.ts';
import { DEMON_KEY } from './seclusion.ts';
import { hasBoon } from '../data/meetings.ts';
import { NO_KIT, type Kit } from './kit.ts';

export { NO_KIT, type Kit };

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
 * 基準 The reference power at the top of a realm: a cultivator REFERENCE_BELOW levels
 * short of the cap, with 妖丹 cores counted from past the first CORES_FREE_REALMS. Why it
 * stands there, and why the cores are the wall between playing and waiting, is written
 * beside the two numbers in balance.ts.
 */
export { REFERENCE_BELOW, CORES_FREE_REALMS };

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

/**
 * A beast's power, always as a fraction of its realm's reference. A common stands at its
 * share of COMMON_STEPS, or of FIRST_STEPS in the first realm, which is spaced against the
 * player rather than against its own summit. Both are in balance.ts with their measurements.
 */
export function beastPower(b: Beast): number {
  const ref = referencePower(b.realm);
  if (b.warden) return ref * WARDEN_EDGE;
  const i = commonsOf(b.realm).findIndex((x) => x.key === b.key);
  const steps = b.realm === 1 ? FIRST_STEPS : COMMON_STEPS;
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
  /** 九轉 Whether a carried Nine-Turn Pill brought the cultivator back in this fight. */
  readonly revived?: boolean;
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

/** 擊 One blow's roll: BLOW_LOW to BLOW_LOW + BLOW_SPREAD of itself. */
function blowRoll(d: () => number): number {
  return BLOW_LOW + d() * BLOW_SPREAD;
}

/** 氣運 FORM (the one roll each side gets before a blow is thrown) is in balance.ts. */
export { FORM };

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
export function fight(s: State, b: Beast, seed: number, standing?: number, kit: Kit = NO_KIT): Outcome {
  return run(setup(s, b, standing, kit), seed, true);
}

/**
 * 備 Everything a fight reads off the cultivator and the beast before the first blow.
 *
 * None of it changes between two fights of the same pair, and 算 the odds are forty-one
 * of them. Worked out inside every fight, `power()` alone was more than half of all the
 * time the measuring harnesses spend; worked out once, the odds of every beast on the
 * hunt screen come thirty times sooner, and the fights themselves are the same fights.
 */
interface Setup {
  readonly stance: ReturnType<typeof stanceOf>;
  readonly sequence: ReturnType<typeof sequenceOf>;
  readonly pp: number;
  readonly bp0: number;
  readonly formFloor: number;
  readonly artStrike: number;
  readonly mend: number;
  readonly playerPower: number;
  readonly kit: Kit;
}

function setup(s: State, b: Beast, standing?: number, kit: Kit = NO_KIT): Setup {
  const pp = power(s);
  // 法 What an art strikes for: the arts line on the body, and the Arts school's step.
  // The line has no hold on 劫 the tribulation, for the reason 破 has none: the Dragon is
  // anchored to the power that faced it, so anything that wins fights outside power()
  // would turn every crossing into a walkover. Measured: with the line on the Dragon,
  // 37 of 40 crossings came in over 90%. The school's own step still counts, because a
  // class is a choice and is bounded.
  const tribulation = standing === undefined && b.key === 'dragon' && s.realm === 9;
  return {
    stance: stanceOf(s),
    sequence: sequenceOf(s),
    pp,
    // A tower floor brings its own power; everywhere else the beast brings its own.
    bp0: (standing === undefined ? effectiveBeastPower(s, b) : effectiveBeastPower(s, b, standing))
      * (b.key === DEMON_KEY ? kit.demon : 1),
    // 劍聖 The Sword Saint's form never rolls below its middle.
    formFloor: classForm(s),
    artStrike: (tribulation ? 1 : gearArt(s)) * classArts(s),
    // 羅漢 The Arhat mends a little every round, as 續 Endure does.
    // 蓮 And the lotus seed from the monk on the road, for somebody who walked kindly.
    mend: classMend(s) + (hasBoon(s, 'lotus') ? BOON_LOTUS : 0) + kit.mend,
    playerPower: pp,
    kit,
  };
}

/** One fight from a setup. `record` keeps the rounds for the screen; the odds need only who won. */
function run(u: Setup, seed: number, record: boolean): Outcome {
  const { stance, sequence, pp, bp0, artStrike, mend, kit } = u;
  let revived = !kit.revive;

  let beastPower = bp0;      // 纏 and 鶴唳 shave this as the fight runs
  let ph = pp * HEALTH_PER_POWER;
  let bh = bp0 * HEALTH_PER_POWER;
  const ph0 = ph;
  const bh0 = bh;
  let took = 0;              // what the beast dealt last round, for 傀儡 and 鏡

  const d = dice(seed);
  // The dice are still read under a form floor, so every other roll lands where it would have.
  const myForm = Math.max(1 - FORM + d() * FORM * 2, u.formFloor);
  const itsForm = 1 - FORM + d() * FORM * 2;
  beastPower *= itsForm;

  // 疾 runs the sequence twice a round, so the cursor is its own counter rather than
  // the round number.
  const perRound = stance?.key === 'swift' ? STANCE_NUMBERS.swiftStrikes : 1;
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
      let blow = pp * myForm * (stance?.key === 'steady' ? 1 : blowRoll(d))
        * (stance?.key === 'swift' ? STANCE_NUMBERS.swiftShare : 1);

      if (stance) {
        if (stance.key === 'guard') blow *= STANCE_NUMBERS.guardDealt;
        if (stance.key === 'fierce') blow *= STANCE_NUMBERS.fierceDealt;
        if (stance.key === 'reckless') {
          blow = d() < STANCE_NUMBERS.recklessMiss ? 0 : blow * STANCE_NUMBERS.recklessHit;
        }
        if (stance.key === 'reverse') blow *= 1 + (1 - ph / ph0);
        if (stance.key === 'mirror') blow = Math.max(blow, took);
      }

      if (art) {
        fired.push(art.key);
        switch (art.key) {
          case 'fox': missed = true; break;
          case 'ape': blow *= ART_NUMBERS.ape; break;
          case 'crane': beastPower *= ART_NUMBERS.crane; break;
          case 'tiger': blow *= ART_NUMBERS.tiger; break;
          case 'turtle': healed += ph0 * ART_NUMBERS.turtle * artStrike; break;
          case 'puppet': blow += took * ART_NUMBERS.puppet; break;
          case 'wolf': blow *= 1 + ART_NUMBERS.wolf * i; break;
          case 'serpent': if (ph / ph0 < ART_NUMBERS.serpentBelow) blow *= ART_NUMBERS.serpent; break;
          case 'dragon': blow *= ART_NUMBERS.dragon; missed = true; break;
        }
        blow *= artStrike;
      }

      mine += blow * kit.strike;
    }

    if (stance?.key === 'entangle') beastPower *= STANCE_NUMBERS.entangle;
    if (stance?.key === 'endure') healed += ph0 * STANCE_NUMBERS.endure;
    healed += ph0 * mend;

    bh -= mine;

    let theirs = missed ? 0 : beastPower * blowRoll(d);
    if (stance?.key === 'guard') theirs *= STANCE_NUMBERS.guardTaken;
    if (stance?.key === 'fierce') theirs *= STANCE_NUMBERS.fierceTaken;
    theirs *= kit.taken;
    if (kit.bind && i === 0) theirs = 0;
    took = theirs;
    if (kit.reflect > 0) bh -= theirs * kit.reflect;

    ph = Math.min(ph0, ph - theirs + healed);
    if (ph <= 0 && !revived) { ph = ph0; revived = true; }

    if (record) rounds.push({
      playerHealth: Math.max(0, ph / ph0),
      beastHealth: Math.max(0, bh / bh0),
      playerDamage: mine,
      beastDamage: theirs,
      arts: fired,
      missed,
    });
  }

  return { won: bh <= 0 || ph / ph0 > bh / bh0, rounds, playerPower: pp, beastPower: bp0, revived: kit.revive && revived };
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
  return (b.realm - 1) * LAYERS_PER_REALM + COMMON_DEPTH_FIRST + COMMON_DEPTH_STEP * Math.max(0, i);
}

export function loot(b: Beast): number {
  const depth = b.warden ? b.realm * LAYERS_PER_REALM : beastDepth(b);
  const share = b.warden ? HUNT_SHARE * WARDEN_LOOT : HUNT_SHARE;
  return Math.max(1, Math.round(floorPay(depth) * share));
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
  // 期 The week's quarry pays its qi on the first one of the week, whether or not this
  // is the first ever. Both can land on the same kill, and should: the week pointed at
  // something the player had never been to look at, which is the best week it can have.
  const week = isQuarry(s, b) && quarryOwed(s);
  return {
    ...s,
    wardenFell: b.warden ? true : s.wardenFell,
    // 金剛 The Vajra's first sights and quarries pay more.
    qi: s.qi + (kills === 0 ? seenPaid(s, b) : 0) + (week ? quarryPaid(s, b) : 0),
    materials: s.materials + lootTaken(s, lootFrom(s, b)),
    killed: { ...s.killed, [b.key]: kills + 1 },
    quarryWeek: week ? weekOf(s.at) : s.quarryWeek,
  };
}

/**
 * 首 What the first kill of the week's quarry pays, once, that week.
 *
 * Built on 見 the first-sight bounty rather than beside it, so the two can never drift
 * apart and a player reading "a fifth of a first sight" is reading the truth. A warden
 * is never the quarry, so the zero seenBounty returns for one cannot leak in here.
 */
export function quarryBounty(b: Beast): number {
  return Math.max(1, Math.round(seenBounty(b) * QUARRY_BOUNTY));
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
  const mine = (Math.max(1, Math.min(9, s.realm)) - 1) * LAYERS_PER_REALM + COMMON_DEPTH_FIRST;
  const floor = floorPay(mine) * HUNT_SHARE * OLD_BEAST_FLOOR;
  // 期 The week's quarry, doubled here rather than at the point of payment, so that every
  // screen quoting a beast's material quotes the doubled number without knowing about the
  // week at all: 狩 the hunt row, 圍 the drive, and the line under 鬥 the arena.
  const week = isQuarry(s, b) ? QUARRY_LOOT : 1;
  return Math.max(own, Math.round(floor)) * week;
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
export function odds(s: State, b: Beast, standing?: number, kit: Kit = NO_KIT): number {
  return Math.max(ODDS_FLOOR, Math.min(ODDS_CEILING, oddsRaw(s, b, standing, kit)));
}

/**
 * 立 The Dragon this cultivator would meet at even odds, as they stand right now.
 *
 * Read off the fight itself (stance, arts, class and every line the tribulation lets
 * count), so it is the honest measure of what faced the Dragon, not 力 times a guess.
 * The same forty-one seeded fights the odds read, halved on the Dragon's power until
 * they split down the middle: a few hundred fights, once a crossing.
 */
export function evenDragon(s: State): number {
  const at = 0.5;
  const u0 = setup(s, currentWarden(s));
  const wins = (p: number) => {
    const u = { ...u0, bp0: p };
    let won = 0;
    for (let i = 0; i < SAMPLES; i++) if (run(u, (i * 2654435761) >>> 0, false).won) won++;
    return won / SAMPLES;
  };
  let lo = Math.log(u0.pp) - 8, hi = Math.log(u0.pp) + 8;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (wins(Math.exp(mid)) >= at) lo = mid; else hi = mid;
  }
  return Math.exp(lo);
}

/**
 * 渡 Cross the tribulation: the Dragon that fell, and the one met at even odds, both read
 * off the same fight. The screen and every harness cross through here.
 */
export function crossNow(s: State): State {
  return crossTribulation(s, effectiveBeastPower(s, currentWarden(s)), evenDragon(s));
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
export function oddsRaw(s: State, b: Beast, standing?: number, kit: Kit = NO_KIT): number {
  let won = 0;
  const u = setup(s, b, standing, kit);
  for (let i = 0; i < SAMPLES; i++) {
    if (run(u, (i * 2654435761) >>> 0, false).won) won++;
  }
  return won / SAMPLES;
}

/**
 * 可 Whether this build could ever win the fight at all, which is a stronger question than
 * the odds. The odds are read from SAMPLES fights, so a fight won once in a few hundred
 * reads 0 there, and the screen shows it as ODDS_FLOOR. A loss costs nothing, so an
 * honest player may well press it until it lands: the server must not call that a cheat.
 * So a reading of 0 is looked at again, far deeper, before it is believed.
 */
export const BEATABLE_SAMPLES = 2000;
export function beatable(s: State, b: Beast, standing?: number, kit: Kit = NO_KIT): boolean {
  if (oddsRaw(s, b, standing, kit) > 0) return true;
  const u = setup(s, b, standing, kit);
  for (let i = 0; i < BEATABLE_SAMPLES; i++) {
    if (run(u, (i * 2246822519 + 374761393) >>> 0, false).won) return true;
  }
  return false;
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
  // 心魔 The heart demon is the cultivator's own power and nothing thins it: no sunder,
  // no bane, no blood method, no class. See sim/seclusion.ts.
  if (b.key === DEMON_KEY && standing !== undefined) return standing;
  const trial = standing === undefined && b.key === 'dragon' && s.realm === 9;
  if (trial) {
    // 劫 The tribulation is lightning, not a beast. 破甲 and 破煞 thin what has blood in
    // it; neither has any hold on heaven, and if they did the endgame would be a pill
    // you swallow once rather than a ladder you climb.
    return tribulationPower(s, base);
  }
  // 破 The body's sunder line, bent; 劍仙 the tower's floors; 武神 the wardens.
  const tower = standing !== undefined ? classTower(s) : 1;
  const warden = standing === undefined && b.warden ? classWarden(s) : 1;
  // 血 The blood method from the road, for somebody who walked hard. The Dragon is
  // returned above, before this line, so it never reaches the tribulation.
  const blood = hasBoon(s, 'blood') ? BOON_BLOOD : 1;
  return base * beastWeakness(s.unlocked) * pillBane(s.brewed) * gearSunder(s) * tower * warden * blood;
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

/**
 * 見期 What a first sight and the week's quarry actually pay this cultivator, 金剛 the
 * Vajra's half again included. The screens quote these, and the kill and the drive pay
 * them, so the number on the arena is the number that lands.
 */
export function seenPaid(s: State, b: Beast): number {
  return Math.round(seenBounty(b) * classBounty(s));
}
export function quarryPaid(s: State, b: Beast): number {
  return Math.round(quarryBounty(b) * classBounty(s));
}
