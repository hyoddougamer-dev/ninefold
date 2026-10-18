/**
 * 圖 升 The risen elite, photographed off the real build: its row on 狩 the hunt, the arena's
 * verdict bare (a loss) and carrying what the crafter carries (a win), a 破境丹 Breakthrough
 * Pill in 業 the workshop asking for 精血 Essence Blood, and 秘境 the vault's risen last gate.
 *
 * The cultivator is not imagined: it is 'crafts it all' from tools/habits.ts (seed 991) the
 * visit the fifth realm's Rock Lizard walks out, moved in time to one fixed instant and
 * stamped season 's0' with 'whom' in seen. The page's clock is held at that instant, so the
 * day's dice are the same on every run and on both builds, and the start of the run is
 * chosen here, off the sim, so that bare the lizard wins and with the kit it falls. Each save
 * is written with the game's scripts blocked. Phone widths 320 and 400. Run against a build
 * from before the change and one after to put them side by side.
 *
 *     npx vite build && npx vite preview --port 4402 --strictPort &
 *     SMOKE_URL=http://localhost:4402/ OUT=/tmp/elite TAG=after npx tsx tools/shot-elite.ts
 */
import { chromium, type ElementHandle, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { validate } from '../src/sim/load.ts';
import { eliteFight, eliteKit, eliteOdds, eliteOf } from '../src/sim/elite.ts';
import { NO_KIT } from '../src/sim/kit.ts';
import type { State } from '../src/sim/state.ts';
import { HABITS, play } from './habits.ts';
import { carryBest } from './crafter.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4402/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.env.OUT ?? '/tmp/elite-shots';
const TAG = process.env.TAG ?? 'after';
const SAVE_KEY = 'ninefold.save.v1';
mkdirSync(OUT, { recursive: true });

/** 定 One instant for every photograph: noon UTC, so the day's dice cannot turn mid-run. */
const NOW = Math.floor(Date.UTC(2026, 9, 27, 12, 0, 0) / 1000);
/** 勢 The stance held: the one the crafter does best in against the lizard. */
const STANCE = process.env.STANCE ?? 'endure';

/** 業 The crafter the harness plays, the visit the Rock Lizard walks out, carrying its best into it. */
const SNAP: State = (() => {
  const h = HABITS.find((x) => x.name === 'crafts it all')!;
  let snap: State | null = null;
  play({ ...h, seed: 991 }, 40, (_d, s) => { if (!snap && s.realm === 5 && s.layer >= eliteOf(5)!.layer) snap = s; });
  if (!snap) throw new Error('升 the crafter never reached the fifth realm’s elite');
  return carryBest({ ...(snap as State), stance: STANCE }, eliteOf(5)!, 'elite');
})();

/** 移 The crafter moved in time so that `at` is NOW and the run began at `start`, as a plain save. */
function save(start: number, kit: boolean, extra: Partial<State> = {}): Record<string, unknown> {
  const s = SNAP;
  // Every instant moves with `at`; only the start is chosen, for the day's dice.
  const shift = NOW - s.at;
  const tt = (x: number) => (x > 0 ? x + shift : x);
  return {
    ...s,
    v: 1, season: 's0',
    at: NOW, startedAt: start,
    gateAt: tt(s.gateAt), metAt: tt(s.metAt), runAt: tt(s.runAt), springAt: tt(s.springAt), secludedAt: tt(s.secludedAt),
    forkAt: tt(s.forkAt), incenseUntil: tt(s.incenseUntil), pile: [], pileAt: 0, keyDay: 0, quarryWeek: -1,
    platform: { period: -1, beaten: 0 },
    beds: s.beds.map((b) => ({ ...b, at: b.at > 0 ? tt(b.at) : b.at })),
    crafts: { ...s.crafts, since: NOW - 5, task: null,
      carry: kit ? s.crafts.carry : { elixir: null, sigil: null, pill: null } },
    seen: [...new Set([...(s.seen ?? []), 'guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'salvage', 'fuse',
      'refine', 'cores', 'record', 'arts', 'tower', 'keystones', 'bestiary', 'cave', 'secret', 'seclusion', 'workshop',
      'alchemy', 'sigils', 'platform', 'cap', 'furnace', 'pool', 'drive'])],
    ...extra,
  };
}

/** 定 A start whose day's dice lose the lizard bare and win it carrying the kit, read off the sim. */
function pickStart(): number {
  const lizard = eliteOf(5)!;
  const lived = SNAP.at - SNAP.startedAt;
  for (let i = 0; i < 6000; i++) {
    const start = NOW - lived - i * 37;
    const bare = validate(JSON.parse(JSON.stringify(save(start, false))), NOW) as State;
    const kit = validate(JSON.parse(JSON.stringify(save(start, true))), NOW) as State;
    const k = eliteKit(kit, lizard);
    if (!k.spends) continue;
    if (!eliteFight(bare, lizard, NO_KIT).won && eliteFight(kit, lizard, k.kit).won) return start;
  }
  throw new Error('升 no start found whose dice lose bare and win with the kit');
}
const START = Number(process.env.START ?? pickStart());
{
  const o = eliteOdds(validate(JSON.parse(JSON.stringify(save(START, true))), NOW) as State, eliteOf(5)!);
  console.log(`  start ${START}, stance ${STANCE}, carrying ${JSON.stringify(SNAP.crafts.carry)}: `
    + `${Math.round(o.bare * 100)}% bare, ${Math.round(o.carried * 100)}% carried`);
  if (process.env.DRY) process.exit(0);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width: number, s: unknown): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await page.clock.install({ time: NOW * 1000 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k as string, JSON.stringify(v)), [SAVE_KEY, s]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.clock.runFor(800);
  await clear(page);
  return page;
}

/** 掩 Whatever floats over the screen, answered the way a player answers it. */
async function clear(page: Page) {
  for (let i = 0; i < 10; i++) {
    const b = await page.$('.notice button, .awaken .later, .whom .later, .home button');
    if (!b) break;
    await b.click({ timeout: 3000 }).catch(() => {});
    await page.clock.runFor(250);
  }
}

async function tab(page: Page, han: string) {
  await page.click(`nav.tabs button:has-text("${han}")`);
  await page.clock.runFor(600);
  await clear(page);
}

async function shoot(page: Page, el: ElementHandle | null, name: string) {
  const path = `${OUT}/${TAG}-${name}.png`;
  if (!el) { console.log(`  ${name}: nothing to photograph`); return; }
  await el.scrollIntoViewIfNeeded();
  await page.clock.runFor(300);
  await el.screenshot({ path });
  console.log(`  ${path}\n    ${(await el.innerText()).replace(/\s+/g, ' ').slice(0, 320)}`);
}

async function fightLizard(page: Page) {
  const row = page.locator('button.beast', { hasText: 'Rock Lizard' }).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  for (let i = 0; i < 80 && !(await page.$('.arena[data-over="true"] .verdict')); i++) await page.clock.runFor(500);
  await page.clock.runFor(1500);
}

for (const w of [320, 400]) {
  // 狩 The row, carrying the kit, so both figures show.
  {
    const page = await open(w, save(START, true));
    await tab(page, '狩');
    await shoot(page, await page.$('button.beast:has-text("Rock Lizard")'), `hunt-${w}`);
    await page.close();
  }
  // 鬥 Bare, and with the kit.
  for (const kit of [false, true]) {
    const page = await open(w, save(START, kit));
    await tab(page, '狩');
    await fightLizard(page);
    const won = await page.$('.arena[data-won="true"]');
    await shoot(page, await page.$('.arena'), `arena-${kit ? 'kit' : 'bare'}-${won ? 'won' : 'lost'}-${w}`);
    await page.close();
  }
  // 業 The fifth realm's Breakthrough Pill, which asks for the lizard's blood.
  {
    const page = await open(w, save(START, false));
    await tab(page, '業');
    await page.click('.crafts .cskill:has-text("Alchemy")').catch(() => {});
    await page.clock.runFor(400);
    await page.click('.crafts .cgroups button:has-text("Breakthrough")').catch(() => {});
    await page.clock.runFor(400);
    await shoot(page, await page.$('.crow[data-recipe="alchemy:breakthrough5"]'), `workshop-${w}`);
    await page.close();
  }
  // 秘境 Standing at the last gate of the run.
  {
    const page = await open(w, save(START, true, { runStep: 5, runAt: NOW - 600, springAt: NOW - 600,
      lastRun: { qi: 0, dao: 0, items: [], rooms: 5, gates: 2, beaten: false, picks: [] } as unknown as State['lastRun'] }));
    await page.waitForSelector('.secret', { timeout: 8000 }).catch(() => {});
    await shoot(page, await page.$('.secret .way[data-fight]'), `vault-${w}`);
    await page.close();
  }
}
await browser.close();
