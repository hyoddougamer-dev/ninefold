/**
 * 屏 Every screen of the real game, shot at phone size, into one folder.
 *
 * 圖 This exists because a palette is not a change you can report in words. It takes the
 * same cultivator through the same five tabs before and after, so the two sets can be put
 * side by side and the claim checked rather than believed.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-screens.mjs shots-before
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const dir = process.argv[2] ?? 'shots';
mkdirSync(dir, { recursive: true });

/** A cultivator far enough in that every tab has something on it. */
function cultivator(realm) {
  const at = Math.floor(Date.now() / 1000);
  const cap = realm * 6;
  const killed = { rat: 3, hound: 2, frog: 2, serpent: 3, mantis: 2, bat: 1, beetle: 2, owl: 1, raven: 1,
                   boar: 2, wolf: 1, vulture: 1, crab: 1 };
  ['fox', 'ape', 'crane', 'tiger'].slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  return {
    v: 1, at, startedAt: at - realm * 10 * 86400,
    realm, layer: 3, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: Array.from({ length: 4 }, (_, i) => ({
      id: `c${i}`, template: `${['sword', 'robe', 'plainring', 'sandals'][i % 4]}${Math.max(2, realm - (i % 3))}`,
      rarity: ['common', 'spirit', 'mystic', 'earth'][i % 4], rolls: [{ affix: 'power', value: 5 + i }],
    })),
    stance: 'swift', sequence: realm >= 3 ? ['crane'] : [], tribulation: 0, tribulationAt: 0,
    tower: realm >= 5 ? realm * 10 : 0, brewed: { body: 0, bane: 0, fortune: 0 },
    // 悟 Every awakening the realm owes, already taken, so the card that asks for one is
    // not sitting over the screen being photographed.
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought']
      .slice(0, [0, 0, 2, 2, 4, 4, 6, 6, 8, 8][realm]),
    seen: ['guide','marks','reach','tree','stance','gear','tower','keystones','bestiary','salvage','fuse', 'whom'],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
await page.route('**/assets/*.js', (r) => r.abort());
await page.goto(BASE);
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, cultivator(5)]);
await page.unroute('**/assets/*.js');
await page.goto(BASE);
await page.waitForSelector('nav.tabs button', { timeout: 15000 });
await page.waitForTimeout(800);

/** 掩 A notice card sits over the tab bar and eats the tap, so it goes first, every time. */
const clear = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken button');
    if (!b) break;
    await b.click();
    await page.waitForTimeout(220);
  }
};

for (const [han, name] of [['修', 'cultivate'], ['狩', 'hunt'], ['塔', 'trials'], ['器', 'gear'], ['道', 'dao']]) {
  await clear();
  const tabs = await page.$$('nav.tabs button');
  for (const t of tabs) {
    const txt = await t.textContent();
    if (txt?.includes(han)) { await t.click(); break; }
  }
  await page.waitForTimeout(600);
  await clear();
  await page.screenshot({ path: `${dir}/${name}.png` });
  console.log(`${dir}/${name}.png`);
}

// 鬥 And the arena, which is the one screen a painting is already shown on.
await page.waitForTimeout(200);
const tabs = await page.$$('nav.tabs button');
for (const t of tabs) { const txt = await t.textContent(); if (txt?.includes('狩')) { await t.click(); break; } }
await page.waitForTimeout(500);
await clear();
const row = await page.$('button.beast');
if (row) {
  const b = await row.boundingBox();
  await page.mouse.click(b.x + b.width - 14, b.y + b.height / 2);
  await page.waitForTimeout(1300);
  await clear();
  await page.screenshot({ path: `${dir}/arena.png` });
  console.log(`${dir}/arena.png`);
}
await browser.close();
