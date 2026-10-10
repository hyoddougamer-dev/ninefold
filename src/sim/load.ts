/**
 * A save is input. This is the one place a save read from storage or from the server becomes a
 * State: validate() caps every field, rebuilds what is derived, and takes what it cannot trust
 * to its default. The model itself, in state.ts, holds no loader.
 */
import {
  type GearSet, type State, type Task, type Upgrade, TASKS, UPGRADES, capOf, cleanSetName, gathering,
  layersOpened, newState, sealDays, tribulationPool
} from './state.ts';
import {
  LAYERS, LAYERS_PER_REALM, ladderAt, FOCUS_MAX, FATE_FULL, FUSE_TOP, FLOORS_PER_REALM,
  SECONDARY_SHARE, SECONDARIES, towerLoot, SET_LIMIT
} from './balance.ts';

import { BEASTS } from '../data/bestiary.ts';
import { figureOf } from '../data/figures.ts';
import {
  AFFIXES, FUSED, RARITIES, SLOTS, TEMPLATE_BY_KEY, baseValue, roundValue, wornTotals, type Affix,
  type Item, type Rarity, type Roll, type Slot, type Worn
} from '../data/gear.ts';
import { chestCeiling, chestLimit, freshId, itemWorth } from './chest.ts';
import { unpackPile } from './pilepack.ts';
import { affinity, validateUnlocked } from './dao.ts';
import { owed as cardsOwed, refineFactor as cardRefineFactor, valid as validAwakened } from './awaken.ts';
import { validateSequence, validateStance } from './arts.ts';
import { NO_PILLS, brewed as validBrewed } from './furnace.ts';
import { clampRefine, refineCeiling } from './refine.ts';
import { isOpen } from './unlocks.ts';
import { WEEK, periodOf, weekOf } from './week.ts';

import { MEET_POINT_CEILING, validRoad } from '../data/meetings.ts';
import { validBeds } from '../data/herbs.ts';
import {
  DOOR_GAP, OPENS_AT as SECRET_OPENS_AT, RUN_DAO_CEILING, roomsFor, validTake
} from '../data/secret.ts';
import {
  DRIVE_PILE, INCENSE_HOLD, MELT_CAP, PLATFORM_EDGE, PLATFORM_REALM, SEAL_PAY_SHARE, SEAL_PILL_SHARE,
  SECLUSION, SHRINE_DAO_PER_REALM, SPRING_HOLD
} from './balance.ts';
import { demonsFor } from './seclusion.ts';
import { shortestDoorGap, validCrafts } from './crafts.ts';
import { keptByFilter, validFilters } from './filters.ts';
import { FORGED, HUNDRED_RANKS, ITEM_BY_KEY, RECIPE_BY_KEY, type HundredRank } from '../data/crafts.ts';
import { backHundred, bandTop, validKept } from './hundred.ts';
import { validLives } from './echo.ts';

/** 鎖魂 The realm a Soul-Lock Sigil can first be written in. */
const SOUL_LOCK_REALM = RECIPE_BY_KEY['sigil:soullock'].realm;

const BEAST_KEYS = new Set(BEASTS.map((x) => x.key));

/** 套 A task's loadout is an index into the sets that exists, or nothing. */
function validTasks(raw: unknown, sets: number): Partial<Record<Task, number>> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out: Partial<Record<Task, number>> = {};
  for (const t of TASKS) {
    const i = o[t];
    if (typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < sets) out[t] = i;
  }
  return out;
}

function validSets(raw: unknown): readonly GearSet[] {
  if (!Array.isArray(raw)) return [];
  const out: GearSet[] = [];
  // Counted by the sets kept, not the entries read: a dropped entry must not take one of the places.
  for (const r of raw) {
    if (out.length >= SET_LIMIT) break;
    const o = (r ?? {}) as Record<string, unknown>;
    const name = typeof o.name === 'string' ? cleanSetName(o.name) : '';
    const rawIds = (o.ids ?? {}) as Record<string, unknown>;
    const ids: Partial<Record<Slot, string>> = {};
    for (const slot of SLOTS) {
      const id = rawIds[slot];
      if (typeof id === 'string' && id.length > 0 && id.length <= 64) ids[slot] = id;
    }
    if (name && Object.keys(ids).length > 0) out.push({ name, ids });
  }
  return out;
}

/** 封 The fills a save claims, kept to this gate and to the most each can be. */
function sealFills(o: Record<string, unknown>, realm: number, layer: number): { sealPaid: number; sealFed: number } {
  const days = sealDays(realm);
  if (days <= 0 || realm >= 9 || layer < LAYERS_PER_REALM - 1) return { sealPaid: 0, sealFed: 0 };
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const clamp = (x: number, hi: number) => Math.min(hi, Math.max(0, x));
  const paid = clamp(num(o.sealPaid), SEAL_PAY_SHARE * days * 86_400);
  const fed = clamp(num(o.sealFed), Math.min(SEAL_PILL_SHARE * days, days - paid / 86_400) * 86_400);
  return { sealPaid: paid, sealFed: fed };
}

/**
 * How many pieces of a chest `validate` will read at all, before any limit is applied.
 *
 * Not a rule of the game: the real limit is worked out from the save, and this is only
 * the most work a forged save of a million pieces is allowed to cost on the way in.
 */
const CHEST_READ_LIMIT = 10_000;

/** 閉關 The two numbers seclusion keeps, capped against the clock and the realm. */
function validSeclusion(o: Record<string, unknown>, realm: number, startedAt: number, now: number,
                        elapsed: number): Pick<State, 'secludedAt' | 'demons'> {
  if (!isOpen(realm, 'seclusion')) return { secludedAt: 0, demons: 0 };
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  // 鎖魂 Two a night at most once a Soul-Lock Sigil can be written, and one before.
  const perNight = realm >= SOUL_LOCK_REALM ? 2 : 1;
  const demons = Math.max(0, Math.min(demonsFor(realm), perNight * Math.floor(elapsed / SECLUSION), Math.floor(n(o.demons))));
  const at = n(o.secludedAt);
  return { demons, secludedAt: demons < demonsFor(realm) && at >= startedAt && at <= now ? at : 0 };
}

/**
 * A save is input, and it is validated like any other input.
 *
 * The earlier build shipped without this and had a hole where a hand-edited heirloom
 * multiplied the qi rate by 196,502x and passed every check. The qi ceiling below is
 * what closes that hole: nothing may hold more qi than the fastest conceivable
 * cultivator could have gathered in the wall-clock time since the run began.
 */

export function validate(raw: unknown, now: number): State {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (o.v !== 1) return newState(now);

  const num = (x: unknown, fallback: number) =>
    typeof x === 'number' && Number.isFinite(x) ? x : fallback;
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  const startedAt = clamp(num(o.startedAt, now), 0, now);
  const realm = clamp(Math.floor(num(o.realm, 1)), 1, 9);
  const layer = clamp(Math.floor(num(o.layer, 0)), 0, LAYERS_PER_REALM - 1);

  // 印 The marks are read before the levels, because the levels are capped against them.
  const tribulation = realm === 9 ? clamp(Math.floor(num(o.tribulation, 0)), 0, 300) : 0;

  const rawLevels = (o.levels ?? {}) as Record<string, unknown>;
  /**
   * Nothing may hold more levels than it is allowed: the cap is what holds the whole
   * curve up, so a hand-edited save does not get to walk around it.
   *
   * 失 It has to be the *same* cap the game sells against, and for a while it was not.
   * This clamped to `levelCap(realm)` flat, while `capOf` adds a heaven's room to the
   * power upgrades and two realms' worth to 妖丹. So a ninth-realm cultivator with two
   * heavens open bought 劍訣 up to 66, closed the app, and reopened it at 54: the save is
   * rewritten on unload, validated on load, and the levels 境外 had just paid for were
   * deleted every single time. Found by round-tripping a save rather than by reading the
   * code, which is the only way this kind of thing is ever found.
   */
  const capFor = (u: Upgrade) => capOf({ realm, tribulation } as State, u);
  const levels = Object.fromEntries(
    UPGRADES.map((u) => [u, clamp(Math.floor(num(rawLevels[u], 0)), 0, capFor(u))]),
  ) as Record<Upgrade, number>;

  const towerClaim = clamp(Math.floor(num(o.tower, 0)), 0, 3000);
  const reach = towerClaim > LAYERS ? LAYERS / FLOORS_PER_REALM
    : Math.max(realm + 1, Math.ceil(towerClaim / FLOORS_PER_REALM));
  const rawKilled = (o.killed ?? {}) as Record<string, unknown>;
  const killed: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawKilled)) {
    const beast = BEASTS.find((x) => x.key === k);
    if (!beast) continue;                              // a beast that does not exist is not a kill
    // 境 Nor one from beyond anywhere this cultivator could have fought: their own realm,
    // the realm above (秘境 the vault's doors), and the realms of the tower's floors they
    // claim (a floor is a fight with its beast, and the tower's claim is verified on its
    // own). A dragon in a realm-three save would hand over its art and its 道 points
    // without the fight ever happening.
    if (beast.realm > reach) continue;
    // A count is a count of fights, and no cultivator fights a hundred million times.
    const n = Math.min(1e8, Math.floor(num(v, 0)));
    if (n > 0) killed[k] = n;
  }

  const sets = validSets(o.sets);
  const filters = validFilters(o.filters);
  const inSets = new Set(sets.flatMap((x) => Object.values(x.ids)));
  /**
   * 承 The refining levels a save from before 2026-10-06 kept on its pieces, by the place
   * each piece is worn in: the most any one piece of that place held. See `refined` below.
   */
  const onPieces: Partial<Record<Slot, number>> = {};
  const item = (raw: unknown, used: Set<string>): Item | null => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const tpl = typeof o.template === 'string' ? TEMPLATE_BY_KEY[o.template] : undefined;
    if (!tpl) return null;                                    // a piece that does not exist is not a piece
    const rarity = RARITIES.includes(o.rarity as Rarity) ? (o.rarity as Rarity) : 'common';
    // 號 Two things may not be one thing, but a second piece with a name already taken is
    // still a piece: it is renamed, never dropped. Fused pieces could share a name once
    // (chest.ts fuse), and dropping the twin here deleted it on the next load.
    const id = freshId(typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 64 ? o.id : `${tpl.key}-${used.size}`, used);
    used.add(id);

    // Lines are validated one at a time: a line on an axis that does not exist is not a
    // line, the same axis may not appear twice, no rank may carry more lines than it is
    // allowed, and every value is capped at what the last realm's top rank could roll.
    const seenAffix = new Set<Affix>();
    const rolls: Roll[] = [];
    // 百煉 A Hundredfold piece is held to the band its crucible could have put each line in.
    const marked = o.hundred === true && o.from === FORGED && HUNDRED_RANKS.includes(rarity as HundredRank);
    for (const raw of Array.isArray(o.rolls) ? o.rolls : []) {
      if (rolls.length > SECONDARIES[rarity]) break;          // one primary plus its share
      const r = (raw ?? {}) as Record<string, unknown>;
      const affix = AFFIXES.includes(r.affix as Affix) ? (r.affix as Affix) : null;
      if (!affix || seenAffix.has(affix)) continue;
      seenAffix.add(affix);
      // 限 Each line is capped at what its own rank and realm could ever make, a primary at
      // the fusion ceiling of its base and a secondary at the same of its 60%. A flat 120
      // let six realm-one pieces carry fifteen times the power of any honest set.
      // The game rounds every roll (roundValue: a flat line is at least 1, a percentage to a
      // tenth), so the cap is rounded the same way, or an honest 藏 1 came back as 0.9 and a
      // full chest lost a piece on every load (2026-10-05).
      const most = baseValue(tpl, rarity, affix) * (rolls.length === 0 ? 1 : SECONDARY_SHARE) * FUSE_TOP * 1.001;
      const top = marked ? bandTop(tpl, rarity as HundredRank, affix, rolls.length === 0)
        : Math.max(most, roundValue(affix, most));
      rolls.push({ affix, value: clamp(num(r.value, 0), 0, top) });
    }
    if (rolls.length === 0) rolls.push({ affix: tpl.affix, value: 0 });
    // 煉 A piece holds no refining. An older save's levels on it are read once, for its
    // place, and the piece comes out without them.
    const level = clampRefine(typeof o.refine === 'number' ? o.refine : 0);
    if (level > (onPieces[tpl.slot] ?? 0)) onPieces[tpl.slot] = level;
    // 源 Who left it is a word on the sheet and nothing else, so it is kept only when it
    // names something real: a beast, or one of the two places that are not a kill.
    const from = typeof o.from === 'string' && (BEAST_KEYS.has(o.from) || o.from === 'secret' || o.from === 'road' || o.from === FORGED || o.from === FUSED)
      ? { from: o.from } : {};
    // 鎖 A lock is a yes or nothing; any other value is no lock. 套 And a piece a loadout
    // names is locked whatever the save says, because a loadout whose piece can be melted
    // out from under it is not a loadout (see sets.ts setLocked).
    const locked = o.locked === true || inSets.has(id) ? { locked: true as const } : {};
    return { id, template: tpl.key, rarity, rolls, ...from, ...locked, ...(marked ? { hundred: true as const } : {}) };
  };

  const used = new Set<string>();
  const rawWorn = (o.worn ?? {}) as Record<string, unknown>;
  const worn: Worn = {};
  for (const slot of SLOTS) {
    const it = item(rawWorn[slot], used);
    if (it && TEMPLATE_BY_KEY[it.template].slot === slot) worn[slot] = it;
  }
  // 藏 The chest's pieces are read here, before anything is measured, because an older
  // save's refining is on them too, and the places' levels are part of every measure below.
  // What the chest may keep of them is decided further down (see 換).
  const carried: Item[] = [];
  for (const raw of Array.isArray(o.chest) ? o.chest : []) {
    if (carried.length >= CHEST_READ_LIMIT) break;
    const it = item(raw, used);
    if (it) carried.push(it);
  }

  /**
   * 承 The places' refining levels.
   *
   * A save from before 2026-10-06 has no record of them: the levels were on the pieces, and
   * when a piece went on over another the two traded them, the one going on taking the
   * higher count. So the most a place could ever have given whatever was worn there is the
   * highest count on any piece of that place, worn or in the chest, and that is what the
   * place is given. Nothing is lost: every body the old rule could have put on is matched
   * or beaten. A save with a record keeps it, and the higher of the two still wins, so a
   * save written by an older copy of the game still open in another tab, with the levels
   * back on its pieces, loses nothing either. Capped at REFINE_LIMIT here, and against the
   * material at the end.
   */
  const rawRefined = (o.refined ?? {}) as Record<string, unknown>;
  const refined: Partial<Record<Slot, number>> = {};
  for (const slot of SLOTS) {
    const n = Math.max(clampRefine(typeof rawRefined[slot] === 'number' ? rawRefined[slot] as number : 0),
      onPieces[slot] ?? 0);
    if (n > 0) refined[slot] = n;
  }

  /**
   * 藏 The chest is capped at the limit **this cultivator actually has**, and for the
   * whole of the game's life it was capped at the flat forty instead.
   *
   * 運 The Fortune branch, 囊 the pouch nodes, a 藏 line on a piece of gear and 悟道 a
   * card all add slots, and the game fills them: measured, a finished cultivator holds
   * between 58 and 90 pieces. Every one of them past the fortieth was deleted on every
   * load, which is every time the app was closed, because a save is rewritten on unload
   * and validated on the way back in. Found by 氣查 the audit, which round-trips a real
   * run through this function rather than reading it.
   *
   * It is the same bug 失 the levels had, in the same function, for the same reason: a
   * cap written twice, and the copy in here was the older one.
   */
  const unlocked = validateUnlocked(o.unlocked);
  /**
   * 悟道 Each entry has to be a real card from the trio its own turn offers, and there
   * may be no more of them than the cultivator has actually been offered.
   *
   * 境外 The second half of that used to be missing, and the heavens are what made it
   * matter: `valid` checks the *order* of the list and nothing else, so a second-realm
   * save claiming every realm card passed, and once nine more trios existed behind the
   * marks it could claim those too. Seventeen permanent cards on a cultivator who has
   * crossed nothing. The offer is a subtraction, so the cap is the same subtraction.
   */
  const awakened = [...validAwakened(Array.isArray(o.awakened) ? o.awakened.filter(
    (x: unknown): x is string => typeof x === 'string') : [])]
    .slice(0, cardsOwed(realm, tribulation));
  const slots = chestLimit(unlocked,
    wornTotals(worn, (x) => affinity(unlocked, x), refined).capacity, awakened);

  /**
   * 換 And a chest can be over that limit honestly, once, which the cap used to punish.
   *
   * `equip` swaps a piece for the one in its slot, so the count never rises and the
   * function says equipping can never overflow. The count cannot, but the *limit* can
   * fall: take off a ring with a 藏 line and put on one without, and the chest is now
   * holding more than it is allowed to. Nothing happened on the screen. On the next load
   * this loop kept the first pieces in the list and threw away the rest, which is the
   * newest ones, so the pieces a cultivator had just picked up were the ones deleted.
   * 氣查 the audit found it: the active cultivator's finished climb held 62 and came
   * back holding 59.
   *
   * The only way over the limit is a 藏 piece that is now in the chest, so the chest is
   * allowed the room its own pieces carry on top of the limit. A forged save is still
   * bounded, by the pieces it holds rather than by a number it chose. And if anything
   * does have to go, it is the worst, which is the rule a full chest already keeps.
   *
   * 煉 A piece's 藏 line is read at its place's refining, which is what it carried worn.
   */
  const roomCarried = carried.reduce((n, it) => n + wornTotals(
    { [TEMPLATE_BY_KEY[it.template].slot]: it } as Worn, (x) => affinity(unlocked, x), refined,
  ).capacity, 0);
  const allowance = Math.max(slots, Math.floor(slots + roomCarried),
    chestCeiling(unlocked, [...SLOTS.flatMap((x) => (worn[x] ? [worn[x]!] : [])), ...carried], awakened,
      (x) => affinity(unlocked, x), refined));
  const chest: Item[] = carried.length <= allowance ? carried
    : carried
      // 鎖 A locked piece is the last a full chest gives up, the same rule addToChest keeps.
      // 熔 Then one a kept filter shows, which a full chest weighs first too (sim/filters.ts).
      // 承 A refined piece no longer needs sparing: its levels were moved to its place above.
      .map((it, i) => ({ it, i, worth: itemWorth(it),
        kept: it.locked ? 2 : keptByFilter(filters, it) ? 1 : 0 }))
      .sort((a, b) => b.kept - a.kept || b.worth - a.worth || a.i - b.i)
      .slice(0, allowance)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.it);

  const elapsed = Math.max(0, now - startedAt);
  const lives = validLives(o.lives, startedAt, now);
  const crafts = validCrafts(o.crafts, { realm, killed, startedAt }, now, lives.length);
  // 百煉 A Hundredfold mark stays only where the pieces made back it (sim/hundred.ts).
  const marks = backHundred(crafts.made);
  // 秘門 The Hidden Door Array brings the vault door sooner. An array is kept for good once
  // cut, so holding one is what widens the ceiling, placed or lifted out, and at its
  // deepest step (shortestDoorGap), since it may have been that deep all along.
  const doorGap = shortestDoorGap(crafts.pouch, DOOR_GAP);

  const savedAt = clamp(num(o.at, now), startedAt, now);
  const out: State = {
    v: 1,
    startedAt,
    at: savedAt,
    realm,
    layer,
    qi: Math.max(0, num(o.qi, 0)),
    materials: Math.max(0, num(o.materials, 0)),
    // 守 Below the summit a fallen warden is also a kill of it, so a save cannot say the
    // warden fell and skip the fight. At the summit the Dragon falls once a crossing and
    // the count cannot tell which crossing, so there the flag is kept as it is.
    wardenFell: o.wardenFell === true
      && (realm === 9 || (killed[BEASTS.find((b) => b.warden && b.realm === realm)?.key ?? ''] ?? 0) > 0),
    // 瓶頸 Only while a warden stands below the summit, and never in the future. A gate a save
    // holds without a time (one from before the bottleneck) counts as one met long ago,
    // fully loosened: nobody already standing there meets a wall they did not have.
    gateAt: realm < 9 && layer >= LAYERS_PER_REALM - 1
      ? (num(o.gateAt, 0) > 0 ? clamp(num(o.gateAt, 0), 1, now) : 1) : 0,
    // 封 The bar's fills: only at a sealed gate, and never more than the most each can be.
    // A save from before the bar has none, and keeps having none until the game writes one.
    ...(o.sealPaid === undefined && o.sealFed === undefined ? {} : sealFills(o, realm, layer)),
    levels,
    killed,
    worn: Object.fromEntries(Object.entries(worn).map(([k, it]) => [k, marks(it as Item)])) as Worn,
    chest: chest.map(marks),
    // 圍 The drive's pile is read after the ids above are taken, at the foot of this function.
    pile: [], pileAt: 0,
    // 留 A yes or nothing; anything else is the layer opening by itself, as it always did.
    hold: o.hold === true,
    refined,
    unlocked,
    // Neither of these is owned in the save: the stances follow from the realm reached
    // and the arts from the wardens put down. So a hand-edited save cannot put 龍威 in
    // the first slot at realm 1 and walk over every warden in the game.
    // 相 A forged figure is simply not one of the two, so it falls back to not having
    // been asked, which every screen already draws.
    self: figureOf(typeof o.self === 'string' ? o.self : null)?.key ?? null,
    stance: validateStance(o.stance, realm, layer),
    // 心魔 A demon takes a night behind a shut door, so a save cannot claim more of them
    // than the nights it has lived, nor any before the fourth realm opened the door.
    // A door shut before the cultivator existed, or tomorrow, was never shut.
    ...validSeclusion(o, realm, startedAt, now, elapsed),
    sequence: validateSequence(o.sequence, killed),
    // Marks are only reachable at realm 9, and only one at a time.
    // Capped at three hundred so the multipliers stay inside a double: a mark is
    // worth 4.3x and 4.3^300 is already a number with a hundred and ninety digits.
    tribulation,
    // 劫 The anchor only ever grows; a ranked save whose anchor shrank is refused by
    // verify(), since forged to 0 it would put every later Dragon back at its floor.
    tribulationAt: realm === 9 ? Math.max(0, num(o.tribulationAt, 0)) : 0,
    // The tower is climbed one floor at a time and every floor is a fight, so a save
    // claiming floor nine thousand is claiming nine thousand fights that never happened.
    tower: towerClaim,
    // 拆 A save from before the allowance starts it full: nothing is taken for having
    // been played before the rule existed.
    melt: clamp(num(o.melt, MELT_CAP), 0, MELT_CAP),
    // 套 At most SET_LIMIT sets, each a short name and a piece id per place on the body.
    // A set naming a piece that is gone is kept: it says so when it is put on.
    sets,
    // 套 A task names a loadout that exists, or none.
    tasks: validTasks(o.tasks, sets.length),
    // 存 At most FILTER_LIMIT filters, each naming a real place, school and lines.
    filters,
    // 爐 No pill before the furnace exists: 3,000 of them in a fifth-realm save was power
    // enough to claim five hundred floors of the tower in thirty seconds.
    brewed: isOpen(realm, 'furnace') ? validBrewed(o.brewed) : { ...NO_PILLS },
    // 悟道 A forged list could otherwise claim every card in the game, or claim the
    // ninth realm's card in the second. Each entry has to be a card that exists, from
    // the trio that entry's turn actually offers. See sim/awaken.ts.
    awakened,
    // 緣 A key that names nobody is not a meeting, and nobody is met twice. The points
    // are capped at what every meeting in the game could ever hand over, so a forged
    // save cannot claim a tree's worth of them.
    ...validRoad(o.met, o.chose, realm, tribulation),
    metAt: clamp(num(o.metAt, 0), 0, now),
    // 道 And the bank they land in is not only theirs: 秘境 the vault's shrines pay into
    // it too, so the ceiling has to allow for every walk the clock could have allowed.
    // See RUN_DAO_CEILING for the measurement that made this necessary.
    metPoints: clamp(Math.floor(num(o.metPoints, 0)), 0,
      MEET_POINT_CEILING + (Math.ceil(elapsed / doorGap) + Math.ceil(elapsed / 86_400)) * RUN_DAO_CEILING),
    // 龕 What the shrines paid can never pass what the realms reached allow. A save from
    // before the count arrives with none, so its shrines pay their realm's share again:
    // nothing it already earned is touched.
    vaultDao: clamp(Math.floor(num(o.vaultDao, 0)), 0, SHRINE_DAO_PER_REALM * Math.min(9, Math.max(1, realm))),
    // 洞天 Always exactly three beds. A key naming no herb is an empty bed, and no bed
    // may claim to have been planted tomorrow or before the cultivator existed.
    beds: validBeds(o.beds, clamp(num(o.at, now), startedAt, now), startedAt),
    reaped: clamp(Math.floor(num(o.reaped, 0)), 0, 1e6),
    // 秘境 A step outside the seven rooms is outside, which is what an unknown number
    // means. The realm gates it too: a save cannot claim to be standing in a door the
    // second realm has never seen.
    // 深 And the path this cultivator's own realm walks, not the deepest there is: a
    // seventh-realm save may stand in room ten and a fifth-realm one may not.
    runStep: realm >= SECRET_OPENS_AT
      ? clamp(Math.floor(num(o.runStep, -1)), -1, roomsFor(realm) - 1) : -1,
    runAt: clamp(num(o.runAt, 0), 0, now),
    runs: clamp(Math.floor(num(o.runs, 0)), 0, 1e6),
    // 鑰 A day, never one ahead of the save's own clock.
    keyDay: clamp(Math.floor(num(o.keyDay, 0)), 0, Math.floor(now / 86_400)),
    // 岔 An instant the cultivator has lived, or none.
    forkAt: clamp(num(o.forkAt, 0), 0, now),
    // 泉 The spring holds a day of shut time at most, counted to an instant the cultivator
    // has lived. A save from before the spring starts it from the last run, empty: the
    // hours since that run are what it has filled with, which is the rule.
    spring: clamp(num(o.spring, 0), 0, SPRING_HOLD),
    springAt: clamp(num(o.springAt, num(o.runAt, 0) || startedAt), startedAt, savedAt),
    // 香 A day of burning queued at most, and none before the vault exists.
    incenseUntil: realm >= SECRET_OPENS_AT ? clamp(num(o.incenseUntil, 0), 0, savedAt + INCENSE_HOLD) : 0,
    // 擂 A trail, the period and its count, and the bouts, only once the Platform stands. The
    // count is three a period at most, and the period never one the save has not reached.
    trail: realm >= PLATFORM_REALM && o.trail === true,
    platform: realm >= PLATFORM_REALM ? {
      period: clamp(Math.floor(num((o.platform as Record<string, unknown> | undefined)?.period, -1)), -1, periodOf(savedAt, realm)),
      beaten: clamp(Math.floor(num((o.platform as Record<string, unknown> | undefined)?.beaten, 0)), 0, PLATFORM_EDGE.length),
    } : { period: -1, beaten: 0 },
    bouts: realm >= PLATFORM_REALM
      ? clamp(Math.floor(num(o.bouts, 0)), 0, PLATFORM_EDGE.length * (Math.floor(elapsed / WEEK) + 9 + 1)) : 0,
    lastRun: validTake(o.lastRun, (k) => k in TEMPLATE_BY_KEY, RARITIES, (k) => k in ITEM_BY_KEY),
    // 期 A week the cultivator has not lived through yet is not a week they took the
    // quarry's qi in, so the ceiling is this instant's own week. -1 is never, which is
    // what any save written before the rotation existed comes back as.
    quarryWeek: clamp(Math.floor(num(o.quarryWeek, -1)), -1, weekOf(clamp(num(o.at, now), startedAt, now))),
    // 緣 Only beasts that exist, a bar that is never already full (a full bar is spent by
    // the kill that fills it), and a best rank that is a rank.
    fate: Object.fromEntries(Object.entries((o.fate ?? {}) as Record<string, unknown>)
      .filter(([k]) => BEAST_KEYS.has(k))
      .map(([k, v]) => {
        const f = (v ?? {}) as Record<string, unknown>;
        return [k, {
          n: clamp(Math.floor(num(f.n, 0)), 0, FATE_FULL - 1),
          best: clamp(Math.floor(num(f.best, -1)), -1, RARITIES.length - 1),
        }];
      })),
    // 業 The workshop, capped against the clock, the kills and its own levels.
    crafts,
    // 新 The one piece of state worth nothing to cheat: the worst a forged list can do
    // is skip a card that explains the game. It is bounded so it cannot grow a save.
    seen: (Array.isArray(o.seen) ? o.seen : [])
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 32)
      .filter((x, i, all) => all.indexOf(x) === i)
      .slice(0, 32),
    // 世 The lives before this one: at most LIVES_MAX, each a life that could have ended.
    lives,
    // 承 The codex those lives kept: nine ranks, none past Heaven, and none at all for a
    // first life, since only a life that ended can have left one.
    codexKept: validKept(o.codexKept, lives.length),
  };

  /**
   * 頂 And the one field that has to be measured against the cultivator itself: the qi.
   *
   * The ceiling exists because an earlier build shipped without any, and a hand-edited
   * heirloom multiplied the qi rate by 196,502x and passed every check. So nothing may
   * hold more qi than it could have gathered in the wall-clock time since the run began.
   *
   * 量 What that number is has to be read off **this cultivator**, and for a long time
   * it was a guess: a typed formula with a factor of ten thousand in it that knew about
   * the two rate upgrades and nothing else. It did not know about 雷印 the marks, and a
   * mark multiplies the rate by 1.728. Measured by 氣查 the audit, a save at forty marks
   * held 78.8 quintillion qi and came back holding 5.26, which is 93% of the endgame
   * deleted on every load, and 雷池 the pool, which is two days of that cultivator's own
   * gathering, sat a hundred million times above what this function would allow them to
   * be standing on. The Dragon could never have been called again.
   *
   * Now it is derived. `rate` already knows everything that touches the rate, because
   * every one of those fields was validated above and none of them can be forged past
   * its own cap. The rate only ever grows, so today's rate across the whole run is
   * already an over-estimate of every second of it, and 入定 at its deepest is the most
   * any of those seconds could have been worth.
   */
  // 宿慧 Read at what is gathered, the Echo included: it is part of every second's qi.
  const gathered = gathering(out) * FOCUS_MAX * elapsed;
  // What a cultivator is allowed to be standing on having spent nothing: the rung under
  // their feet, and at the summit 雷池 the pool, which the ladder has no way to take.
  const standing = tribulationPool(out) + ladderAt(Math.min(LAYERS - 1, layersOpened(out)));
  // 塔 拆 泉 And the lumps, which are not gathered: a tower floor, a melted chest, a
  // spring, a ripe bed. Ten times over is generous, and still eight orders of magnitude
  // under the number this replaced.
  const qiCeiling = (gathered + standing) * 10 + 1e6;

  /**
   * 材 And the same for the material, which had the same kind of number on it: a flat
   * trillion, typed once and never measured.
   *
   * 塔 The tower is the whole material economy and it has no top, so the pile a real
   * cultivator holds has no fixed size either. Measured by the audit, a save at forty
   * marks held 3.23e29 材 and came back holding a trillion, which is every material the
   * endgame ever earned deleted on every load.
   *
   * So it is read off the tower, which is where the material comes from and which *is*
   * capped, at three thousand floors. A floor pays once and the floors grow
   * geometrically, so the highest floor cleared is worth more than every floor under it
   * put together, and ten thousand times that is a generous ceiling that still moves
   * with the cultivator rather than standing still while they climb past it.
   */
  const floorsWorth = towerLoot(Math.max(1, out.tower));
  const matCeiling = floorsWorth * 1e4 + gathered + 1e6;

  /**
   * 煉 And a place cannot be refined past what that much material could have paid for.
   * The flat limit this replaced was 99, and a real cultivator reaches it: see
   * REFINE_LIMIT. Clamping here rather than with the places above is what lets the
   * ceiling read the tower, which is not known yet when the gear is read.
   */
  // 悟道 The discount cards make a level cheaper, so a real cultivator holding them has
  // paid for levels the full price would put past this ceiling. The ceiling is read at
  // the price they actually paid, or the save that earned them would lose them.
  const refineCap = refineCeiling(matCeiling / cardRefineFactor(out.awakened));
  const cappedRefined: Partial<Record<Slot, number>> = {};
  for (const slot of SLOTS) {
    const n = Math.min(refineCap, out.refined[slot] ?? 0);
    if (n > 0) cappedRefined[slot] = n;
  }

  /**
   * 圍 The drive's pile: at most DRIVE_PILE pieces (rows or objects, see pilepack.ts), each a real piece from a realm the save has
   * reached, none sharing a name with the chest or each other, and an instant the save has
   * lived. A pile with no pieces has no instant. It is read last so that its names are only
   * ever the ones left over (a piece in the chest keeps its own).
   */
  const pile: Item[] = [];
  for (const raw of unpackPile(o.pile)) {
    if (pile.length >= DRIVE_PILE) break;
    const it = item(raw, used);
    if (it && (TEMPLATE_BY_KEY[it.template]?.realm ?? 1) <= realm) pile.push(marks(it));
  }

  return {
    ...out,
    pile,
    pileAt: pile.length > 0 ? clamp(num(o.pileAt, savedAt), startedAt, savedAt) : 0,
    qi: Math.min(out.qi, qiCeiling),
    materials: Math.min(out.materials, matCeiling),
    refined: cappedRefined,
  };
}
