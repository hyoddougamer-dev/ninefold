/**
 * 鍵 The keyboard and the mouse, played on the real build.
 *
 * rekaris, on the Discord (2026-10-01): *"I have to click on the fight, then move mouse on
 * collect, then move back to fight. Adding a shortcut like esc would help as well."* And
 * on the characters: *"hovering it in that place does not say anything."* Each of those is
 * a promise the game now makes, and each is checked here by doing it:
 *
 *   Space mid-fight skips to the verdict, and so does a tap on the stage;
 *   Enter collects, and the kill is in the save;
 *   R collects and fights the same beast again, and both kills are in the save;
 *   Esc closes a window; 1 to 7 change tab;
 *   on a computer a click beside the arena collects, rather than landing on the hunt list;
 *   and a pointer resting on a character opens its note.
 *
 *     npm run build && npm run preview &
 *     node tools/keys.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';

function cultivator(over = {}) {
  const at = Math.floor(Date.now() / 1000);
  return {
    v: 1, at, startedAt: at - 30 * 86400,
    realm: 3, layer: 3, qi: 1e5, materials: 1e4, wardenFell: false,
    levels: { technique: 18, method: 18, pills: 18, cores: 12 },
    killed: { rat: 3, hound: 2, frog: 2, beetle: 12 },
    worn: { weapon: { id: 'w', template: 'sword3', rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: [], tribulation: 0, tribulationAt: 0, tower: 0,
    brewed: { body: 0, bane: 0, fortune: 0 }, awakened: ['feast', 'wolf'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage',
      'fuse', 'whom', 'workshop'],
    ...over,
  };
}

const problems = [];
const check = (ok, said) => { console.log(`${ok ? '✓' : '✗'} ${said}`); if (!ok) problems.push(said); };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width, height, over = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, cultivator(over)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(600);
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken .acard');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  return page;
}

async function fightFirst(page) {
  await page.click('nav.tabs button:has-text("狩")');
  await page.waitForTimeout(400);
  const row = await page.$('[data-coach="beast-first"]') ?? (await page.$$('button.beast'))[0];
  const box = await row.boundingBox();
  await page.mouse.click(box.x + box.width - 12, box.y + box.height / 2);
  await page.waitForSelector('.arena', { timeout: 4000 });
}

// ── a phone: keys and taps ─────────────────────────────────────────────────
{
  const page = await open(400, 860);
  // 錄 The first row's own count, "2 / 10 toward Known", read before and after.
  const count = async () => Number(((await page.$eval('[data-coach="beast-first"], button.beast',
    (e) => e.textContent).catch(() => '')) ?? '').match(/(\d+) \/ \d+ toward/)?.[1] ?? NaN);
  await page.click('nav.tabs button:has-text("狩")');
  await page.waitForTimeout(400);
  const before = await count();

  await fightFirst(page);
  const t0 = Date.now();
  await page.keyboard.press('Space');
  await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('.verdict')) && Date.now() - t0 < 1500, 'Space mid-fight jumps to the verdict');

  const name = await page.$eval('.who.r .en', (e) => e.textContent).catch(() => '');
  check(/[A-Za-z]{3,}/.test(name ?? ''), `the beast is named in English in the arena ("${name}")`);
  const gain = await page.$eval('.verdict .gains', (e) => e.textContent).catch(() => '');
  check(/material/.test(gain ?? ''), `the verdict says what the 材 is ("${(gain ?? '').trim()}")`);

  await page.keyboard.press('r');
  // 擊 The next fight waits for the hand's pace (1.5 s from the last start), not longer.
  await page.waitForFunction(() => !!document.querySelector('.arena') && !document.querySelector('.verdict'),
    null, { timeout: 2500 }).catch(() => {});
  check(!!(await page.$('.arena')) && !(await page.$('.verdict')), 'R collects and starts the same beast again');
  await page.click('.arena');
  await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('.verdict')), 'a tap on the stage jumps to the verdict');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  check(!(await page.$('.arena')), 'Enter collects and the arena closes');

  const after = await count();
  check(after === before + 2, `both kills are in the record (${before} then ${after})`);

  // 自 The auto-hunt: started with A from a won verdict, paced, counted, stopped by Esc.
  await fightFirst(page);
  await page.click('.arena');
  await page.waitForSelector('.verdict .vacts .auto', { timeout: 3000 }).catch(() => {});
  const a0 = Date.now();
  await page.keyboard.press('a');
  await page.waitForSelector('.autobar', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('.autobar')), 'A starts the auto-hunt and the arena says so');
  await page.waitForTimeout(9000);
  const tally = await page.$eval('.autobar i', (e) => e.textContent).catch(() => '');
  const ran = Number(tally?.match(/^(\d+)/)?.[1] ?? 0);
  const secs = (Date.now() - a0) / 1000;
  check(ran >= 4, `it keeps fighting on its own (${ran} kills in ${secs.toFixed(1)} s)`);
  // The server allows one fight per 1.2 s before it counts kills as bought.
  check(ran <= secs / 1.2 + 1, `and never faster than a hand (${(secs / Math.max(1, ran)).toFixed(2)} s a kill)`);
  check(/material/.test(tally ?? ''), `the tally names what it made ("${tally}")`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(!(await page.$('.autobar')), 'Esc stops it');
  await page.waitForTimeout(400);
  if (await page.$('.verdict')) await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  const done = await count();
  await page.waitForTimeout(3000);
  check(await count() === done && !(await page.$('.arena')), 'and nothing more is fought once it stops');
  check(done - after >= ran, `every kill it counted is in the record (${after} then ${done}, ${ran} counted)`);

  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  check(await page.getAttribute('.sheet', 'data-screen') === 'cultivate', '1 opens 修 Cultivate');
  await page.keyboard.press('2');
  await page.waitForTimeout(300);
  check(await page.getAttribute('.sheet', 'data-screen') === 'hunt', '2 opens 狩 Hunt');

  await page.keyboard.press('7');
  await page.waitForTimeout(400);
  const opened = await page.getAttribute('.ranktab', 'data-on');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(opened === 'true' && await page.getAttribute('.ranktab', 'data-on') === 'false',
    '7 opens 榜 the rankings and Esc closes them');
  await page.close();
}

// ── a computer: the click beside the window, and the pointer that rests ──────
{
  const page = await open(1280, 800);
  await fightFirst(page);
  await page.mouse.click(60, 400);   // beside the window, on the rail's side of the screen
  await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('.verdict')), 'a click beside the arena skips to the verdict');
  const kbd = await page.$eval('.verdict .vacts kbd', (e) => getComputedStyle(e).display).catch(() => 'none');
  check(kbd !== 'none', 'the keys are printed on the buttons where there is a keyboard');
  await page.mouse.click(1240, 760);
  await page.waitForTimeout(400);
  check(!(await page.$('.arena')), 'a click beside the verdict collects, and nothing underneath was pressed');

  // 位 A worn piece grows where it is when the pointer rests on it, and stays put.
  await page.keyboard.press('4');
  await page.waitForTimeout(400);
  const orb = await page.$('.orb');
  if (orb) {
    const a = await orb.boundingBox();
    await orb.hover();
    await page.waitForTimeout(300);
    const b = await orb.boundingBox();
    const moved = Math.hypot(a.x + a.width / 2 - (b.x + b.width / 2), a.y + a.height / 2 - (b.y + b.height / 2));
    check(moved < 6, `a worn piece stays under the pointer on hover (its centre moved ${moved.toFixed(1)}px)`);
  } else check(false, 'there was a worn piece on the gear screen to hover');
  await page.keyboard.press('2');
  await page.waitForTimeout(400);

  const term = await page.$('.sheet .term');
  if (term) {
    await term.hover();
    await page.waitForTimeout(250);
    check(!!(await page.$('.termtip')), 'a pointer resting on a character opens its note');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(250);
    check(!(await page.$('.termtip')), 'and the note goes when the pointer does');
  } else check(false, 'there was a character with a note on the hunt screen to hover');

  await page.close();
}

// ── 盡 Max: one tap buys what the qi will pay for ─────────────────────────────
{
  const page = await open(400, 860, { qi: 1e12, levels: { technique: 12, method: 12, pills: 12, cores: 12 } });
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  const lvl = async () => (await page.$eval('[data-coach="upg-technique"] .lvl', (e) => e.textContent).catch(() => ''))
    .match(/(\d+) of (\d+)/)?.slice(1).map(Number) ?? [NaN, NaN];
  await page.click('.buymode button:has-text("Max")');
  await page.waitForTimeout(200);
  const [had, cap] = await lvl();
  await page.click('[data-coach="upg-technique"]');
  await page.waitForTimeout(300);
  const [has] = await lvl();
  check(had < cap && has === cap, `Max buys to the ceiling in one tap (${had} then ${has} of ${cap})`);
  await page.reload();
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(500);
  const on = await page.getAttribute('.buymode button:has-text("Max")', 'data-on').catch(() => null);
  check(on === 'true', 'and the choice is still Max after a reload');
  await page.close();
}

// ── 熟 Auto opens per beast once it is Known ────────────────────────────────
{
  const page = await open(400, 860, { killed: { rat: 3, hound: 2, frog: 2, beetle: 3 } });
  await fightFirst(page);
  await page.click('.arena');
  await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  const said = await page.$eval('.verdict', (e) => e.textContent).catch(() => '');
  check(!(await page.$('.verdict .vacts .auto')) && /Auto opens once the .+ is Known: 6 more kills/.test(said ?? ''),
    'a beast killed four times has no Auto yet, and the verdict says six more');
  await page.close();
}

// ── 泉 擂 The vault's third door, and the next challenger on R ─────────────────────
{
  const at = Math.floor(Date.now() / 1000);
  const page = await open(400, 860, {
    realm: 5, layer: 4, levels: { technique: 40, method: 30, pills: 30, cores: 40 }, stance: 'endure',
    sequence: ['crane', 'tiger'], awakened: ['feast', 'wolf', 'slaughter', 'platform'],
    killed: { rat: 150, hound: 20, frog: 20, beetle: 30, boar: 4, fox: 1, ape: 1, crane: 1, tiger: 1 },
    runStep: 2, runAt: at - 86400, runs: 3, spring: 0.9 * 86400, springAt: at,
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage',
      'fuse', 'whom', 'workshop', 'platform', 'seclusion', 'cap', 'secret', 'cave', 'record', 'cores'],
  });
  await page.waitForSelector('.secret .ways .way');
  const third = await page.$$eval('.secret .ways .way', (els) => els[2]?.getAttribute('data-kind') ?? null);
  await page.keyboard.press('3');
  await page.waitForTimeout(300);
  const took = await page.$eval('.secret .sofar b', (e) => e.textContent).catch(() => '');
  const over = await page.$eval('.secret .over', (e) => e.textContent).catch(() => '');
  check(!!third && /Room 4 of 7/.test(over ?? ''), `3 takes the vault's third door (${third}: ${took})`);
  await page.click('.secret .later');
  await page.waitForSelector('.runend', { timeout: 3000 }).catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(!(await page.$('.runend')), 'Esc closes the end of the run');

  await page.click('nav.tabs button:has-text("塔")');
  await page.waitForSelector('.platcard .plgo');
  await page.click('.platcard .plgo');
  await page.waitForSelector('.arena', { timeout: 4000 }).catch(() => {});
  await page.keyboard.press('Space');
  await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  // 空 Won or lost, each branch checks something; a challenger never fought would have
  // passed the lost one, which asks only that a button is absent.
  const fought = !!(await page.$('.verdict'));
  check(fought, 'the Platform\'s first challenger is fought to a verdict');
  const won = (await page.$eval('.arena', (e) => e.getAttribute('data-won')).catch(() => null)) === 'true';
  if (fought && won) {
    await page.keyboard.press('r');
    await page.waitForFunction(() => !!document.querySelector('.arena') && !document.querySelector('.verdict'),
      null, { timeout: 2500 }).catch(() => {});
    const who = await page.$eval('.who.r .en', (e) => e.textContent).catch(() => '');
    check(/Second challenger/.test(who ?? ''), `R after a won challenger fights the second one (${who})`);
    await page.keyboard.press('Space');
    await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  } else if (fought) check(!(await page.$('.verdict .vacts .again')), 'a lost challenger offers no Again for R to press');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(!(await page.$('.arena')), 'Esc leaves a challenger\'s verdict');
  await page.close();
}

await browser.close();
console.log(problems.length ? `\n鍵 ${problems.length} broken: ${problems.join('; ')}\n`
  : '\n鍵 every key does what its button does, and the mouse is answered where it rests.\n');
process.exitCode = problems.length ? 1 : 0;
