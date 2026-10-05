/**
 * 業 The workshop played, not only looked at: the real build, driven through the things a
 * player does with it, each checked on the screen the player reads.
 *
 *     npm run build && npm run preview &
 *     node tools/workshop-play.mjs
 *
 *   攜 a warden fought with an elixir and a sigil carried, won and lost: the arena says
 *      what was carried in, a win spends one of each and a loss keeps them;
 *   符 a Purity Sigil carried beside the elixir does nothing to a warden and is not spent;
 *   尋 a sure drop waiting from a Seeking Sigil: a hunt won leaves a piece, a loss keeps it;
 *   歸 hours away: the homecoming card says what the workshop made.
 *
 * smoke.mjs asks whether every tap lands. This asks whether what the tap did was right.
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';

// 圖 SHOTS=dir keeps a picture of the arena at each step, for the report that shows it.
const SHOTS = process.env.SHOTS;
const problems = [];
const fail = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  ✗ ${where}  ${what}`); };
const pass = (what) => console.log(`  ✓ ${what}`);

const XP = [0, 0];
{ let p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * 2 ** (l / 7)); XP[l + 1] = Math.floor(p / 4); } }
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'] };

/**
 * A sixth-realm cultivator at the top of the realm, so the warden is waiting, with a kit
 * in the pouch. `strong` sets whether the fight can be won: every level at the realm's
 * cap and the best set of the realm worn, or nothing at all.
 */
function cultivator({ strong, crafts, away = 0 }) {
  const realm = 6;
  const at = Math.floor(Date.now() / 1000) - away;
  const cap = strong ? realm * 6 : 0;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r]) killed[k] = 40;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const xp = {};
  for (const [k, l] of Object.entries({ herb: 60, vein: 60, render: 60, forge: 60, alchemy: 70, sigil: 60 })) xp[k] = XP[l] + 10;
  const piece = (slot, template) => ({ id: slot, template, rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }, { affix: 'power', value: 40 }] });
  return {
    v: 1, at, startedAt: at - 60 * 86400, realm, layer: 8, qi: 10 ** (realm + 3), materials: 10 ** (realm + 3),
    wardenFell: false, levels: { technique: cap, method: cap, pills: cap, cores: cap }, killed,
    worn: strong ? { weapon: piece('weapon', 'sword6'), robe: piece('robe', 'robe6'), ring: piece('ring', 'plainring6') } : {},
    chest: [], self: 'woman', stance: strong ? 'swift' : null, sequence: strong ? ['crane', 'tiger'] : [],
    tribulation: 0, tribulationAt: 0, tower: 60, brewed: { body: 0, bane: 0, fortune: 0 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom'],
    crafts: { xp, task: null, since: at, made: {}, tools: {}, arrays: [], seek: 0, carry: { elixir: null, sigil: null }, pouch: {}, ...crafts },
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(save) {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  page.on('pageerror', (e) => fail('page', e.message));
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  return page;
}

async function clear(page, keepHome = false) {
  for (let i = 0; i < 8; i++) {
    const b = await page.$(keepHome ? '.notice button, .awaken button' : '.notice button, .awaken button, .back button.act');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function tab(page, han) {
  await clear(page);
  await page.click(`nav.tabs button:has-text("${han}")`);
  await page.waitForTimeout(500);
  await clear(page);
}

/** The carry card's two hands, as the player reads them. */
async function hands(page) {
  await tab(page, '業');
  return page.$eval('.crafts .ccarry', (e) => e.textContent ?? '');
}

/** Fight until the verdict, and return what it says. */
async function verdict(page, tag) {
  await page.waitForSelector('.verdict', { timeout: 90000 });
  await page.waitForTimeout(900);
  if (SHOTS && tag) await page.screenshot({ path: `${SHOTS}/verdict-${tag}.png` });
  const text = await page.$eval('.verdict', (e) => e.textContent ?? '');
  const won = await page.$eval('.verdict .han', (e) => getComputedStyle(e).color.includes('143') || e.getAttribute('style')?.includes('jade'));
  await page.click('.verdict button.act');
  await page.waitForTimeout(500);
  return { text, won };
}

async function warden(strong, sigil) {
  const where = `warden, ${strong ? 'strong' : 'weak'}${sigil === 'sigil:purity@1' ? ', Purity carried' : ''}`;
  const page = await open(cultivator({ strong, crafts: {
    pouch: { 'might6@2': 3, 'sigil:warding@1': 3, 'sigil:purity@1': 2 },
    carry: { elixir: 'might6@2', sigil },
  } }));
  await clear(page);
  await tab(page, '修');
  const go = await page.$('[data-coach="fight-warden"]');
  if (!go) { fail(where, 'the warden card is not there'); await page.close(); return; }
  await go.click();
  const chip = await page.waitForSelector('.kitchip', { timeout: 5000 }).then((e) => e.textContent()).catch(() => '');
  const tag = `${strong ? 'strong' : 'weak'}${sigil === 'sigil:purity@1' ? '-purity' : ''}`;
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fight-${tag}.png` });
  if (!chip.includes('Carried in')) fail(where, 'the arena does not say what was carried in');
  const v = await verdict(page, tag);
  // 空 Each run is there for one branch: a strong cultivator that lost would pass the loss's
  // checks, and the win would go unmeasured without a word.
  if (v.won !== strong) fail(where, `${strong ? 'lost' : 'won'}, so the ${strong ? 'win' : 'loss'} this run is for was never checked`);
  const after = await hands(page);
  const elixirs = Number(/Scorpion-Tail Pill ×(\d+)/.exec(after)?.[1]);
  const said = v.text.includes('spent') ? 'spent' : v.text.includes('kept') ? 'kept' : 'nothing';
  if (v.won) {
    if (said !== 'spent') fail(where, `a win, and the arena says "${said}" about the kit`);
    if (elixirs !== 2) fail(where, `a win should leave 2 elixirs, the carry card shows ${elixirs}`);
  } else {
    if (said !== 'kept') fail(where, `a loss, and the arena says "${said}" about the kit`);
    if (!v.text.includes('Losing costs nothing')) fail(where, 'a loss that does not say it cost nothing');
    if (elixirs !== 3) fail(where, `a loss should keep 3 elixirs, the carry card shows ${elixirs}`);
  }
  if (sigil === 'sigil:purity@1') {
    const purity = Number(/Purity Sigil ×(\d+)/.exec(after)?.[1]);
    if (purity !== 2) fail(where, `the Purity Sigil does nothing to a warden and was spent: ×${purity}`);
    if (v.text.includes('Purity')) fail(where, 'the arena names the Purity Sigil as carried into a warden');
  }
  pass(`${where}: ${v.won ? 'won' : 'lost'}, the arena says the kit was ${said}, the carry card agrees`);
  await page.close();
}

await warden(true, 'sigil:warding@1');
await warden(false, 'sigil:warding@1');
await warden(true, 'sigil:purity@1');

// 尋 A sure drop waiting: a common beaten on the hunt leaves a piece and spends it.
{
  const where = 'seek';
  const page = await open(cultivator({ strong: true, crafts: { seek: 1 } }));
  await clear(page);
  const before = await hands(page);
  if (!before.includes('1 sure drop')) fail(where, 'the carry card does not show the sure drop waiting');
  await tab(page, '狩');
  const row = await page.$('button.beast');
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  await page.mouse.click(box.x + box.width - 10, box.y + box.height / 2);
  await page.waitForTimeout(600);
  await page.waitForSelector('.verdict', { timeout: 90000 });
  await page.waitForTimeout(400);
  const text = await page.$eval('.verdict', (e) => e.textContent ?? '');
  const won = !text.includes('still waits');
  const piece = await page.$('.verdict .drop, .verdict .gear, .verdict img, .verdict svg');
  await page.click('.verdict button.act');
  await page.waitForTimeout(500);
  const after = await hands(page);
  // A win always leaves a piece. The sure drop is spent only when the piece would not have
  // fallen by itself (造化, a fate bar come due), so either way is right as long as a piece fell.
  const kept = after.includes('1 sure drop');
  if (!won) fail(where, 'a strong cultivator lost to a common, so the sure drop was never put to a win');
  if (won && !piece) fail(where, 'a win with a sure drop waiting showed no piece');
  if (!won && !kept) fail(where, 'a loss spent the sure drop');
  pass(`seek: ${!won ? 'lost, the sure drop still waits'
    : kept ? 'won, the piece fell by itself and the sure drop still waits' : 'won, the sure drop made the piece and is spent'}`);
  await page.close();
}

// 歸 Five hours away with the workshop on Spirit Moss: the homecoming card says so.
{
  const where = 'homecoming';
  const away = 5 * 3600;
  const page = await open(cultivator({ strong: true, away, crafts: { task: 'herb:moss', since: Math.floor(Date.now() / 1000) - away } }));
  await clear(page, true);
  const card = await page.$eval('.back', (e) => e.textContent ?? '').catch(() => '');
  const n = Number(/made ([\d,]+) × Spirit Moss/.exec(card)?.[1]?.replace(/,/g, ''));
  if (!n) fail(where, `the homecoming card does not say what the workshop made: "${card.slice(0, 160)}"`);
  else if (n < 2000 || n > 3700) fail(where, `five hours of Spirit Moss at 5 to 6 seconds each made ${n}`);
  else pass(`homecoming: five hours away, the card says the workshop made ${n} × Spirit Moss`);
  await page.close();
}

await browser.close();
console.log(problems.length ? `\n業 ${problems.length} problem(s) in the workshop.\n` : '\n業 the workshop does what it says, on the screen that says it.\n');
process.exitCode = problems.length ? 1 : 0;
