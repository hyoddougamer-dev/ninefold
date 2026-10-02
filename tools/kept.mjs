/**
 * 鎖 What the testers asked to keep, find and order, played on the real build.
 *
 * rekaris, on the Discord (2026-10-02), five asks that change no number in the game:
 *
 *   鎖 "Favorite a piece ... Even melting with Heaven filter will not break such piece."
 *   套 "Set up loadouts ... a single button to equip such loadout."
 *   職 "instantly know what set/class a gear is ... adding another line of filters for the class"
 *   序 "I would expect the first enemy in the list to either be the strongest, or the one
 *       dropping the most materials"
 *   物 "The icons for materials required to craft something are very small ... clicking it
 *       would automatically move you to the crafting that drops this item"
 *
 * Each is done here by hand, through the screen, and checked in the save afterwards. It also
 * leaves a picture of each screen at 320, 400 and 1366 wide in OUT, when OUT is given.
 *
 *     npm run build && npm run preview &
 *     node tools/kept.mjs [OUT]
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const OUT = process.argv[2] ?? null;

const piece = (id, template, rarity = 'common', value = 6, affix = 'power') =>
  ({ id, template, rarity, rolls: [{ affix, value }] });

function cultivator(over = {}) {
  const at = Math.floor(Date.now() / 1000);
  return {
    v: 1, at, startedAt: at - 30 * 86400,
    realm: 4, layer: 4, qi: 1e6, materials: 2e4, wardenFell: false,
    levels: { technique: 18, method: 18, pills: 18, cores: 12 },
    killed: { rat: 30, hound: 20, frog: 20, beetle: 30, viper: 12, boar: 4 },
    worn: { weapon: piece('w-on', 'sword3', 'earth', 22), robe: piece('r-on', 'robe3', 'mystic', 9, 'rate') },
    chest: [
      piece('c-junk1', 'sword2'), piece('c-junk2', 'leather2'), piece('c-keep', 'sword4', 'earth', 30),
      piece('c-luck', 'cloak3', 'mystic', 8, 'luck'), piece('c-robe', 'robe3', 'spirit', 7, 'rate'),
      piece('c-crown', 'bonecrown3', 'common', 4, 'refine'),
    ],
    self: 'woman', stance: 'swift', sequence: [], tribulation: 0, tribulationAt: 0, tower: 0,
    brewed: { body: 0, bane: 0, fortune: 0 }, awakened: ['feast', 'wolf', 'luckystar'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage',
      'fuse', 'whom', 'workshop'],
    ...over,
  };
}

const problems = [];
const check = (ok, said) => { console.log(`${ok ? '✓' : '✗'} ${said}`); if (!ok) problems.push(said); };
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width, height, over = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, cultivator(over)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken .later');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  return page;
}

/** The save as the game last wrote it, opened from its seal by the game's own code. */
async function saved(page) {
  // Leaving the tab writes the save; the seal is opened in node by tsx's sim, so here the
  // screen is asked instead: what it shows is what the save holds after the next load.
  await page.reload();
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(500);
}

const tab = (page, han) => page.click(`nav.tabs button:has-text("${han}")`).then(() => page.waitForTimeout(400));
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` }); };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

for (const [w, h, tag] of [[400, 860, 'p400'], [320, 640, 'p320'], [1366, 768, 'pc']]) {
  const page = await open(w, h);
  const pc = w > 900;

  // ── 職 the school on every tile, and a line of filters by school ───────────────────
  await tab(page, '器');
  const seals = await page.$$eval('.chest .chestit svg', (els) =>
    els.filter((s) => [...s.querySelectorAll('text')].length >= 3).length);
  const tiles = await page.$$eval('.chest .chestit', (els) => els.length);
  check(tiles > 0 && seals === tiles, `${tag}: every chest tile carries its school's seal (${seals}/${tiles})`);
  const schoolChips = await page.$$('.chestfilter.schools button');
  check(schoolChips.length >= 3, `${tag}: a filter line by school (${schoolChips.length} buttons)`);
  const fortune = await page.$('.chestfilter.schools button:has-text("Fortune")');
  if (fortune) {
    await fortune.click();
    await page.waitForTimeout(250);
    const left = await page.$$eval('.chest .chestit', (els) => els.map((e) => e.getAttribute('aria-label')));
    check(left.length === 1 && /Cloak/i.test(left[0] ?? ''), `${tag}: Fortune shows only the Fortune piece (${left.join(' | ')})`);
    await page.click('.chestfilter.schools button:has-text("Any school")');
    await page.waitForTimeout(200);
  } else check(false, `${tag}: there was a Fortune piece to filter by`);
  check(await overflow(page) <= 0, `${tag}: the gear screen does not scroll sideways`);
  await shot(page, `${tag}-gear`);

  // ── 鎖 lock a piece, melt everything up to 天, and the piece is still there ──────────
  await page.click('.chest .chestit[aria-label^="Iron"], .chest .chestit >> nth=0');
  await page.waitForSelector('.lockbtn', { timeout: 3000 }).catch(() => {});
  const name = await page.$eval('.lockbtn', () => '').catch(() => null);
  check(name !== null, `${tag}: the item sheet has a Lock button`);
  await page.click('.lockbtn');
  await page.waitForTimeout(250);
  check(!!(await page.$('.itemsheet')) && !(await page.$('.itemsheet .melt')), `${tag}: the sheet offers no melt once the piece is locked`);
  const saysLocked = await page.$eval('.lockedsays', (e) => e.textContent).catch(() => '');
  check(/never melted/.test(saysLocked ?? ''), `${tag}: the sheet says what a lock does ("${saysLocked}")`);
  if (tag === 'p400') await shot(page, `${tag}-sheet-locked`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const before = await page.$$eval('.chest .chestit', (els) => els.length);
  check(!!(await page.$('.chest .chestit .lockmark')), `${tag}: the locked tile wears a clasp`);
  // Melt everything up to 天 Heaven.
  const heaven = await page.$('.rk[aria-label^="Heaven"]');
  if (heaven) await heaven.click();
  await page.waitForTimeout(200);
  await page.click('button.melt.wide');
  await page.waitForTimeout(500);
  const after = await page.$$eval('.chest .chestit', (els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
  check(before >= 5 && after.length === 1 && /locked/.test(after[0]), `${tag}: melting up to Heaven leaves only the locked piece (${before} then ${after.length})`);
  await saved(page);
  await tab(page, '器');
  check(!!(await page.$('.chest .chestit .lockmark')), `${tag}: the lock is still there after a reload`);

  // ── 套 save what is worn, change a piece, put the loadout back on ─────────────────────
  const save = await page.$('button.gs-new');
  check(!!save, `${tag}: a button saves what is worn as a loadout`);
  if (save) {
    await save.click();
    await page.waitForTimeout(300);
    const named = await page.$eval('.gset .gs-wear b', (e) => e.textContent).catch(() => '');
    check(!!named, `${tag}: the loadout is named after what it makes ("${named}")`);
    const worn = await page.$eval('.gset .gs-wear i', (e) => e.textContent).catch(() => '');
    check(/Wearing/.test(worn ?? ''), `${tag}: and says it is worn now`);
    // Take a piece off by hand: the loadout is no longer what is worn.
    await page.click('.orb >> nth=0').catch(() => {});
    await page.waitForTimeout(300);
    const off = await page.$('button.act.ghost:has-text("Take it off")');
    if (off) { await off.click(); await page.waitForTimeout(300); }
    const canWear = await page.$('.gset .gs-wear:not([disabled])');
    check(!!canWear, `${tag}: with a piece off, the loadout can be put back on`);
    if (canWear) {
      await canWear.click();
      await page.waitForTimeout(400);
      const back = await page.$eval('.gset .gs-wear i', (e) => e.textContent).catch(() => '');
      check(/Wearing/.test(back ?? ''), `${tag}: one tap and it is all worn again`);
    }
    if (tag === 'p400' || tag === 'pc') {
      await page.$eval('.gsets', (e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
      await page.waitForTimeout(200);
      await shot(page, `${tag}-loadouts`);
    }
  }

  // ── 序 the hunt list in the order asked for, kept on the device ─────────────────────
  await tab(page, '狩');
  const names = async () => page.$$eval('.stack > .beast, .stack > button.beast', (rows) => rows.slice(0, 3)
    .map((r) => r.getAttribute('aria-label') ?? r.querySelector('b')?.textContent?.trim()));
  const first = await names();
  await page.click('.huntorder button:has-text("Strongest")');
  await page.waitForTimeout(300);
  const strong = await names();
  check(JSON.stringify(first) !== JSON.stringify(strong), `${tag}: Strongest reorders the list (${strong.join(', ')})`);
  await saved(page);
  await tab(page, '狩');
  const on = await page.getAttribute('.huntorder button:has-text("Strongest")', 'data-on');
  check(on === 'true', `${tag}: and the order is still Strongest after a reload`);
  const leaves = await page.$$eval('.bleaves em', (els) => els.slice(0, 3).map((e) => e.getAttribute('aria-label')));
  check(leaves.length > 0 && leaves.every((l) => /, (Sword|Qi|Fortune|Body|Artificer|Arts)$/.test(l ?? '')),
    `${tag}: each piece a beast leaves names its school (${leaves.join(' | ')})`);
  check(await overflow(page) <= 0, `${tag}: the hunt screen does not scroll sideways`);
  await shot(page, `${tag}-hunt`);
  await page.click('.huntorder button:has-text("Next mark")');

  // ── 物 a material named on its icon, and one tap to where it is made ─────────────────
  await tab(page, '業');
  const forge = await page.$('.cskill:has-text("Forg"), .cskill:has-text("鍛")');
  if (forge) { await forge.click(); await page.waitForTimeout(300); }
  const icon = await page.$('.cr-needs .term[data-bare]');
  check(!!icon, `${tag}: a recipe's material icon answers a tap`);
  if (icon) {
    await icon.click();
    await page.waitForSelector('.termtip', { timeout: 2000 }).catch(() => {});
    const said = await page.$eval('.termtip', (e) => e.textContent).catch(() => '');
    check(/Made in/.test(said ?? ''), `${tag}: the note names it and says where it is made ("${(said ?? '').slice(0, 70)}")`);
    if (tag !== 'p320') await shot(page, `${tag}-craftnote`);
    const go = await page.$('.termtip .termgo');
    if (go) {
      await go.click();
      await page.waitForTimeout(700);
      const lit = await page.$('.crow[data-lit]');
      check(!!lit, `${tag}: Go takes the player to that recipe, lit`);
    } else check(false, `${tag}: the note has a Go button`);
  }

  // ── PC: every effect of a piece is open without asking ──────────────────────────────
  if (pc) {
    await tab(page, '器');
    await page.click('.chest .chestit >> nth=0').catch(() => {});
    await page.waitForTimeout(400);
    const opened = await page.$eval('details.idetail', (d) => d.open).catch(() => false);
    check(opened, `${tag}: on a computer the sheet opens with every effect shown`);
    await shot(page, `${tag}-sheet`);
  } else {
    await tab(page, '器');
    await page.click('.chest .chestit >> nth=0').catch(() => {});
    await page.waitForTimeout(400);
    const opened = await page.$eval('details.idetail', (d) => d.open).catch(() => true);
    check(!opened, `${tag}: on a phone the details stay folded, as before`);
  }
  await page.close();
}

await browser.close();
console.log(problems.length ? `\n鎖 ${problems.length} broken: ${problems.join('; ')}\n`
  : '\n鎖 kept, found and ordered as asked, on a phone and on a computer.\n');
process.exitCode = problems.length ? 1 : 0;
