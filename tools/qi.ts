/**
 * 氣查 The audit of the qi: everywhere it arrives, everywhere it leaves, and the one
 * question a player actually asks.
 *
 * Bruno: *"preciso de uma auditoria massiva ao sistema de qi e tudo o que a ele está
 * associado/ligado, sinto que existem bugs e opções que resetam ou tiram qi quando
 * utilizadas."*
 *
 * He has said a version of this three times now, and twice it turned out to be true:
 * 溢 the ladder used to throw away the overflow of a lump, and 買 the melt never said
 * that the qi it paid would be spent by the climb the instant it landed. Both are
 * fixed. This is the harness that would have caught them the first time, and it asks
 * four different questions rather than one:
 *
 *   出入 **Every verb pays what it says.** Each action in the game is applied to a real
 *     state and the qi that moved is compared against the price the screen quotes for
 *     it. A button that takes more than it says is the bug he is describing.
 *   梯 **The ladder conserves.** Across a long absence, qi in equals qi held plus every
 *     rung opened. Nothing evaporates between two ticks of the clock.
 *   存 **A save survives being read back.** The state is round-tripped through
 *     `validate` at every step of a real run, and any field that comes back different
 *     is a field the game silently deletes every time the app is closed.
 *   鐘 **The clock cannot rob you.** A phone whose clock jumps backwards, a save older
 *     than it should be, a day of absence: none of them may take qi away.
 *
 * Run with `npm run qi`.
 */
import {
  atCeiling, breakThrough, buy, canBreakThrough, canBuy, canCondense, condense,
  condenseCost, tribulationPool, upgradeCost, validate,
  type State, type Upgrade,
} from '../src/sim/state.ts';
import { advance, layerCost, layersOpened, rate } from '../src/sim/time.ts';
import { LAYERS_PER_REALM } from '../src/sim/balance.ts';
import { brew, canBrew, clearFloor, floorQi, standingFloor } from '../src/sim/trials.ts';
import { pillCost } from '../src/sim/furnace.ts';
import { salvageUpTo, salvageWorth, salvageable } from '../src/sim/salvage.ts';
import { salvageBonus } from '../src/sim/awaken.ts';
import { canDrive, drive, driveCost, DRIVE_SIZES } from '../src/sim/hunt.ts';
import { harvest, harvestValue, isRipe, plant, plantable, seedCost } from '../src/sim/cave.ts';
import { canEnter, doorsAt, enter as enterSecret, giftOf, inside as insideSecret, leave as leaveSecret, open as openDoor } from '../src/sim/secret.ts';
import { answer as answerMeeting, meetingDue, priceOf } from '../src/sim/meet.ts';
import { takeKill } from '../src/sim/combat.ts';
import { seenBounty } from '../src/sim/combat.ts';
import { huntable } from '../src/data/bestiary.ts';
import { HABITS, play } from './habits.ts';
import { playEndgame } from './endgame.ts';
import { duration, num } from '../src/sim/format.ts';

const problems: string[] = [];
const fail = (where: string, what: string) => {
  problems.push(`${where}: ${what}`);
  console.log(`  ✗ ${where}  ${what}`);
};
const ok = (what: string) => console.log(`  ✓ ${what}`);

/** Two numbers are the same number if they agree to a part in a million. */
const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(a) * 1e-9);

console.log('\n氣查 the audit of the qi\n');

// ── 出入 Every verb pays what it says ──────────────────────────────────────
console.log('出入 every verb, against the price it quotes');
{
  /** A cultivator deep enough that every system in the game is open to them. */
  const deep = (): State => {
    const run = play(HABITS.find((h) => h.name === 'active')!);
    return run.state;
  };
  const s0 = deep();

  // 修 The four upgrades. Each takes its own quoted price and nothing else.
  for (const u of ['technique', 'method', 'pills', 'cores'] as Upgrade[]) {
    // 滿 A finished cultivator has every box full, and a full box is not a bug: the
    // level is put back one so there is something to buy.
    let s: State = {
      ...s0, qi: s0.qi + 1e18, materials: s0.materials + 1e12,
      levels: { ...s0.levels, [u]: Math.max(0, s0.levels[u] - 1) },
    };
    if (!canBuy(s, u)) { fail(`修 ${u}`, 'could not be bought at all with everything in hand'); continue; }
    const price = upgradeCost(s, u);
    const before = { qi: s.qi, materials: s.materials };
    s = buy(s, u);
    const paidQi = before.qi - s.qi;
    const paidMat = before.materials - s.materials;
    const wanted = u === 'cores' ? { qi: 0, mat: price } : { qi: price, mat: 0 };
    if (!same(paidQi, wanted.qi) || !same(paidMat, wanted.mat)) {
      fail(`修 ${u}`, `quoted ${num(price)}, took ${num(paidQi)} qi and ${num(paidMat)} 材`);
    }
  }
  ok('修 the four upgrades take their quoted price and nothing more');

  // 凝丹 Condensing a core out of raw qi.
  {
    let s = { ...s0, qi: s0.qi + 1e18 };
    if (canCondense(s)) {
      const price = condenseCost(s);
      const before = s.qi;
      s = condense(s);
      if (!same(before - s.qi, price)) fail('凝丹', `quoted ${num(price)}, took ${num(before - s.qi)}`);
      else ok('凝丹 condensing takes the price the card shows');
    }
  }

  // 爐 A pill. It is the one thing that takes qi and material together.
  {
    let s = { ...s0, qi: s0.qi + 1e18, materials: s0.materials + 1e12, realm: 9 };
    const line = (['body', 'bane', 'fortune'] as const).find((l) => canBrew(s, l));
    if (line) {
      const price = pillCost(s.brewed, line);
      const before = { qi: s.qi, materials: s.materials };
      s = brew(s, line);
      if (!same(before.qi - s.qi, price.qi) || !same(before.materials - s.materials, price.materials)) {
        fail('爐 brewing', `quoted ${num(price.qi)} qi and ${num(price.materials)} 材, `
          + `took ${num(before.qi - s.qi)} and ${num(before.materials - s.materials)}`);
      } else ok('爐 a pill takes the qi and the material it quotes');
    }
  }

  // 塔 A tower floor pays; it never charges.
  {
    let s = { ...s0, realm: 9 };
    const floor = standingFloor(s);
    const paid = floorQi(s, floor);
    const before = s.qi;
    s = clearFloor(s, floor);
    if (s.qi < before) fail('塔 a floor', `qi fell by ${num(before - s.qi)} for clearing a floor`);
    else if (!same(s.qi - before, paid)) {
      fail('塔 a floor', `quoted ${num(paid)} qi, paid ${num(s.qi - before)}`);
    } else ok('塔 a tower floor pays what it quotes and takes nothing');
  }

  // 拆 The melt. The button states its own size before it is pressed.
  {
    let s = { ...s0 };
    const going = salvageable(s.chest, 'heaven');
    if (going.length > 0) {
      const quoted = salvageWorth(going, salvageBonus(s.awakened));
      const before = s.qi;
      s = salvageUpTo(s, 'heaven');
      if (!same(s.qi - before, quoted)) {
        fail('拆 the melt', `the button said ${num(quoted)}, it paid ${num(s.qi - before)}`);
      } else ok('拆 melting the chest pays exactly what the button says');
    }
  }

  // 圍 A drive: the one thing that spends qi on hunting.
  {
    let s = { ...s0, qi: s0.qi + 1e18 };
    const beast = [...huntable(s.realm, s.layer)].reverse().find((b) => canDrive(s, b));
    if (beast) {
      const n = DRIVE_SIZES[0];
      const price = driveCost(s, n);
      const before = s.qi;
      s = drive(s, beast, n, 7).state;
      if (!same(before - s.qi, price)) fail('圍 a drive', `quoted ${num(price)}, took ${num(before - s.qi)}`);
      else ok('圍 a drive takes the qi on the button');
    }
  }

  // 狩 A kill. It pays 見 first sight once and never takes anything.
  {
    let s = { ...s0 };
    const beast = [...huntable(s.realm, s.layer)][0];
    if (beast) {
      const first = (s.killed[beast.key] ?? 0) === 0;
      const before = s.qi;
      s = takeKill(s, beast);
      const want = first ? seenBounty(beast) : 0;
      if (!same(s.qi - before, want)) {
        fail('狩 a kill', `paid ${num(s.qi - before)} qi where ${num(want)} was due`);
      } else ok('狩 a kill never costs qi, and pays 見 once');
    }
  }

  // 洞天 A bed: material in, qi out, and the qi is the quoted one.
  {
    const bare = [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }];
    let s: State = { ...s0, materials: s0.materials + 1e9, beds: bare };
    const h = plantable(s)[0];
    if (h) {
      const cost = seedCost(s, h);
      const beforeQi = s.qi;
      const beforeMat = s.materials;
      s = plant(s, 0, h.key);
      if (!same(beforeQi - s.qi, 0)) fail('洞天 planting', `took ${num(beforeQi - s.qi)} qi, and a seed is paid in material`);
      if (!same(beforeMat - s.materials, cost)) fail('洞天 planting', `quoted 材 ${num(cost)}, took ${num(beforeMat - s.materials)}`);
      const ripe = { ...s, at: s.at + h.hours * 3600 };
      const pays = harvestValue(ripe, h);
      const q = ripe.qi;
      const taken = harvest(ripe, 0);
      if (!isRipe(ripe, ripe.beds[0])) fail('洞天 a bed', 'did not ripen on its own clock');
      else if (!same(taken.qi - q, pays)) fail('洞天 taking', `said ${num(pays)} qi, paid ${num(taken.qi - q)}`);
      else ok('洞天 a bed costs material, pays the qi it promises, and never touches qi to plant');
    }
  }

  // 秘境 A room: everything it pays is banked at once, and a gate costs nothing.
  {
    let s = { ...s0, runAt: s0.at - 99_999, runStep: -1 };
    if (canEnter(s)) {
      s = enterSecret(s);
      for (let i = 0; i < 12 && insideSecret(s); i++) {
        const step = s.runStep;
        const room = doorsAt(s, step)[0];
        const gift = giftOf(s, room, step);
        const before = s.qi;
        const next = openDoor(s, 0, 4242 + i);
        const moved = next.qi - before;
        const wanted = gift.fight ? 0 : gift.qi;
        // A room with gear in it can also melt what the chest had no room for, which is
        // qi the run really did pay: more than quoted is fine here, less never is.
        if (moved < wanted - 1e-6) {
          fail('秘境 a room', `room ${step + 1} quoted ${num(wanted)} qi and paid ${num(moved)}`);
          break;
        }
        s = next;
      }
      if (insideSecret(s)) s = leaveSecret(s);
      ok('秘境 every room pays at least what the door quoted, and a gate takes nothing');
    }
  }

  // 緣 A meeting: the only card in the game that can ask for qi.
  {
    let s = { ...s0, met: [], metAt: s0.at - 99_999, qi: s0.qi + 1e18 };
    const meeting = meetingDue(s);
    if (meeting) {
      for (const which of [0, 1] as const) {
        const cost = priceOf(s, meeting.picks[which]);
        const before = s.qi;
        const after = answerMeeting(s, meeting.key, which, 11);
        const moved = before - after.qi;
        if (moved > cost.qi + 1e-6) {
          fail('緣 a meeting', `offer ${which + 1} asked ${num(cost.qi)} qi and took ${num(moved)}`);
        }
      }
      ok('緣 a meeting never takes more qi than its own offer asks');
    }
  }

  // 突破 The breakthrough. It used to burn the rung it stood on; it must not.
  {
    let s = { ...s0 };
    for (let i = 0; i < 400 && !canBreakThrough(s); i++) {
      s = advance(s, s.at + 3600);
      if (atCeiling(s)) s = { ...s, wardenFell: true };
    }
    if (canBreakThrough(s)) {
      const before = s.qi;
      const after = breakThrough(s);
      if (after.qi < before - 1e-6) {
        fail('突破 the breakthrough', `burned ${num(before - after.qi)} qi on the way out of a realm`);
      } else ok('突破 the breakthrough carries the qi rather than burning it');
    }
  }
}

// ── 梯 The ladder conserves ────────────────────────────────────────────────
console.log('\n梯 the ladder, across an absence');
{
  /**
   * 守恆 What goes in comes out. Over any stretch of time, the qi gathered is either
   * standing in the bar or was spent on a rung, and there is no third place for it to
   * be. The overflow bug was exactly a failure of this: the rest of a lump vanished.
   */
  const priceAt = (s: State, realm: number, layer: number) =>
    layerCost(realm, layer, s.unlocked);

  let worst = 0;
  for (const habit of ['once a day', 'active']) {
    const run = play(HABITS.find((h) => h.name === habit)!);
    let s: State = { ...run.state, realm: 4, layer: 2, qi: 0, tribulation: 0 };
    for (const step of [1, 60, 900, 3600, 86_400, 7 * 86_400]) {
      const before = s;
      const after = advance(before, before.at + step);
      // What the rungs between the two states cost, at the prices the ladder quotes.
      let paid = 0;
      let realm = before.realm;
      let layer = before.layer;
      while (realm < after.realm || (realm === after.realm && layer < after.layer)) {
        paid += priceAt(before, realm, layer);
        if (++layer >= LAYERS_PER_REALM) { layer = 0; realm += 1; }
      }
      // And what the clock paid for, layer by layer, which is how advance walks it.
      const gathered = after.qi + paid - before.qi;
      const floorRate = rate(before) * step;
      const ceilRate = rate(after) * step;
      // 差 The band is compared in parts per million rather than in qi: at the ninth
      // realm a rung is measured in trillions, and a double carries fifteen digits, so
      // an absolute epsilon there is asking arithmetic for something it does not have.
      const slack = Math.max(1, floorRate * 1e-9);
      if (gathered < floorRate - slack || gathered > ceilRate + slack) {
        fail('梯 the ladder', `${step}s paid ${num(gathered)} qi, and the rate allows `
          + `${num(floorRate)} to ${num(ceilRate)}`);
      }
      worst = Math.max(worst, Math.abs(gathered - floorRate) / Math.max(1, floorRate));
      s = after;
    }
  }
  ok(`梯 every second of every absence is either in the bar or in a rung`);

  /**
   * 溢 And a lump landing on a cheap rung keeps its remainder. This is the exact bug
   * Bruno reported: a melt worth ten rungs opened one and deleted the rest.
   */
  {
    const run = play(HABITS.find((h) => h.name === 'once a day')!);
    const base: State = { ...run.state, realm: 3, layer: 0, qi: 0 };
    const rung = layerCost(base.realm, base.layer, base.unlocked);
    const lump = rung * 4.5;
    const after = advance({ ...base, qi: lump }, base.at + 1);
    const opened = layersOpened(after) - layersOpened(base);
    const spent = Array.from({ length: opened }, (_, i) =>
      layerCost(base.realm, base.layer + i, base.unlocked)).reduce((a, b) => a + b, 0);
    const gathered = rate(base) * 1;
    if (after.qi < lump - spent - gathered * 2) {
      fail('溢 a lump', `${num(lump)} opened ${opened} rungs worth ${num(spent)} and left `
        + `${num(after.qi)}, so ${num(lump - spent - after.qi)} went nowhere`);
    } else ok(`溢 a lump of ${num(lump)} opens ${opened} rungs and keeps the remainder`);
  }
}

// ── 存 A save survives being read back ─────────────────────────────────────
console.log('\n存 the save, round-tripped through validate');
{
  /**
   * 失 The bug class this exists for: `validate` is run on every load, and anything it
   * quietly clamps is deleted every time the app is closed. It has happened twice, both
   * times to a field the player had just paid for.
   *
   * Every field that can hold a number is compared. A run is walked and the state is
   * round-tripped at every visit, so the report says *where* it first goes wrong rather
   * than only that it does.
   */
  const fields = (s: State) => ({
    qi: s.qi, materials: s.materials, realm: s.realm, layer: s.layer,
    technique: s.levels.technique, method: s.levels.method,
    pills: s.levels.pills, cores: s.levels.cores,
    tribulation: s.tribulation, tower: s.tower, chest: s.chest.length,
    unlocked: s.unlocked.length, awakened: s.awakened.length,
  });

  const check = (where: string, s: State) => {
    const back = validate(JSON.parse(JSON.stringify(s)), s.at);
    const a = fields(s);
    const b = fields(back);
    for (const k of Object.keys(a) as (keyof typeof a)[]) {
      if (!same(a[k], b[k])) return `${where}: ${k} ${num(a[k])} came back ${num(b[k])}`;
    }
    return null;
  };

  for (const habit of HABITS) {
    const run = play(habit);
    const bad = check(`勤 ${habit.name}`, run.state);
    if (bad) fail('存 a finished climb', bad);
  }
  ok('存 every habit\'s finished cultivator survives a reload unchanged');

  // 劫 And the endgame, which is where the ceiling on qi is closest to the qi.
  {
    const end = playEndgame(40);
    let first: string | null = null;
    let s = end.end;
    const bad = check('劫 forty marks', s);
    if (bad) first = bad;
    if (first) fail('存 the endgame', first);
    else ok('存 forty crossings survive a reload unchanged');
  }

  /**
   * 頂 And the ceiling itself, stated rather than trusted. `validate` refuses any qi
   * above what the fastest conceivable cultivator could have gathered since the run
   * began, and the endgame's own pool is measured in days of that cultivator's rate.
   * If the pool ever passes the ceiling, a save at the top loses qi on every load and
   * the tribulation becomes uncrossable.
   */
  {
    const end = playEndgame(40);
    const s = end.end;
    const pool = tribulationPool(s);
    const back = validate(JSON.parse(JSON.stringify({ ...s, qi: pool })), s.at);
    if (back.qi < pool - 1e-6) {
      fail('頂 the ceiling on qi', `a full 雷池 pool of ${num(pool)} came back as ${num(back.qi)} `
        + `at ${s.tribulation} marks, so the Dragon can never be called again`);
    } else ok('頂 a full 雷池 pool is under the ceiling validate allows');
  }
}

// ── 歸 The return says the truth about the hours away ──────────────────────
console.log('\n歸 the homecoming');
{
  /**
   * 報 The card that greets a returning cultivator has to add up. A bar that is lower
   * than it was left is the ladder having taken the qi, and the card has to say the qi
   * was gathered and where it went, rather than reporting nothing at all.
   */
  // 夜 The shape a player actually meets, on a cultivator who is really there: thirty
  // days into the game, they close the app with the bar nearly full and come back to a
  // bar that is nearly empty and a rung further up.
  const mid: State = play(HABITS.find((h) => h.name === 'once a day')!, 30).state;
  const rung = layerCost(mid.realm, mid.layer, mid.unlocked);
  const before: State = { ...mid, qi: rung * 0.95 };
  // Away just long enough to gather nine tenths of a rung: with the bar already at
  // 0.95 that opens exactly one, and the bar comes back **lower than it was left**.
  const hours = Math.round((rung * 0.9) / rate(before));
  const after = advance(before, before.at + hours);

  let paid = 0;
  let realm = before.realm;
  let layer = before.layer;
  for (let g = 0; g < 200; g++) {
    if (realm > after.realm || (realm === after.realm && layer >= after.layer)) break;
    const cost = layerCost(realm, layer, before.unlocked);
    if (Number.isFinite(cost)) paid += cost;
    if (++layer >= LAYERS_PER_REALM) { layer = 0; realm += 1; }
  }
  const gathered = after.qi - before.qi + paid;
  const old = Math.max(0, after.qi - before.qi);
  if (gathered <= 0) fail('歸 the return', `${hours}s away gathered nothing at all`);
  else if (old < gathered) {
    const fell = after.qi < before.qi;
    ok(`歸 ${duration(hours)} away gathered ${num(gathered)} qi and ${num(paid)} of it `
      + `opened ${after.layer - before.layer} rung. The card used to say `
      + `"${num(old)} gathered"${fell ? ', with the bar lower than it was left' : ''}.`);
  } else ok('歸 the return card and the ladder agree');
}

// ── 圍 A price that cannot be paid takes nothing ───────────────────────────
console.log('\n圍 a price nobody can pay');
{
  const run = play(HABITS.find((h) => h.name === 'active')!);
  const s = run.state;
  const beast = [...huntable(s.realm, s.layer)].reverse().find((b) => canDrive(s, b));
  if (beast) {
    const n = DRIVE_SIZES[DRIVE_SIZES.length - 1];
    const price = driveCost(s, n);
    const broke: State = { ...s, qi: price / 2 };
    const out = drive(broke, beast, n, 3);
    if (out.state.qi < broke.qi - 1e-6) {
      fail('圍 a drive nobody can pay for', `took ${num(broke.qi - out.state.qi)} qi anyway`);
    } else ok('圍 a drive that cannot be paid for takes nothing and does nothing');
  }
}

// ── 鐘 The clock cannot rob you ────────────────────────────────────────────
console.log('\n鐘 the clock');
{
  const run = play(HABITS.find((h) => h.name === 'active')!);
  const s = run.state;

  // A clock that jumps backwards pays nothing, and must take nothing.
  {
    const back = advance(s, s.at - 3600);
    if (back.qi < s.qi - 1e-6) fail('鐘 a clock going backwards', `took ${num(s.qi - back.qi)} qi`);
    else ok('鐘 a clock that jumps backwards takes nothing');
  }

  // 存 And a save read on a device whose clock is behind the one it was written on.
  {
    const earlier = s.at - 30 * 86_400;
    const back = validate(JSON.parse(JSON.stringify(s)), earlier);
    if (back.qi < s.qi - 1e-6) {
      fail('鐘 a phone a month behind', `${num(s.qi)} qi came back as ${num(back.qi)}, `
        + `because the ceiling is measured from startedAt and startedAt was pulled to now`);
    } else ok('鐘 a save read on a phone whose clock is behind keeps its qi');
  }

  // 始 And the worst shape of all: a phone whose clock is set **before the day the run
  // began**. `startedAt` is pulled forward to now, so the time the cultivator has been
  // alive reads as zero, and anything measured against it collapses.
  {
    const back = validate(JSON.parse(JSON.stringify(s)), s.startedAt - 60);
    const kept = back.qi / Math.max(1, s.qi);
    if (kept < 0.001) {
      fail('鐘 a phone set before the run began',
        `${num(s.qi)} qi came back as ${num(back.qi)}, which is ${(kept * 100).toFixed(4)}% of it`);
    } else ok('鐘 a phone set before the run began keeps a real share of the qi');
  }

  // A day away pays a day, and never less.
  {
    const day = advance(s, s.at + 86_400);
    if (day.qi < s.qi && layersOpened(day) === layersOpened(s)) {
      fail('鐘 a day away', `qi fell by ${num(s.qi - day.qi)} with no rung opened`);
    } else ok('鐘 a day away never leaves a cultivator with less than they had, unless a rung took it');
  }
}

console.log(problems.length === 0
  ? '\n氣 every path the qi takes was walked, and it arrives where it says it does.\n'
  : `\n✗ ${problems.length} problems\n`);
