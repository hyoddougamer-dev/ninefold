/**
 * 圖 擂 The Platform card and 期 the week's quarry, photographed off the real build, for the
 * fixed pay read off the realm (2026-10-05).
 *
 * One sixth-realm cultivator late in the realm, who bought rate first: the body the old pay
 * paid most. The first challenger down this week, so the card shows a paid row, the one
 * standing and the one waiting; the hunt screen with the week's quarry still owed. VAJRA=1
 * dresses 金剛 the Vajra (three Qi places, three Body), whose half again the card names.
 * Each is a fabricated save loaded with the game's scripts blocked, so the state shown is
 * the state the save says. Phone widths 400 and 320. Run against a build from before the
 * change and one after to put the two side by side.
 *
 *     npm run build && npx vite preview --port 4188 --strictPort &
 *     SMOKE_URL=http://localhost:4188/ OUT=/tmp/platform TAG=after npx tsx tools/shot-platform.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { periodOf } from '../src/sim/week.ts';
import { ARCHETYPES, TEMPLATE_BY_KEY } from '../src/data/gear.ts';
import { SCHOOL_INFO } from '../src/data/schools.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4188/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = process.env.OUT ?? '/tmp/platform-shots';
const TAG = process.env.TAG ?? 'after';
const VAJRA = !!process.env.VAJRA;
// 鬥 ARENA=1 fights the first challenger instead and photographs the verdict, if it is won.
const ARENA = !!process.env.ARENA;
const SAVE_KEY = 'ninefold.save.v1';
mkdirSync(OUT, { recursive: true });

const DAY = 86_400;

/** 金剛 Three Qi places and three Body places, each a fifth-tier piece of its school. */
function vajra() {
  const worn = {};
  for (const [school, n] of [['qi', 3], ['body', 3]]) {
    let left = n;
    for (const a of ARCHETYPES) {
      if (left === 0) break;
      if (worn[a.slot] || !SCHOOL_INFO[school].axes.includes(a.affix)) continue;
      const tpl = TEMPLATE_BY_KEY[`${a.key}5`];
      worn[a.slot] = { id: `${school}-${a.slot}`, template: tpl.key, rarity: 'earth', rolls: [{ affix: tpl.affix, value: 40 }] };
      left -= 1;
    }
  }
  return worn;
}

/** A sixth-realm cultivator on the realm's eighth rung, both qi upgrades at the realm's cap. */
function cultivator() {
  const at = Math.floor(Date.now() / 1000);
  const realm = 6;
  const killed = { rat: 140, hound: 60, frog: 40, serpent: 40, mantis: 30, bat: 20, beetle: 20, owl: 15,
    raven: 10, boar: 12, wolf: 8, vulture: 5, crab: 11, jellyfish: 4, lizard: 3, centipede: 10, fox: 1, ape: 1,
    crane: 1, tiger: 1 };
  return {
    // A fixed start, so the period's dice (challengerSeed) are the same on both builds.
    v: 1, at, startedAt: Number(process.env.START ?? 1_780_000_002),
    realm, layer: 7, qi: 2.1e9, materials: 6.4e6, wardenFell: false,
    levels: { technique: 33, method: 36, pills: 36, cores: 39 },
    killed,
    worn: VAJRA ? vajra() : { weapon: { id: 'w', template: 'sword5', rarity: 'earth', refine: 6,
      rolls: [{ affix: 'power', value: 22 }, { affix: 'rate', value: 8 }] } },
    chest: [],
    unlocked: ['root', 'opening', 'edge'],
    self: 'woman', stance: 'steady', sequence: ['crane', 'tiger'],
    tribulation: 0, tribulationAt: 0, tower: 60,
    brewed: { body: 0, bane: 0, fortune: 0 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard'],
    met: [], metAt: at, metPoints: 0, vaultDao: 12,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }],
    reaped: 0, runStep: -1, runAt: at - 60, runs: 4, spring: 0, springAt: at - DAY,
    platform: { period: periodOf(at, realm), beaten: ARENA ? 0 : 1 }, trail: false,
    seen: ['guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'salvage', 'fuse', 'refine', 'cores',
      'record', 'arts', 'tower', 'keystones', 'bestiary', 'cave', 'secret', 'seclusion', 'workshop', 'deep',
      'alchemy', 'sigils', 'platform', 'cap', 'furnace', 'pool'],
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

if (ARENA) {
  for (const w of [400, 320]) {
    const page = await open(w, cultivator());
    await page.clock.install();
    await page.click('nav.tabs button:has-text("塔")');
    await page.waitForSelector('.platcard .plgo');
    await page.click('.platcard .plgo');
    for (let i = 0; i < 60 && !(await page.$('.arena[data-over="true"] .verdict')); i++) await page.clock.runFor(1000);
    await page.waitForTimeout(300);
    await page.clock.runFor(3000);
    const v = await page.$('.arena .verdict');
    const won = await page.$('.arena[data-won="true"]');
    const path = `${OUT}/${TAG}-arena-${won ? 'won' : 'lost'}-${w}.png`;
    if (v) {
      await v.screenshot({ path });
      console.log(`  ${path}\n    ${(await v.innerText()).replace(/\s+/g, ' ')}`);
    } else console.log('  no verdict');
    await page.close();
  }
  await browser.close();
  process.exit(0);
}

const who = VAJRA ? '-vajra' : '';
for (const w of VAJRA ? [400] : [400, 320]) {
  // 擂 The card on 塔 Trials.
  {
    const page = await open(w, cultivator());
    await page.click('nav.tabs button:has-text("塔")');
    await page.waitForSelector('.platcard');
    await page.waitForTimeout(400);
    const card = await page.$('.platcard');
    const path = `${OUT}/${TAG}-platform${who}-${w}.png`;
    await card.screenshot({ path });
    console.log(`  ${path}\n    ${(await card.innerText()).replace(/\s+/g, ' ')}`);
    await page.close();
  }
  // 期 The week's quarry on 狩 the hunt.
  if (!VAJRA) {
    const page = await open(w, cultivator());
    await page.click('nav.tabs button:has-text("狩")');
    await page.waitForSelector('.weekband');
    await page.waitForTimeout(400);
    const band = await page.$('.weekband');
    const path = `${OUT}/${TAG}-quarry-${w}.png`;
    await band.screenshot({ path });
    console.log(`  ${path}\n    ${(await band.innerText()).replace(/\s+/g, ' ')}`);
    await page.close();
  }
}
await browser.close();
