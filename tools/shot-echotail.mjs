/**
 * 宿慧 The Echo's soft tail, shot off the real game: the Rebirth page for a cultivator with
 * nine lives behind them and for one with twenty-five, the confirm that says the exact Echo
 * before and after and where it stands against the roof, and the page of the life that begins.
 *
 *     npm run build && npx vite preview --port 4391 &
 *     SMOKE_URL=http://localhost:4391/ node tools/shot-echotail.mjs <dir>
 *
 * Each shot is taken at 400 and at 320 wide. The traps CLAUDE.md records apply: the save is
 * planted with the scripts blocked, and a notice is dismissed before anything is tapped. It
 * also checks what it shoots: the Echo the page promises is the Echo the save is born with,
 * and nothing hangs off the side of a 320 screen.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const dir = process.argv[2] ?? 'shots-echotail';
mkdirSync(dir, { recursive: true });

const TAKEN = ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula', 'ninerungs',
  'quickfire', 'sealbreaker'];

/** A cultivator at the summit with `marks` crossed and `n` lives of 15 marks behind them. */
function summit(marks, n) {
  const at = Math.floor(Date.now() / 1000);
  const startedAt = at - 800 * 86400;
  const lives = Array.from({ length: n }, (_, i) => ({ marks: 15, at: startedAt + Math.floor(((i + 1) / (n + 1)) * 500 * 86400) }));
  const cap = 9 * 6 + Math.ceil(marks / 3) * 6;
  const killed = { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15, bat: 12, beetle: 12,
                   owl: 8, raven: 8, boar: 8, wolf: 6, vulture: 6, crab: 6, jellyfish: 5,
                   lizard: 5, centipede: 4, scorpion: 4, gargoyle: 3, minotaur: 3, squid: 3,
                   fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1 };
  return {
    v: 1, at, startedAt,
    realm: 9, layer: 8, qi: 1e12, materials: 1e12, wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: cap - 6 },
    killed,
    worn: { weapon: { id: 'w', template: 'sword9', rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }] } },
    chest: [],
    unlocked: [], self: 'woman', stance: 'swift', sequence: ['crane'],
    tribulation: marks, tribulationAt: 0, tower: 160,
    brewed: { body: 60, bane: 50, fortune: 40 },
    awakened: TAKEN.slice(0, 8 + Math.ceil(marks / 3)),
    met: [], metAt: 0, metPoints: 0,
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    runStep: -1, runAt: 0, runs: 0, quarryWeek: -1,
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones',
           'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'],
    lives,
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
let page = null;
let failures = 0;
const check = (ok, what) => { if (!ok) { failures++; console.log(`  ✗ ${what}`); } };

const plant = async (save, width, height = 860) => {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, b, s]) => {
    localStorage.clear();
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
  }, [SAVE_KEY, BACKUP_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  await dismiss();
  await page.locator('nav.tabs button', { hasText: /cultivate/i }).first().click();
  await page.waitForTimeout(400);
  await dismiss();
};

const dismiss = async () => {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.back button, .notice button, .awaken .later');
    if (!b) break;
    try { await b.click({ timeout: 1500 }); } catch { break; }
    await page.waitForTimeout(250);
  }
};

const shot = async (name) => {
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path });
  console.log(path);
};

const fits = async (what) => {
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('.rebirthsheet *, .rebirthline, .lifewears, .echochip')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5); })
      .map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().right)}`).slice(0, 4);
  });
  check(over.length === 0, `${what}: off the side of the screen: ${over.join(', ')}`);
};

const scrollTo = async (sel) => {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel);
  await page.waitForTimeout(250);
};

for (const [n, marks] of [[9, 3], [25, 12], [39, 12]]) {
  for (const width of [400, 320]) {
    const tag = `${n}lives-${width}`;
    await plant(summit(marks, n), width);
    const offer = await page.$('.rebirthline');
    check(!!offer, `${tag}: the offer is on 修`);
    if (n === 9) { await scrollTo('.rebirthline'); await shot(`${tag}-1-offer`); }
    await offer?.click();
    await page.waitForSelector('.rebirthsheet', { timeout: 5000 });
    await page.waitForTimeout(400);
    await fits(`${tag} page`);
    await shot(`${tag}-2-page`);
    await scrollTo('.rb-meter');
    await fits(`${tag} echo`);
    await shot(`${tag}-3-echo`);

    // The Echo the confirm promises, read off the page, and the one the save is born with.
    await page.click('.rb-confirm .act');
    await page.waitForTimeout(300);
    await page.evaluate(() => { const s = document.querySelector('.rebirthsheet'); if (s) s.scrollTop = s.scrollHeight; });
    await page.waitForTimeout(250);
    const promised = Number(await page.$eval('.rb-promise', (e) => e.getAttribute('data-echo')));
    const says = await page.$eval('.rb-confirm', (e) => e.textContent ?? '');
    console.log(`  ${tag}: ${says.replace(/\s+/g, ' ').slice(0, 220)}`);
    check(says.includes('of at most +35%'), `${tag}: the confirm says where the Echo stands against the roof`);
    await fits(`${tag} confirm`);
    await shot(`${tag}-4-confirm`);

    await page.click('.rb-confirm .act');
    await page.waitForSelector('.rebirthsheet[data-born="true"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    // The save is sealed (CLAUDE.md), so the new life is read off its own page.
    const head = await page.$eval('.rebirthsheet h2', (e) => e.textContent ?? '');
    const bornSays = await page.$eval('.rb-says', (e) => e.textContent ?? '');
    await fits(`${tag} born`);
    await shot(`${tag}-5-born`);
    console.log(`  ${tag}: promised Echo ${(promised * 100).toFixed(2)}%; ${head}; ${bornSays}`);
    check(head.includes(`Life ${n + 2} begins`), `${tag}: the new life is life ${n + 2} (${head})`);
    check(bornSays.includes(`+${(promised * 100).toFixed(1)}%`), `${tag}: the born page carries the Echo the confirm promised (${bornSays})`);

  }
}

await browser.close();
if (failures) { console.log(`✗ ${failures} checks failed`); process.exit(1); }
console.log('✓ the page, the confirm and the born page, with nine, twenty-five and thirty-nine lives, at 400 and 320');
