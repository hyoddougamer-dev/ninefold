/**
 * 初 The first sitting, played on the real build from a brand new game.
 *
 *     npm run build && npm run preview &
 *     node tools/sitting.mjs            (SHOTS=dir keeps a picture at each moment)
 *
 * A player on Reddit, 2026-09-30: *"got bored after a few minutes of jumping around
 * menus ... I didn't even make it to the point you mention in your post where you speak
 * about equipping stuff after tapping to kill the 20th rat in a row."* The simulator had
 * already said so (the rat alone for thirteen minutes, the second realm seven hours
 * away), but the simulator does not read a screen. This does: it opens the game the way
 * a new player does, answers what the game asks, buys what it can, fights the beast the
 * guide points at, and moves the game's own clock ten seconds between taps. Every moment
 * is logged at the game minute it happened.
 *
 * It fails if the second realm is not reached inside the first half hour of play, or if
 * fewer than three beasts were met on the way: a first sitting with one button in it is
 * the thing this exists to catch.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SHOTS = process.env.SHOTS;
const LIMIT = Number(process.env.MINUTES ?? 30) * 60_000;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: SHOTS ? 2 : 1 });
const noise = [];
page.on('pageerror', (e) => noise.push(String(e).slice(0, 160)));

const start = Date.now();
await page.clock.install({ time: start });
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.waitForSelector('nav.tabs button', { timeout: 15000 });

let played = 0;
const at = () => `${String(Math.floor(played / 60000)).padStart(2)}:${String(Math.floor(played / 1000) % 60).padStart(2, '0')}`;
const log = (what) => console.log(`  ${at()}  ${what}`);
const tick = async (ms) => { await page.clock.runFor(ms); played += ms; };
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };

/** Whatever floats over the screen, answered the way a player answers it. */
async function clear() {
  for (let i = 0; i < 20; i++) {
    const card = await page.$('.awaken .acard');
    if (card) { await card.click().catch(() => {}); await tick(300); continue; }
    const who = await page.$('.whom .pick');
    if (who) { await who.click().catch(() => {}); await tick(300); continue; }
    const el = await page.$('.prologue button.act, .help button.act, .help .xclose, .notice button, .back button.act, .scrim');
    if (!el) return;
    const said = (await el.evaluate((e) => e.closest('.notice, .prologue, .back')?.textContent ?? '').catch(() => '')).trim();
    if (said) log(`讀 ${said.slice(0, 90)}`);
    await el.click().catch(() => {});
    await tick(300);
  }
}

async function tab(han) {
  await clear();
  await page.click(`nav.tabs button:has-text("${han}")`).catch(() => {});
  await tick(300);
  await clear();
}

/** The realm the header names, read off the screen. */
const realmName = () => page.$eval('nav.tabs', () => document.body.textContent.match(/realm (\d) of 9/)?.[1] ?? '?').catch(() => '?');

const met = new Set();
let kills = 0;
let bought = 0;
let realm = '1';
let shotHunt = false;
let shotMid = false;
await clear();
await shot('00-open');

while (played < LIMIT) {
  // 修 Buy whatever is lit, the way the guide's first step teaches.
  await tab('修');
  realm = await realmName();
  for (let i = 0; i < 6; i++) {
    const b = await page.$('button.upg:not([disabled])');
    if (!b) break;
    const name = (await b.textContent())?.trim().slice(0, 24);
    await b.click().catch(() => {});
    await tick(200);
    if (process.env.VERBOSE) log(`買 ${name}`);
    bought++;
  }
  const bt = await page.$('[data-coach="breakthrough"]');
  if (bt) {
    await bt.click().catch(() => {});
    await tick(1500);
    await shot('40-breakthrough');
    await clear();
    realm = await realmName();
    log(`境 the second realm opens`);
    break;
  }
  const warden = await page.$('[data-coach="fight-warden"]');
  let target = warden;
  if (!target) {
    await tab('狩');
    const rows = await page.$$('button.beast');
    // 新 A beast is met when the list says it can be beaten: 60% or better on its row.
    for (const r of rows) {
      const name = (await r.$eval('.bname i', (e) => e.textContent.split(' · ')[0]).catch(() => '')).trim();
      const pct = Number((await r.$eval('.odds', (e) => e.textContent).catch(() => '')).match(/^(\d+)%/)?.[1] ?? 0);
      if (name && pct >= 60 && !met.has(name)) { met.add(name); log(`新 ${name} can be beaten (${pct}%)`); }
    }
    if (!shotHunt) { await shot('10-hunt-first'); shotHunt = true; }
    if (!shotMid && met.size >= 3) { await shot('20-hunt-three'); shotMid = true; }
    target = await page.$('[data-coach="beast-first"]');
  }
  if (target) {
    const box = await target.boundingBox();
    if (box) await page.mouse.click(box.x + box.width - 12, box.y + box.height / 2);
    for (let i = 0; i < 40 && !(await page.$('.verdict')); i++) await tick(500);
    const v = await page.$('.verdict');
    if (v) {
      const text = (await v.textContent()) ?? '';
      if (warden) { await shot('30-warden'); log(`妖 the warden: ${/still waits|Losing costs nothing/.test(text) ? 'lost' : 'won'}`); }
      kills++;
      await page.click('.verdict button.act').catch(() => {});
      await tick(400);
    }
  }
  await tick(10_000);
}

console.log(`\n  ${at()} of play, ${kills} fights, ${bought} upgrades bought, ${met.size} beasts met, realm ${realm}${noise.length ? `, ${noise.length} page errors` : ''}`);
const problems = [];
if (realm !== '2') problems.push(`the second realm was not reached in ${LIMIT / 60000} minutes`);
if (met.size < 3) problems.push(`only ${met.size} beasts were met`);
for (const n of noise) problems.push(`page error: ${n}`);
if (realm === '2') {
  await tab('器');
  await shot('50-gear');
}
await browser.close();
console.log(problems.length ? `\n初 ${problems.join('; ')}\n` : '\n初 the first sitting reaches the second realm, and meets something new on the way.\n');
process.exitCode = problems.length ? 1 : 0;
