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
    realm: 4, layer: 4, qi: 1e9, materials: 2e4, wardenFell: false,
    levels: { technique: 18, method: 18, pills: 18, cores: 12 },
    killed: { rat: 150, hound: 20, frog: 20, beetle: 30, viper: 12, boar: 4 },
    // The worn sword has a 破 sunder line no piece in the chest has, so every chest sword's
    // sheet must show it as +0.
    worn: { weapon: { ...piece('w-on', 'sword3', 'earth', 22), rolls: [{ affix: 'power', value: 22 }, { affix: 'sunder', value: 3 }] },
      robe: piece('r-on', 'robe3', 'mystic', 9, 'rate') },
    chest: [
      piece('c-junk1', 'sword2'), piece('c-junk2', 'leather2'), { ...piece('c-keep', 'sword4', 'earth', 30), rolls: [{ affix: 'power', value: 30 }, { affix: 'luck', value: 6 }, { affix: 'find', value: 2.4 }] },
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
    await b.click({ timeout: 3000 }).catch(() => {});   // inside 秘境 a notice sits under the room
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
  if (pc) {
    // 腦 rekaris could not find the school filters: on a computer a row cut at the edge
    // reads as a row that ends, so there the rows wrap and nothing hides past the edge.
    const hidden = await page.$$eval('.chestfilter', (rows) => rows.filter((r) => r.scrollWidth > r.clientWidth + 1).length);
    check(hidden === 0, `${tag}: no filter row hides chips past its edge (${hidden})`);
    const tip = await page.$eval('.chest .chestit [title]', (e) => e.getAttribute('title')).catch(() => '');
    check(/school$/.test(tip ?? ''), `${tag}: hovering a tile names it, its rank and its school ("${tip}")`);
  }
  await shot(page, `${tag}-gear`);

  // ── 譜 which piece is which school, one tap from the class ──────────────────────────
  // Raziel Morgenstern: "I have no idea which name is what class, apart from learning it by heart."
  const book = await page.$('.calling .cbook');
  check(!!book, `${tag}: the class has a button for which piece is which school`);
  if (book) {
    await page.$eval('.calling', (e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(150);
    await shot(page, `${tag}-bookbutton`);
    await book.click();
    await page.waitForSelector('.schoolbook', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const schools = await page.$$eval('.schoolbook .sb-school', (els) => els.length);
    const shapes = await page.$$eval('.schoolbook .sb-school figure:not(.sb-none)', (els) => els.length);
    check(schools === 6 && shapes === 54, `${tag}: six schools and all fifty-four shapes (${schools}, ${shapes})`);
    const worn = await page.$$eval('.schoolbook figure[data-worn] figcaption', (els) => els.map((e) => e.textContent));
    check(worn.length === 2 && worn.some((t) => /^Sword/.test(t ?? '')) && worn.some((t) => /^Robe/.test(t ?? '')),
      `${tag}: the two shapes worn say so (${worn.join(' | ')})`);
    const pairs = await page.$$eval('.schoolbook .sb-pair', (els) => els.length);
    check(pairs === 15, `${tag}: and the fifteen classes under them (${pairs})`);
    check(await overflow(page) <= 0, `${tag}: the page does not scroll sideways`);
    await shot(page, `${tag}-book`);
    // 篩 One school and one place: "which rings are Fortune?"
    await page.click('.schoolbook .sb-filter button:has-text("Fortune")');
    await page.click('.schoolbook .sb-filter button:has-text("Ring")');
    await page.waitForTimeout(250);
    const rings = await page.$$eval('.schoolbook .sb-school figure:not(.sb-none) figcaption', (els) =>
      els.map((e) => e.firstChild?.textContent?.trim()));
    const fpairs = await page.$$eval('.schoolbook .sb-pair', (els) => els.length);
    check(JSON.stringify(rings) === '["Amethyst","Emerald"]' && fpairs === 5,
      `${tag}: Fortune and Ring show the two Fortune rings and Fortune's five classes (${rings.join(', ')}; ${fpairs})`);
    check(await overflow(page) <= 0, `${tag}: the filtered page does not scroll sideways`);
    await page.$eval('.schoolbook', (e) => e.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await shot(page, `${tag}-bookfilter`);
    await page.click('.schoolbook .sb-filter button:has-text("Artificer")');
    await page.click('.schoolbook .sb-filter button:has-text("Weapon")');
    await page.waitForTimeout(200);
    const noWeapon = await page.$$eval('.schoolbook .sb-none figcaption', (els) => els.map((e) => e.firstChild?.textContent));
    check(noWeapon.length === 1 && /No weapon/.test(noWeapon[0] ?? ''), `${tag}: the Artificer says it has no weapon (${noWeapon.join('')})`);
    await page.click('.schoolbook .sb-filter button:has-text("Every school")');
    await page.click('.schoolbook .sb-filter button:has-text("Every place")');
    await page.waitForTimeout(200);
    if (tag !== 'p320') {
      await page.$eval('.schoolbook .sb-school:nth-of-type(3)', (e) => e.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(200);
      await shot(page, `${tag}-book2`);
      await page.$eval('.schoolbook .sb-pairs', (e) => e.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(200);
      await shot(page, `${tag}-book3`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check(!(await page.$('.schoolbook')), `${tag}: Esc closes it`);
  }

  // ── 示 a line the worn piece has and this one lacks reads +0 ─────────────────────────
  // rekaris: "Please consider adding even the 'absent' stats as '0' at the top."
  await page.click('.chest .chestit:has([title*="Sword · "]) >> nth=0').catch(() => {});
  await page.waitForTimeout(400);
  const none = await page.$$eval('.itemsheet .vline[data-none]', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check(none.some((t) => /\+0/.test(t)), `${tag}: a chest sword shows the worn sword's missing line as +0 (${none.join(' | ')})`);
  if (tag === 'p400' || pc) await shot(page, `${tag}-sheetzero`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

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
    // 名 rekaris: "being able to rename the loadout would be a nice addition."
    await page.click('.gset .gs-rename');
    await page.fill('.gset .gs-name', 'Boss killer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const renamed = await page.$eval('.gset .gs-wear b', (e) => e.textContent).catch(() => '');
    check(renamed === 'Boss killer', `${tag}: a loadout takes a name of the player's own ("${renamed}")`);
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
  const leaves = await page.$$eval('.bleaves em .term', (els) => els.slice(0, 3).map((e) => e.getAttribute('aria-label')));
  check(leaves.length > 0 && leaves.every((l) => /: (Sword|Qi|Fortune|Body|Artificer|Arts) school$/.test(l ?? '')),
    `${tag}: each piece a beast leaves names its school (${leaves.join(' | ')})`);
  // 精 rekaris: "My beasts are marked as 'finished' despite the new milestones."
  const deepOpen = await page.$$eval('.stack > .beast[data-done="false"] .marks em[data-deep]', (els) => els.length);
  check(deepOpen >= 2, `${tag}: a beast past 100 kills stays in the list, working toward 精 (${deepOpen} deep pips)`);
  const seal = await page.$('.bleaves .lsch .term');
  if (seal) {
    await seal.click();
    await page.waitForSelector('.termtip', { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(350);
    const said = await page.$eval('.termtip', (e) => e.textContent).catch(() => '');
    check(/school/.test(said ?? ''), `${tag}: a school seal on the hunt names its school ("${(said ?? '').slice(0, 60)}")`);
    if (tag !== 'p320') await shot(page, `${tag}-sealnote`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } else check(false, `${tag}: the hunt shows a school seal to tap`);
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
    await page.waitForTimeout(350);   // the note fades in; read it once it has
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

  // ── 鑄 forging the gear of any realm already reached ────────────────────────────────
  // rekaris: "I see no reason why I should not be able to craft lower-tier stuff."
  await page.fill('.cfilter input', '').catch(() => {});   // Go above left a search in it
  await page.click('.cgroups button:has-text("Gear")').catch(() => {});
  await page.waitForTimeout(250);
  const tiers = await page.$$eval('.ctier button', (els) => els.map((e) => e.textContent.trim()));
  check(tiers.length === 5 && tiers[0] === 'Now', `${tag}: the forge's gear list has Now and the four realms reached (${tiers.join(' | ')})`);
  await page.click('.ctier button:has-text("2")').catch(() => {});
  await page.waitForTimeout(250);
  const of2 = await page.$eval('.crafts p.faint:has-text("Showing the gear")', (e) => e.textContent).catch(() => '');
  const rows2 = await page.$$eval('.crecipes .crow', (els) => els.length);
  check(/realm 2\./.test(of2 ?? '') && rows2 > 0, `${tag}: realm 2 shows its own pieces (${rows2} rows, "${(of2 ?? '').slice(0, 34)}")`);
  check(await overflow(page) <= 0, `${tag}: the realm row does not push the screen sideways`);
  if (tag !== 'p320') { await page.$eval('.ctier', (e) => e.scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -70)); await page.waitForTimeout(150); await shot(page, `${tag}-forgerealms`); }
  // 鑄 Another craft and back again starts the realm row at Now, not at the realm left lit.
  await page.click('.cskill:not([data-shut="true"]) >> nth=0').catch(() => {});
  await page.waitForTimeout(200);
  if (forge) { await page.click('.cskill:has-text("Forg"), .cskill:has-text("鍛")').catch(() => {}); await page.waitForTimeout(250); }
  await page.click('.cgroups button:has-text("Gear")').catch(() => {});
  await page.waitForTimeout(200);
  const litTier = await page.$eval('.ctier button[aria-selected="true"]', (e) => e.textContent.trim()).catch(() => '');
  check(litTier === 'Now', `${tag}: switching craft and back puts the realm row back on Now ("${litTier}")`);

  // ── 改 the cards already taken, and trading one ─────────────────────────────────────
  // rekaris: "give the player the possibility to change any of their 'permanent' choices
  // at a very, very, very large cost."
  await tab(page, '修');
  const line = await page.$eval('.handline', (e) => e.textContent).catch(() => '');
  check(/Enlightenment · your 3 cards/.test(line ?? ''), `${tag}: the home screen says how many cards and that one can change ("${line}")`);
  if (tag === 'p400') { await page.$eval('.handline', (e) => e.scrollIntoView({ block: 'center' })).catch(() => {}); await page.waitForTimeout(200); await shot(page, `${tag}-handline`); }
  await page.click('.mainswitch');
  await page.waitForTimeout(200);
  await page.click('.switchmenu button:has-text("Your Enlightenment cards")');
  await page.waitForSelector('.cardbook', { timeout: 3000 }).catch(() => {});
  const held = await page.$$eval('.cardbook .cb-card', (els) => els.length);
  check(held === 3, `${tag}: the cards page lists the three cards taken (${held})`);
  const cardWas = await page.$eval('.cardbook .cb-card:last-of-type .cb-head b', (e) => e.textContent).catch(() => '');
  await page.click('.cardbook .cb-card:last-of-type .cb-change');
  await page.waitForTimeout(250);
  const alts = await page.$$eval('.cardbook .cb-alt', (els) => els.length);
  const cost = await page.$eval('.cardbook .cb-cost', (e) => e.textContent).catch(() => '');
  check(alts === 2 && /half a day of your qi/.test(cost ?? ''), `${tag}: Change offers the other two and the price ("${cost}")`);
  check(await overflow(page) <= 0, `${tag}: the cards page does not scroll sideways`);
  await shot(page, `${tag}-cards`);
  await page.click('.cardbook .cb-alt .act:not([disabled]) >> nth=0');
  await page.waitForTimeout(200);
  const asks = await page.$eval('.cardbook .cb-alt .act:not(.ghost)', (e) => e.textContent).catch(() => '');
  const unchanged = await page.$eval('.cardbook .cb-card:last-of-type .cb-head b', (e) => e.textContent).catch(() => '');
  check(/Tap again to pay/.test(asks ?? '') && unchanged === cardWas, `${tag}: the first tap only asks ("${asks}")`);
  if (tag !== 'p320') await shot(page, `${tag}-cards-sure`);
  await page.click('.cardbook .cb-alt .act:not(.ghost)');
  await page.waitForTimeout(400);
  const cardNow = await page.$eval('.cardbook .cb-card:last-of-type .cb-head b', (e) => e.textContent).catch(() => '');
  check(!!cardNow && cardNow !== cardWas, `${tag}: trading swaps the card ("${cardWas}" for "${cardNow}")`);
  await shot(page, `${tag}-cards-traded`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(!(await page.$('.cardbook')), `${tag}: Esc closes the cards page`);

  // ── PC: every effect of a piece is open without asking ──────────────────────────────
  if (pc) {
    await tab(page, '器');
    await page.click('.chest .chestit >> nth=0').catch(() => {});
    await page.waitForTimeout(400);
    const opened = await page.$eval('details.idetail', (d) => d.open).catch(() => false);
    check(opened, `${tag}: on a computer the sheet opens with every effect shown`);
    const top = await page.$$eval('.itemsheet .verdict .vline', (els) => els.length);
    check(top >= 1, `${tag}: every line of the piece sits at the top beside power and qi (${top})`);
    await shot(page, `${tag}-sheet`);
  } else {
    await tab(page, '器');
    await page.click('.chest .chestit >> nth=0').catch(() => {});
    await page.waitForTimeout(400);
    const opened = await page.$eval('details.idetail', (d) => d.open).catch(() => true);
    check(!opened, `${tag}: on a phone the details stay folded, as before`);
    const top = await page.$$eval('.itemsheet .verdict .vline', (els) => els.length);
    check(top >= 1, `${tag}: and the lines of the piece are at the top anyway (${top})`);
    if (tag === 'p400') await shot(page, `${tag}-sheettop`);
  }
  await page.close();
}

// ── 審 The audit of 2026-10-03: what a new player, a phone and a reader of English met ──
// Each of these was found by playing the build and photographing it; each check is the
// picture's complaint turned into a question the screen has to answer.
const clearAll = async (page) => {
  for (let i = 0; i < 24; i++) {
    const card = await page.$('.awaken .acard');
    if (card) { await card.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); continue; }
    const who = await page.$('.whom .pick');
    if (who) { await who.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(220); continue; }
    const el = await page.$('.prologue button.act, .help button.act, .notice button, .scrim, .back button.act');
    if (!el) break;
    await el.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(220);
  }
  // A notice's button can change the tab; come back to 修. Inside 秘境 the tabs are covered.
  await page.click('nav.tabs button:has-text("修")', { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(300);
};
const menuTo = async (page, label) => {
  await page.click('button.mainswitch');
  await page.waitForTimeout(250);
  await page.click(`.switchmenu button:has-text("${label}")`);
  await page.waitForTimeout(400);
};
const HAN = /[㐀-鿿]/;
const now = () => Math.floor(Date.now() / 1000);

// 囊 The opening purse is still there when the guide asks the player to spend it.
{
  const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button, .prologue', { timeout: 15000 });
  await page.waitForTimeout(600);
  await clearAll(page);
  await page.waitForTimeout(12000);   // twice as long as the purse needs to reach the rung
  const qi = Number((await page.textContent('.qi .n')).replace(/[^0-9.]/g, ''));
  const layer = await page.$eval('.ladder', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
  const pace = await page.textContent('.pace').catch(() => '');
  check(qi >= 56 && /layer 1\/9/.test(layer), `fresh: after twelve seconds the purse is whole and the first layer waits (${qi} qi, ${layer.slice(0, 32)})`);
  check(/waits until you spend/.test(pace ?? ''), `fresh: the bar says the layer is waiting ("${pace}")`);
  const box = await page.$('[data-coach^="upg-"]:not([disabled])');
  check(!!box, 'fresh: the box the arrow points at can be bought');
  if (box) { await box.click(); await page.waitForTimeout(1200); }
  const step = await page.textContent('.guide .n').catch(() => '');
  check(!/Step 1 of/i.test(step ?? ''), `fresh: buying it finishes the first step ("${step}")`);
  await shot(page, 'fresh-purse');
  await page.close();
}

for (const [w, h, tag] of [[400, 860, 'p400'], [320, 640, 'p320']]) {
  // 勢 The arts on the Path name themselves in English, in the slots and on the spare chips.
  const page = await open(w, h, { killed: { rat: 150, hound: 20, frog: 20, fox: 1, ape: 1, crane: 1 }, sequence: ['crane'] });
  await clearAll(page);
  await tab(page, '道');
  await page.click('button:has-text("Stance")').catch(() => {});
  await page.waitForTimeout(300);
  const slotName = await page.$eval('.seq .slot[data-filled="true"] .lo-name', (e) => e.textContent).catch(() => '');
  const spare = await page.$$eval('.pool .pick', (els) => els.map((e) => e.querySelector('.lo-name')?.textContent ?? ''));
  check(/[A-Za-z]{3}/.test(slotName ?? '') && spare.length >= 1 && spare.every((t) => /[A-Za-z]{3}/.test(t)),
    `${tag}: every art in the sequence and the spares carries its English name ("${slotName}"; ${spare.join(', ')})`);
  check(await overflow(page) <= 0, `${tag}: the arts do not push the screen sideways`);

  // 日 The day is never cut short.
  await tab(page, '修');
  const day = await page.$eval('.c-hero .c-title', (e) => ({ text: e.textContent, cut: e.scrollWidth > e.clientWidth + 1 })).catch(() => null);
  check(!!day && !day.cut && /day 31/i.test(day.text ?? ''), `${tag}: the day reads in full ("${day?.text}")`);

  // 頂 Nothing scrolls half under ≡: once a screen is scrolled, a strip backs the corner.
  for (const t of ['修', '狩', '器', '業', '道']) {
    await tab(page, t);
    const tall = await page.$eval('.sheet', (e) => e.scrollHeight - e.clientHeight);
    if (tall < 80) continue;
    const top = await page.$eval('.topband', (e) => e.dataset.on).catch(() => 'missing');
    await page.$eval('.sheet', (e) => e.scrollTo(0, 240));
    await page.waitForTimeout(300);
    const backed = await page.evaluate(() => {
      const band = document.querySelector('.topband');
      const btn = document.querySelector('button.mainswitch');
      if (!band || !btn) return false;
      const b = band.getBoundingClientRect(); const m = btn.getBoundingClientRect();
      return band.dataset.on === 'true' && getComputedStyle(band).opacity === '1'
        && b.left <= 0 && b.right >= innerWidth - 1 && b.bottom >= m.bottom;
    });
    check(top === 'false' && backed, `${tag} ${t}: at the top no strip; scrolled, a solid strip backs ≡ across the screen`);
  }

  // 藏 The melt's rank chips each say their rank.
  await tab(page, '器');
  const ranks = await page.$$eval('.melting .rk .rk-name', (els) => els.map((e) => e.textContent));
  check(ranks.join() === 'Common,Spirit,Mystic,Earth,Heaven', `${tag}: every rank chip carries its English name (${ranks.join(', ')})`);
  // 數 Power from gear to two places under ×2, beside the per cent it means.
  const lift = await page.$eval('.lift .lp b', (e) => e.textContent).catch(() => '');
  check(/^×(\d\.\d\d|[2-9]\.\d|\d{2,})$/.test(lift ?? ''), `${tag}: the gear's power reads like its per cent ("${lift}")`);
  if (tag === 'p400') await shot(page, `${tag}-audit-gear`);

  // 碑 The stele has the fixed ✕, Esc closes it, and its tiles are named in English.
  await tab(page, '修');
  await menuTo(page, 'stele');
  check(!!(await page.$('.stelepage')) && !!(await page.$('.escape')), `${tag}: the stele has the fixed cross`);
  const figs = await page.$$eval('.figures .fig', (els) => els.map((e) => ({ v: e.querySelector('em')?.textContent ?? '', l: e.querySelector('i')?.textContent ?? '' })));
  check(figs.length > 10 && figs.every((f) => !HAN.test(f.v) && /[A-Za-z]{3}/.test(f.l)),
    `${tag}: no stele figure is characters alone (${figs.filter((f) => HAN.test(f.v)).map((f) => f.v).join(', ') || 'none'})`);
  const realmTile = figs.find((f) => /^realm/.test(f.l));
  check(/Nascent Soul/.test(realmTile?.l ?? ''), `${tag}: the realm tile names the realm in English ("${realmTile?.l}")`);
  const clear = await page.$eval('.stelepage > .row:first-child > :last-child', (e) => {
    const r = e.getBoundingClientRect(); const x = document.querySelector('.escape')?.getBoundingClientRect();
    return !x || r.right <= x.left || r.top >= x.bottom;
  }).catch(() => false);
  check(clear, `${tag}: the stele's count is not under the cross`);
  if (tag === 'p400') await shot(page, `${tag}-audit-stele`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(!(await page.$('.stelepage')), `${tag}: Esc closes the stele`);
  await menuTo(page, 'redits');
  check(!!(await page.$('.credits')) && !!(await page.$('.escape')), `${tag}: the credits have the fixed cross`);
  await page.click('.escape');
  await page.waitForTimeout(300);
  check(!(await page.$('.credits')), `${tag}: the cross closes the credits`);

  // 存 The save panel does not say there is no account beside a screen offering one.
  await menuTo(page, 'save');
  const says = await page.textContent('.help .says').catch(() => '');
  check(!/no account/i.test(says ?? '') && /Ranks/.test(says ?? '') && /six-digit code/.test(says ?? ''),
    `${tag}: the save panel tells a guest how a cloud copy is had ("${(says ?? '').slice(0, 60)}...")`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // 悟道 The trade's price reads right for the newest card.
  await page.click('button.mainswitch');
  await page.waitForTimeout(200);
  await page.click('.switchmenu button:has-text("Your Enlightenment cards")');
  await page.waitForTimeout(350);
  const blurb = await page.textContent('.cardbook').catch(() => '');
  check(/half a day more for each card further back/.test(blurb ?? '') && !/taken after it/.test(blurb ?? ''),
    `${tag}: the cards page prices older cards as further back`);
  await page.close();
}

// 守 塔 A warden standing is named on the bar, and a tower floor out of reach says how far.
{
  const page = await open(400, 860, { realm: 8, layer: 8, qi: 5e12, tower: 75, startedAt: now() - 120 * 86400,
    levels: { technique: 10, method: 30, pills: 30, cores: 10 },
    killed: { rat: 150, hound: 20, frog: 20, fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1 },
    awakened: ['feast', 'wolf', 'luckystar', 'slaughter', 'platform', 'hoard', 'dew'] });
  await clearAll(page);
  const pace = await page.textContent('.pace').catch(() => '');
  check(/The warden .+ is waiting/.test(pace ?? '') && !/0 qi to go/.test(pace ?? ''), `late: the bar names the warden waiting ("${pace}")`);
  await tab(page, '塔');
  const tower = await page.$eval('.card .tech', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
  check(/^×[\d.]+[kMBT]? ?stronger/i.test(tower.trim()), `late: an unwinnable tower floor says how much stronger it is ("${tower}")`);
  await shot(page, 'p400-audit-tower');
  await page.close();
}

// 劫 碑 The top of the climb: the crossings made and the next one named, and one heaven on both pages.
{
  const page = await open(400, 860, { realm: 9, layer: 8, qi: 1e15, tribulation: 2, tribulationAt: now() - 3 * 86400,
    killed: { rat: 150, hound: 20, frog: 20, fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought'] });
  await clearAll(page);
  const hero = await page.textContent('.c-hero').catch(() => '');
  const head = await page.textContent('.c-side h2.heading').catch(() => '');
  check(/2 tribulations crossed · 2 marks/.test(hero ?? '') && /Tribulation 3 · the next crossing/.test(head ?? ''),
    `top: the crossings made and the next one are both named ("${head}")`);
  await menuTo(page, 'stele');
  const stele = await page.textContent('.stele .said').catch(() => '');
  check(/standing in True Immortal/.test(stele ?? ''), `top: the stele stands in the same heaven ("${(stele ?? '').slice(0, 60)}")`);
  await page.close();
}

// 期 The week's room on the secret realm's path is named in words.
{
  const page = await open(400, 860, { runStep: 0, runAt: now() - 12 * 3600 });
  const week = await page.textContent('.secret .pathweek').catch(() => '');
  check(/Room \d of \d pays double this week/.test(week ?? ''), `secret: the path names the week's room ("${week}")`);
  await page.close();
}

await browser.close();
console.log(problems.length ? `\n鎖 ${problems.length} broken: ${problems.join('; ')}\n`
  : '\n鎖 kept, found and ordered as asked, on a phone and on a computer.\n');
process.exitCode = problems.length ? 1 : 0;
