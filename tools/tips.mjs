/**
 * 註查 Every tappable character, opened, and its note checked against the screen.
 *
 * Bruno sent a screenshot of the note for 劍訣 drawn *underneath* the card below it,
 * with only its left and right edges showing past that card's background:
 * *"quando carrego em algumas tooltip ficam escondidas e misturadas com outro texto"*.
 *
 * Two separate faults, one screenshot:
 *
 *   蓋 It was covered. `position: fixed; z-index: 45` was ranked inside a stacking
 *     context opened by `.sheet > * { animation: sheetin … both; }`, because a filled
 *     animation leaves a computed transform of matrix(1,0,0,1,0,0) forever, and an
 *     identity matrix is still a transform. Fixed to a portal into document.body.
 *
 *   出 It ran off the screen. The note was placed by its centre and pulled back by
 *     `translateX(-50%)`, and a translate cannot be clamped, so any character in the
 *     left margin put a 300px note 105px off the side. Fixed by measuring the real box
 *     and clamping its edges.
 *
 * Neither would ever be caught by the test suite, which never opens the game, nor by
 * 查 the smoke walk, which never taps a character. So this is its own harness, and it
 * asserts the two things a note has to be: fully on the screen, and on top.
 *
 *     npm run build && npm run preview &
 *     npm run tips
 */
import { chromium } from 'playwright';
import { isOpen } from '../src/sim/unlocks.ts';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
/** Every screen a character can be tapped on, by the tab that opens it and what opens the tab (App.tsx TABS). */
const TABS = [['修', 'cultivate', null], ['狩', 'hunt', 'hunt'], ['塔', 'trials', 'platform'], ['器', 'gear', 'gear'],
  ['業', 'crafts', 'crafts'], ['道', 'dao', 'arts']];
/** Which cultivators to walk. Narrowed while chasing one screen: TIPS_REALMS=2,3 */
const REALMS = (process.env.TIPS_REALMS ?? '2,3,6,9').split(',').map(Number);
/**
 * 空 The fewest notes each cultivator's walk must open, as han.ts asserts its places. A
 * walk stopped by a card it never got past opened nothing, found nothing wrong and printed
 * a tick. Far under the real count (55, 77, 144 and 208 on 2026-10-05), so it catches a
 * walk that saw nothing and is not edited every time a screen gains a character.
 */
const FLOOR = { 2: 40, 3: 55, 6: 100, 9: 150 };
const FLOOR_ELSE = 30;

const problems = [];
const fail = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  ✗ ${where}  ${what}`); };

/** 業 A workshop with something in every part of the screen: levels, a task, a pouch, a kit. */
function workshop(realm, at) {
  const xpAt = (l) => { let p = 0; for (let i = 1; i < l; i++) p += Math.floor(i + 300 * 2 ** (i / 7)); return Math.floor(p / 4); };
  const lv = Math.min(90, realm * 9);
  const xp = { herb: xpAt(lv), vein: xpAt(lv), render: xpAt(lv), forge: xpAt(lv) };
  if (realm >= 5) xp.alchemy = xpAt(lv - 10);
  if (realm >= 6) xp.sigil = xpAt(lv - 20);
  if (realm >= 8) xp.array = xpAt(lv - 30);
  const pouch = { moss: 40, bark: 12, iron: 30, cinnabar: 9, 'part:rat': 14, 'part:hound': 3, metal1: 5 };
  if (realm >= 5) Object.assign(pouch, { 'might1@2': 3, 'guard1@0': 2 });
  if (realm >= 6) Object.assign(pouch, { 'sigil:warding@1': 4, 'sigil:seeking': 2 });
  if (realm >= 8) Object.assign(pouch, { 'array:dew': 1 });
  return {
    xp, task: 'herb:moss', since: at - 90, pouch, made: { 'herb:moss': 140 }, tools: { herb: 1 },
    arrays: realm >= 8 ? ['array:dew'] : [], seek: 0,
    carry: { elixir: realm >= 5 ? 'might1@2' : null, sigil: realm >= 6 ? 'sigil:warding@1' : null },
  };
}

/** A cultivator with enough behind them for the screens to fill with characters. */
function cultivator(realm) {
  const at = Math.floor(Date.now() / 1000);
  const cap = realm * 6;
  const killed = { rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 3,
                   beetle: 15, owl: 2, boar: 12, wolf: 3, crab: 11, centipede: 10, ogre: 10 };
  ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao']
    .slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  return {
    v: 1, at, startedAt: at - realm * 10 * 86400,
    realm, layer: 3, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`, template: `${['sword', 'robe', 'plainring', 'sandals'][i % 4]}${Math.max(2, realm - (i % 3))}`,
      rarity: ['common', 'spirit', 'mystic', 'earth'][i % 4], rolls: [{ affix: 'power', value: 5 + i }],
    })),
    unlocked: realm >= 4 ? ['root', 'edge'] : [],
    stance: 'swift', sequence: realm >= 3 ? ['crane'] : [],
    tribulation: 0, tribulationAt: 0, tower: realm >= 5 ? realm * 10 : 0,
    brewed: { body: 0, bane: 0, fortune: 0 },
    crafts: realm >= 2 ? workshop(realm, at) : undefined,
    // Every first-run card already read, so nothing floats over the screen being checked.
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom'],
  };
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/**
 * Read the note's box and what is actually painted on top of it.
 *
 * 點 Five probes, not one. A note can be covered in its middle by a card that starts
 * halfway down it while both its top corners are still clear, which is exactly what the
 * screenshot showed, so a single probe at the centre or at a corner would have passed.
 */
const LOOK = () => {
  const tip = document.querySelector('.termtip');
  if (!tip) return null;
  const b = tip.getBoundingClientRect();
  const at = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return !el ? 'nothing' : (el === tip || tip.contains(el)) ? '' : String(el.className || el.tagName).slice(0, 30);
  };
  return {
    l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
    over: [at(b.left + b.width / 2, b.top + b.height / 2), at(b.left + 4, b.top + 4),
           at(b.right - 4, b.top + 4), at(b.left + 4, b.bottom - 4), at(b.right - 4, b.bottom - 4)]
      .filter(Boolean),
    vw: innerWidth, vh: innerHeight,
  };
};

async function walk(realm) {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, cultivator(realm)]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  await clear(page);

  let opened = 0;
  for (const [han, name, needs] of TABS) {
    // 掩 A notice card arrives whenever something unlocks, it sits over the tab bar and
    // it eats the tap. Realms 2 and 3 unlock something on nearly every screen, so
    // without this the tab never changes and the walk silently repeats 狩 the hunt.
    await clear(page);
    const tab = await page.$(`nav.tabs button:has-text("${han}")`);
    if (!tab) { fail(`realm ${realm} ${name}`, 'there is no such tab'); continue; }
    // 鎖 A tab this cultivator has not reached yet answers with the realm that opens it,
    // drawn as a full-screen .shut card. Tapping one and leaving it there was covering
    // every tab after it, so the walk only ever saw 狩 the hunt from the third tab on.
    // A tab shut that the realm has opened is a screen this walk never read: a fault.
    const due = needs === null || isOpen(realm, needs);
    if (await tab.getAttribute('data-shut') === 'true') {
      if (due) fail(`realm ${realm} ${name}`, 'the tab is shut, and this realm opens it');
      else console.log(`  ${han} ${name}: not open this realm`);
      continue;
    }
    if (!due) fail(`realm ${realm} ${name}`, 'the tab is open before its realm');
    await tab.click().catch(() => {});
    await page.waitForTimeout(450);
    await clear(page);
    // 屏 Which screen this actually is. A locked tab takes the tap and changes nothing,
    // and without this the harness walks the previous screen a second time and reports
    // its characters under the wrong name.
    const screen = await page.getAttribute('.sheet', 'data-screen');
    if (screen !== name) {
      const why = await page.evaluate((h) => {
        const b = [...document.querySelectorAll('nav.tabs button')].find((x) => x.textContent?.includes(h));
        if (!b) return 'no such tab';
        const r = b.getBoundingClientRect();
        const on = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return `disabled=${b.disabled} tapWouldHit=${on === b || b.contains(on) ? 'the tab' : String(on?.className || on?.tagName)}`;
      }, han);
      fail(`realm ${realm} ${name}`, `did not open, still on ${screen} (${why})`);
      continue;
    }
    const n = await page.$$eval('.term', (e) => e.length);
    if (!n) fail(`realm ${realm} ${name}`, 'the screen opened with no character on it to tap');
    for (let i = 0; i < n; i++) {
      const t = (await page.$$('.term'))[i];
      if (!t) { fail(`realm ${realm} ${name} #${i}`, `the character went before it was tapped (${n} were counted)`); continue; }
      const label = (await t.textContent())?.trim() ?? '?';
      const where = `realm ${realm} ${name} ${label}#${i}`;
      // 捲 Bring the character onto the screen the way a thumb would, and then wait for
      // the scroll to actually stop. A scroll is one of the things that closes a note,
      // so a tap sent while the list is still moving opens a note and shuts it again in
      // the same breath, and the harness reads that as the game having done nothing.
      // A player's thumb lands after the list has settled. This waits for the same.
      await t.scrollIntoViewIfNeeded().catch(() => {});
      await settle(page, t);
      await t.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(220);
      const r = await page.evaluate(LOOK);
      if (!r) {
        fail(where, 'tapped and nothing opened');
        await page.screenshot({ path: `/tmp/tip-none-${realm}-${name}-${i}.png` });
        continue;
      }
      opened++;
      if (r.l < 0 || r.t < 0 || r.l + r.w > r.vw || r.t + r.h > r.vh) {
        fail(where, `off the screen at ${r.l},${r.t} ${r.w}x${r.h} in ${r.vw}x${r.vh}`);
        await page.screenshot({ path: `/tmp/tip-off-${realm}-${name}-${i}.png` });
      }
      if (r.over.length) {
        fail(where, `covered by ${[...new Set(r.over)].join(', ')}`);
        await page.screenshot({ path: `/tmp/tip-under-${realm}-${name}-${i}.png` });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);
    }
    console.log(`  ${han} ${name}: ${n} characters`);
  }
  console.log(`realm ${realm}: ${opened} notes opened`);
  const least = FLOOR[realm] ?? FLOOR_ELSE;
  if (opened < least) fail(`realm ${realm}`, `only ${opened} notes opened, and there should be well over ${least}`);
  await page.close();
}

/** Send away anything floating over the screen, the way a player would. */
async function clear(page) {
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
    const el = await page.$('.prologue button.act, .help button.act, .notice button, .scrim, .shut');
    if (!el) return;
    await el.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
}

/** Wait until an element has stopped moving, or give up after a second. */
async function settle(page, handle) {
  let last = null;
  for (let i = 0; i < 10; i++) {
    const b = await handle.boundingBox().catch(() => null);
    const y = b ? Math.round(b.y) : null;
    if (y !== null && y === last) return;
    last = y;
    await page.waitForTimeout(100);
  }
}

for (const realm of REALMS) await walk(realm);
await browser.close();

if (problems.length) {
  console.log(`\n✗ ${problems.length} problems`);
  process.exit(1);
}
console.log('\n✓ every note lands on the screen, and nothing paints over it');
