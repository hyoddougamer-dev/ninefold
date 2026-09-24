/**
 * 悟道屏 The card a heaven owes, shot off the real game.
 *
 * 圖 The nine heavens each hand over a 悟道 choice now, and the screen that asks it is
 * the same one the realms use with one sentence changed: what is behind you is a heaven
 * rather than a realm, and the colour walks up through the heavens' own gold. A change
 * a player sees is not reported in words in this repository, so this opens it.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-heaven.mjs shots-heaven
 *
 * 免 Both traps CLAUDE.md records apply: the app rewrites its save on unload, so the
 * fixture is planted with the scripts blocked, and 備 the spare copy in sim/save.ts is a
 * second key that has to be planted with it or the game comes back as whatever it was.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-heaven';
const WIDTH = Number(process.env.HEAVEN_WIDTH ?? 400);
mkdirSync(dir, { recursive: true });

/**
 * 印 The cards already taken, in the order the trios offer them.
 *
 * 序 It has to be a legal list, not a bag: `valid` checks each entry against the trio
 * that entry's own turn offers and throws away anything out of place, so a fixture that
 * names the ninth heaven's card in ninth position reads as a cultivator with no cards at
 * all and the screen goes back to offering the first realm's.
 */
const TAKEN = [
  'feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought',
  'formula', 'ninerungs', 'quickfire', 'sealbreaker', 'slowfire', 'skystair',
  'ninereturns', 'topless', 'uncarved',
];

/** A cultivator standing in a heaven, with that heaven's card still to take. */
function immortal(marks, cards) {
  const at = Math.floor(Date.now() / 1000);
  const cap = 9 * 6 + Math.ceil(marks / 3) * 6;
  const killed = { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15, bat: 12, beetle: 12,
                   owl: 8, raven: 8, boar: 8, wolf: 6, vulture: 6, crab: 6, jellyfish: 5,
                   lizard: 5, centipede: 4, scorpion: 4, gargoyle: 3, minotaur: 3, squid: 3,
                   fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1 };
  return {
    v: 1, at, startedAt: at - 150 * 86400,
    realm: 9, layer: 8, qi: 1e18, materials: 1e12, wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: cap - 6 },
    killed,
    worn: { weapon: { id: 'w', template: 'sword9', rarity: 'heaven', refine: 20,
                      rolls: [{ affix: 'power', value: 40 }] } },
    chest: [],
    unlocked: [], self: 'woman', stance: 'swift', sequence: ['crane'],
    tribulation: marks, tribulationAt: 0, tower: 200,
    brewed: { body: 60, bane: 50, fortune: 40 },
    awakened: TAKEN.slice(0, cards),
    met: [], metAt: 0, metPoints: 0,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: 0, runs: 0, quarryWeek: -1,
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;

const plant = async (save) => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, s]) => {
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
  }, [SAVE_KEY, BACKUP_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  // 歸 The welcome back card sits over the 悟道 one, so it goes first.
  for (let i = 0; i < 6; i++) {
    const b = await page.$('.back button, .notice button');
    if (!b) break;
    try { await b.click({ timeout: 1500 }); } catch { break; }
    await page.waitForTimeout(220);
  }
};

const shot = async (name, sel) => {
  const el = sel ? await page.$(sel) : null;
  const path = `${dir}/${name}.png`;
  if (!el && sel) throw new Error(`悟道 nothing matched ${sel} for ${name}`);
  if (el) await el.screenshot({ path }); else await page.screenshot({ path });
  console.log(path);
};

// 境 The realms' version first, so the two can be put side by side.
await plant(immortal(0, 7));
await shot('realm', '.awaken');

// 境外 And the same screen at three heavens, which is where the colour walks.
for (const [marks, name, cards] of [[1, 'heaven1', 8], [13, 'heaven5', 12], [25, 'heaven9', 16]]) {
  await plant(immortal(marks, cards));
  const said = await page.$eval('.awaken .over', (e) => e.textContent ?? '');
  if (!said.includes('heaven')) throw new Error(`悟道 ${name} still says: ${said}`);
  await shot(name, '.awaken');
}

await browser.close();
