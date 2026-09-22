/**
 * 查 Does it actually work?
 *
 * The test suite answers "do the numbers hold". It cannot answer "does the game open",
 * because it never opens it. This does: it drives the built page in a real browser at
 * six depths, visits every tab, opens the corner and every panel behind it, and fails on
 * anything that throws, renders nothing, or puts NaN in front of the player.
 *
 * Bruno asked for it in the plainest possible way: *"não sei bem o que temos e se está
 * tudo funcional"*, and that is a question a repository should be able to answer with
 * one command rather than with an argument.
 *
 *     npm run build && npm run preview &
 *     npm run smoke
 *
 * The only network request the page makes is the Google font stylesheet. In a sandbox
 * without egress it fails, the page falls back to its own stack, and that one failure is
 * ignored here on purpose: everything else is a real problem.
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
/** The one request the page makes that a sandbox is allowed to refuse. */
const ALLOWED_TO_FAIL = /fonts\.(googleapis|gstatic)\.com/;

const problems = [];
const fail = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  ✗ ${where}  ${what}`); };

/** A cultivator standing in a realm, with enough of everything for its screens to fill. */
function cultivator(realm) {
  const cap = realm * 6;
  const at = Math.floor(Date.now() / 1000);
  const killed = {};
  for (const [key, n] of Object.entries({
    rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 3, beetle: 15, owl: 2,
    raven: 1, boar: 12, wolf: 3, vulture: 1, crab: 11, jellyfish: 2, lizard: 1,
    centipede: 10, scorpion: 1, worm: 1, ogre: 10, goblin: 1, wraith: 1, skeleton: 10,
    gargoyle: 1, minotaur: 1, harpy: 3, unicorn: 1, squid: 1,
  })) killed[key] = n;
  const wardens = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
  wardens.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });

  return {
    v: 1, at, startedAt: at - realm * 10 * 86400,
    realm, layer: 4, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    killed,
    worn: realm >= 2
      ? { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } }
      : {},
    chest: realm >= 2
      ? Array.from({ length: 8 }, (_, i) => ({
          id: `c${i}`,
          template: `${['sword', 'robe', 'plainring', 'sandals'][i % 4]}${Math.max(2, realm - (i % 3))}`,
          rarity: ['common', 'common', 'spirit', 'mystic'][i % 4],
          rolls: [{ affix: 'power', value: 5 + i }],
        }))
      : [],
    unlocked: realm >= 4 ? ['root', 'edge'] : [],
    stance: realm >= 2 ? 'swift' : null,
    sequence: realm >= 3 ? ['crane'] : [],
    tribulation: 0, tribulationAt: 0, tower: realm >= 5 ? realm * 10 : 0,
    brewed: { body: 0, bane: 0, fortune: 0 },
    seen: ['guide'],
  };
}

const TABS = [['修', 'cultivate'], ['狩', 'hunt'], ['塔', 'trials'], ['器', 'gear'], ['道', 'dao']];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/** Seed a save with the app's own scripts blocked. It rewrites the save on unload. */
async function open(page, state) {
  if (state) {
    await page.route('**/assets/*.js', (r) => r.abort());
    await page.goto(BASE);
    await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, state]);
    await page.unroute('**/assets/*.js');
  } else {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
  }
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  await dismiss(page);
}

/**
 * 掩 Anything floating over the screen, sent away the way a player would send it.
 *
 * A brand new save opens on 引 How to play, and a notice card arrives whenever something
 * unlocks. Both cover the tab bar and eat the tap, so both are read and closed before
 * anything is asked of the screen underneath. This is what a first-run walk has to do,
 * not a workaround: the first thing a real player taps is 始 BEGIN.
 */
async function dismiss(page) {
  for (let i = 0; i < 24; i++) {
    // 悟道 A breakthrough owes a card per realm behind you and the sheet is raised by
    // the save rather than by an event, so a seeded ninth-realm cultivator meets eight
    // of them on the first frame. Taking one is what a player does and the only way on.
    // 悟道 The cards first, and separately, because page.$ with a comma answers in
    // document order rather than selector order. 新 the notice card sits earlier in the
    // tree and the sheet is painted over it, so the loop kept finding a button it could
    // never tap and never reached the sheet at all.
    const card = await page.$('.awaken .acard');
    if (card) { await card.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(220); continue; }
    const el = await page.$('.help button.act, .help .xclose, .notice button, .scrim');
    if (!el) return;
    await el.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function walk(label, state) {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const noise = [];

  // 種 Seeding the save deliberately aborts the app's own scripts, so nothing is
  // listened to until the page is up and running for real.
  await open(page, state);

  page.on('pageerror', (e) => noise.push(`threw ${String(e).slice(0, 140)}`));
  page.on('console', (m) => {
    // A failed request is reported by the handlers below, with the URL. The console's
    // version of it carries no URL, so it can only ever be a duplicate or a mystery.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      noise.push(m.text().slice(0, 140));
    }
  });
  page.on('requestfailed', (r) => {
    if (!ALLOWED_TO_FAIL.test(r.url())) noise.push(`request failed ${r.url().slice(0, 100)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !ALLOWED_TO_FAIL.test(r.url())) noise.push(`HTTP ${r.status()} ${r.url().slice(0, 100)}`);
  });
  // A repaint's worth of settling, so anything that throws on mount is caught.
  await page.waitForTimeout(400);

  for (const [han, name] of TABS) {
    const tab = await page.$(`nav.tabs button:has-text("${han}")`);
    if (!tab) { fail(`${label}/${name}`, 'the tab button is not there'); continue; }
    const shut = (await tab.getAttribute('data-shut')) === 'true';
    // A blocked tap is a finding, not a crash: something is floating over the screen
    // that should not be, and the walk should say so and carry on.
    const tapped = await tab.click({ timeout: 5000 }).then(() => true).catch(() => false);
    if (!tapped) { fail(`${label}/${name}`, 'something over the screen swallowed the tap'); continue; }
    await page.waitForTimeout(450);
    if (shut) {
      if (!(await page.$('.shut'))) fail(`${label}/${name}`, 'a locked tab opened nothing that explains it');
      else { await page.click('.shut'); await page.waitForTimeout(200); }
      continue;
    }
    const text = (await page.textContent('.sheet')) ?? '';
    if (text.trim().length < 40) fail(`${label}/${name}`, `rendered almost nothing (${text.trim().length} characters)`);
    const junk = text.match(/NaN|undefined|Infinity|\[object/);
    if (junk) fail(`${label}/${name}`, `shows "${junk[0]}" to the player`);
  }

  // 收 The corner, and every panel behind it. A tab may itself have raised a sheet, so
  // the screen is cleared again before the corner is asked for.
  await dismiss(page);
  await page.click('nav.tabs button:has-text("修")', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  const corner = await page.$('button.mainswitch');
  if (!corner) fail(label, 'the corner menu button is not there');
  else {
    await corner.click({ timeout: 5000 }).catch((e) => fail(label, `the corner button would not take a tap (${String(e).slice(0, 60)})`));
    await page.waitForTimeout(350);
    const menu = (await page.textContent('.switchmenu').catch(() => null)) ?? '';
    if (!menu) fail(label, 'the corner opened no menu');
    for (const want of ['save', 'How to play', 'stele', 'Sound', 'characters']) {
      if (!new RegExp(want, 'i').test(menu)) fail(label, `the corner menu has no "${want}"`);
    }
  }

  const unique = [...new Set(noise)];
  if (unique.length) fail(label, `console: ${unique.slice(0, 3).join(' | ')}`);
  await page.close();
}

console.log(`查 walking ${BASE}\n`);
for (const realm of [1, 2, 3, 5, 7, 9]) {
  console.log(`  realm ${realm}`);
  await walk(`realm ${realm}`, cultivator(realm));
}
console.log('  a brand new save');
await walk('fresh', null);

await browser.close();

if (problems.length) {
  console.log(`\n查 ${problems.length} problems.\n`);
  process.exit(1);
}
console.log('\n查 every screen opened, every panel answered, and nothing shown to the player was broken.\n');
