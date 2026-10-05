import { readFileSync } from 'node:fs';
import { wardenOf } from '../src/data/bestiary.ts';
import { PAIR_TOWER_QI } from '../src/sim/balance.ts';
import { beatable } from '../src/sim/combat.ts';
import { open } from '../src/sim/seal.ts';
import { UPGRADES, buy, canBuy, canCondense, condense, layersOpened, upgradeCost, validate, type State } from '../src/sim/state.ts';
import { advance } from '../src/sim/time.ts';
import { floorQiPay } from '../src/sim/tower.ts';
import { towerVerdict, wearsMaster } from '../src/sim/verify.ts';
import { HABITS, play } from './habits.ts';

/**
 * 塔 How far a save climbs without a second passing.
 *
 * rekaris (Discord, 2026-10-05): "I would suggest building debug tools and running it by
 * hand instead." He climbed from floor 98 to 108 and from the seventh realm's sixth layer
 * to the eighth's fourth in nine minutes, by putting each floor's qi into power and
 * climbing again. Every harness in tools/ measured the days to the ninth realm, which that
 * loop hardly moves, and none asked the question he was asking: does the tower pay for
 * its own next floor?
 *
 * This asks it. From a save, as it stands: climb every floor any body it holds can win,
 * take the floor's fixed sum (the Celestial Master's when it wears one, as the server
 * credits it), open every layer the qi opens, beat the warden and cross when it can, buy
 * the cheapest upgrade, and climb again, until nothing more can be bought. No time passes
 * and nothing is gathered: whatever it climbs, the tower paid for.
 *
 *     npx tsx tools/freeclimb.ts                   the harness, every third layer from realm 5
 *     npx tsx tools/freeclimb.ts saves.json        real saves: a JSON array of saves (sealed or plain),
 *                                                  or the ranked-read output ({ out: { saves } })
 *     MASTER=1 npx tsx tools/freeclimb.ts          the harness wearing the Celestial Master
 *
 * A healthy tower climbs a floor or two and a layer or two this way: the qi from a floor
 * is a fraction of what the next floor's power costs. Many floors and a realm means the
 * tower is a loop, and its pay is wrong whatever the days to the ninth realm say.
 */
export interface Free { floors: number; layers: number; from: string; to: string }

export function freeClimb(start: State, guard = 100_000): Free {
  let s = start;
  const pay = wearsMaster(start) ? PAIR_TOWER_QI : 1;
  let floors = 0;
  for (let i = 0; i < guard; i++) {
    if (towerVerdict(s, s.tower + 1) === 'ok') {
      s = { ...s, tower: s.tower + 1, qi: s.qi + floorQiPay(s.tower + 1) * pay };
      floors++;
      continue;
    }
    const a = advance(s, s.at + 1);
    if (layersOpened(a) > layersOpened(s)) { s = a; continue; }
    if (s.layer === 8 && s.realm < 9 && beatable(s, wardenOf(s.realm))) {
      s = { ...s, realm: s.realm + 1, layer: 0, wardenFell: false };
      continue;
    }
    if (canCondense(s)) { s = condense(s); continue; }
    const cheapest = UPGRADES.filter((u) => canBuy(s, u)).sort((x, y) => upgradeCost(s, x) - upgradeCost(s, y))[0];
    if (!cheapest) break;
    s = buy(s, cheapest);
  }
  const at = (x: State) => `r${x.realm} l${x.layer} floor ${x.tower}`;
  return { floors, layers: layersOpened(s) - layersOpened(start), from: at(start), to: at(s) };
}

function readSaves(path: string): { name: string; s: State }[] {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const list: { name: string; save: unknown }[] = Array.isArray(raw) && raw[0]?.out?.saves
    ? raw[0].out.saves.map((x: { name: string; latest: unknown }) => ({ name: x.name, save: x.latest }))
    : (Array.isArray(raw) ? raw : [raw]).map((save, i) => ({ name: `save ${i + 1}`, save }));
  return list.map(({ name, save }) => ({ name, s: validate(typeof save === 'string' ? open(save) : save, now) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const line = (name: string, f: Free) =>
    console.log(`${name.padEnd(22)} ${f.from.padEnd(20)} → ${f.to.padEnd(20)} +${f.floors} floors  +${f.layers} layers`);
  if (process.argv[2]) {
    for (const { name, s } of readSaves(process.argv[2])) if (s.tower > 0) line(name, freeClimb(s));
  } else {
    const active = HABITS.find((h) => h.name === 'active')!;
    const h = process.env.MASTER ? { ...active, name: 'active celestial', calling: 'celestial' as const } : active;
    const seen = new Set<string>();
    play(h, 120, (day, s) => {
      const key = `${s.realm}-${Math.floor(s.layer / 3)}`;
      if (s.realm < 5 || s.tower < 1 || seen.has(key)) return;
      seen.add(key);
      line(`${h.name} day ${day.toFixed(0)}`, freeClimb(s));
    });
  }
}
