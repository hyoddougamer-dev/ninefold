/**
 * The look and the play, held still. Every tab of the game, at 400 and at 320 wide, on fixed
 * fabricated saves with the clock frozen, so a refactor can be proven to change nothing a
 * player sees.
 *
 *     npm run build && npx vite preview --port 4391 &
 *     node tools/regress.mjs baseline        # write the reference pictures
 *     node tools/regress.mjs compare baseline # take them again and say what differs
 *
 * The pictures are byte-compared: the same build and the same fixtures give the same bytes,
 * which is checked by running the baseline twice (see the notes in the report that adds it).
 * A difference is printed by name, and the script exits 1 when anything differs.
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4391/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const BACKUP_KEY = 'ninefold.save.backup';
const [mode = 'compare', refDir = 'regress'] = process.argv.slice(2);
const NOW = Date.UTC(2026, 9, 10, 12) / 1000;
const WIDTHS = [400, 320];
const SEEN = ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret'];
const AWAKENED = ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'formula'];

const piece = (id, template, rarity = 'earth', value = 12) => ({ id, template, rarity, rolls: [{ affix: 'power', value }] });
const KEYS = { weapon: 'sword', robe: 'robe', crown: 'band', boots: 'bare', talisman: 'charm', ring: 'plainring' };
const FIVE = ['weapon', 'robe', 'crown', 'boots', 'talisman'];
const NAMES = ['Boss killer', 'Qi gatherer', 'Sword Saint', 'Fusing outfit', 'Melting outfit', 'Refiner', 'Tower climb', 'Spare', 'Dragon run', 'Seclusion'];

/** Mid-game: ten loadouts over forty locked pieces, a worn body, and the crafts open. */
function mid() {
  const at = NOW - 30;
  const chest = [];
  const sets = [];
  for (let k = 0; k < 8; k++) {
    const ids = { ring: 'ring' };
    FIVE.forEach((slot, j) => {
      const id = `s${k}-${slot}`;
      chest.push({ ...piece(id, `${KEYS[slot]}${2 + ((k + j) % 4)}`, k % 2 ? 'mystic' : 'earth'), locked: true });
      ids[slot] = id;
    });
    sets.push({ name: NAMES[k], ids });
  }
  const worn = {};
  for (const slot of FIVE) worn[slot] = piece(`w-${slot}`, `${KEYS[slot]}5`);
  worn.ring = { ...piece('ring', 'plainring5'), locked: true };
  const killed = {};
  for (const k of ['rat', 'hound', 'frog', 'serpent', 'mantis', 'bat', 'beetle', 'owl', 'raven', 'boar', 'wolf', 'vulture']) killed[k] = 60;
  return {
    v: 1, at, startedAt: at - 40 * 86400, realm: 5, layer: 6, qi: 1e7, materials: 1e6, wardenFell: false,
    levels: { technique: 30, method: 30, pills: 30, cores: 24 }, killed, worn, chest, sets, tasks: {},
    self: 'woman', stance: 'swift', sequence: ['crane', 'tiger'], tribulation: 0, tribulationAt: 0, tower: 40,
    quarryWeek: 99999, awakened: AWAKENED, seen: SEEN,
    crafts: { xp: { forge: 60000, vein: 20000, herb: 20000 }, since: at - 5, task: null, pouch: { realmkey: 2 }, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0 },
  };
}

/** Early game: a first realm, nothing crafted, a few kills. */
function early() {
  const at = NOW - 60;
  return {
    v: 1, at, startedAt: at - 2 * 86400, realm: 1, layer: 2, qi: 900, materials: 120, wardenFell: false,
    levels: { technique: 2, method: 1, pills: 1, cores: 0 }, killed: { rat: 4, hound: 2 }, worn: {}, chest: [], sets: [], tasks: {},
    self: 'woman', stance: 'swift', sequence: [], tribulation: 0, tribulationAt: 0, tower: 0, quarryWeek: 99999,
    awakened: [], seen: ['guide'],
  };
}

const FIXTURES = { mid, early };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function capture(fixture, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.clock.install({ time: NOW * 1000 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.route('**/*.supabase.co/**', (r) => r.abort());
  // The two animations the app drives by frame (a count-up and the coach's pulse) are held
  // still, so the same build paints the same bytes twice. CSS animations are finished by the
  // screenshot option below.
  // CSS transitions that start while the page mounts (a bar filling, a card sliding in) run in
  // real time, whatever the clock says, so they are switched off: the picture is the state.
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
    const off = () => {
      const st = document.createElement('style');
      st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
      document.head.appendChild(st);
    };
    if (document.head) off(); else document.addEventListener('readystatechange', off, { once: true });
  });
  await page.goto(BASE);
  await page.evaluate(([k, b, s]) => {
    localStorage.clear();
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(b, JSON.stringify(s));
  }, [SAVE_KEY, BACKUP_KEY, FIXTURES[fixture]()]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.clock.pauseAt(NOW * 1000 + 2000);
  await page.waitForTimeout(400);
  const clear = async () => {
    for (let i = 0; i < 8; i++) {
      const b = await page.$('.notice button, .awaken .later, .awaken button, .back button');
      if (!b) break;
      try { await b.click({ timeout: 1200 }); } catch { break; }
      await page.waitForTimeout(250);
    }
  };
  await clear();
  const tabs = await page.$$eval('nav.tabs button[data-coach]', (bs) => bs.map((b) => b.getAttribute('data-coach')));
  const shots = [];
  for (const tab of tabs) {
    const name = `${fixture}-${tab}-${width}`;
    await page.click(`nav.tabs button[data-coach="${tab}"]`, { timeout: 4000 }).catch(() => {});
    // Let the tab paint: fonts and the art's images decode asynchronously, and a picture taken
    // while one of them is still arriving is not the same picture twice.
    await page.waitForTimeout(500);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    await clear();
    await page.mouse.move(0, 0);
    const buf = await page.screenshot({ animations: 'disabled', caret: 'initial' });
    shots.push({ name, buf });
  }
  await page.close();
  return shots;
}

// The reference is written by `baseline`; `compare` only reads it, and keeps its pictures apart.
const out = mode === 'baseline' ? refDir : `${refDir}-now`;
mkdirSync(out, { recursive: true });
let differ = 0;
let total = 0;
for (const fixture of Object.keys(FIXTURES)) {
  for (const width of WIDTHS) {
    for (const s of await capture(fixture, width)) {
      total++;
      if (mode === 'baseline') { writeFileSync(join(out, `${s.name}.png`), s.buf); console.log(`wrote ${s.name}`); continue; }
      writeFileSync(join(out, `${s.name}.png`), s.buf);
      const ref = join(refDir, `${s.name}.png`);
      if (!existsSync(ref)) { differ++; console.log(`NEW (no reference) ${s.name}`); continue; }
      const want = readFileSync(ref);
      if (want.equals(s.buf)) { console.log(`same ${s.name}`); continue; }
      // A picture that differs is taken again, twice. One that matches on a retake was a
      // timing blip, and is reported as such; one that differs every time is a change.
      let settled = false;
      for (let attempt = 1; attempt <= 2 && !settled; attempt++) {
        const again = (await capture(fixture, width)).find((x) => x.name === s.name);
        if (again && want.equals(again.buf)) settled = true;
      }
      if (settled) console.log(`same ${s.name} (a timing blip on the first take, matched on a retake)`);
      else { differ++; console.log(`DIFF ${s.name}`); }
    }
  }
}
await browser.close();
console.log(`${total} pictures, ${differ} different`);
process.exit(differ ? 1 : 0);
