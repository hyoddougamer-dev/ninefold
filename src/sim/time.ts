import { LAYERS, LAYERS_PER_REALM, ladderAt } from './balance.ts';
import { layersOpened, rate, type State } from './state.ts';
import { layerCostFactor } from './dao.ts';

// 氣 The rate and the layer count live in state.ts, because the tribulation's pool is
// measured in days of gathering and so has to read the rate from inside the state.
export { layersOpened, rate };

/**
 * What the layer under a cultivator's feet costs.
 *
 * Every rung of the eighty-one has its own price, and each is dearer than the last. The
 * eighty-second does not exist: the ladder ends at the top of the ninth realm, qi banks
 * there for ever, and 渡劫 is what happens next.
 */
export function layerCost(realm: number, layer: number, unlocked: readonly string[] = []): number {
  const n = (realm - 1) * LAYERS_PER_REALM + layer;
  // The summit. There is no rung above the ninth layer of the ninth realm, so its price
  // is infinite and qi banks there for ever — which is where 渡劫 begins.
  if (n >= LAYERS - 1) return Infinity;
  return ladderAt(n) * layerCostFactor(unlocked);
}

/** 0..1 along the current layer. Once the ladder runs out it reads full and stays there. */
export function progress(s: State): number {
  const c = layerCost(s.realm, s.layer, s.unlocked);
  return Number.isFinite(c) ? Math.min(1, s.qi / c) : 1;
}

/** True once the last rung is open and there is nothing left to climb. */
export function ladderDone(s: State): boolean {
  return layersOpened(s) >= LAYERS - 1;
}

/**
 * The only way time moves.
 *
 * It walks layer by layer rather than applying one rate across the whole gap, because
 * the rate *changes* every time a layer opens. Applying a single rate to a twenty-hour
 * absence would underpay it in silence — and an idle game is played closed, so this is
 * not a detail: it is the difference between paying the hours the player did not watch
 * and lying about them.
 *
 * At a realm's ceiling the layers stop opening and qi banks instead. Time never climbs
 * a realm: beating the warden only unlocks the breakthrough, and pressing 突破 is what
 * takes it. The first version let a fallen warden open the gate here, so the realm
 * advanced on the next tick — the player never saw the button, and never saw the one
 * moment the game stops for.
 *
 * `auto` ignores the gate entirely and exists only so the balance simulation can trace
 * the theoretical curve. `focus` is 入定 — what the app being open is worth — and it is
 * never below 1, so no call of this function can ever pay less than the promised rate.
 */
export function advance(s: State, now: number, auto = false, focus = 1): State {
  let dt = now - s.at;
  if (!Number.isFinite(now) || dt <= 0) return { ...s, at: Math.max(s.at, now) };

  let { realm, layer, qi, wardenFell } = s;

  for (let guard = 0; guard <= LAYERS + 1; guard++) {
    const r = rate({ ...s, realm, layer }) * Math.max(1, focus);
    const cost = layerCost(realm, layer, s.unlocked);
    const ceiling = layer >= LAYERS_PER_REALM - 1;

    // At the ceiling, qi banks and time ends here. Only 突破 leaves a realm.
    if (ceiling && !auto) {
      const remaining = cost - qi;
      const seconds = remaining / r;
      if (!Number.isFinite(seconds) || seconds > dt) { qi += r * dt; break; }
      qi = cost + r * (dt - seconds);
      break;
    }

    // 溢 The overflow is carried, not thrown away, and for a long time it was thrown away.
    //
    // Bruno: *"já tive imensos casos de salvage items e o meu qi resetar ou não
    // contabilizar."* This loop was written for qi that arrives from the clock, and qi
    // from the clock lands on the rung price exactly — so `qi = 0` was right by accident
    // and only ever by accident. Every other way qi arrives is a **lump**: 拆 melting a
    // chest, 塔 a tower floor, 見 first sight of a beast, 囊 the opening purse. Land a
    // lump on a rung that costs less than it and the next tick opened one layer and
    // deleted the rest, with nothing on the screen to say so.
    //
    // A melt of ten pieces worth fifty thousand qi against a five-thousand rung bought
    // one layer and burned forty-five thousand. That is the whole of what he was seeing.
    const seconds = Math.max(0, cost - qi) / r;
    if (!Number.isFinite(seconds) || seconds > dt) { qi += r * dt; break; }

    qi = Math.max(0, qi - cost);
    dt -= seconds;
    if (++layer >= LAYERS_PER_REALM) {
      layer = 0;
      realm += 1;
      wardenFell = false;
    }
  }

  return { ...s, at: now, realm, layer, qi, wardenFell };
}

/**
 * 買 What a lump of qi would buy, if it landed right now.
 *
 * Bruno: *"já tive imensos casos de salvage items e o meu qi resetar ou não
 * contabilizar."* Traced in the running game, at the second realm's fourth rung: he
 * stands at 60,059 qi, melts four pieces for 24,000, and the number on the screen reads
 * **8,892**. Nothing was lost — the rung cost 75,000 and the ladder took it the instant
 * he could afford it, which is the one rule `advance` has always had — but the game said
 * none of that. It showed a number falling by fifty-one thousand after a reward.
 *
 * So the trade is stated *before* the tap rather than explained after it. This walks the
 * same rungs `advance` walks, with no clock in it, so the button cannot promise one thing
 * and the ladder do another.
 */
export function buysWith(s: State, lump: number): { rungs: number; left: number } {
  let { realm, layer } = s;
  let qi = s.qi + lump;
  let rungs = 0;
  for (let guard = 0; guard <= LAYERS + 1; guard++) {
    if (layer >= LAYERS_PER_REALM - 1) break;      // 頂 the ceiling: qi banks, nothing opens
    const cost = layerCost(realm, layer, s.unlocked);
    if (!Number.isFinite(cost) || qi < cost) break;
    qi -= cost;
    rungs += 1;
    if (++layer >= LAYERS_PER_REALM) { layer = 0; realm += 1; }
  }
  return { rungs, left: qi };
}

/**
 * 待 When an upgrade you cannot afford becomes one you can.
 *
 * Measured, six visits a day: from the fourth realm on the home screen has **nothing to
 * press in eighty per cent of visits**, and never because the boxes are full — always
 * because nothing is affordable. The reason is the deepest rule in the game and the
 * screen never said a word of it.
 *
 * A layer opens the instant its price is met and the qi is taken, so **the rung you are
 * standing on is the ceiling on the qi you may ever hold**. An upgrade dearer than that
 * rung cannot be saved for at all — not slowly, not ever. It becomes affordable by
 * *climbing*, when the rungs themselves grow dearer than it. From the fourth realm on,
 * about one of the three qi upgrades is in that state at any moment.
 *
 * That is not a fault to fix, it is the economy working; 功法 costs a whole rung by
 * design. What was a fault is that the player was left to infer it from a price they
 * watched never being reachable. So the row says which of the two it is:
 *
 *   `{ seconds }`  gather this long on the rung you are on, and it is yours
 *   `{ rungs }`    no amount of waiting here will do it; it opens this many rungs up
 */
export function affordableIn(
  s: State, cost: number,
): { seconds: number; rungs: 0 } | { seconds: null; rungs: number } {
  const here = layerCost(s.realm, s.layer, s.unlocked);
  // 頂 At the summit there is no rung to take the qi, so everything is only ever a wait.
  if (!Number.isFinite(here) || cost <= here) {
    return { seconds: Math.max(0, cost - s.qi) / Math.max(1e-9, rate(s)), rungs: 0 };
  }
  let realm = s.realm;
  let layer = s.layer;
  for (let n = 1; n <= LAYERS; n++) {
    if (++layer >= LAYERS_PER_REALM) { layer = 0; realm += 1; }
    const price = layerCost(realm, layer, s.unlocked);
    if (!Number.isFinite(price) || price >= cost) return { seconds: null, rungs: n };
  }
  return { seconds: null, rungs: LAYERS };
}
