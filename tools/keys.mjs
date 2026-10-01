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

function cultivator() {
  const at = Math.floor(Date.now() / 1000);
  return {
    v: 1, at, startedAt: at - 30 * 86400,
    realm: 3, layer: 3, qi: 1e5, materials: 1e4, wardenFell: false,
    levels: { technique: 18, method: 18, pills: 18, cores: 12 },
    killed: { rat: 3, hound: 2, frog: 2, beetle: 2 },
    worn: { weapon: { id: 'w', template: 'sword3', rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: [], tribulation: 0, tribulationAt: 0, tower: 0,
    brewed: { body: 0, bane: 0, fortune: 0 }, awakened: ['feast', 'wolf'],
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage',
      'fuse', 'whom', 'workshop'],
  };
}

const problems = [];
const check = (ok, said) => { console.log(`${ok ? '✓' : '✗'} ${said}`); if (!ok) problems.push(said); };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, cultivator()]);
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
  await page.waitForTimeout(500);
  check(!!(await page.$('.arena')) && !(await page.$('.verdict')), 'R collects and starts the same beast again');
  await page.click('.arena');
  await page.waitForSelector('.verdict', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('.verdict')), 'a tap on the stage jumps to the verdict');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  check(!(await page.$('.arena')), 'Enter collects and the arena closes');

  const after = await count();
  check(after === before + 2, `both kills are in the record (${before} then ${after})`);

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

await browser.close();
console.log(problems.length ? `\n鍵 ${problems.length} broken: ${problems.join('; ')}\n`
  : '\n鍵 every key does what its button does, and the mouse is answered where it rests.\n');
process.exitCode = problems.length ? 1 : 0;
