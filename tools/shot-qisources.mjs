/**
 * 圖 泉 香 擂台 The vault's rooms and the Platform, photographed off the real build.
 *
 * Every picture is a fabricated save loaded with the game's scripts blocked, so the state
 * being shown is the state the save says and nothing imagined. Phone widths 400 and 320,
 * because a screen nobody opened at 320 is where the last layout bug lived.
 *
 *     npm run build && npx vite preview --port 4177 --strictPort &
 *     SMOKE_URL=http://localhost:4177/ OUT=/tmp/shots node tools/shot-qisources.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = process.env.OUT ?? '/tmp/qisrc-built';
const SAVE_KEY = 'ninefold.save.v1';
mkdirSync(OUT, { recursive: true });

const DAY = 86_400;
const weekOf = (at) => Math.max(0, Math.floor((at + 3 * DAY) / (7 * DAY)));
const periodOf = (at, realm) => weekOf(at) * 10 + realm;

/**
 * 勤 The harness's own active cultivator, when FIXTURE names a save it wrote (tools/habits.ts
 * walked to the sixth realm), moved to today: every instant in it shifted by the same amount,
 * so the spring, the beds and the workshop read as they did on the day it was taken.
 */
const FIXTURE = process.env.FIXTURE ? JSON.parse(readFileSync(process.env.FIXTURE, 'utf8')) : null;
function fromHarness(over) {
  const at = Math.floor(Date.now() / 1000);
  const d = at - FIXTURE.at;
  const move = (x) => (typeof x === 'number' && x > 0 ? x + d : x);
  return {
    ...FIXTURE,
    at, startedAt: move(FIXTURE.startedAt), runAt: move(FIXTURE.runAt), springAt: move(FIXTURE.springAt),
    metAt: move(FIXTURE.metAt), secludedAt: move(FIXTURE.secludedAt), incenseUntil: 0, keyDay: 0, quarryWeek: -1,
    beds: FIXTURE.beds.map((b) => ({ ...b, at: move(b.at) })),
    crafts: { ...FIXTURE.crafts, since: at },
    platform: { period: -1, beaten: 0 }, trail: false,
    self: 'woman',
    seen: ['guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'salvage', 'fuse', 'refine', 'cores',
      'record', 'arts', 'tower', 'keystones', 'bestiary', 'cave', 'secret', 'seclusion', 'workshop', 'deep',
      'alchemy', 'sigils', 'platform', 'cap', 'furnace', 'pool'],
    ...over,
  };
}

/** A sixth-realm cultivator, mid-realm, built: the harness's own active shape. */
export function cultivator(over = {}) {
  if (FIXTURE) return fromHarness(over);
  const at = Math.floor(Date.now() / 1000);
  const killed = { rat: 140, hound: 60, frog: 40, serpent: 40, mantis: 30, bat: 20, beetle: 20, owl: 15,
    raven: 10, boar: 12, wolf: 8, vulture: 5, crab: 11, jellyfish: 4, lizard: 3, centipede: 10, scorpion: 2,
    worm: 2, fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1 };
  return {
    v: 1, at, startedAt: at - 25 * DAY,
    realm: 6, layer: 5, qi: 3.2e9, materials: 1.99e8, wardenFell: false,
    levels: { technique: 34, method: 34, pills: 34, cores: 40 },
    killed,
    worn: { weapon: { id: 'w', template: 'sword6', rarity: 'earth', refine: 8,
      rolls: [{ affix: 'power', value: 24 }, { affix: 'rate', value: 9 }] } },
    chest: [],
    unlocked: ['root', 'opening', 'edge', 'chain'],
    self: 'woman', stance: 'steady', sequence: ['crane', 'tiger'],
    tribulation: 0, tribulationAt: 0, tower: 52,
    brewed: { body: 0, bane: 0, fortune: 0 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard'],
    met: [], metAt: at, metPoints: 0, vaultDao: 18,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }],
    reaped: 3, runStep: -1, runAt: at - DAY, runs: 7, spring: 0, springAt: at - DAY,
    crafts: { xp: { herb: 2.2e6, vein: 2.2e6, render: 0, forge: 0, alchemy: 0, sigil: 0, array: 0 },
      task: null, since: at, pouch: {}, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0 },
    seen: ['guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'salvage', 'fuse', 'refine', 'cores',
      'record', 'arts', 'tower', 'keystones', 'bestiary', 'cave', 'secret', 'seclusion', 'workshop', 'deep',
      'alchemy', 'sigils', 'platform', 'cap', 'furnace', 'pool'],
    ...over,
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width, save, clock, height = 860) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  if (clock) await page.clock.install({ time: clock * 1000 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button, .secret', { timeout: 15000 });
  await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken .later, .whom .later');
    if (!b) break;
    if (process.env.DEBUG) console.log('  dismiss', (await b.textContent())?.slice(0, 60));
    await b.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  return page;
}

const shots = [];
async function shot(page, name, full = true) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: full });
  shots.push(path);
  console.log(`  ${path}`);
}

for (const w of [400, 320]) {
  const at = Math.floor(Date.now() / 1000);
  // a. 秘境 Room 3 of 7: the first room drunk, a full spring behind it.
  {
    const page = await open(w, cultivator({
      runStep: 2, spring: 0.9 * DAY, springAt: at, runAt: at - DAY,
      lastRun: { qi: 59e6, dao: 0, items: [], rooms: 2, gates: 1, beaten: false, burn: 0, box: {}, trail: false,
        picks: [{ step: 0, kind: 'spring' }] },
    }), undefined, 2400);
    await page.waitForSelector('.secret .ways .way');
    // The rooms scroll inside their own sheet, so the page is made tall enough to hold them.
    const tall = Math.ceil(await page.$eval('.secret .later', (e) => e.getBoundingClientRect().bottom + 40));
    await page.setViewportSize({ width: w, height: Math.min(2400, tall) });
    await page.waitForTimeout(200);
    await shot(page, `a-vault-room-${w}`, false);
    await page.close();
  }
  // b1. 出 The end of a run: drunk, burned and boxed, and the door's wait.
  {
    const page = await open(w, cultivator({
      runAt: at, incenseUntil: at + 5760,
      lastRun: { qi: 296e6, dao: 1, items: [], rooms: 7, gates: 3, beaten: false, burn: 5760,
        box: { fern: 600, starfall: 514 }, trail: false,
        picks: [{ step: 0, kind: 'spring' }, { step: 2, kind: 'incense' }, { step: 4, kind: 'box' }, { step: 6, kind: 'spring' }] },
      runStep: 6, spring: 0, springAt: at,
    }));
    // Walking out of the last room is what raises the tally: take the spring door.
    await page.waitForSelector('.secret .ways .way');
    await page.click('.secret .later');
    await page.waitForSelector('.runend .endcard', { timeout: 4000 });
    await page.waitForTimeout(300);
    await shot(page, `b1-vault-run-end-${w}`, false);
    await page.close();
  }
  // b2. 修 Incense burning beside a sitting.
  {
    const page = await open(w, cultivator({ incenseUntil: at + 5758 }));
    await page.click('nav.tabs button:has-text("修")').catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, `b2-incense-on-cultivate-${w}`, false);
    await page.close();
  }
  // c. 塔 The Platform under the tower, the first challenger down this week, and nothing set
  // that answers the week's temper, so the card offers the stance that would.
  {
    const page = await open(w, cultivator({ platform: { period: periodOf(at, 6), beaten: 1 }, bouts: 4,
      stance: null, sequence: [] }));
    await page.click('nav.tabs button:has-text("塔")');
    await page.waitForSelector('.platcard');
    // Tall enough that the card is drawn whole, with nothing scrolled under the header.
    await page.setViewportSize({ width: w, height: 2600 });
    await page.waitForTimeout(400);
    const card = await page.$('.platcard');
    const path = `${OUT}/c-platform-card-${w}.png`;
    await card.screenshot({ path });
    shots.push(path);
    console.log(`  ${path}`);
    await page.close();
  }
  // d. 鬥 The first challenger, fought by the harness's own build, to its verdict.
  {
    const page = await open(w, cultivator({ bouts: 4 }));
    await page.click('nav.tabs button:has-text("塔")');
    await page.waitForSelector('.platcard .plgo');
    await page.click('.platcard .plgo');
    await page.waitForSelector('.arena', { timeout: 4000 });
    await page.click('.arena');
    await page.waitForSelector('.verdict', { timeout: 4000 });
    await page.waitForTimeout(900);
    const won = await page.$eval('.arena', (e) => e.getAttribute('data-won'));
    await shot(page, `d-challenger-${won === 'true' ? 'won' : 'lost'}-${w}`, false);
    await page.close();
  }
  // d2. The other ending: a weak build against the second challenger loses, and the verdict says so.
  {
    const page = await open(w, cultivator({ platform: { period: periodOf(at, 6), beaten: 1 }, bouts: 4,
      levels: { technique: 20, method: 34, pills: 34, cores: 20 }, stance: null, sequence: [], worn: {} }));
    await page.click('nav.tabs button:has-text("塔")');
    await page.waitForSelector('.platcard .plgo');
    await page.click('.platcard .plgo');
    await page.waitForSelector('.arena', { timeout: 4000 });
    await page.click('.arena');
    await page.waitForSelector('.verdict', { timeout: 4000 });
    await page.waitForTimeout(900);
    const won = await page.$eval('.arena', (e) => e.getAttribute('data-won'));
    await shot(page, `d2-challenger-${won === 'true' ? 'won' : 'lost'}-${w}`, false);
    await page.close();
  }
  // e. 狩 The door outside, with what the spring holds.
  {
    const page = await open(w, cultivator({ runAt: at - 3 * 3600, springAt: at - 6 * 3600, spring: 0 }));
    await page.click('nav.tabs button:has-text("狩")');
    await page.waitForSelector('.door.open');
    await page.$eval('.door.open', (e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    const path = `${OUT}/e-vault-door-${w}.png`;
    await (await page.$('.door.open')).screenshot({ path });
    shots.push(path);
    console.log(`  ${path}`);
    await page.close();
  }
}

await browser.close();
console.log(`\n圖 ${shots.length} pictures in ${OUT}`);
