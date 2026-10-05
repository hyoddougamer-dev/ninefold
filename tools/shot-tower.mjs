/**
 * 圖 塔 The tower card, photographed off the real build, for the fixed pay of a floor.
 *
 * One fifth-realm cultivator standing on three floors: well under the fifth realm's warden
 * floor (31), on it (45) and above it (67), which is where the old card said three
 * different things, and where the new one says the least, the least, and a rising sum. Each is a fabricated save loaded with the game's scripts blocked, so
 * the state shown is the state the save says. Phone widths 400 and 320. Run against a
 * build from before the change and one after to put the two cards side by side.
 *
 *     npm run build && npx vite preview --port 4181 --strictPort &
 *     SMOKE_URL=http://localhost:4181/ OUT=/tmp/tower TAG=after node tools/shot-tower.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4181/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = process.env.OUT ?? '/tmp/tower-static';
const TAG = process.env.TAG ?? 'after';
const SAVE_KEY = 'ninefold.save.v1';
mkdirSync(OUT, { recursive: true });

const DAY = 86_400;

/** A fifth-realm cultivator mid-realm, built, with the tower climbed to `tower`. */
function cultivator(tower, over = {}) {
  const at = Math.floor(Date.now() / 1000);
  const killed = { rat: 140, hound: 60, frog: 40, serpent: 40, mantis: 30, bat: 20, beetle: 20, owl: 15,
    raven: 10, boar: 12, wolf: 8, vulture: 5, crab: 11, jellyfish: 4, lizard: 3, centipede: 10, fox: 1, ape: 1,
    crane: 1, tiger: 1 };
  return {
    v: 1, at, startedAt: at - 9 * DAY,
    realm: 5, layer: 4, qi: 4.1e7, materials: 2.4e6, wardenFell: false,
    levels: { technique: 27, method: 27, pills: 27, cores: 33 },
    killed,
    worn: { weapon: { id: 'w', template: 'sword5', rarity: 'earth', refine: 6,
      rolls: [{ affix: 'power', value: 22 }, { affix: 'rate', value: 8 }] } },
    chest: [],
    unlocked: ['root', 'opening', 'edge'],
    self: 'woman', stance: 'steady', sequence: ['crane', 'tiger'],
    tribulation: 0, tribulationAt: 0, tower,
    brewed: { body: 0, bane: 0, fortune: 0 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform'],
    met: [], metAt: at, metPoints: 0, vaultDao: 12,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }],
    reaped: 0, runStep: -1, runAt: at - DAY, runs: 4, spring: 0, springAt: at - DAY,
    platform: { period: -1, beaten: 0 }, trail: false,
    seen: ['guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'salvage', 'fuse', 'refine', 'cores',
      'record', 'arts', 'tower', 'keystones', 'bestiary', 'cave', 'secret', 'seclusion', 'workshop', 'deep',
      'alchemy', 'sigils', 'platform', 'cap', 'furnace', 'pool'],
    ...over,
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width, save) {
  const page = await browser.newPage({ viewport: { width, height: 2400 }, deviceScaleFactor: 2 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken .later, .whom .later');
    if (!b) break;
    await b.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  return page;
}

for (const w of [400, 320]) {
  for (const [name, tower] of [['below', 30], ['warden', 44], ['above', 66]]) {
    const page = await open(w, cultivator(tower));
    await page.click('nav.tabs button:has-text("塔")');
    await page.waitForSelector('.towerduo .card');
    await page.waitForTimeout(400);
    const card = await page.$('.towerduo .card');
    const path = `${OUT}/${TAG}-${name}-floor${tower + 1}-${w}.png`;
    await card.screenshot({ path });
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    console.log(`  ${path}\n    ${text}`);
    await page.close();
  }
}
await browser.close();
